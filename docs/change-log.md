# Change Log

All notable project decisions and implementation changes are documented here.
This log tracks direction changes, not just code commits.

---

## 2026-04-22 -- Data-only expansion: 9 new hats added to the mystery pool (15 -> 24)

**Type:** Data-only change on `src/hats.js`, `api/_lib/allowed-hats.js`, `docs/source-of-truth.md`, `docs/change-log.md`. No JS logic change, no CSS change, no API handler change, no timing-constant change, no state-machine change, no audio change, no camera change, no scene change, no theme change, no weight or mainline change on any existing hat.

**Why.** Preservation-first expansion of the mystery pool from 15 to 24 hats. The 9 new hats are one-of-one variants on the hidden "Candy Facts Mystery Hat" product and extend the inventory-aware winnable pool. The add is done without tuning any spin timing or cadence constants so the accepted reel feel can be judged visually at 24 hats before any follow-up tuning is considered.

**1. `src/hats.js`.** Appended 9 new entries to the `hats` array, all `weight: 1` and `mainline: false`, same object shape as existing entries:

- `CF-BALENCIAGA-KID` -> Balenciaga Kid, `/hats/BALENCIAGA KID.png`, variant `51984712270104`
- `CF-GREEN-MONSTER` -> Green Monster, `/hats/GREEN MONSTER.png`, variant `51984717119768`
- `CF-1776` -> 1776, `/hats/1776.png`, variant `51984717644056`
- `CF-GLACIER-FREEZE` -> Glacier Freeze, `/hats/GLACIER FREEZE.png`, variant `51984720167192`
- `CF-CANDY-KID` -> Candy Kid, `/hats/CANDY KID.png`, variant `51984720757016`
- `CF-OVERGROWN` -> Overgrown, `/hats/OVERGROWN.png`, variant `51984720855320`
- `CF-JAMBA-JUICE` -> Jamba Juice, `/hats/JAMBA JUICE.png`, variant `51984721051928`
- `CF-OCEAN-SPRAY` -> Ocean Spray, `/hats/OCEAN SPRAY.png`, variant `51984721903896`
- `CF-PATRIOT` -> Patriot, `/hats/PATRIOT.png`, variant `51984722198808`

**2. `api/_lib/allowed-hats.js`.** Appended the 9 new IDs to `ALLOWED_HAT_IDS` (used by `/api/finalize` for server-side hat-id validation). Appended the 9 new `variantId -> hatId` pairs to `VARIANT_TO_HAT_ID` (used by `/api/available-hats` to translate live Shopify variant inventory back to internal hat IDs).

**3. `docs/source-of-truth.md`.** Updated the Hat Pool section from 15 to 24 with one new line listing the 9 new display names and internal IDs. Inventory-aware filtering language, preview-checkout language, entitlement model, and persistence language were not changed.

**4. Inventory-aware behavior preserved structurally.** The reel advance at `src/main.js:2233` still cycles `currentHatIndex = (currentHatIndex + 1) % hats.length` over the full pool, so zero-inventory hats continue to appear visually during the spin animation. Winner selection at `src/main.js:2185` still calls `selectWeightedHat(availableHatIds)`, which assigns weight 0 to any hat not returned by `/api/available-hats`, so zero-inventory hats still cannot be landed on as winners. The 9 new hats participate in both behaviors automatically through the existing code paths; no logic change was required in `src/main.js`, `src/hats.js` helpers, or any API handler.

**5. Not touched.** `src/main.js`, `src/style.css`, `index.html`, `api/available-hats.js`, `api/consume-spin.js`, `api/eligibility.js`, `api/finalize.js`, `api/pending-result.js`, `api/claim-spin.js`, `api/_lib/shopify.js`, `CLAUDE.md`, `README.md`, Shopify theme repo, `COMBO_VARIANT_BY_SIZE`, any spin timing or cadence constant (`MIN_FULL_ROTATIONS`, `EXTRA_FULL_ROTATIONS_MAX`, `SPIN_BASE_DURATION_MS`, `AUDIO_SILENCE_TAIL_MS`, `SPIN_END_PADDING_MS`, `POST_OPEN_PAUSE_BASE_MS`, `POST_OPEN_PAUSE_JITTER_MS`), any weight on any hat, or the `mainline` flag on any hat.

**Manual QA still needed before live:**
- Place the 9 PNG files under `public/hats/` at the exact paths above. If a PNG is missing, the existing `img.onerror` handler at `src/main.js:1472-1476` keeps that hat plane culled via `alphaTest: 0.35`, so the reel does not break; the index simply renders invisible for one frame at a time.
- Confirm in Shopify admin that the 9 variants exist on the hidden "Candy Facts Mystery Hat" product with inventory qty 1 each and variant IDs matching the list above.
- Hit `/api/available-hats` against the deployed Vercel endpoint and confirm the 9 new IDs appear in the `available` array when all 9 variants have qty 1.
- Walk through runtime-test-checklist sections 2 (Spin Flow), 4 (Preview Path), 5 (Purchased Path), 13 (Inventory-Aware Hat Pool), and 16 (Deferred hat texture preload) at 24 hats.
- Judge reel readability at 24 hats. No timing change is recommended as part of this pass. If the reel reads as noticeably too fast after live inspection, that is a separate, single-constant follow-up (likely candidate: reduce `MIN_FULL_ROTATIONS` from 2 to 1).

---

## 2026-04-15 -- Iframe UI polish corrective pass (revert Press X to blue circle, remove purple stripe, retone amber/gold to official #ff33ff)

**Type:** CSS-only revert + retone on `src/style.css`,
`docs/source-of-truth.md`, `docs/change-log.md`,
`docs/runtime-test-checklist.md`. No DOM change, no JS change,
no behavioral change, no state-machine change, no event-handler
change, no positioning-math change, no audio change, no camera/
scene change, no preview/purchased flow change, no API change,
no theme change.

**Why.** The prior polish pass introduced three visual choices
the user does not want: (1) a tactical amber beveled keycap
replacing the original blue controller-circle X button, (2) a
subtle left-edge purple inset stripe on card surfaces, (3) an
amber/gold UI chrome tone that read as gold casino rather than
the official site magenta. User reaction was explicit: restore
the blue X button, delete the purple stripe entirely, retone
every 2D UI chrome surface to the official `#ff33ff` magenta,
and keep what was good (click SFX, compact size-select popup,
combo product image, button press feel where still compatible).

**1. Press X blue circle restored.** `.press-x-key` reverted to
the original inline-style blue circle: `display: inline-block`,
`width: 24px`, `height: 24px`, `margin: 0 4px`, `background: #4a90e2`,
`border-radius: 50%`, `color: white`, `text-align: center`,
`line-height: 24px`, `font-weight: bold`, `letter-spacing: 0`. Hover
/ focus-visible lighten to `#5ea0ee` with `0 0 14px rgba(74,144,226,0.55)`
glow; `:active` darkens to `#3d7fcf` and drops `translateY(1px)`.
Amber clip-path polygon, amber border/box-shadow stack, and amber
text-shadow all removed from the keycap. Outer `.press-x-prompt`
typography (Black Ops One 0.92rem / 0.82rem mobile, 0.18em tracking,
uppercase) left in place -- this is the authored surrounding-text
styling the user said was good. DOM structure (`.press-x-prompt`
with three children `.press-x-label` / `.press-x-key` / `.press-x-label`)
unchanged. `src/main.js` markup injection, event handlers, world-to-
screen positioning math, and `display: block`/`none` inline toggle
were NOT touched.

**2. Purple side stripe removed entirely.** `--brand-purple`
custom property deleted from the tactical `:root` block in
`src/style.css`. The additive polish-pass cascade block that
prepended `inset 2px 0 0 var(--brand-purple),` onto six elements
(`.boot-copy`, `.boot-idle-copy`, `.panel`, `.result-card`,
`.saved-hat-card`, `.size-select-card`) was removed wholesale.
Because that block was purely additive on top of pre-polish base
rules defined earlier in the file, removing it fully restores the
original `box-shadow` values for all six surfaces; no manual
restoration edits were needed.

**3. 2D UI chrome retoned gold/amber to official `#ff33ff`.**
Root variables swapped in place so every consumer of
`var(--hud-amber)` / `var(--hud-amber-soft)` / `var(--hud-gold)`
/ `var(--hud-scanline)` inherits magenta automatically without
touching the call sites: `--hud-amber: #ffd16a -> #ff33ff`,
`--hud-amber-soft: rgba(255,209,106,0.62) -> rgba(255,51,255,0.62)`,
`--hud-gold: #ffc855 -> #ff66ff`,
`--hud-scanline: rgba(255,209,106,0.042) -> rgba(255,51,255,0.042)`.
All amber RGBA literals across the file were then `replace_all`d
to their magenta equivalents (preserving alpha values so opacity-
tuned highlights / bevels / glows keep the exact same intensity):
main amber `rgba(255,209,106,X)` / `rgba(255,200,85,X)` /
`rgba(255,210,110,X)` / `rgba(255,214,118,X)` -> `rgba(255,51,255,X)`;
light highlights `rgba(255,232,172,X)` / `rgba(255,232,170,X)` /
`rgba(255,231,184,X)` / `rgba(255,226,160,X)` / `rgba(255,222,152,X)` /
`rgba(255,220,160,X)` / `rgba(255,220,150,X)` -> `rgba(255,102,255,X)`;
paler highlights `rgba(255,240,190,X)` / `rgba(255,233,190,X)` ->
`rgba(255,153,255,X)`; very pale `rgba(255,249,229,X)` /
`rgba(255,245,216,X)` -> `rgba(255,220,255,X)`; dark amber CTA
backgrounds `rgba(60,44,14,X)` / `rgba(28,20,8,X)` -> dark plum
`rgba(56,16,72,X)` / `rgba(28,8,36,X)`. Hex swaps: `#ffd16a -> #ff33ff`,
`#f5a524 -> #b520b5`, `#ffc855 -> #ff66ff`, `#ffe4a0 -> #ff99ff`,
`#ffe7a4 -> #ff99ff`, `#fff5d6 -> #ffe6ff`, `#ffeab8 -> #ffccff`.

**Preview cyan untouched.** The cyan semantic (`rgba(140,230,255,X)`,
`var(--hud-cyan)`, `#8ce6ff`) was not touched anywhere; preview-path
framing, cyan kicker, preview eligibility chip, preview caret,
preview media ticks, preview `#claimBtn` depress ring, and the
`0 0 0 1px rgba(140,230,255,0.08) inset` accents on card chrome all
continue to render cyan.

**Winner-reveal state distinction.** The winner-reveal 42% keyframe
continues to hold its reveal moment via the `hud-frame-pulse 2.4s`
0.78-to-1.0 opacity animation, which now animates magenta chrome
instead of amber chrome. The reveal still punches visibly on top
of the default magenta HUD tone without needing a separate hue.

**Retained polish-pass wins.** All click SFX wiring from the prior
pass (`clickSfx` at `/sfx/click.mp3`, volume 0.12, preload auto,
registered in `allAudioElements`, wired into `#bootStartBtn` /
`#bootEnterPortalBtn` / `#savedHatContinueBtn` / `.size-select-option` /
`#sizeSelectCtaBtn` / `#spinBtn`; Press X / canvas / keyboard X /
`#claimBtn` still deliberately excluded) is preserved. The
compacted size-select popup (grid of 5 sizes, reduced padding,
capped product image) is preserved. Combo product image in the
size-select overlay is preserved. Button press-down depress
feedback is preserved, just retoned to magenta rings. `.eligibility-status`
telemetry chip and `.status-line` blinking caret are preserved,
retoned to magenta. Result-media aperture L-ticks preserved,
retoned to magenta (with preview cyan and claimed/winner magenta
state cascades still functional).

**Verification.** `npm run build` green (`dist/assets/index-*.css`
29.27 kB, `dist/assets/index-*.js` 662.92 kB, 907ms). No unused
CSS custom properties remain (`--brand-purple` removed,
`--hud-gold` still referenced implicitly via variable definition
though unused at call sites kept in place for stability). No
`var(--brand-purple)` refs remain. No amber RGBA literals remain
in `src/style.css` outside of purely white-on-white RGBA patterns.

