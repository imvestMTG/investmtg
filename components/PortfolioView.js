/* PortfolioView.js — Portfolio with live prices from backend */
import React from 'react';
import { formatUSD } from '../utils/helpers.js';
import { PortfolioIcon, UploadIcon, AlertCircleIcon, CheckCircleIcon, XIcon } from './shared/Icons.js';
import { fetchPortfolio, addToPortfolioAPI, removeFromPortfolioAPI, addToPortfolioBatch } from '../utils/api.js';
import { storageGet, storageSet } from '../utils/storage.js';
import { parseManaboxCSV, parseTextList } from '../utils/import-parser.js';
var h = React.createElement;

var PRICE_CACHE_KEY = 'investmtg-portfolio-prices';
var PRICE_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function loadPriceCache() {
  var cached = storageGet(PRICE_CACHE_KEY, null);
  if (!cached || !cached.ts || Date.now() - cached.ts > PRICE_CACHE_TTL) return null;
  return cached.data || null;
}

function savePriceCache(data) {
  storageSet(PRICE_CACHE_KEY, { ts: Date.now(), data: data });
}

function PortfolioImportModal(props) {
  var onClose = props.onClose;
  var onSuccess = props.onSuccess;
  var onLocalImport = props.onLocalImport;
  var isAuth = props.isAuth;

  React.useEffect(function() {
    var prevBodyOverflow = document.body.style.overflow;
    var prevHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    return function() {
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;
    };
  }, []);

  var ref1 = React.useState('csv');
  var importTab = ref1[0], setImportTab = ref1[1];

  var ref2 = React.useState('');
  var inputText = ref2[0], setInputText = ref2[1];

  var ref3 = React.useState(null);
  var parsedResult = ref3[0], setParsedResult = ref3[1];

  var ref4 = React.useState(false);
  var submitting = ref4[0], setSubmitting = ref4[1];

  var ref5 = React.useState(null);
  var resultMsg = ref5[0], setResultMsg = ref5[1];

  function handleFileUpload(e) {
    var file = e.target.files && e.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function(evt) {
      var text = evt.target.result;
      setInputText(text);
      var result = parseManaboxCSV(text);
      setParsedResult(result);
    };
    reader.readAsText(file);
  }

  function handleParse() {
    if (!inputText.trim()) return;
    var result = importTab === 'text' ? parseTextList(inputText) : parseManaboxCSV(inputText);
    setParsedResult(result);
  }

  function handleImport() {
    if (!parsedResult || parsedResult.cards.length === 0) return;
    setSubmitting(true);

    var cards = parsedResult.cards.slice(0, 500);

    if (isAuth) {
      // Authenticated — sync to backend
      var items = cards.map(function(card) {
        return {
          card_id: card.scryfallId || '',
          card_name: card.cardName,
          quantity: 1,
          added_price: card.price || 0
        };
      });

      addToPortfolioBatch(items).then(function(result) {
        setSubmitting(false);
        setResultMsg('Successfully imported ' + (result.created || items.length) + ' cards.');
        if (onSuccess) onSuccess();
      }).catch(function() {
        setSubmitting(false);
        setResultMsg('Import failed. Please try again.');
      });
    } else {
      // Not authenticated — save to localStorage portfolio
      var localItems = cards.map(function(card) {
        return {
          id: card.scryfallId || ('import-' + card.cardName.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Math.random().toString(36).slice(2, 8)),
          name: card.cardName,
          set: card.setName || card.setCode || '',
          qty: 1,
          buyPrice: card.price || 0,
          currentPrice: 0,
          image: null
        };
      });

      if (onLocalImport) onLocalImport(localItems);
      setSubmitting(false);
      setResultMsg('Successfully imported ' + localItems.length + ' cards to your local portfolio.');
    }
  }

  var cardCount = parsedResult ? parsedResult.cards.length : 0;

  return h('div', { className: 'mp-modal-overlay open import-modal-overlay', onClick: onClose },
    h('div', { className: 'mp-modal import-modal', onClick: function(e) { e.stopPropagation(); } },
      h('div', { className: 'import-modal-header' },
        h('h3', null, 'Import to Portfolio'),
        h('button', { className: 'mp-modal-close import-modal-close', onClick: onClose }, h(XIcon, null))
      ),
      h('div', { className: 'import-modal-body' },
        resultMsg
          ? h('div', { style: { textAlign: 'center', padding: 'var(--space-6)' } },
              h(CheckCircleIcon, null),
              h('p', { style: { marginTop: 'var(--space-3)' } }, resultMsg),
              h('button', { className: 'btn btn-primary', onClick: onClose, style: { marginTop: 'var(--space-4)' } }, 'Done')
            )
          : h(React.Fragment, null,
              // Tabs
              h('div', { className: 'import-tabs' },
                h('button', {
                  type: 'button',
                  className: 'import-tab' + (importTab === 'csv' ? ' import-tab--active' : ''),
                  onClick: function() { setImportTab('csv'); setParsedResult(null); }
                }, 'CSV Import'),
                h('button', {
                  type: 'button',
                  className: 'import-tab' + (importTab === 'text' ? ' import-tab--active' : ''),
                  onClick: function() { setImportTab('text'); setParsedResult(null); }
                }, 'Text / MTGA')
              ),

              // Local storage note for non-auth users
              !isAuth && h('p', {
                style: {
                  fontSize: '12px',
                  color: 'var(--color-text-muted)',
                  textAlign: 'center',
                  margin: 'var(--space-2) 0 0',
                  opacity: 0.8
                }
              }, 'Cards will be saved to this browser. Sign in to sync across devices.'),

              // CSV tab — file upload + textarea
              importTab === 'csv' && h(React.Fragment, null,
                h('div', { className: 'form-group' },
                  h('label', { className: 'form-label' }, 'Upload CSV File'),
                  h('div', { className: 'bulk-upload-zone' },
                    h('input', {
                      type: 'file',
                      accept: '.csv,.txt',
                      onChange: handleFileUpload,
                      className: 'bulk-file-input',
                      id: 'portfolio-file-input'
                    }),
                    h('label', { htmlFor: 'portfolio-file-input', className: 'bulk-upload-label' },
                      h(UploadIcon, null),
                      h('span', null, 'Choose CSV file'),
                      h('span', { className: 'bulk-upload-hint' }, 'Manabox, DragonShield, Deckbox, or TCGplayer')
                    )
                  )
                ),
                h('div', { className: 'bulk-divider' },
                  h('span', null, 'or paste CSV text')
                ),
                h('div', { className: 'form-group' },
                  h('textarea', {
                    className: 'form-input bulk-csv-textarea',
                    rows: 5,
                    placeholder: 'Name,Set Name,Quantity,Condition\nLightning Bolt,Alpha,1,NM\nCounterspell,Ice Age,4,LP',
                    value: inputText,
                    onChange: function(e) { setInputText(e.target.value); setParsedResult(null); }
                  })
                )
              ),

              // Text tab
              importTab === 'text' && h('div', { className: 'form-group' },
                h('label', { className: 'form-label' }, 'Paste Card List'),
                h('textarea', {
                  className: 'form-input bulk-csv-textarea',
                  rows: 8,
                  placeholder: '4 Lightning Bolt (LEA) 123\n1 Counterspell (ICE)\nSol Ring\n3x Swords to Plowshares',
                  value: inputText,
                  onChange: function(e) { setInputText(e.target.value); setParsedResult(null); }
                })
              ),

              // Parse button
              !parsedResult && inputText.trim() && h('button', {
                type: 'button',
                className: 'btn btn-secondary btn-sm',
                onClick: handleParse,
                style: { marginTop: 'var(--space-2)' }
              }, 'Parse'),

              // Results
              parsedResult && cardCount > 0 && h('div', { className: 'bulk-preview', style: { marginTop: 'var(--space-4)' } },
                cardCount > 500 && h('div', { className: 'bulk-warnings' },
                  h(AlertCircleIcon, null),
                  h('p', { className: 'bulk-warning-text' }, 'Maximum 500 cards. Only the first 500 will be imported.')
                ),
                h('div', { className: 'bulk-preview-summary' },
                  h(CheckCircleIcon, null),
                  h('span', null, Math.min(cardCount, 500) + ' card' + (Math.min(cardCount, 500) !== 1 ? 's' : '') + ' ready to import')
                ),
                h('div', { className: 'bulk-preview-table-wrap' },
                  h('table', { className: 'bulk-preview-table' },
                    h('thead', null,
                      h('tr', null,
                        h('th', null, 'Card Name'),
                        h('th', null, 'Set'),
                        h('th', null, 'Qty')
                      )
                    ),
                    h('tbody', null,
                      parsedResult.cards.slice(0, 15).map(function(card, i) {
                        return h('tr', { key: i },
                          h('td', null, card.cardName),
                          h('td', null, card.setName || card.setCode || '\u2014'),
                          h('td', null, '1')
                        );
                      }),
                      cardCount > 15 && h('tr', null,
                        h('td', { colSpan: 3, style: { textAlign: 'center', color: 'var(--color-text-muted)' } },
                          '\u2026 and ' + (Math.min(cardCount, 500) - 15) + ' more'
                        )
                      )
                    )
                  )
                )
              ),

              parsedResult && parsedResult.errors.length > 0 && h('div', { className: 'bulk-warnings', style: { marginTop: 'var(--space-3)' } },
                h(AlertCircleIcon, null),
                h('div', null,
                  parsedResult.errors.slice(0, 5).map(function(err, i) {
                    return h('p', { key: i, className: 'bulk-warning-text' }, err);
                  })
                )
              ),

              // Import button
              parsedResult && cardCount > 0 && !resultMsg && h('div', { className: 'listing-form-actions', style: { marginTop: 'var(--space-4)' } },
                h('button', { type: 'button', className: 'btn btn-secondary', onClick: onClose }, 'Cancel'),
                h('button', {
                  type: 'button',
                  className: 'btn btn-primary',
                  disabled: submitting,
                  onClick: handleImport
                }, submitting ? 'Importing\u2026' : 'Import ' + Math.min(cardCount, 500) + ' Card' + (Math.min(cardCount, 500) !== 1 ? 's' : ''))
              )
            )
      )
    )
  );
}

