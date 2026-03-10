/* PortfolioView.js — Portfolio with binders, conditions, group-by, and lists */
import React from 'react';
import { formatUSD } from '../utils/helpers.js';
import { PortfolioIcon, UploadIcon, AlertCircleIcon, CheckCircleIcon, XIcon } from './shared/Icons.js';
import {
  fetchPortfolio, addToPortfolioAPI, removeFromPortfolioAPI, updatePortfolioItem,
  addToPortfolioBatch, fetchBinders, createBinder, deleteBinder, updateBinder,
  fetchLists, createList, deleteList, fetchListItems, addListItem, removeListItem
} from '../utils/api.js';
import { storageGet, storageSet } from '../utils/storage.js';
import { parseManaboxCSV, parseTextList } from '../utils/import-parser.js';
var h = React.createElement;

var PRICE_CACHE_KEY = 'investmtg-portfolio-prices';
var PRICE_CACHE_TTL = 5 * 60 * 1000;
var CONDITIONS = ['NM', 'LP', 'MP', 'HP', 'DMG'];
var CONDITION_LABELS = { NM: 'Near Mint', LP: 'Lightly Played', MP: 'Moderately Played', HP: 'Heavily Played', DMG: 'Damaged' };
var CONDITION_MULT = { NM: 1.0, LP: 0.85, MP: 0.70, HP: 0.50, DMG: 0.30 };
var GROUP_OPTIONS = [
  { value: 'none', label: 'No Grouping' },
  { value: 'set', label: 'By Set' },
  { value: 'color', label: 'By Color' },
  { value: 'type', label: 'By Type' },
  { value: 'rarity', label: 'By Rarity' },
  { value: 'condition', label: 'By Condition' },
  { value: 'binder', label: 'By Binder' }
];

function loadPriceCache() {
  var cached = storageGet(PRICE_CACHE_KEY, null);
  if (!cached || !cached.ts || Date.now() - cached.ts > PRICE_CACHE_TTL) return null;
  return cached.data || null;
}

function savePriceCache(data) {
  storageSet(PRICE_CACHE_KEY, { ts: Date.now(), data: data });
}

/* Infer card color identity from mana cost string */
function inferColor(manaCost) {
  if (!manaCost) return 'Colorless';
  var colors = [];
  if (manaCost.indexOf('W') >= 0) colors.push('White');
  if (manaCost.indexOf('U') >= 0) colors.push('Blue');
  if (manaCost.indexOf('B') >= 0) colors.push('Black');
  if (manaCost.indexOf('R') >= 0) colors.push('Red');
  if (manaCost.indexOf('G') >= 0) colors.push('Green');
  if (colors.length === 0) return 'Colorless';
  if (colors.length > 1) return 'Multicolor';
  return colors[0];
}

/* Infer primary card type from type line */
function inferType(typeLine) {
  if (!typeLine) return 'Unknown';
  var t = typeLine.toLowerCase();
  if (t.indexOf('creature') >= 0) return 'Creature';
  if (t.indexOf('planeswalker') >= 0) return 'Planeswalker';
  if (t.indexOf('instant') >= 0) return 'Instant';
  if (t.indexOf('sorcery') >= 0) return 'Sorcery';
  if (t.indexOf('enchantment') >= 0) return 'Enchantment';
  if (t.indexOf('artifact') >= 0) return 'Artifact';
  if (t.indexOf('land') >= 0) return 'Land';
  return 'Other';
}

/* Group items by a key function */
function groupBy(items, keyFn) {
  var groups = {};
  var order = [];
  items.forEach(function(item) {
    var key = keyFn(item) || 'Unknown';
    if (!groups[key]) { groups[key] = []; order.push(key); }
    groups[key].push(item);
  });
  return { groups: groups, order: order };
}