---

## 2026-04-15 -- Iframe UI polish pass (Press X keycap, telemetry chip, caret, media ticks, brand stripe, press depress)

**Type:** CSS-first visual polish with one narrow markup swap on the
Press X prompt. `src/main.js`, `src/style.css`, `docs/source-of-truth.md`,
`docs/runtime-test-checklist.md`, `docs/change-log.md`. No behavioral
change, no state-machine change, no event-handler change, no positioning
math change, no audio change, no camera/scene change, no preview/
purchased flow change, no API change, no theme change.

**Press X prompt restyle.** Replaced the inline blue-circle placeholder
markup + inline `cssText` in `src/main.js` with `<span class="press-x-label">Press</span><span class="press-x-key" aria-hidden="true">X</span><span class="press-x-label">For a Random Hat</span>`
and added `className = 'press-x-prompt'` plus role/aria-label. All
styling moved to `.press-x-prompt` / `.press-x-label` / `.press-x-key`
in CSS: Black Ops One, 0.92rem desktop / 0.82rem mobile, 0.18em tracking,
tactical keycap on the X (clip-path polygon bevel, amber border, inner
highlight + amber underline, drop-shadow). Hover + focus-visible
brighten the keycap amber; `:active` depresses. Event handlers,
positioning math, and `display: block`/`none` inline toggle from the
render loop all preserved byte-identical.

**Winner-reveal keyframe retone.** `.result-card` `.winner-reveal`
42% frame swapped from pink (border `rgba(255, 128, 224, 0.34)`,
shadow `rgba(255, 64, 180, 0.18)` + `rgba(255, 210, 245, 0.12)`) to
amber-gold (`rgba(255, 210, 110, 0.38)` border, `rgba(255, 180, 60, 0.2)`
shadow, `rgba(255, 232, 172, 0.14)` ring). No timing change. Removes
the legacy color-language clash with the gold HUD frame pulse.

**Eligibility telemetry chip.** `.eligibility-status` upgraded from
`font-size: 10px; opacity: 0.6` footnote to a tactical readout:
0.62rem, ui-monospace stack, 0.12em tracking, 3px/10px padding,
amber border, translucent dark background, uppercase, opacity 1.
Added `:not(:empty)::before { content: ">> " }` tactical prefix,
with `.panel.preview-result` switching border + prefix to cyan and
`.panel.claimed-result` switching to gold.

**Status-line caret.** New `.status-line:not(:empty)::after { content: "_" }`
with `status-caret-blink` 1.1s `steps(2, jump-none)` opacity animation
(GPU-only). State cascade: amber default, cyan on preview, gold on
claimed. Caret hidden when the status text is empty so nothing blinks
during boot.

**Result-media aperture ticks.** New `.result-media::after` renders
4 L-shaped corner ticks via an 8-layer `linear-gradient` background
stack (8px arms x 1.2px stroke desktop, 6px x 1px on mobile <=820px),
insetted 3px from each corner. `--media-tick` custom property drives
color; state cascade: amber default, cyan preview, gold claimed/
winner-reveal. No layout change.

**Button press depress.** Added `:active:not(:disabled)` rules:
global `button` resets `translateY(0)` with inset-compressed shadow;
`.controls button` keeps the amber underline; `#claimBtn` deepens the
amber-gold inset (cyan variant on preview via `.panel.preview-result`);
`.boot-cta` depresses amber; `.saved-hat-cta`, `.size-select-cta`,
and `.size-select-option` get a 1px translate + brightness 0.94.
No logic change.

**Amerikid purple brand stripe.** New `--brand-purple: rgba(140, 96, 255, 0.44)`
defined in the tactical `:root` block. Applied as `inset 2px 0 0 var(--brand-purple)`
prepended to the existing `box-shadow` stack on `.boot-copy`,
`.boot-idle-copy`, `.panel`, `.result-card`, `.saved-hat-card`,
`.size-select-card`. State-agnostic (not affected by preview/purchased/
claimed classes), reads as quiet Amerikid DNA without hijacking the
amber/cyan/gold state semantics. Subtle enough to sit under the HUD
corner brackets without visual competition.

**Performance.** CSS-only additions except one 6-line DOM swap in
`src/main.js`. No new backdrop-filter surfaces. New keyframes animate
opacity only. 8-layer `::after` on `.result-media` reuses the same
technique already used by the HUD frame. Built CSS grew from ~25KB
to ~30KB (gzipped 6.16KB). No bundle growth on the JS side.

---

## 2026-04-15 -- Size-select popup compaction + click SFX refinement

**Type:** UI polish + SFX refinement. `src/main.js`, `src/style.css`,
`docs/source-of-truth.md`, `docs/runtime-test-checklist.md`,
`docs/change-log.md`. No behavioral change, no preview flow change,
no `_preview_hat_id` change, no shirt size selection change, no
redirect change, no purchased change, no audio unlock logic change,
no state machine change.

**Popup 2 compaction.** Tightened `.size-select-card` to
`width: min(340px, 92vw)` (from 360px), padding `16px 20px 18px`
(from 22/26/24), gap 10px (from 14px). Combo image max-width
dropped to 120px desktop / 96px mobile (from 180/140); drop-shadow
softened. `.size-select-options` switched from `flex-wrap` to
`display: grid; grid-template-columns: repeat(5, minmax(0, 1fr))`
so all five shirt sizes sit on a single row on desktop, and a
responsive `repeat(3, ...)` at the <=820px breakpoint keeps two
rows maximum on mobile. `.size-select-option` padding 7px/6px
(from 10/14), letter-spacing 0.08em (from 0.12em), font-size
0.85rem (from 0.95rem), min-width 0 (from 52px). `.size-select-cta`
margin-top 2px (from 4px), padding 8px 18px (from 10/22). Net
result: popup fits comfortably inside short mobile iframes without
vertical scroll, and the size row renders as a single clean grid.

**Click SFX refinement.** Volume reduced from 0.30 to 0.12 across
all six remaining call sites (`#bootStartBtn`, `#bootEnterPortalBtn`,
`#savedHatContinueBtn`, `.size-select-option`, `#sizeSelectCtaBtn`,
`#spinBtn`). Removed the click SFX call from `#claimBtn` since
`claimSfx` already plays on that button and the two were stacking.
Added `clickSfx.preload = 'auto'` so the asset is decoded before
first click, eliminating the perceived lag on the first button
tap of a session. Press X prompt, canvas click, and keyboard X
remain deliberately silent.

---

## 2026-04-15 -- Combo product image in size-select popup

**Type:** UI polish. `src/main.js`, `src/style.css`,
`docs/source-of-truth.md`, `docs/runtime-test-checklist.md`,
`docs/change-log.md`. No behavioral change, no preview flow change,
no `_preview_hat_id` change, no shirt size selection change, no
`GO TO CHECKOUT` redirect change, no purchased change, no
audio/camera/scene change, no state machine change.

Added a static `<img>` of the CandyFACTS combo product from the
Shopify CDN (`https://cdn.shopify.com/s/files/1/0930/3267/7656/files/CandyFACTS_Combo.png?v=1775533470`)
inside the `#sizeSelectOverlay` card, placed between the subcopy
block and the size options host. Image uses `loading="lazy"` and
`decoding="async"` so it never competes with first-paint. New
`.size-select-product` / `.size-select-product-img` CSS centers the
image, caps it at 180px (140px on mobile <=820px viewport), applies
a subtle drop-shadow to match the tactical HUD language, and scales
cleanly between desktop and mobile iframe contexts. `#sizeSelectOptions`
rebuild inside `showPreviewSizeOverlay()` only replaces the options
host innerHTML, so the static image element survives every overlay
open and never flickers.

---

## 2026-04-15 -- UI button click SFX

**Type:** Small UX polish. `src/main.js`, `public/sfx/click.mp3`
(added), `docs/source-of-truth.md`, `docs/runtime-test-checklist.md`,
`docs/change-log.md`. No behavioral change, no state machine change,
no audio unlock logic change, no preview/purchased flow change, no
camera/scene change, no theme change.

Added `clickSfx = new Audio('/sfx/click.mp3')` alongside existing
SFX, registered in `allAudioElements` so it unlocks with the same
gesture-unlock path as the other SFX. Subtle volume `0.3` (below
open/close 0.25 only when comparing perceptual weight; click SFX is
short enough to not compete). Wired `playSfx(clickSfx, 0.3)` into
explicit UI button handlers only:

- `#bootStartBtn` (Click To Enter / Tap To Retry)
- `#bootEnterPortalBtn` (Enter Portal / Tap To Retry)
- `#savedHatContinueBtn` (Continue -- purchased reload + preview
  continue paths)
- `.size-select-option` buttons (S/M/L/XL/2XL radios)
- `#sizeSelectCtaBtn` (GO TO CHECKOUT)
- `#spinBtn` (Spin / Spin Again)
- `#claimBtn` (Save Result / SELECT HAT)

Deliberately excluded per direction: Press X prompt, canvas click,
keyboard X. Audio unlock path and all other SFX timing are
byte-identical.

---

## 2026-04-15 -- GPU texture pre-upload for hat reel

**Type:** Performance-only. `src/main.js`, `docs/source-of-truth.md`,
`docs/runtime-test-checklist.md`, `docs/change-log.md`. No behavioral
change, no spin timing change, no state machine change, no audio
change, no camera/scene change, no preview/purchased flow change.

Added `renderer.initTexture(placeholder)` inside the hat-image
`onload` callback in `kickHatTexturePreload()`. Each hat texture is
now uploaded to GPU memory once immediately after the deferred image
load completes, so the spin reel no longer triggers a lazy GPU upload
on every `showHat()` swap. The call is wrapped in `try/catch` to
stay non-fatal on environments where `initTexture` is unsupported.
No change to fetch priority, load order, or error handling.

---

## 2026-04-15 -- Preview copy pass: CTA renamed to SELECT HAT, combo-product-page wording removed

**Type:** Copy-only. `src/main.js`, `docs/source-of-truth.md`,
`docs/runtime-test-checklist.md`, `docs/change-log.md`. No behavioral
change, no state machine change, no overlay change, no destination
change, no audio/camera/scene change, no API/theme/admin change.

Preview result CTA renamed from `Buy Combo Pack` to `SELECT HAT` to
match the current direct-checkout two-popup flow and avoid implying
a product-page hop. Preview result panel strings tightened:

- CLAIMING subtitle `Opening the combo pack product page` ->
  `Preparing your checkout`
- CLAIMING label `Combo Pack` -> `Preview Only`
- CLAIMING status `Loading the Candy Facts Mystery Box Combo` ->
  `Standby for size selection`
- Default preview subtitle `Preview only. Buy the combo pack to
  unlock your real spins.` -> `Preview only. Select this hat and
  pick a size to take it into checkout.`
- Default preview status `Buy Combo Pack opens the $50 combo
  product page` -> `SELECT HAT confirms this preview pick`

Pre-spin Press X prompt untouched. Popup 1 and popup 2 copy
untouched. Size overlay subcopy untouched. Purchased path copy
untouched. Internal dev comments referencing the combo product page
left as-is (not user-visible).

---

## 2026-04-15 -- Preview cart permalink payload switched to base64-encoded JSON

**Type:** Preview-path checkout payload fix. `src/main.js`,
`docs/source-of-truth.md`, `docs/runtime-test-checklist.md`,
`docs/change-log.md`. No purchased-path change, no API change, no
server change, no theme edit, no Shopify admin change, no Flow change,
no audio/camera/scene change, no inventory change, no state machine
change, no overlay flow change.

Before: `buildPreviewCartPermalink` emitted
`?properties=<URL-encoded JSON>` (shape
`?properties=%7B%22_preview_hat_id%22%3A%22HAT-ID%22%7D`). On this
store that payload format produced a Shopify error page after the
size-select CTA.

