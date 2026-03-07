/* PrivacyPolicyView.js — Privacy Policy page */
import React from 'react';
var h = React.createElement;

export function PrivacyPolicyView() {
  React.useEffect(function() { window.scrollTo(0, 0); }, []);

  return h('div', { className: 'container legal-page' },
    h('h1', { className: 'page-heading' }, 'Privacy Policy'),
    h('p', { className: 'legal-updated' }, 'Last updated: March 7, 2026'),

    h('section', { className: 'legal-section' },
      h('h2', null, 'Overview'),
      h('p', null, 'investMTG ("we", "us", "our") is a local Magic: The Gathering marketplace serving the Guam community at www.investmtg.com. We are committed to protecting your privacy. This policy explains what information we collect, how we use it, and your rights regarding your data.')
    ),

    h('section', { className: 'legal-section' },
      h('h2', null, 'Information We Collect'),
      h('h3', null, 'Information You Provide'),
      h('ul', null,
        h('li', null, 'Checkout information: name, email address, and phone number when you place an order'),
        h('li', null, 'Seller registration: seller name, contact method, and optional store affiliation when you register to sell'),
        h('li', null, 'Marketplace listings: card details, pricing, and condition for items you list for sale or trade')
      ),
      h('h3', null, 'Information Stored Automatically'),
      h('ul', null,
        h('li', null, 'Cart contents, portfolio holdings, and watchlist selections (stored in your browser\u2019s localStorage)'),
        h('li', null, 'Theme preference (dark/light mode)')
      ),
      h('h3', null, 'Information We Do NOT Collect'),
      h('ul', null,
        h('li', null, 'We do not use analytics or tracking scripts'),
        h('li', null, 'We do not set advertising or marketing cookies'),
        h('li', null, 'We do not collect payment card numbers \u2014 all payment processing is handled by SumUp (see below)'),
        h('li', null, 'We do not create user profiles or track browsing behavior')
      )
    ),

    h('section', { className: 'legal-section' },
      h('h2', null, 'How Your Data Is Stored'),
      h('p', null, 'investMTG is a static website with no backend server. All user data (cart, portfolio, orders, seller profiles) is stored exclusively in your browser\u2019s localStorage on your own device. This means:'),
      h('ul', null,
        h('li', null, 'Your data never leaves your device (except API calls for card prices and payment processing)'),
        h('li', null, 'If you clear your browser data, all stored information is permanently deleted'),
        h('li', null, 'We have no ability to access, retrieve, or recover data stored in your browser')
      )
    ),

    h('section', { className: 'legal-section' },
      h('h2', null, 'Third-Party Services'),
      h('p', null, 'investMTG uses the following third-party services that may process data:'),
      h('ul', null,
        h('li', null, h('strong', null, 'SumUp'), ' \u2014 Processes card payments. When you pay by card, your payment details are sent directly to SumUp\u2019s secure, PCI-compliant servers. We never see or store your card number. See ', h('a', { href: 'https://www.sumup.com/en-us/privacy/', target: '_blank', rel: 'noopener' }, 'SumUp\u2019s Privacy Policy'), '.'),
        h('li', null, h('strong', null, 'Scryfall'), ' \u2014 Provides card data and images. API requests include card search queries but no personal information. See ', h('a', { href: 'https://scryfall.com/docs/privacy', target: '_blank', rel: 'noopener' }, 'Scryfall\u2019s Privacy Policy'), '.'),
        h('li', null, h('strong', null, 'JustTCG'), ' \u2014 Provides condition-specific pricing. API requests contain card names but no personal data.'),
        h('li', null, h('strong', null, 'Cloudflare'), ' \u2014 Our CORS proxy and CDN provider. Cloudflare may set security cookies to protect against malicious traffic. See ', h('a', { href: 'https://www.cloudflare.com/privacypolicy/', target: '_blank', rel: 'noopener' }, 'Cloudflare\u2019s Privacy Policy'), '.'),
        h('li', null, h('strong', null, 'FontShare'), ' \u2014 Provides web fonts. Font loading requests include standard HTTP headers.'),
        h('li', null, h('strong', null, 'GitHub Pages'), ' \u2014 Hosts the website. See ', h('a', { href: 'https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement', target: '_blank', rel: 'noopener' }, 'GitHub\u2019s Privacy Statement'), '.')
      )
    ),

    h('section', { className: 'legal-section' },
      h('h2', null, 'Cookies'),
      h('p', null, 'investMTG itself does not set any cookies. However, third-party services (particularly Cloudflare and SumUp) may set essential security or functionality cookies when you visit the site or process a payment. These are not used for tracking or advertising.')
    ),

    h('section', { className: 'legal-section' },
      h('h2', null, 'Your Rights'),
      h('p', null, 'Because all your data is stored locally in your browser, you have full control:'),
      h('ul', null,
        h('li', null, h('strong', null, 'Delete your data: '), 'Clear your browser\u2019s localStorage for www.investmtg.com, or use your browser\u2019s "Clear Site Data" function.'),
        h('li', null, h('strong', null, 'Export your data: '), 'Your cart, portfolio, and order history are stored as JSON in localStorage and can be accessed via your browser\u2019s developer tools.'),
        h('li', null, h('strong', null, 'Opt out: '), 'Since we don\u2019t collect data on our servers, there is nothing to opt out of. You can stop using the site at any time.')
      )
    ),

    h('section', { className: 'legal-section' },
      h('h2', null, 'Children\u2019s Privacy'),
      h('p', null, 'investMTG is not intended for users under the age of 13. We do not knowingly collect information from children under 13. If you believe a child under 13 has provided information through our checkout process, please contact us so we can address the concern.')
    ),

    h('section', { className: 'legal-section' },
      h('h2', null, 'Changes to This Policy'),
      h('p', null, 'We may update this privacy policy from time to time. Changes will be posted on this page with an updated "Last updated" date.')
    ),

    h('section', { className: 'legal-section' },
      h('h2', null, 'Contact'),
      h('p', null, 'If you have questions about this privacy policy, contact us at: ', h('a', { href: 'mailto:bloodshutdawn@gmail.com' }, 'bloodshutdawn@gmail.com'))
    )
  );
}
