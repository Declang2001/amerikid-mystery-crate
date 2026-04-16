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
- [ ] Close SFX plays on every crate close (Spin Again, Save Result, SELECT HAT, Close button)
- [ ] Claim SFX plays on every finalize action (Save Result on purchased path, SELECT HAT on preview path)
- [ ] Claim SFX does not double-play on rapid clicks (state guard blocks re-entry)
- [ ] Audio stops cleanly when spin ends (no overlap or echo)
- [ ] **Iframe test:** "Tap to enable sound" overlay appears in iframe context
- [ ] **Iframe test:** Tapping overlay unlocks audio successfully
- [ ] **iOS Safari test:** Audio plays after user gesture in iframe
- [ ] Ambient background loop starts when idle video begins and plays continuously through all phases
- [ ] Ambient is clearly softer than spin audio and SFX
- [ ] Ambient volume drops when the crate scene takes over from the portal videos
- [ ] Click SFX plays on explicit UI button taps: Click To Enter, Enter Portal, Continue (saved-hat and preview confirm), size option buttons (S/M/L/XL/2XL), GO TO CHECKOUT, Spin / Spin Again
- [ ] Click SFX does NOT play on Press X prompt, canvas click, keyboard X press, or Save Result / SELECT HAT (claim SFX already covers those)
- [ ] Click SFX volume sits well under open/close/claim SFX (plays at 0.12) so it registers as a subtle tap rather than a loud pop
- [ ] First click SFX plays immediately on the first button tap of a session (no perceptible decode lag; `clickSfx.preload='auto'`)
- [ ] Click SFX respects the existing audio unlock flow (no playback before first user gesture; unlocks alongside other SFX)

---

## 4. Preview Path (No Purchase)

