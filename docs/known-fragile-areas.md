# Known Fragile Areas

Systems and files that should not be modified casually.
Read this before touching anything outside the normal implementation path.

---

## 1. Shopify Storefront Wrapper

**What:** The Shopify theme template `templates/page.mystery-box.json` and its referenced section(s)
render the mystery-box storefront page. This page loads the Vercel crate app inside a direct iframe.

**Why it is fragile:**
- The wrapper is currently hard-locked with an "Unlocking soon." overlay
- It passes `customer_id` and optional `demo=1` to the iframe via URL params
- It does not verify purchase, order, or entitlement
- Modifying the wrapper risks breaking the only storefront entry point to the crate
- The wrapper lives in Shopify theme code, not in this repo

**Rule:** Do not touch the iframe wrapper first. Implement new logic in the Vercel app and
Shopify admin flow before changing the Shopify page shell.

---

## 2. Iframe Audio Unlock System

**What:** `src/main.js` lines ~271-492. The audio unlock system handles browser autoplay
restrictions, especially in iframe/embed contexts.

**Why it is fragile:**
- Safari and iOS have strict autoplay policies that differ from Chrome
- The system uses a multi-element unlock pattern (spinAudio, openSfx, closeSfx, claimSfx)
- A "Tap to enable sound" overlay is shown only in iframe contexts
- The unlock logic uses synchronous play/pause/restore within user gesture call stacks
- Passive unlock listeners fire on any pointerdown/touchstart
- Changing the unlock flow or event listener order can silently break audio on iOS

**Rule:** Do not refactor the audio unlock system unless audio is confirmed broken.
Test any changes on iOS Safari in an iframe context before merging.

---

## 3. State Machine Transitions

**What:** `src/main.js` lines ~737-746 (STATES object) and the `setState()` function,
plus all state-dependent logic scattered through the file.

**Why it is fragile:**
- Multiple systems read `currentState` directly: button visibility, hat display, question marks,
  press X prompt, audio safety stop, crate glow, spin animation
- Adding or renaming states requires updating every consumer
- The `updateControls()` function at line ~842 has hardcoded state checks for button text and
  disabled state that reflect old "claim" copy
- The auto-close timer (`scheduleAutoClose` at line ~793) transitions from `WINNER_SELECTED`
  to `CLOSING` to `WINNER_PENDING_CLAIM` on a 2.5-second delay

**Rule:** When adding new states or modifying transitions, grep for every reference to the
old state name. The state machine is not centralized; its consumers are spread across the file.

---

## 4. Camera and 3D Scene Positioning

**What:** Camera position, intro animation, idle bob, and prompt positioning logic.

**Why it is fragile:**
- Camera is fixed at `(0, 4.0, 6.0)` with no translation (only lookAt modulation)
- Background is `scene.background` via an inside-out sphere, not parented to camera
- Any camera translation causes apparent crate motion against the static background
- Press X prompt position is world-to-screen projected every frame from crate bounding box
- Hat display position is calculated from crate bounding box each frame

**Rule:** Do not translate the camera. Use lookAt target modulation only.
If prompt positioning jitters, add lerp smoothing, do not move the camera.

---

## 5. Fallback Crate Procedural Generation

**What:** `src/main.js` lines ~1700-2398. The `createFallbackCrate()` function generates
a procedural wooden crate with textures, hardware, question marks, crack lighting, etc.

**Why it is fragile:**
- This is ~700 lines of procedural geometry and texture generation
- It creates multiple sub-objects (lid pivot, question marks, crack materials, internal light)
- Other systems reference these objects by variable name (e.g., `fallbackLidPivot`,
  `lidQuestionMarks`, `crateInternalLight`, `crateCrackMaterials`)
- The fallback is always active today because no `crate.glb` model exists in `public/models/`

**Rule:** Do not modify the fallback crate unless you are replacing it with a real .glb model.
If you add a .glb model, the fallback code can remain as-is (it only runs on load failure).

---

## 6. Client Credentials Grant Token Caching

**What:** `api/_lib/shopify.js` lines 14-64. Module-scope token cache with expiry buffer.

**Why it is fragile:**
- Token is cached in module scope (`cachedToken`, `cachedExpiresAt`)
- Vercel serverless functions are stateless; cache only survives within a warm invocation
- Every cold start mints a new token (extra round-trip to Shopify)
- If credentials are rotated in Partners dashboard, cached tokens may fail until the function
  cold-starts again (unlikely but possible race)

**Rule:** Do not add a persistent external cache (Redis, etc.) for launch. The current
pattern is adequate. If you change credential env vars, re-deploy to force cold starts.

---

## 7. CORS Configuration

**What:** All three API endpoint files (`api/eligibility.js`, `api/consume-spin.js`,
`api/claim-spin.js`) set `Access-Control-Allow-Origin: *`.

**Why it is fragile for production:**
- Wide-open CORS means any website can call these endpoints
- A malicious site could consume or claim spins for any customer ID
- This is acceptable for development but should be tightened before production launch

**Rule:** Before production launch, restrict the origin to the Shopify storefront domain
and the Vercel deployment domain. Do not tighten during development if it would break
local testing.
