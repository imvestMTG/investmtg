/* DecklistView.js — Browse Moxfield decklists with price data */
import React from 'react';
import { getMoxfieldDeck, getPopularDeckList } from '../utils/moxfield-api.js';
import { getNamedCard } from '../utils/api.js';
import { formatUSD, getCardPrice, getScryfallImageUrl } from '../utils/helpers.js';
import { SkeletonCard } from './shared/SkeletonCard.js';
var h = React.createElement;

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

export function DecklistView() {
  var ref1 = React.useState([]);
  var popularDecks = ref1[0], setPopularDecks = ref1[1];
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

  React.useEffect(function() {
    getPopularDeckList().then(function(decks) {
      setPopularDecks(decks);
      setLoading(false);
    }).catch(function() { setLoading(false); });
  }, []);

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

    // Extract ID from Moxfield URL or use as-is
    var id = input;
    if (input.indexOf('moxfield.com/decks/') !== -1) {
      id = input.split('moxfield.com/decks/')[1].split('/')[0].split('?')[0];
    }
    if (id) loadDeck(id);
  }

  function goBack() {
    setActiveDeck(null);
    setDeckError(null);
  }

  // ── Render deck browser ──
  if (!activeDeck) {
    return h('div', { className: 'container decklist-view' },
      h('h1', null, 'Deck Browser'),
      h('p', { className: 'decklist-subtitle' },
        'Import decklists from Moxfield to check card prices and plan your builds.'
      ),

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

      h('h2', { style: { marginTop: 'var(--space-8)' } }, 'Popular Decklists'),
      loading
        ? h('div', { className: 'card-grid' }, [1,2,3].map(function(i) { return h(SkeletonCard, { key: i }); }))
        : h('div', { className: 'decklist-grid' },
            popularDecks.map(function(deck) {
              return h('button', {
                key: deck.id,
                className: 'decklist-card',
                onClick: function() { loadDeck(deck.id); }
              },
                h('div', { className: 'decklist-card-name' }, deck.name),
                h('div', { className: 'decklist-card-format' }, deck.format)
              );
            })
          ),

      h('p', { className: 'decklist-source', style: { marginTop: 'var(--space-6)' } },
        'Decklists from ',
        h('a', { href: 'https://www.moxfield.com', target: '_blank', rel: 'noopener noreferrer' }, 'Moxfield'),
        '. Paste any public Moxfield deck URL above to import it.'
      )
    );
  }

  // ── Render active deck ──
  // Group cards by type
  var groups = {};
  activeDeck.mainboard.forEach(function(card) {
    var cat = getTypeName(card.type);
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(card);
  });

  var groupOrder = ['Creatures', 'Instants', 'Sorceries', 'Enchantments', 'Artifacts', 'Planeswalkers', 'Lands', 'Other'];

  return h('div', { className: 'container decklist-view' },
    h('button', { className: 'back-link', onClick: goBack, style: { marginBottom: 'var(--space-4)' } },
      '\u2190 Back to Deck Browser'
    ),
    h('div', { className: 'decklist-header' },
      h('div', null,
        h('h1', null, activeDeck.name),
        h('div', { className: 'decklist-meta' },
          h('span', null, activeDeck.format),
          h('span', null, 'by ', activeDeck.author),
          h('span', null, activeDeck.totalCards + ' cards'),
          activeDeck.viewCount > 0 && h('span', null, activeDeck.viewCount.toLocaleString() + ' views')
        )
      ),
      h('a', {
        href: activeDeck.moxfieldUrl,
        target: '_blank',
        rel: 'noopener noreferrer',
        className: 'btn btn-secondary btn-sm'
      }, 'View on Moxfield')
    ),

    // Commander(s)
    activeDeck.commanders.length > 0 && h('div', { className: 'decklist-section' },
      h('h3', { className: 'decklist-section-title' }, 'Commander'),
      h('div', { className: 'decklist-cards' },
        activeDeck.commanders.map(function(card) {
          return h('a', {
            key: card.name,
            className: 'decklist-card-row',
            href: card.scryfallId ? '#card/' + card.scryfallId : '#search',
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
            h('span', { className: 'decklist-qty' }, card.quantity + 'x'),
            h('span', { className: 'decklist-card-name-text' }, card.name),
            renderManaCost(card.manaCost)
          );
        })
      )
    ),

    // Companion
    activeDeck.companion.length > 0 && h('div', { className: 'decklist-section' },
      h('h3', { className: 'decklist-section-title' }, 'Companion'),
      h('div', { className: 'decklist-cards' },
        activeDeck.companion.map(function(card) {
          return h('div', { key: card.name, className: 'decklist-card-row' },
            h('span', { className: 'decklist-qty' }, card.quantity + 'x'),
            h('span', { className: 'decklist-card-name-text' }, card.name)
          );
        })
      )
    ),

    // Main deck grouped by type
    groupOrder.map(function(groupName) {
      var cards = groups[groupName];
      if (!cards || cards.length === 0) return null;
      var count = cards.reduce(function(sum, c) { return sum + c.quantity; }, 0);

      return h('div', { key: groupName, className: 'decklist-section' },
        h('h3', { className: 'decklist-section-title' },
          groupName + ' (' + count + ')'
        ),
        h('div', { className: 'decklist-cards' },
          cards.map(function(card) {
            return h('a', {
              key: card.name,
              className: 'decklist-card-row',
              href: card.scryfallId ? '#card/' + card.scryfallId : '#search',
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
              h('span', { className: 'decklist-qty' }, card.quantity + 'x'),
              h('span', { className: 'decklist-card-name-text' }, card.name),
              renderManaCost(card.manaCost)
            );
          })
        )
      );
    }),

    // Sideboard
    activeDeck.sideboard.length > 0 && h('div', { className: 'decklist-section' },
      h('h3', { className: 'decklist-section-title' },
        'Sideboard (' + activeDeck.sideboard.length + ')'
      ),
      h('div', { className: 'decklist-cards' },
        activeDeck.sideboard.map(function(card) {
          return h('a', {
            key: card.name,
            className: 'decklist-card-row',
            href: card.scryfallId ? '#card/' + card.scryfallId : '#search',
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
            h('span', { className: 'decklist-qty' }, card.quantity + 'x'),
            h('span', { className: 'decklist-card-name-text' }, card.name)
          );
        })
      )
    ),

    h('p', { className: 'decklist-source' },
      'Decklist from ',
      h('a', { href: activeDeck.moxfieldUrl, target: '_blank', rel: 'noopener noreferrer' }, 'Moxfield'),
      '. Click any card name to see its price on investMTG.'
    )
  );
}
