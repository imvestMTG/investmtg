# Foil/Language Variant Feature — Implementation Plan

## Status: IN PROGRESS (Tasks 1-2 done: API key updated + DB schema reviewed)

## Task Summary
Add foil/finish variant and language variant support to listing and buying flows.

---

## DB Schema Changes (Task 3)

### `listings` table
- Already has: `language TEXT DEFAULT 'English'`
- **ADD**: `finish TEXT DEFAULT 'nonfoil'`
  - Valid values: `nonfoil`, `foil`, `etched`
- Command: `ALTER TABLE listings ADD COLUMN finish TEXT DEFAULT 'nonfoil';`
- Worker D1 path: `npx wrangler d1 execute investmtg-db --command="ALTER TABLE listings ADD COLUMN finish TEXT DEFAULT 'nonfoil';" --remote`

### `prices` table (already complete)
- Already has `price_usd_foil` and `finishes` JSON columns — no changes needed

### `cart_items` table
- References `listing_id` → finish/language inherited from listing
- No schema change needed

---

## Worker Changes (Task 4)

### Two INSERT paths in worker.js for listings:
1. **Batch INSERT** (~line 1300): Currently inserts `user_id, seller_name, seller_contact, seller_store, card_id, card_name, set_name, condition, language, price, image_uri, notes, status, session_token, created_at, updated_at`
   - **Add `finish` column** to INSERT statement and bind the value
2. **Single INSERT** (~line 1420): Same columns
   - **Add `finish` column** to INSERT statement and bind the value

### UPDATE paths (~line 1451):
- `UPDATE listings SET status = ?, price = COALESCE(?, price), notes = COALESCE(?, notes), updated_at = ?`
- Optionally add `finish = COALESCE(?, finish)` so finish can be updated

### SELECT paths:
- Line 1348: `SELECT * FROM listings WHERE status = ?` — returns all columns including new `finish`, no change needed
- Line 1491: `SELECT * FROM listings WHERE ...` — same, no change needed

### Request body parsing:
- Both POST handlers need to read `finish` from request body (default `'nonfoil'` if not provided)

---

## Frontend Changes

### 1. SellerDashboard.js — Listing Form (Step 3)
**Location:** Around line 253-270 (listing form state) and line 599-640 (form UI)

- Add `finish` to listing form state: `finish: 'nonfoil'` in the form object
- Add finish selector dropdown/chip group with options: Non-Foil, Foil, Etched
- Language selector already exists? CHECK — if not, add language dropdown (English, Japanese, etc.)
- When finish is 'foil', show `priceUsdFoil` reference price instead of `priceUsd`
- Update the `submitListing()` function to send `finish` in POST body
- Update batch listing path to send `finish` per card
- Update existing listings table display (~line 910) to show finish badge

#### SellerDashboard form state (around line 264):
```js
condition: 'NM',
finish: 'nonfoil',   // ADD THIS
language: 'English',  // CHECK if already in form state
```

#### SellerDashboard form UI — add after condition dropdown:
- Finish selector: chip group with Non-Foil / Foil / Etched
- Language selector: dropdown with common languages

### 2. ListingModal.js — Quick-list from card detail
**Location:** File has condition/price state, need to add finish + language

- Add `finish` state (default 'nonfoil')
- Add `language` state (default 'English')  
- Add finish chip group UI after condition selector
- Add language dropdown
- Include `finish` and `language` in POST body to `/api/listings`
- If foil selected, reference `card.prices.usd_foil` for suggested price

### 3. CardDetailView.js — Display listings with finish/language
**Location:** Around line 221 (foil price display), and wherever listings are shown

- Existing listings display should show finish badge (Foil ✨, Etched ◆)
- Show language if not English

### 4. BuyLocalModal.js — Buy with finish/language info
**Location:** Around line 96 where listing info is shown

- Display finish badge next to condition
- Display language if not English

### 5. CartView.js — Show foil/language on cart items
**Location:** Around line 223 where condition badge is shown

- Add finish badge after condition badge
- Add language badge if not English
- Cart items reference listings, so the data comes from listing fetch

### 6. import-parser.js — Already handles foil!
- Line 143-146: Already parses `foil` column from CSV
- Line 163: Sets `foil: true/false` and `notes: 'Foil'`
- **UPDATE**: Map `foil: true` → `finish: 'foil'` instead (or in addition)
- SellerDashboard batch import path should map `card.foil` → `finish: card.foil ? 'foil' : 'nonfoil'`

---

## CSS Changes (style.css)

### New classes needed:
- `.finish-badge` — base badge style
- `.finish-foil` — gold/shimmer style for foil
- `.finish-etched` — silver/metallic for etched
- `.finish-selector` — chip group container
- `.finish-chip` / `.finish-chip--active` — selector chips
- `.language-badge` — for non-English language display
- `.language-selector` — dropdown styling

### Reuse patterns from:
- `.cart-cond-card` chip layout (condition selector)
- `.mp-badge-condition` badge style

---

## Languages List (common MTG languages)
English, Japanese, Chinese (Simplified), Chinese (Traditional), Korean, German, French, Italian, Spanish, Portuguese, Russian, Phyrexian

---

## Backup Plans

### If D1 ALTER TABLE fails:
- Can create new table with column, migrate data, drop old, rename
- Or use worker-level default: `SELECT *, COALESCE(finish, 'nonfoil') as finish FROM listings`

### If finish data breaks existing listings:
- Default is 'nonfoil' so all existing listings continue to work
- Frontend should handle null/undefined finish gracefully: `listing.finish || 'nonfoil'`

### If language selector is too complex:
- Start with text input (free-form) — already works with existing `language` column
- Phase 2: dropdown with common languages

### If foil pricing integration is complex:
- Phase 1: Just show finish badge on listings, let sellers set price manually
- Phase 2: Auto-suggest foil price from Scryfall `prices.usd_foil`

---

## Execution Order
1. ~~Update JustTCG API key~~ ✅
2. ~~Review DB schema~~ ✅  
3. ALTER TABLE to add `finish` column
4. Update worker.js INSERT/UPDATE statements
5. Deploy worker
6. Update SellerDashboard (form + display)
7. Update ListingModal
8. Update CartView (badges)
9. Update CardDetailView / BuyLocalModal (display)
10. Update import-parser.js (foil → finish mapping)
11. Add CSS for badges/selectors
12. Run QA: `bash tests/qa.sh`
13. Deploy worker (if not done), commit + push
14. Update docs (CHANGES.md, BUILD_SPEC.md)

---

## Files to Modify
- `worker/worker.js` — INSERT/UPDATE for finish column
- `components/SellerDashboard.js` — form state + UI + submission
- `components/ListingModal.js` — finish + language selectors
- `components/CartView.js` — finish/language badges
- `components/CardDetailView.js` — listing display with finish
- `components/BuyLocalModal.js` — finish/language in listing info
- `utils/import-parser.js` — foil → finish mapping
- `style.css` — new badge/selector styles
- `sw.js` — bump version
- `CHANGES.md` — document feature

## Key Code Patterns to Follow
- `var` only, no `let`/`const`
- `h = React.createElement` — no JSX
- `function()` — no arrow functions
- No destructuring for useState
- All localStorage via `storageGet()`/`storageSet()`
