# Runtime Test Checklist

Use this checklist before any launch or after significant implementation changes.
Each item should be tested manually unless automated tests exist.

---

## 1. Basic Crate Experience

- [ ] Page loads without JS errors in console
- [ ] 3D crate renders (fallback or .glb)
- [ ] Camera intro tilt completes (~1.5 seconds)
- [ ] Idle bob begins after intro
- [ ] Press X prompt appears after intro
- [ ] Press X prompt is positioned on the crate front face, not floating

---

## 2. Spin Flow

- [ ] Pressing X / clicking prompt / tapping canvas triggers spin
- [ ] Crate lid opens with open SFX
- [ ] Glowing question marks stay visible on the lid surface in all states (open, spin, claimed)
- [ ] Question marks do not bleed through or draw over the hat display
- [ ] Question mark glow feels more alive through layered pulse and subtle scale breathing while the readable yellow/gold decal stays stable
- [ ] Question mark energy remains secondary to the winner hat reveal and does not overpower the reveal ritual beat
- [ ] Hat display rises from inside crate
- [ ] Hats cycle during spin with audio playing
- [ ] Spin lands on a hat (not stuck mid-cycle)
- [ ] Winning hat gets a brief reveal impact beat on landing (extra scale, glow burst, and crate light pulse)
- [ ] Winning reveal settles cleanly back to the accepted held-open winner state without changing cadence or height
- [ ] Winner hat shows with glow pulse
- [ ] Result panel slides up showing hat image and name
- [ ] Result card gets a subtle winner accent without shifting layout or affecting button visibility
- [ ] Result panel copy changes by state without changing panel timing or introducing any new controls
- [ ] Result card and result media feel more premium while keeping the crate as the visual focal point

---

## 3. Audio

- [ ] Spin audio plays during spin
- [ ] Open SFX plays on every crate open (spin start, Spin Again re-open, Open button)
- [ ] Close SFX plays on every crate close (Spin Again, Save Result, Proceed to Checkout, Close button)
- [ ] Claim SFX plays on every finalize action (Save Result on purchased path, Proceed to Checkout on preview path)
- [ ] Claim SFX does not double-play on rapid clicks (state guard blocks re-entry)
- [ ] Audio stops cleanly when spin ends (no overlap or echo)
- [ ] **Iframe test:** "Tap to enable sound" overlay appears in iframe context
- [ ] **Iframe test:** Tapping overlay unlocks audio successfully
- [ ] **iOS Safari test:** Audio plays after user gesture in iframe

---

## 4. Preview Path (No Purchase)

- [ ] User can enter without `customer_id` param
- [ ] User gets 1 preview spin
- [ ] Preview spin plays full animation and reveals a hat
- [ ] After preview result, only "Proceed to Checkout" is visible (no Spin Again, no generic spin button)
- [ ] Preview result panel clearly communicates that Proceed to Checkout forwards the exact revealed hat
- [ ] Clicking "Proceed to Checkout" closes the crate, then redirects to Shopify using the exact revealed hat variant ID with quantity 1
- [ ] Shopify checkout contains the exact revealed hat variant, not a generic mystery hat product or wrong variant
- [ ] Preview result is NOT persisted to Shopify
- [ ] Refreshing the page allows another preview spin (acceptable for launch)

---

## 5. Purchased Path (With Entitlement)

- [ ] User with valid `customer_id` and `crate_spins:2` can spin
- [ ] First spin decrements to `crate_spins:1`, reveals a hat
- [ ] After result reveal, crate stays open (no auto-close)
- [ ] After first result (1 spin remaining), user sees both "Spin Again" and "Save Result"
- [ ] When both purchased actions are visible, "Save Result" reads as the primary action and "Spin Again" reads as the secondary action without changing the button set
- [ ] "Spin Again" is hidden when no purchased spins remain
- [ ] "Spin Again" closes the crate, hides the hat, then starts the next spin cleanly
- [ ] "Spin Again" discards first result, consumes second spin, reveals new hat
- [ ] After second spin (0 spins left), only "Save Result" is visible (no Spin Again)
- [ ] "Save Result" calls `/api/finalize`, writes `crate_hat_won:HAT-ID`
- [ ] Finalize also removes all `crate_spins:*` tags (no more spins possible)
- [ ] After finalize, spin button is disabled (spinsRemaining = 0, hatWon set)
- [ ] Double-clicking "Save Result" does not send two API calls
- [ ] If user saves after first spin (skipping second), second spin is forfeited
- [ ] `/api/finalize` rejects if hat already finalized (no overwrite)
- [ ] `/api/finalize` rejects invalid hat IDs (not in allowed set)
- [ ] After finalize, the existing panel gives a stronger locked-in confirmation without any modal, overlay, or extra step