After: the function now emits
`?properties=<URL-escaped base64 of {"_preview_hat_id":"HAT-ID"}>`
(shape `?properties=eyJfcHJldmlld19oYXRfaWQiOiJIQVQtSUQifQ==` with
any `=` escaped). Matches the manually verified working Shopify URL
pattern: `https://amerikid.ca/cart/51878170034456:1?properties=eyJfcHJldmlld19oYXRfaWQiOiJzbW9rZS10ZXN0In0`.

Implementation: body swapped from
`encodeURIComponent(JSON.stringify(payload))` to
`encodeURIComponent(btoa(JSON.stringify(payload)))`. Function
signature, variant map, origin, overlay chain, and
`redirectToCheckout` are byte-identical. `btoa` is safe because hat
IDs are ASCII (CF-ZS-OG, CF-10..CF-16, seven ASCII custom names).

---

## 2026-04-15 -- Preview direct-to-checkout two-popup flow (hat confirm + shirt size)

**Type:** Preview-path redirect replacement. `src/main.js`, `src/style.css`,
`docs/source-of-truth.md`, `docs/runtime-test-checklist.md`,
`docs/change-log.md`. No purchased-path change, no API change, no
server change, no theme edit, no Shopify admin change, no Flow change,
no audio/camera/scene change, no inventory change, no state machine
change.

Before: preview "Buy Combo Pack" opened a single confirmation overlay
that redirected to the combo product page with
`?preview_hat_id=<HAT-ID>` appended, relying on theme-side pickup to
convert the param into a `_preview_hat_id` line-item property at
add-to-cart.

After: preview confirmation copy tightened (`PREVIEW SELECTED` /
`THIS IS THE HAT YOU'RE TAKING INTO CHECKOUT.` / `CONTINUE`). Continue
now opens a second overlay (`#sizeSelectOverlay`) showing shirt size
options S / M / L / XL / 2XL with a disabled `GO TO CHECKOUT` CTA that
enables once a size is chosen. On CTA click the crate redirects
directly to a Shopify cart permalink of shape
`https://amerikid.ca/cart/<comboVariantId>:1?properties=<URL-encoded
JSON {"_preview_hat_id":"<HAT-ID>"}>`. Combo variant IDs are mapped by
size in a new `COMBO_VARIANT_BY_SIZE` constant (S=51878170034456,
M=51878170067224, L=51878170099992, XL=51878170132760,
2XL=51878170165528). The hidden mystery-hat product and exact-hat
variant path remain unused by the preview CTA.

`buildPreviewCartPermalink(hatId, size)` is the new URL builder. The
older `buildComboCheckoutUrl(hat?)` and `buildPreviewCheckoutUrl`
helpers are retained in code but dormant. Preview overlay still never
sets the purchased `savedHatOverlayShown` flag, never touches
`crate.savedHat.pending`. Purchased path, saved-hat popup, pending-
result bridge, inventory-aware landing, audio/camera/scene, state
machine all unchanged.

---

## 2026-04-15 -- Preview-only confirmation popup + preview_hat_id URL carry

**Type:** Preview-path UX + handoff precondition. Smallest safe crate-side
move. `src/main.js`, `docs/source-of-truth.md`,
`docs/runtime-test-checklist.md`, `docs/change-log.md`. No purchased-path
change, no API change, no server change, no theme edit, no Shopify admin
change, no Flow change, no audio/camera/scene change, no inventory
change, no state machine change.

Before: preview "Buy Combo Pack" redirected directly from the finalize
handler (`src/main.js:2164-2173`) to the bare combo product URL. No
preview-only confirmation moment. No hat identity carried into the
combo page URL.

After: the preview branch of the finalize handler plays claim SFX, sets
`STATES.CLAIMING`, closes the crate, then opens a preview-only
confirmation overlay populated from `spinWinnerHat`. The overlay reuses
the existing `#savedHatOverlay` DOM shell but overwrites kicker, body,
and CTA copy at show time (`PREVIEW SELECTED` / `THIS IS THE HAT
YOU'RE TAKING INTO CHECKOUT. CONTINUE TO OPEN THE CANDY FACTS MYSTERY
BOX COMBO.` / `CONTINUE TO COMBO PACK`). Overlay never sets the
purchased single-show flag (`savedHatOverlayShown`) and never writes or
clears the `crate.savedHat.pending` sessionStorage key. A new
module-scope `previewContinueAction` stashes the redirect continuation
so the existing `#savedHatContinueBtn` handler branches on preview vs
purchased: preview invokes the stashed continuation and redirects to
the combo page; purchased keeps the existing `window.location.reload()`
behavior unchanged.

`buildComboCheckoutUrl` now accepts an optional hat argument. When a
hat with an `id` is passed, the returned URL appends
`?preview_hat_id=<encoded HAT-ID>`. Called with no arguments, the
function returns the bare `COMBO_CHECKOUT_URL` byte-identically. The
preview branch is the only current caller that passes a hat.

Downstream: the combo product page (theme side) is prepared to pick up
`preview_hat_id` and inject a hidden `_preview_hat_id` line-item
property; a draft-safe Shopify Flow can react to that property. Neither
theme nor live Flow is changed in this pass; the crate-side change is
a no-op on fulfillment today and becomes useful when the theme pickup
is live.

Retained invariants: purchased finalize, saved-hat immediate-show,
`writeSavedHatFlag` / `maybeShowSavedHatOverlay`, pending-result bridge
(`writePendingResultServer`, `crate_pending_result:*`), purchased
email-link route, 2-spin consume + finalize, post-claim reload,
inventory-aware landing, reel cycle behavior, preview spin limit,
`buildPreviewCheckoutUrl` (still dormant, unchanged).

No copy on the preview overlay implies "saved", "finalized",
"claimed", or "locked in". The overlay explicitly frames the hat as
the one being taken into checkout, not a fulfillment commitment.

---

## 2026-04-14 -- Saved-hat confirmation: immediate-show, Continue-gated reload

**Type:** Timing adjustment. Smallest safe crate-repo-only move.
`src/main.js`, `docs/source-of-truth.md`, `docs/runtime-test-checklist.md`,
`docs/change-log.md`. No visual redesign, no server change, no theme,
no Flow, no multi-combo, no audio/camera/scene change.

Before: after Save Result succeeded, the purchased path set
`STATES.CLAIMED`, wrote the sessionStorage flag, and started a 2.5s
`POST_CLAIM_RELOAD_HOLD_MS` timer that reloaded the page. The
confirmation popup only appeared after the reload, once the intro had
replayed and the boot phase had reached `CRATE_VIEW`. Customers had
to sit through Tap To Enable Sound and the portal/walk intro before
seeing confirmation of the hat they had just saved.

After: a new `showSavedHatOverlayImmediate(hatId)` helper displays the
same popup inside the existing `closeCrate().then` block right after
`setState(STATES.CLAIMED)`, using `spinWinnerHat` which is already in
scope. The old 2500ms auto-reload timer and its module-scope
`POST_CLAIM_RELOAD_HOLD_MS` + `postClaimReloadTimerId` constants are
removed. The existing `#savedHatContinueBtn` handler now calls
`window.location.reload()` after hiding the overlay, so the reset
only fires when the customer clicks Continue.

Retained as failsafes:
- `writeSavedHatFlag(spinWinnerHat.id)` still fires before the
  immediate show. If the customer hard-reloads while the popup is
  visible, the existing post-reload trigger path renders it one more
  time. Immediate-show calls `clearSavedHatFlag()` so a normal
  Continue click never causes a second display post-reload.
- `savedHatOverlayShown` module flag prevents duplicate renders
  within a session across both the immediate path and the
  post-reload failsafe path.
- `maybeShowSavedHatOverlay()` hooks from `setBootPhase(CRATE_VIEW)`
  and `fetchEligibility` `finally` remain in place; they are
  no-ops in the normal Continue flow because the flag was cleared.

Visuals: unchanged. Same `#savedHatOverlay`, same `.saved-hat-card`,
same copy "Your hat is locked in for fulfillment", same tactical
HUD styling in `src/style.css`.

Regression surface: none expected. Finalize, consume,
pending-result bridge, inventory filter, eligibility API, CLAIMED
state transition, audio, camera, scene, intro reliability, and
Press X prompt are all untouched.

---

## 2026-04-14 -- One-time post-save confirmation card

**Type:** UX addition. Smallest safe crate-repo-only move.
`src/main.js`, `src/style.css`, `docs/source-of-truth.md`,
`docs/runtime-test-checklist.md`, `docs/change-log.md`. No server,
theme, Flow, multi-combo, audio, camera, scene, or state-machine change.

Before: after Save Result succeeded, the purchased path held the
CLAIMED panel ~2.5s then reloaded to the intro flow. The customer got
no post-reload confirmation of which hat was actually locked in for
fulfillment.

After: a sessionStorage key `crate.savedHat.pending` carrying
`{ hat_id, saved_at }` is written immediately before the existing
`window.location.reload()` in the post-claim reset. On the next load,
after `fetchEligibility` resolves and after the boot phase reaches
`CRATE_VIEW`, the app cross-checks the flag's `hat_id` against
`eligibility.hatWon`. When both agree and the hat exists in
`src/hats.js`, a single-use overlay card (`#savedHatOverlay`) displays
the saved hat image, name, and the copy "Your hat is locked in for
fulfillment", with a Continue button to dismiss. The flag is removed
the moment the card renders (or on any mismatch) so it never
reappears on later visits.

Design notes:
- sessionStorage scoped to the tab was chosen over localStorage so
  the flag dies on tab close and over a URL param so it does not
  leak into shareable links.
- Display is deferred until after the intro handoff
  (`setBootPhase(BOOT_PHASES.CRATE_VIEW)`) so the card never competes
  with the fragile idle.mp4 / walk watchdog overlays.
- Hat name and image come from the existing `hats.js` module; no new
  data source and no new server endpoint.
- Server-side `crate_hat_won:HAT-ID` remains the single source of
  truth; the flag is only a one-time display trigger, never a
  persistence surface.

Flow: finalize -> flag written -> reload -> boot intro plays -> boot
reaches CRATE_VIEW -> card displays once -> Continue hides it. If
the flag is present but the server does not confirm the same hat
(race, network, mismatched customer), the flag is discarded silently.

Regression surface: none expected. Finalize, consume,
pending-result bridge, inventory filter, intro reliability, audio
unlock, camera, state machine, and marketing-state gating are all
untouched.

---

## 2026-04-13 -- Pending-result bridge: fallback-only durability for paid winners between consume and finalize

**Type:** Fallback-only resilience pass. Smallest safe move.
`api/_lib/shopify.js`, `api/pending-result.js` (new), `src/main.js`,
`docs/source-of-truth.md`, `docs/runtime-test-checklist.md`,
`docs/change-log.md`. Theme wrapper, preview path, audio, camera, scene,
and multi-combo logic all untouched.

Before: a purchased spin decremented `crate_spins:N` before the reel
ran, and the winner was only client-side until the customer clicked
Save Result. A tab close, network failure, or reload between consume
and finalize silently lost the paid result. The customer was also
dropped into preview mode by `fetchEligibility` when `spins_remaining`
reached zero, further hiding the loss.

Change: a tags-only pending-result bridge.

- New tag shape: `crate_pending_result:<HAT-ID>:<UNIX-MS>`. Single
  tag per customer, latest wins. Ignored by all pre-existing parsers
  because it is a new prefix. Cleared by `finalizeResult` in the same
  `PUT` that writes `crate_hat_won:<HAT-ID>`.
- `api/_lib/shopify.js`:
  - Added `TAG_PREFIX_PENDING`, `parsePendingResult`,
    `removePendingTags`, and `writePendingResult(customerId, hatId)`.
  - `writePendingResult` refuses to write if a finalized hat already
    exists (preserves the single-claim invariant).
  - `finalizeResult` now also strips `crate_pending_result:*` tags
    alongside `crate_spins:*` and prior `crate_hat_won:*`.
  - `checkEligibility` now returns `pending_result: { hat_id,
    timestamp } | null`.
- `api/pending-result.js` (new endpoint): `POST` with
  `{ customer_id, hat_id }`. Validates `hat_id` via existing
  `isValidHatId`. Mirrors the CORS + error shape of the other API
  routes.
