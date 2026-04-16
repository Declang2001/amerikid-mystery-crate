# Source of Truth

> Last synced: 2026-04-15
> Status: Preview path now redirects directly to a Shopify cart permalink (no intermediate combo product page). Two-popup flow: (1) `showPreviewConfirmOverlay` (copy `PREVIEW SELECTED` / `THIS IS THE HAT YOU'RE TAKING INTO CHECKOUT.` / `CONTINUE`) reuses the `#savedHatOverlay` DOM shell; Continue chains to (2) a new `#sizeSelectOverlay` (`showPreviewSizeOverlay`) with shirt-size options S/M/L/XL/2XL and a `GO TO CHECKOUT` CTA that enables once a size is selected. CTA redirects to `https://amerikid.ca/cart/<comboVariantId>:1?properties=<URL-escaped base64 of {"_preview_hat_id":"<HAT-ID>"}>` (base64 via `btoa`, then `encodeURIComponent`). URL-encoded-JSON payload was tried first and produced a Shopify error page on this store; base64 matches the manually verified working pattern. Combo variant IDs mapped per size in `COMBO_VARIANT_BY_SIZE` (S=51878170034456, M=51878170067224, L=51878170099992, XL=51878170132760, 2XL=51878170165528). New `buildPreviewCartPermalink(hatId, size)` helper constructs the URL. Preview overlay still never sets `savedHatOverlayShown`, never touches `crate.savedHat.pending`; `#savedHatContinueBtn` branches on a stashed `previewContinueAction`. Older `buildComboCheckoutUrl(hat?)` and `buildPreviewCheckoutUrl` helpers retained in code but dormant. Preview finalize handler plays claim SFX, sets CLAIMING, closes crate, opens overlay chain. Purchased path, pending-result bridge, saved-hat immediate-show, purchased email-link route, `/api/*`, inventory-aware landing, state machine, audio, camera, scene, and `buildPreviewCheckoutUrl` (still dormant) are all unchanged. Theme pickup of `preview_hat_id` -> `_preview_hat_id` line-item property and the draft-safe Flow remain downstream work not altered by this pass. Saved-hat confirmation popup moved to immediate post-finalize (shown from inside the purchased-path `closeCrate().then` block right after `setState(STATES.CLAIMED)`, reload now gated on Continue click; `POST_CLAIM_RELOAD_HOLD_MS` auto-reload timer removed; post-reload failsafe trigger + sessionStorage `crate.savedHat.pending` flag retained for force-reload recovery). One-time post-save confirmation card added (sessionStorage key `crate.savedHat.pending` written inside the post-claim reset before reload; on next load, after eligibility resolves and boot reaches `CRATE_VIEW`, a single-use overlay shows the saved hat image, name, and "Your hat is locked in for fulfillment" copy, cross-checked against `eligibility.hatWon` and cleared on display; no server or theme change). Pending-result bridge added (fallback-only tag `crate_pending_result:<HAT-ID>:<UNIX-MS>`, written on winner-landed, cleared on finalize, resumed on reload when hat_won is null), preview CTA redirected to the $50 combo product page (exact-hat preview checkout retained in code for future reuse), entitlement model implemented, purchased flow corrected, 15-hat pool wired, inventory-aware pool filtering implemented, audio mix balanced (spin 0.30, SFX 0.25/1.0, ambient 0.10/0.08/0.05-spin), spin-start variation added, spin easing wind-up added, winner-only prestige pass added (gold grail glow, impact/sustain/settle envelope, steady hold), front-half spin cadence calmed (EXTRA_FULL_ROTATIONS_MAX 2 to 1), tactical HUD polish applied to boot cards and result panel (classified-console corner brackets, scanlines, Black Ops One titles, beveled tactical buttons, cyan/amber/gold state language), post-claim reset added (purchased-path CLAIMED holds briefly then reloads to intro), intro MP4 reliability pass applied (idle.mp4 preload link in index.html, walk download serialized behind idle loadeddata, post-parse crossOrigin mutation removed, idle/walk timeout watchdog + Tap To Retry fallback), hat texture preload deferred off the first-paint critical path (placeholder Textures at module init, deferred kickHatTexturePreload with fetchPriority="low" wired into idle readiness so the ~63 MB hat pool no longer competes with idle.mp4 on mobile cold boot), GPU texture pre-upload added (`renderer.initTexture` called once per hat on image load so the spin reel no longer triggers lazy GPU uploads per swap), UI button click SFX added (`clickSfx` = `/sfx/click.mp3`, volume 0.3, registered in `allAudioElements` for gesture unlock, wired into `#bootStartBtn` / `#bootEnterPortalBtn` / `#savedHatContinueBtn` / `.size-select-option` / `#sizeSelectCtaBtn` / `#spinBtn` / `#claimBtn`; Press X prompt / canvas click / keyboard X deliberately excluded). Combo product image added to `#sizeSelectOverlay` card (static `<img>` from Shopify CDN, lazy-loaded, placed between subcopy and size options host; `.size-select-product-img` max 180px desktop / 140px <=820px, drop-shadow tuned to tactical HUD language).

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
- After `Save Result` success, the CLAIMED confirmation is held briefly (~2.5s) then the page reloads back to the full intro flow. On reload the same customer naturally lands in post-purchase preview mode (1 non-binding spin, "Proceed to Checkout" CTA) via existing eligibility fallback logic.

