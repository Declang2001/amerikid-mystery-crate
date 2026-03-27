# Change Log

All notable project decisions and implementation changes are documented here.
This log tracks direction changes, not just code commits.

---

## 2026-03-27 -- Open SFX Plays on Every Crate Open

**Type:** Audio behavior fix. `src/main.js` `openCrate()` function.

Moved `playSfx(openSfx, 1)` into `openCrate()` itself, after the `crateIsOpen` early return. This guarantees the open sound plays on every actual open (spin start, Spin Again re-open, Open button) and cannot double-fire (early return prevents it). Removed the redundant `playSfxAndWait(openSfx, 1)` from the `startSpin()` Promise.all call site.

---

## 2026-03-27 -- Button Visibility Gated by Path and Spin Availability

**Type:** UI state logic fix. `src/main.js` `updateControls()` function.

Preview path: spin button is now always hidden after result reveal (preview gets only 1 spin, no Spin Again). Only "Proceed to Checkout" is shown.

Purchased path: "Spin Again" is only visible in result states when another purchased spin actually exists (`spinsRemaining > 0` and no `hatWon`). When no spins remain, only "Save Result" is shown.

---

## 2026-03-27 -- Close SFX Plays on Every Crate Close

**Type:** Audio behavior fix. `src/main.js` `closeCrate()` function.

Moved `playSfx(closeSfx, 1)` into `closeCrate()` itself, after the `!crateIsOpen` early return. This guarantees the close sound plays on every actual close (Spin Again, Save Result, Proceed to Checkout, Close button) and cannot double-fire (early return prevents it). Removed the two redundant `playSfx(closeSfx)` calls at the closeBtn and scheduleAutoClose call sites.

---

## 2026-03-26 -- Cadence Polish: Reduce Total Rotations (v2)

**Type:** Two rotation constants changed. `src/main.js` lines ~691-692.

`MIN_FULL_ROTATIONS` from `3` to `2`, `EXTRA_FULL_ROTATIONS_MAX` from `1` to `0`. Total steps drop from 45-60 to ~30 (fixed). With exponent 1.7 and ~30 steps over ~5 seconds, peak hat speed is ~100ms/hat (6 frames at 60fps). Every hat is clearly readable from the first swap. Spin still covers 2 full passes through all 15 hats before landing.

---

## 2026-03-26 -- Cadence Polish: Ease-Out Exponent 2.0 to 1.7

**Type:** Single-value cadence tweak. `src/main.js` line ~1000.

Easing exponent lowered from `2.0` to `1.7`. Initial derivative drops from 2.0 to 1.7, slowing peak cycling speed from ~50ms/hat to ~60ms/hat. Every hat is readable from the first frame. Deceleration stays smooth.

---

## 2026-03-26 -- Crate Stays Open After Result Reveal

**Type:** UX/state behavior fix. One line removed in `src/main.js`.

Removed the `scheduleAutoClose()` call after spin completion. The crate now stays open with the winning hat visible until the user clicks Save Result, Proceed to Checkout, or Spin Again. The WINNER_PENDING_CLAIM state is no longer transitioned into but is left in the codebase as dead code (harmless). When Spin Again is clicked from WINNER_SELECTED, `startSpin()` detects `crateIsOpen`, closes the crate silently, hides the hat via state-driven visibility, then runs the full open/spin sequence.

---

## 2026-03-26 -- Spin Cadence Shape: Single Smooth Curve

**Type:** Easing function replacement. `src/main.js` `spinEasing()`.

Replaced the piecewise two-phase easing with a single `1 - (1-t)^2.5` ease-out curve. The old piecewise approach had a derivative jump at the phase boundary that caused a perceptible speed surge no matter how the constants were tuned. The single curve starts fast (~36ms/hat) and decelerates smoothly from the very first frame, with last few hats at ~250ms each.

---

## 2026-03-26 -- Hat Reveal Height Adjustment (v5)

**Type:** Single-value visual tweak. `src/main.js` line ~1244.

Hat reveal offset: `+0.50` -> `+0.65`. Decisive upward move. All values from `+0.05` through `+0.50` were confirmed too low.

---

## 2026-03-26 -- Spin Cadence Fix: Remove Late Surge

**Type:** Single-value easing tweak. `src/main.js` line ~1010.

Phase 2 ease-out power changed from `5` to `3`. The power-5 curve had a steep initial slope that created a burst of fast swaps at the phase 1/2 boundary, perceived as a weird speed-up before the final slowdown. Power 3 decelerates more evenly from the start of phase 2.

---

## 2026-03-26 -- Hat Reveal Height Adjustment (v4)

**Type:** Single-value visual tweak. `src/main.js` line ~1244.

Hat reveal offset: `+0.40` -> `+0.50`. More decisive upward move. Previous increments (`+0.25`, `+0.35`, `+0.40`) were all confirmed too low. The old `+0.45` ceiling was not a real constraint.

---