- [ ] User can enter without `customer_id` param
- [ ] User gets 1 preview spin
- [ ] Preview spin plays full animation and reveals a hat
- [ ] After preview result, only "SELECT HAT" is visible (no Spin Again, no generic spin button)
- [ ] Preview result panel copy does NOT imply the exact revealed hat is added to checkout (no "this exact hat" wording)
- [ ] Preview result panel reads "Preview only. Select this hat and pick a size to take it into checkout." with a "Preview Only" label chip
- [ ] Preview status strip reads "SELECT HAT confirms this preview pick"
- [ ] Clicking "SELECT HAT" does NOT redirect immediately; it opens the preview-only confirmation overlay after closing the crate
- [ ] Preview confirm overlay shows kicker `PREVIEW SELECTED` (rendered with `[ ]` brackets from CSS), the landed hat image, the landed hat name, body copy `THIS IS THE HAT YOU'RE TAKING INTO CHECKOUT.`, and CTA `CONTINUE`
- [ ] Preview overlay copy never reads "saved", "finalized", "claimed", or "locked in"
- [ ] Preview overlay does NOT write `crate.savedHat.pending` sessionStorage and does NOT set the purchased single-show flag
- [ ] Clicking `CONTINUE` hides the confirm overlay and opens the shirt-size overlay (`#sizeSelectOverlay`)
- [ ] Size overlay shows the CandyFACTS combo product image (Shopify CDN `CandyFACTS_Combo.png`) centered between the subcopy and the size options
- [ ] Combo image is lazy-loaded (does not block popup open) and does not cause layout shift when it resolves
- [ ] Combo image is capped at ~120px on desktop and ~96px on mobile (<=820px iframe viewport); does not overflow the card; drop-shadow is subtle and matches HUD language
- [ ] Combo image survives repeated overlay opens without a flicker (inner `#sizeSelectOptions` rebuild does not touch the image element)
- [ ] Size overlay shows five options: S, M, L, XL, 2XL rendered as tactical option buttons
- [ ] On desktop, the five size buttons render on a single row (CSS grid `repeat(5, minmax(0, 1fr))`) without wrapping or overflow
- [ ] On mobile (<=820px viewport), the size buttons render on two rows at most (CSS grid `repeat(3, minmax(0, 1fr))`)
- [ ] The size-select card fits inside short mobile iframe viewports without vertical scroll (compacted padding, gap, and image size)
- [ ] `GO TO CHECKOUT` CTA is disabled until a size is selected; selecting a size enables it and marks only that option active
- [ ] Clicking `GO TO CHECKOUT` redirects top-frame to `https://amerikid.ca/cart/<comboVariantId>:1?properties=<URL-escaped base64 of {"_preview_hat_id":"<HAT-ID>"}>`
- [ ] Variant ID in the URL matches the selected size: S=51878170034456, M=51878170067224, L=51878170099992, XL=51878170132760, 2XL=51878170165528
- [ ] The `properties` query param base64-decodes to JSON `{"_preview_hat_id":"<HAT-ID>"}` where `<HAT-ID>` matches the landed hat in `src/hats.js`
- [ ] Shopify does NOT return an error page after the redirect (previous URL-encoded-JSON payload produced an error on this store; base64 matches the verified working pattern)
- [ ] Redirect uses `window.top.location.href` when embedded (iframe context) and `window.location.href` otherwise
- [ ] Shopify destination is the direct cart permalink (not the combo product page, not the hidden mystery-hat variant permalink)
- [ ] Cart on Shopify shows the combo variant with `_preview_hat_id` as a line-item property after the redirect lands
- [ ] Preview result is NOT persisted to Shopify
- [ ] Refreshing the page allows another preview spin (acceptable for launch)
- [ ] Signed-in customer with `crate_hat_won` tag and 0 spins enters preview mode (not dead-end purchased path)
- [ ] Signed-in customer in post-purchase preview mode gets 1 non-binding preview spin
- [ ] Signed-in customer in post-purchase preview mode sees "SELECT HAT" (not "Save Result")
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
- [ ] After purchased `Save Result` success, the CLAIMED panel is visible briefly (~2.5s hold) before the page reloads
- [ ] After the post-claim reload, the customer lands back on the black-screen "Click To Enter" boot flow
- [ ] After the post-claim reload, the customer proceeds through the full intro cinematic unchanged (idle video -> walk video -> crate intro)
- [ ] After the post-claim reload, signed-in purchased customer with spinsRemaining=0 + `crate_hat_won` tag lands in post-purchase preview mode (1 non-binding spin, "SELECT HAT" CTA)
- [ ] Post-claim reload path never triggers on the preview path (`SELECT HAT` still uses `redirectToCheckout` and exits the app)
- [ ] Post-claim reload fires exactly once even if the user somehow re-clicks `Save Result` during the hold (timer is guarded against overlapping schedules)

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

## 6b. Pending-Result Bridge (fallback-only)

- [ ] `POST /api/pending-result` writes `crate_pending_result:<HAT-ID>:<UNIX-MS>` (single tag, replaces any prior pending tag)
- [ ] `POST /api/pending-result` rejects invalid `hat_id` with 400
- [ ] `POST /api/pending-result` rejects when the customer already has `crate_hat_won:*` (no overwrite)
- [ ] `GET /api/eligibility` returns `pending_result: { hat_id, timestamp }` when the tag exists, `null` otherwise
- [ ] On a purchased spin, the client fires `/api/pending-result` the moment the reel lands on the winner (Network tab shows a single POST in the WINNER_SELECTED transition)
- [ ] The pending write does not block Save Result: finalize runs even if the pending POST is still in flight or has failed
- [ ] `POST /api/finalize` on success removes any `crate_pending_result:*` tag in the same PUT that writes `crate_hat_won:<HAT-ID>`
- [ ] Simulated interruption: with `crate_spins:2`, spin once so `WINNER_SELECTED` fires, then hard-reload before clicking Save Result. On reload, eligibility still shows `spins_remaining: 1` and `pending_result: { hat_id: <the landed hat>, timestamp: ... }`
- [ ] On reload with pending present and `hat_won` null, the client stays on the purchased path (does NOT flip to preview) even if `spins_remaining === 0`
- [ ] On reload with pending present, pressing X / tapping the crate opens it and lands directly on the pending hat without running the reel, without playing spin audio, and without consuming any spins
- [ ] Save Result on the resumed pending result finalizes with the correct `hat_id` and Shopify now has `crate_hat_won:<HAT-ID>`, no `crate_pending_result:*`, and no `crate_spins:<N>`
- [ ] If the pending `hat_id` is no longer in `src/hats.js` (data mismatch), the resume branch aborts quietly without consuming a spin and without crashing
- [ ] Pending bridge is a no-op on the preview path (preview never writes `crate_pending_result:*`)

