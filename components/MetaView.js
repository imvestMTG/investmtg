/* MetaView.js — cEDH Metagame dashboard powered by EDH Top 16 + TopDeck.gg
 * Shows top commanders, recent tournaments, staples, and commander detail
 * Data: edhtop16.com GraphQL API (public, no key)
 */
import React from 'react';
import { getTopCommanders, getCommanderDetail, getRecentTournaments, getStaples } from '../utils/edhtop16-api.js';
import { getScryfallImageUrl } from '../utils/helpers.js';
import { SkeletonCard } from './shared/SkeletonCard.js';
var h = React.createElement;

/* ---- Color identity helpers ---- */
var COLOR_MAP = {
  W: { symbol: '\u2600', label: 'White', css: '#F9FAF4' },
  U: { symbol: '\uD83D\uDCA7', label: 'Blue', css: '#0E68AB' },
  B: { symbol: '\uD83D\uDC80', label: 'Black', css: '#150B00' },
  R: { symbol: '\uD83D\uDD25', label: 'Red', css: '#D3202A' },
  G: { symbol: '\uD83C\uDF3F', label: 'Green', css: '#00733E' }
};

function ColorPips(props) {
  var colorId = props.colorId || '';
  return h('span', { className: 'meta-color-pips' },
    colorId.split('').map(function(c, i) {
      var info = COLOR_MAP[c];
      if (!info) return null;
      return h('span', {
        key: i,
        className: 'meta-pip meta-pip-' + c.toLowerCase(),
        title: info.label
      }, info.symbol);
    })
  );
}

function pct(n) {
  return (n * 100).toFixed(1) + '%';
}

/* ---- Tab button ---- */
function TabBtn(props) {
  return h('button', {
    className: 'meta-tab' + (props.active ? ' meta-tab--active' : ''),
    onClick: props.onClick
  }, props.label);
}

/* ---- Time period selector ---- */
var TIME_OPTIONS = [
  { value: 'ONE_MONTH', label: '1 Month' },
  { value: 'THREE_MONTHS', label: '3 Months' },
  { value: 'SIX_MONTHS', label: '6 Months' },
  { value: 'ONE_YEAR', label: '1 Year' },
  { value: 'POST_BAN', label: 'Post-Ban' },
  { value: 'ALL_TIME', label: 'All Time' }
];

/* ---- Sort options ---- */
var SORT_OPTIONS = [
  { value: 'POPULARITY', label: 'Popularity' },
  { value: 'WINRATE', label: 'Win Rate' },
  { value: 'CONVERSION', label: 'Conversion' },
  { value: 'TOP_CUTS', label: 'Top Cuts' }
];

/* ---- Commander Row (table row) ---- */
function CommanderRow(props) {
  var c = props.commander;
  var rank = props.rank;
  var onClick = props.onClick;

  /* Try to get first commander name for card image */
  var firstName = c.name.split(' / ')[0];

  return h('tr', {
    className: 'meta-commander-row',
    onClick: function() { onClick(c.name); },
    style: { cursor: 'pointer' }
  },
    h('td', { className: 'meta-rank' }, rank),
    h('td', { className: 'meta-cmd-cell' },
      h('img', {
        src: getScryfallImageUrl(firstName, 'art_crop'),
        alt: firstName,
        className: 'meta-cmd-thumb',
        loading: 'lazy',
        onError: function(e) { e.target.style.display = 'none'; }
      }),
      h('div', { className: 'meta-cmd-info' },
        h('span', { className: 'meta-cmd-name' }, c.name),
        h(ColorPips, { colorId: c.colorId })
      )
    ),
    h('td', { className: 'meta-stat' }, pct(c.metaShare)),
    h('td', { className: 'meta-stat' }, c.count.toLocaleString()),
    h('td', { className: 'meta-stat meta-stat-wr' }, pct(c.winRate)),
    h('td', { className: 'meta-stat' }, pct(c.conversionRate)),
    h('td', { className: 'meta-stat' }, c.topCuts.toLocaleString())
  );
}

