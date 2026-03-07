/* Footer.js */
import React from 'react';
var h = React.createElement;

export function Footer() {
  return h('footer', { className: 'site-footer', role: 'contentinfo' },
    h('div', { className: 'footer-inner' },
      h('p', { className: 'footer-guam' }, '\ud83c\udfe0\ufe0f Made in Guam'),
      h('div', { className: 'footer-links' },
        h('a', { href: '#search' }, 'Search Cards'),
        h('a', { href: '#portfolio' }, 'Portfolio'),
        h('a', { href: '#store' }, 'Local Stores'),
        h('a', { href: '#cart' }, 'Cart')
      ),
      h('div', { className: 'footer-legal-links' },
        h('a', { href: '#privacy' }, 'Privacy Policy'),
        h('a', { href: '#terms' }, 'Terms of Service'),
        h('a', { href: 'https://github.com/imvestMTG/investmtg/blob/main/SOUL.md', target: '_blank', rel: 'noopener' }, 'Data Integrity Policy')
      ),
      h('p', { className: 'footer-credit' },
        'Prices via ', h('a', { href: 'https://scryfall.com', target: '_blank', rel: 'noopener' }, 'Scryfall'),
        ' & ', h('a', { href: 'https://justtcg.com', target: '_blank', rel: 'noopener' }, 'JustTCG'),
        '. Meta data from ', h('a', { href: 'https://edhtop16.com', target: '_blank', rel: 'noopener' }, 'EDH Top 16'),
        ' & ', h('a', { href: 'https://topdeck.gg', target: '_blank', rel: 'noopener' }, 'TopDeck.gg'),
        '. Decklists via ', h('a', { href: 'https://www.moxfield.com', target: '_blank', rel: 'noopener' }, 'Moxfield'), '.',
        h('br', null),
        'Built with ', h('a', { href: 'https://www.perplexity.ai/computer', target: '_blank', rel: 'noopener' }, 'Perplexity Computer'), '.'
      ),
      h('p', { className: 'footer-wotc-disclaimer' },
        'investMTG is unofficial Fan Content permitted under the ',
        h('a', { href: 'https://company.wizards.com/en/legal/fancontentpolicy', target: '_blank', rel: 'noopener' }, 'Fan Content Policy'),
        '. Not approved/endorsed by Wizards. Portions of the materials used are property of Wizards of the Coast. \u00a9Wizards of the Coast LLC.'
      )
    )
  );
}
