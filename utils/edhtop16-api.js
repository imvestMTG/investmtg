/* edhtop16-api.js — EDH Top 16 GraphQL API wrapper
 * Public API: https://edhtop16.com/api/graphql (no key required)
 * Data: cEDH commander meta share, win rates, top cuts, staples, tournaments
 */

var GRAPHQL_URL = 'https://edhtop16.com/api/graphql';

/* Simple in-memory cache — 15 min TTL */
var _cache = {};
var CACHE_TTL = 15 * 60 * 1000;

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

/* Core GraphQL fetch */
function gqlFetch(query, variables) {
  var body = { query: query };
  if (variables) body.variables = variables;
  return fetch(GRAPHQL_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  .then(function(r) { return r.json(); })
  .then(function(json) {
    if (json.errors) {
      console.warn('[EDHTop16] GraphQL errors:', json.errors);
      return null;
    }
    return json.data;
  })
  .catch(function(err) {
    console.error('[EDHTop16] Fetch error:', err);
    return null;
  });
}

/*
 * TIME PERIODS: ALL_TIME, ONE_MONTH, THREE_MONTHS, SIX_MONTHS, ONE_YEAR, POST_BAN
 * SORT BY: POPULARITY, CONVERSION, TOP_CUTS, WINRATE
 */

/**
 * Get top cEDH commanders with meta stats.
 * @param {Object} opts
 * @param {number} opts.count - Number of commanders (default 20)
 * @param {string} opts.sortBy - POPULARITY | CONVERSION | TOP_CUTS | WINRATE
 * @param {string} opts.timePeriod - THREE_MONTHS | SIX_MONTHS | ONE_YEAR | ALL_TIME | POST_BAN
 * @param {number} [opts.minEntries] - Minimum entries filter
 * @param {number} [opts.minTournamentSize] - Minimum tournament size
 * @param {string} [opts.colorId] - Color identity filter e.g. "UG", "WUBR"
 * @returns {Promise<Array>} Array of { name, colorId, count, topCuts, metaShare, conversionRate, winRate }
 */
export function getTopCommanders(opts) {
  opts = opts || {};
  var count = opts.count || 20;
  var sortBy = opts.sortBy || 'POPULARITY';
  var timePeriod = opts.timePeriod || 'THREE_MONTHS';

  var cacheKey = 'commanders_' + count + '_' + sortBy + '_' + timePeriod + '_' + (opts.colorId || '') + '_' + (opts.minEntries || '');

  var args = 'first: ' + count + ', sortBy: ' + sortBy + ', timePeriod: ' + timePeriod;
  if (opts.minEntries) args += ', minEntries: ' + opts.minEntries;
  if (opts.minTournamentSize) args += ', minTournamentSize: ' + opts.minTournamentSize;
  if (opts.colorId) args += ', colorId: "' + opts.colorId + '"';

  var statsFilters = '{ timePeriod: ' + timePeriod;
  if (opts.minTournamentSize) statsFilters += ', minSize: ' + opts.minTournamentSize;
  statsFilters += ' }';

  var query = '{ commanders(' + args + ') { edges { node { name colorId stats(filters: ' + statsFilters + ') { count topCuts metaShare conversionRate winRate } } } } }';

  return cached(cacheKey, function() {
    return gqlFetch(query).then(function(data) {
      if (!data || !data.commanders) return [];
      return data.commanders.edges.map(function(edge) {
        var n = edge.node;
        var s = n.stats || {};
        return {
          name: n.name,
          colorId: n.colorId,
          count: s.count || 0,
          topCuts: s.topCuts || 0,
          metaShare: s.metaShare || 0,
          conversionRate: s.conversionRate || 0,
          winRate: s.winRate || 0
        };
      });
    });
  });
}

/**
 * Get details for a specific commander.
 * @param {string} name - Commander name (exact match)
 * @returns {Promise<Object|null>} Commander detail with staples and recent entries
 */
export function getCommanderDetail(name) {
  var cacheKey = 'cmd_detail_' + name;
  var query = '{ commander(name: "' + name.replace(/"/g, '\\"') + '") { name colorId breakdownUrl staples { name percentage } stats(filters: { timePeriod: THREE_MONTHS }) { count topCuts metaShare conversionRate winRate } entries(first: 10, sortBy: NEW) { edges { node { standing winRate wins losses draws decklist tournament { name tournamentDate size TID } player { name } } } } } }';

  return cached(cacheKey, function() {
    return gqlFetch(query).then(function(data) {
      if (!data || !data.commander) return null;
      var c = data.commander;
      var s = c.stats || {};
      return {
        name: c.name,
        colorId: c.colorId,
        breakdownUrl: c.breakdownUrl,
        staples: (c.staples || []).map(function(st) {
          return { name: st.name, percentage: st.percentage };
        }),
        stats: {
          count: s.count || 0,
          topCuts: s.topCuts || 0,
          metaShare: s.metaShare || 0,
          conversionRate: s.conversionRate || 0,
          winRate: s.winRate || 0
        },
        recentEntries: (c.entries && c.entries.edges || []).map(function(edge) {
          var e = edge.node;
          return {
            standing: e.standing,
            winRate: e.winRate,
            wins: e.wins,
            losses: e.losses,
            draws: e.draws,
            decklist: e.decklist,
            playerName: e.player ? e.player.name : 'Unknown',
            tournamentName: e.tournament ? e.tournament.name : '',
            tournamentDate: e.tournament ? e.tournament.tournamentDate : '',
            tournamentSize: e.tournament ? e.tournament.size : 0,
            tournamentTID: e.tournament ? e.tournament.TID : ''
          };
        })
      };
    });
  });
}

/**
 * Get recent tournaments from EDH Top 16.
 * @param {Object} opts
 * @param {number} opts.count - Number of tournaments (default 10)
 * @returns {Promise<Array>} Array of tournament objects
 */
export function getRecentTournaments(opts) {
  opts = opts || {};
  var count = opts.count || 10;
  var cacheKey = 'tournaments_' + count;

  var query = '{ tournaments(first: ' + count + ', sortBy: DATE) { edges { node { name TID tournamentDate size topCut swissRounds entries { standing wins losses draws commander { name colorId } player { name } } } } } }';

  return cached(cacheKey, function() {
    return gqlFetch(query).then(function(data) {
      if (!data || !data.tournaments) return [];
      return data.tournaments.edges.map(function(edge) {
        var t = edge.node;
        return {
          name: t.name,
          TID: t.TID,
          date: t.tournamentDate,
          size: t.size,
          topCut: t.topCut,
          swissRounds: t.swissRounds,
          topEntries: (t.entries || []).slice(0, 4).map(function(e) {
            return {
              standing: e.standing,
              wins: e.wins,
              losses: e.losses,
              draws: e.draws,
              commander: e.commander ? e.commander.name : 'Unknown',
              commanderColorId: e.commander ? e.commander.colorId : '',
              playerName: e.player ? e.player.name : ''
            };
          })
        };
      });
    });
  });
}

/**
 * Get cEDH staple cards by color identity.
 * @param {string} [colorId] - e.g. "U", "UB", "WUBRG" (omit for all)
 * @returns {Promise<Array>} Array of { name, percentage, type }
 */
export function getStaples(colorId) {
  var cacheKey = 'staples_' + (colorId || 'all');
  var args = '';
  if (colorId) args = '(colorId: "' + colorId + '")';

  var query = '{ staples' + args + ' { name percentage type } }';

  return cached(cacheKey, function() {
    return gqlFetch(query).then(function(data) {
      if (!data || !data.staples) return [];
      return data.staples;
    });
  });
}

/**
 * Get card usage stats in cEDH.
 * @param {string} cardName - Exact card name
 * @returns {Promise<Object|null>} Card data with commander usage
 */
export function getCardStats(cardName) {
  var cacheKey = 'card_' + cardName;
  var query = '{ card(name: "' + cardName.replace(/"/g, '\\"') + '") { name type oracleText manaCost commanders { name colorId } } }';

  return cached(cacheKey, function() {
    return gqlFetch(query).then(function(data) {
      if (!data || !data.card) return null;
      return data.card;
    });
  });
}