- `src/main.js`:
  - Eligibility state gains `pendingResult`.
  - `fetchEligibility` captures `data.pending_result` and arms a
    new one-shot `hasPendingResume` flag when a pending tag exists
    and `hatWon` is null. The preview fallback no longer flips
    `isPreviewMode` in that case, so the customer stays on the
    purchased path.
  - New `writePendingResultServer(hatId)` fire-and-forget helper.
  - Reel-complete tail calls it the moment the paid winner lands at
    `setState(STATES.WINNER_SELECTED)`. Does not block UX. Preview
    spins do not trigger the write (gated on `isPurchasedSpin`).
  - `startSpin` has a new top-of-function resume branch. When
    `hasPendingResume` is set, it skips inventory gate, skips
    consume, skips the reel entirely, opens the crate, and lands
    directly on the pending hat at `WINNER_SELECTED`. Save Result
    then finalizes with the pending `hat_id`. The flag is consumed
    one-shot.
  - If the pending `hat_id` is no longer in the local `hats` pool
    (data mismatch), the resume branch aborts quietly without
    consuming a spin.

Untouched:
- Preview path, `buildComboCheckoutUrl`, combo redirect destination.
- `consumeSpin`, `crate_spins:N` semantics, the single-claim
  `crate_hat_won:*` overwrite block in `finalizeResult`.
- Audio, camera, scene, state machine transitions. The resume path
  reuses the existing `openCrate` + `setState(STATES.WINNER_SELECTED)`
  pair; it does not introduce new states or scene behavior.
- Theme wrapper, iframe embed contract, `customer_id` handoff.
- `src/hats.js`, `api/available-hats.js`, `api/_lib/allowed-hats.js`.

Deferred to later passes (explicitly out of scope here):
- Multi-combo support. The `crate_hat_won:*` overwrite invariant is
  the load-bearing single-claim guarantee and is untouched. Customers
  who buy a second combo after a prior finalize still cannot finalize
  a new hat on the current tag model.
- Closing the ~6 second reel-in-progress gap between consume and
  `WINNER_SELECTED`. The pending write happens at the winner-landed
  moment; interruption during the reel itself still loses the spin.
- Self-service restore endpoint. Recovery is a manual Shopify admin
  tag edit for now.
- Metafield migration. Right shape long term, larger blast radius;
  deferred until scope is verified.

---

## 2026-04-13 -- Preview path wording pass: "Buy Combo Pack" CTA + preview-only copy

**Type:** Copy-only. `src/main.js`, `docs/runtime-test-checklist.md`,
`docs/change-log.md`. No behavior changed.

Change: preview CTA button label and preview result panel copy
tightened so the preview path reads clearly as preview-only and
directs users at the combo pack, not the revealed hat.

- CTA button label: `Proceed to Checkout` -> `Buy Combo Pack`.
- Preview idle result copy in `updatePanelPresentation`:
  - subtitle: `Preview only. Buy the combo pack to unlock your real spins.`
  - label: `Preview Only`
  - status: `Buy Combo Pack opens the $50 combo product page`
- Preview `CLAIMING` state copy:
  - subtitle: `Opening the combo pack product page`
  - label: `Combo Pack`
  - status unchanged (`Loading the Candy Facts Mystery Box Combo`)
- Dead local `winnerName` removed from `updatePanelPresentation` (no
  consumer remained after the preview strings dropped the hat name).

Untouched:
- Redirect destination (`COMBO_CHECKOUT_URL` =
  `https://amerikid.ca/products/candyfacts-mystery-box-combo`).
- Preview behavior: still 1 local preview spin, still non-binding,
  still no modal/overlay, Press X still works before the preview
  spin.
- Purchased path, finalize, `crate_spins:N`, `crate_hat_won:HAT-ID`,
  post-claim reload.
- Audio, camera, scene, state machine, theme wrapper.
- `buildPreviewCheckoutUrl` and every `shopifyVariantId` in
  `src/hats.js` (still retained for future reuse).

---

## 2026-04-13 -- Preview CTA redirects to $50 combo product instead of exact-hat cart permalink

**Type:** Crate-repo-only redirect + copy change. Smallest safe move.
`src/main.js`, `docs/source-of-truth.md`, `docs/runtime-test-checklist.md`,
`docs/change-log.md`.

Before: on the preview path, clicking "Proceed to Checkout" built a
`/cart/{shopifyVariantId}:1` permalink for the exact revealed hat via
`buildPreviewCheckoutUrl(spinWinnerHat)` and redirected the user to
Shopify. The result panel copy told the user the "exact" revealed hat
was being added to checkout. This conflicted with the launch direction
that preview users should always be routed into the $50 combo purchase
path, not a per-hat purchase of the hidden mystery-hat product.

Change: the preview branch of the `claimBtn` handler now redirects to
`https://amerikid.ca/products/candyfacts-mystery-box-combo` via a new
`buildComboCheckoutUrl()` helper backed by a `COMBO_CHECKOUT_URL`
constant. The existing `buildPreviewCheckoutUrl()` helper and every
`shopifyVariantId` entry in `src/hats.js` are left intact for possible
future reuse of exact-hat preview checkout.

Preview result panel copy no longer implies the revealed hat is being
added to checkout. Updated strings in `updatePanelPresentation`:
- Idle preview result: subtitle "Buy the $50 combo to unlock a real
  mystery hat", label "Preview Result", status "Proceed to Checkout
  opens the $50 combo product".
- While redirecting (`CLAIMING`): subtitle "Opening the $50 combo
  product page", label "Combo Checkout", status "Loading the Candy
  Facts Mystery Box Combo".

Untouched:
- Purchased path, `finalizeSpinResult`, `/api/finalize`,
  `crate_hat_won:HAT-ID` persistence, `crate_spins:N` decrement, the
  post-claim reload.
- `/api/available-hats`, `/api/eligibility`, `/api/consume-spin`,
  `/api/claim-spin`.
- Inventory-aware pool filter (still read-only, still gates both
  paths).
- Audio, camera, scene behavior, state machine, tactical HUD polish,
  intro MP4 reliability, deferred hat texture preload.
- Shopify theme wrapper, iframe embed contract, `customer_id`
  handoff.
- `src/hats.js`, including every `shopifyVariantId` mapping.

Known follow-ups (out of scope this pass):
- Preview hat persistence across combo purchase is not implemented.
- Whether `/api/available-hats` should continue to gate the preview
  reel now that preview never commits to the revealed variant is a
  product decision. Left unchanged for launch.
- Copy in older docs that still references "exact revealed hat"
  preview checkout will be reconciled incrementally; this pass
  updated only the source-of-truth and runtime-test-checklist bullets
  that directly contradict the new behavior.

---

## 2026-04-09 -- Deferred hat texture preload: keep ~63 MB of PNGs off the first-paint critical path

**Type:** Mobile-first lag audit follow-up. Smallest safe crate-side
move. `src/main.js`, `docs/change-log.md`, `docs/runtime-test-checklist.md`,
`docs/source-of-truth.md`.

Before: after the 2026-04-09 intro MP4 reliability pass, the idle
preload hint was priming the byte cache for `idle.mp4` before the Vite
bundle even executed, and walk was deferred behind idle's `loadeddata`
so the two videos no longer competed. Good. But at module init, the
crate was still eagerly kicking **15 hat PNG downloads totaling roughly
63 MB** via a `for (const hat of hats) { textureLoader.load(...) }`
loop at what was then `src/main.js:1106-1111`. On mobile cellular these
downloads fired in parallel with `idle.mp4`, `room.png` (4.9 MB),
`ambient.mp3` (2.3 MB), the Vite JS bundle, and Google Fonts. At
~1-5 MB/s mobile throughput, the hat pool alone could take 12-60 s to
fully land, stealing bandwidth from the idle video and slowing the
first playable frame. This was the clear dominant remaining lag
contributor, specifically on mobile / iframe cold boots.

Fix: smallest safe move scoped strictly to the hat texture pipeline.
Nothing else was touched.

What changed inside `src/main.js`:

- Replaced the eager preload loop with a `hats.map(...)` that
  allocates 15 empty `new THREE.Texture()` placeholder objects, each
  with `colorSpace = SRGBColorSpace` set. Every downstream reference
  to `hatTextures[i]` is immediately valid (truthy, renderable), so
  `createHatDisplay3D()`, `setHatIndex()`, and the initial
  `showHat(currentHatIndex)` call at what is now around line ~1896
  can bind materials at scene-ready time without any guard changes.
- Added a `hatTexturesPreloadKicked` flag and a
  `kickHatTexturePreload()` function that iterates the hats array and
  fetches each image via `new Image()` with `decoding = 'async'` and
  `fetchPriority = 'low'` where supported (Chrome 101+, Safari 17.2+,
  Firefox 132+; older browsers silently ignore the hint). On
  successful load, the image element is assigned onto the
  corresponding placeholder's `.image` and `needsUpdate = true` is
  set so bound materials pick up the new pixels on the next render
  tick. On error, the placeholder stays empty (fully culled by the
  existing `alphaTest: 0.35` on all three hat planes, so no visible
  artifact).
- `kickHatTexturePreload()` is idempotent via the flag guard and is
  wired into three code paths: the `bootIdleVideo` `loadeddata` event
  handler (primary path), the `bootIdleVideo?.readyState >= 2` fast
  path right below the event wiring (covers the race where the
  preload hint has already populated the buffer by the time the
  module runs), and `markBootIdleLoadFailed()` as a failure fallback
  so the retry path still has textures available if the user
  eventually succeeds past an initial idle load failure.
- The deferred kick happens in the same spot where walk load is
  kicked, meaning hats and walk begin their downloads at the same
  instant -- but with the `fetchPriority = 'low'` hint the browser
  scheduler keeps hats behind walk and any other default-priority
  resources, as defense in depth on top of the "wait for idle" gate.

What was not changed:
- Three.js TextureLoader usage for `room.png` and the environment
  map remains eager. room.png is 4.9 MB and is on the crate scene
  critical path, so it is intentionally left alone.
- `new Audio()` preload for `ambient.mp3`, `sound.mp3`, `open.mp3`,
  `close.mp3`, `claim.mp3`. Touching the audio preload flags would
  risk the iframe audio unlock system, which `docs/known-fragile-areas.md`
  explicitly marks as do-not-touch unless audio is confirmed broken.
- `showHat(currentHatIndex)` at module init still sets
  `resultImage.src = hat.image` for the mainline DOM `<img>` inside
  the result panel. That triggers a single eager PNG fetch for the
  mainline hat only (~7.3 MB), but is left alone this pass because
  it would require restructuring the result-panel initialization
  flow for a marginal additional win.
- The spin reel cycling logic, winner selection, gold prestige pass,
  `createHatDisplay3D()`, and all state machine transitions are
  structurally untouched. The reel still cycles all 15 hats
  visually; early cycles simply render invisible if their texture
  has not landed yet (alphaTest cull).
- No MP4 re-encoding. The 2026-04-09 MP4 reliability pass is fully
  preserved (`index.html` preload link, walk `preload="metadata"`,
  serialized load, timeout watchdogs, Tap To Retry recovery).
- Boot phase state machine (`BOOT_PHASES`), `startIdleVideo`,
  `startWalkVideo`, `finishBootVideoHandoff`, `beginWalkFade`,
  `handleWalkVideoTimeUpdate`, walk fade threshold computation.
- Boot layer DOM, CSS class toggles, tactical HUD polish, CTA copy.
- Eligibility model, `crate_spins:N`, `crate_hat_won:HAT-ID`, all
  `/api/*` endpoints, Shopify integration.
- Preview path, purchased path, spin cadence, winner selection,
  winner-only gold prestige pass, result panel, post-claim reset.
- Theme wrapper, Shopify admin, iframe embed, customer handoff,
  guest email CTA path, `ak-mb-prestart`, `ak-mb-release`,
  bunker monitor shell. Shopify theme repo was NOT touched in this
  pass.
- Public asset files in `public/hats/`. The ~5.2 MB of unused legacy
  placeholders (`hat1.png` through `hat5.png`) are still present on
  disk but continue to be unreferenced by any code path, so they do
  not affect the critical bandwidth budget.

