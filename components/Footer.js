/* Footer.js */
import React from 'react';
var h = React.createElement;

export function Footer() {
  return h('footer', { className: 'site-footer' },
    h('div', { className: 'footer-inner' },
      h('p', { className: 'footer-guam' }, '🏝️ Made in Guam'),
      h('div', { className: 'footer-links' },
        h('a', { href: '#search' }, 'Search Cards'),
        h('a', { href: '#portfolio' }, 'Portfolio'),
        h('a', { href: '#store' }, 'Local Stores'),
        h('a', { href: '#cart' }, 'Cart')
      ),
      h('p', { className: 'footer-credit' },
        'Price data via ', h('a', { href: 'https://scryfall.com', target: '_blank', rel: 'noopener' }, 'Scryfall'),
        '. investMTG is not affiliated with Wizards of the Coast.',
        h('br', null),
        'Built with ', h('a', { href: 'https://www.perplexity.ai/computer', target: '_blank', rel: 'noopener' }, 'Perplexity Computer'), '.'
      )
    )
  );
}
