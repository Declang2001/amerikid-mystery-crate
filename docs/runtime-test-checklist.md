# Runtime Test Checklist

Use this checklist before any launch or after significant implementation changes.
Each item should be tested manually unless automated tests exist.

---

## 1. Basic Crate Experience

- [ ] Page loads without JS errors in console
- [ ] 3D crate renders (fallback or .glb)
- [ ] Initial black screen appears before the crate arrival begins
- [ ] Black screen shows only: kicker "Dark Aether Uplink", title "Candy Facts Mystery Box", and one CTA button. No support/body copy.
- [ ] Black-screen CTA reads "Click To Enter" when enabled, "Loading..." while scene/media loads
- [ ] Black-screen CTA enables only after the scene is ready and the idle portal feed is ready enough to start cleanly
- [ ] First click on the black-screen button unlocks audio and starts the fullscreen looping idle portal video
- [ ] Idle portal video preserves its embedded audio and loops cleanly
- [ ] Idle overlay shows: kicker "Dark Aether Feed", title "Candy Facts Mystery Box", button "Enter Portal"
- [ ] "Enter Portal" appears only over the idle portal video
- [ ] Idle video hard-cuts directly into the walk-in portal video with no fade
- [ ] Walk-in portal video preserves its embedded audio
- [ ] Walk video fades out near its tail end (~2s before end) via boot-layer opacity transition
- [ ] Crate scene and camera intro begin underneath during the walk video fade
- [ ] No second portal reveal or flash occurs after the walk video
- [ ] Walk video audio plays through the fade and is not cut early
- [ ] Boot layer is fully removed after fade completes and video ends
- [ ] Camera intro tilt completes (~1.5 seconds)
- [ ] Idle bob begins after intro
- [ ] Accepted camera arrival still lands on the same idle look-down READY view after the portal handoff
- [ ] Press X prompt stays hidden until the walk video and crate intro have both completed
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
- [ ] Two consecutive spins feel noticeably different in timing (varied pause before reel, varied reel length)
- [ ] Spin starts with a visible wind-up (hats accelerate from standstill, not instant full speed)
- [ ] Winning hat gets a multi-phase reveal: sharp impact beat, held "offering" sustain, then a clean settle into the hold state (no single short flash)
- [ ] Crate internal light flashes crisply at the landing moment and does not stay blown out through the full sustain
- [ ] Winner glow shifts away from the crate's pink spin language into a warm gold grail language within the first ~320 ms of landing
- [ ] Winner outline promotes from the functional black spin rim to a bright warm rim during hold (color, opacity, and scale all shift)
- [ ] Winner hold glow reads as steady and authoritative, not as a soft crate-breathing pulse
- [ ] Winning reveal settles cleanly back to the accepted held-open winner state without changing cadence or height
- [ ] Gold prestige language persists across auto-close into WINNER_PENDING_CLAIM and through CLAIMING / CLOSING until a fresh spin starts
- [ ] Triggering a fresh spin (Spin Again) resets the glow back to the pink spin language before the next reel starts
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
- [ ] Ambient background loop starts when idle video begins and plays continuously through all phases
- [ ] Ambient is clearly softer than spin audio and SFX
- [ ] Ambient volume drops when the crate scene takes over from the portal videos

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
- [ ] Signed-in customer with `crate_hat_won` tag and 0 spins enters preview mode (not dead-end purchased path)
- [ ] Signed-in customer in post-purchase preview mode gets 1 non-binding preview spin
- [ ] Signed-in customer in post-purchase preview mode sees "Proceed to Checkout" (not "Save Result")
- [ ] Post-purchase preview spin does NOT overwrite or affect the existing saved `crate_hat_won` tag

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
- [ ] Purchased spin is never consumed if hat availability check fails or returns empty

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
- [ ] The live camera now reads a denser support bed with at least 6 clearly readable cinder blocks under the crate
- [ ] Visible support presence reads across front-left, front-center, and front-right rather than collapsing into just two obvious supports
- [ ] Added supports keep the same top support plane and do not create a grounding mismatch against the existing contact shadow
- [ ] Wood now carries darker lower-plank grime, seam-edge breakup, and rubbed corners without muddying the crate silhouette
- [ ] The front hazard stencil reads worn, chipped, and rubbed instead of freshly painted
- [ ] Hardware feels slightly heavier and more field-used without collapsing into noisy dark shapes on mobile
- [ ] Floor grime and debris planes add world story near the crate base without z-fighting, clipping into blocks, or stealing focus from the hat reveal
- [ ] Lid open timing and motion still match the accepted cadence after the material pass

---

## 13. Inventory-Aware Hat Pool

