# Change Log

All notable project decisions and implementation changes are documented here.
This log tracks direction changes, not just code commits.

---

## 2026-03-27 -- Support Arrangement Correction: Front Corner Support Read From the Live Camera

**Type:** Surgical support-arrangement correction. `src/main.js`, `docs/runtime-test-checklist.md`.

Corrected the previous support-arrangement pass by repositioning only the two added supports. The first arrangement increased support count, but the added blocks sat too far toward the side midpoints, so the live camera still read the crate as mainly resting on two center-ish supports. This correction keeps the original four hollow-core supports exactly where they were and moves only the two added supports forward and outward so the front-left and front-right lower corners now read as visibly supported from the current fixed camera.

The hollow-core cinder block builder is unchanged, the supports still live outside `crateRoot`, and `group.position.y = blockH` remains unchanged, so crate height and hat reveal height stay locked. The Tiny Realness contact shadow was left untouched because this correction only repositions the added visible supports and does not alter crate elevation or the core four-support grounding relationship.

What was not changed:
- `blockW`, `blockH`, or `blockD`
- The original four support placements or rotations
- Crate height or hat reveal height
- Camera behavior, cadence, crate-open behavior, or state machine behavior
- Contact-shadow logic
- Audio behavior and iframe unlock flow
- Button visibility rules, preview exact-hat checkout behavior, reveal ritual direction, question mark magic direction, UI polish direction, backend, Shopify, Flow, datasets, or the storefront wrapper

## 2026-03-27 -- Support Arrangement Pass: Additional Visible Side Supports Without Elevation Changes

**Type:** Surgical support-arrangement pass. `src/main.js`, `docs/runtime-test-checklist.md`.

Kept the existing four hollow-core cinder blocks exactly where they were and added two more supports total so more of the crate's support structure reads from the live front three-quarter camera angle. The new blocks reuse the same hollow-core cinder block builder, the same outer dimensions, and the same top support plane as the existing blocks. One new support was added on the left side and one on the right side, each placed between the current front and rear supports so the crate feels supported across more of its visible width without redistributing the original footprint.

The additional supports still live outside `crateRoot`, and `group.position.y = blockH` remains unchanged, so crate height and hat reveal height stay locked. The Tiny Realness contact shadow was left untouched in this first pass because the original four-support footprint remains in place and the new side supports sit within the broader existing underside grounding.

What was not changed:
- `blockW`, `blockH`, or `blockD`
- The original four support placements or rotations
- Crate height or hat reveal height
- Camera behavior, cadence, crate-open behavior, or state machine behavior
- Contact-shadow logic
- Audio behavior and iframe unlock flow
- Button visibility rules, preview exact-hat checkout behavior, reveal ritual direction, question mark magic direction, UI polish direction, backend, Shopify, Flow, datasets, or the storefront wrapper

## 2026-03-27 -- Support Block Realism Pass: Hollow-Core Cinder Block Read Without Elevation Changes

**Type:** Surgical support realism pass. `src/main.js`, `docs/runtime-test-checklist.md`.

Rebuilt the fallback support blocks in `src/main.js` so they read like hollow-core cinder blocks from the current front three-quarter camera instead of solid boxes with shallow fake top holes. The previous version was one solid block mesh with two dark top inserts. The new version keeps the exact same outer dimensions, the exact same four-support footprint, the same rotations, and the same placement, but assembles each support from simple box pieces only: outer shell walls, front and back rails, a center web, and dark interior cavity treatment for the two cores.

The support geometry still lives outside `crateRoot`, and `group.position.y = blockH` remains unchanged, so crate height and hat reveal height stay locked. The Tiny Realness contact shadow was left untouched because the support footprint did not move.

What was not changed:
- `blockW`, `blockH`, or `blockD`
- Support count, placement, or rotation
- Crate height or hat reveal height
- Contact-shadow logic or footprint alignment
- Camera behavior, cadence, crate-open behavior, or state machine behavior
- Audio behavior and iframe unlock flow
- Button visibility rules, preview exact-hat checkout behavior, reveal ritual direction, question mark magic direction, UI polish direction, backend, Shopify, Flow, datasets, or the storefront wrapper

