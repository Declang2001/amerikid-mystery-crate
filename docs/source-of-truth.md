# Source of Truth

> Last synced: 2026-04-09
> Status: Entitlement model implemented, purchased flow corrected, 15-hat pool wired, exact preview checkout wired, inventory-aware pool filtering implemented, audio mix balanced (spin 0.30, SFX 0.25/1.0, ambient 0.10/0.08/0.05-spin), spin-start variation added, spin easing wind-up added, winner-only prestige pass added (gold grail glow, impact/sustain/settle envelope, steady hold).

This document is the authoritative working direction for the AmeriKid Mystery Crate launch.
All implementation decisions should reference this file.
If this file contradicts CLAUDE.md, README.md, or inline code comments, **this file wins**.

CLAUDE.md and README.md still reflect the older spin-era concept and have not been updated yet.

---

## Product Model

### Price Point
- **$50 combo** (shirt + mystery hat)
- There are NO $20 standalone spin purchases

### What the Customer Gets
- 1 guaranteed shirt (size selected at purchase)
- 1 mystery hat (revealed inside the crate experience)

### Hidden Preview Checkout Product
- Shopify now has a hidden mystery hat product with 15 variants, one exact variant per hat
- Preview checkout uses that hidden product only
- Purchased combo logic stays separate and unchanged in this pass

### Shopify Product Listings (Planned: 3)
1. **The shirt** (standalone listing)
2. **The mainline hat** (standalone listing)
3. **The combo product** ($50, shirt + mystery hat, shirt size as variant option)

### Shirt Size
- Shirt size is selected during Shopify checkout as a product variant option
- Shirt size does NOT live inside the crate app
- The crate app never needs to know or display shirt size

---

## Two User Paths

### 1. Purchased Path
- Customer buys the $50 combo in Shopify
- Customer selects shirt size during purchase
- Shopify grants **2 spins**
- Customer is routed into the crate experience
- Customer can spin once, optionally spin again, then finalize
- Crate stays open after result is revealed until the user acts (Save Result or Spin Again)
- Spin Again closes the crate, resets the hat display, then starts the next spin
- "Spin Again" only appears when another purchased spin exists; hidden when no spins remain
- When no spins remain, only "Save Result" is shown
- Final chosen hat must be **durably persisted** for fulfillment

### 2. Preview Path
- Customer enters the crate without prior purchase, OR logged-in customer with no purchased spins (including customers who already saved a hat from a prior purchased flow)
- Customer gets **1 preview spin**
- Preview spin is non-binding (no durable persistence needed)
- After preview result, only "Proceed to Checkout" is shown (no Spin Again, no generic spin button)
- Clicking "Proceed to Checkout" sends the user to Shopify checkout for the exact matching revealed hat variant using a cart permalink (`/cart/{variant_id}:1`)
- Refresh loophole on preview path is acceptable for launch
- Preview result does not need reservation-safe logic

---

## Hat Pool

- Launch pool: **15 hats** (implemented in `src/hats.js` and `api/_lib/allowed-hats.js`)
- 1 mainline hat: **Zombie Slayer OG** (`CF-ZS-OG`, file: `ZOMBIE SLAYER OG FRONT.png`)
- 7 named custom hats: Cross Red, Kinder, Mountain Rush, Pink Panther, Skittles Black, Skittles Red, Studded Melon
- 7 named hats: Sunset Sherbert, Wonder Bread, Pink Lemonade, Acid Wash, Junk Yard, Nuked Zombie, Head Shot (internal IDs CF-10 through CF-16)
- Each hat in `src/hats.js` includes `shopifyVariantId` for exact preview checkout routing
- All hat PNGs live in `public/hats/`
- Old placeholder files (`hat1.png` through `hat5.png`) are still in `public/hats/` but no longer referenced by code
- Exact rarity weighting: **provisional, not locked** (all weights currently 1)
- Whether 1/1 hats permanently leave the pool once won: **provisional, not locked**
- **Inventory-aware filtering:** `GET /api/available-hats` queries the hidden mystery-hat product's variant inventory via Shopify GraphQL Admin API. Only hats with variant inventory > 0 can be landed on. Both preview and purchased paths use the same filter. Spin is blocked if no hats are available or if the availability check fails.

---

## Entitlement Model

The old boolean tag model (`spin_ready` / `spin_in_progress`) is no longer sufficient.

New direction:
- Purchased entitlements should be represented as a **numeric spin counter**
- Preview path should remain **non-binding and local** (no server-side entitlement consumed)
- The final selected purchased hat must be **written durably** (customer metafield preferred, tag fallback acceptable)