- [ ] `read_products` scope added to Partners app and verified via Client Credentials Grant
- [ ] Hidden mystery-hat product variant IDs in `api/_lib/allowed-hats.js` match the Shopify admin
- [ ] `GET /api/available-hats` returns correct hat IDs for current inventory state
- [ ] `GET /api/available-hats` returns empty `available` array when all 15 variants have 0 inventory
- [ ] `GET /api/available-hats` CORS headers match existing endpoint pattern
- [ ] Combo spin winner is always from the available set
- [ ] Preview spin winner is always from the available set
- [ ] Setting one variant to 0 inventory removes that hat from possible spin outcomes
- [ ] Spin blocked with alert when available set is empty
- [ ] Spin blocked with alert when `/api/available-hats` fetch fails
- [ ] Spin animation reel still cycles all 15 hats visually
- [ ] No visual/audio/cadence/camera changes from this pass
- [ ] Preview exact-hat checkout wiring unchanged
- [ ] Purchased finalize wiring unchanged
- [ ] State machine unchanged
- [ ] Portal flow unchanged
- [ ] Storefront wrapper unchanged

---

## 14. Tactical HUD polish

- [ ] Black-screen boot card shows four thin amber L-shaped corner brackets framing the card
- [ ] Black-screen boot card shows a very subtle horizontal scanline overlay inside the frame
- [ ] Black-screen boot card still shows only: kicker "Dark Aether Uplink" (bracketed with `[` `]`), title "Candy Facts Mystery Box", and one CTA button. No support/body copy was introduced
- [ ] Black-screen CTA reads "Click To Enter" when enabled and "Loading..." while loading (unchanged)
- [ ] Black-screen CTA has beveled top-right and bottom-left corners, amber bottom-bar glow, Black Ops One font
- [ ] Idle-video overlay card appears as a tactical readout at the bottom of the portal video with amber corner brackets, thin amber border, translucent dark gradient background
- [ ] Idle-video overlay still shows only: kicker "Dark Aether Feed" (bracketed), title "Candy Facts Mystery Box", button "Enter Portal"
- [ ] Idle-video overlay does not cover more than the bottom of the video
- [ ] "Enter Portal" button has the same tactical bevel + amber language as the boot-screen CTA
- [ ] Post-spin result panel shows amber corner brackets framing the whole panel
- [ ] Post-spin result card shows its own amber corner brackets framing the hat image and title block
- [ ] Panel title "CANDY FACTS MYSTERY BOX" renders in Black Ops One
- [ ] Winning hat name (`#resultName`) renders in Black Ops One with a subtle amber text-shadow
- [ ] `.label` chip ("Winner" / "Final Hat" / etc) reads as a sharp tactical chip with amber border and amber glow on purchased path
- [ ] `.label` chip reads cyan when in preview-result state
- [ ] `.label` chip reads gold when in claimed-result state
- [ ] `.status-line` reads as a tactical monospace strip with amber border
- [ ] Purchased path: `#claimBtn` ("Save Result") renders with warm amber gradient, gold text-shadow, and amber rim on hover
- [ ] Preview path: `#claimBtn` ("Proceed to Checkout") renders with cool cyan gradient, cyan text-shadow, and cyan rim on hover
- [ ] `.controls button` elements have beveled top-right and bottom-left corners via clip-path
- [ ] Button text "Save Result", "Proceed to Checkout", "Spin Again", "Spin" is unchanged
- [ ] Button visibility logic is unchanged (purchased / preview / has-secondary-action / claimed flows all behave identically)
- [ ] When the panel becomes visible, `.panel-header` and `.controls` fade-up from 6px below with a subtle 120 ms / 220 ms stagger
- [ ] The already-accepted `.result-card` winner-reveal 520 ms keyframe still plays on top of the stagger
- [ ] Panel HUD frame brackets pulse subtly (~2.4 s loop) during `.panel.winner-reveal` and `.panel.claimed-result` states
- [ ] Panel HUD frame brackets are cyan during `.panel.preview-result`
- [ ] Panel HUD frame brackets stay amber in default / purchased-result states
- [ ] Panel HUD frame brackets do not overlap or cover any button or text content
- [ ] No scrollbars or layout shift introduced by the HUD frame overlay on desktop
- [ ] No scrollbars or layout shift introduced by the HUD frame overlay on mobile iframe
- [ ] Mobile `(max-width: 820px)`: corner brackets shrink to ~16 px, stroke width 1.4 px, kicker tracking tightens
- [ ] Mobile `(max-width: 820px)`: Black Ops One titles remain readable and do not clip
- [ ] Mobile iframe: button clip-path bevels render cleanly without cutting visible text
- [ ] Iframe context: no mixed-content or CSP errors from the new CSS
- [ ] Spin timing, spin cadence, audio, and the entire state machine are visibly identical
- [ ] Winner-only 3D prestige pass (gold glow, impact/sustain/settle envelope, crate light flash) is visibly identical

---

## Notes

- Items marked with **Iframe test** or **iOS Safari test** require testing in the actual
  Shopify storefront embed, not just localhost
- Purchased path tests require valid Shopify credentials in Vercel env vars and a test
  customer with entitlement
- Some items in this checklist correspond to features that do not exist yet (spin count,
  durable persistence, preview CTA). Those items will fail until implementation is complete.
- Inventory-aware pool tests require `read_products` scope and valid inventory data on the
  hidden mystery-hat product
