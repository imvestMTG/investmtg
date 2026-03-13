/* DecklistView.js — Deck browser with Moxfield search, prices, image preview */
import React from 'react';
import { getMoxfieldDeck, searchMoxfieldDecks, getPopularDeckList } from '../utils/moxfield-api.js';
import { formatUSD, getScryfallImageUrl, handleImageError } from '../utils/helpers.js';
import { SkeletonCard } from './shared/SkeletonCard.js';
import { ShareButton } from './shared/ShareButton.js';
import { ChevronLeftIcon, SearchIcon } from './shared/Icons.js';
import { showToast } from './shared/Toast.js';
var h = React.createElement;

/* ── Format tabs ── */
var FORMAT_TABS = [
  { key: 'all', label: 'All' },
  { key: 'standard', label: 'Standard' },
  { key: 'modern', label: 'Modern' },
  { key: 'pioneer', label: 'Pioneer' },
  { key: 'commander', label: 'Commander' },
  { key: 'pauper', label: 'Pauper' },
];

/* ── Format badge colors ── */
var FORMAT_COLORS = {
  standard: '#22c55e',
  modern: '#3b82f6',
  pioneer: '#f59e0b',
  commander: '#a855f7',
  pauper: '#64748b',
  legacy: '#ef4444',
  vintage: '#ec4899',
  none: '#6b7280',
  unknown: '#6b7280',
};

/* ── Mana cost symbols to colored spans ── */
function renderManaCost(manaCost) {
  if (!manaCost) return null;
  var symbols = manaCost.match(/\{[^}]+\}/g) || [];
  return h('span', { className: 'mana-cost' },
    symbols.map(function(sym, i) {
      var code = sym.replace(/[{}]/g, '').replace('/', '');
      return h('span', { key: i, className: 'mana-symbol mana-' + code.toLowerCase() }, code);
    })
  );
}

/* ── Type category header ── */
function getTypeName(type) {
  if (!type) return 'Other';
  var t = type.toLowerCase();
  if (t.indexOf('creature') !== -1) return 'Creatures';
  if (t.indexOf('instant') !== -1) return 'Instants';
  if (t.indexOf('sorcery') !== -1) return 'Sorceries';
  if (t.indexOf('enchantment') !== -1) return 'Enchantments';
  if (t.indexOf('artifact') !== -1) return 'Artifacts';
  if (t.indexOf('planeswalker') !== -1) return 'Planeswalkers';
  if (t.indexOf('land') !== -1) return 'Lands';
  return 'Other';
}

/* ── Card image hover preview ── */
function CardImagePreview(props) {
  var scryfallId = props.scryfallId;
  var name = props.name;
  if (!scryfallId) return null;
  var imgUrl = 'https://api.scryfall.com/cards/' + scryfallId + '?format=image&version=normal';
  return h('div', { className: 'dk-img-preview' },
    h('img', {
      src: imgUrl,
      alt: name,
      loading: 'lazy',
      onError: function(e) { handleImageError(e, scryfallId, 'normal'); }
    })
  );
}

