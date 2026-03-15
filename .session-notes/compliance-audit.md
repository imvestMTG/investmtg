# investMTG — Compliance Audit Report

**Audit Date:** March 15, 2026  
**Auditor:** Compliance Review (Perplexity Computer)  
**Scope:** Legal and privacy compliance posture of investmtg.com  
**Files Reviewed:** `TermsView.js`, `PrivacyPolicyView.js`, `CookieNotice.js`, `TermsGate.js`, `CheckoutView.js`, `SOUL.md`  
**Operator Context:** Sole proprietor, Guam-based, free community MTG marketplace, Google OAuth login, PayPal + SumUp payments, Cloudflare/GitHub Pages infrastructure

---

## Executive Summary

| Area | Status | Summary |
|------|--------|---------|
| A. GDPR/CCPA Privacy Policy | 🟡 Yellow | Strong foundation; missing lawful basis, rectification right, opt-out-of-sale language, and several undisclosed third-party processors |
| B. Terms of Service | 🟢 Green | Covers most required bases; minor gaps in ToS change notification and explicit account termination provision |
| C. Missing Policies | 🔴 Red | No refund/return policy, no standalone seller agreement, no DMCA notice, no ADA/accessibility statement |
| D. Cookie Notice | 🟡 Yellow | Present and functional; but is dismiss-only (no opt-in mechanism), doesn't list cookie categories or names, and loads after the page (not before cookies are set) |
| E. Checkout / Order Flow | 🟢 Green | Pricing visible, ToS consent gated at step 3, order confirmation rendered; minor gap: no explicit refund/cancellation language at point of payment |

**Overall Risk Level:** Medium. No single catastrophic gap, but the combination of missing policies (refund, DMCA), an undisclosed transactional email processor (Resend), and a cookie notice that is informational rather than consent-blocking creates meaningful exposure under US federal consumer protection standards (FTC Act § 5) and Guam's data breach statute.

---

## A. GDPR/CCPA Gap Analysis

### Regulatory Framework Applicable to investMTG

Guam is a US territory. There is no Guam-specific comprehensive privacy law. The applicable frameworks are:

- **US Federal:** FTC Act § 5 (unfair or deceptive practices), COPPA (users under 13), Guam Code Ann. § 9 Ch. 48 (data breach notification)
- **CCPA/CPRA:** Does not technically apply — investMTG almost certainly does not meet the California thresholds (≥$25M annual revenue, OR ≥100,000 CA residents' data, OR ≥50% revenue from selling CA residents' data). However, if any California residents use the site (possible even for a Guam marketplace), CCPA best practices are strongly recommended and the cost of adoption is low.
- **GDPR:** Does not directly apply unless investMTG intentionally targets EU users. Not applicable here.
- **Best practice standard:** US state privacy laws (CCPA/CPRA model) serve as the practical benchmark for a well-drafted privacy policy for a US-territory operator.

---

### A1. Lawful Basis for Processing

| Check | Finding | Status |
|-------|---------|--------|
| Lawful basis stated? | Not stated. The policy describes *what* is collected and *how* it is used, but never identifies the legal ground (e.g., contract performance, legitimate interest, consent). | 🔴 Gap |

**Why this matters:** Under FTC Act § 5, processing personal data in ways users don't expect is an "unfair or deceptive" practice. While US law doesn't mandate citing a formal "lawful basis" like GDPR, the practice of plainly stating *why* data is processed (contract performance vs. legitimate interest vs. consent) is considered a privacy best practice and improves consumer trust.

**Recommended fix:**  
Add to the "How We Use Your Information" section:

> **Legal basis for processing:** We process your personal information as necessary to perform our services (account creation, order processing, seller/buyer coordination), to protect our legitimate interests (security, fraud prevention, site improvement), and where you have given consent (cookie acceptance, Terms of Service agreement). We do not sell your personal information to third parties.

---

### A2. Data Subject Rights

| Right | Status in Policy | Gap |
|-------|-----------------|-----|
| Access | ✅ Mentioned ("You can view your account information") | Partial — in-app only, no formal request process |
| Rectification (Correction) | ❌ Not mentioned | Missing |
| Erasure (Deletion) | ✅ "Contact us to request deletion" | Present |
| Data Portability | ✅ "Contact us if you need a copy of your data" | Present but vague |
| Restriction of Processing | ❌ Not mentioned | Missing |
| Objection to Processing | ❌ Not mentioned | Missing |
| Opt-out of Data Sale (CCPA) | ❌ Not mentioned | Missing |

