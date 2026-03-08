/* TermsView.js — Terms of Service page */
import React from 'react';
var h = React.createElement;

export function TermsView() {
  React.useEffect(function() { window.scrollTo(0, 0); }, []);

  return h('div', { className: 'container legal-page' },
    h('h1', { className: 'page-heading' }, 'Terms of Service'),
    h('p', { className: 'legal-updated' }, 'Last updated: March 9, 2026'),

    h('section', { className: 'legal-section' },
      h('h2', null, '1. Acceptance of Terms'),
      h('p', null, 'By accessing or using investMTG ("the Site"), located at www.investmtg.com, you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, do not use the Site. You must be at least 13 years of age to use this Site.'),
      h('p', null, 'By creating an account, listing cards for sale or trade, placing an order, or otherwise using the Site\u2019s features, you confirm that you have read, understood, and agree to these Terms as well as our ', h('a', { href: '#privacy' }, 'Privacy Policy'), '.')
    ),

    h('section', { className: 'legal-section' },
      h('h2', null, '2. Description of Service'),
      h('p', null, 'investMTG is a community marketplace platform that allows users in Guam to browse Magic: The Gathering card prices, list cards for sale or trade, and connect with local buyers and sellers. The Site displays real-time pricing data from third-party APIs (Scryfall, JustTCG) and provides tools for portfolio tracking, deck browsing, and cEDH metagame analysis.'),
      h('p', null, 'investMTG is a platform that connects buyers and sellers. investMTG is not itself a seller of trading cards and does not take possession of, hold, or guarantee any items listed on the marketplace.')
    ),

    h('section', { className: 'legal-section' },
      h('h2', null, '3. User Accounts'),
      h('p', null, 'investMTG uses Google OAuth 2.0 for user authentication. When you sign in with your Google account, we create a server-side user account stored in our database. Your account is used to associate your seller profile, listings, orders, and cart with your identity.'),
      h('p', null, 'You are responsible for maintaining the security of the Google account used to sign in. investMTG does not store your Google password. All authentication is handled through Google\u2019s secure OAuth flow.'),
      h('p', null, 'You agree not to create multiple accounts for the purpose of circumventing bans, suspensions, or marketplace rules.')
    ),

    h('section', { className: 'legal-section' },
      h('h2', null, '4. Marketplace Transactions'),
      h('h3', null, 'Buyer and Seller Responsibility'),
      h('p', null, 'All marketplace transactions are between the buyer and seller directly. investMTG facilitates the connection but is not a party to any transaction. Buyers and sellers are solely responsible for:'),
      h('ul', null,
        h('li', null, 'The accuracy of listing descriptions, including card condition, name, and price'),
        h('li', null, 'Completing the transaction (payment, pickup, or shipping)'),
        h('li', null, 'Resolving any disputes between themselves'),
        h('li', null, 'Complying with all applicable local, territorial, and federal laws')
      ),
      h('h3', null, 'Card Conditions'),
      h('p', null, 'investMTG supports five standard card conditions for marketplace listings: Near Mint (NM), Lightly Played (LP), Moderately Played (MP), Heavily Played (HP), and Damaged (DMG). Sellers are responsible for accurately grading their cards according to these conditions. Buyers should examine cards at pickup or upon delivery.'),
      h('h3', null, 'No Warranty on Listings'),
      h('p', null, 'investMTG does not verify, authenticate, or guarantee the quality, safety, legality, or accuracy of any marketplace listing. Card conditions, prices, and descriptions are provided by individual sellers and may not reflect actual market values.'),
      h('h3', null, 'Reserve & Pay at Pickup'),
      h('p', null, 'The "Reserve & Pay at Pickup" option creates a reservation, not a binding purchase. The seller is notified of the reservation, but the transaction is only complete when payment is exchanged in person. Either party may cancel a reservation before pickup.')
    ),

    h('section', { className: 'legal-section' },
      h('h2', null, '5. Pricing and Data Sources'),
      h('p', null, 'All prices displayed on the Site are in US Dollars (USD). Market prices shown on card detail pages are sourced from Scryfall and reflect approximate market values \u2014 they are not offers to sell at those prices.'),
      h('p', null, 'Condition-specific suggested prices are sourced from JustTCG, which aggregates real-time seller data from TCGplayer. These suggested prices are provided as reference only \u2014 sellers always set their own asking price. For full details on how pricing works, see our ', h('a', { href: '#pricing' }, 'Pricing & Data Sources'), ' page.'),
      h('p', null, 'Sellers are responsible for their own tax obligations under Guam law. investMTG does not collect or remit taxes on behalf of sellers or buyers.')
    ),

    h('section', { className: 'legal-section' },
      h('h2', null, '6. Payments'),
      h('p', null, 'Online payments are processed by SumUp, a PCI-compliant payment processor. investMTG never sees, stores, or processes your payment card information. By using the payment feature, you also agree to ', h('a', { href: 'https://www.sumup.com/en-us/terms/', target: '_blank', rel: 'noopener' }, 'SumUp\u2019s Terms of Service'), '.'),
      h('p', null, 'For in-person transactions (Reserve & Pay at Pickup), payment terms are between the buyer and seller.')
    ),

    h('section', { className: 'legal-section' },
      h('h2', null, '7. Seller Obligations'),
      h('p', null, 'By registering as a seller on investMTG, you agree to:'),
      h('ul', null,
        h('li', null, 'Provide accurate descriptions of your cards, including condition (NM, LP, MP, HP, or DMG) and set'),
        h('li', null, 'Honor your listed prices unless the listing is updated or removed before a reservation'),
        h('li', null, 'Respond to buyer inquiries in a timely manner'),
        h('li', null, 'Comply with all applicable Guam business and tax laws'),
        h('li', null, 'Not list counterfeit, proxy, or stolen cards')
      )
    ),

    h('section', { className: 'legal-section' },
      h('h2', null, '8. Prohibited Conduct'),
      h('p', null, 'You agree not to:'),
      h('ul', null,
        h('li', null, 'List counterfeit, proxy, or stolen Magic: The Gathering cards'),
        h('li', null, 'Misrepresent card conditions, editions, or authenticity'),
        h('li', null, 'Manipulate prices or create fraudulent listings'),
        h('li', null, 'Harass, threaten, or defraud other users'),
        h('li', null, 'Use the Site for any illegal purpose'),
        h('li', null, 'Attempt to circumvent, disable, or interfere with the Site\u2019s functionality'),
        h('li', null, 'Use automated tools to access the Site in a manner that exceeds reasonable use'),
        h('li', null, 'Create multiple accounts to evade bans or marketplace restrictions')
      )
    ),

    h('section', { className: 'legal-section' },
      h('h2', null, '9. Intellectual Property'),
      h('p', null, 'Magic: The Gathering, all card names, card images, mana symbols, and related content are trademarks and copyrights of Wizards of the Coast LLC. investMTG is unofficial Fan Content permitted under the Fan Content Policy. Not approved/endorsed by Wizards. Portions of the materials used are property of Wizards of the Coast. \u00a9Wizards of the Coast LLC.'),
      h('p', null, 'Card data and images displayed on this Site are provided by Scryfall under their API terms of use. Price data is provided by Scryfall and JustTCG.'),
      h('p', null, 'The investMTG name, logo, and site design are the property of investMTG.')
    ),

    h('section', { className: 'legal-section' },
      h('h2', null, '10. Disclaimer of Warranties'),
      h('p', null, 'THE SITE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED. WE DO NOT WARRANT THAT THE SITE WILL BE UNINTERRUPTED, ERROR-FREE, OR SECURE. WE DO NOT WARRANT THE ACCURACY, COMPLETENESS, OR RELIABILITY OF ANY PRICING DATA, CARD INFORMATION, OR USER-SUBMITTED CONTENT.'),
      h('p', null, 'Price data is sourced from third-party APIs and may be delayed, inaccurate, or unavailable. investMTG is not responsible for pricing errors from third-party data providers.')
    ),

    h('section', { className: 'legal-section' },
      h('h2', null, '11. Limitation of Liability'),
      h('p', null, 'TO THE MAXIMUM EXTENT PERMITTED BY LAW, INVESTMTG AND ITS OPERATORS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING FROM YOUR USE OF THE SITE, INCLUDING BUT NOT LIMITED TO LOSSES FROM MARKETPLACE TRANSACTIONS, PRICING INACCURACIES, OR SERVICE INTERRUPTIONS.')
    ),

    h('section', { className: 'legal-section' },
      h('h2', null, '12. Dispute Resolution'),
      h('p', null, 'Disputes between buyers and sellers should be resolved directly between the parties. investMTG may, but is not obligated to, assist in dispute resolution.'),
      h('p', null, 'Any disputes with investMTG itself shall be governed by the laws of the Territory of Guam, United States.')
    ),

    h('section', { className: 'legal-section' },
      h('h2', null, '13. Modifications'),
      h('p', null, 'We reserve the right to modify these Terms at any time. Changes will be posted on this page with an updated "Last updated" date. Continued use of the Site after changes constitutes acceptance of the revised Terms.')
    ),

    h('section', { className: 'legal-section' },
      h('h2', null, '14. Contact'),
      h('p', null, 'For questions about these Terms, contact us at: ', h('a', { href: 'mailto:bloodshutdawn@gmail.com' }, 'bloodshutdawn@gmail.com'))
    )
  );
}