---

## 6c. Saved-hat confirmation popup (immediate, Continue-gated reload)

- [ ] With a purchased spin, click Save Result. The popup appears immediately after CLAIMED (no reload, no Tap To Enable Sound replay, no intro replay in between)
- [ ] Popup shows: "Crate Sealed" kicker, saved hat image, saved hat name from `src/hats.js`, copy "Your hat is locked in for fulfillment", and a single Continue button. Visuals unchanged from prior pass
- [ ] The page does NOT auto-reload while the popup is visible; it waits for Continue
- [ ] Clicking Continue hides the popup and reloads the page back to the intro flow
- [ ] After the Continue-driven reload, the popup does NOT reappear (sessionStorage flag was cleared on immediate show)
- [ ] Works for first-save flow (customer goes from 2 spins to saved)
- [ ] Works for second-save flow after Spin Again (customer goes from 1 spin to saved)
- [ ] Force-reload failsafe: with the popup visible, press browser reload instead of Continue. On the reloaded page, after the intro handoff reaches `CRATE_VIEW`, the popup is rendered one more time (post-reload trigger path). Clicking Continue reloads and it does not reappear again
- [ ] During the immediate display, `sessionStorage.getItem('crate.savedHat.pending')` is null (cleared by `showSavedHatOverlayImmediate`)
- [ ] If the sessionStorage flag exists on boot but `eligibility.hat_won` is null or different, the overlay does NOT display and the flag is removed
- [ ] If the flag's `hat_id` is not in `src/hats.js` (data mismatch), the overlay does NOT display and the flag is removed
- [ ] The immediate popup never appears during intro (idle.mp4 / walk / Tap To Retry fallback) because it only fires from the post-finalize CLAIMED branch
- [ ] Popup does not affect finalize, consume, pending-result bridge, inventory, or state machine

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
- [ ] Preview CTA redirects to a Shopify cart permalink (`https://amerikid.ca/cart/<comboVariantId>:1?properties=...`) for the selected combo variant with `_preview_hat_id` as a line-item property. Exact-hat cart permalink helper (`buildPreviewCheckoutUrl`) and combo-page helper (`buildComboCheckoutUrl`) remain in `src/main.js` but are not invoked by the preview CTA
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
- [ ] Preview path: `#claimBtn` ("SELECT HAT") renders with cool cyan gradient, cyan text-shadow, and cyan rim on hover
- [ ] `.controls button` elements have beveled top-right and bottom-left corners via clip-path
- [ ] Button text "Save Result", "SELECT HAT", "Spin Again", "Spin" renders as expected
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

## 15. Intro MP4 reliability pass