## 2026-03-26 -- Spin Cadence Adjustment

**Type:** Single-value easing tweak. `src/main.js` line ~1001.

`stepsCoveredInPhase1` changed from `0.90` to `0.75`. Spreads steps more evenly across the spin duration so peak cycling speed is readable (~100ms/hat instead of ~65ms), and the deceleration phase has more hat swaps to settle through.

---

## 2026-03-26 -- Hat Reveal Height Micro-Adjustment (v2)

**Type:** Single-value visual tweak. `src/main.js` line ~1244.

Hat reveal offset: `+0.05` -> `+0.25` -> `+0.35`. Midpoint between previous `+0.25` (still too low) and original `+0.45` (too high).

---

## 2026-03-26 -- Visual/Timing Fix Pass (Lid Lines, Spin Speed, Hat Height)

**Type:** Focused visual/runtime fix. Three constants changed in `src/main.js`.

**Files changed:**
- `src/main.js` -- three targeted value changes
- `docs/change-log.md` -- this entry

**What changed:**

1. **Lid crack Y position** (line ~2302): `1.13` changed to `0.13`. The cracks were using a world-space Y value inside a local-space parent (`lidPivot` at `y: 1.0`), placing them ~1 unit above the lid surface. Now correctly sits on the lid.

2. **Spin rotation constants** (lines ~691-692): `MIN_FULL_ROTATIONS` from `12` to `4`, `EXTRA_FULL_ROTATIONS_MAX` from `6` to `2`. With 15 hats, the old values produced 180-270 steps in ~5-7 seconds (sub-frame per hat). New values produce 60-90 steps, matching the old 5-hat cadence.

3. **Hat reveal height** (line ~1244): `bbox.max.y + 0.45` changed to `bbox.max.y + 0.05`. The hat was floating well above the crate during spin/reveal. Now sits just above the lid.

**What was NOT changed:**
- Easing curve, spin duration, audio sync -- untouched
- Lid pivot hierarchy, open/close animation -- untouched
- Backend, API, entitlement, hat dataset -- untouched
- Shopify wrapper -- not touched

---

## 2026-03-26 -- 15-Hat Launch Pool Wiring

**Type:** Data/asset mapping pass. No flow or UI changes.

**Files changed:**
- `src/hats.js` -- replaced 5 placeholder entries with 15 real hat entries
- `api/_lib/allowed-hats.js` -- synced to match the 15 real hat IDs
- `docs/source-of-truth.md` -- updated hat pool section and stale table
- `docs/change-log.md` -- this entry

**What changed:**
- `src/hats.js` now contains 15 entries with fields: `id`, `name`, `image`, `weight`, `mainline`
- IDs use the `CF-` prefix convention (e.g., `CF-ZS-OG`, `CF-CROSS-RED`, `CF-10`)
- The mainline hat is `CF-ZS-OG` (Zombie Slayer OG), marked with `mainline: true`
- Image paths point to the real PNG filenames in `public/hats/`
- `api/_lib/allowed-hats.js` contains the same 15 IDs for server-side validation
- All weights are 1 (uniform distribution, provisional)

**Old placeholder files (`hat1.png` through `hat5.png`):**
- Still present in `public/hats/`
- No longer referenced by any code
- Safe to delete in a future cleanup pass

**What was NOT changed:**
- `src/main.js` -- no edits (consumes hats array via import, field names unchanged)
- `api/finalize.js` -- no edits (already imports `isValidHatId` from `allowed-hats.js`)
- Purchased/preview flow semantics -- untouched
- 3D scene, audio, camera, fallback crate -- untouched
- Shopify storefront wrapper -- not touched

---

## 2026-03-26 -- Purchased Flow Correction + Server-Side Validation

**Type:** Focused correction pass. No broad rewrite.

**Files changed:**
- `api/_lib/shopify.js` -- `finalizeResult()` now removes all spin tags and rejects duplicate finalize
- `api/_lib/allowed-hats.js` -- NEW: server-side hat ID validation set
- `api/finalize.js` -- validates hat_id against allowed set before writing
- `src/main.js` -- purchased flow fixes (Spin Again from WINNER_PENDING_CLAIM, button text, spins zeroed on finalize)
- `docs/source-of-truth.md` -- updated entitlement model section to reflect implemented state
- `docs/runtime-test-checklist.md` -- rewrote purchased path section with correct test steps
- `docs/change-log.md` -- this entry

**What changed:**

Backend:
- `finalizeResult()` now removes all `crate_spins:*` tags when writing `crate_hat_won:HAT-ID`
- `finalizeResult()` rejects with `"Hat already finalized"` if `crate_hat_won:*` tag already exists
- `/api/finalize` validates `hat_id` against `api/_lib/allowed-hats.js` (returns 400 for invalid IDs)
- `api/_lib/allowed-hats.js` exports `isValidHatId()` and the `ALLOWED_HAT_IDS` set (currently ZS-01 through ZS-05)