### Current repo state (implemented)
- `api/_lib/shopify.js` uses numeric tag `crate_spins:N` and hat tag `crate_hat_won:HAT-ID`
- `consumeSpin()` decrements `crate_spins:N` by 1; removes tag at 0
- `finalizeResult()` writes `crate_hat_won:HAT-ID`, removes all `crate_spins:*` tags, rejects if hat already finalized
- `api/_lib/allowed-hats.js` provides server-side hat ID validation
- `/api/finalize` validates hat_id against the allowed set before writing
- Old `spin_ready` / `spin_in_progress` tags are ignored but not cleaned up

---

## Persistence

The crate must durably persist the final purchased hat result.

**Priority order:**
1. Fulfillment-safe durable winner storage (hat ID written to Shopify)
2. Purchased spin count support
3. Preview path UX
4. Cosmetic polish

**Preferred storage:** Customer metafield (structured, queryable)
**Fallback storage:** Customer tag (e.g., `hat_won:HAT-07`)
**Current app scopes:** `read_customers`, `write_customers` (may be too narrow for metafields)

---

## Architecture

| Layer | What | Where |
|-------|------|-------|
| Storefront page | Fragile iframe wrapper | Shopify theme `templates/page.mystery-box.json` |
| Crate app | Three.js SPA + UI | Vercel static hosting |
| Serverless API | Eligibility, consume, claim endpoints | Vercel functions (`/api/*`) |
| Shopify API | Customer tag/metafield read/write | REST Admin API via Client Credentials Grant |
| Shopify app | Credential container only | Partners dashboard ("Mystery Crate API") |

### Key architecture facts
- The Vercel app is the primary logic layer
- The Shopify Partners app provides Client ID + Client Secret only
- The Partners app's `app_url`, redirect URLs, and embedded settings are unused
- The storefront wrapper passes `customer_id` and optional `demo=1` via URL params
- The wrapper does not verify purchase, order, or entitlement
- Backend auth: Client Credentials Grant (not OAuth install flow)

### Environment variables (set in Vercel)
| Variable | Required | Purpose |
|----------|----------|---------|
| `SHOPIFY_SHOP_DOMAIN` | Yes | e.g., `your-store.myshopify.com` |
| `SHOPIFY_CLIENT_ID` | Yes | From Partners app |
| `SHOPIFY_CLIENT_SECRET` | Yes | From Partners app |
| `SHOPIFY_API_VERSION` | No | Defaults to `2024-10` |

---

## What Is Confirmed Broken / Stale Today

| Item | Status |
|------|--------|
| Winner hat data not durably persisted | Fixed: `crate_hat_won:HAT-ID` written on finalize, validated server-side |
| Entitlement model is boolean tags only | Fixed: numeric `crate_spins:N` tag, zeroed on finalize |
| Shopify Flow tied to old $20 spin product | Stale: must be rewired to combo product |
| Combo product does not exist in Shopify admin | Missing |
| App scopes may be too narrow for metafields | Unknown: needs verification |
| Mystery pool is inventory-blind (sold-out hats can be landed on) | Fixed: `GET /api/available-hats` filters pool by live variant inventory. Requires `read_products` scope on Partners app |
| Preview checkout does not route to the exact revealed hat | Fixed: preview forward action now uses the matching `shopifyVariantId` cart permalink |
| CLAUDE.md describes old spin-era architecture | Stale |
| README.md describes old spin-era product | Stale |
| Copy in `src/main.js` says "Log in to Claim", "Buy a Spin to Claim" | Stale |
| `src/hats.js` has 5 placeholder hats | Fixed: 15 real hats with IDs, names, paths, and mainline flag |
| Iframe audio overlay blocks interaction permanently if unlock fails | Fixed: overlay now always dismisses on first tap; passive listeners retry unlock on subsequent gestures |
| Logged-in users with no spins entered dead-end purchased path | Fixed: `isPreviewMode` dynamically set to `true` after eligibility fetch when `spinsRemaining === 0`, regardless of whether a hat was already saved |
| Theme wrapper hard-locked with "Unlocking soon." overlay | Intentional for now |

---

## Out of Scope for First Launch

- Full reservation logic for preview users
- Airtight anti-refresh or anti-cheat for preview path
- Rebuilding the Shopify storefront wrapper architecture
- Embedded Shopify app rebuild
- Checkout extension or post-purchase extension
- Order-linked depletion logic for 1/1 hats
- Broad storefront restyling

---

## Provisional Decisions (Not Yet Locked)

- Final brand naming: Candy Facts vs AmeriKid
- Final exact hat pool count (currently 15, may shift)
- Exact rarity weighting for mainline vs customs
- Whether 1/1 hats permanently leave the pool once won
- Final CTA wording (claim / finalize / proceed)
- Final reward screen art direction
- COD-style reward presentation details
