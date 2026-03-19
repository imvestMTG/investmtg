/* Ticker.js — Live price ticker with percentage change indicators */
import React from 'react';
import { formatUSD } from '../utils/helpers.js';
import { fetchTicker } from '../utils/api.js';
import { storageGet, storageSet } from '../utils/storage.js';
var h = React.createElement;

var CACHE_KEY = 'investmtg-ticker-cache';
var PREV_KEY = 'investmtg-ticker-prev';
var CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function loadCache() {
  var cached = storageGet(CACHE_KEY, null);
  if (!cached || !cached.ts || Date.now() - cached.ts > CACHE_TTL) return null;
  return cached.data || null;
}

function saveCache(data) {
  storageSet(CACHE_KEY, { ts: Date.now(), data: data });
}

/* Store a snapshot of prices for computing % change on next load.
   We update the "previous" snapshot once per hour so changes feel meaningful. */
function loadPrevPrices() {
  var prev = storageGet(PREV_KEY, null);
  if (!prev || !prev.prices) return {};
  return prev.prices;
}

function savePrevPrices(items) {
  var prev = storageGet(PREV_KEY, null);
  var oneHour = 60 * 60 * 1000;
  /* Only update the baseline once per hour */
  if (prev && prev.ts && Date.now() - prev.ts < oneHour) return;
  var prices = {};
  items.forEach(function(item) {
    if (item.name && item.price) prices[item.name] = item.price;
  });
  storageSet(PREV_KEY, { ts: Date.now(), prices: prices });
}

function getTickerPrice(item) {
  if (item.price_usd) return parseFloat(item.price_usd);
  if (item.price) return parseFloat(item.price);
  return 0;
}

export function Ticker() {
  var ref1 = React.useState([]);
  var items = ref1[0], setItems = ref1[1];
  var ref2 = React.useState({});
  var prevPrices = ref2[0], setPrevPrices = ref2[1];

  React.useEffect(function() {
    var cancelled = false;

    /* Load previous price baseline for % change */
    setPrevPrices(loadPrevPrices());

    /* Try cache first for instant display */
    var cached = loadCache();
    if (cached && cached.length > 0) {
      setItems(cached);
    }

    /* Defer network fetch 2s to let critical render path complete first */
    var timeout = setTimeout(function() {
      if (cancelled) return;

      fetchTicker().then(function(data) {
        if (!cancelled && data.length > 0) {
          setItems(data);
          saveCache(data);
          savePrevPrices(data);
        }
      }).catch(function() {
        /* Keep cached data on error */
      });

      /* Refresh every 5 minutes */
      interval = setInterval(function() {
        fetchTicker().then(function(data) {
          if (!cancelled && data.length > 0) {
            setItems(data);
            saveCache(data);
            savePrevPrices(data);
          }
        }).catch(function(err) { console.warn('[Ticker] fallback fetch failed:', err); });
      }, CACHE_TTL);
    }, 2000);

    var interval;

    return function() {
      cancelled = true;
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, []);

  if (items.length === 0) return null;

  /* Duplicate for seamless scroll animation */
  var doubled = items.concat(items);

  return h('div', { className: 'ticker-strip', 'aria-hidden': 'true' },
    h('div', { className: 'ticker-track' },
      doubled.map(function(item, i) {
        var currentPrice = getTickerPrice(item);
        var prevPrice = prevPrices[item.name];
        var pctChange = null;
        if (prevPrice && prevPrice > 0 && currentPrice > 0) {
          pctChange = ((currentPrice - prevPrice) / prevPrice) * 100;
        }

        var changeEl = null;
        if (pctChange !== null && Math.abs(pctChange) >= 0.1) {
          var cls = pctChange > 0 ? 'ticker-change ticker-up' : 'ticker-change ticker-down';
          var prefix = pctChange > 0 ? '+' : '';
          changeEl = h('span', { className: cls }, prefix + pctChange.toFixed(1) + '%');
        }

        return h('span', { key: i, className: 'ticker-item' },
          h('span', { className: 'ticker-name' }, item.name),
          h('span', { className: 'ticker-price' }, formatUSD(currentPrice)),
          changeEl
        );
      })
    )
  );
}
