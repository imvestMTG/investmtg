/* topdeck-api.js — TopDeck.gg REST API v2 wrapper
 * API docs: https://topdeck.gg/docs/tournaments-v2
 * REST endpoint: https://topdeck.gg/api
 * Requires API key in Authorization header (free to obtain)
 * Rate limit: 200 requests/minute
 *
 * IMPORTANT: This wrapper requires a TopDeck.gg API key.
 * Get one free at: https://topdeck.gg/account
 * Set via: setTopDeckApiKey('your-key-here')
 *
 * Attribution required: "Data provided by TopDeck.gg"
 */

var API_BASE = 'https://topdeck.gg/api';
var _apiKey = null;

/* Simple cache — 10 min TTL */
var _cache = {};
var CACHE_TTL = 10 * 60 * 1000;

function cached(key, fn) {
  var hit = _cache[key];
  if (hit && Date.now() - hit.ts < CACHE_TTL) {
    return Promise.resolve(hit.data);
  }
  return fn().then(function(data) {
    _cache[key] = { data: data, ts: Date.now() };
    return data;
  });
}

/**
 * Set the TopDeck.gg API key.
 * @param {string} key
 */
export function setTopDeckApiKey(key) {
  _apiKey = key;
}

/**
 * Check if API key is configured.
 * @returns {boolean}
 */
export function hasApiKey() {
  return !!_apiKey;
}

/* Internal fetch helper */
function tdFetch(method, path, body) {
  if (!_apiKey) {
    console.warn('[TopDeck] No API key set. Call setTopDeckApiKey() first.');
    return Promise.resolve(null);
  }

  var opts = {
    method: method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': _apiKey
    }
  };
  if (body) opts.body = JSON.stringify(body);

  return fetch(API_BASE + path, opts)
    .then(function(r) {
      if (!r.ok) {
        return r.json().then(function(err) {
          console.warn('[TopDeck] API error ' + r.status + ':', err);
          return null;
        });
      }
      return r.json();
    })
    .catch(function(err) {
      console.error('[TopDeck] Fetch error:', err);
      return null;
    });
}

/**
 * Search for completed tournaments.
 * @param {Object} opts
 * @param {number} [opts.last] - Days back from today (default 30)
 * @param {string} [opts.game] - Game name, e.g. "Magic: The Gathering"
 * @param {string} [opts.format] - Format, e.g. "EDH", "Standard", "Modern"
 * @param {number} [opts.participantMin] - Minimum participants
 * @param {number} [opts.participantMax] - Maximum participants
 * @param {string|string[]} [opts.TID] - Specific tournament ID(s)
 * @param {string[]} [opts.columns] - Player columns to include
 * @param {boolean|string[]} [opts.rounds] - Include round data
 * @returns {Promise<Array|null>} Array of tournament objects
 */
export function searchTournaments(opts) {
  opts = opts || {};
  var body = {
    last: opts.last || 30,
    game: opts.game || 'Magic: The Gathering',
    format: opts.format || 'EDH',
    columns: opts.columns || ['name', 'decklist', 'wins', 'losses', 'draws']
  };
  if (opts.participantMin) body.participantMin = opts.participantMin;
  if (opts.participantMax) body.participantMax = opts.participantMax;
  if (opts.TID) body.TID = opts.TID;
  if (opts.rounds) body.rounds = opts.rounds;

  var cacheKey = 'td_tournaments_' + JSON.stringify(body);

  return cached(cacheKey, function() {
    return tdFetch('POST', '/v2/tournaments', body);
  });
}

/**
 * Get tournament basic info.
 * @param {string} tid - Tournament ID
 * @returns {Promise<Object|null>}
 */
export function getTournamentInfo(tid) {
  return cached('td_info_' + tid, function() {
    return tdFetch('GET', '/v2/tournaments/' + tid + '/info');
  });
}

/**
 * Get tournament standings.
 * @param {string} tid - Tournament ID
 * @returns {Promise<Array|null>}
 */
export function getTournamentStandings(tid) {
  return cached('td_standings_' + tid, function() {
    return tdFetch('GET', '/v2/tournaments/' + tid + '/standings');
  });
}

/**
 * Get tournament rounds with table pairings.
 * @param {string} tid - Tournament ID
 * @returns {Promise<Array|null>}
 */
export function getTournamentRounds(tid) {
  return cached('td_rounds_' + tid, function() {
    return tdFetch('GET', '/v2/tournaments/' + tid + '/rounds');
  });
}

/**
 * Get latest/current round of a tournament.
 * @param {string} tid - Tournament ID
 * @returns {Promise<Array|null>}
 */
export function getLatestRound(tid) {
  return cached('td_latest_' + tid, function() {
    return tdFetch('GET', '/v2/tournaments/' + tid + '/rounds/latest');
  });
}

/**
 * Get specific player in a tournament.
 * @param {string} tid - Tournament ID
 * @param {string} playerId - Player ID
 * @returns {Promise<Object|null>}
 */
export function getTournamentPlayer(tid, playerId) {
  return cached('td_player_' + tid + '_' + playerId, function() {
    return tdFetch('GET', '/v2/tournaments/' + tid + '/players/' + playerId);
  });
}

/**
 * Get recent cEDH tournaments (convenience wrapper).
 * @param {number} [days] - Days back (default 14)
 * @param {number} [minPlayers] - Minimum players (default 16)
 * @returns {Promise<Array|null>}
 */
export function getRecentCEDHTournaments(days, minPlayers) {
  return searchTournaments({
    last: days || 14,
    game: 'Magic: The Gathering',
    format: 'EDH',
    participantMin: minPlayers || 16,
    columns: ['name', 'decklist', 'wins', 'losses', 'draws', 'winRate']
  });
}