## 2026-03-27 -- Tiny Realness Pass: Support-Aware Contact Shadow Only

**Type:** Surgical grounding pass. `src/main.js`, `docs/runtime-test-checklist.md`.

Retuned only the existing local contact shadow texture in `src/main.js` so the crate reads as more physically loaded onto its cinder-block supports without broadening into a new atmosphere or material pass. The old contact shadow was a clean radial ellipse. The new version keeps the same single canvas texture, the same contact-shadow plane, and the same multiply-blended rendering path, but layers in broader support pockets near the block footprint, a softer underside cradle, and a few restrained feathering smudges so the shadow no longer reads like a generic stamped oval.

No new geometry systems, no particles, no sprites, no post-processing, and no animated environmental cues were introduced. Cinder block placement, crate height, camera behavior, prompt positioning, reveal cadence, and all preview/purchased logic remain untouched.

What was not changed:
- Contact shadow mesh type or rendering approach
- Cinder block placement or crate height
- Atmosphere overlays or room-background readability
- Material direction beyond this shadow-shape refinement
- Spin cadence or duration math
- Hat reveal height or Y targets
- Crate-open behavior or state machine behavior
- Audio behavior and iframe unlock flow
- Question mark behavior, reveal ritual direction, UI polish direction, preview exact-hat checkout behavior, backend, Shopify, Flow, datasets, or the storefront wrapper

## 2026-03-27 -- UI Polish Pass: Stronger Panel Messaging and CTA Hierarchy

**Type:** Surgical UI presentation pass. `src/main.js`, `src/style.css`, `docs/runtime-test-checklist.md`.

Retuned only the existing result panel so it feels more intentional and premium without changing panel timing, button logic, or checkout flow. Added lightweight refs for the existing subtitle and result label, then introduced a small `updatePanelPresentation()` helper in `src/main.js` that derives panel copy and CSS-driving classes from the current state, preview vs purchased mode, entitlement state, and the current winning hat. The helper is called from the smallest safe touchpoints: `showHat()`, `setState()`, and `updateEligibilityUI()`.

The panel now communicates more clearly inside the existing layout. Preview results explicitly explain that checkout will use the exact revealed hat. Purchased results now distinguish between a current pick, a final hat, an in-progress save, and a saved result, which gives the purchased path a stronger locked-in confirmation using the existing panel only. Added class-driven CSS in `src/style.css` so the result card, result media, and existing CTA pair read with clearer hierarchy and slightly more premium framing. When both purchased actions are visible, "Save Result" reads as primary and "Spin Again" reads as secondary without altering visibility logic or labels.

What was not changed:
- Panel visibility timing or READY-state visibility
- Button visibility logic or accepted CTA labels
- Spin cadence or duration math
- Hat reveal height or Y targets
- Crate-open behavior or state machine behavior
- Audio behavior and iframe unlock flow
- Preview exact-hat checkout routing
- Reveal ritual direction, question mark magic direction, atmosphere direction, background readability, physical/material direction, backend, Shopify, Flow, datasets, or the storefront wrapper

## 2026-03-27 -- Question Mark Magic Pass: Layered Glow Energy Without Logic Changes

**Type:** Surgical visual enhancement pass. `src/main.js`, `docs/runtime-test-checklist.md`.

Retuned only the lid question mark glow layer so it feels more magical and alive without touching the readable base decal, the state machine, or the winner reveal logic. The glow now uses a composite energy signal built from the existing slow pulse, a small secondary micro-pulse, and the existing crate leak/flicker relationship. That energy now drives both glow opacity and a restrained glow-mesh scale breath, keeping the lid feeling charged while preserving the established yellow/gold question mark look.

