/* GuidelinesView.js — Community Guidelines page */
import React from 'react';
var h = React.createElement;

export function GuidelinesView() {
  React.useEffect(function() { window.scrollTo(0, 0); }, []);

  return h('div', { className: 'container legal-page' },
    h('h1', { className: 'page-heading' }, 'Community Guidelines'),
    h('p', { className: 'legal-intro' }, 'investMTG is a community-driven marketplace built on trust, transparency, and fair play. These guidelines help keep the platform safe and enjoyable for everyone.'),

    h('section', { className: 'legal-section' },
      h('h2', null, 'Card Grading Standards'),
      h('p', null, 'All marketplace listings must use one of the five standard condition grades below. Accurate grading builds buyer confidence and reduces disputes.'),
      h('table', { className: 'legal-table' },
        h('thead', null,
          h('tr', null,
            h('th', null, 'Grade'),
            h('th', null, 'Description'),
            h('th', null, 'What to Look For')
          )
        ),
        h('tbody', null,
          h('tr', null,
            h('td', null, h('strong', null, 'NM'), ' (Near Mint)'),
            h('td', null, 'Virtually flawless. The card looks as though it was just pulled from a pack.'),
            h('td', null, 'No visible wear, scratches, whitening, or edge nicks. Corners are sharp. Surface is clean and glossy.')
          ),
          h('tr', null,
            h('td', null, h('strong', null, 'LP'), ' (Lightly Played)'),
            h('td', null, 'Minor edge or corner wear. Still in excellent condition overall.'),
            h('td', null, 'Slight whitening on one or two edges. Faint surface scratches visible under close inspection. No creases.')
          ),
          h('tr', null,
            h('td', null, h('strong', null, 'MP'), ' (Moderately Played)'),
            h('td', null, 'Noticeable wear but fully playable in a sleeve.'),
            h('td', null, 'Visible edge wear, minor scuffing, or light scratches on the surface. May have a small bend that does not crease. Card is still structurally sound.')
          ),
          h('tr', null,
            h('td', null, h('strong', null, 'HP'), ' (Heavily Played)'),
            h('td', null, 'Significant wear and creasing. Playable in an opaque sleeve.'),
            h('td', null, 'Noticeable creases, heavy whitening, ink wear, or border damage. The card is intact but shows clear signs of heavy use.')
          ),
          h('tr', null,
            h('td', null, h('strong', null, 'DMG'), ' (Damaged)'),
            h('td', null, 'Structural damage. May not be tournament-legal even in a sleeve.'),
            h('td', null, 'Tears, water damage, heavy warping, missing pieces, or writing on the card. Significant structural issues beyond normal wear.')
          )
        )
      ),
      h('p', null, 'When in doubt, grade conservatively. A buyer who receives a card in better condition than expected is a happy buyer.')
    ),

    h('section', { className: 'legal-section' },
      h('h2', null, 'Pricing Norms'),
      h('p', null, 'The Scryfall market price is the site\u2019s baseline reference for every card. This price is displayed on card detail pages so buyers can quickly gauge fair value.'),
      h('ul', null,
        h('li', null, 'Sellers can set custom prices for their listings. There is no requirement to match the market price.'),
        h('li', null, 'Buyers should compare a seller\u2019s asking price with the displayed market price before purchasing.'),
        h('li', null, 'All prices on investMTG are in US Dollars (USD).'),
        h('li', null, 'investMTG is for physical paper cards only \u2014 no digital or MTGO listings are permitted.')
      )
    ),

    h('section', { className: 'legal-section' },
      h('h2', null, 'Seller Expectations'),
      h('p', null, 'Sellers are the backbone of the investMTG marketplace. To maintain a trustworthy community, we ask sellers to:'),
      h('ul', null,
        h('li', null, 'Respond to buyer messages within 48 hours.'),
        h('li', null, 'Accurately grade all cards using the standard conditions above.'),
        h('li', null, 'Ship orders within 3 business days of payment confirmation.'),
        h('li', null, 'Provide tracking information for orders over $25.'),
        h('li', null, 'Use protective packaging (toploaders, bubble mailers, or equivalent) to prevent damage in transit.')
      )
    ),

    h('section', { className: 'legal-section' },
      h('h2', null, 'Buyer Expectations'),
      h('p', null, 'Buyers help keep the marketplace healthy by acting in good faith:'),
      h('ul', null,
        h('li', null, 'Honor your reservations or cancel them promptly if plans change.'),
        h('li', null, 'Complete payment within 48 hours of placing a reservation.'),
        h('li', null, 'Report any issues (wrong card, misgraded condition, damage in transit) within 7 days of receiving the order.')
      )
    ),

    h('section', { className: 'legal-section' },
      h('h2', null, 'Reservations'),
      h('p', null, 'The Reserve & Pay at Pickup system lets buyers hold a card while they arrange payment:'),
      h('ul', null,
        h('li', null, 'Reservations hold a card for 48 hours.'),
        h('li', null, 'If payment is not completed within that window, the reservation expires automatically and the card becomes available again.'),
        h('li', null, 'Repeated reservation abandonment may result in account restrictions.')
      ),
      h('p', null, 'Sellers should keep reserved cards aside and not offer them to other buyers until the reservation expires or is cancelled.')
    ),

    h('section', { className: 'legal-section' },
      h('h2', null, 'Dispute Resolution'),
      h('p', null, 'If there\u2019s a problem with an order:'),
      h('ol', null,
        h('li', null, h('strong', null, 'Contact the seller first.'), ' Most issues can be resolved directly between buyer and seller.'),
        h('li', null, h('strong', null, 'If unresolved after 48 hours,'), ' file a dispute through investMTG by emailing ', h('a', { href: 'mailto:support@investmtg.com' }, 'support@investmtg.com'), ' with your order ID and a description of the issue.'),
        h('li', null, h('strong', null, 'We\u2019ll review the case'), ' and mediate between the parties. Our goal is a fair resolution for both sides.')
      ),
      h('p', null, 'For PayPal payments, PayPal\u2019s buyer protection also applies. You can open a dispute through ', h('a', { href: 'https://www.paypal.com/us/smarthelp/article/how-do-i-open-a-dispute-in-the-resolution-center-faq1249', target: '_blank', rel: 'noopener' }, 'PayPal\u2019s Resolution Center'), ' in addition to contacting the seller.')
    ),

    h('section', { className: 'legal-section' },
      h('h2', null, 'Reporting'),
      h('p', null, 'To report a bad actor, counterfeit listing, or other guideline violation, email ', h('a', { href: 'mailto:support@investmtg.com' }, 'support@investmtg.com'), ' with the following:'),
      h('ul', null,
        h('li', null, 'The order ID (if applicable)'),
        h('li', null, 'The seller or buyer username involved'),
        h('li', null, 'A description of the issue with any supporting evidence (screenshots, photos)')
      ),
      h('p', null, 'We investigate all reports and may suspend accounts that violate these guidelines.')
    ),

    h('section', { className: 'legal-section' },
      h('h2', null, 'The Fair Play Economy'),
      h('p', null, 'investMTG operates under the Fair Play Economy principle. All data on the site is real, verifiable, and transparent. We don\u2019t inflate prices, fabricate listings, or misrepresent card conditions.'),
      h('p', null, 'Every price you see is sourced from real market data. Every listing is posted by a real community member. This commitment to honesty is foundational to how we operate.'),
      h('p', null, 'Read more in our ', h('a', { href: 'https://github.com/imvestMTG/investmtg/blob/main/SOUL.md', target: '_blank', rel: 'noopener' }, 'Data Integrity Policy'), '.')
    ),

    h('section', { className: 'legal-section' },
      h('p', null, 'Questions about these guidelines? Email us at ', h('a', { href: 'mailto:support@investmtg.com' }, 'support@investmtg.com'), '.')
    )
  );
}