export function DecklistView() {
  var ref1 = React.useState([]);
  var browseDecks = ref1[0], setBrowseDecks = ref1[1];
  var ref2 = React.useState(null);
  var activeDeck = ref2[0], setActiveDeck = ref2[1];
  var ref3 = React.useState(true);
  var loading = ref3[0], setLoading = ref3[1];
  var ref4 = React.useState('');
  var deckUrl = ref4[0], setDeckUrl = ref4[1];
  var ref5 = React.useState(null);
  var deckError = ref5[0], setDeckError = ref5[1];
  var ref6 = React.useState(false);
  var loadingDeck = ref6[0], setLoadingDeck = ref6[1];
  var ref7 = React.useState('all');
  var activeFormat = ref7[0], setActiveFormat = ref7[1];
  var ref8 = React.useState(null);
  var hoveredCard = ref8[0], setHoveredCard = ref8[1];

  /* Load browse decks — try Moxfield search, fall back to curated list */
  React.useEffect(function() {
    setLoading(true);
    if (activeFormat === 'all') {
      // Fetch from multiple formats in parallel
      Promise.all([
        searchMoxfieldDecks('standard', 4),
        searchMoxfieldDecks('modern', 4),
        searchMoxfieldDecks('pioneer', 4),
        searchMoxfieldDecks('commander', 4),
      ]).then(function(results) {
        var merged = [].concat(results[0], results[1], results[2], results[3]);
        if (merged.length > 0) {
          setBrowseDecks(merged);
        } else {
          // Fallback to curated
          getPopularDeckList().then(function(d) { setBrowseDecks(d); });
        }
        setLoading(false);
      }).catch(function() {
        getPopularDeckList().then(function(d) { setBrowseDecks(d); setLoading(false); });
      });
    } else {
      searchMoxfieldDecks(activeFormat, 12).then(function(decks) {
        if (decks.length > 0) {
          setBrowseDecks(decks);
        } else {
          getPopularDeckList().then(function(all) {
            setBrowseDecks(all.filter(function(d) { return d.format === activeFormat; }));
          });
        }
        setLoading(false);
      }).catch(function() { setLoading(false); });
    }
  }, [activeFormat]);

  function loadDeck(deckId) {
    setLoadingDeck(true);
    setDeckError(null);
    getMoxfieldDeck(deckId).then(function(deck) {
      if (deck) {
        setActiveDeck(deck);
      } else {
        setDeckError('Could not load this deck. It may be private or the ID is invalid.');
      }
      setLoadingDeck(false);
    }).catch(function() {
      setDeckError('Failed to fetch decklist. Please try again.');
      setLoadingDeck(false);
    });
  }

  function handleUrlSubmit(e) {
    e.preventDefault();
    var input = deckUrl.trim();
    if (!input) return;
    var id = input;
    if (input.indexOf('moxfield.com/decks/') !== -1) {
      id = input.split('moxfield.com/decks/')[1].split('/')[0].split('?')[0];
    }
    if (id) loadDeck(id);
  }

  function goBack() {
    setActiveDeck(null);
    setDeckError(null);
    setHoveredCard(null);
  }

  /* ══════════════════════════════════════
     DECK BROWSER VIEW
     ══════════════════════════════════════ */
  if (!activeDeck) {
    return h('div', { className: 'container decklist-view' },
      h('div', { className: 'page-header-row' },
        h('h1', null, 'Deck Browser'),
        h(ShareButton, {
          title: 'Deck Browser | investMTG',
          text: 'Browse and price-check MTG decklists from Moxfield on investMTG',
          url: 'https://www.investmtg.com/#decks',
          size: 'sm'
        })
      ),
      h('p', { className: 'decklist-subtitle' },
        'Browse popular decklists from Moxfield across all major formats. Import any public deck to check card prices.'
      ),

      /* Search bar */
      h('form', { className: 'decklist-search', onSubmit: handleUrlSubmit },
        h('input', {
          type: 'text',
          placeholder: 'Paste a Moxfield deck URL or ID...',
          value: deckUrl,
          onChange: function(e) { setDeckUrl(e.target.value); },
          className: 'decklist-input'
        }),
        h('button', { type: 'submit', className: 'btn btn-primary', disabled: loadingDeck },
          loadingDeck ? 'Loading...' : 'Import Deck'
        )
      ),

      deckError && h('div', { className: 'decklist-error' }, deckError),

      /* Format filter tabs */
      h('div', { className: 'dk-format-tabs' },
        FORMAT_TABS.map(function(tab) {
          return h('button', {
            key: tab.key,
            className: 'dk-format-tab' + (activeFormat === tab.key ? ' dk-format-tab--active' : ''),
            onClick: function() { setActiveFormat(tab.key); }
          }, tab.label);
        })
      ),

      /* Deck grid */
      loading
        ? h('div', { className: 'dk-browse-grid' },
            [1,2,3,4,5,6].map(function(i) {
              return h('div', { key: i, className: 'dk-browse-card dk-browse-card--skeleton' },
                h('div', { className: 'skeleton skeleton-text', style: { width: '70%', height: '16px' } }),
                h('div', { className: 'skeleton skeleton-text', style: { width: '40%', height: '12px', marginTop: '8px' } })
              );
            })
          )
        : browseDecks.length > 0
          ? h('div', { className: 'dk-browse-grid' },
              browseDecks.map(function(deck) {
                var fmt = deck.format || 'unknown';
                var color = FORMAT_COLORS[fmt] || FORMAT_COLORS.unknown;
                return h('button', {
                  key: deck.id,
                  className: 'dk-browse-card',
                  onClick: function() { loadDeck(deck.id); }
                },
                  h('div', { className: 'dk-browse-top' },
                    h('span', {
                      className: 'dk-format-badge',
                      style: { background: color + '22', color: color, borderColor: color + '44' }
                    }, fmt),
                    deck.viewCount > 0 && h('span', { className: 'dk-views' }, deck.viewCount.toLocaleString() + ' views')
                  ),
                  h('div', { className: 'dk-browse-name' }, deck.name),
                  h('div', { className: 'dk-browse-meta' },
                    deck.author && deck.author !== 'Unknown'
                      ? h('span', null, 'by ' + deck.author)
                      : null,
                    deck.mainboardCount > 0 && h('span', null, deck.mainboardCount + ' cards')
                  )
                );
              })
            )
          : h('div', { className: 'empty-state' },
              h('p', null, 'No decks found for this format. Try importing a Moxfield URL above.')
            ),

      h('p', { className: 'decklist-source', style: { marginTop: 'var(--space-6)' } },
        'Decklist data from ',
        h('a', { href: 'https://www.moxfield.com', target: '_blank', rel: 'noopener noreferrer' }, 'Moxfield'),
        '. Sorted by most viewed. Prices from Scryfall market data.'
      )
    );
  }

  /* ══════════════════════════════════════
     ACTIVE DECK DETAIL VIEW
     ══════════════════════════════════════ */
  // Group cards by type
  var groups = {};
  activeDeck.mainboard.forEach(function(card) {
    var cat = getTypeName(card.type);
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(card);
  });

  var groupOrder = ['Creatures', 'Instants', 'Sorceries', 'Enchantments', 'Artifacts', 'Planeswalkers', 'Lands', 'Other'];
  var fmt = activeDeck.format || 'unknown';
  var badgeColor = FORMAT_COLORS[fmt] || FORMAT_COLORS.unknown;

  return h('div', { className: 'container decklist-view' },
    h('button', { className: 'back-link', onClick: goBack },
      h(ChevronLeftIcon, null), ' Back to Deck Browser'
    ),

    /* Deck header */
    h('div', { className: 'dk-detail-header' },
      h('div', { className: 'dk-detail-info' },
        h('h1', null, activeDeck.name),
        h('div', { className: 'dk-detail-meta' },
          h('span', {
            className: 'dk-format-badge',
            style: { background: badgeColor + '22', color: badgeColor, borderColor: badgeColor + '44' }
          }, fmt),
          h('span', null, 'by ' + activeDeck.author),
          h('span', null, activeDeck.totalCards + ' cards'),
          activeDeck.viewCount > 0 && h('span', null, activeDeck.viewCount.toLocaleString() + ' views')
        )
      ),
      h('div', { className: 'dk-detail-actions' },
        h('div', { className: 'dk-price-badge' },
          h('div', { className: 'dk-price-label' }, 'Deck Price'),
          h('div', { className: 'dk-price-value' }, formatUSD(activeDeck.totalPriceUsd))
        ),
        h(ShareButton, {
          title: activeDeck.name + ' | investMTG',
          text: activeDeck.name + ' (' + fmt + ') \u2014 ' + formatUSD(activeDeck.totalPriceUsd) + '\nCheck deck prices on investMTG',
          url: 'https://www.investmtg.com/#decks',
          size: 'sm'
        }),
        h('a', {
          href: activeDeck.moxfieldUrl,
          target: '_blank',
          rel: 'noopener noreferrer',
          className: 'btn btn-secondary btn-sm'
        }, 'View on Moxfield')
      )
    ),

    /* Card image preview (fixed position) */
    hoveredCard && h(CardImagePreview, { scryfallId: hoveredCard.scryfallId, name: hoveredCard.name }),

    /* Commander(s) */
    activeDeck.commanders.length > 0 && renderSection('Commander', activeDeck.commanders, setHoveredCard),

    /* Companion */
    activeDeck.companion.length > 0 && renderSection('Companion', activeDeck.companion, setHoveredCard),

    /* Main deck grouped by type */
    groupOrder.map(function(groupName) {
      var cards = groups[groupName];
      if (!cards || cards.length === 0) return null;
      var count = cards.reduce(function(sum, c) { return sum + c.quantity; }, 0);
      var groupCost = cards.reduce(function(sum, c) { return sum + (c.priceUsd * c.quantity); }, 0);
      return renderSection(
        groupName + ' (' + count + ')',
        cards,
        setHoveredCard,
        groupCost,
        groupName
      );
    }),

    /* Sideboard */
    activeDeck.sideboard.length > 0 && renderSection('Sideboard (' + activeDeck.sideboard.length + ')', activeDeck.sideboard, setHoveredCard),

    h('p', { className: 'decklist-source' },
      'Decklist from ',
      h('a', { href: activeDeck.moxfieldUrl, target: '_blank', rel: 'noopener noreferrer' }, 'Moxfield'),
      '. Prices from Scryfall market data (USD). Click any card to see details.'
    )
  );
}

