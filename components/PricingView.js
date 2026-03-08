/* PricingView.js — Pricing Transparency & Data Sources page */
import React from 'react';
var h = React.createElement;

var linkStyle = { color: 'var(--color-primary)', textDecoration: 'underline' };

function ExtLink(props) {
  return h('a', {
    href: props.href,
    target: '_blank',
    rel: 'noopener noreferrer',
    style: linkStyle
  }, props.children);
}

export function PricingView() {
  React.useEffect(function() { window.scrollTo(0, 0); }, []);

  return h('div', { className: 'container legal-page' },
    h('h1', { className: 'page-heading' }, 'Pricing & Data Sources'),
    h('p', { className: 'legal-updated' }, 'Last updated: March 9, 2026'),

    h('p', { style: { marginBottom: 'var(--space-4)', lineHeight: '1.7' } },
      'investMTG is committed to pricing transparency. We do not fabricate prices, invent market activity, or manipulate data. Every number you see on this site comes from a real, verifiable source. This page explains exactly where our data comes from, how often it updates, and what it does and does not represent.'
    ),

    /* ── Card Data & Images ── */
    h('section', { className: 'legal-section' },
      h('h2', null, 'Card Data & Images'),
      h('p', null,
        'All card names, set information, rules text, images, and catalog data come from ',
        h(ExtLink, { href: 'https://scryfall.com' }, 'Scryfall'),
        ', a free and comprehensive Magic: The Gathering card database. Scryfall is not operated by or affiliated with Wizards of the Coast.'
      ),
      h('p', null, 'Card images are served directly from Scryfall\u2019s image CDN. We do not host, modify, or watermark card images.'),
      h('ul', null,
        h('li', null, 'Source: Scryfall REST API (scryfall.com/docs/api)'),
        h('li', null, 'Data type: Card names, sets, types, mana costs, oracle text, legalities, collector numbers, images'),
        h('li', null, 'Update frequency: Updated daily by Scryfall')
      )
    ),

    /* ── Reference Prices ── */
    h('section', { className: 'legal-section' },
      h('h2', null, 'Reference Prices (Card Detail, Search, Portfolio)'),
      h('p', null,
        'The prices displayed on card detail pages, search results, the portfolio tracker, the price ticker, and the market movers page come from ',
        h(ExtLink, { href: 'https://scryfall.com' }, 'Scryfall'),
        '\u2019s pricing data. Scryfall aggregates pricing from its affiliate partners and shows the lowest available price for each currency.'
      ),
      h('ul', null,
        h('li', null, 'Source: Scryfall price fields (prices.usd, prices.usd_foil)'),
        h('li', null, 'What the price represents: The lowest available market price from Scryfall\u2019s affiliate network'),
        h('li', null, 'Update frequency: Scryfall updates prices once every 24 hours'),
        h('li', null, 'Currency: USD only'),
        h('li', null, h('strong', null, 'Important: '), 'These are Near Mint (NM) reference prices. They do not reflect condition discounts, shipping costs, or local market premiums.')
      )
    ),

    /* ── Condition-Specific Pricing ── */
    h('section', { className: 'legal-section' },
      h('h2', null, 'Condition-Specific Pricing (Listing Modal)'),
      h('p', null,
        'When you create a listing and select a card condition (Near Mint, Lightly Played, Moderately Played, or Heavily Played), the suggested price comes from the ',
        h(ExtLink, { href: 'https://justtcg.com' }, 'JustTCG'),
        ' pricing API. JustTCG provides real-time, condition-specific pricing data for trading card games.'
      ),
      h('ul', null,
        h('li', null, 'Source: JustTCG REST API (api.justtcg.com)'),
        h('li', null,
          'Underlying data: JustTCG aggregates seller listing data from ',
          h(ExtLink, { href: 'https://www.tcgplayer.com' }, 'TCGplayer'),
          ', the largest North American TCG marketplace'
        ),
        h('li', null, 'What the price represents: The lowest available listing price on TCGplayer for each condition and printing'),
        h('li', null, 'Update frequency: JustTCG syncs prices approximately every 6 hours'),
        h('li', null, 'Conditions supported: Near Mint (NM), Lightly Played (LP), Moderately Played (MP), Heavily Played (HP)'),
        h('li', null, h('strong', null, 'Important: '), 'Suggested prices are not binding. You are always free to set any asking price you choose. These are market reference values to help you price competitively.')
      )
    ),

    /* ── External Purchase Links ── */
    h('section', { className: 'legal-section' },
      h('h2', null, 'External Purchase Links'),
      h('p', null,
        'Card detail pages may include a link to purchase the card on ',
        h(ExtLink, { href: 'https://www.tcgplayer.com' }, 'TCGplayer'),
        '. These links are provided by Scryfall\u2019s purchase URI data and may include affiliate parameters. investMTG does not currently participate in any affiliate programs.'
      )
    ),

    /* ── Tournament & Meta Data ── */
    h('section', { className: 'legal-section' },
      h('h2', null, 'Tournament & Meta Data'),
      h('p', null, 'Tournament results and metagame data come from the following community-maintained sources:'),
      h('ul', null,
        h('li', null,
          h(ExtLink, { href: 'https://edhtop16.com' }, 'EDH Top 16'),
          ' \u2014 Commander tournament results and top-performing decks'
        ),
        h('li', null,
          h(ExtLink, { href: 'https://topdeck.gg' }, 'TopDeck.gg'),
          ' \u2014 Tournament event data and standings'
        ),
        h('li', null,
          h(ExtLink, { href: 'https://www.moxfield.com' }, 'Moxfield'),
          ' \u2014 Decklist imports and deck composition data'
        )
      ),
      h('p', null, 'These are community resources, not official Wizards of the Coast data.')
    ),

    /* ── How Data Flows ── */
    h('section', { className: 'legal-section' },
      h('h2', null, 'How Data Flows Through investMTG'),
      h('p', null, 'For transparency, here is the technical path your data requests take:'),
      h('ol', null,
        h('li', null, 'Your browser requests data from our Cloudflare Worker backend (api.investmtg.com).'),
        h('li', null, 'The Worker fetches from the appropriate upstream API (Scryfall, JustTCG, etc.) using server-stored API keys. No API keys are ever sent to your browser.'),
        h('li', null, 'Some responses are cached briefly (5\u201360 minutes) in Cloudflare KV to reduce load on upstream services and improve page speed.'),
        h('li', null, 'The response is returned to your browser with no price manipulation, rounding, or markup applied. What the source reports is what you see.')
      )
    ),

    /* ── What We Don't Do ── */
    h('section', { className: 'legal-section' },
      h('h2', null, 'What We Don\u2019t Do'),
      h('p', null, 'In line with our ', h('a', { href: 'https://github.com/imvestMTG/investmtg/blob/main/SOUL.md', target: '_blank', rel: 'noopener noreferrer', style: linkStyle }, 'Data Integrity Policy'), ':'),
      h('ul', null,
        h('li', null, 'We do not fabricate or simulate price data'),
        h('li', null, 'We do not generate fake price history or trend lines'),
        h('li', null, 'We do not create artificial seller activity or fake listings'),
        h('li', null, 'We do not invent liquidity signals to make the market appear more active than it is'),
        h('li', null, 'We do not apply hidden markups, fees, or adjustments to any price displayed'),
        h('li', null, 'We do not cache prices longer than 60 minutes to avoid showing stale data'),
        h('li', null, 'If a data source is unavailable, we show nothing rather than fabricating a fallback')
      )
    ),

    /* ── Limitations ── */
    h('section', { className: 'legal-section' },
      h('h2', null, 'Limitations & Disclaimers'),
      h('ul', null,
        h('li', null, 'All prices are estimates based on publicly available market data. They are not appraisals and do not guarantee a sale at any price.'),
        h('li', null, 'Prices reflect the broader North American TCGplayer market, which may not match Guam\u2019s local supply and demand. Island logistics, shipping costs, and local scarcity can significantly affect what cards actually sell for here.'),
        h('li', null, 'Scryfall prices update daily. Intraday price movements (spikes, buyouts, reprints) may not be reflected immediately.'),
        h('li', null, 'JustTCG condition prices update approximately every 6 hours. Short-term fluctuations within that window are not captured.'),
        h('li', null, 'investMTG is not a financial advisor. Buying, selling, or holding cards based on prices shown here is done at your own risk.'),
        h('li', null, 'We are not affiliated with, endorsed by, or sponsored by Scryfall, JustTCG, TCGplayer, or Wizards of the Coast.')
      )
    ),

    /* ── Questions ── */
    h('section', { className: 'legal-section' },
      h('h2', null, 'Questions?'),
      h('p', null,
        'If you have questions about our pricing methodology or data sources, you can review our full ',
        h('a', { href: 'https://github.com/imvestMTG/investmtg/blob/main/SOUL.md', target: '_blank', rel: 'noopener noreferrer', style: linkStyle }, 'Data Integrity Policy (SOUL.md)'),
        ' on GitHub. The codebase is public and the data pipeline is fully auditable.'
      )
    )
  );
}
