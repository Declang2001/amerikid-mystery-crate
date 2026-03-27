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
- [ ] Hat display rises from inside crate
- [ ] Hats cycle during spin with audio playing
- [ ] Spin lands on a hat (not stuck mid-cycle)
- [ ] Winner hat shows with glow pulse
- [ ] Result panel slides up showing hat image and name

---

## 3. Audio

- [ ] Spin audio plays during spin
- [ ] Open SFX plays on crate open
- [ ] Close SFX plays on crate close
- [ ] Audio stops cleanly when spin ends (no overlap or echo)
- [ ] **Iframe test:** "Tap to enable sound" overlay appears in iframe context
- [ ] **Iframe test:** Tapping overlay unlocks audio successfully
- [ ] **iOS Safari test:** Audio plays after user gesture in iframe

---

## 4. Preview Path (No Purchase)

- [ ] User can enter without `customer_id` param
- [ ] User gets 1 preview spin
- [ ] Preview spin plays full animation and reveals a hat
- [ ] After preview result, CTA shows "Proceed to Checkout" (or equivalent)
- [ ] Preview result is NOT persisted to Shopify
- [ ] Refreshing the page allows another preview spin (acceptable for launch)

---

## 5. Purchased Path (With Entitlement)

- [ ] User with valid `customer_id` and `crate_spins:2` can spin
- [ ] First spin decrements to `crate_spins:1`, reveals a hat
- [ ] After result reveal, crate stays open (no auto-close)
- [ ] After first result, user sees "Spin Again" and "Save Result" buttons
- [ ] "Spin Again" closes the crate, hides the hat, then starts the next spin cleanly
- [ ] "Spin Again" discards first result, consumes second spin, reveals new hat
- [ ] After second spin (0 spins left), only "Save Result" is available
- [ ] "Save Result" calls `/api/finalize`, writes `crate_hat_won:HAT-ID`
- [ ] Finalize also removes all `crate_spins:*` tags (no more spins possible)
- [ ] After finalize, spin button is disabled (spinsRemaining = 0, hatWon set)
- [ ] Double-clicking "Save Result" does not send two API calls
- [ ] If user saves after first spin (skipping second), second spin is forfeited
- [ ] `/api/finalize` rejects if hat already finalized (no overwrite)
- [ ] `/api/finalize` rejects invalid hat IDs (not in allowed set)

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
- [ ] Shopify Flow correctly adds entitlement on combo purchase (requires Shopify admin test)

---

## 9. Iframe / Embed Context

- [ ] Crate loads correctly inside Shopify storefront iframe
- [ ] `customer_id` param is received from iframe src URL
- [ ] No mixed-content or CSP errors in console
- [ ] Canvas renders at correct size within iframe
- [ ] Responsive layout works at mobile viewport inside iframe

---

## 10. State Machine Integrity

- [ ] Cannot spin while already spinning
- [ ] Cannot spin while crate is opening or closing
- [ ] Cannot finalize if no winner has been selected
- [ ] State transitions happen in correct order (no skipped states)
- [ ] Panel visibility matches current state
- [ ] Button enabled/disabled states match current state

---

## Notes

- Items marked with **Iframe test** or **iOS Safari test** require testing in the actual
  Shopify storefront embed, not just localhost
- Purchased path tests require valid Shopify credentials in Vercel env vars and a test
  customer with entitlement
- Some items in this checklist correspond to features that do not exist yet (spin count,
  durable persistence, preview CTA). Those items will fail until implementation is complete.