/* ---- Commander Detail Panel ---- */
function CommanderDetailPanel(props) {
  var detail = props.detail;
  var onClose = props.onClose;
  if (!detail) return null;

  var firstName = detail.name.split(' / ')[0];

  return h('div', { className: 'meta-detail-panel' },
    h('div', { className: 'meta-detail-header' },
      h('div', { className: 'meta-detail-title-row' },
        h('h3', { className: 'meta-detail-name' }, detail.name),
        h('button', { className: 'meta-detail-close', onClick: onClose, 'aria-label': 'Close' }, '\u2715')
      ),
      h(ColorPips, { colorId: detail.colorId }),
      detail.breakdownUrl && h('a', {
        href: detail.breakdownUrl,
        target: '_blank',
        rel: 'noopener noreferrer',
        className: 'meta-detail-link'
      }, 'View on EDH Top 16 \u2192')
    ),

    /* Stats grid */
    h('div', { className: 'meta-detail-stats' },
      h('div', { className: 'meta-stat-card' },
        h('span', { className: 'meta-stat-label' }, 'Entries'),
        h('span', { className: 'meta-stat-value' }, detail.stats.count.toLocaleString())
      ),
      h('div', { className: 'meta-stat-card' },
        h('span', { className: 'meta-stat-label' }, 'Win Rate'),
        h('span', { className: 'meta-stat-value' }, pct(detail.stats.winRate))
      ),
      h('div', { className: 'meta-stat-card' },
        h('span', { className: 'meta-stat-label' }, 'Meta Share'),
        h('span', { className: 'meta-stat-value' }, pct(detail.stats.metaShare))
      ),
      h('div', { className: 'meta-stat-card' },
        h('span', { className: 'meta-stat-label' }, 'Conversion'),
        h('span', { className: 'meta-stat-value' }, pct(detail.stats.conversionRate))
      )
    ),

    /* Staples */
    detail.staples && detail.staples.length > 0 && h('div', { className: 'meta-detail-section' },
      h('h4', null, 'Top Staples'),
      h('div', { className: 'meta-staples-grid' },
        detail.staples.slice(0, 15).map(function(s) {
          return h('a', {
            key: s.name,
            className: 'meta-staple-chip',
            href: '#card/' + encodeURIComponent(s.name),
            title: s.name + ' (' + pct(s.percentage) + ' of decks)'
          },
            h('span', { className: 'meta-staple-name' }, s.name),
            h('span', { className: 'meta-staple-pct' }, pct(s.percentage))
          );
        })
      )
    ),

    /* Recent entries */
    detail.recentEntries && detail.recentEntries.length > 0 && h('div', { className: 'meta-detail-section' },
      h('h4', null, 'Recent Tournament Results'),
      h('div', { className: 'meta-entries-list' },
        detail.recentEntries.map(function(e, i) {
          return h('div', { key: i, className: 'meta-entry-row' },
            h('span', { className: 'meta-entry-standing' }, '#' + e.standing),
            h('span', { className: 'meta-entry-player' }, e.playerName),
            h('span', { className: 'meta-entry-record' }, e.wins + '-' + e.losses + (e.draws ? '-' + e.draws : '')),
            h('span', { className: 'meta-entry-tourney' }, e.tournamentName),
            e.decklist && h('a', {
              href: e.decklist,
              target: '_blank',
              rel: 'noopener noreferrer',
              className: 'meta-entry-deck-link'
            }, 'Deck')
          );
        })
      )
    ),

    /* Attribution */
    h('div', { className: 'meta-attribution' },
      'Data provided by ',
      h('a', { href: 'https://edhtop16.com', target: '_blank', rel: 'noopener noreferrer' }, 'EDH Top 16'),
      ' and ',
      h('a', { href: 'https://topdeck.gg', target: '_blank', rel: 'noopener noreferrer' }, 'TopDeck.gg')
    )
  );
}

/* ---- Tournaments list ---- */
function TournamentsList(props) {
  var tournaments = props.tournaments;
  var loading = props.loading;

  if (loading) {
    return h('div', { className: 'meta-loading' },
      h('div', { className: 'meta-spinner' }),
      'Loading tournaments...'
    );
  }
  if (!tournaments || tournaments.length === 0) {
    return h('div', { className: 'meta-empty' }, 'No recent tournaments found.');
  }

  return h('div', { className: 'meta-tournaments-list' },
    tournaments.map(function(t, i) {
      return h('div', { key: i, className: 'meta-tournament-card' },
        h('div', { className: 'meta-tournament-header' },
          h('h4', { className: 'meta-tournament-name' },
            h('a', {
              href: 'https://edhtop16.com/tournament/' + t.TID,
              target: '_blank',
              rel: 'noopener noreferrer'
            }, t.name)
          ),
          h('div', { className: 'meta-tournament-meta' },
            h('span', null, t.size + ' players'),
            t.date && h('span', null, new Date(t.date).toLocaleDateString()),
            t.topCut && h('span', null, 'Top ' + t.topCut)
          )
        ),
        t.topEntries && t.topEntries.length > 0 && h('div', { className: 'meta-tournament-top' },
          t.topEntries.map(function(e, j) {
            return h('div', { key: j, className: 'meta-tournament-entry' },
              h('span', { className: 'meta-entry-standing' }, '#' + e.standing),
              h('span', { className: 'meta-tournament-cmd' }, e.commander),
              h('span', { className: 'meta-entry-record' }, e.wins + '-' + e.losses)
            );
          })
        )
      );
    })
  );
}