Net feel target: on mobile cold boots, the idle video reaches its
first playable frame visibly faster because the hat PNG pool is no
longer racing it for bandwidth at module init. Walk continues to
download serialized behind idle as before. Hats populate
asynchronously in the background once idle is ready, with
`fetchPriority = 'low'` keeping them out of the way of walk. By the
time the user reaches the spin phase (idle video play + Enter Portal
click + walk video play + crate intro tilt + Press X prompt + lid
open ~ 10 s minimum on even a fast connection), the overwhelming
majority of hats should be fully cached on any realistic mobile link.

---

## 2026-04-09 -- Intro MP4 reliability pass: preload hint, serialized load, error+timeout recovery

**Type:** Minimal crate-side boot-video reliability fix. `index.html`,
`src/main.js`, `docs/runtime-test-checklist.md`.

Before: the intro boot sequence relied on two MP4s (`idle.mp4` ~7.1 MB
and `walk_in_animation.mp4` ~15.4 MB, ~22.5 MB combined) that were
injected into the DOM via `app.innerHTML` inside `src/main.js` after the
HTML parser had already finished. The browser preload scanner therefore
never discovered the video URLs during initial HTML parse, so both
downloads only began after the Vite bundle had been fetched, parsed,
and executed. Once the boot layer was injected, both videos immediately
triggered `.load()` in parallel as equal-priority critical downloads, so
the heavier walk clip competed with the idle clip for first-paint
bandwidth and extended the "Loading..." state. A post-parse forEach at
`src/main.js:817-822` mutated `video.crossOrigin = 'anonymous'` on both
elements after they had already been attached to the DOM with different
effective CORS state, which per the HTML spec can trigger a re-fetch of
already-queued media. And if either MP4 stalled, 404'd, or hit a hard
network failure, the only error surface was the `.play()` try/catch
inside `startIdleVideo()`, which only runs *after* the user has clicked
the CTA -- so a failed initial download left the CTA parked at
"Loading..." forever with no recovery path.

Fix: smallest safe reliability pass scoped strictly to the crate repo
and the boot-video lifecycle. Nothing else was touched.

What changed inside `index.html`:

- Added `<link rel="preload" as="video" href="/media/portal/idle.mp4"
  type="video/mp4">` to the document head, immediately above `<title>`.
  This lets the HTML parser's preload scanner start fetching idle.mp4
  into the HTTP cache in parallel with the Vite module script fetch and
  execution, so by the time `main.js` injects the boot layer DOM, the
  idle video bytes are typically already in cache. Browsers that do not
  support `rel=preload as=video` simply ignore the hint. Walk is
  intentionally *not* preloaded so it cannot compete with idle for
  first-paint bandwidth.

What changed inside `src/main.js`:

- The injected boot layer HTML now sets `preload="metadata"` on
  `#bootWalkVideo` instead of `preload="auto"`. Metadata is enough to
  get the moov atom + duration parsed for the fade-threshold
  computation, but will not eagerly download the video body.
- The post-parse forEach at the bottom of the boot-video wiring block
  no longer mutates `video.crossOrigin = 'anonymous'` or reassigns
  `video.preload = 'auto'`. Only `video.playsInline = true` remains as
  a defensive backup for the HTML attribute. The crate is same-origin
  with its MP4s and does not pipe video into a WebGL texture, so the
  anonymous CORS mode was adding request complexity without a payoff.
- Added six new module-scope symbols inside the boot reliability block:
  `BOOT_IDLE_TIMEOUT_MS` (12000), `BOOT_WALK_TIMEOUT_MS` (20000),
  `bootIdleTimeoutId`, `bootWalkTimeoutId`, `bootIdleLoadFailed`,
  `bootWalkLoadFailed`, and `walkLoadKicked`. These gate the retry
  state and prevent the UI from sticking forever.
- Added six new helpers next to `handleBootMediaReady()`:
  `clearBootIdleTimeout()`, `clearBootWalkTimeout()`,
  `markBootIdleLoadFailed()`, `markBootWalkLoadFailed()`,
  `kickBootIdleLoad()`, `kickBootWalkLoad()`. The kick functions call
  `.load()` inside a try/catch and schedule a timeout watchdog. The
  mark functions flip the failed flag, store the error in
  `audioState.lastError`, clear the timer, and call
  `updateBootPresentation()` so the CTA can re-enable as "Tap To
  Retry".
- `updateBootPresentation()` now factors the failed flags into button
  enabled state and text. When the black screen is active and the
  idle load has failed, the button enables with "Tap To Retry" copy
  instead of staying disabled at "Loading...". Same pattern for the
  Enter Portal button on the walk path.
- `bootIdleVideo` and `bootWalkVideo` now have explicit `'error'` and
  `'stalled'` event listeners. Error listeners call the matching
  `markBoot*LoadFailed` helper so the UI immediately flips to the
  retry state. Stalled listeners only record the message (the
  timeout watchdog is authoritative).
- The `'loadeddata'` handler for idle now clears the idle timeout and,
  if walk has not yet been kicked, calls `kickBootWalkLoad()` to begin
  the walk download. This is the serialized-load core: idle gets the
  full bandwidth window until it finishes buffering, then walk
  escalates from `preload="metadata"` to `preload="auto"` with a fresh
  `.load()` call and the walk timeout starts.
- The `'loadeddata'` handler for walk clears the walk timeout before
  calling `handleBootMediaReady('walk')`.
- The `bootStartBtn` click handler now branches on
  `bootIdleLoadFailed && !bootMediaReady.idle`. In that case it
  re-kicks the idle load and refreshes the presentation instead of
  trying to play the non-existent video. The happy path is unchanged.
- The `bootEnterPortalBtn` click handler adds the same
  `bootWalkLoadFailed && !bootMediaReady.walk` branch and re-kicks the
  walk load on retry.
- The old `bootIdleVideo?.load() ; bootWalkVideo?.load()` initial
  parallel kick-off was replaced with a single `kickBootIdleLoad()`
  call. The walk load is deferred to idle's loadeddata. The
  `readyState >= 2` fast paths for both videos still work: idle also
  kicks walk if it is already ready when the module first runs.

What was not changed:
- No MP4 re-encoding. The underlying `idle.mp4` and
  `walk_in_animation.mp4` files are untouched. If a future pass can
  verify moov atom placement and encoder profile with confidence, that
  work can be scoped separately.
- Boot phase state machine (`BOOT_PHASES`, `setBootPhase`,
  `bootPhase`, `sceneReady`, `bootMediaReady`) and its transitions.
- `startIdleVideo()`, `startWalkVideo()`, `finishBootVideoHandoff()`,
  `beginWalkFade()`, `handleWalkVideoTimeUpdate()`,
  `markSceneReady()`.
