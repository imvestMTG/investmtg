/* ListingModal.js */
import React from 'react';
import { CloseIcon } from './shared/Icons.js';
import { showToast } from './shared/Toast.js';
import { getCardPrice, formatUSD, getScryfallImageUrl } from '../utils/helpers.js';
import { fetchConditionPrices } from '../utils/api.js';
var h = React.createElement;

/* Input sanitization for marketplace listings */
function sanitize(str, maxLen) {
  if (!str) return '';
  var s = str.trim().slice(0, maxLen || 200);
  s = s.replace(/<[^>]*>/g, '');
  s = s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  s = s.replace(/javascript\s*:/gi, '').replace(/data\s*:/gi, '');
  return s;
}

function sanitizePrice(val) {
  var p = parseFloat(val);
  if (isNaN(p) || p < 0) return NaN;
  return Math.min(p, 99999);
}

export function ListingModal(props) {
  var isOpen = props.isOpen;
  var onClose = props.onClose;
  var onSubmit = props.onSubmit;
  var prefillCard = props.prefillCard;
  var prefillCardName = props.prefillCardName;

  /* Extract prefill data from full card object */
  var cardData = React.useMemo(function() {
    if (!prefillCard || typeof prefillCard === 'string') return null;
    var nmPrice = getCardPrice(prefillCard);
    return {
      name: prefillCard.name || '',
      setName: prefillCard.set_name || '',
      nmPrice: nmPrice,
      price: nmPrice > 0 ? nmPrice.toFixed(2) : '',
      cardId: prefillCard.id || null,
      tcgplayerId: prefillCard.tcgplayer_id || null,
      setCode: prefillCard.set || '',
      image: getScryfallImageUrl(prefillCard, 'small') || '',
      imageNormal: getScryfallImageUrl(prefillCard, 'normal') || ''
    };
  }, [prefillCard]);

  /* Controlled state for form fields */
  var ref1 = React.useState(cardData ? cardData.name : (prefillCardName || ''));
  var cardName = ref1[0], setCardName = ref1[1];
  var ref2 = React.useState(cardData ? cardData.setName : '');
  var setName = ref2[0], setSetName = ref2[1];
  var ref3 = React.useState(cardData ? cardData.price : '');
  var price = ref3[0], setPrice = ref3[1];
  var ref4 = React.useState('NM');
  var condition = ref4[0], setCondition = ref4[1];

  /* JustTCG real-time condition prices: { NM: 918.31, LP: 796.27, ... } */
  var ref5 = React.useState({});
  var conditionPrices = ref5[0], setConditionPrices = ref5[1];
  var ref6 = React.useState(false);
  var pricesLoading = ref6[0], setPricesLoading = ref6[1];

  /* Track if user manually edited the price — stop auto-updating if so */
  var ref7 = React.useState(false);
  var priceManuallyEdited = ref7[0], setPriceManuallyEdited = ref7[1];

  /* Sync state when prefillCard changes (modal opens for a new card) */
  React.useEffect(function() {
    if (cardData) {
      setCardName(cardData.name);
      setSetName(cardData.setName);
      setPrice(cardData.price);
      setCondition('NM');
      setPriceManuallyEdited(false);
      setConditionPrices({});
    } else if (prefillCardName) {
      setCardName(prefillCardName);
      setSetName('');
      setPrice('');
      setCondition('NM');
      setPriceManuallyEdited(false);
      setConditionPrices({});
    }
  }, [cardData, prefillCardName]);

  /* Fetch all condition prices from JustTCG when modal opens with card data */
  React.useEffect(function() {
    if (!cardData || (!cardData.tcgplayerId && !cardData.cardId)) return;
    setPricesLoading(true);
    fetchConditionPrices({ tcgplayerId: cardData.tcgplayerId, scryfallId: cardData.cardId }).then(function(prices) {
      setConditionPrices(prices);
      /* If NM price came back from JustTCG and user hasn't edited, use it */
      if (prices.NM && !priceManuallyEdited) {
        setPrice(prices.NM.toFixed(2));
      }
      setPricesLoading(false);
    }).catch(function() { setPricesLoading(false); });
  }, [cardData]);

  var formRef = React.useRef(null);

  if (!isOpen) return null;

  /* When condition changes, update price to the real JustTCG price for that condition */
  var handleConditionChange = function(e) {
    var newCondition = e.target.value;
    setCondition(newCondition);
    if (!priceManuallyEdited) {
      var realPrice = conditionPrices[newCondition];
      if (realPrice) {
        setPrice(realPrice.toFixed(2));
      }
    }
  };

  /* When user manually types a price, mark it as edited */
  var handlePriceChange = function(e) {
    setPrice(e.target.value);
    setPriceManuallyEdited(true);
  };

  /* Reset manual edit flag — lets user go back to auto-populated prices */
  var handleResetToMarket = function() {
    var realPrice = conditionPrices[condition];
    if (realPrice) {
      setPrice(realPrice.toFixed(2));
      setPriceManuallyEdited(false);
    }
  };

  var handleSubmit = function(e) {
    e.preventDefault();
    var form = formRef.current;
    if (!form) return;

    var cleanName = sanitize(cardName, 100);
    var cleanSet = sanitize(setName, 100);
    var cleanPrice = sanitizePrice(price);
    var typeRadio = form.querySelector('input[name="listing-type"]:checked');
    var type = typeRadio ? typeRadio.value : 'sale';
    var seller = sanitize(form.querySelector('#listing-seller').value, 60);
    var contact = sanitize(form.querySelector('#listing-contact').value, 100);
    var notes = sanitize(form.querySelector('#listing-notes').value, 500);

    if (!cleanName || !cleanSet || !condition || isNaN(cleanPrice) || !seller || !contact) return;

    onSubmit({
      id: 'm' + Date.now(),
      cardName: cleanName,
      setName: cleanSet,
      condition: condition,
      price: cleanPrice,
      type: type,
      seller: seller,
      contact: contact,
      notes: notes,
      card_id: cardData ? cardData.cardId : null,
      set_name: cleanSet,
      image: cardData ? cardData.image : '',
      image_uri: cardData ? cardData.image : '',
      createdAt: Date.now()
    });

    if (form) form.reset();
    setCardName('');
    setSetName('');
    setPrice('');
    setCondition('NM');
    setPriceManuallyEdited(false);
    setConditionPrices({});
    onClose();
    showToast('Listing added!');
  };

  var handleOverlayClick = function(e) {
    if (e.target === e.currentTarget) onClose();
  };

  /* Build the market reference + pricing source disclosure */
  var marketRef = null;
  var hasTcgPrices = Object.keys(conditionPrices).length > 0;
  var currentConditionPrice = conditionPrices[condition];
  var mrefStyle = {
    fontSize: 'var(--text-xs)',
    color: 'var(--color-text-muted)',
    marginTop: 'calc(-1 * var(--space-2))',
    marginBottom: 'var(--space-3)',
    lineHeight: '1.5'
  };

  if (currentConditionPrice) {
    marketRef = h('div', { style: Object.assign({}, mrefStyle, { display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }) },
      h('span', null,
        condition + ' market: ' + formatUSD(currentConditionPrice) +
        (conditionPrices.NM && condition !== 'NM'
          ? ' (NM: ' + formatUSD(conditionPrices.NM) + ')'
          : '')
      ),
      priceManuallyEdited && h('button', {
        type: 'button',
        onClick: handleResetToMarket,
        style: {
          background: 'none',
          border: 'none',
          color: 'var(--color-primary)',
          cursor: 'pointer',
          fontSize: 'var(--text-xs)',
          padding: '0',
          textDecoration: 'underline'
        }
      }, 'Reset to market price')
    );
  } else if (pricesLoading) {
    marketRef = h('p', { style: mrefStyle }, 'Fetching market prices\u2026');
  } else if (cardData && cardData.nmPrice > 0) {
    /* Fallback: Scryfall NM price if JustTCG didn't return data */
    marketRef = h('p', { style: mrefStyle },
      'NM reference: ' + formatUSD(cardData.nmPrice) + ' (via Scryfall)'
    );
  }

  /* Pricing source disclosure — always shown when card data is present */
  var pricingDisclosure = cardData ? h('div', {
    className: 'listing-pricing-disclosure',
    style: {
      fontSize: 'var(--text-xs)',
      color: 'var(--color-text-muted)',
      borderTop: '1px solid var(--color-border, rgba(255,255,255,0.1))',
      paddingTop: 'var(--space-3)',
      marginTop: 'var(--space-3)',
      marginBottom: 'var(--space-3)',
      lineHeight: '1.6'
    }
  },
    h('p', { style: { margin: '0 0 var(--space-1) 0', fontWeight: '600', color: 'var(--color-text-secondary, var(--color-text-muted))' } },
      'Pricing Transparency'
    ),
    h('p', { style: { margin: '0 0 var(--space-1) 0' } },
      hasTcgPrices
        ? 'Suggested prices are real-time TCGplayer market values sourced from '
        : 'Card data sourced from '
    ),
    h('span', null,
      hasTcgPrices
        ? h('span', null,
            h('a', {
              href: 'https://justtcg.com',
              target: '_blank',
              rel: 'noopener noreferrer',
              style: { color: 'var(--color-primary)', textDecoration: 'underline' }
            }, 'JustTCG'),
            ', which aggregates seller data from ',
            h('a', {
              href: 'https://www.tcgplayer.com',
              target: '_blank',
              rel: 'noopener noreferrer',
              style: { color: 'var(--color-primary)', textDecoration: 'underline' }
            }, 'TCGplayer'),
            '. Prices reflect the lowest available listing for each condition and are updated every 6 hours. Card details provided by ',
            h('a', {
              href: 'https://scryfall.com',
              target: '_blank',
              rel: 'noopener noreferrer',
              style: { color: 'var(--color-primary)', textDecoration: 'underline' }
            }, 'Scryfall'),
            '.'
          )
        : h('span', null,
            h('a', {
              href: 'https://scryfall.com',
              target: '_blank',
              rel: 'noopener noreferrer',
              style: { color: 'var(--color-primary)', textDecoration: 'underline' }
            }, 'Scryfall'),
            '. Condition-specific pricing unavailable for this card.'
          )
    ),
    h('p', { style: { margin: 'var(--space-2) 0 0 0', fontStyle: 'italic' } },
      'Prices are estimates and may not reflect actual sale prices. You are free to set any asking price.'
    )
  ) : null;

  return h('div', { className: 'mp-modal-overlay open', onClick: handleOverlayClick },
    h('div', { className: 'mp-modal' },
      h('div', { className: 'mp-modal-header' },
        h('h3', null, 'List Your Card'),
        h('button', { className: 'mp-modal-close', onClick: onClose, 'aria-label': 'Close' },
          h(CloseIcon)
        )
      ),

      /* Card preview when prefill data is available */
      cardData && cardData.image && h('div', { className: 'listing-card-preview' },
        h('img', {
          src: cardData.image,
          alt: cardData.name,
          className: 'listing-preview-img',
          loading: 'lazy'
        })
      ),

      h('form', { className: 'mp-listing-form', ref: formRef, onSubmit: handleSubmit },
        h('div', { className: 'mp-form-row' },
          h('label', { htmlFor: 'listing-card-name' }, 'Card Name *'),
          h('input', {
            type: 'text',
            id: 'listing-card-name',
            value: cardName,
            onChange: function(e) { if (!cardData) setCardName(e.target.value); },
            placeholder: 'e.g. Black Lotus',
            required: true,
            maxLength: 100,
            readOnly: !!cardData
          })
        ),
        h('div', { className: 'mp-form-row' },
          h('label', { htmlFor: 'listing-set-name' }, 'Set Name *'),
          h('input', {
            type: 'text',
            id: 'listing-set-name',
            value: setName,
            onChange: function(e) { if (!cardData) setSetName(e.target.value); },
            placeholder: 'e.g. Unlimited',
            required: true,
            maxLength: 100,
            readOnly: !!cardData
          })
        ),
        h('div', { className: 'mp-form-grid-2' },
          h('div', { className: 'mp-form-row' },
            h('label', { htmlFor: 'listing-condition' }, 'Condition *'),
            h('select', {
              id: 'listing-condition',
              value: condition,
              onChange: handleConditionChange,
              required: true
            },
              h('option', { value: 'NM' }, 'Near Mint (NM)'),
              h('option', { value: 'LP' }, 'Lightly Played (LP)'),
              h('option', { value: 'MP' }, 'Moderately Played (MP)'),
              h('option', { value: 'HP' }, 'Heavily Played (HP)'),
              h('option', { value: 'DMG' }, 'Damaged (DMG)')
            )
          ),
          h('div', { className: 'mp-form-row' },
            h('label', { htmlFor: 'listing-price' }, 'Price (USD) *'),
            h('input', {
              type: 'number',
              id: 'listing-price',
              value: price,
              onChange: handlePriceChange,
              min: '0',
              max: '99999',
              step: '0.01',
              placeholder: '0.00',
              required: true
            })
          )
        ),

        /* Market reference from JustTCG */
        marketRef,

        h('div', { className: 'mp-form-row' },
          h('label', null, 'Listing Type *'),
          h('div', { className: 'mp-radio-group' },
            h('label', { className: 'mp-radio-label' },
              h('input', { type: 'radio', name: 'listing-type', value: 'sale', defaultChecked: true }),
              ' For Sale'
            ),
            h('label', { className: 'mp-radio-label' },
              h('input', { type: 'radio', name: 'listing-type', value: 'trade' }),
              ' For Trade'
            )
          )
        ),
        h('div', { className: 'mp-form-grid-2' },
          h('div', { className: 'mp-form-row' },
            h('label', { htmlFor: 'listing-seller' }, 'Seller Name *'),
            h('input', { type: 'text', id: 'listing-seller', placeholder: 'Your name or handle', required: true, maxLength: 60 })
          ),
          h('div', { className: 'mp-form-row' },
            h('label', { htmlFor: 'listing-contact' }, 'Contact Info *'),
            h('input', { type: 'text', id: 'listing-contact', placeholder: '@instagram, phone, etc.', required: true, maxLength: 100 })
          )
        ),
        h('div', { className: 'mp-form-row' },
          h('label', { htmlFor: 'listing-notes' }, 'Notes (optional)'),
          h('textarea', { id: 'listing-notes', rows: '3', placeholder: 'Any additional details...', maxLength: 500 })
        ),
        /* Pricing source disclosure */
        pricingDisclosure,

        h('button', { type: 'submit', className: 'btn btn-primary', style: { width: '100%', padding: 'var(--space-3)' } }, 'Add Listing')
      )
    )
  );
}
