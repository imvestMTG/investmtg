/* Chatbot.js */
import React from 'react';
import { ChatIcon, CloseIcon, SendIcon, PortfolioIcon } from './shared/Icons.js';
import { PROXY_BASE, CHATBOT_RATE_WINDOW, CHATBOT_RATE_MAX, CHATBOT_COOLDOWN, CHATBOT_MAX_INPUT } from '../utils/config.js';
import { sanitizeInput } from '../utils/sanitize.js';
var h = React.createElement;

/* AI Chat API — routed through Cloudflare Worker proxy */
var CHAT_API = PROXY_BASE + '/chatbot';
var SYSTEM_PROMPT = 'You are an expert Magic: The Gathering investment advisor and card analyst for investMTG.com — a local Guam marketplace for MTG cards. You help users make smart decisions about buying, selling, and collecting MTG cards. You know about card prices, market trends, format legality, deck building, set releases, reserved list cards, and investment strategies. Keep responses concise (2-4 sentences unless more detail is requested). Use dollar amounts when discussing prices. Be friendly and enthusiastic about MTG. If you don\'t know a specific current price, say so and recommend checking the card on investMTG. Never give financial advice disclaimers unless specifically asked about real money investment risk.';

/* Client-side rate limiter — prevents rapid-fire abuse */
var rateLimitState = { lastRequest: 0, count: 0, windowStart: 0 };
var RATE_WINDOW = CHATBOT_RATE_WINDOW;
var RATE_MAX = CHATBOT_RATE_MAX;

function checkRateLimit() {
  var now = Date.now();
  /* Minimum cooldown between messages */
  if (now - rateLimitState.lastRequest < CHATBOT_COOLDOWN) return false;
  /* Reset window if expired */
  if (now - rateLimitState.windowStart > RATE_WINDOW) {
    rateLimitState.windowStart = now;
    rateLimitState.count = 0;
  }
  if (rateLimitState.count >= RATE_MAX) return false;
  rateLimitState.count++;
  rateLimitState.lastRequest = now;
  return true;
}

export function Chatbot() {
  var ref = React.useState(false);
  var isOpen = ref[0], setIsOpen = ref[1];
  var msgsRef = React.useState([
    { role: 'bot', text: 'Hey! I\'m your MTG investment advisor. Ask me about card prices, investment strategies, deck building, or anything Magic: The Gathering.' }
  ]);
  var messages = msgsRef[0], setMessages = msgsRef[1];
  var busyRef = React.useState(false);
  var busy = busyRef[0], setBusy = busyRef[1];
  var inputRef = React.useRef(null);
  var messagesEndRef = React.useRef(null);
  var historyRef = React.useRef([{ role: 'system', content: SYSTEM_PROMPT }]);

  React.useEffect(function() {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollTop = messagesEndRef.current.scrollHeight;
    }
  }, [messages]);

  var toggle = function() {
    var newState = !isOpen;
    setIsOpen(newState);
    if (newState && inputRef.current) {
      setTimeout(function() { inputRef.current.focus(); }, 100);
    }
  };

  var sendMessage = function() {
    if (busy) return;
    var input = inputRef.current;
    if (!input) return;
    var msg = sanitizeInput(input.value, CHATBOT_MAX_INPUT);
    if (!msg) return;

    /* Rate limit check */
    if (!checkRateLimit()) {
      setMessages(function(prev) {
        return prev.concat([{ role: 'bot', text: 'Please wait a moment before sending another message.' }]);
      });
      return;
    }

    input.value = '';
    setMessages(function(prev) { return prev.concat([{ role: 'user', text: msg }]); });
    historyRef.current.push({ role: 'user', content: msg });

    setBusy(true);
    setMessages(function(prev) { return prev.concat([{ role: 'typing', text: '' }]); });

    fetch(CHAT_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'openai',
        messages: historyRef.current.slice(-10),
        max_tokens: 512,
        temperature: 0.7
      })
    })
    .then(function(res) {
      if (res.status === 429) throw new Error('rate_limited');
      if (!res.ok) throw new Error('API error: ' + res.status);
      return res.json();
    })
    .then(function(data) {
      var reply = '';
      if (data.choices && data.choices[0] && data.choices[0].message) {
        reply = data.choices[0].message.content;
      } else {
        reply = 'Sorry, I couldn\'t process that. Please try again.';
      }
      historyRef.current.push({ role: 'assistant', content: reply });
      setMessages(function(prev) {
        return prev.filter(function(m) { return m.role !== 'typing'; }).concat([{ role: 'bot', text: reply }]);
      });
    })
    .catch(function(err) {
      var errorMsg = err.message === 'rate_limited'
        ? 'Too many requests. Please wait a moment and try again.'
        : 'Sorry, I\'m having trouble connecting right now. Please try again in a moment.';
      setMessages(function(prev) {
        return prev.filter(function(m) { return m.role !== 'typing'; }).concat([
          { role: 'bot', text: errorMsg }
        ]);
      });
    })
    .finally(function() {
      setBusy(false);
    });
  };

  var onKeyDown = function(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      sendMessage();
    }
  };

  return h(React.Fragment, null,
    // FAB
    !isOpen
      ? h('div', { className: 'chatbot-fab', onClick: toggle, 'aria-label': 'Open AI Advisor' },
          h(ChatIcon)
        )
      : null,

    // Panel
    h('div', { className: 'chatbot-panel' + (isOpen ? ' open' : '') },
      h('div', { className: 'chatbot-header' },
        h('div', { className: 'chatbot-header-title' },
          h(PortfolioIcon, { size: '20' }),
          h('span', null, 'MTG Advisor')
        ),
        h('button', { className: 'chatbot-close', onClick: toggle, 'aria-label': 'Close chat' },
          h(CloseIcon)
        )
      ),
      h('div', { className: 'chatbot-messages', ref: messagesEndRef },
        messages.map(function(m, i) {
          if (m.role === 'typing') {
            return h('div', { key: 'typing-' + i, className: 'chat-msg bot-msg' },
              h('div', { className: 'chat-typing' },
                h('span'), h('span'), h('span')
              )
            );
          }
          var cls = m.role === 'user' ? 'user-msg' : 'bot-msg';
          return h('div', { key: i, className: 'chat-msg ' + cls },
            h('div', { className: 'chat-bubble' }, m.text)
          );
        })
      ),
      h('div', { className: 'chatbot-input-area' },
        h('input', {
          type: 'text',
          ref: inputRef,
          placeholder: 'Ask about MTG cards...',
          autoComplete: 'off',
          onKeyDown: onKeyDown
        }),
        h('button', {
          id: 'chatbot-send',
          onClick: sendMessage,
          'aria-label': 'Send message',
          disabled: busy
        },
          h(SendIcon)
        )
      )
    )
  );
}