**Status:** 🟡 Yellow — Core rights partially present; rectification and opt-out of sale are the most significant omissions.

**Priority:** Medium (these omissions do not violate current US federal law for a Guam operator of this scale, but are strongly recommended practice)

**Recommended fix — add to "Your Rights" section:**

> - **Correct your data:** If any information we hold about you is inaccurate or incomplete, contact us and we will update it promptly.  
> - **Restrict processing:** In certain circumstances, you may request that we limit how we use your data (for example, while you contest its accuracy).  
> - **Object to processing:** You may object to our processing of your data where we rely on legitimate interests.  
> - **Opt-out of data sale:** investMTG does not sell, rent, or share your personal information with third parties for their marketing or commercial purposes. If this policy ever changes, we will notify you and provide a clear opt-out mechanism before any such sharing begins.  
> - **How to exercise your rights:** Email bloodshutdawn@gmail.com with the subject line "Privacy Request." We will respond within 30 days.

---

### A3. Data Retention Periods

| Check | Finding | Status |
|-------|---------|--------|
| Retention periods specified? | Vague. "We retain your account data for as long as your account is active." No specific timeframes for orders, sessions, or logs. | 🟡 Partial |

**Status:** 🟡 Yellow

**Recommended fix — replace the current Data Retention section with:**

