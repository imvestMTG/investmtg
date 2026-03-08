/* Ticker.js — Live price ticker using backend API */
import React from 'react';
import { formatUSD } from '../utils/helpers.js';
import { fetchTicker } from '../utils/api.js';
import { storageGet, storageSet } from '../utils/storage.js';
var h = React.createElement;

var CACHE_KEY = 'investmtg-ticker-cache';
var CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function loadCache() {
  var cached = storageGet(CACHE_KEY, null);
  if (!cached || !cached.ts || Date.now() - cached.ts > CACHE_TTL) return null;
  return cached.data || null;
}

function saveCache(data) {
  storageSet(CACHE_KEY, { ts: Date.now(), data: data });
}

export function Ticker() {
  var ref1 = React.useState([]);
  var items = ref1[0], setItems = ref1[1];

  React.useEffect(function() {
    var cancelled = false;

    // Try cache first for instant display
    var cached = loadCache();
    if (cached && cached.length > 0) {
      setItems(cached);
    }

    // Defer network fetch 2s to let critical render path complete first
    var timeout = setTimeout(function() {
      if (cancelled) return;

      // Fetch fresh data after delay
      fetchTicker().then(function(data) {
        if (!cancelled && data.length > 0) {
          setItems(data);
          saveCache(data);
        }
      }).catch(function() {
        // Keep cached data on error
      });

      // Refresh every 5 minutes
      interval = setInterval(function() {
        fetchTicker().then(function(data) {
          if (!cancelled && data.length > 0) {
            setItems(data);
            saveCache(data);
          }
        }).catch(function() {});
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

  // Duplicate for seamless scroll animation
  var doubled = items.concat(items);

  return h('div', { className: 'ticker-strip', 'aria-hidden': 'true' },
    h('div', { className: 'ticker-track' },
      doubled.map(function(item, i) {
        return h('span', { key: i, className: 'ticker-item' },
          h('span', { className: 'ticker-name' }, item.name),
          h('span', { className: 'ticker-price' }, formatUSD(item.price))
        );
      })
    )
  );
}
