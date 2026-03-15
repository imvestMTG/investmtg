/* PrivacyPolicyView.js — Privacy Policy page */
import React from 'react';
var h = React.createElement;

export function PrivacyPolicyView() {
  React.useEffect(function() { window.scrollTo(0, 0); }, []);

  return h('div', { className: 'container legal-page' },
    h('h1', { className: 'page-heading' }, 'Privacy Policy'),
    h('p', { className: 'legal-updated' }, 'Last updated: March 15, 2026'),

    h('section', { className: 'legal-section' },
      h('h2', null, 'Overview'),
      h('p', null, 'investMTG ("we", "us", "our") is a local Magic: The Gathering marketplace serving the Guam community at www.investmtg.com. We are committed to protecting your privacy. This policy explains what information we collect, how we use it, and your rights regarding your data.')
    ),

    h('section', { className: 'legal-section' },
      h('h2', null, 'Information We Collect'),
      h('h3', null, 'Account Information (via Google Sign-In)'),
      h('p', null, 'When you sign in with Google, we receive and store your Google account name, email address, and profile picture URL. This information is stored in our server-side database (Cloudflare D1) and is used to identify your account, associate your listings and orders, and display your name as a seller.'),
      h('p', null, 'We do not receive or store your Google password. Authentication is handled entirely through Google\u2019s OAuth 2.0 flow.'),
      h('h3', null, 'Information You Provide'),
      h('ul', null,
        h('li', null, 'Seller registration: seller name, contact method, optional store affiliation, and bio when you register to sell'),
        h('li', null, 'Marketplace listings: card details, pricing, condition (NM, LP, MP, HP, or DMG), and notes for items you list for sale or trade'),
        h('li', null, 'Checkout information: name, email address, and phone number when you place an order'),
        h('li', null, 'Cart and portfolio data: synced to your server-side account when signed in')
      ),
      h('h3', null, 'Information Stored Locally'),
      h('ul', null,
        h('li', null, 'Watchlist selections (stored in your browser\u2019s localStorage)'),
        h('li', null, 'Theme preference (dark/light mode)'),
        h('li', null, 'Cookie consent and Terms of Service acceptance status'),
        h('li', null, 'Authentication token for maintaining your signed-in session')
      ),
      h('h3', null, 'Information We Do NOT Collect'),
      h('ul', null,
        h('li', null, 'We do not use analytics or tracking scripts'),
        h('li', null, 'We do not set advertising or marketing cookies'),
        h('li', null, 'We do not collect payment card numbers \u2014 all payment processing is handled by SumUp (see below)'),
        h('li', null, 'We do not track browsing behavior or create behavioral profiles')
      )
    ),

    h('section', { className: 'legal-section' },
      h('h2', null, 'How Your Data Is Stored'),
      h('h3', null, 'Server-Side Storage'),
      h('p', null, 'investMTG uses a Cloudflare Worker backend with a D1 database to store user accounts, seller profiles, marketplace listings, orders, cart data, and portfolio data. This data is stored securely on Cloudflare\u2019s infrastructure and is associated with your Google account.'),
      h('p', null, 'Server-side data includes:'),
      h('ul', null,
        h('li', null, 'Your user account (name, email, profile picture from Google)'),
        h('li', null, 'Authentication sessions'),
        h('li', null, 'Seller profile and listings'),
        h('li', null, 'Orders you\u2019ve placed or received'),
        h('li', null, 'Cart and portfolio items (when signed in)')
      ),
      h('h3', null, 'Client-Side Storage'),
      h('p', null, 'Some data is stored in your browser\u2019s localStorage for convenience:'),
      h('ul', null,
        h('li', null, 'Watchlist, theme preference, and consent flags'),
        h('li', null, 'An authentication token to keep you signed in'),
        h('li', null, 'Fallback cart and portfolio data (used when offline or signed out)')
      ),
      h('p', null, 'If you clear your browser data, locally stored information is permanently deleted, but your server-side account data remains accessible when you sign in again.')
    ),

    h('section', { className: 'legal-section' },
      h('h2', null, 'How We Use Your Information'),
      h('p', null, 'We use the information we collect to:'),
      h('ul', null,
        h('li', null, 'Provide and maintain the marketplace service'),
        h('li', null, 'Authenticate your identity and manage your account'),
        h('li', null, 'Display your seller name and contact info to buyers'),
        h('li', null, 'Process and track orders'),
        h('li', null, 'Display real-time card pricing from third-party APIs'),
        h('li', null, 'Improve the Site\u2019s functionality and user experience')
      ),
      h('p', null, 'We do not sell, rent, or share your personal information with third parties for marketing purposes.'),
      h('p', null, h('strong', null, 'Legal basis for processing: '), 'We process your personal information as necessary to perform our services (account creation, order processing, seller/buyer coordination), to protect our legitimate interests (security, fraud prevention, site improvement), and where you have given consent (cookie acceptance, Terms of Service agreement). We do not sell your personal information to third parties.')
    ),

    h('section', { className: 'legal-section' },
      h('h2', null, 'Third-Party Services'),
      h('p', null, 'investMTG uses the following third-party services that may process data:'),
      h('ul', null,
        h('li', null, h('strong', null, 'Google OAuth'), ' \u2014 Authenticates your identity when you sign in. We receive your name, email, and profile picture. See ', h('a', { href: 'https://policies.google.com/privacy', target: '_blank', rel: 'noopener' }, 'Google\u2019s Privacy Policy'), '.'),
        h('li', null, h('strong', null, 'SumUp'), ' \u2014 Processes card payments. When you pay by card, your payment details are sent directly to SumUp\u2019s secure, PCI-compliant servers. We never see or store your card number. See ', h('a', { href: 'https://www.sumup.com/en-us/privacy/', target: '_blank', rel: 'noopener' }, 'SumUp\u2019s Privacy Policy'), '.'),
        h('li', null, h('strong', null, 'Scryfall'), ' \u2014 Provides card data and images. API requests include card search queries but no personal information. See ', h('a', { href: 'https://scryfall.com/docs/privacy', target: '_blank', rel: 'noopener' }, 'Scryfall\u2019s Privacy Policy'), '.'),
        h('li', null, h('strong', null, 'JustTCG'), ' \u2014 Provides condition-specific pricing for NM, LP, MP, HP, and DMG conditions. API requests contain card identifiers but no personal data.'),
        h('li', null, h('strong', null, 'Cloudflare'), ' \u2014 Hosts our backend worker, database, and edge cache. Cloudflare may set security cookies to protect against malicious traffic. See ', h('a', { href: 'https://www.cloudflare.com/privacypolicy/', target: '_blank', rel: 'noopener' }, 'Cloudflare\u2019s Privacy Policy'), '.'),
        h('li', null, h('strong', null, 'FontShare'), ' \u2014 Provides web fonts. Font loading requests include standard HTTP headers.'),
        h('li', null, h('strong', null, 'GitHub Pages'), ' \u2014 Hosts the website. See ', h('a', { href: 'https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement', target: '_blank', rel: 'noopener' }, 'GitHub\u2019s Privacy Statement'), '.'),
        h('li', null, h('strong', null, 'PayPal'), ' \u2014 Processes payments via PayPal, Venmo, and Pay Later. When you choose PayPal at checkout, your name, email, and payment details are sent to PayPal\u2019s secure servers. We never see your PayPal password or full payment details. See ', h('a', { href: 'https://www.paypal.com/us/legalhub/privacy-full', target: '_blank', rel: 'noopener' }, 'PayPal\u2019s Privacy Policy'), '.'),
        h('li', null, h('strong', null, 'Resend'), ' \u2014 Sends order confirmation and payment confirmation emails on our behalf. Your name and email address are transmitted to Resend to deliver transactional messages. Resend does not use this information for marketing. See ', h('a', { href: 'https://resend.com/legal/privacy-policy', target: '_blank', rel: 'noopener' }, 'Resend\u2019s Privacy Policy'), '.'),
        h('li', null, h('strong', null, 'EchoMTG'), ' \u2014 Provides graded card pricing and set price movement data. API requests are routed through our backend and do not include personal information.'),
        h('li', null, h('strong', null, 'Sentry'), ' \u2014 Monitors frontend errors and performance to help us fix bugs quickly. Sentry may collect your IP address, browser type, and error stack traces. No personal account data is sent. See ', h('a', { href: 'https://sentry.io/privacy/', target: '_blank', rel: 'noopener' }, 'Sentry\u2019s Privacy Policy'), '.')
      )
    ),

    h('section', { className: 'legal-section' },
      h('h2', null, 'Cookies'),
      h('p', null, 'investMTG itself does not set cookies for tracking or advertising. However, third-party services may set essential cookies:'),
      h('table', { className: 'legal-table' },
        h('thead', null,
          h('tr', null,
            h('th', null, 'Service'),
            h('th', null, 'Purpose'),
            h('th', null, 'Type'),
            h('th', null, 'Duration')
          )
        ),
        h('tbody', null,
          h('tr', null,
            h('td', null, 'Cloudflare'),
            h('td', null, 'DDoS protection, bot detection'),
            h('td', null, 'Essential / Security'),
            h('td', null, 'Session')
          ),
          h('tr', null,
            h('td', null, 'SumUp'),
            h('td', null, 'Secure payment session'),
            h('td', null, 'Essential / Payment'),
            h('td', null, 'Session')
          ),
          h('tr', null,
            h('td', null, 'PayPal'),
            h('td', null, 'Payment session, fraud prevention'),
            h('td', null, 'Essential / Payment'),
            h('td', null, 'Session')
          )
        )
      ),
      h('p', null, 'investMTG stores authentication tokens, cart data, and preferences in your browser\u2019s localStorage (not cookies). This data is controlled entirely by your browser and can be cleared at any time.')
    ),

    h('section', { className: 'legal-section' },
      h('h2', null, 'Data Retention'),
      h('ul', null,
        h('li', null, h('strong', null, 'Account data'), ' (name, email, profile picture): Retained while your account is active. Deleted within 30 days of a verified deletion request.'),
        h('li', null, h('strong', null, 'Order records: '), 'Retained for 3 years from the order date for business and legal purposes, even after account deletion.'),
        h('li', null, h('strong', null, 'Authentication sessions: '), 'Automatically expired after 30 days of inactivity.'),
        h('li', null, h('strong', null, 'Seller listings: '), 'Deleted when a listing is removed or the seller account is deleted.'),
        h('li', null, h('strong', null, 'Locally stored data: '), 'Controlled entirely by your browser; cleared when you clear your browser data.'),
        h('li', null, h('strong', null, 'Cloudflare logs: '), 'Subject to Cloudflare\u2019s own retention policies. See ', h('a', { href: 'https://www.cloudflare.com/privacypolicy/', target: '_blank', rel: 'noopener' }, 'Cloudflare\u2019s Privacy Policy'), '.')
      )
    ),

    h('section', { className: 'legal-section' },
      h('h2', null, 'Your Rights'),
      h('p', null, 'You have the following rights regarding your data:'),
      h('ul', null,
        h('li', null, h('strong', null, 'Access your data: '), 'You can view your account information, listings, and orders through the Site.'),
        h('li', null, h('strong', null, 'Delete local data: '), 'Clear your browser\u2019s localStorage for www.investmtg.com, or use your browser\u2019s "Clear Site Data" function to remove locally stored data.'),
        h('li', null, h('strong', null, 'Delete your account: '), 'Contact us to request deletion of your server-side account and associated data.'),
        h('li', null, h('strong', null, 'Revoke Google access: '), 'You can revoke investMTG\u2019s access to your Google account at any time through your ', h('a', { href: 'https://myaccount.google.com/permissions', target: '_blank', rel: 'noopener' }, 'Google account settings'), '.'),
        h('li', null, h('strong', null, 'Export your data: '), 'Contact us if you need a copy of your data.'),
        h('li', null, h('strong', null, 'Correct your data: '), 'If any information we hold about you is inaccurate or incomplete, contact us and we will update it promptly.'),
        h('li', null, h('strong', null, 'Restrict processing: '), 'In certain circumstances, you may request that we limit how we use your data.'),
        h('li', null, h('strong', null, 'Object to processing: '), 'You may object to our processing of your data where we rely on legitimate interests.'),
        h('li', null, h('strong', null, 'Opt-out of data sale: '), 'investMTG does not sell, rent, or share your personal information with third parties for their marketing or commercial purposes. If this policy ever changes, we will notify you and provide a clear opt-out mechanism before any such sharing begins.')
      )
    ),

    h('section', { className: 'legal-section' },
      h('h2', null, 'Children\u2019s Privacy'),
      h('p', null, 'investMTG is not intended for users under the age of 13. We do not knowingly collect information from children under 13. If you believe a child under 13 has created an account, please contact us so we can address the concern.')
    ),

    h('section', { className: 'legal-section' },
      h('h2', null, 'Changes to This Policy'),
      h('p', null, 'We may update this privacy policy from time to time. Changes will be posted on this page with an updated "Last updated" date.')
    ),

    h('section', { className: 'legal-section' },
      h('h2', null, 'DMCA / Copyright Takedown'),
      h('p', null, 'investMTG respects intellectual property rights. If you believe content on this site infringes your copyright, please send a written notice to ', h('a', { href: 'mailto:bloodshutdawn@gmail.com' }, 'bloodshutdawn@gmail.com'), ' (subject: "DMCA Takedown") including:'),
      h('ol', null,
        h('li', null, 'Identification of the copyrighted work'),
        h('li', null, 'Identification of the allegedly infringing material and its location on the site'),
        h('li', null, 'Your contact information'),
        h('li', null, 'A statement of good faith belief that the use is not authorized'),
        h('li', null, 'A statement under penalty of perjury that the information is accurate and you are authorized to act on behalf of the copyright owner')
      ),
      h('p', null, 'Card images on this site are provided by the Scryfall API and are the property of Wizards of the Coast LLC.')
    ),

    h('section', { className: 'legal-section' },
      h('h2', null, 'Contact'),
      h('p', null, 'If you have questions about this privacy policy, contact us at: ', h('a', { href: 'mailto:bloodshutdawn@gmail.com' }, 'bloodshutdawn@gmail.com')),
      h('p', null, 'For privacy-related requests (access, deletion, correction), email us with the subject line "Privacy Request." We will acknowledge your request within 5 business days and respond substantively within 30 days.')
    )
  );
}
