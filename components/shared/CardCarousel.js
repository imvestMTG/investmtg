/* shared/CardCarousel.js — Horizontal scrolling carousel for MTG card sections */
import React from 'react';
import { formatUSD, getCardPrice, getCardImageSmall } from '../../utils/helpers.js';
var h = React.createElement;

function ChevronLeftIcon() {
  return h('svg', { width: 20, height: 20, viewBox: '0 0 20 20', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' },
    h('polyline', { points: '13 4 7 10 13 16' })
  );
}

function ChevronRightIcon() {
  return h('svg', { width: 20, height: 20, viewBox: '0 0 20 20', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' },
    h('polyline', { points: '7 4 13 10 7 16' })
  );
}

export function CardCarousel(props) {
  var cards = props.cards;
  var state = props.state;
  var onOpenListing = props.onOpenListing;

  var trackRef = React.useRef(null);
  var ref1 = React.useState(false);
  var canScrollLeft = ref1[0], setCanScrollLeft = ref1[1];
  var ref2 = React.useState(false);
  var canScrollRight = ref2[0], setCanScrollRight = ref2[1];

  function updateScrollState() {
    var el = trackRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  }

  React.useEffect(function() {
    var el = trackRef.current;
    if (!el) return;
    /* Initial check after images start loading */
    var t = setTimeout(updateScrollState, 120);
    el.addEventListener('scroll', updateScrollState, { passive: true });
    window.addEventListener('resize', updateScrollState);
    return function() {
      clearTimeout(t);
      el.removeEventListener('scroll', updateScrollState);
      window.removeEventListener('resize', updateScrollState);
    };
  }, [cards]);

  function scroll(direction) {
    var el = trackRef.current;
    if (!el) return;
    /* Scroll by roughly 2.5 card widths */
    var cardWidth = el.querySelector('.carousel-card');
    var amount = cardWidth ? cardWidth.offsetWidth * 2.5 : el.clientWidth * 0.75;
    el.scrollBy({ left: direction * amount, behavior: 'smooth' });
  }

  if (!cards || cards.length === 0) {
    return h('div', { className: 'empty-state' },
      h('p', null, 'No cards found.')
    );
  }

  return h('div', { className: 'carousel-wrap' },
    canScrollLeft && h('button', {
      className: 'carousel-arrow carousel-arrow--left',
      onClick: function() { scroll(-1); },
      'aria-label': 'Scroll left'
    }, h(ChevronLeftIcon, null)),

    h('div', { className: 'carousel-track', ref: trackRef },
      cards.map(function(card) {
        if (!card) return null;
        var price = getCardPrice(card);
        var foilPrice = card.prices && card.prices.usd_foil ? parseFloat(card.prices.usd_foil) : null;

        return h('article', {
          key: card.id,
          className: 'carousel-card',
          onClick: function() { window.location.hash = 'card/' + card.id; },
          role: 'button',
          tabIndex: 0,
          onKeyDown: function(e) { if (e.key === 'Enter') window.location.hash = 'card/' + card.id; },
          'aria-label': card.name + ', ' + formatUSD(price)
        },
          h('div', { className: 'carousel-card-image' },
            h('img', {
              src: getCardImageSmall(card),
              alt: card.name,
              loading: 'lazy',
              decoding: 'async',
              onError: function(e) { e.target.style.opacity = '0'; },
              onLoad: function(e) { e.target.style.opacity = '1'; },
              style: { transition: 'opacity 0.3s ease' }
            })
          ),
          h('div', { className: 'carousel-card-info' },
            h('div', { className: 'carousel-card-name' }, card.name),
            h('div', { className: 'carousel-card-set' }, card.set_name),
            h('div', { className: 'carousel-card-price-row' },
              h('span', { className: 'carousel-card-price' }, formatUSD(price)),
              foilPrice ? h('span', { className: 'carousel-card-foil' }, 'Foil ' + formatUSD(foilPrice)) : null
            )
          )
        );
      })
    ),

    canScrollRight && h('button', {
      className: 'carousel-arrow carousel-arrow--right',
      onClick: function() { scroll(1); },
      'aria-label': 'Scroll right'
    }, h(ChevronRightIcon, null))
  );
}