/* ═══════════════════════════════════════
   IMPORT MODAL (unchanged from original)
   ═══════════════════════════════════════ */

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
  var pendingRef = React.useRef(null);

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
      var items = cards.map(function(card) {
        return { card_id: card.scryfallId || '', card_name: card.cardName, quantity: 1, added_price: card.price || 0, condition: card.condition || 'NM' };
      });
      addToPortfolioBatch(items).then(function(result) {
        setSubmitting(false);
        setResultMsg('Successfully imported ' + (result.created || items.length) + ' cards.');
        if (onSuccess) onSuccess();
      }).catch(function() { setSubmitting(false); setResultMsg('Import failed. Please try again.'); });
    } else {
      var localItems = cards.map(function(card) {
        return {
          id: card.scryfallId || ('import-' + card.cardName.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Math.random().toString(36).slice(2, 8)),
          name: card.cardName, set: card.setName || card.setCode || '', qty: 1,
          buyPrice: card.price || 0, currentPrice: 0, image: null, condition: card.condition || 'NM'
        };
      });
      pendingRef.current = localItems;
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
              h('button', { className: 'btn btn-primary', onClick: function() {
                if (pendingRef.current && onLocalImport) { onLocalImport(pendingRef.current); pendingRef.current = null; }
                onClose();
              }, style: { marginTop: 'var(--space-4)' } }, 'Done')
            )
          : h(React.Fragment, null,
              h('div', { className: 'import-tabs' },
                h('button', { type: 'button', className: 'import-tab' + (importTab === 'csv' ? ' import-tab--active' : ''), onClick: function() { setImportTab('csv'); setParsedResult(null); } }, 'CSV Import'),
                h('button', { type: 'button', className: 'import-tab' + (importTab === 'text' ? ' import-tab--active' : ''), onClick: function() { setImportTab('text'); setParsedResult(null); } }, 'Text / MTGA')
              ),
              !isAuth && h('p', { style: { fontSize: '12px', color: 'var(--color-text-muted)', textAlign: 'center', margin: 'var(--space-2) 0 0', opacity: 0.8 } }, 'Cards will be saved to this browser. Sign in to sync across devices.'),
              importTab === 'csv' && h(React.Fragment, null,
                h('div', { className: 'form-group' },
                  h('label', { className: 'form-label' }, 'Upload CSV File'),
                  h('div', { className: 'bulk-upload-zone' },
                    h('input', { type: 'file', accept: '.csv,.txt', onChange: handleFileUpload, className: 'bulk-file-input', id: 'portfolio-file-input' }),
                    h('label', { htmlFor: 'portfolio-file-input', className: 'bulk-upload-label' },
                      h(UploadIcon, null), h('span', null, 'Choose CSV file'),
                      h('span', { className: 'bulk-upload-hint' }, 'Manabox, DragonShield, Deckbox, or TCGplayer')
                    )
                  )
                ),
                h('div', { className: 'bulk-divider' }, h('span', null, 'or paste CSV text')),
                h('div', { className: 'form-group' },
                  h('textarea', { className: 'form-input bulk-csv-textarea', rows: 5, placeholder: 'Name,Set Name,Quantity,Condition\nLightning Bolt,Alpha,1,NM\nCounterspell,Ice Age,4,LP', value: inputText, onChange: function(e) { setInputText(e.target.value); setParsedResult(null); } })
                )
              ),
              importTab === 'text' && h('div', { className: 'form-group' },
                h('label', { className: 'form-label' }, 'Paste Card List'),
                h('textarea', { className: 'form-input bulk-csv-textarea', rows: 8, placeholder: '4 Lightning Bolt (LEA) 123\n1 Counterspell (ICE)\nSol Ring\n3x Swords to Plowshares', value: inputText, onChange: function(e) { setInputText(e.target.value); setParsedResult(null); } })
              ),
              !parsedResult && inputText.trim() && h('button', { type: 'button', className: 'btn btn-secondary btn-sm', onClick: handleParse, style: { marginTop: 'var(--space-2)' } }, 'Parse'),
              parsedResult && cardCount > 0 && h('div', { className: 'bulk-preview', style: { marginTop: 'var(--space-4)' } },
                cardCount > 500 && h('div', { className: 'bulk-warnings' }, h(AlertCircleIcon, null), h('p', { className: 'bulk-warning-text' }, 'Maximum 500 cards. Only the first 500 will be imported.')),
                h('div', { className: 'bulk-preview-summary' }, h(CheckCircleIcon, null), h('span', null, Math.min(cardCount, 500) + ' card' + (Math.min(cardCount, 500) !== 1 ? 's' : '') + ' ready to import')),
                h('div', { className: 'bulk-preview-table-wrap' },
                  h('table', { className: 'bulk-preview-table' },
                    h('thead', null, h('tr', null, h('th', null, 'Card Name'), h('th', null, 'Set'), h('th', null, 'Qty'))),
                    h('tbody', null,
                      parsedResult.cards.slice(0, 15).map(function(card, i) { return h('tr', { key: i }, h('td', null, card.cardName), h('td', null, card.setName || card.setCode || '\u2014'), h('td', null, '1')); }),
                      cardCount > 15 && h('tr', null, h('td', { colSpan: 3, style: { textAlign: 'center', color: 'var(--color-text-muted)' } }, '\u2026 and ' + (Math.min(cardCount, 500) - 15) + ' more'))
                    )
                  )
                )
              ),
              parsedResult && parsedResult.errors.length > 0 && h('div', { className: 'bulk-warnings', style: { marginTop: 'var(--space-3)' } },
                h(AlertCircleIcon, null),
                h('div', null, parsedResult.errors.slice(0, 5).map(function(err, i) { return h('p', { key: i, className: 'bulk-warning-text' }, err); }))
              ),
              parsedResult && cardCount > 0 && !resultMsg && h('div', { className: 'listing-form-actions', style: { marginTop: 'var(--space-4)' } },
                h('button', { type: 'button', className: 'btn btn-secondary', onClick: onClose }, 'Cancel'),
                h('button', { type: 'button', className: 'btn btn-primary', disabled: submitting, onClick: handleImport }, submitting ? 'Importing\u2026' : 'Import ' + Math.min(cardCount, 500) + ' Card' + (Math.min(cardCount, 500) !== 1 ? 's' : ''))
              )
            )
      )
    )
  );
}