/* ---- Staples list ---- */
function StaplesList(props) {
  var staples = props.staples;
  var loading = props.loading;

  if (loading) {
    return h('div', { className: 'meta-loading' },
      h('div', { className: 'meta-spinner' }),
      'Loading staples...'
    );
  }
  if (!staples || staples.length === 0) {
    return h('div', { className: 'meta-empty' }, 'No staple data available.');
  }

  return h('div', { className: 'meta-staples-table' },
    h('table', null,
      h('thead', null,
        h('tr', null,
          h('th', null, '#'),
          h('th', null, 'Card'),
          h('th', null, 'Type'),
          h('th', null, '% of Decks')
        )
      ),
      h('tbody', null,
        staples.slice(0, 40).map(function(s, i) {
          return h('tr', { key: s.name, className: 'meta-staple-row' },
            h('td', { className: 'meta-rank' }, i + 1),
            h('td', null,
              h('a', {
                href: '#card/' + encodeURIComponent(s.name),
                className: 'meta-staple-link'
              }, s.name)
            ),
            h('td', { className: 'meta-stat' }, s.type || '\u2014'),
            h('td', { className: 'meta-stat' }, pct(s.percentage))
          );
        })
      )
    )
  );
}

/* ==== MAIN COMPONENT ==== */
export function MetaView() {
  /* State */
  var ref1 = React.useState('commanders');
  var tab = ref1[0], setTab = ref1[1];

  var ref2 = React.useState('THREE_MONTHS');
  var timePeriod = ref2[0], setTimePeriod = ref2[1];

  var ref3 = React.useState('POPULARITY');
  var sortBy = ref3[0], setSortBy = ref3[1];

  var ref4 = React.useState([]);
  var commanders = ref4[0], setCommanders = ref4[1];

  var ref5 = React.useState(true);
  var loading = ref5[0], setLoading = ref5[1];

  var ref6 = React.useState(null);
  var selectedCommander = ref6[0], setSelectedCommander = ref6[1];

  var ref7 = React.useState(null);
  var commanderDetail = ref7[0], setCommanderDetail = ref7[1];

  var ref8 = React.useState(false);
  var detailLoading = ref8[0], setDetailLoading = ref8[1];

  var ref9 = React.useState([]);
  var tournaments = ref9[0], setTournaments = ref9[1];

  var ref10 = React.useState(false);
  var tournamentsLoading = ref10[0], setTournamentsLoading = ref10[1];

  var ref11 = React.useState([]);
  var staples = ref11[0], setStaples = ref11[1];

  var ref12 = React.useState(false);
  var staplesLoading = ref12[0], setStaplesLoading = ref12[1];

  /* Fetch commanders on mount and when filters change */
  React.useEffect(function() {
    setLoading(true);
    getTopCommanders({
      count: 30,
      sortBy: sortBy,
      timePeriod: timePeriod
    }).then(function(data) {
      setCommanders(data || []);
      setLoading(false);
    });
  }, [sortBy, timePeriod]);

  /* Fetch tournaments when tab changes */
  React.useEffect(function() {
    if (tab === 'tournaments' && tournaments.length === 0) {
      setTournamentsLoading(true);
      getRecentTournaments({ count: 12 }).then(function(data) {
        setTournaments(data || []);
        setTournamentsLoading(false);
      });
    }
  }, [tab]);

  /* Fetch staples when tab changes */
  React.useEffect(function() {
    if (tab === 'staples' && staples.length === 0) {
      setStaplesLoading(true);
      getStaples().then(function(data) {
        setStaples(data || []);
        setStaplesLoading(false);
      });
    }
  }, [tab]);

  /* Load commander detail */
  function openCommanderDetail(name) {
    setSelectedCommander(name);
    setDetailLoading(true);
    setCommanderDetail(null);
    getCommanderDetail(name).then(function(data) {
      setCommanderDetail(data);
      setDetailLoading(false);
    });
  }

  function closeDetail() {
    setSelectedCommander(null);
    setCommanderDetail(null);
  }

  return h('div', { className: 'container meta-page' },
    h('div', { className: 'meta-page-header' },
      h('h1', { className: 'page-heading' }, 'cEDH Metagame'),
      h('p', { className: 'meta-subtitle' }, 'Competitive EDH tournament data from EDH Top 16 and TopDeck.gg')
    ),

    /* Tabs */
    h('div', { className: 'meta-tabs' },
      h(TabBtn, { label: 'Top Commanders', active: tab === 'commanders', onClick: function() { setTab('commanders'); } }),
      h(TabBtn, { label: 'Recent Tournaments', active: tab === 'tournaments', onClick: function() { setTab('tournaments'); } }),
      h(TabBtn, { label: 'Staple Cards', active: tab === 'staples', onClick: function() { setTab('staples'); } })
    ),

    /* Detail panel overlay */
    selectedCommander && h('div', { className: 'meta-detail-overlay', onClick: closeDetail },
      h('div', { className: 'meta-detail-container', onClick: function(e) { e.stopPropagation(); } },
        detailLoading
          ? h('div', { className: 'meta-loading' }, h('div', { className: 'meta-spinner' }), 'Loading commander data...')
          : h(CommanderDetailPanel, { detail: commanderDetail, onClose: closeDetail })
      )
    ),

    /* === COMMANDERS TAB === */
    tab === 'commanders' && h('div', { className: 'meta-commanders-section' },
      /* Filters row */
      h('div', { className: 'meta-filters' },
        h('div', { className: 'meta-filter-group' },
          h('label', { className: 'meta-filter-label' }, 'Time Period'),
          h('select', {
            className: 'meta-select',
            value: timePeriod,
            onChange: function(e) { setTimePeriod(e.target.value); }
          },
            TIME_OPTIONS.map(function(o) {
              return h('option', { key: o.value, value: o.value }, o.label);
            })
          )
        ),
        h('div', { className: 'meta-filter-group' },
          h('label', { className: 'meta-filter-label' }, 'Sort By'),
          h('select', {
            className: 'meta-select',
            value: sortBy,
            onChange: function(e) { setSortBy(e.target.value); }
          },
            SORT_OPTIONS.map(function(o) {
              return h('option', { key: o.value, value: o.value }, o.label);
            })
          )
        )
      ),

      /* Loading state */
      loading
        ? h('div', { className: 'meta-loading' },
            h('div', { className: 'meta-spinner' }),
            'Loading cEDH metagame...'
          )
        : h('div', { className: 'meta-table-wrapper' },
            h('table', { className: 'meta-commanders-table' },
              h('thead', null,
                h('tr', null,
                  h('th', null, '#'),
                  h('th', null, 'Commander'),
                  h('th', null, 'Meta %'),
                  h('th', null, 'Entries'),
                  h('th', null, 'Win Rate'),
                  h('th', null, 'Conv.'),
                  h('th', null, 'Top Cuts')
                )
              ),
              h('tbody', null,
                commanders.map(function(c, i) {
                  return h(CommanderRow, {
                    key: c.name,
                    commander: c,
                    rank: i + 1,
                    onClick: openCommanderDetail
                  });
                })
              )
            )
          )
    ),

    /* === TOURNAMENTS TAB === */
    tab === 'tournaments' && h(TournamentsList, {
      tournaments: tournaments,
      loading: tournamentsLoading
    }),

    /* === STAPLES TAB === */
    tab === 'staples' && h(StaplesList, {
      staples: staples,
      loading: staplesLoading
    }),

    /* Attribution footer */
    h('div', { className: 'meta-attribution' },
      'Data provided by ',
      h('a', { href: 'https://edhtop16.com', target: '_blank', rel: 'noopener noreferrer' }, 'EDH Top 16'),
      ' and ',
      h('a', { href: 'https://topdeck.gg', target: '_blank', rel: 'noopener noreferrer' }, 'TopDeck.gg')
    )
  );
}