- `WALK_FADE_LEAD_S`, `walkVideoFadeThreshold`, `walkFadeStarted`.
- Boot layer DOM, CSS class toggles, copy ("Dark Aether Uplink", "Dark
  Aether Feed", "Candy Facts Mystery Box", "Click To Enter", "Enter
  Portal", "Loading...", "Tap To Retry"), tactical HUD polish.
- Audio unlock system, ambient volume logic (`AMBIENT_VOLUME_PORTAL`,
  `AMBIENT_VOLUME_CRATE`, `AMBIENT_VOLUME_SPIN`), iframe audio
  overlay.
- Eligibility model, `crate_spins:N`, `crate_hat_won:HAT-ID`,
  `/api/eligibility`, `/api/consume-spin`, `/api/finalize`,
  `/api/available-hats`.
- Preview path, purchased path, spin cadence, spin easing, winner
  selection, winner-only gold prestige pass, result panel.
- Post-claim reset (`POST_CLAIM_RELOAD_HOLD_MS`, `window.location.reload()`).
- Theme wrapper, Shopify admin, Shopify Flow, iframe embed, customer
  handoff, guest email CTA path, bunker monitor shell, `ak-mb-canvas`,
  `ak-mb-prestart`, `ak-mb-release`.

Net feel target: the initial "Loading..." window shortens because the
HTML parser begins fetching idle.mp4 before the Vite bundle has even
executed, and because the walk download no longer competes with idle
for the first-paint bandwidth slice. On a cold cache with a slow
connection, the serialized load also means idle finishes sooner and
starts playing sooner, giving the user the portal ambience while walk
continues downloading in the background. If either MP4 fails to load,
the CTA gracefully flips to "Tap To Retry" after 12 s (idle) or 20 s
(walk) instead of sitting at "Loading..." forever.

---

## 2026-04-09 -- Post-claim reset: purchased-path CLAIMED briefly holds then reloads to intro

**Type:** Minimal purchased-path UX fix. `src/main.js`, `docs/runtime-test-checklist.md`.

Before: after a purchased-path `Save Result` finalized successfully, the
experience landed on `STATES.CLAIMED` with the panel showing "Saved
Result" / "Saved for fulfillment" and no path forward -- `claimBtn` is
hidden in CLAIMED, `spinBtn` is hidden because `canPurchasedSpin` is false
(spinsRemaining=0 + hatWon truthy), and utility buttons are hidden. The
customer was parked on a dead-end panel with correct persisted data but
no ceremony to return to the beginning.

Fix: after the purchased-path finalize success branch reaches CLAIMED
inside the `claimBtn` click handler's `closeCrate().then(...)` callback,
schedule a single `window.location.reload()` after a short hold so the
customer sees the "Saved Result" confirmation briefly, then the page
reloads back to the black-screen -> idle video -> walk video -> crate
intro cinematic exactly as it runs on first load. The existing
eligibility fetch logic at `src/main.js:170-172` already routes a
returning signed-in customer with `spinsRemaining === 0` into preview
mode regardless of `hatWon` state (per the 2026-04-07 post-purchase
preview bug fix), so after reload the same customer naturally lands in
post-purchase preview mode with 1 non-binding preview spin and a
`Proceed to Checkout` CTA. Nothing in the entitlement, finalize,
checkout, preview, eligibility, boot, MP4, audio, spin, state machine,
or theme layers changes.

What changed inside `src/main.js`:

- Added two module-scope declarations near `AUTO_CLOSE_AFTER_WINNER_MS`:
  `POST_CLAIM_RELOAD_HOLD_MS` (2500 ms) and `postClaimReloadTimerId`
  (null). Matching naming pattern and placement of the existing
  `autoCloseTimerId`.
- Inside the purchased-path branch of the `claimBtn` click handler, at
  the end of the `closeCrate().then(() => { ... })` callback, after
  `isPurchasedSpin = false`, a single `setTimeout` was added that
  clears any prior reload timer then calls `window.location.reload()`
  after `POST_CLAIM_RELOAD_HOLD_MS`. Guarded by a pre-clear of any
  prior `postClaimReloadTimerId` so rapid re-entry cannot schedule
  overlapping reloads.
- The reload timer is gated strictly inside the purchased-path branch.
  The preview branch returns early at
  `redirectToCheckout(previewCheckoutUrl)` well before this callback
  ever runs, so no new preview gating was required.

What was not changed:
- `finalizeSpinResult()` or `/api/finalize`
- Preview path (`redirectToCheckout()` and `buildPreviewCheckoutUrl()`)
- Eligibility fetch logic (`fetchEligibility()`) or the
  `spinsRemaining === 0 -> isPreviewMode = true` fallback
- Entitlement model (`crate_spins:N`, `crate_hat_won:HAT-ID`)
- The `STATES` enum, `setState()`, or any state machine transitions
- Panel DOM, CSS, class toggles, or copy
- `scheduleAutoClose()` / `cancelAutoClose()` / `autoCloseTimerId`
- Purchased-path `Save Result` finalize sequencing up to and including
  the CLAIMED state assignment
- Boot flow, MP4 system, audio unlock system, ambient volume logic
- Spin easing, spin cadence, spin timing, winner selection, prestige
  pass, winner-only 3D gold envelope
- Crate geometry, camera, intro tilt, idle bob, portal flow
- Guest combo purchase path, signed-in purchased path, preview path
- Theme wrapper, Shopify admin, Shopify Flow
- Backend, API endpoints, CORS, token caching

Net feel target: after a purchased customer saves their result, they
briefly see the locked-in confirmation, then the experience gracefully
returns to the full intro cinematic instead of leaving them parked on a
terminal panel. Post-reload they can take one non-binding preview spin
if they want to explore more hats.

---

## 2026-04-09 -- Tactical HUD polish: classified-console language on boot cards and result panel

**Type:** Pure CSS visual polish. `src/style.css` only.

Chose a single cohesive visual direction -- a BO2 / Dark Aether uplink
"classified console" language -- and applied it across the three surfaces
named in the pass (black-screen boot card, idle-video overlay, post-spin
result panel) via an appended CSS section. Zero DOM changes, zero JS
changes, zero behavior changes, zero state-machine changes, zero copy
changes.

Why this direction: the existing surfaces already had reasonable bones
(boot kicker / title / CTA structure, frosted-glass panel with
winner-reveal keyframe, Black Ops One font loaded in index.html but only
used on buttons). They read as generic-webby rather than game-like. The
shortest path to "premium Xbox-era game UI" is a shared decorative HUD
overlay that ties the opening cards and the reward panel into one
recognizable language without touching structure or motion.

What changed inside `src/style.css` (all additive, appended after the
existing mobile media query, ~320 new lines):

- New CSS variables on `:root`: `--hud-amber`, `--hud-amber-soft`,
  `--hud-cyan`, `--hud-gold`, `--hud-stroke-width`, `--hud-corner-length`,
  `--hud-scanline`.
- Shared HUD frame overlay on `::after` pseudo-elements for `.boot-copy`,
  `.boot-idle-copy`, `.panel`, and `.result-card`. Each overlay is a
  single absolutely-positioned layer `inset: 0; pointer-events: none;
  z-index: 0;` with a stacked `background-image` containing four corner
  bracket strokes (8 gradient layers) plus a very subtle horizontal
  scanline pattern. This lives on `::after` rather than the base element
  so it does not conflict with the accepted `.panel.winner-reveal
  .result-card` keyframe (which animates the `background` /
  `border-color` / `box-shadow` shorthands on `.result-card` itself).
- Content stacking: `.boot-copy > *`, `.boot-idle-copy > *`,
  `.panel > div`, `.result-card > *` now get `position: relative;
  z-index: 1;` so the frame overlay sits behind the content.
- Sharper corners across all frames (border-radius reductions to 2-4px):
  `.boot-copy`, `.panel`, `.result-card`, `button`.
- `.boot-idle-copy` now renders as a true tactical readout over the
  portal video: padding + translucent dark gradient background + thin
  amber border + rounded-to-4px + HUD frame overlay. Previously it was
  an unstyled flex column.
- Typography upgrade: `.boot-title` and `.panel-header h1` now use
  `Black Ops One` (the font was already loaded in index.html but only
  applied to buttons), with wider letter-spacing, warm amber + cool cyan
  dual-channel text-shadow, uppercase.
- `.result-details h2` (winning hat name) upgraded to Black Ops One,
  slightly larger, amber text-shadow.
- `.boot-kicker` restyled as a tactical terminal strip: cyan color,
  0.34em tracking, amber `[` and `]` bracket glyphs added via
  `::before` / `::after` `content:` (pure decoration of the existing
  kicker text, no new copy introduced).
- `.boot-cta` and `.controls button` both get diagonal top-right and
  bottom-left corner bevels via `clip-path: polygon(...)`, Black Ops One
  font, wider tracking, inset 3px amber bottom-bar box-shadow for
  tactical weight, amber glow on hover.
- `#claimBtn` gets a dedicated amber-prestige palette in its purchased
  variant (warm gradient, gold text-shadow, amber rim on hover) and a
  dedicated cyan-data palette via `.panel.preview-result #claimBtn`
  (cool gradient, cyan text-shadow, cyan rim on hover). This visually
  distinguishes "Save Result" (purchased, amber) from "Proceed to
  Checkout" (preview, cyan) without changing text or behavior.
- `.label` and `.status-line` rewritten as tactical terminal chips:
  sharp 2px corners, amber border, amber text-shadow, state-specific
  color shifts (amber default, cyan for preview-result, gold for
  claimed-result).
- HUD frame state colors: `.panel.preview-result::after` overrides
  `--hud-amber-soft` to cyan; `.panel.claimed-result::after` and
  `.panel.winner-reveal::after` override to bright gold AND add a
  2.4s-loop opacity breath via `hud-frame-pulse` keyframe. This ties
  the 2D panel frame to the already-shipped 3D winner prestige pass
  (gold glow).
- Staggered arrival: `.panel.visible .panel-header` and
  `.panel.visible .controls` each get a subtle 520ms
  `hud-fade-up` animation with 120ms and 220ms delays. The already
  accepted `.panel.winner-reveal .result-card` reveal keyframe is
  unchanged and fires on top of the stagger for result states.
- Mobile `(max-width: 820px)` block tightens `--hud-corner-length` to
  16px, `--hud-stroke-width` to 1.4px, kicker tracking to 0.26em, title
  letter-spacing to 0.04em, and shrinks the button clip-path bevels.

What was not changed:
- `index.html` (no new fonts, no new assets, no new meta tags)
- `src/main.js` (no DOM changes, no state machine changes, no JS
  changes, no button action changes, no copy changes, no class-toggle
  logic changes)
- The accepted `.panel.winner-reveal .result-card` 520ms keyframe
- `.result-card` base background, border, and box-shadow properties
  (HUD overlay is on `::after` so the keyframe is unaffected)
- The boot card copy (still exactly: kicker "Dark Aether Uplink",
  title "Candy Facts Mystery Box", one CTA "Click To Enter" / "Loading...")
- The idle overlay copy (still exactly: kicker "Dark Aether Feed",
  title "Candy Facts Mystery Box", button "Enter Portal")
- Button dynamic text logic (`Spin`, `Spin Again`, `Save Result`,
  `Proceed to Checkout`) and button visibility rules
- State machine states or transitions
- Purchased vs preview branching, finalize API, checkout routing
- Spin easing, spin timing, spin audio, spin cadence, winner selection
- Winner-only prestige pass (3D gold glow envelope)
- Camera position, intro tilt, idle bob, portal flow
- Crate geometry, lid, question marks, cinder blocks, atmosphere pass
- Backend, Shopify, Flow, storefront wrapper, API routing

Net feel target: opening sequence reads as a ritualized uplink console
instead of a frosted web card; the post-spin panel reads as a loot /
claim terminal readout instead of an Apple-style glass panel; the whole
experience holds together with one tactical language from boot to reward.

---

## 2026-04-09 -- Front-half spin cadence: reduce EXTRA_FULL_ROTATIONS_MAX from 2 to 1

**Type:** Minimal timing tweak. `src/main.js`.

Single-integer change to calm the front half of the reel without touching the
accepted landing feel. `EXTRA_FULL_ROTATIONS_MAX` lowered from `2` to `1` at
`src/main.js:1098`. Each spin now adds 0 or 1 extra full hat-pool rotations
(instead of 0, 1, or 2) before landing on the pre-selected winner. Average
total step count drops from ~52 to ~45, and maximum drops from 74 to 59.
Because cadence = `spinTotalSteps / spinDuration * easingVelocity(t)`, this
lowers swaps-per-second proportionally across the whole curve, with the
largest perceptual effect on the front-half crest where the hermite wind-up
peaks. The landing is preserved: only ~1-2 swaps occur in the last 20% of
time regardless of step count, so the back-half feel is effectively
unchanged.

What was not changed:
- `spinEasing()` -- curve shape, rampEnd, power exponent, C1 join all identical
- `MIN_FULL_ROTATIONS` -- reserved as the next fallback if the front half still reads as too fast
- `SPIN_BASE_DURATION_MS`, `AUDIO_SILENCE_TAIL_MS`, `SPIN_END_PADDING_MS`
- `spinDuration` derivation or audio sync
- `showHat()` scale pop language
- `startSpin()` beyond the constant it reads
- Winner selection (`selectWeightedHat`), inventory gating, finalize, eligibility
- Winner prestige pass (gold grail language, impact/sustain/settle, steady hold)
- State machine states or transitions, auto-close timing
- Panel DOM, CSS, copy, button visibility rules
- Post-open pause variation, crate open/close SFX, spin audio volume
- Camera, portal flow, atmosphere, materials, geometry
- Backend, Shopify, Flow, storefront wrapper, API routing

---

## 2026-04-09 -- Winner-only prestige pass: gold grail language, impact/sustain/settle envelope, steady hold

**Type:** Winner-only visual polish. `src/main.js`.

Replaced the old 420 ms single-sine winner reveal + soft pink sine hold with a
prestige-first winner language that only activates once the final hat lands.
Nothing about the spin itself changes -- spin easing, cadence, duration, audio,
selection logic, state flow, auto-close timing, panel DOM/copy, backend, and
Shopify behavior are all untouched.

What changed inside `src/main.js`:

- `WINNER_REVEAL_DURATION_MS` extended from `420` to `1100`. Added
  `WINNER_REVEAL_IMPACT_END_MS` (180) and `WINNER_REVEAL_SUSTAIN_END_MS` (700)
  phase markers. The hat reveal is now impact (cubic rise 0-180 ms) -> sustain
  (hold at peak 180-700 ms) -> settle (smoothstep fall 700-1100 ms).
- `getWinnerRevealImpulse()` rewritten to the three-phase shape. Still only
  non-zero in `STATES.WINNER_SELECTED`. Scale and glow boost ceilings
  (`0.18` / `0.42`) unchanged.
- Added `getWinnerLightFlash()` as a separate shorter envelope
  (`WINNER_LIGHT_FLASH_DURATION_MS` 520, peak at 160) so the crate internal
  light punches crisply at landing without staying blown out through the full
  ~1.1 s hat envelope. Crate light boost magnitude (`2.0`) unchanged.
- Added prestige color constants: `WINNER_GLOW_BASE_COLOR` (`0xff33ff`) and
  `WINNER_GLOW_PRESTIGE_COLOR` (`0xffc855` warm gold), plus
  `WINNER_OUTLINE_BASE_COLOR` (`0x000000`) and `WINNER_OUTLINE_PRESTIGE_COLOR`
  (`0xfff0c8` bright warm white). Transition timed by `WINNER_COLOR_TRANSITION_MS`
  (320 ms).
- Added steady hold language constants: `WINNER_HOLD_GLOW_OPACITY` (0.55),
  `WINNER_HOLD_BREATH_AMPLITUDE` (0.04), `WINNER_HOLD_BREATH_SPEED` (0.9),
  `WINNER_HOLD_OUTLINE_OPACITY` (0.6), `WINNER_HOLD_OUTLINE_SCALE` (1.09),
  plus baseline mirrors (`WINNER_OUTLINE_BASE_OPACITY` 0.3, `WINNER_OUTLINE_BASE_SCALE` 1.06).
- `setState()` reset rule for `winnerRevealStartTime` changed. It previously
  cleared on any non-WINNER_SELECTED state transition; now it only clears on
  entry to `READY`, `OPENING`, or `SPINNING`. This keeps the gold prestige
  language alive through `WINNER_PENDING_CLAIM`, `CLAIMING`, `CLOSING`, and
  `CLAIMED` states -- the full window the user interacts with the winner.
- Added a per-frame `prestigeActive` + `winnerColorProgress` computation in
  the render loop so the color transition runs even after the impulse has
  completed, and snaps back to baseline the moment the prestige clock is
  cleared.
- Render loop now lerps `hatDisplayGlow.material.color` from pink to gold and
  `hatDisplayOutline.material.color` / `opacity` / `scale` from its functional
  black baseline to a bright warm rim as `winnerColorProgress` rises.
- Crate internal light intensity now uses `winnerLightFlash` instead of the
  generic `winnerRevealImpulse`, so the light spike is the old short punch
  while the hat scale/glow stays on the new long sustain.
- Winner hold glow opacity replaces the old `0.25 + 0.15*sin(time*3)` soft
  pink pulse with a steady `WINNER_HOLD_GLOW_OPACITY` + very gentle
  `sin(time*0.9) * 0.04` slow breath, gated by `winnerColorProgress` so it
  fades in alongside the color transition (no landing jump). Clamp raised
  from `0.9` to `0.95` to accommodate the boosted sustain peak.

Net feel target: the winning hat now punches in with a sharp light flash,
holds for ~500 ms in a warm gold spotlight with a promoted rim outline, then
eases down into a steadier prestige hold that reads as "offered" rather than
"breathing." Spin cycling is untouched -- the pink crate glow language remains
identical during the reel itself.

What was not changed:
- `spinEasing()`, `animateSpin()`, or any spin cadence / timing
- `startSpin()`, `showHat()` cycling pop, spin audio, SFX, ambient volumes
- State machine states, transitions, or auto-close timer
- Panel DOM, CSS, class toggles, or copy
- Purchased vs preview branching, finalize API, checkout routing
- Crate geometry, lid, question marks, crack materials, cinder blocks
- Camera position, intro tilt, idle bob, background sphere
- Backend, Shopify, Flow, storefront wrapper, inventory filtering
- Any new assets, shaders, or post-processing

---

## 2026-04-08 -- Spin easing: add wind-up ramp and more dramatic deceleration

**Type:** Motion polish. `src/main.js`.

Replaced the pure ease-out spin easing (`1-(1-t)^1.7`) with a two-phase curve: a cubic hermite wind-up ramp over the first 15% of the timeline (starts from standstill, accelerates visibly), then a power ease-out with exponent 2.4 (more dramatic deceleration than the old 1.7). The two phases are C0+C1 continuous (matching value and derivative at the join). The spin now reads as: brief wind-up from zero, fast readable middle, dramatically slowing final approach to the winner. No changes to spin duration, total steps, winner selection, audio, or state machine.

---

## 2026-04-08 -- Audio mix correction: spin 0.30, SFX 0.25, crate ambient 0.08 with spin ducking

**Type:** Volume rebalance + ambient ducking. `src/main.js`.

Lowered spin jingle from `0.35` to `0.30`. Lowered open/close SFX from `0.40` to `0.25`. Raised normal crate-scene ambient from `0.05` to `0.08`. Added spin-time ambient ducking: ambient drops to `0.05` when spin starts, restores to `0.08` after the winner hat lands. Portal ambient unchanged at `0.10`. Claim SFX unchanged. No timing, file, unlock, or logic changes.

---

## 2026-04-08 -- Lower spin audio from 0.45 to 0.35 and raise open/close SFX from 0.35 to 0.40

**Type:** Volume rebalance. `src/main.js`.

Reduced spin jingle playback volume from `0.45` to `0.35` at the single `spinAudio.volume` assignment in the spin start block. Raised open and close SFX playback volume from `0.35` to `0.40` at the two `playSfx()` call sites in `openCrate()` and `closeCrate()`. Claim SFX, ambient values, timing, and all other audio behavior unchanged.

---

## 2026-04-08 -- Lower open and close SFX volume from 0.55 to 0.35

**Type:** Volume rebalance. `src/main.js`.

Reduced open and close SFX playback volume from `0.55` to `0.35` at the two `playSfx()` call sites. Claim SFX volume unchanged. No timing, file, or logic changes.

---

## 2026-04-08 -- Lower open and close SFX volume from 1.0 to 0.55

**Type:** Volume rebalance. `src/main.js`.

Reduced the playback volume for `openSfx` and `closeSfx` from `1` to `0.55` at their two `playSfx()` call sites in `openCrate()` and `closeCrate()`. Claim SFX volume unchanged. No timing, file, or logic changes.

---

## 2026-04-08 -- Lower ambient volume: portal 0.15→0.10, crate 0.08→0.05

**Type:** Volume rebalance. `src/main.js`.

Reduced both ambient volume constants to sit further underneath the portal MP4 audio and the crate scene. Portal phase from `0.15` to `0.10`, crate scene from `0.08` to `0.05`. Initial default volume updated to match. No other audio, timing, or logic changes.

---

## 2026-04-08 -- Add ambient background loop underneath the full experience

**Type:** Additive audio pass. `src/main.js`.

Added a looping ambient background track (`/audio/ambient.mp3`) that plays continuously once the experience begins. The ambient element is added to the existing `allAudioElements` unlock array so it uses the same gesture-based audio unlock path as all other audio. Playback starts inside `startIdleVideo()` after the idle video play succeeds, and loops without pause or restart through all subsequent phases and state transitions.

Two volume levels:
- Portal phase (idle + walk videos): `0.15`
- Crate scene (after `beginWalkFade` fires): `0.08`

The volume step-down happens inside `beginWalkFade()`, ~2 seconds before the walk video ends, so the ambient naturally quiets as the crate scene fades in.

What was not changed:
- Spin audio file or volume (`/audio/sound.mp3` at `0.45`)
- Open/close/claim SFX volumes
- Portal video audio levels
- Spin timing, easing, or variation logic
- Audio unlock system internals (`tryUnlockAudio`)
- Crate open/close behavior
- State machine states or transitions
- Button visibility rules or purchased/preview behavior
- Winner selection, inventory gating, finalize, or API logic
- Portal flow structure or MP4 files
- Backend, Shopify, Flow, or the storefront wrapper

---

## 2026-04-08 -- Lower spin audio playback volume to sit better against portal MP4s

**Type:** Audio level tweak. `src/main.js`.

Reduced `spinAudio.volume` from `1` to `0.45` at the single assignment point inside `startSpin()`. This brings the spin jingle closer to the perceived loudness of the portal idle and walk-in MP4 embedded audio.

What was not changed:
- Which audio file is used (`/audio/sound.mp3`)
- Spin timing, duration, easing, or variation logic
- Audio unlock system or iframe overlay behavior
- Open/close/claim SFX volumes
- Portal video audio levels
- Winner selection, inventory gating, state machine, or any UI/controls

---

## 2026-04-08 -- Spin-start variation polish: random extra rotations and post-open pause jitter

**Type:** Cosmetic timing polish. `src/main.js`.

Added subtle randomness to the spin so each spin no longer feels structurally identical. Two constants changed:

- `EXTRA_FULL_ROTATIONS_MAX` changed from `0` to `2`. Each spin now adds 0, 1, or 2 extra full hat-pool rotations (0-30 extra steps) before landing on the pre-selected winner. The winner selection itself is unchanged.
- `POST_OPEN_PAUSE_MS` (fixed 1000ms) replaced with `POST_OPEN_PAUSE_BASE_MS` (800ms) + random jitter up to `POST_OPEN_PAUSE_JITTER_MS` (400ms), giving a pause range of 800-1200ms between crate open and spin start.

Combined effect: each spin now varies in both the delay before the reel starts and in how long the reel cycles before deceleration. The overall feel remains within the same ballpark (not dramatically faster or slower).

What was not changed:
- Winner selection logic (`selectWeightedHat`, inventory gating, available set)
- Spin easing curve (`spinEasing`)
- Audio timing, looping, or silence-tail trimming
- Crate open/close behavior or open SFX timing
- State machine states or transitions
- Button visibility rules, "Spin Again" / "Save Result" / "Proceed to Checkout" behavior
- Purchased/preview path logic, finalize, or eligibility
- Portal flow, atmosphere, camera, or any visual element beyond spin timing
- Backend, Shopify, Flow, or the storefront wrapper

---

## 2026-04-07 -- Sync numbered hat display names with final Shopify variant names

**Type:** Display-only rename. `src/hats.js`, `docs/source-of-truth.md`.

The hidden mystery-hat product variants on Shopify were renamed to customer-facing names. Updated the `name` field for CF-10 through CF-16 in `src/hats.js` to match:

| Internal ID | Old display name | New display name |
|-------------|-----------------|-----------------|
| CF-10 | Candy Facts 10 | Sunset Sherbert |
| CF-11 | Candy Facts 11 | Wonder Bread |
| CF-12 | Candy Facts 12 | Pink Lemonade |
| CF-13 | Candy Facts 13 | Acid Wash |
| CF-14 | Candy Facts 14 | Junk Yard |
| CF-15 | Candy Facts 15 | Nuked Zombie |
| CF-16 | Candy Facts 16 | Head Shot |

What was not changed:
- Internal `id` values (still CF-10 through CF-16)
- `shopifyVariantId` values
- Image paths
- Weights, mainline flags
- `api/_lib/allowed-hats.js` validation logic
- Customer tag schema (`crate_hat_won:CF-10` etc.)
- Checkout routing, finalize logic, or any persistence behavior
- Named custom hats (Cross Red, Kinder, Mountain Rush, Pink Panther, Skittles Black, Skittles Red, Studded Melon)
- Mainline hat (Zombie Slayer OG)

---

## 2026-04-07 -- Allow post-purchase preview: signed-in zero-spin customers with saved hat enter preview mode

**Type:** Bug fix. `src/main.js`.

After the 2026-04-02 fix, `isPreviewMode` was dynamically set to `true` for logged-in customers with `spinsRemaining === 0` and no saved hat. However, customers who had completed a purchased flow (saved a hat via finalize) were excluded by the `&& !eligibility.hatWon` guard. These customers entered the purchased path with 0 spins and a truthy `hatWon`, creating a dead-end: Press X appeared but `startSpin()` silently returned because `eligibility.spinsRemaining <= 0`.

Fix: removed the `&& !eligibility.hatWon` guard from the preview fallback condition at line 168. The condition now reads `if (eligibility.spinsRemaining === 0)`, so any signed-in customer with zero purchased spins falls back to preview mode regardless of whether they already have a saved hat. Preview spins remain non-binding and local-only (no API calls, no durable persistence), so the existing `crate_hat_won` tag is unaffected.

What was not changed:
- Purchased path behavior for customers with `spinsRemaining > 0`
- Finalize logic, API endpoints, or tag schema
- Preview path behavior (still 1 local spin, "Proceed to Checkout" CTA, no persistence)
- Backend, Shopify tags, or entitlement logic
- Portal flow, crate scene, camera, audio, spin mechanic, or any visual element
- State machine states or transitions

---

## 2026-04-02 -- Fix mode selection: logged-in zero-spin users fall back to preview

**Type:** Bug fix. `src/main.js`.

`isPreviewMode` was a `const` set at page load based only on URL params. A logged-in customer with `customer_id` but no `crate_spins:*` tag and no `crate_hat_won:*` tag entered the purchased path permanently, where `eligibility.spinsRemaining <= 0` caused `startSpin()` to silently return. The user could click the crate but nothing happened.

Fix: changed `isPreviewMode` from `const` to `let`. After `fetchEligibility()` succeeds, if `spinsRemaining === 0` and `hatWon` is null, `isPreviewMode` is set to `true`. The user then gets the standard preview experience (1 local non-binding spin, "Proceed to Checkout" CTA) instead of a dead-end zero-spin purchased path.

What was not changed:
- Purchased path behavior for users who have spins or a saved win
- Preview path behavior for users without `customer_id`
- Backend, API endpoints, Shopify tags, or entitlement logic
- Portal flow, crate scene, camera, audio, spin mechanic, or any visual element

---

## 2026-04-02 -- Fix Iframe Audio Overlay Blocking Interaction

**Type:** Surgical bug fix. `src/main.js`.

Fixed a launch-blocking bug where the "Tap to enable sound" overlay permanently blocked all interaction inside the Shopify storefront iframe. The overlay's tap handler previously waited for `tryUnlockAudio()` to succeed before dismissing. In cross-origin iframe contexts (e.g. Safari on Shopify), the muted play() calls used for unlock can be rejected by autoplay policy, causing `audioState.unlocked` to stay false and the overlay to remain on screen forever with no fallback.

The fix changes the overlay tap handler to always dismiss the overlay after the first tap, regardless of whether the synchronous unlock attempt succeeded. The existing passive unlock listeners on `document` (pointerdown/touchstart) continue retrying on every subsequent user gesture, so audio will unlock by the time it is actually needed (e.g. when the user taps "Click To Enter" on the boot screen, or triggers a spin).

The direct Vercel behavior is unchanged: the overlay still shows in iframe context, the first tap still attempts unlock, and if unlock succeeds immediately the experience is identical to before.

What was not changed:
- The `tryUnlockAudio()` function or its play/pause/restore pattern
- The passive unlock listeners on document
- The `ensureUnlockedFromGesture()` call in boot flow and spin handlers
- The boot phase flow (BLACK_SCREEN, IDLE_VIDEO, WALK_VIDEO, CRATE_VIEW)
- The crate STATES machine or startSpin() / result flow
- Button visibility rules, preview exact-hat checkout, or purchased finalize path
- Audio SFX system, spin audio, or any audio file references
- Portal flow, atmosphere, or visual direction
- Backend, Shopify, Flow, datasets, or the storefront wrapper

---

## 2026-03-30 -- Fix Inventory Gate Before Spin Consumption

**Type:** Surgical ordering fix. `src/main.js`, `docs/runtime-test-checklist.md`.

Fixed a launch-blocking ordering bug in `startSpin()` where the inventory availability check (`fetchAvailableHats()`) ran after the purchased spin had already been consumed via `/api/consume-spin`. If the availability check then failed or returned empty, the customer would lose a spin without receiving a result. Moved the availability check before the eligibility consumption block so a purchased spin is never decremented unless hat availability has already been successfully verified. Preview path ordering was already safe (local counter only, no API consumption), but now both paths share the same guard-first structure.

What was not changed:
- The crate `STATES` machine or result flow
- Crate height, hat reveal height, or accepted camera and idle behavior
- Spin cadence, crate-open behavior, audio behavior, question mark behavior
- Button visibility rules or preview exact-hat checkout wiring
- Purchased finalize path
- Portal flow, atmosphere, or visual direction
- The inventory-aware architecture, endpoint, or filtering logic
- The storefront wrapper

## 2026-03-30 -- Inventory-Aware Mystery Hat Pool

**Type:** Surgical inventory-awareness pass. `api/_lib/shopify.js`, `api/_lib/allowed-hats.js`, `api/available-hats.js` (new), `src/hats.js`, `src/main.js`, `docs/runtime-test-checklist.md`.

Added a new server-side endpoint (`GET /api/available-hats`) that queries the Shopify GraphQL Admin API for the hidden 15-variant mystery-hat product's inventory levels and returns the list of hat IDs whose variant has inventory > 0. The client fetches this list at page load and again at the start of each spin. `selectWeightedHat()` now accepts an optional `availableIds` set parameter that zeros out weights for excluded hats without mutating the main hats array. The spin animation reel still cycles all 15 hats visually, but the pre-selected winner is guaranteed to be from the available set.

If the availability endpoint fails or returns no available hats, the spin is blocked with a user-facing alert. The strategy is fail-closed: if inventory truth cannot be verified, the spin does not proceed.

Server-side changes: added `VARIANT_TO_HAT_ID` mapping to `allowed-hats.js`, added `getVariantInventory()` GraphQL query to `shopify.js`, created new `available-hats.js` endpoint. Requires `read_products` scope on the Partners app.

Client-side changes: added `availableHatIds` and `availabilityError` state, added `fetchAvailableHats()`, added availability re-fetch and gate in `startSpin()`, passed available set to `selectWeightedHat()`.

What was not changed:
- The crate `STATES` machine or result flow
- Crate height, hat reveal height, or accepted camera and idle behavior
- Spin cadence, crate-open behavior, audio behavior for the actual crate flow, question mark behavior, reveal ritual direction, question mark magic direction, UI polish direction, tiny realness direction, cinder block realism direction, visible support density direction, or COD realism-gap direction
- Button visibility rules or preview exact-hat checkout wiring
- Purchased finalize path or `claim-spin.js`
- Portal flow, atmosphere, background readability, or physical/material direction
- The storefront wrapper

## 2026-03-28 -- Portal Copy Correction and Walk-Video Handoff Smoothing

**Type:** Surgical copy fix and handoff fade. `src/main.js`, `src/style.css`, `docs/runtime-test-checklist.md`.

Corrected the black-screen and idle-overlay copy to match owner direction. The black-screen title is now "Candy Facts Mystery Box", the CTA is "Click To Enter", and the support/body paragraph has been removed entirely. The idle-overlay title is now "Candy Facts Mystery Box" (was "Portal Standing By"). The kickers and idle "Enter Portal" button remain unchanged.

Replaced the abrupt single-frame walk-video-to-crate cut with a duration-aware tail-end fade. The boot layer now receives a `boot-fading` CSS class ~2 seconds before the walk clip ends, triggering a 2-second opacity transition to zero. The crate camera intro begins underneath the fading video so the scene is already in motion when the video fully disappears. The `ended` event on the walk video still fires `finishBootVideoHandoff()` as a safety net to fully remove the boot layer. The fade threshold is computed dynamically from `bootWalkVideo.duration` so it adapts if the video file is re-cut.

The idle-to-walk transition remains a hard cut with no fade. No second portal reveal was added. Walk video audio plays through the fade and is not cut early.

What was not changed:
- The crate `STATES` machine or `startSpin()` / result flow
- Crate height, hat reveal height, or accepted camera and idle behavior after handoff
- Spin cadence, crate-open behavior, audio behavior for the actual crate flow, question mark behavior, reveal ritual direction, question mark magic direction, UI polish direction, tiny realness direction, cinder block realism direction, visible support density direction, or COD realism-gap direction
- Button visibility rules or preview exact-hat checkout behavior
- Backend, Shopify, Flow, datasets, or the storefront wrapper
- The idle-to-walk hard cut

## 2026-03-28 -- Media-Backed Portal Flow: Black Screen, Idle Feed, Walk Clip, Crate Handoff

**Type:** Surgical portal presentation replacement. `src/main.js`, `src/style.css`, `docs/runtime-test-checklist.md`.

Replaced the visible start presentation with a two-press media-backed FPS portal flow using the repo-local portal files in `public/media/portal/`. The boot flow still lives outside the crate `STATES` machine and still uses the existing boot-layer and `sceneReady` gate, but the visible phases are now `BLACK_SCREEN`, `IDLE_VIDEO`, `WALK_VIDEO`, and `CRATE_VIEW`. The first coded button appears only on a purpose-built black screen and uses the existing audio-unlock path in the same click handler before starting `idle.mp4` as a fullscreen looping attract-mode video with audio preserved. A separate coded `Enter Portal` button appears only over that idle loop.

The old timer-driven faux portal breach presentation was bypassed rather than broadly removed. The new flow uses two dedicated `<video>` elements instead of swapping sources on one element, which allows the idle-to-walk changeover to be a true hard cut with no fade. On the second click, the code pauses and resets the idle video, instantly reveals `walk_in_animation.mp4`, and starts it with audio preserved. The accepted crate intro is still the same one: when the walk clip ends, the code resets `introStartTime`, keeps `introComplete = false`, switches to `CRATE_VIEW`, and lets the original crate camera arrival run unchanged. Press X remains hidden until the walk clip and the existing crate intro have both completed.

What was not changed:
- The crate `STATES` machine or `startSpin()` / result flow
- Crate height, hat reveal height, or accepted camera and idle behavior after handoff
- Spin cadence, crate-open behavior, audio behavior for the actual crate flow, question mark behavior, reveal ritual direction, question mark magic direction, UI polish direction, tiny realness direction, cinder block realism direction, visible support density direction, or COD realism-gap direction
- Button visibility rules or preview exact-hat checkout behavior
- Backend, Shopify, Flow, datasets, or the storefront wrapper

## 2026-03-27 -- Portal Intro Pass: Hybrid Start Screen and Breach Handoff

**Type:** Surgical portal intro pass. `src/main.js`, `src/style.css`, `docs/runtime-test-checklist.md`.

Added a lightweight boot-phase entry experience in front of the existing crate scene using a hybrid DOM-first approach inspired by COD Zombies and Dark Aether portal handoff beats. The new entry flow stays outside the crate `STATES` machine and uses a separate boot-phase model only: `START_SCREEN`, `PORTAL_TRANSITION`, and `CRATE_VIEW`. A new start screen now sits inside `#scene-root` with one primary entry CTA and restrained supporting copy, while the current crate scene stays frozen behind it until the scene is fully ready and the user starts the breach.

When the user starts entry, the UI switches to a short portal-transition overlay that simulates a first-person barrier breach with a wall-like framing layer, a central rupture, a brief push-through, a restrained lower-corner faux-FPS silhouette hint, and a white-flash handoff. No heavy particles, volumetrics, post-processing, character rigs, or real weapon models were introduced. When that short sequence ends, the code resets `introStartTime`, keeps `introComplete = false`, switches the boot phase to `CRATE_VIEW`, and lets the existing crate camera intro run exactly as before. Press X remains hidden until the portal transition and the original crate intro are both complete. Reduced-motion users get a shorter simplified version of the handoff.

What was not changed:
- The crate `STATES` machine or `startSpin()` / result flow
- Crate height, hat reveal height, or accepted camera and idle behavior after entry
- Spin cadence, crate-open behavior, question mark behavior, reveal ritual direction, question mark magic direction, UI polish direction, tiny realness direction, cinder block realism direction, visible support density direction, or COD realism-gap direction
- Existing audio-unlock overlay and the accepted crate audio flow
- Button visibility rules or preview exact-hat checkout behavior
- Backend, Shopify, Flow, datasets, or the storefront wrapper

## 2026-03-27 -- COD Reference Realism Gap Pass: Dirtier Surface Story and Local Ground Story

**Type:** Surgical realism pass. `src/main.js`, `docs/runtime-test-checklist.md`.

Pushed the fallback mystery-crate scene closer to the COD reference feel by focusing on remaining surface-story and ground-story gaps rather than changing silhouette, camera, or animation behavior. The wood texture generation in `src/main.js` now carries more localized wear and grime breakup around lower planks, rubbed corners, latch-contact zones, and seam edges. The front hazard stencil was distressed so it reads aged and partially rubbed away instead of newly painted. The metal hardware materials were also aged slightly through darker, rougher tuning so the latch, hinges, straps, and brackets feel more field-used without turning into a heavy black mass.

This pass also adds a restrained local floor grime and debris layer through static decal planes placed near the crate base, outside `crateRoot`, just above the floor. That gives the scene more inhabited floor history without rebuilding the room, retuning the background system, or introducing particles, volumetrics, or post-processing. The winner hat, question marks, and result UI remain the focal readable elements.

What was not changed:
- Camera behavior, crate height, hat reveal height, or support elevation
- Cadence, crate-open timing, reveal logic, audio behavior, or question mark behavior
- Button visibility rules, preview exact-hat checkout behavior, or purchased-path logic
- The room background sphere, fog system, CSS atmosphere overlays, or post-processing
- Hollow-core cinder block geometry, visible support density arrangement, or contact-shadow logic
- Backend, Shopify, Flow, datasets, or the storefront wrapper

## 2026-03-27 -- Support Density Correction: Denser Visible Cinder Block Bed From the Live Camera

**Type:** Surgical support-density correction. `src/main.js`, `docs/runtime-test-checklist.md`.

Corrected the support arrangement again by increasing the number of clearly readable blocks from the fixed live camera. The earlier corrective passes improved corner support read, but the scene still felt under-supported because the added blocks read more like isolated accents than a true support bed. This pass keeps the original four hollow-core supports and the two front-corner-visible supports, then adds two more front-visible mid supports so the camera now reads a denser row of blocks across the front-left, front-center, and front-right of the crate.

The hollow-core cinder block builder is unchanged, the supports still live outside `crateRoot`, and `group.position.y = blockH` remains unchanged, so crate height and hat reveal height stay locked. The Tiny Realness contact shadow was left untouched because this pass increases visible support density without changing crate elevation or the underlying rendering approach.

What was not changed:
- `blockW`, `blockH`, or `blockD`
- Crate height or hat reveal height
- Camera behavior, cadence, crate-open behavior, or state machine behavior
- Contact-shadow logic
- Audio behavior and iframe unlock flow
- Button visibility rules, preview exact-hat checkout behavior, reveal ritual direction, question mark magic direction, UI polish direction, backend, Shopify, Flow, datasets, or the storefront wrapper

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