/* ── Render a deck section with card rows ── */
function renderSection(title, cards, setHoveredCard, groupCost, key) {
  return h('div', { key: key || title, className: 'dk-section' },
    h('div', { className: 'dk-section-header' },
      h('h3', { className: 'dk-section-title' }, title),
      groupCost > 0 && h('span', { className: 'dk-section-cost' }, formatUSD(groupCost))
    ),
    h('div', { className: 'dk-card-list' },
      cards.map(function(card) {
        return h('a', {
          key: card.name,
          className: 'dk-card-row',
          href: card.scryfallId ? '#card/' + card.scryfallId : '#search',
          onMouseEnter: function() { setHoveredCard(card); },
          onMouseLeave: function() { setHoveredCard(null); },
          onClick: function(e) {
            if (!card.scryfallId) {
              e.preventDefault();
              window.location.hash = 'search';
              setTimeout(function() {
                var ev = new CustomEvent('investmtg-search', { detail: card.name });
                window.dispatchEvent(ev);
              }, 50);
            }
          }
        },
          h('span', { className: 'dk-qty' }, card.quantity + 'x'),
          h('span', { className: 'dk-card-name' }, card.name),
          renderManaCost(card.manaCost),
          h('span', { className: 'dk-card-price' },
            card.priceUsd > 0 ? formatUSD(card.priceUsd) : '\u2014'
          )
        );
      })
    )
  );
}
