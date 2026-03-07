/**
 * investmtg-proxy — Cloudflare Worker
 * CORS proxy for investmtg.com
 *
 * Routes:
 *   /justtcg   — proxies to api.justtcg.com (injects API key)
 *   /topdeck   — proxies to topdeck.gg API
 *   /chatbot   — proxies to text.pollinations.ai (OpenAI-compatible chat)
 *   /?target=  — generic CORS proxy (allowlisted hosts only)
 */

const ALLOWED_ORIGINS = [
  'https://www.investmtg.com',
  'https://investmtg.com',
  'https://imvestmtg.github.io',
  'http://localhost:3000',
  'http://localhost:5500',
  'http://127.0.0.1:5500',
];

const ALLOWED_PROXY_HOSTS = [
  'edhtop16.com',
  'api.scryfall.com',
  'api2.moxfield.com',
];

/* ── CORS helpers ── */

function corsHeaders(request) {
  const origin = request.headers.get('Origin') || '';
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Max-Age': '86400',
  };
}

function handleOptions(request) {
  return new Response(null, { status: 204, headers: corsHeaders(request) });
}

function jsonResponse(data, status, request) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(request) },
  });
}

/* ── Rate limiting (in-memory, per-isolate) ── */

const rateLimitMap = new Map();
const RATE_WINDOW = 60_000;   // 1 minute
const RATE_MAX_CHATBOT = 12;  // max chatbot requests per IP per window

function isRateLimited(key, max) {
  const now = Date.now();
  let entry = rateLimitMap.get(key);
  if (!entry || now - entry.start > RATE_WINDOW) {
    entry = { start: now, count: 1 };
    rateLimitMap.set(key, entry);
    return false;
  }
  entry.count++;
  if (entry.count > max) return true;
  return false;
}

/* ── Route: /justtcg ── */

async function handleJustTCG(request, env) {
  const url = new URL(request.url);
  const path = url.searchParams.get('path') || '/v1/cards/browse';
  const targetUrl = 'https://api.justtcg.com' + path;

  // Forward query params (except 'path')
  const params = new URLSearchParams(url.searchParams);
  params.delete('path');

  const fullUrl = targetUrl + (params.toString() ? '?' + params.toString() : '');

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + (env.JUSTTCG_API_KEY || ''),
  };

  let fetchOpts = { method: request.method, headers };
  if (request.method === 'POST' || request.method === 'PUT') {
    fetchOpts.body = await request.text();
  }

  const resp = await fetch(fullUrl, fetchOpts);
  const body = await resp.text();

  return new Response(body, {
    status: resp.status,
    headers: {
      'Content-Type': resp.headers.get('Content-Type') || 'application/json',
      ...corsHeaders(request),
    },
  });
}

/* ── Route: /topdeck ── */

async function handleTopDeck(request) {
  const url = new URL(request.url);
  const pathname = url.pathname.replace(/^\/topdeck/, '') || '/';

  if (pathname === '/') {
    return jsonResponse({ error: 'Missing TopDeck API path' }, 400, request);
  }

  const targetUrl = 'https://topdeck.gg/api' + pathname + url.search;

  let fetchOpts = {
    method: request.method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (request.method === 'POST' || request.method === 'PUT') {
    fetchOpts.body = await request.text();
  }

  const resp = await fetch(targetUrl, fetchOpts);
  const body = await resp.text();

  return new Response(body, {
    status: resp.status,
    headers: {
      'Content-Type': resp.headers.get('Content-Type') || 'application/json',
      ...corsHeaders(request),
    },
  });
}

/* ── Route: /chatbot ── */

async function handleChatbot(request) {
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405, request);
  }

  // Rate limit by IP
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  if (isRateLimited('chatbot:' + ip, RATE_MAX_CHATBOT)) {
    return jsonResponse({ error: 'Too many requests. Please wait a moment.' }, 429, request);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400, request);
  }

  // Validate / sanitize
  if (!body.messages || !Array.isArray(body.messages)) {
    return jsonResponse({ error: 'Missing messages array' }, 400, request);
  }

  // Limit message count
  const messages = body.messages.slice(-10);

  // Add system prompt for investMTG context
  const systemMessage = {
    role: 'system',
    content: 'You are the investMTG AI Advisor, a helpful assistant for Magic: The Gathering players. You help with card pricing, deck building advice, trading tips, and tournament information. Always be friendly, fair, and promote good sportsmanship. Keep responses concise and helpful. You serve the investMTG community on Guam and worldwide.'
  };

  const chatBody = {
    model: body.model || 'openai',
    messages: [systemMessage, ...messages],
    max_tokens: Math.min(body.max_tokens || 512, 1024),
    temperature: body.temperature || 0.7,
  };

  try {
    const resp = await fetch('https://text.pollinations.ai/openai/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(chatBody),
    });

    const data = await resp.text();

    return new Response(data, {
      status: resp.status,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders(request),
      },
    });
  } catch (err) {
    return jsonResponse({ error: 'Chat service unavailable' }, 502, request);
  }
}

/* ── Route: Generic CORS proxy (?target=) ── */

async function handleGenericProxy(request) {
  const url = new URL(request.url);
  const target = url.searchParams.get('target');

  if (!target) {
    return jsonResponse({ error: 'Invalid route' }, 400, request);
  }

  let targetUrl;
  try {
    targetUrl = new URL(target);
  } catch {
    return jsonResponse({ error: 'Invalid target URL' }, 400, request);
  }

  // Check allowlist
  const isAllowed = ALLOWED_PROXY_HOSTS.some(
    (host) => targetUrl.hostname === host || targetUrl.hostname.endsWith('.' + host)
  );
  if (!isAllowed) {
    return jsonResponse({ error: 'Target host not allowed' }, 403, request);
  }

  let fetchOpts = {
    method: request.method,
    headers: {
      'Content-Type': request.headers.get('Content-Type') || 'application/json',
      'Accept': request.headers.get('Accept') || 'application/json',
    },
  };
  if (request.method === 'POST' || request.method === 'PUT') {
    fetchOpts.body = await request.text();
  }

  const resp = await fetch(targetUrl.toString(), fetchOpts);
  const body = await resp.text();

  return new Response(body, {
    status: resp.status,
    headers: {
      'Content-Type': resp.headers.get('Content-Type') || 'application/json',
      ...corsHeaders(request),
    },
  });
}

/* ── Main handler ── */

export default {
  async fetch(request, env) {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return handleOptions(request);
    }

    const url = new URL(request.url);
    const path = url.pathname;

    // Route matching
    if (path === '/justtcg' || path.startsWith('/justtcg')) {
      return handleJustTCG(request, env);
    }

    if (path.startsWith('/topdeck')) {
      return handleTopDeck(request);
    }

    if (path === '/chatbot') {
      return handleChatbot(request);
    }

    // Generic proxy (?target=...)
    if (url.searchParams.has('target')) {
      return handleGenericProxy(request);
    }

    return jsonResponse({ error: 'Invalid route' }, 400, request);
  },
};