> **Data Retention:**  
> - **Account data** (name, email, profile picture): Retained while your account is active. Deleted within 30 days of a verified deletion request.  
> - **Order records:** Retained for 3 years from the order date for business and legal purposes, even after account deletion.  
> - **Authentication sessions:** Automatically expired after 30 days of inactivity; purged daily by an automated cleanup job.  
> - **Seller listings:** Deleted when a listing is removed or the seller account is deleted.  
> - **Locally stored data (localStorage):** Controlled entirely by your browser; cleared when you clear your browser data.  
> - **Cloudflare logs:** Subject to Cloudflare's own retention policies. See [Cloudflare's Privacy Policy](https://www.cloudflare.com/privacypolicy/).

---

### A4. Third-Party Data Sharing Disclosure

| Processor | Disclosed in Privacy Policy | Notes |
|-----------|---------------------------|-------|
| Google OAuth | ✅ Yes | With link |
| SumUp | ✅ Yes | With link |
| Scryfall | ✅ Yes | With link |
| JustTCG | ✅ Yes | No link to JustTCG privacy policy |
| Cloudflare | ✅ Yes | With link |
| FontShare | ✅ Yes | No link to FontShare privacy policy |
| GitHub Pages | ✅ Yes | With link |
| PayPal | ❌ **MISSING** | PayPal is a payment processor that receives buyer name, email, and payment data — it must be disclosed |
| Resend | ❌ **MISSING** | Resend receives buyer/seller email addresses and order data for transactional emails (per SOUL.md v61) |
| EchoMTG | ❌ **MISSING** | EchoMTG API is called for card data (proxied by Worker, but data flows occur) |
| TopDeck.gg / EDH Top 16 | ❌ **MISSING** | Backend API integrations (meta/tournament data); low personal data risk but should be noted |
| MTGStocks | ❌ **MISSING** | Backend API integration; low personal data risk |

**Status:** 🔴 Red for PayPal and Resend — these processors handle personal data and must be disclosed.

**Priority:** Critical for PayPal; High for Resend.

**Recommended fix — add to "Third-Party Services" section:**

```
• PayPal — Processes payments via PayPal, Venmo, and Pay Later. When you choose PayPal at checkout,
  your name, email, and payment details are sent to PayPal's secure servers. We never see your 
  PayPal password or full payment details. See PayPal's Privacy Policy at 
  https://www.paypal.com/us/legalhub/privacy-full.

• Resend — Sends order confirmation and payment confirmation emails on our behalf. Your name and 
  email address are transmitted to Resend's servers to deliver transactional messages. Resend does 
  not use this information for marketing. See Resend's Privacy Policy at 
  https://resend.com/legal/privacy-policy.

• EchoMTG — Provides graded card (PSA/BGS) pricing and set price movement data. API requests are
  routed through our backend and do not include personal information.
```

---

### A5. Cookie Consent Mechanism

See Section D below for full analysis.

---

### A6. Contact Info for Privacy Requests

| Check | Finding | Status |
|-------|---------|--------|
| Contact email present? | ✅ bloodshutdawn@gmail.com | Present |
| Response timeframe stated? | ❌ Not stated | Missing |
| Subject line guidance? | ❌ Not stated | Missing |

**Status:** 🟡 Yellow — Contact info present, but no service commitment around response time.

**Recommended fix:** Add to the Contact section: "For privacy-related requests (access, deletion, correction), email us at bloodshutdawn@gmail.com with the subject line 'Privacy Request.' We will acknowledge your request within 5 business days and respond substantively within 30 days."

---

### A7. Children's Privacy / COPPA

| Check | Finding | Status |
|-------|---------|--------|
| Age minimum stated? | ✅ 13 in ToS; children's privacy section in privacy policy | Present |
| COPPA-aligned? | ✅ General audience site, not directed at children, 13+ age gate in ToS | Compliant |
| COPPA parental consent process? | Not required for general audience sites with knowledge-based screening | N/A |

**Status:** 🟢 Green — The 13-year minimum is COPPA-aligned. The ToS clearly states the age requirement and the Privacy Policy has a children's privacy section.

**Note:** investMTG uses Google OAuth, which requires the user to have a Google account (Google requires users to be 13+). This provides a natural age gate layer.

---

## B. Terms of Service Review

### B1. User Eligibility / Age Requirement
**Status:** 🟢 Green  
ToS § 1 states: "You must be at least 13 years of age to use this Site." This is COPPA-aligned.

**Minor gap:** No explicit process for handling users discovered to be under 13 (e.g., account termination, data deletion). Recommend adding: "If we discover that a user is under 13, we will terminate their account and delete associated data without notice."

---

### B2. Marketplace Disclaimer (investMTG Not a Party to Transactions)
**Status:** 🟢 Green  
ToS §§ 2 and 4 clearly state investMTG "is not a party to any transaction" and that "Buyers and sellers are solely responsible for... completing the transaction." This is strong and clearly worded.

---

### B3. Limitation of Liability
**Status:** 🟢 Green  
ToS § 11 provides a limitation of liability in all-caps as is conventional, covering indirect, incidental, special, consequential, and punitive damages. Properly scoped.

**Minor gap:** No aggregate liability cap (e.g., "in no event shall investMTG's total liability exceed $100 or the amount you paid to investMTG in the 12 months preceding the claim"). For a free platform that collects no fees, this is low risk but worth adding for completeness.

---

### B4. Dispute Resolution — Buyer/Seller
**Status:** 🟡 Yellow  
ToS § 12 states: "Disputes between buyers and sellers should be resolved directly between the parties. investMTG may, but is not obligated to, assist in dispute resolution." This is minimal but technically adequate for a small community marketplace.

**Gap:** No process is described for what a buyer should do if a seller fails to honor a reservation or misrepresents a card condition. No escalation path is offered. Given that online payments (SumUp, PayPal) are now supported, this gap is more significant — a buyer who pays online for a card that is not as described has no clear recourse stated on the platform.

**Priority:** High — especially for online payment disputes.

**Recommended addition to § 12:**

> **Buyer Protection for Online Payments:** If you paid for an order via SumUp or PayPal and have a dispute regarding the transaction, you may file a dispute or chargeback directly with your card issuer (for SumUp) or through [PayPal's Resolution Center](https://www.paypal.com/us/smarthelp/article/how-do-i-open-a-dispute-in-the-resolution-center-faq1249) (for PayPal orders). investMTG has no ability to issue refunds on behalf of sellers — refunds are the responsibility of the individual seller. Contact the seller first; if unresolved, use your payment processor's dispute mechanism.
>
> **Reserve & Pay at Pickup:** For reserved orders (no advance payment), if a seller fails to honor a reservation, contact the seller and, if unresolved, notify investMTG at bloodshutdawn@gmail.com. Repeated violations may result in seller suspension.

---

### B5. Intellectual Property (Wizards of the Coast)
**Status:** 🟢 Green  
ToS § 9 includes the full WotC fan content disclaimer, acknowledges Scryfall's API terms, and claims the investMTG name/logo as operator property. This is well-drafted and includes the required WotC attribution language.

---

### B6. Prohibited Conduct
**Status:** 🟢 Green  
ToS § 8 lists eight clear prohibitions including counterfeits, fraud, harassment, illegal use, automation abuse, and ban evasion. Adequate for a community marketplace.

---

### B7. Account Termination Provisions
**Status:** 🟡 Yellow  
**Gap:** There is no explicit account termination section. ToS § 3 mentions bans obliquely ("You agree not to create multiple accounts for the purpose of circumventing bans, suspensions, or marketplace rules") and § 8 prohibits circumventing bans, but no provision states investMTG's right to suspend or terminate accounts, the grounds for doing so, or what happens to data upon termination.

**Priority:** Medium

**Recommended addition — new § 14 (renumber Contact to § 15):**

> **14. Account Suspension and Termination**  
> investMTG reserves the right to suspend or terminate any user account, at our sole discretion, for violations of these Terms, including but not limited to: listing counterfeit or stolen items, fraudulent behavior, harassment of other users, or repeated failure to honor reservations.  
>
> Upon termination: (a) your access to the marketplace will be revoked; (b) your active listings will be removed; (c) pending reservations will be cancelled with seller/buyer notifications; and (d) your personal data will be handled per our Privacy Policy.  
>
> You may terminate your own account at any time by contacting bloodshutdawn@gmail.com with a deletion request.

---

### B8. Governing Law
**Status:** 🟢 Green  
ToS § 12 states: "Any disputes with investMTG itself shall be governed by the laws of the Territory of Guam, United States." Clear and appropriate.

**Minor gap:** No venue clause (e.g., which court has jurisdiction) and no arbitration/waiver-of-jury-trial clause. For a sole proprietor community platform, these omissions are acceptable — adding them could create friction. Low priority.

---

### B9. ToS Modification Notification
**Status:** 🟡 Yellow  
ToS § 13 states changes will be posted with an updated date and continued use constitutes acceptance. This is legally standard but creates a practical problem: the versioned `TermsGate.js` only re-triggers the modal when `TOS_VERSION` is updated. If the site operator updates the ToS text but forgets to bump `TOS_VERSION = '2026-03-09'`, existing users will not be re-prompted.

**Priority:** Medium — operational risk, not a legal gap per se.

**Recommendation:** Document in SOUL.md (or a release checklist) that any ToS update requires: (1) updating the "Last updated" date in TermsView.js, AND (2) bumping `TOS_VERSION` in TermsGate.js to the new date. These must be kept in sync.

---

## C. Missing Policies

### C1. Refund / Return Policy
**Status:** 🔴 **MISSING — Critical**

**Analysis:** investMTG now processes online payments via SumUp and PayPal. Under FTC Act § 5 (deceptive practices), an e-commerce site that accepts payment must disclose its refund/return policy *before* the buyer pays. Currently there is no refund policy anywhere on the site. The ToS § 4 says "Either party may cancel a reservation before pickup" but says nothing about refunds after payment is taken.

SumUp and PayPal both have their own buyer protection programs, but these are the *payment processor's* policies — not the *marketplace's* policy. A buyer who pays online for a card that is misrepresented has no stated recourse from investMTG.

**Why this is Critical:** FTC Act § 5 enforcement has targeted online marketplaces that charge consumers without disclosing return/refund policies. Even a "no refunds" policy is acceptable — but it must be stated clearly before payment.

**Recommended fix — add a new page at `#refunds` and link it from checkout and footer, or add a section to the ToS:**

> **Refund and Return Policy (investMTG)**  
> Last updated: [date]
>
> **investMTG is a platform, not a seller.** All sales are directly between buyers and sellers.
>
> **For Reserve & Pay at Pickup orders:** No payment is taken by investMTG. Refund terms are between the buyer and seller directly. Either party may cancel before pickup.
>
> **For online payments (SumUp / PayPal):** investMTG does not hold or control payment funds. Online payments go directly to the seller via the respective payment processor.
>
> - *SumUp transactions:* Contact your card issuer or SumUp to dispute a charge if the item was not as described or not received.
> - *PayPal transactions:* Use PayPal's [Resolution Center](https://www.paypal.com/us/smarthelp/article/how-do-i-open-a-dispute-in-the-resolution-center-faq1249) to open a dispute. PayPal Buyer Protection may apply.
>
> **Seller obligations:** Sellers are required to accurately describe card conditions. A buyer who receives a card materially different from the listed condition may request a refund from the seller. Sellers who repeatedly misrepresent cards may be suspended.
>
> **Contact:** For unresolved disputes, email bloodshutdawn@gmail.com. We will make reasonable efforts to mediate.

---

### C2. Seller Agreement / Seller Terms
**Status:** 🟡 Yellow — Partial

**Analysis:** ToS § 7 ("Seller Obligations") covers the basics (accurate descriptions, honor prices, no counterfeits, tax compliance). However, it does not address:
- Seller fees (there are none currently, but this should be stated)
- What happens to seller funds if an order is disputed
- Seller's obligation regarding online payment disputes
- Seller's agreement to PayPal/SumUp merchant terms
- How investMTG handles chargebacks at the seller's expense

**Priority:** Medium — adequate for current scale; should be expanded as the platform grows.

**Recommended addition to § 7:**

> - investMTG is free to use. investMTG does not charge seller fees or take a commission on transactions.  
> - For online payment transactions, the payment processor (SumUp or PayPal) may charge the seller standard processing fees. investMTG is not responsible for these fees.  
> - Sellers accept responsibility for any chargebacks or payment disputes arising from their listings. investMTG has no ability to reverse payments on sellers' behalf.  
> - By accepting online payments through investMTG, sellers agree to SumUp's [Merchant Terms](https://www.sumup.com/en-us/terms/) and/or [PayPal's User Agreement](https://www.paypal.com/us/legalhub/useragreement-full) as applicable.

---

### C3. Community Guidelines (Beyond SOUL.md)
**Status:** 🟡 Yellow

**Analysis:** SOUL.md is an internal product/engineering document — it is not user-facing. The ToS § 8 (Prohibited Conduct) covers the hard rules. However, there are no soft community norms published (e.g., how to grade cards fairly, expectations around reservation response time, what "timely manner" means for seller response). For a community marketplace, these expectations reduce disputes.

**Priority:** Low — nice to have, not a compliance gap.

**Recommendation:** Consider adding a simple "Community Standards" page or FAQ section covering: expected seller response times, card grading standards guide, reservation etiquette, and how to report a bad actor.

---

### C4. ADA / Accessibility Statement
**Status:** 🔴 **MISSING**

**Analysis:** The Americans with Disabilities Act (ADA) Title III has been interpreted by federal courts (9th Circuit) to apply to websites that serve as places of public accommodation. As a US territory, Guam is subject to federal law including the ADA. The site uses React with some ARIA attributes (`role="dialog"`, `aria-modal`, `aria-live`, `aria-label`), which is a positive signal, but no formal accessibility statement or conformance level (WCAG 2.1 AA) is published.

**Priority:** Low for a community marketplace of this size. Risk of an ADA demand letter is low but not zero. If the operator expands the platform, this should be addressed.

**Recommended minimum fix:** Add a two-sentence accessibility statement in the footer or a `#accessibility` page:

> "investMTG is committed to making this site accessible to all users. If you encounter an accessibility barrier, please contact us at bloodshutdawn@gmail.com and we will make reasonable efforts to address it."

---

### C5. DMCA Takedown Procedure
**Status:** 🔴 **MISSING**

**Analysis:** The Digital Millennium Copyright Act (DMCA) requires online service providers that host user-generated content to: (1) have a registered DMCA agent with the US Copyright Office, and (2) publish a DMCA takedown procedure. investMTG hosts user-submitted card listings (descriptions, notes), which are user-generated content. Card images are served from Scryfall, not hosted by investMTG, which reduces risk. However, there is no published DMCA contact or procedure.

**Priority:** Medium — DMCA safe harbor protects platforms from copyright liability for user content only if the agent is registered and the policy is published. Without this, investMTG loses that safe harbor protection.

**Cost of compliance:** Very low. DMCA agent registration with the US Copyright Office is $6 online.

**Recommended fix — add to Privacy Policy or ToS footer, or create a `#dmca` page:**

> **DMCA / Copyright Takedown**  
> investMTG respects intellectual property rights. If you believe content on this site infringes your copyright, please send a written notice including: (1) identification of the copyrighted work; (2) identification of the allegedly infringing material and its location on the site; (3) your contact information; (4) a statement of good faith belief; (5) a statement under penalty of perjury that the information is accurate and you are authorized to act on behalf of the copyright owner.  
>
> Send DMCA notices to: bloodshutdawn@gmail.com (subject: "DMCA Takedown")  
>
> Note: Card images on this site are provided by the Scryfall API and are the property of Wizards of the Coast LLC.

---

## D. Cookie Notice Analysis

### Current State
The `CookieNotice.js` displays a banner with text: *"This site uses essential cookies from third-party services (Cloudflare, SumUp) for security and payment processing. No tracking or advertising cookies are used. Learn more"* with a "Got it" dismiss button.

The consent flag is stored in `localStorage` as `investmtg-cookie-ok = '1'`.

### Detailed Assessment

| Criterion | Finding | Status |
|-----------|---------|--------|
| Shown before cookies are set? | **No.** The banner loads after the page renders. Cloudflare security cookies and the PayPal SDK (which may set cookies during checkout) are not gated on consent. | 🔴 Gap |
| Opt-in or opt-out? | **Inform-and-dismiss** (neither strict opt-in nor opt-out). The only action is "Got it" — no "Decline" option. | 🟡 Yellow |
| Lists cookie categories? | **Partial.** Names Cloudflare and SumUp but does not list specific cookie names, purposes, or durations. | 🟡 Yellow |
| Links to full Privacy Policy? | ✅ Yes — "Learn more" links to `#privacy`. | 🟢 Green |
| localStorage used (not cookies) for consent flag? | ✅ Yes — The consent flag itself is stored in localStorage, which is technically not a cookie. | 🟢 Green |

### Analysis

The notice is **adequate under current US federal law** for a non-California-resident-targeted website. There is no federal US law requiring opt-in cookie consent. CCPA cookie consent obligations apply only to "sale" or "sharing" of personal information — and the site explicitly states no cookies are used for tracking or advertising.

The notice would be **inadequate under GDPR** (which does not apply here) and **borderline under CCPA** (which may not apply here). However, it is good practice to improve the notice regardless.

**Primary practical risk:** The PayPal SDK (`https://www.paypal.com/web-sdk/v6/core`) is loaded during checkout and PayPal routinely sets cross-site cookies. These are not disclosed specifically. If a California user files a complaint or a regulatory investigation occurs, the lack of specific cookie disclosure for PayPal could be problematic.

### Recommendations

**Medium priority:**

1. **Add PayPal to the cookie notice text:**  
   Change to: *"This site uses essential cookies from Cloudflare (security), SumUp (payment processing), and PayPal (payment processing). No tracking or advertising cookies are used."*

2. **Add a cookie table to the Privacy Policy:**  
   In the "Cookies" section, add a table:

   | Service | Cookie Purpose | Type | Expires |
   |---------|---------------|------|---------|
   | Cloudflare | DDoS protection, bot detection (\_\_cf\_bm, \_\_cflb) | Essential / Security | Session |
   | SumUp | Secure payment session | Essential / Payment | Session |
   | PayPal | Payment session, fraud prevention | Essential / Payment | Session |

3. **Note:** Because the site uses `localStorage` (not cookies) for auth tokens, watchlist, cart, ToS acceptance, and cookie consent flags, the actual cookie footprint is very small — limited to what Cloudflare, SumUp, and PayPal set. This is a genuine positive that should be highlighted clearly.

---

## E. Checkout / Order Flow Compliance

### E1. Clear Pricing Before Payment
**Status:** 🟢 Green

- **Step 1 (Review):** Items, quantities, and subtotal displayed.
- **Step 2 (Fulfillment):** Shipping cost shown ($X flat rate or FREE); running total updated.
- **Step 4 (Payment):** Full order summary recapped with subtotal, shipping, and total before any payment action.

The checkout shows `formatUSD(total)` on the "Reserve Order" button itself (e.g., "Reserve Order — $24.99"), giving the buyer the exact amount at the point of action. This is excellent UX and strong compliance practice.

---

### E2. Consent to Terms Before Order
**Status:** 🟢 Green

- **First-visit:** `TermsGate.js` shows a modal requiring "I Agree" before accessing the site.
- **At checkout (Step 3):** `TermsCheckbox` component requires explicit checkbox tick ("I agree to the Terms of Service and Privacy Policy") before proceeding to payment. The button is gated: `if (!tosAccepted) { setTosError('You must agree to the Terms of Service'); }`.
- **ToS version control:** `TOS_VERSION = '2026-03-09'` in `TermsGate.js` enables re-prompting when Terms are updated.

This is a well-implemented, layered consent approach.

---

### E3. Order Confirmation
**Status:** 🟢 Green

`OrderConfirmation.js` loads order data (from server first, localStorage fallback), displays order ID, items, contact info, fulfillment details, total, and payment status. The server generates structured `GUM-YYYYMM-XXXXX` format order IDs.

Per SOUL.md v61, confirmation emails are sent via Resend for both order confirmation and payment confirmation.

---

### E4. Dispute Resolution Disclosure at Checkout
**Status:** 🔴 Gap

**Finding:** The checkout flow collects payment but does not present any dispute or refund information to the buyer at the point of payment. There is no "What if something goes wrong?" text anywhere in the 4-step checkout.

For SumUp (online card payment) and PayPal, buyers should be told at or before payment that:
- For disputes, contact your card issuer (SumUp) or PayPal Resolution Center (PayPal)
- The seller, not investMTG, is responsible for fulfillment

**Priority:** High — especially for online payments where real money is exchanged.

**Recommended fix:** Add a small informational note below the payment buttons in Step 4:

> "By completing this order, you agree to our [Terms of Service](#terms). For payment disputes, contact your card issuer (for card payments) or [PayPal's Resolution Center](https://www.paypal.com/us/smarthelp/article/how-do-i-open-a-dispute-in-the-resolution-center-faq1249) (for PayPal). investMTG facilitates connections between buyers and sellers and is not a party to transactions."

---

### E5. Data Collection Transparency at Checkout
**Status:** 🟡 Yellow

Step 3 collects name, email, and phone. The form label says "We'll send your order confirmation here and share it with the seller for coordination." This is good — it explains why the data is collected. However, it does not mention that phone number will be shared with the seller.

**Recommended fix:** Update the step subtitle to: *"We'll send your order confirmation to your email address and share your contact details with the seller to coordinate pickup or delivery."*

---

## Priority-Ranked Fix List

| Priority | ID | Issue | Effort |
|----------|----|-------|--------|
| 🔴 Critical | C1 | **No refund/return policy** — required before accepting online payments | Low (write policy, add to ToS + footer) |
| 🔴 Critical | A4a | **PayPal not disclosed** as a data processor in Privacy Policy | Very Low (add 3 sentences) |
| 🔴 Critical | C5 | **No DMCA takedown procedure** — loses safe harbor for user content | Very Low ($6 agent + 1 paragraph) |
| 🔴 High | A4b | **Resend (transactional email) not disclosed** in Privacy Policy | Very Low (add 2 sentences) |
| 🔴 High | E4 | **No dispute resolution disclosure** at checkout point-of-payment | Low (add note to CheckoutView Step 4) |
| 🟡 High | B4 | **Dispute resolution** too minimal for online payment context | Low (add paragraph to ToS § 12) |
| 🟡 High | B7 | **No account termination section** in ToS | Low (add new § to TermsView.js) |
| 🟡 Medium | A1 | **No lawful basis statement** for data processing | Very Low (add paragraph to Privacy Policy) |
| 🟡 Medium | A2 | **Missing data subject rights:** rectification, restriction, objection, opt-out of sale | Very Low (add to "Your Rights" list) |
| 🟡 Medium | A3 | **Retention periods vague** — no specific timeframes | Low (rewrite retention section) |
| 🟡 Medium | A6 | **No response timeframe** for privacy requests | Very Low (add one sentence) |
| 🟡 Medium | C4 | **No accessibility statement** | Very Low (add two sentences to footer) |
| 🟡 Medium | B9 | **TOS_VERSION must stay in sync** with ToS text updates | Process (add to release checklist/SOUL.md) |
| 🟢 Low | D2 | **Cookie notice lacks PayPal disclosure** | Very Low (update one sentence in CookieNotice.js) |
| 🟢 Low | D3 | **No cookie table** in Privacy Policy | Low (add table to Cookies section) |
| 🟢 Low | C2 | **Seller Agreement** lacks online payment chargeback terms | Low (add to ToS § 7) |
| 🟢 Low | E5 | **Checkout Step 3** doesn't mention phone shared with seller | Very Low (update subtitle text) |
| 🟢 Low | B3 | **No aggregate liability cap** in Limitation of Liability | Low (add one sentence to § 11) |
| 🟢 Low | A5b | **Under-13 account termination process** not described | Very Low (add one sentence to ToS § 1) |
| 🟢 Low | C3 | **No public Community Guidelines** | Medium (optional; creates trust) |

---

## Guam-Specific Compliance Notes

### Guam Data Breach Notification (9 Guam Code Ann. § 48)
**Status:** 🟢 Not at immediate risk, but requires awareness

- The statute applies to breaches of unencrypted personal information (name + SSN, driver's license, or financial account numbers).
- investMTG does **not** store SSNs, driver's license numbers, or raw payment card data (SumUp/PayPal handle cards).
- The data at risk in a breach would be: names, email addresses, phone numbers, order records. This falls outside the definition of "personal information" under the Guam statute (which requires name + financial or government ID).
- **However:** If a future breach involved the Cloudflare D1 database and email addresses were exposed along with order totals, this could be argued to constitute covered information depending on context.

**Recommendation:** Establish a breach response procedure (even informally): (1) investigate within 24 hours; (2) consult legal counsel; (3) notify affected users and the Guam AG if the statute's threshold is met; (4) notify Cloudflare if their infrastructure is involved.

### Guam Business Taxes
**Status:** Advisory only — outside audit scope

ToS § 5 correctly states: "Sellers are responsible for their own tax obligations under Guam law. investMTG does not collect or remit taxes on behalf of sellers or buyers." This is appropriate for a C2C marketplace. Sellers should be advised separately that Guam has a Gross Receipts Tax (GRT) that may apply to card sales.

---

## What investMTG Gets Right

It is worth documenting the items that are already handled well, as they represent meaningful compliance work:

1. **Layered ToS consent** (TermsGate modal + checkout checkbox) — well-implemented
2. **PCI compliance offloading** — investMTG never handles card data; SumUp/PayPal take on PCI scope
3. **localStorage over cookies** — avoids most cookie consent complexity
4. **WotC IP attribution** — correctly includes the required fan content policy language
5. **Marketplace disclaimer** — strong, clear language that investMTG is not a party to transactions
6. **Third-party pricing attribution** — extensive inline attribution of Scryfall/JustTCG pricing data (SOUL.md Rule 5 enforced)
7. **Children's privacy** — 13-year minimum with Google OAuth's implicit age gate
8. **Security posture** (from SOUL.md) — no API keys in frontend, CSP hardening, OAuth on custom domain, Cloudflare WAF — all reduce data breach risk
9. **Separate data handling disclosures** — clear explanation of what's in localStorage vs. server-side D1

---

## Suggested Immediate Action Checklist

For the operator to resolve the Critical and High priority items in one session:

- [ ] **Add PayPal to Privacy Policy** `Third-Party Services` section
- [ ] **Add Resend to Privacy Policy** `Third-Party Services` section  
- [ ] **Add refund policy** — at minimum, add a paragraph to ToS § 12 and link it from checkout
- [ ] **Add DMCA paragraph** to ToS or Privacy Policy; register DMCA agent at copyright.gov ($6)
- [ ] **Add dispute resolution note** to CheckoutView.js Step 4 (below payment buttons)
- [ ] **Add account termination section** to TermsView.js (new § 14)
- [ ] **Add response timeframe** to Privacy Policy contact section
- [ ] **Update cookie notice** to include PayPal in the service list
- [ ] **Bump TOS_VERSION** after any of the above ToS changes and document the sync requirement in SOUL.md

---

*End of audit. All source references are to files in `/home/user/workspace/investmtg-repo/components/`. Regulatory citations: Guam Code Ann. § 9 Ch. 48 (data breach), 15 U.S.C. § 6501 et seq. (COPPA), 15 U.S.C. § 45 (FTC Act § 5), 17 U.S.C. § 512 (DMCA safe harbor), 42 U.S.C. § 12182 (ADA Title III).*