---

## 6. Entitlement Edge Cases

- [ ] User with 0 spins remaining cannot spin
- [ ] User who closes tab mid-spin can recover (re-entry with `spin_in_progress` or equivalent)
- [ ] Double-click on spin button does not consume two spins
- [ ] Double-click on finalize button does not send two API calls
- [ ] API returns clear error if customer ID is invalid
- [ ] API returns clear error if customer has no entitlement

---

## 7. API Endpoints

- [ ] `GET /api/eligibility?customer_id=X` returns correct status
- [ ] `POST /api/consume-spin` decrements spin count (or equivalent)
- [ ] `POST /api/claim-spin` (or equivalent finalize endpoint) persists hat ID
- [ ] All endpoints return proper CORS headers
- [ ] All endpoints return 400 on missing `customer_id`
- [ ] All endpoints return 500 with generic error on Shopify API failure (no credential leak)

---

## 8. Shopify Integration

- [ ] Client Credentials Grant successfully mints a token
- [ ] Token is used for customer read/write operations
- [ ] Customer metafield (or tag) is written with correct hat ID after finalize
- [ ] Preview checkout cart permalink uses the `shopifyVariantId` mapped to the revealed hat in `src/hats.js`
- [ ] Shopify Flow correctly adds entitlement on combo purchase (requires Shopify admin test)

---

## 9. Iframe / Embed Context

- [ ] Crate loads correctly inside Shopify storefront iframe
- [ ] `customer_id` param is received from iframe src URL
- [ ] No mixed-content or CSP errors in console
- [ ] Canvas renders at correct size within iframe
- [ ] Responsive layout works at mobile viewport inside iframe
- [ ] Question mark glow animation remains smooth in mobile iframe context with no flashing or alias shimmer
- [ ] Winner reveal effect remains smooth in mobile iframe context with no obvious frame drops or flashing
- [ ] Polished panel layout remains readable and unclipped in mobile iframe context, including long subtitle and status copy

---

## 10. State Machine Integrity

- [ ] Cannot spin while already spinning
- [ ] Cannot spin while crate is opening or closing
- [ ] Cannot finalize if no winner has been selected
- [ ] State transitions happen in correct order (no skipped states)
- [ ] Panel visibility matches current state
- [ ] Button enabled/disabled states match current state

---

## 11. Atmosphere Pass

- [ ] Crate reads darker and moodier, but the wood, lid, and winner hat remain clearly readable
- [ ] Room/background image remains visibly readable behind the crate instead of collapsing into flat fog color
- [ ] Subtle fog deepens the room without obscuring the crate, hat reveal, or Press X prompt
- [ ] Vignette darkens the screen edges without covering button text, result UI, or causing banding on mobile
- [ ] Crate remains the visual focal point on both desktop and mobile iframe layouts

---

## 12. Physical Material Pass

- [ ] Wood planks show subtle contrast and tactile variation without changing the accepted crate shape
- [ ] Lid seams and body seams read deeper while question marks remain clean and fully readable
- [ ] Hardware, latch, hinges, and side handles read clearly on desktop and mobile iframe layouts
- [ ] Crate feels more grounded through local shadowing without swallowing the cinder blocks or room background
- [ ] Local contact shadow reads as support-aware weight on the cinder blocks instead of a generic soft oval
- [ ] Support pockets feel natural and slightly irregular without looking like painted blobs on the block tops
- [ ] Support blocks read as real hollow-core cinder blocks from the front three-quarter camera instead of solid boxes with fake top holes
- [ ] Support block realism preserves the exact crate elevation and does not change the hat reveal height
- [ ] Lid open timing and motion still match the accepted cadence after the material pass

---

## Notes

- Items marked with **Iframe test** or **iOS Safari test** require testing in the actual
  Shopify storefront embed, not just localhost
- Purchased path tests require valid Shopify credentials in Vercel env vars and a test
  customer with entitlement
- Some items in this checklist correspond to features that do not exist yet (spin count,
  durable persistence, preview CTA). Those items will fail until implementation is complete.