/* ═══════════════════════════════════════
   CREATE BINDER MODAL
   ═══════════════════════════════════════ */

function CreateBinderModal(props) {
  var ref1 = React.useState('');
  var name = ref1[0], setName = ref1[1];
  var ref2 = React.useState(false);
  var saving = ref2[0], setSaving = ref2[1];

  function handleSave() {
    if (!name.trim() || saving) return;
    setSaving(true);
    createBinder({ name: name.trim() }).then(function() {
      props.onCreated();
      props.onClose();
    }).catch(function() { setSaving(false); });
  }

  return h('div', { className: 'mp-modal-overlay open', onClick: props.onClose },
    h('div', { className: 'mp-modal', style: { maxWidth: '400px' }, onClick: function(e) { e.stopPropagation(); } },
      h('div', { className: 'import-modal-header' },
        h('h3', null, 'New Binder'),
        h('button', { className: 'mp-modal-close', onClick: props.onClose }, h(XIcon, null))
      ),
      h('div', { style: { padding: 'var(--space-4)' } },
        h('input', {
          type: 'text', className: 'form-input', placeholder: 'e.g. Commander Staples, Trade Binder, High Value',
          value: name, onChange: function(e) { setName(e.target.value); },
          onKeyDown: function(e) { if (e.key === 'Enter') handleSave(); },
          autoFocus: true
        }),
        h('div', { className: 'listing-form-actions', style: { marginTop: 'var(--space-4)' } },
          h('button', { className: 'btn btn-secondary', onClick: props.onClose }, 'Cancel'),
          h('button', { className: 'btn btn-primary', onClick: handleSave, disabled: !name.trim() || saving }, saving ? 'Creating\u2026' : 'Create Binder')
        )
      )
    )
  );
}

/* ═══════════════════════════════════════
   CREATE LIST MODAL
   ═══════════════════════════════════════ */

function CreateListModal(props) {
  var ref1 = React.useState('');
  var name = ref1[0], setName = ref1[1];
  var ref2 = React.useState('wishlist');
  var listType = ref2[0], setListType = ref2[1];
  var ref3 = React.useState(false);
  var saving = ref3[0], setSaving = ref3[1];

  var typeOptions = [
    { value: 'wishlist', label: 'Wishlist' },
    { value: 'buylist', label: 'Buylist' },
    { value: 'tradelist', label: 'Trade List' },
    { value: 'custom', label: 'Custom' }
  ];

  function handleSave() {
    if (!name.trim() || saving) return;
    setSaving(true);
    createList({ name: name.trim(), list_type: listType }).then(function() {
      props.onCreated();
      props.onClose();
    }).catch(function() { setSaving(false); });
  }

  return h('div', { className: 'mp-modal-overlay open', onClick: props.onClose },
    h('div', { className: 'mp-modal', style: { maxWidth: '400px' }, onClick: function(e) { e.stopPropagation(); } },
      h('div', { className: 'import-modal-header' },
        h('h3', null, 'New List'),
        h('button', { className: 'mp-modal-close', onClick: props.onClose }, h(XIcon, null))
      ),
      h('div', { style: { padding: 'var(--space-4)' } },
        h('input', {
          type: 'text', className: 'form-input', placeholder: 'e.g. Wishlist, Cards to Buy, Trade Bait',
          value: name, onChange: function(e) { setName(e.target.value); },
          onKeyDown: function(e) { if (e.key === 'Enter') handleSave(); },
          autoFocus: true
        }),
        h('div', { className: 'pf-type-selector', style: { marginTop: 'var(--space-3)' } },
          typeOptions.map(function(opt) {
            return h('button', {
              key: opt.value, type: 'button',
              className: 'pf-type-btn' + (listType === opt.value ? ' pf-type-btn--active' : ''),
              onClick: function() { setListType(opt.value); }
            }, opt.label);
          })
        ),
        h('div', { className: 'listing-form-actions', style: { marginTop: 'var(--space-4)' } },
          h('button', { className: 'btn btn-secondary', onClick: props.onClose }, 'Cancel'),
          h('button', { className: 'btn btn-primary', onClick: handleSave, disabled: !name.trim() || saving }, saving ? 'Creating\u2026' : 'Create List')
        )
      )
    )
  );
}

