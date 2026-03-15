# Compliance Fixes — v78 (March 15, 2026)

## Summary
Comprehensive compliance update across 7 files: Privacy Policy, Terms of Service, Cookie Notice, Checkout, Terms Gate, Service Worker, and CSS. All changes follow repo conventions (React.createElement, `var` only, `function` keyword only — no JSX, no let/const, no arrow functions).

---

## FILE 1: components/PrivacyPolicyView.js
- **1a.** Updated "Last updated" date from March 9, 2026 → March 15, 2026
- **1b.** Added "Legal Basis for Processing" paragraph after "How We Use Your Information" section
- **1c.** Added PayPal, Resend, and EchoMTG to Third-Party Services list (after GitHub Pages entry)
- **1d.** Replaced Cookies section with expanded version including a cookie table (Cloudflare, SumUp, PayPal) and localStorage disclosure
- **1e.** Replaced Data Retention section with specific timeframes (account data 30-day deletion, order records 3 years, auth sessions 30-day expiry, seller listings, local data, Cloudflare logs)
- **1f.** Added 4 additional rights to "Your Rights" section: Correct data, Restrict processing, Object to processing, Opt-out of data sale
- **1g.** Updated Contact section with privacy request response timeframe (5 business days acknowledge, 30 days substantive)
- **1h.** Added DMCA / Copyright Takedown section before Contact

## FILE 2: components/TermsView.js
- **2a.** Updated "Last updated" date from March 9, 2026 → March 15, 2026
- **2b.** Added under-13 handling paragraph to section 1 (Acceptance of Terms)
- **2c.** Replaced section 6 (Payments) to mention both SumUp and PayPal with links to both ToS/User Agreement
- **2d.** Added seller fee/chargeback terms (3 paragraphs) to section 7 (Seller Obligations)
- **2e.** Added aggregate liability cap ($100 or 12-month amount) to section 11
- **2f.** Replaced section 12 (Dispute Resolution) with expanded version including Buyer Protection for Online Payments, Reserve & Pay at Pickup dispute process
- **2g.** Added new section 13 (Refund and Return Policy), renumbered Modifications to 14, added new section 15 (Account Suspension and Termination), renumbered Contact to 16

## FILE 3: components/CookieNotice.js
- **3a.** Updated cookie notice text to list Cloudflare (security), SumUp (payment processing), and PayPal (payment processing) individually

## FILE 4: components/CheckoutView.js
- **4a.** Added dispute resolution notice div (`checkout-dispute-notice`) before the payment info section at step 4
- **4b.** Updated Step 3 subtitle to clarify email and contact detail sharing with seller

## FILE 5: components/TermsGate.js
- **5a.** Bumped TOS_VERSION from '2026-03-09' → '2026-03-15'

## FILE 6: sw.js
- **6a.** Bumped CACHE_NAME from 'investmtg-v77' → 'investmtg-v78'

## FILE 7: style.css
- **7a.** Added `.legal-table` styles (cookie table in Privacy Policy)
- **7b.** Added `.checkout-dispute-notice` styles (dispute notice in checkout)

---

## Verification
- All 4 JS component files pass Node.js module syntax check (no parse errors)
- No `let`, `const`, or `=>` violations found in any modified file
- All files use `var` and `function` keyword only per repo conventions