- [ ] `index.html` (viewed via DevTools > Elements > <head>) contains `<link rel="preload" as="video" href="/media/portal/idle.mp4" type="video/mp4">`
- [ ] The preload link is present in the built `dist/index.html` output (verify after `npm run build`)
- [ ] DevTools Network tab (cold cache): `idle.mp4` request begins before the main JS bundle finishes parsing (early in the waterfall, not after boot layer injection)
- [ ] DevTools Network tab (cold cache): `walk_in_animation.mp4` does NOT begin downloading until after `idle.mp4` has fired `loadeddata`. Walk should appear as a later, separate request in the waterfall, not a parallel one with idle
- [ ] The walk video element in DOM starts with `preload="metadata"` and is escalated to `preload="auto"` only after idle is ready (inspect via DevTools on first load)
- [ ] Neither boot video element has `crossOrigin="anonymous"` set in the DOM (check via DevTools > Elements > both `<video>` tags)
- [ ] Boot videos no longer emit duplicate network requests caused by post-parse `crossOrigin` mutation (verify in Network tab: each MP4 fires exactly once per cold load)
- [ ] Happy path unchanged: on a normal cold load with fast network, the CTA still lands on "Click To Enter", the idle video still loops with audio, "Enter Portal" still enables, walk video still plays and fades to crate
- [ ] DevTools > Network > Throttle: "Slow 3G". Boot screen still reaches "Click To Enter" eventually. Idle video starts playing. Walk video finishes loading by the time the user taps "Enter Portal" in most cases
- [ ] DevTools > Network > Block request URL (`*idle.mp4`): CTA flips to "Tap To Retry" within ~12 seconds (not stuck on "Loading..." forever). Tapping the button re-issues the load request
- [ ] DevTools > Network > Block request URL (`*idle.mp4`), then unblock, then tap "Tap To Retry": idle video loads on the retry attempt and the CTA returns to "Click To Enter"
- [ ] DevTools > Network > Block request URL (`*walk_in_animation.mp4`): after tapping "Click To Enter", idle video plays normally. The "Enter Portal" button stays disabled, then flips to "Tap To Retry" within ~20 seconds
- [ ] DevTools > Network > Block request URL (`*walk_in_animation.mp4`), then unblock, then tap "Tap To Retry" on the Enter Portal button: walk video loads and the button returns to "Enter Portal"
- [ ] Console: no uncaught errors during either retry path. `audioState.lastError` captures the failure message for diagnostics
- [ ] Walk fade threshold (`walkVideoFadeThreshold`) is still computed correctly after the deferred load: walk video fades out ~2 seconds before its natural end
- [ ] Camera intro, idle bob, Press X prompt, spin flow, audio system, eligibility, preview path, purchased path, finalize persistence, post-claim reload are all visibly identical
- [ ] Theme wrapper, iframe embed, `customer_id` handoff, `ak-mb-prestart`, `ak-mb-release` are untouched by this pass
- [ ] Boot sequence works identically inside the Shopify theme iframe (cold cache, throttled network, blocked request scenarios)

---

## 16. Deferred hat texture preload

- [ ] DevTools > Network tab, cold cache. On initial page load, NONE of the 15 hat PNGs in `/hats/*.png` should appear in the request waterfall until AFTER `idle.mp4` has reached a ready state (`loadeddata`)
- [ ] After idle is ready, the 15 hat PNGs should appear in the Network tab with `Priority: Low` (Chrome) or equivalent low-priority marker. Browsers without `fetchPriority` support will show default priority -- that is expected and non-blocking
- [ ] The `resultImage` DOM `<img>` inside the result panel still loads the mainline hat eagerly on initial `showHat(currentHatIndex)` (this is unchanged and expected)
- [ ] During `idle` -> `walk` -> crate intro -> Press X -> lid open -> spin reel on a fast desktop connection, all 15 hats are fully loaded and visible in the reel cycle
- [ ] On a Slow 3G throttle, the reel cycle may briefly skip frames where a hat texture has not yet landed -- those frames render invisible (alphaTest cull) rather than a placeholder color, pink flash, or broken image. The reel timing is unchanged
- [ ] When any hat eventually loads mid-spin, the next reel swap onto that index shows the correct image without a visible material remount or flicker
- [ ] The winning hat always ends up visually correct in the result panel: even if the Three.js 3D plane was still loading during the reel, by the time WINNER_SELECTED pulses the winning hat texture is populated (or completes populating without a visible remount)
- [ ] GPU pre-upload: after hat PNGs have loaded (check Network tab shows all 15 complete), the spin reel runs without per-frame texture upload stalls. On Chrome DevTools Performance tab, the reel frames should show no large `texImage2D` calls -- the upload happened once on image load, not lazily during draw
- [ ] If `renderer.initTexture` is unavailable (older Three.js build or non-WebGL context), the hat textures still display correctly via the existing lazy-upload fallback (try/catch keeps the call non-fatal)
- [ ] Preview path end-to-end: spin lands on a hat, result panel shows hat name and DOM `<img>`, SELECT HAT opens the two-popup flow and redirects to the direct cart permalink. Unchanged
- [ ] Purchased path end-to-end: spin, Save Result writes `crate_hat_won:HAT-ID`, post-claim reload returns to intro. Unchanged
- [ ] `markBootIdleLoadFailed` code path still kicks the hat preload as a fallback (verify by blocking `*idle.mp4` in DevTools, letting the timeout fire, then checking Network tab that hat PNG requests still began after the failure)
- [ ] Bundle size sanity: `npm run build` reports a JS bundle growth of <1 KB gzipped compared to the prior commit
- [ ] No console errors on cold boot, normal boot, throttled boot, blocked-idle boot, or after retry
- [ ] Boot layer DOM, CTA copy, tactical HUD polish, walk fade threshold, post-claim reload, `Tap To Retry` paths are all visibly identical
- [ ] Iframe context: all of the above holds inside the Shopify theme iframe embed