Frontend:
- `startSpin()` no longer blocks on WINNER_PENDING_CLAIM, so "Spin Again" works after auto-close
- Spin button shows "Spin Again" during WINNER_SELECTED / WINNER_PENDING_CLAIM (not only CLAIMED)
- Purchased spin eligibility now also checks `!eligibility.hatWon` (blocks spin after finalize)
- `eligibility.spinsRemaining` zeroed locally after successful finalize

**What was NOT changed:**
- `api/_lib/shopify.js` core functions (`getCustomer`, `updateCustomerTags`, `getAccessToken`, `consumeSpin`) -- untouched
- `src/hats.js` -- still 5 placeholders (15-hat pass deferred)
- Preview path -- unchanged
- 3D scene, audio, camera, fallback crate -- untouched
- CORS -- still `*`
- Shopify storefront wrapper -- not touched

---

## 2026-03-20 -- Backend Entitlement + Persistence Refactor

**Type:** Runtime backend + frontend model change. First implementation pass.

**Files changed:**
- `api/_lib/shopify.js` -- full rewrite of entitlement model
- `api/eligibility.js` -- updated response shape
- `api/consume-spin.js` -- updated to numeric spin decrement
- `api/finalize.js` -- NEW endpoint, replaces old claim-spin
- `api/claim-spin.js` -- deprecated (returns 410 Gone)
- `src/main.js` -- frontend eligibility model updated

**What changed:**

Backend:
- Replaced boolean tags (`spin_ready`, `spin_in_progress`) with numeric tag `crate_spins:N`
- Added durable hat persistence via `crate_hat_won:HAT-ID` tag
- New `finalizeResult()` function writes winning hat ID to Shopify customer tags
- `checkEligibility()` now returns `{ spins_remaining, hat_won }` instead of `{ ready, in_progress }`
- `consumeSpin()` now decrements: `crate_spins:2` becomes `crate_spins:1`, removes tag at 0
- `parseSpinsRemaining()` sums all `crate_spins:*` tags for robustness
- New `/api/finalize` endpoint accepts `{ customer_id, hat_id }`
- Old `/api/claim-spin` returns 410 Gone with deprecation message

Frontend:
- `isDemoMode` renamed to `isPreviewMode`
- `isRealSpin` renamed to `isPurchasedSpin`
- `claimInProgress` renamed to `finalizeInProgress`
- `eligibility.ready` / `eligibility.inProgress` replaced with `eligibility.spinsRemaining` (number) and `eligibility.hatWon` (string|null)
- Preview path: 1 local spin, no API calls, no persistence, finalize button says "Proceed to Checkout"
- Purchased path: API-gated spins, decrement on spin start, finalize writes hat tag
- `claimSpinEntitlement()` replaced with `finalizeSpinResult(hatId)`
- `updateControls()` updated to reflect preview vs purchased button text
- `updateEligibilityUI()` shows spin count and hat-won status

**Compromises:**
- Uses customer tags (not metafields) for storage, since confirmed scopes are only `read_customers` + `write_customers`
- Tag convention `crate_hat_won:HAT-ID` is a string convention, not typed structured storage
- Tag convention `crate_spins:N` uses a parseable prefix pattern
- Old `spin_ready` / `spin_in_progress` tags are ignored but not automatically cleaned up

**What was NOT changed:**
- `src/hats.js` -- still has 5 placeholder hats (will be updated in a later pass)
- `src/style.css` -- no visual changes
- 3D scene, audio system, camera, fallback crate -- untouched
- CLAUDE.md, README.md -- still stale (deferred)
- Shopify storefront wrapper -- not touched
- CORS -- still `*` (will be tightened before production)

---

## 2026-03-20 -- Documentation Sync (Pre-Implementation)

**Type:** Docs only. No runtime changes.

**What changed:**
- Created `docs/source-of-truth.md` as the authoritative working direction
- Created `docs/change-log.md` (this file)
- Created `docs/known-fragile-areas.md` listing systems that should not be touched first
- Created `docs/runtime-test-checklist.md` for pre-launch verification

**Why:**
The repo documentation (CLAUDE.md, README.md) still describes the old $20 standalone spin product.
The actual launch direction has shifted to a $50 combo (shirt + mystery hat) with a two-path model
(purchased + preview). This docs pass creates a single source of truth before implementation begins.

**Key direction captured:**
- $50 combo, not $20 spin
- 15-hat pool (was 5 placeholders, was briefly 20, settled at 15)
- 2 purchased spins, 1 preview spin
- Numeric spin count replaces boolean tags
- Durable hat persistence required for fulfillment
- Preview path is non-binding, refresh loophole acceptable
- Storefront wrapper is fragile, do not touch first

**What was NOT changed:**
- No runtime code changes
- No `src/main.js` edits
- No `api/` edits
- No `src/hats.js` edits
- CLAUDE.md not updated yet (intentionally deferred until implementation matches)
- README.md not updated yet (intentionally deferred until implementation matches)