The readable decal remains unchanged, visibility rules remain unchanged, and no new particles, aura planes, or rendering systems were introduced. The winner reveal remains the dominant payoff moment because the question mark pass does not hook into `winnerRevealImpulse`.

What was not changed:
- Spin cadence or duration math
- Hat reveal height or Y targets
- Crate-open behavior or state machine behavior
- Audio behavior and iframe unlock flow
- Question mark visibility rules
- Button visibility rules
- Preview exact-hat checkout behavior
- Reveal ritual direction
- Backend, Shopify, Flow, datasets, atmosphere direction, background readability, physical/material direction, or the storefront wrapper

## 2026-03-27 -- Reveal Ritual Pass: Winner Impact Beat Without Flow Changes

**Type:** Surgical visual enhancement pass. `src/main.js`, `src/style.css`, `docs/runtime-test-checklist.md`.

Added a dedicated winner-only reveal impulse that fires only when the state enters `WINNER_SELECTED`. The new pass reuses the existing hat scale, hat glow, and crate internal light rather than introducing new systems. On landing, the winning hat gets a short overshoot, the glow plane blooms brighter and slightly larger, and the crate interior punches brighter for a brief payoff beat before settling back into the accepted held-open winner presentation.

Added one small panel-side accent so the result card feels tied to the landing moment. The card now gets a restrained one-shot pulse on winner reveal using the existing layout and styling language. No new UI blocks, no extra controls, and no separate polish layer were introduced.

What was not changed:
- Spin cadence or duration math
- Hat reveal height or Y targets
- Crate-open behavior or state machine behavior
- Audio behavior and iframe unlock flow
- Question mark behavior
- Button visibility rules
- Preview exact-hat checkout behavior
- Backend, Shopify, Flow, datasets, atmosphere direction, background readability, physical/material direction, or the storefront wrapper

## 2026-03-27 -- Physical Crate / Material Pass: Heavier Wood, Cleaner Hardware, Stronger Grounding

**Type:** Surgical visual enhancement pass. `src/main.js`, `docs/runtime-test-checklist.md`.

Retuned the fallback procedural crate so it reads denser and more tactile without changing its silhouette, state flow, or lid timing. The procedural wood texture now carries slightly deeper grain, darker board-edge wear, and mild stain variation. The crate surfaces also now use a few closely related wood material variants with offset grain so the planks do not read as a single flat repeat.

Added low-risk physical detail to the crate body itself: subtle seam shadowing around the lid-body break, faint lid plank seam lines on the top surface, stronger but still restrained hardware materials, small bolt heads on the latch, straps, and hinges, plus pinned side handles so the rope reads attached instead of floating. The local contact shadow under the crate was also tightened to give the crate a little more weight on its supports.

What was not changed:
- Spin cadence
- Lid-open behavior or state machine logic
- Audio behavior and iframe unlock flow
- Question mark behavior
- Button visibility rules
- Preview exact-hat checkout behavior
- Atmosphere direction beyond crate readability support
- Backend, Shopify, Flow, datasets, and the storefront wrapper

## 2026-03-27 -- Restore Room Background Readability After Atmosphere Pass

**Type:** Surgical visual correction. `src/main.js`, `docs/runtime-test-checklist.md`.

Kept the darker lighting, fog, and vignette direction from the atmosphere pass, but stopped applying scene fog to the inside-out `room.png` background sphere itself. The previous fog settings were appropriate for scene depth, but because the room image lives on a large enclosing sphere, it was being blended heavily toward the fog color and reading as swallowed. The room image system remains intact and visible, while fog still shapes the foreground scene.

Added an explicit runtime checklist item to confirm the background image stays readable behind the crate after atmosphere tuning.

What was not changed:
- Spin cadence
- Hat reveal height
- Crate-open behavior
- Audio behavior and iframe unlock flow
- Question mark behavior
- Button visibility rules
- Preview exact-hat checkout implementation
- Backend, Shopify, Flow, datasets, and the storefront wrapper

---

