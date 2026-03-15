# Session Context Backup — March 14, 2026

## Resume Instructions
If context is compacted, read this file AND `foil-language-feature.md` in this directory.
Reload skills: `investmtg-qa`, `investmtg-code`, `investmtg-cloudflare`

## Current SW Version: v76 (deployed)
Next version will be v77.

## Active Todo List (9 tasks)
1. ✅ Update JustTCG API key in worker secret
2. ✅ Review DB schema for listings table  
3. ⬜ Modify DB schema — add `finish` column to listings
4. ⬜ Update SellerDashboard — add foil/finish + language selectors
5. ⬜ Update ListingModal — add foil/finish + language selectors
6. ⬜ Update CartView — show foil/language badges
7. ⬜ Update CardDetailView / BuyLocalModal — display foil/language info
8. ⬜ Update worker INSERT/UPDATE for finish field + deploy
9. ⬜ QA, commit, push

## Critical User Rules
- QA ALWAYS before documentation
- User does visual checks — don't waste tokens on browser_task screenshots
- Paper cards only (SOUL.md Rule 2)
- USD only
- var only, no let/const, no JSX, no arrows
- `bash tests/qa.sh` for QA
- Use subagents but minimize credit usage

## Infrastructure
- CF Token: QQoJgfhTj_05PK2Ms0wAKG5gRBv3bp5nlG0Ein6Z
- CF Account: 12360b71beb495952bc5bdcd1b3eab27
- D1 DB: 82b5e51e-5d80-4396-8fb2-d345fe54ed0f
- ADMIN_TOKEN: investmtg-admin-2026
- JustTCG key (NEW): tcg_bb91f6cad42b43299224ef15d7a7a2ed
- Repo: /home/user/workspace/investmtg-repo/
- GitHub: imvestMTG/investmtg, branch main, use api_credentials=["github"]
- Worker deploy: `cd worker && CLOUDFLARE_API_TOKEN="..." CLOUDFLARE_ACCOUNT_ID="..." npx wrangler deploy`

## Key Line Numbers in worker.js
- Batch INSERT listings: ~line 1300
- Single INSERT listings: ~line 1420  
- UPDATE listings status/price: ~line 1451
- UPDATE listings status only: ~line 1461
- SELECT listings (public): ~line 1348
- SELECT listings (seller): ~line 1491

## Key Findings from Schema Review
- `listings` table already has `language TEXT DEFAULT 'English'`
- `listings` table needs `finish TEXT DEFAULT 'nonfoil'`
- `prices` table already has `price_usd_foil` and `finishes` JSON
- `cart_items` references listing_id — no schema change needed
- import-parser.js already parses foil from CSV but stores as boolean → needs mapping to finish string

## Files Modified in v76 (already committed/pushed)
- utils/auth.js — captureTokenFromURL() rewrite
- components/ScannerView.js — camera error handling
- style.css — .scanner-error-actions
- worker/worker.js — Permissions-Policy header
- sw.js — v75 → v76, CHANGES.md