/* ═══════════════════════════════════════
   CONDITION BADGE
   ═══════════════════════════════════════ */

function ConditionBadge(props) {
  return h('span', { className: 'cond-badge cond-badge--' + (props.condition || 'NM').toLowerCase() }, props.condition || 'NM');
}

/* ═══════════════════════════════════════
   CONDITION SELECTOR (inline dropdown)
   ═══════════════════════════════════════ */

function ConditionSelector(props) {
  var current = props.value || 'NM';
  return h('select', {
    className: 'cond-select',
    value: current,
    onChange: function(e) { props.onChange(e.target.value); }
  }, CONDITIONS.map(function(c) {
    return h('option', { key: c, value: c }, c);
  }));
}

/* ═══════════════════════════════════════
   LISTS PANEL (sidebar sub-view)
   ═══════════════════════════════════════ */

function ListsPanel(props) {
  var authUser = props.authUser;
  var ref1 = React.useState([]);
  var lists = ref1[0], setLists = ref1[1];
  var ref2 = React.useState(null);
  var selectedList = ref2[0], setSelectedList = ref2[1];
  var ref3 = React.useState([]);
  var listItems = ref3[0], setListItems = ref3[1];
  var ref4 = React.useState(false);
  var showCreate = ref4[0], setShowCreate = ref4[1];
  var ref5 = React.useState(false);
  var loading = ref5[0], setLoading = ref5[1];

  function loadLists() {
    if (!authUser) return;
    fetchLists().then(function(data) {
      setLists(data.lists || []);
    }).catch(function() {});
  }

  React.useEffect(function() { loadLists(); }, [authUser]);

  function selectList(listObj) {
    setSelectedList(listObj);
    setLoading(true);
    fetchListItems(listObj.id).then(function(data) {
      setListItems(data.items || []);
      setLoading(false);
    }).catch(function() { setLoading(false); });
  }

  function handleDeleteList(id) {
    deleteList(id).then(function() {
      loadLists();
      if (selectedList && selectedList.id === id) { setSelectedList(null); setListItems([]); }
    }).catch(function() {});
  }

  function handleRemoveItem(itemId) {
    if (!selectedList) return;
    removeListItem(selectedList.id, itemId).then(function() {
      setListItems(listItems.filter(function(it) { return it.id !== itemId; }));
    }).catch(function() {});
  }

  if (!authUser) {
    return h('div', { className: 'pf-lists-panel' },
      h('p', { className: 'price-source' }, 'Sign in to create and manage lists.')
    );
  }

  if (selectedList) {
    return h('div', { className: 'pf-lists-detail' },
      h('button', { className: 'btn btn-secondary btn-sm', onClick: function() { setSelectedList(null); setListItems([]); }, style: { marginBottom: 'var(--space-3)' } }, '\u2190 Back to Lists'),
      h('h3', { className: 'pf-list-name' }, selectedList.name,
        h('span', { className: 'pf-list-type-tag' }, selectedList.list_type)
      ),
      loading ? h('p', { className: 'price-source' }, 'Loading\u2026')
        : listItems.length === 0
          ? h('p', { className: 'price-source' }, 'No cards in this list yet. Search for cards and add them from the card detail page.')
          : h('div', { className: 'portfolio-table-wrapper' },
              h('table', { className: 'portfolio-table' },
                h('thead', null, h('tr', null,
                  h('th', null, 'Card'), h('th', null, 'Set'), h('th', null, 'Condition'),
                  h('th', null, 'Current Price'), h('th', null, 'Actions')
                )),
                h('tbody', null, listItems.map(function(item) {
                  var price = parseFloat(item.price_usd) || 0;
                  return h('tr', { key: item.id },
                    h('td', null, h('a', { className: 'card-name-cell', href: '#card/' + item.card_id, onClick: function(e) { e.preventDefault(); window.location.hash = 'card/' + item.card_id; } }, item.card_name)),
                    h('td', null, item.set_name || '\u2014'),
                    h('td', null, h(ConditionBadge, { condition: item.condition })),
                    h('td', null, formatUSD(price)),
                    h('td', null, h('button', { className: 'btn btn-sm btn-danger', onClick: function() { handleRemoveItem(item.id); } }, 'Remove'))
                  );
                }))
              )
            )
    );
  }

  return h('div', { className: 'pf-lists-panel' },
    h('div', { className: 'pf-panel-header' },
      h('h3', null, 'My Lists'),
      h('button', { className: 'btn btn-secondary btn-sm', onClick: function() { setShowCreate(true); } }, '+ New List')
    ),
    lists.length === 0
      ? h('p', { className: 'price-source' }, 'No lists yet. Create a Wishlist, Buylist, or Trade List to track cards you want.')
      : h('div', { className: 'pf-list-grid' },
          lists.map(function(list) {
            return h('div', { key: list.id, className: 'pf-list-card', onClick: function() { selectList(list); } },
              h('div', { className: 'pf-list-card-header' },
                h('span', { className: 'pf-list-card-name' }, list.name),
                h('span', { className: 'pf-list-type-tag' }, list.list_type)
              ),
              h('div', { className: 'pf-list-card-meta' },
                h('span', null, (list.item_count || 0) + ' card' + ((list.item_count || 0) !== 1 ? 's' : ''))
              ),
              h('button', {
                className: 'btn btn-sm btn-danger pf-list-delete',
                onClick: function(e) { e.stopPropagation(); handleDeleteList(list.id); }
              }, h(XIcon, null))
            );
          })
        ),
    showCreate && h(CreateListModal, {
      onClose: function() { setShowCreate(false); },
      onCreated: function() { loadLists(); }
    })
  );
}

