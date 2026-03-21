/* FAQView.js — Frequently Asked Questions */
import React from 'react';
var h = React.createElement;

var FAQ_SECTIONS = [
  {
    title: 'About investMTG',
    items: [
      {
        q: 'What is investMTG?',
        a: 'investMTG is a price-tracking and community marketplace platform for physical Magic: The Gathering cards. We aggregate real-time pricing data from multiple sources and connect local buyers and sellers in Guam and beyond.'
      },
      {
        q: 'Is this a price tracker or a store?',
        a: 'Both. Every card page shows live market prices sourced from JustTCG, EchoMTG, and Scryfall. On top of that, community sellers can list their physical cards for sale through our Guam-based marketplace.'
      },
      {
        q: 'Do you sell cards directly?',
        a: 'No. investMTG is a community platform — all card listings come from verified sellers in the community. We do not own or stock inventory. Think of us as a local marketplace that also tracks prices.'
      }
    ]
  },
  {
    title: 'Buying Cards',
    items: [
      {
        q: 'How do I buy a card?',
        a: 'Find the card you want using search or by browsing. On the card detail page, tap "Add to Cart" to see available seller listings. Select a listing from a community seller, choose your preferred store for pickup, and proceed to checkout.'
      },
      {
        q: 'Can I buy cards online and have them shipped?',
        a: 'Currently, investMTG focuses on local pickup through partnered stores on Guam. Online shipping may be available in the future as the platform grows.'
      },
      {
        q: 'What payment methods are accepted?',
        a: 'Checkout supports Stripe (credit/debit card, Apple Pay, Google Pay) for online payments, or Reserve & Pay at Pickup for in-person transactions. Sellers with Stripe accounts receive payouts automatically.'
      },
      {
        q: 'What if a card I want has no seller listings?',
        a: 'Not every card will have a community listing. You can use the "Watch" button to track the card and be ready when a seller lists it. The price data is still useful for tracking your investments.'
      }
    ]
  },
  {
    title: 'Selling Cards',
    items: [
      {
        q: 'How do I sell cards on investMTG?',
        a: 'Sign in with Google, then visit the Seller Dashboard. You can search for cards, select a printing, set your condition and price, and publish a listing. Buyers will find your listing in the marketplace.'
      },
      {
        q: 'Is there a fee to list cards?',
        a: 'Listing cards is free during the platform launch. Pricing details for any future fees will be communicated well in advance.'
      }
    ]
  },
  {
    title: 'Pricing & Data',
    items: [
      {
        q: 'Where do prices come from?',
        a: 'We use a multi-source pricing waterfall: JustTCG is checked first for the most detailed condition-level pricing and trends. If unavailable, we fall back to EchoMTG for graded/slab data, and then Scryfall market prices as the baseline. Every card page shows which source is providing the displayed price.'
      },
      {
        q: 'Why does a card show "N/A" for the price?',
        a: 'Some older or rare printings (like Reserved List cards from Alpha/Beta) do not have USD market data available from any source. The card still has value — the data providers simply do not track a USD price for that specific printing.'
      },
      {
        q: 'Are these prices for paper cards only?',
        a: 'Yes. investMTG exclusively tracks paper Magic cards. Digital-only cards from Magic Online (MTGO) or MTG Arena are excluded from all pricing and search results.'
      },
      {
        q: 'What is the price history chart?',
        a: 'When available, the card detail page shows a 30-day NM (Near Mint) price trend sourced from JustTCG. It also shows 7-day, 30-day, and 90-day percentage changes, plus all-time low/high and 52-week range.'
      }
    ]
  },
  {
    title: 'Accounts & Privacy',
    items: [
      {
        q: 'Do I need an account?',
        a: 'No. You can browse cards, view prices, and search without signing in. An account (via Google sign-in) is needed to track a portfolio, create watchlists, sell cards, or place orders.'
      },
      {
        q: 'How is my data handled?',
        a: 'We only store what is needed for your account to function: your email, display name, portfolio, and order history. We do not sell your data. See our Privacy Policy for full details.'
      }
    ]
  }
];

export function FAQView() {
  var ref1 = React.useState(null);
  var openIdx = ref1[0], setOpenIdx = ref1[1];

  function toggleItem(sectionIdx, itemIdx) {
    var key = sectionIdx + '-' + itemIdx;
    setOpenIdx(function(prev) { return prev === key ? null : key; });
  }

  return h('div', { className: 'container' },
    h('div', { className: 'faq-page' },
      h('h1', { className: 'faq-title' }, 'Frequently Asked Questions'),
      h('p', { className: 'faq-intro' },
        'Everything you need to know about using investMTG \u2014 from tracking card prices to buying and selling in the community marketplace.'
      ),
      FAQ_SECTIONS.map(function(section, si) {
        return h('div', { key: si, className: 'faq-section' },
          h('h2', { className: 'faq-section-title' }, section.title),
          section.items.map(function(item, ii) {
            var key = si + '-' + ii;
            var isOpen = openIdx === key;
            return h('div', {
              key: key,
              className: 'faq-item' + (isOpen ? ' faq-item--open' : ''),
              onClick: function() { toggleItem(si, ii); }
            },
              h('div', { className: 'faq-question', role: 'button', tabIndex: 0, 'aria-expanded': isOpen,
                onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleItem(si, ii); } }
              },
                h('span', null, item.q),
                h('span', { className: 'faq-chevron' + (isOpen ? ' faq-chevron--open' : '') }, '\u25B6')
              ),
              isOpen && h('div', { className: 'faq-answer' }, item.a)
            );
          })
        );
      }),
      h('div', { className: 'faq-footer' },
        h('p', null,
          'Still have questions? ',
          h('a', { href: '#pricing' }, 'Learn how we source prices'),
          ' or read our ',
          h('a', { href: '#terms' }, 'Terms of Service'),
          ' and ',
          h('a', { href: '#privacy' }, 'Privacy Policy'),
          '.'
        )
      )
    )
  );
}