## 2026-03-27 -- Atmosphere Pass: Moodier Lighting, Subtle Fog, Safe Vignette

**Type:** Focused visual enhancement pass. `src/main.js`, `src/style.css`, docs updates.

Retuned the scene atmosphere without touching crate logic or checkout behavior. Ambient light was lowered and cooled so the crate reads with more depth, the key light was nudged brighter and more forward to keep the crate legible, and the existing cool fill was strengthened and repositioned to preserve dimensional contrast. Added a subtle linear scene fog in `src/main.js` so the room falls off darker behind the crate. Increased the floor shadow receiver opacity slightly to anchor the crate without changing the crate asset itself.

Added a lightweight CSS-only atmosphere layer in `src/style.css` using gradient overlays only. `#scene-root::before` adds a restrained central stage glow and upper-room darkening, while `#scene-root::after` adds a soft vignette. No post-processing, bloom, particles, or heavy runtime effects were introduced.

What was not changed:
- Spin cadence
- Hat reveal height
- Crate state machine
- Button visibility rules
- Audio behavior and iframe unlock flow
- Preview exact-hat checkout implementation
- Purchased entitlement / finalize logic
- Procedural crate construction and Shopify wrapper

---

## 2026-03-27 -- Preview Checkout Uses Exact Shopify Hat Variants

**Type:** Variant mapping + preview forward-action fix. `src/hats.js`, `src/main.js`, docs updates.

Added `shopifyVariantId` to all 15 hats in `src/hats.js` using the exact Shopify variant IDs from the hidden mystery hat product. Updated the preview-only "Proceed to Checkout" path in `src/main.js` so it now builds a Shopify cart permalink for the revealed hat (`/cart/{variant_id}:1`) and redirects there after the existing claim/close flow starts. Storefront origin is resolved from the iframe referrer in the Shopify wrapper, with query-param fallback support for `shop_origin`, `shopify_origin`, or `shop` if needed.

What was not changed:
- Purchased combo finalize/save logic
- Spin cadence, hat reveal height, audio behavior, question mark behavior
- Shopify storefront wrapper

## 2026-03-27 -- Lid Question Marks Visible in All States Including CLAIMED

**Type:** Visual fix. `src/main.js` animate loop.

Removed the last remaining state-based hide condition (`currentState !== STATES.CLAIMED`). The animate loop now calls `setQuestionMarksVisible(true)` unconditionally every frame. The question marks stay on the lid in every state, including after finalize. The `depthTest: true` setting from the previous pass continues to prevent bleed-through over the hat display.

---

## 2026-03-27 -- Lid Question Marks Stay Visible During Open

**Type:** Visual fix. `src/main.js` animate loop + question mark materials.

The glowing question marks on the lid were explicitly hidden every frame during OPENING, SPINNING, and WINNER_SELECTED states. That hide rule existed because the materials used `depthTest: false`, which caused them to render on top of the hat display (bleed-through). Fix: changed both question mark materials (`qDecalMat` and `questionMarkGlowMat`) from `depthTest: false` to `depthTest: true`, then simplified the visibility rule to `currentState !== STATES.CLAIMED`. The question marks now stay visible on the lid as it opens and throughout the spin, while the depth buffer naturally prevents them from drawing over the hat.

---

## 2026-03-27 -- Claim SFX Audit: Confirmed on All Finalize Paths

**Type:** Audio behavior audit. `src/main.js` `claimBtn` click handler.

Audited all finalize/forward-action paths. Both the purchased path ("Save Result") and preview path ("Proceed to Checkout") already call `playSfx(claimSfx, 1)` before `setState(STATES.CLAIMING)`. No code change was needed. Duplicate playback is prevented by the state guard at the top of the handler: after the first click, `setState(STATES.CLAIMING)` runs synchronously, so any second click sees CLAIMING and exits early. The purchased path has an additional `finalizeInProgress` flag guard. Added explicit checklist items to `docs/runtime-test-checklist.md` to lock this behavior going forward.

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