### 2. Preview Path
- Customer enters the crate without prior purchase, OR logged-in customer with no purchased spins (including customers who already saved a hat from a prior purchased flow)
- Customer gets **1 preview spin**
- Preview spin is non-binding (no durable persistence needed)
- After preview result, only "Proceed to Checkout" is shown (no Spin Again, no generic spin button)
- Clicking "SELECT HAT" now opens a two-step preview overlay flow: (1) a confirmation overlay reusing the `#savedHatOverlay` DOM with copy `PREVIEW SELECTED` / `THIS IS THE HAT YOU'RE TAKING INTO CHECKOUT.` / `CONTINUE`, then (2) a sibling `#sizeSelectOverlay` shirt-size selector (S/M/L/XL/2XL) with `GO TO CHECKOUT` CTA. CTA redirects directly to a Shopify cart permalink `https://amerikid.ca/cart/<comboVariantId>:1?properties=<URL-escaped base64 of {"_preview_hat_id":"<HAT-ID>"}>` — no intermediate combo product page. The `_preview_hat_id` travels natively as a line-item property; no theme-side query-param pickup required.
- The older exact-hat cart permalink helper (`buildPreviewCheckoutUrl`, `/cart/{variant_id}:1`) is preserved in `src/main.js` for possible future reuse but is not wired to the preview CTA
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
- `finalizeResult()` writes `crate_hat_won:HAT-ID`, removes all `crate_spins:*` tags, clears any `crate_pending_result:*`, rejects if hat already finalized
- `api/_lib/allowed-hats.js` provides server-side hat ID validation
- `/api/finalize` validates hat_id against the allowed set before writing
- Old `spin_ready` / `spin_in_progress` tags are ignored but not cleaned up

### Pending-result bridge (fallback-only, tags-only)
- Tag shape: `crate_pending_result:<HAT-ID>:<UNIX-MS>`. Single tag per customer, latest wins.
- Written by `POST /api/pending-result` the moment the paid reel lands on a winner (purchased path only, fire-and-forget from the client).
- Surfaced by `/api/eligibility` as `pending_result: { hat_id, timestamp } | null`.
- Cleared by `finalizeResult()` in the same `PUT` that writes `crate_hat_won:HAT-ID`.
- On reload, if `pending_result` is set and `hat_won` is null, the client stays on the purchased path (does not fall into preview) and resumes the exact landed hat on the next spin trigger: no consume, no reel, direct land at `WINNER_SELECTED` ready for Save Result.
- Bridge is single-claim only. Multi-combo support is explicitly deferred; the `crate_hat_won:*` overwrite block in `finalizeResult` is unchanged.
- There is no self-service restore-spin endpoint. Support recovery is a manual Shopify admin tag edit on `crate_pending_result:*` / `crate_spins:*` / `crate_hat_won:*`.

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
| Combo product live in Shopify admin | Confirmed 2026-04-13: `https://amerikid.ca/products/candyfacts-mystery-box-combo`. Preview CTA redirects here. |
| App scopes may be too narrow for metafields | Unknown: needs verification |
| Mystery pool is inventory-blind (sold-out hats can be landed on) | Fixed: `GET /api/available-hats` filters pool by live variant inventory. Requires `read_products` scope on Partners app |
| Preview checkout routed to exact revealed hat variant | Superseded 2026-04-15: preview CTA now redirects directly to a Shopify cart permalink for the selected combo variant with `_preview_hat_id` as a line-item property. Exact-hat helper and combo-page helper retained in code, both dormant. |
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