---

## 17. Iframe UI polish pass (Press X keycap, telemetry, caret, media ticks, depress, brand stripe)

### Press X prompt
- [ ] Prompt element is `<div class="press-x-prompt" role="button" aria-label="Press X to spin for a random hat">` with three child spans: `.press-x-label` ("Press"), `.press-x-key` ("X"), `.press-x-label` ("For a Random Hat")
- [ ] Prompt renders in Black Ops One, uppercase, 0.18em tracking on desktop and 0.14em on mobile (<=820px)
- [ ] The `X` keycap has a tactical bevel (clip-path polygon), amber border, inner amber underline, subtle drop shadow, and an amber text-shadow on the letter itself
- [ ] Prompt has no blue circle, no `background: #4a90e2`, no Impact font, no `border-radius: 50%` anywhere in its DOM or CSS
- [ ] Prompt positioning remains anchored to the crate front face at 38% height, pushed 0.35 units toward camera (unchanged math)
- [ ] Prompt visibility still only appears in `CRATE_VIEW + READY + playerInRange` (toggled by runtime via inline `style.display = 'block'`/`'none'`)
- [ ] Pressing X / clicking prompt / tapping canvas still triggers spin (handlers unchanged)
- [ ] Hover / focus brightens the keycap amber; `:active` depresses it 1px with an inset compressed shadow
- [ ] No layout shift when the prompt shows or hides

### Winner-reveal retone
- [ ] On winner land, the result-card 520ms reveal shows an amber-gold mid-frame (`rgba(255, 210, 110, 0.38)` border, `rgba(255, 180, 60, 0.2)` glow) and does NOT show a pink/magenta flash
- [ ] The retoned mid-frame agrees with the gold HUD frame pulse that follows it (no color-language clash at the 2.4s pulse handoff)
- [ ] Winner-reveal keyframe timing (520ms, cubic-bezier 0.16/1/0.3/1) is visibly identical
- [ ] Spin cadence, audio, state machine transitions are visibly identical

### Eligibility telemetry chip
- [ ] `#eligibilityStatus` renders as a tactical chip: ~0.62rem monospace, uppercase, 0.12em tracking, amber border, translucent dark background, 3px/10px padding
- [ ] When populated, the chip shows `>>` as a leading glyph in amber (rendered via `:not(:empty)::before`)
- [ ] When empty (no content), no border, no prefix (`:not(:empty)` guard keeps it invisible)
- [ ] `.panel.preview-result` flips the border + `>>` prefix color to cyan
- [ ] `.panel.claimed-result` flips the border + `>>` prefix color to gold (`#ffe7a4`)
- [ ] Chip does not break panel layout on desktop or mobile iframe

### Status-line caret
- [ ] `#resultStatus` shows a blinking `_` caret after the status text, rendered via `:not(:empty)::after`
- [ ] Caret uses `status-caret-blink` 1.1s keyframes with `steps(2, jump-none)` (pure opacity animation, no layout shift)
- [ ] Caret is amber by default, cyan under `.panel.preview-result`, gold under `.panel.claimed-result`
- [ ] Caret is hidden when the status-line is empty (nothing blinking at boot / before first spin)
- [ ] Caret does not cause layout shift on status text changes