/* ═══════════════════════════════════════
   MAIN PORTFOLIO VIEW
   ═══════════════════════════════════════ */

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
  var ref4 = React.useState('none');
  var groupByMode = ref4[0], setGroupByMode = ref4[1];
  var ref5 = React.useState('all');
  var activeTab = ref5[0], setActiveTab = ref5[1];
  var ref6 = React.useState([]);
  var binders = ref6[0], setBinders = ref6[1];
  var ref7 = React.useState(null);
  var activeBinder = ref7[0], setActiveBinder = ref7[1];
  var ref8 = React.useState(false);
  var showCreateBinder = ref8[0], setShowCreateBinder = ref8[1];
  var ref9 = React.useState({});
  var cardMetadata = ref9[0], setCardMetadata = ref9[1];
  var ref10 = React.useState(0);
  var unassignedCount = ref10[0], setUnassignedCount = ref10[1];
  var ref11 = React.useState({ key: 'name', dir: 'asc' });
  var pfSort = ref11[0], setPfSort = ref11[1];

  function togglePfSort(key) {
    setPfSort(function(prev) {
      if (prev.key === key) return { key: key, dir: prev.dir === 'asc' ? 'desc' : 'asc' };
      var defaultDir = (key === 'name' || key === 'set' || key === 'condition') ? 'asc' : 'desc';
      return { key: key, dir: defaultDir };
    });
  }

  function sortItems(items) {
    return items.slice().sort(function(a, b) {
      var dir = pfSort.dir === 'asc' ? 1 : -1;
      var va, vb;
      if (pfSort.key === 'name') { va = (a.name || '').toLowerCase(); vb = (b.name || '').toLowerCase(); }
      else if (pfSort.key === 'set') { va = (a.set || '').toLowerCase(); vb = (b.set || '').toLowerCase(); }
      else if (pfSort.key === 'condition') { va = a.condition || 'NM'; vb = b.condition || 'NM'; }
      else if (pfSort.key === 'qty') { va = a.qty || 1; vb = b.qty || 1; }
      else if (pfSort.key === 'buyPrice') { va = a.buyPrice || 0; vb = b.buyPrice || 0; }
      else if (pfSort.key === 'currentPrice') { va = a.currentPrice || 0; vb = b.currentPrice || 0; }
      else if (pfSort.key === 'gain') { va = (a.currentPrice - a.buyPrice) * (a.qty || 1); vb = (b.currentPrice - b.buyPrice) * (b.qty || 1); }
      else { va = (a.name || '').toLowerCase(); vb = (b.name || '').toLowerCase(); }
      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
      return 0;
    });
  }

  function SortTh(thProps) {
    var sortKey = thProps.sortKey;
    var label = thProps.label;
    var isActive = pfSort.key === sortKey;
    var arrow = isActive ? (pfSort.dir === 'asc' ? ' \u2191' : ' \u2193') : ' \u2195';
    return h('th', {
      className: 'pf-sortable-th' + (isActive ? ' pf-th-active' : ''),
      onClick: function() { togglePfSort(sortKey); },
      style: { cursor: 'pointer', userSelect: 'none' }
    }, label + arrow);
  }

  function loadBinders() {
    if (!authUser) return;
    fetchBinders().then(function(data) {
      setBinders(data.binders || []);
      setUnassignedCount(data.unassigned_count || 0);
    }).catch(function() {});
  }

  React.useEffect(function() { loadBinders(); }, [authUser]);

  React.useEffect(function() {
    var cancelled = false;
    var cached = loadPriceCache();
    if (cached) { setLivePrices(cached); setPricesLoaded(true); }

    fetchPortfolio().then(function(data) {
      if (cancelled) return;
      var items = (data && data.items) ? data.items : [];
      var priceMap = {};
      var metaMap = {};
      items.forEach(function(item) {
        if (item.card_id) {
          var price = parseFloat(item.price_usd) || parseFloat(item.price_usd_foil) || 0;
          priceMap[item.card_id] = price;
          metaMap[item.card_id] = {
            set_name: item.set_name || '',
            condition: item.condition || 'NM',
            binder_id: item.binder_id || null,
            rarity: item.rarity || '',
            type_line: item.type_line || '',
            mana_cost: item.mana_cost || '',
            color_identity: item.color_identity || ''
          };
        }
      });
      setLivePrices(priceMap);
      setCardMetadata(metaMap);
      savePriceCache(priceMap);
      setPricesLoaded(true);
    }).catch(function() { if (!cancelled) setPricesLoaded(true); });

    return function() { cancelled = true; };
  }, []);

  /* Enrich portfolio items with live prices + condition multiplier */
  var enriched = portfolio.map(function(item) {
    var nmPrice = livePrices[item.id] !== undefined ? livePrices[item.id] : item.currentPrice;
    var meta = cardMetadata[item.id] || {};
    var cond = item.condition || meta.condition || 'NM';
    var mult = CONDITION_MULT[cond] || 1.0;
    var adjustedPrice = nmPrice * mult;
    return Object.assign({}, item, {
      currentPrice: adjustedPrice,
      nmPrice: nmPrice,
      condition: cond,
      binder_id: item.binder_id !== undefined ? item.binder_id : (meta.binder_id || null),
      set: item.set || meta.set_name || '',
      rarity: meta.rarity || '',
      type_line: meta.type_line || '',
      mana_cost: meta.mana_cost || '',
      color_identity: meta.color_identity || ''
    });
  });

  /* Filter by active binder */
  var filtered = enriched;
  if (activeBinder === 'unassigned') {
    filtered = enriched.filter(function(item) { return !item.binder_id; });
  } else if (activeBinder) {
    filtered = enriched.filter(function(item) { return item.binder_id === activeBinder; });
  }

  /* KPIs */
  var totalCost = filtered.reduce(function(sum, item) { return sum + (item.buyPrice || 0) * (item.qty || 1); }, 0);
  var totalValue = filtered.reduce(function(sum, item) { return sum + (item.currentPrice || 0) * (item.qty || 1); }, 0);
  var totalGain = totalValue - totalCost;
  var totalGainPct = totalCost > 0 ? ((totalGain / totalCost) * 100) : 0;

  /* Group items */
  var grouped = null;
  if (groupByMode !== 'none' && filtered.length > 0) {
    var keyFn;
    if (groupByMode === 'set') keyFn = function(item) { return item.set || 'Unknown Set'; };
    else if (groupByMode === 'color') keyFn = function(item) { return inferColor(item.mana_cost); };
    else if (groupByMode === 'type') keyFn = function(item) { return inferType(item.type_line); };
    else if (groupByMode === 'rarity') keyFn = function(item) { return item.rarity ? (item.rarity.charAt(0).toUpperCase() + item.rarity.slice(1)) : 'Unknown'; };
    else if (groupByMode === 'condition') keyFn = function(item) { return CONDITION_LABELS[item.condition] || item.condition; };
    else if (groupByMode === 'binder') keyFn = function(item) {
      if (!item.binder_id) return 'Unassigned';
      var b = binders.find(function(bin) { return bin.id === item.binder_id; });
      return b ? b.name : 'Unknown Binder';
    };
    else keyFn = function() { return 'All'; };
    grouped = groupBy(filtered, keyFn);
  }

  function removeItem(id) {
    updatePortfolio(portfolio.filter(function(item) { return item.id !== id; }));
    removeFromPortfolioAPI(id).catch(function() {});
  }

  function updateQty(id, qty) {
    if (qty < 1) return removeItem(id);
    var updated = portfolio.map(function(item) {
      return item.id === id ? Object.assign({}, item, { qty: qty }) : item;
    });
    updatePortfolio(updated);
    var item = portfolio.find(function(i) { return i.id === id; });
    if (item) {
      removeFromPortfolioAPI(id).then(function() {
        return addToPortfolioAPI({ card_id: id, card_name: item.name, quantity: qty, added_price: item.buyPrice || 0, condition: item.condition || 'NM', binder_id: item.binder_id || null });
      }).catch(function() {});
    }
  }

  function handleConditionChange(id, newCond) {
    var updated = portfolio.map(function(item) {
      return item.id === id ? Object.assign({}, item, { condition: newCond }) : item;
    });
    updatePortfolio(updated);
    updatePortfolioItem({ card_id: id, condition: newCond }).catch(function() {});
  }

  function handleAssignBinder(id, newBinderId) {
    var parsed = newBinderId ? parseInt(newBinderId) : null;
    var updated = portfolio.map(function(item) {
      return item.id === id ? Object.assign({}, item, { binder_id: parsed }) : item;
    });
    updatePortfolio(updated);
    updatePortfolioItem({ card_id: id, binder_id: parsed }).catch(function() {});
  }

  function handleDeleteBinder(id) {
    deleteBinder(id).then(function() {
      loadBinders();
      if (activeBinder === id) setActiveBinder(null);
      /* Cards unassigned server-side; update local state */
      var updated = portfolio.map(function(item) {
        return item.binder_id === id ? Object.assign({}, item, { binder_id: null }) : item;
      });
      updatePortfolio(updated);
    }).catch(function() {});
  }

  function refreshPortfolio() {
    fetchPortfolio().then(function(data) {
      var items = (data && data.items) ? data.items : [];
      var updatedPortfolio = items.map(function(item) {
        return {
          id: item.card_id, name: item.card_name, set: item.set_name || '', qty: item.quantity || 1,
          buyPrice: item.added_price || 0, currentPrice: parseFloat(item.price_usd) || parseFloat(item.price_usd_foil) || 0,
          image: item.image_small || null, condition: item.condition || 'NM', binder_id: item.binder_id || null
        };
      });
      if (updatedPortfolio.length > 0) updatePortfolio(updatedPortfolio);
    }).catch(function() {});
  }

  /* Render a card table (used for both flat and grouped views) */
  function renderCardTable(items) {
    var sorted = sortItems(items);
    return h('table', { className: 'portfolio-table' },
      h('thead', null, h('tr', null,
        h(SortTh, { sortKey: 'name', label: 'Card' }),
        h(SortTh, { sortKey: 'set', label: 'Set' }),
        h(SortTh, { sortKey: 'condition', label: 'Cond' }),
        h(SortTh, { sortKey: 'qty', label: 'Qty' }),
        h(SortTh, { sortKey: 'buyPrice', label: 'Buy Price' }),
        h(SortTh, { sortKey: 'currentPrice', label: 'Current' }),
        h(SortTh, { sortKey: 'gain', label: 'Gain/Loss' }),
        authUser && h('th', null, 'Binder'),
        h('th', null, 'Actions')
      )),
      h('tbody', null, sorted.map(function(item) {
        var gain = (item.currentPrice - item.buyPrice) * item.qty;
        var gainPct = item.buyPrice > 0 ? ((item.currentPrice - item.buyPrice) / item.buyPrice * 100) : 0;
        return h('tr', { key: item.id },
          h('td', null, h('a', { className: 'card-name-cell', href: '#card/' + item.id, onClick: function(e) { e.preventDefault(); window.location.hash = 'card/' + item.id; } }, item.name)),
          h('td', null, item.set || '\u2014'),
          h('td', null, h(ConditionSelector, { value: item.condition, onChange: function(v) { handleConditionChange(item.id, v); } })),
          h('td', null, h('div', { className: 'cart-item-controls' },
            h('button', { className: 'qty-btn', onClick: function() { updateQty(item.id, (item.qty || 1) - 1); } }, '\u2212'),
            h('span', { className: 'qty-value' }, item.qty || 1),
            h('button', { className: 'qty-btn', onClick: function() { updateQty(item.id, (item.qty || 1) + 1); } }, '+')
          )),
          h('td', null, formatUSD(item.buyPrice)),
          h('td', null, formatUSD(item.currentPrice)),
          h('td', null, h('span', { className: gain >= 0 ? 'price-up' : 'price-down' },
            (gain >= 0 ? '+' : '') + formatUSD(gain), ' (', (gainPct >= 0 ? '+' : '') + gainPct.toFixed(1), '%)'
          )),
          authUser && h('td', null, h('select', {
            className: 'cond-select binder-select',
            value: item.binder_id || '',
            onChange: function(e) { handleAssignBinder(item.id, e.target.value); }
          },
            h('option', { value: '' }, '\u2014'),
            binders.map(function(b) { return h('option', { key: b.id, value: b.id }, b.name); })
          )),
          h('td', null, h('button', { className: 'btn btn-sm btn-danger', onClick: function() { removeItem(item.id); } }, 'Remove'))
        );
      }))
    );
  }

  /* Main tabs: Collection | Lists */
  var tabs = [
    { key: 'all', label: 'Collection' },
    { key: 'lists', label: 'Lists' }
  ];

  return h('div', { className: 'container portfolio-page' },
    /* Header */
    h('div', { className: 'portfolio-header-row' },
      h('h1', { className: 'page-heading' }, 'My Portfolio'),
      h('div', { className: 'pf-header-actions' },
        h('button', { className: 'btn btn-secondary btn-sm portfolio-import-btn', onClick: function() { setShowImport(true); } }, h(UploadIcon, null), ' Import')
      )
    ),

    /* Tab bar: Collection | Lists */
    h('div', { className: 'pf-tabs' },
      tabs.map(function(tab) {
        return h('button', {
          key: tab.key, type: 'button',
          className: 'pf-tab' + (activeTab === tab.key ? ' pf-tab--active' : ''),
          onClick: function() { setActiveTab(tab.key); }
        }, tab.label);
      })
    ),

    /* Lists tab */
    activeTab === 'lists' && h(ListsPanel, { authUser: authUser }),

    /* Collection tab */
    activeTab === 'all' && h(React.Fragment, null,
      /* KPIs */
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
          h('div', { className: 'kpi-value' }, filtered.length)
        )
      ),

      /* Toolbar: binder filter + group-by */
      h('div', { className: 'pf-toolbar' },
        /* Binder filter chips */
        authUser && h('div', { className: 'pf-binder-chips' },
          h('button', {
            className: 'pf-chip' + (!activeBinder ? ' pf-chip--active' : ''),
            onClick: function() { setActiveBinder(null); }
          }, 'All Cards'),
          h('button', {
            className: 'pf-chip' + (activeBinder === 'unassigned' ? ' pf-chip--active' : ''),
            onClick: function() { setActiveBinder('unassigned'); }
          }, 'Unsorted (' + unassignedCount + ')'),
          binders.map(function(b) {
            return h('button', {
              key: b.id,
              className: 'pf-chip' + (activeBinder === b.id ? ' pf-chip--active' : ''),
              onClick: function() { setActiveBinder(b.id); }
            },
              h('span', { className: 'pf-chip-dot', style: { background: b.color || 'var(--color-primary)' } }),
              b.name + ' (' + (b.card_count || 0) + ')',
              h('button', {
                className: 'pf-chip-delete', onClick: function(e) { e.stopPropagation(); handleDeleteBinder(b.id); }
              }, '\u00d7')
            );
          }),
          h('button', { className: 'pf-chip pf-chip--add', onClick: function() { setShowCreateBinder(true); } }, '+ Binder')
        ),

        /* Group-by selector */
        h('div', { className: 'pf-group-control' },
          h('label', { className: 'pf-group-label' }, 'Group by:'),
          h('select', {
            className: 'cond-select',
            value: groupByMode,
            onChange: function(e) { setGroupByMode(e.target.value); }
          }, GROUP_OPTIONS.map(function(opt) {
            return h('option', { key: opt.value, value: opt.value }, opt.label);
          }))
        )
      ),

      !pricesLoaded && h('p', { className: 'price-source' }, 'Loading live prices...'),

      /* Card table(s) */
      portfolio.length === 0
        ? h('div', { className: 'empty-state' },
            h('div', { className: 'empty-state-icon' }, h(PortfolioIcon, null)),
            h('h3', null, 'Your portfolio is empty'),
            h('p', null, 'Search for cards and click "Track" to add them to your portfolio.'),
            h('a', { href: '#search', className: 'btn btn-primary' }, 'Browse Cards')
          )
        : grouped
          ? h('div', { className: 'pf-grouped-tables' },
              grouped.order.map(function(groupName) {
                var items = grouped.groups[groupName];
                var groupValue = items.reduce(function(sum, item) { return sum + (item.currentPrice || 0) * (item.qty || 1); }, 0);
                return h('div', { key: groupName, className: 'pf-group-section' },
                  h('div', { className: 'pf-group-header' },
                    h('h3', { className: 'pf-group-name' }, groupName),
                    h('span', { className: 'pf-group-meta' }, items.length + ' card' + (items.length !== 1 ? 's' : '') + ' \u00b7 ' + formatUSD(groupValue))
                  ),
                  h('div', { className: 'portfolio-table-wrapper' }, renderCardTable(items))
                );
              })
            )
          : h('div', { className: 'portfolio-table-wrapper' }, renderCardTable(filtered)),

      filtered.length > 0 && h('p', { className: 'price-source', style: { marginTop: 'var(--space-4)' } },
        'Gain/Loss calculated from buy price vs. condition-adjusted market data. NM prices via Scryfall, condition multipliers applied (LP: 85%, MP: 70%, HP: 50%, DMG: 30%).'
      )
    ),

    /* Modals */
    showImport && h(PortfolioImportModal, {
      onClose: function() { setShowImport(false); },
      onSuccess: refreshPortfolio,
      onLocalImport: function(importedCards) { updatePortfolio(portfolio.concat(importedCards)); },
      isAuth: !!authUser
    }),
    showCreateBinder && h(CreateBinderModal, {
      onClose: function() { setShowCreateBinder(false); },
      onCreated: function() { loadBinders(); }
    })
  );
}