export function PortfolioView(props) {
  var state = props.state;
  var authUser = props.user;
  var updatePortfolio = props.updatePortfolio;
  var portfolio = state.portfolio;

  var ref1 = React.useState({});
  var livePrices = ref1[0], setLivePrices = ref1[1];
  var ref2 = React.useState(false);
  var pricesLoaded = ref2[0], setPricesLoaded = ref2[1];

  var ref3 = React.useState(false);
  var showImport = ref3[0], setShowImport = ref3[1];

  React.useEffect(function() {
    if (portfolio.length === 0) return;
    var cancelled = false;

    // Apply local price cache for instant display
    var cached = loadPriceCache();
    if (cached) {
      setLivePrices(cached);
      setPricesLoaded(true);
    }

    // Fetch live portfolio data from backend — includes prices already joined
    fetchPortfolio().then(function(data) {
      if (cancelled) return;
      var items = (data && data.items) ? data.items : [];
      var priceMap = {};
      items.forEach(function(item) {
        if (item.card_id) {
          var price = parseFloat(item.price_usd) || parseFloat(item.price_usd_foil) || 0;
          priceMap[item.card_id] = price;
        }
      });

      // Also update the portfolio in global state with the enriched backend data
      // Map backend shape to frontend shape
      var updatedPortfolio = items.map(function(item) {
        return {
          id: item.card_id,
          name: item.card_name,
          set: item.set_name || '',
          qty: item.quantity || 1,
          buyPrice: item.added_price || 0,
          currentPrice: parseFloat(item.price_usd) || parseFloat(item.price_usd_foil) || 0,
          image: item.image_small || null
        };
      });

      // Only update if we got results; otherwise keep what we have
      if (updatedPortfolio.length > 0) {
        updatePortfolio(updatedPortfolio);
      }

      setLivePrices(priceMap);
      savePriceCache(priceMap);
      setPricesLoaded(true);
    }).catch(function() {
      if (!cancelled) setPricesLoaded(true);
    });

    return function() { cancelled = true; };
  }, [portfolio.length]);

  // Enrich portfolio with live prices
  var enriched = portfolio.map(function(item) {
    var currentPrice = livePrices[item.id] !== undefined ? livePrices[item.id] : item.currentPrice;
    return Object.assign({}, item, { currentPrice: currentPrice });
  });

  var totalCost = enriched.reduce(function(sum, item) { return sum + (item.buyPrice || 0) * (item.qty || 1); }, 0);
  var totalValue = enriched.reduce(function(sum, item) { return sum + (item.currentPrice || 0) * (item.qty || 1); }, 0);
  var totalGain = totalValue - totalCost;
  var totalGainPct = totalCost > 0 ? ((totalGain / totalCost) * 100) : 0;

  function removeItem(id) {
    // Update local state immediately
    updatePortfolio(portfolio.filter(function(item) { return item.id !== id; }));
    // Fire-and-forget backend delete
    removeFromPortfolioAPI(id).catch(function() {
      // silently ignore — localStorage already updated
    });
  }

  function updateQty(id, qty) {
    if (qty < 1) return removeItem(id);
    var updated = portfolio.map(function(item) {
      return item.id === id ? Object.assign({}, item, { qty: qty }) : item;
    });
    updatePortfolio(updated);
    // Sync qty change to backend: remove then re-add with new quantity
    var item = portfolio.find(function(i) { return i.id === id; });
    if (item) {
      removeFromPortfolioAPI(id).then(function() {
        return addToPortfolioAPI({
          card_id: id,
          card_name: item.name,
          quantity: qty,
          added_price: item.buyPrice || 0
        });
      }).catch(function() {
        // silently ignore — localStorage already updated
      });
    }
  }

  if (portfolio.length === 0) {
    return h('div', { className: 'container portfolio-page' },
      h('div', { className: 'portfolio-header-row' },
        h('h1', { className: 'page-heading' }, 'My Portfolio'),
        h('button', {
          className: 'btn btn-secondary btn-sm portfolio-import-btn',
          onClick: function() { setShowImport(true); }
        }, h(UploadIcon, null), ' Import')
      ),
      h('div', { className: 'empty-state' },
        h('div', { className: 'empty-state-icon' }, h(PortfolioIcon, null)),
        h('h3', null, 'Your portfolio is empty'),
        h('p', null, 'Search for cards and click "Track" to add them to your portfolio.'),
        h('a', { href: '#search', className: 'btn btn-primary' }, 'Browse Cards')
      ),
      showImport && h(PortfolioImportModal, {
        onClose: function() { setShowImport(false); },
        onSuccess: function() {
          fetchPortfolio().then(function(data) {
            var items = (data && data.items) ? data.items : [];
            var updatedPortfolio = items.map(function(item) {
              return {
                id: item.card_id,
                name: item.card_name,
                set: item.set_name || '',
                qty: item.quantity || 1,
                buyPrice: item.added_price || 0,
                currentPrice: parseFloat(item.price_usd) || parseFloat(item.price_usd_foil) || 0,
                image: item.image_small || null
              };
            });
            if (updatedPortfolio.length > 0) updatePortfolio(updatedPortfolio);
          }).catch(function() {});
        },
        onLocalImport: function(importedCards) {
          var existing = portfolio.slice();
          var merged = existing.concat(importedCards);
          updatePortfolio(merged);
        },
        isAuth: !!authUser
      })
    );
  }

  return h('div', { className: 'container portfolio-page' },
    h('div', { className: 'portfolio-header-row' },
      h('h1', { className: 'page-heading' }, 'My Portfolio'),
      h('button', {
        className: 'btn btn-secondary btn-sm portfolio-import-btn',
        onClick: function() { setShowImport(true); }
      }, h(UploadIcon, null), ' Import')
    ),
    h('div', { className: 'portfolio-kpis' },
      h('div', { className: 'kpi-card' },
        h('div', { className: 'kpi-label' }, 'Total Cost'),
        h('div', { className: 'kpi-value' }, formatUSD(totalCost))
      ),
      h('div', { className: 'kpi-card' },
        h('div', { className: 'kpi-label' }, 'Current Value'),
        h('div', { className: 'kpi-value' }, formatUSD(totalValue))
      ),
      h('div', { className: 'kpi-card' },
        h('div', { className: 'kpi-label' }, 'Total Gain/Loss'),
        h('div', { className: 'kpi-value ' + (totalGain >= 0 ? 'price-up' : 'price-down') },
          (totalGain >= 0 ? '+' : '') + formatUSD(totalGain)
        ),
        h('div', { className: 'kpi-delta ' + (totalGainPct >= 0 ? 'price-up' : 'price-down') },
          (totalGainPct >= 0 ? '+' : '') + totalGainPct.toFixed(1) + '%'
        )
      ),
      h('div', { className: 'kpi-card' },
        h('div', { className: 'kpi-label' }, 'Cards Tracked'),
        h('div', { className: 'kpi-value' }, portfolio.length)
      )
    ),
    !pricesLoaded && h('p', { className: 'price-source' }, 'Loading live prices...'),
    h('div', { className: 'portfolio-table-wrapper' },
      h('table', { className: 'portfolio-table' },
        h('thead', null,
          h('tr', null,
            h('th', null, 'Card'),
            h('th', null, 'Set'),
            h('th', null, 'Qty'),
            h('th', null, 'Buy Price'),
            h('th', null, 'Current'),
            h('th', null, 'Gain/Loss'),
            h('th', null, 'Actions')
          )
        ),
        h('tbody', null,
          enriched.map(function(item) {
            var gain = (item.currentPrice - item.buyPrice) * item.qty;
            var gainPct = item.buyPrice > 0 ? ((item.currentPrice - item.buyPrice) / item.buyPrice * 100) : 0;

            return h('tr', { key: item.id },
              h('td', null,
                h('a', {
                  className: 'card-name-cell',
                  href: '#card/' + item.id,
                  onClick: function(e) { e.preventDefault(); window.location.hash = 'card/' + item.id; }
                }, item.name)
              ),
              h('td', null, item.set || '—'),
              h('td', null,
                h('div', { className: 'cart-item-controls' },
                  h('button', { className: 'qty-btn', onClick: function() { updateQty(item.id, (item.qty || 1) - 1); } }, '−'),
                  h('span', { className: 'qty-value' }, item.qty || 1),
                  h('button', { className: 'qty-btn', onClick: function() { updateQty(item.id, (item.qty || 1) + 1); } }, '+')
                )
              ),
              h('td', null, formatUSD(item.buyPrice)),
              h('td', null, formatUSD(item.currentPrice)),
              h('td', null,
                h('span', { className: gain >= 0 ? 'price-up' : 'price-down' },
                  (gain >= 0 ? '+' : '') + formatUSD(gain),
                  ' (', (gainPct >= 0 ? '+' : '') + gainPct.toFixed(1), '%)'
                )
              ),
              h('td', null,
                h('button', { className: 'btn btn-sm btn-danger', onClick: function() { removeItem(item.id); } }, 'Remove')
              )
            );
          })
        )
      )
    ),
    h('p', { className: 'price-source', style: { marginTop: 'var(--space-4)' } },
      'Gain/Loss calculated from your buy price vs. live market data. Prices update every 5 minutes.'
    ),
    showImport && h(PortfolioImportModal, {
      onClose: function() { setShowImport(false); },
      onSuccess: function() {
        fetchPortfolio().then(function(data) {
          var items = (data && data.items) ? data.items : [];
          var updatedPortfolio = items.map(function(item) {
            return {
              id: item.card_id,
              name: item.card_name,
              set: item.set_name || '',
              qty: item.quantity || 1,
              buyPrice: item.added_price || 0,
              currentPrice: parseFloat(item.price_usd) || parseFloat(item.price_usd_foil) || 0,
              image: item.image_small || null
            };
          });
          if (updatedPortfolio.length > 0) updatePortfolio(updatedPortfolio);
        }).catch(function() {});
      },
      onLocalImport: function(importedCards) {
        var existing = portfolio.slice();
        var merged = existing.concat(importedCards);
        updatePortfolio(merged);
      },
      isAuth: !!authUser
    })
  );
}
