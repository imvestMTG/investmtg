# investMTG — Operations & Compliance Setup Summary
**Date:** March 15, 2026 | **Version:** v78

---

## What Was Completed

### 1. Compliance Audit & Fixes (v78)

Full legal/privacy compliance audit performed against FTC Act § 5, COPPA, DMCA, ADA, Guam Code Ann. § 9 Ch. 48, and CCPA/CPRA best practices. All critical and high-priority findings were remediated in code.

**Privacy Policy changes:**
- PayPal, Resend (email), and EchoMTG disclosed as data processors
- Legal basis for processing added
- Cookie table with Cloudflare/SumUp/PayPal details
- Data retention with specific timeframes (30-day deletion, 3-year order retention)
- Expanded data subject rights (correction, restriction, objection, opt-out of sale)
- Privacy request response timeframe (5 biz days ack, 30 days respond)
- DMCA / Copyright Takedown section added

**Terms of Service changes:**
- New § 13: Refund and Return Policy (FTC Act § 5 compliance)
- New § 15: Account Suspension and Termination
- Expanded § 6: PayPal added alongside SumUp
- Expanded § 7: Seller fee transparency, chargeback responsibility
- Expanded § 11: $100 aggregate liability cap
- Expanded § 12: Buyer protection for online payments, reserve dispute process
- Under-13 account termination provision (§ 1)

**Cookie Notice:** Now lists Cloudflare, SumUp, and PayPal individually with purposes.

**Checkout:** Dispute resolution disclosure added at payment step; Step 3 subtitle updated to clarify contact sharing.

**TOS_VERSION bumped to 2026-03-15** — existing users will be re-prompted to accept.

**SOUL.md:** Added ToS version sync rule to Release Discipline section.

### 2. Connected Services

| Service | Status | Purpose |
|---------|--------|---------|
| Linear | ✅ Connected | Engineering roadmap, bug tracking |
| Notion | ✅ Connected | Knowledge base, documentation |
| Sentry | ⚠️ Needs re-auth | Error tracking (OAuth page had issues) |
| Google Sheets | ✅ Connected | Customer issue tracker |
| Gmail + Calendar | ✅ Already connected | Communications |
| GitHub | ✅ Already connected | Code, deployments |

### 3. Automated Monitoring (Recurring Tasks)

| Task | Schedule | What It Does |
|------|----------|--------------|
| Site health check | Every 6 hours | Tests API, frontend, search, auth, SW version. Only alerts on failure. |
| Stale listing check | Daily 3am ChST | Finds listings older than 60 days. Notifies with seller breakdown. |
| Order digest | Daily 8am ChST | Summarizes new orders, revenue, stuck reservations (>3 days). |
| Moxfield deck refresh | Weekly Monday 10am ChST | Checks deck browser data freshness (pre-existing). |

### 4. Customer Issue Tracker

**Google Sheets:** [investMTG — Customer Issues Tracker](https://docs.google.com/spreadsheets/d/12zgssk_04cvbo0rESLgw9Qt3-EPu32Cx1kHLhkyDhy4/edit)

Columns: Ticket ID, Date Opened, Reporter Email, Category, Priority, Status, Subject, Description, Assigned To, Resolution, Date Closed

Dropdown validations:
- **Category:** Order Dispute, Payment Issue, Listing Problem, Account Issue, Card Condition Complaint, Seller No-Show, Bug Report, Feature Request, Other
- **Priority:** Critical, High, Medium, Low
- **Status:** New, In Progress, Waiting on User, Waiting on Seller, Escalated, Resolved, Closed

---

## What Still Needs Attention

### Immediate (next session)
1. **Sentry re-auth** — Needs you to complete the OAuth approval. Try from a desktop browser. Once connected, create an `investmtg` project for JS error tracking.
2. **DMCA agent registration** — Register at [copyright.gov](https://www.copyright.gov/dmca-directory/) ($6 fee). The DMCA section in the Privacy Policy is written and live, but safe harbor requires the registered agent.
3. **Accessibility statement** — Low priority but recommended. Two-sentence footer addition per audit finding C4.

### Medium-term
4. **Linear project setup** — Create investMTG project boards for engineering backlog, bug tracking
5. **Notion knowledge base** — Set up customer FAQ, community guidelines, card grading guide
6. **Community Guidelines page** — Optional but reduces disputes. Cover card grading standards, reservation etiquette, seller response time expectations.

### Compliance items at low priority
7. **Venue/arbitration clause** — Optional for current scale (ToS § 12)
8. **ADA WCAG 2.1 AA audit** — Full accessibility review when platform grows
9. **Data breach response procedure** — Document internally (Guam Code Ann. § 9 Ch. 48)

---

## Files Modified This Session
- `components/PrivacyPolicyView.js` — All privacy policy additions
- `components/TermsView.js` — All ToS additions (§§ 1, 6, 7, 11, 12, 13, 15, 16)
- `components/CookieNotice.js` — PayPal added
- `components/CheckoutView.js` — Dispute notice + Step 3 subtitle
- `components/TermsGate.js` — TOS_VERSION bump
- `sw.js` — v78
- `style.css` — .legal-table, .checkout-dispute-notice styles
- `CHANGES.md` — v78 entry
- `SOUL.md` — ToS sync rule
- `.session-notes/compliance-audit.md` — Full 538-line audit report
- `.session-notes/compliance-fixes-v78.md` — Implementation details
- `.session-notes/operations-setup-summary.md` — This file