### Result-media aperture ticks
- [ ] The result-media frame shows 4 small L-shaped corner ticks (8px arms x 1.2px stroke on desktop, 6px x 1px on mobile <=820px)
- [ ] Ticks are inset 3px from each corner (2px on mobile) and do not clip the hat image
- [ ] Ticks are amber by default, cyan under `.panel.preview-result`, gold under `.panel.claimed-result` and `.panel.winner-reveal`
- [ ] Ticks do not overlay the hat image meaningfully (they sit only at the corners)
- [ ] Ticks remain visible on all hat images (transparent-background PNGs do not obscure ticks)
- [ ] Mobile iframe: ticks still render cleanly inside the 44px media frame without overlap

### Button press-down depress
- [ ] Clicking `#spinBtn`, `#claimBtn`, `#closeBtn`, `#openBtn` shows a depress effect: `translateY(0)` (reverses hover lift) plus an inset compressed shadow
- [ ] `#claimBtn` depress shows amber-gold inset under purchased state, cyan inset under `.panel.preview-result`
- [ ] `#bootStartBtn` / `#bootEnterPortalBtn` (`.boot-cta`) depress shows amber inset shadow
- [ ] `#savedHatContinueBtn` (`.saved-hat-cta`) and `#sizeSelectCtaBtn` (`.size-select-cta`) depress with translateY(1px) + brightness(0.94)
- [ ] `.size-select-option` buttons depress with translateY(1px) + brightness(0.96)
- [ ] No button logic or handler changes; hover lift still renders as before
- [ ] Press depress does not cause text clipping inside the button clip-path bevels

### Amerikid purple brand stripe
- [ ] `.boot-copy`, `.boot-idle-copy`, `.panel`, `.result-card`, `.saved-hat-card`, `.size-select-card` each show a 2px-wide purple stripe at the left inner edge (rendered via `inset 2px 0 0 var(--brand-purple)` prepended to the existing `box-shadow` stack)
- [ ] Purple color reads as `rgba(140, 96, 255, 0.44)` (soft Amerikid purple, not magenta, not pink)
- [ ] Stripe is state-agnostic: stays purple on default, preview, purchased, claimed, and winner-reveal states
- [ ] Stripe does NOT replace or hijack any existing amber/cyan/gold state semantics (label chip, HUD frame brackets, result-media ticks, panel frame pulse all unchanged)
- [ ] Stripe is subtle: does not compete with the HUD corner brackets or the `#claimBtn` prestige gradient
- [ ] Stripe renders inside the existing 4px card border-radius without visible gap
- [ ] Mobile iframe: stripe still readable inside the compacted panel/card widths

### Cohesion + performance
- [ ] No backdrop-filter surfaces added (heavy compositing budget unchanged)
- [ ] New keyframes (`status-caret-blink`) animate opacity only (GPU accelerated)
- [ ] Built CSS size grew from ~25KB to ~30KB (gzipped ~6KB); JS bundle size unchanged
- [ ] No behavior drift: preview path, purchased path, pending-result bridge, `_preview_hat_id`, size selection, checkout redirect, saved-result flow, spin logic, state machine, audio unlock, camera/scene all visibly identical
- [ ] Iframe context: all of the above holds inside the Shopify theme iframe embed

---

## 18. Iframe UI polish corrective pass (2026-04-15): revert keycap, remove stripe, retone to #ff33ff

### Press X blue circle restored
- [ ] Press X prompt renders with the original blue controller-circle `X` (not the tactical amber beveled keycap)
- [ ] Keycap is a circle (`border-radius: 50%`), 24x24, `#4a90e2` background, white bold `X`
- [ ] No clip-path polygon bevel on the keycap, no amber border, no amber inner-highlight / underline, no amber text-shadow
- [ ] Hover / focus-visible: keycap lightens to `#5ea0ee` with soft blue glow, no amber
- [ ] `:active` / press: keycap darkens to `#3d7fcf` and drops 1px translate, no amber
- [ ] Outer "Press" and "For a Random Hat" text still renders in Black Ops One 0.92rem / 0.82rem mobile, 0.18em tracking, uppercase (authored text styling kept)
- [ ] Keyboard X, click on prompt, and canvas tap all still trigger spin
- [ ] Prompt still positioned on the crate front face via world-to-screen projection
- [ ] Prompt hidden during OPENING / SPINNING / WINNER_SELECTED / CLAIMING / CLOSING / CLAIMED

### Purple side stripe removed
- [ ] `.boot-copy`, `.boot-idle-copy`, `.panel`, `.result-card`, `.saved-hat-card`, `.size-select-card` no longer render a left-edge purple inset stripe
- [ ] All six surfaces fall back to their pre-polish original box-shadow (drop shadow + inner top highlight + subtle outer halo)
- [ ] `--brand-purple` custom property no longer defined in the stylesheet (grep returns zero matches)
- [ ] No `var(--brand-purple)` references remain in the stylesheet (grep returns zero matches)

### 2D UI chrome retoned to official site purple (#ff33ff)
- [ ] Popup cards (boot, saved-hat, size-select) render magenta HUD corner brackets and scanlines, not gold/amber
- [ ] Result card chrome renders magenta, not gold
- [ ] Panel accents render magenta, not amber
- [ ] Button chrome (`#claimBtn`, `.boot-cta`, `.saved-hat-cta`, `.size-select-cta`, `.size-select-option`) renders magenta gradient / border / glow, not amber
- [ ] `#claimBtn` dark background reads as dark plum (`rgba(56,16,72,X)` / `rgba(28,8,36,X)`), not dark amber
- [ ] `.eligibility-status` telemetry chip border renders magenta, `>> ` prefix renders magenta, not amber
- [ ] `.status-line` blinking terminal caret `_` renders magenta, not amber
- [ ] `.result-media::after` aperture L-ticks render magenta default, preserve cyan for preview-result state, preserve magenta (brighter) for claimed-result / winner-reveal states
- [ ] Button press-down depress rings render magenta (`.controls button`, `#claimBtn`), not amber
- [ ] `.boot-cta:active` inset underline renders magenta, not amber
- [ ] Winner-reveal still visibly "pops" via the `hud-frame-pulse` 2.4s 0.78-to-1.0 opacity animation on the magenta chrome (state distinction preserved without a separate hue)

### Preview cyan untouched
- [ ] Preview-result state (`.panel.preview-result`) still renders cyan kicker, cyan frame, cyan telemetry chip `>> `, cyan caret, cyan media L-ticks
- [ ] Preview `#claimBtn:active` depress ring still renders cyan
- [ ] `.result-card` / `.saved-hat-card` / `.size-select-card` still show the `rgba(140,230,255,0.08)` cyan accent inset where previously authored
- [ ] No cyan surface turned magenta

### Retained from prior polish pass
- [ ] Click SFX still plays on `#bootStartBtn` / `#bootEnterPortalBtn` / `#savedHatContinueBtn` / `.size-select-option` / `#sizeSelectCtaBtn` / `#spinBtn`
- [ ] Press X prompt, canvas click, keyboard X, `#claimBtn` still deliberately do NOT play `clickSfx` (`#claimBtn` plays `claimSfx`)
- [ ] Compact size-select popup (5-column grid desktop, capped product image, reduced padding) still renders
- [ ] Combo product image still renders in the size-select overlay
- [ ] Button press-down depress feedback still fires on active state (now in magenta)

### Cohesion + performance
- [ ] Built CSS size roughly unchanged from prior pass (still ~29-30KB gzipped ~6KB)
- [ ] No new keyframes introduced in this corrective pass
- [ ] No behavior drift: preview path, purchased path, pending-result bridge, `_preview_hat_id`, size selection, checkout redirect, saved-result flow, spin logic, state machine, audio unlock, camera/scene all visibly identical
- [ ] Iframe context: all of the above holds inside the Shopify theme iframe embed
- [ ] No `color-profile` clash between magenta chrome and preview cyan inside the same panel (they coexist cleanly)

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
- Section 15 network-blocking tests require Chrome DevTools Network > Block request URL
  feature. Throttling tests require Chrome DevTools Network > Throttling presets.
- Section 16 tests the deferred hat texture preload. `fetchPriority` is a modern browser
  hint; older browsers ignore it and fall back to default scheduling.
