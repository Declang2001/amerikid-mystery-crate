# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Three.js-based web application called "AmeriKid Mystery Crate" - an interactive 3D crate-opening experience with a COD Zombies-style "Press X" prompt and spinning wheel mechanic to reveal random hat prizes. The application is built with vanilla JavaScript and uses Vite for development and bundling.

## Development Commands

```bash
npm run dev      # Start development server with hot reload
npm run build    # Build for production
npm run preview  # Preview production build locally
```

## Architecture

### Core Technology Stack

- **Three.js (v0.182.0)**: 3D rendering engine
- **Vite (v7.2.4)**: Build tool and development server
- **Vanilla JavaScript**: No framework, uses ES modules

### Application Structure

The application is a single-page app with all logic in `src/main.js`:

1. **Scene Setup**: Three.js scene with perspective camera, WebGL renderer, lighting (ambient + directional key/fill lights), and room.png background sphere
2. **Camera Intro**: Stationary look-tilt (1.5s) from slightly above (Y: 2.5) down to crate center (Y: 1.1), followed by subtle idle bob in READY state
3. **3D Model Loading**: GLTFLoader attempts to load `/models/crate.glb` with animations
4. **Fallback System**: If model loading fails, a procedurally-generated fallback crate is created with question mark decals on the lid
5. **State Machine**: READY → OPENING → SPINNING → WINNER_SELECTED → CLAIMING/CLOSING → CLAIMED
6. **3D Hat Display**: Billboarded hat plane that rises from inside crate during spin, rotates, and shows winner with glow
7. **Audio System**: Mystery jingle plays during spin, auto-synced to audio duration
8. **UI Overlay**: DOM overlay with Spin/Close buttons (row 1), Claim button (row 2), and winner display
9. **Press X Prompt**: COD-style interaction prompt positioned on chest front face, triggers spin via keyboard X, click, or tap

### Key Components

**Camera System** (`src/main.js:133-138`):
- Fixed position at `(0, 4.0, 6.0)` - no translation during intro
- Intro: lookAt target lerps from `(0, 2.5, 0.6)` down to `(0, 1.1, 0.6)` over 1.5s
- Idle bob: subtle sine wave modulation (Y ±0.03, X ±0.015, 1.0 Hz) only in READY state
- Uses `easeInOut()` for smooth intro transition

**3D Scene** (`src/main.js:126-145`):
- Perspective camera (45° FOV)
- Background: `room.png` loaded as inside-out sphere (BackSide) with PMREM environment map
- Three-point lighting: ambient (0.8) + key directional (1.1) + fill directional (0.6)
- Shadow-receiving floor plane

**Press X Prompt** (`src/main.js:78-112`):
- Created via JS DOM manipulation (no HTML edits)
- Styled like COD Zombies: "Press [blue X button] for a Random Hat"
- Position: dynamically projected from chest front face anchor (62% height, pushed 0.35 units toward camera)
- Triggers: keyboard X key, clicking prompt, tapping/clicking canvas
- Visibility: only when `READY` state and `playerInRange === true`
- Centers with `transform: translate(-50%, -50%)`

**Audio System** (`src/main.js:114-121, 384-386, 395-396, 1323-1326`):
- File: `/audio/sound.mp3` preloaded with `preload = 'auto'`
- Duration auto-detection via `loadedmetadata` event
- Default fallback: 6000ms (6 seconds)
- Spin duration: `spinAudioDurationMs - 150` (ends slightly before audio)
- Plays on spin start (user gesture), stops on winner select
- Safety stop in animate loop if state exits SPINNING

**Hat Assets & Display** (`src/main.js:190-210`):
- 5 hat PNG images: `/hats/hat1.png` through `/hats/hat5.png`
- Textures preloaded once, reused for all swaps
- 3D Display: billboarded plane + outline + glow, all using hat texture
- Position: rises from inside crate (`bbox.min.y + 0.3`) to above (`bbox.max.y + 0.8`)
- Animation: scale pop (1.12 → 1.0) on swap, rotation during SPINNING
- Glow: hat-shaped (uses texture + alphaTest), pink tint, additive blending
- Outline: same texture, black tint (0x000000), 1.06x scale
- alphaTest: 0.35 (cutout rendering, no transparency bleed-through)

**Fallback Crate** (`src/main.js:~800-1320`):
- Procedurally generated wooden crate with realistic textures
- Question mark decals on lid (two glowing purple ?s)
- Visibility: question marks hidden during OPENING/SPINNING/WINNER_SELECTED
- Purple point light inside (0xff33ff, intensity 0.4)
- Neon accent strips, metal hardware, rope handles
- Contact shadow beneath crate

**State Management** (`src/main.js:~220-270`):
- States: READY, OPENING, SPINNING, WINNER_SELECTED, CLAIMING, CLOSING, CLAIMED
- `setState()` updates status text and button states
- Button controls: Spin/Close visible, Claim only enabled at WINNER_SELECTED
- Open button hidden via `display: 'none'`

**Spin Mechanic** (`src/main.js:373-402`):
- Opens crate, cycles through hats at 160ms intervals
- Duration: auto-calculated from audio (default 6s - 150ms)
- Winner: pure random selection (uniform distribution)
- 3D hat display: rises during OPENING (0.4s delay), rotates during SPINNING

**Animation Handling**:
- GLTF mode: AnimationMixer with "open" and optional "close" clips
- Fallback mode: Custom `animateLidTo()` with easeInOut
- Hat display: rise animation via Y lerp, scale pop via lerp
- Camera: intro tilt + idle bob via lookAt target modulation

### File Structure

```
/
├── index.html           # Entry HTML with #app mount point
├── src/
│   ├── main.js          # All application logic (~1400 lines)
│   ├── style.css        # Styling with CSS custom properties
│   └── counter.js       # Unused Vite boilerplate (can be deleted)
├── public/
│   ├── hats/            # Hat PNG images (hat1-5.png, transparent backgrounds)
│   ├── audio/           # Mystery jingle (sound.mp3)
│   ├── models/          # Expected location for crate.glb (optional)
│   └── room.png         # Background texture (inside-out sphere)
└── package.json         # Dependencies and scripts
```

### Important Behaviors

**Intro Sequence**:
1. Camera starts looking slightly above crate (Y: 2.5)
2. Over 1.5s, lookAt target eases down to crate center (Y: 1.1)
3. `playerInRange` set to true after intro completes
4. Press X prompt appears on chest front face
5. Subtle idle bob begins (only in READY state)

**Spin Flow**:
1. User presses X / clicks prompt / taps canvas
2. State → OPENING, crate lid opens
3. After 0.4s delay, 3D hat display rises from inside crate
4. State → SPINNING, audio plays, hats cycle at 160ms, hat display rotates
5. After spin duration, audio stops, random winner selected
6. State → WINNER_SELECTED, hat display stops rotating, glow pulses
7. User claims prize, State → CLAIMING → CLAIMED

**Render Loop** (`src/main.js:1320-1410`):
- Updates mixer (GLTF animations)
- Camera intro tilt OR idle bob (based on state)
- Press X prompt positioning (world→screen projection)
- 3D hat display: visibility, rise animation, billboard, scale, rotation
- Question marks visibility toggle
- Audio safety stop

**Responsive Canvas**:
- Window resize listener updates camera aspect + renderer size

## Asset Requirements

The app uses these assets in the `public/` directory:
- ✅ `/hats/hat1.png` through `/hats/hat5.png` - Hat images (512x512, transparent backgrounds)
- ✅ `/audio/sound.mp3` - Mystery jingle audio file
- ✅ `/room.png` - Background texture (equirectangular, inside-out sphere)
- ⚠️ `/models/crate.glb` - Optional GLTF model with "open"/"close" animations (fallback crate used if missing)

## CSS Variables

Key CSS custom properties in `src/style.css`:
- `--panel-bg`: Panel background color
- `--panel-border`: Panel border color
- `--accent`: Primary neon accent (#ff33ff)
- `--accent-bright`: Secondary neon accent (#00f5ff)
- `--muted`: Muted text color

## Current Implementation Status

### ✅ Completed Features
- [x] Hat asset integration (5 PNG images)
- [x] Audio system (mystery jingle, auto-duration sync)
- [x] 3D hat display above crate (rise, rotate, glow)
- [x] COD-style Press X prompt (keyboard, click, tap interactions)
- [x] Camera intro (stationary look-tilt, no translation)
- [x] Idle camera bob (subtle standing motion in READY)
- [x] Question marks hide during spin
- [x] Diagnostics UI hidden (animation info, error banner)
- [x] Button layout (Spin/Close row 1, Claim row 2)
- [x] Open button removed
- [x] Hat swap scale pop effect
- [x] Audio respects user gesture (autoplay-safe)
- [x] Prompt positioned on chest front face

### 🔧 Technical Details
- **Spin duration**: Auto-calculated from audio metadata (6s default fallback)
- **Hat cycling**: 160ms interval (unchanged)
- **Camera position**: Fixed at `(0, 4.0, 6.0)` (no dolly/translation)
- **Background**: Static sphere, no parallax issues
- **3D hat rendering**: alphaTest cutout (no transparency bleed)
- **Prompt anchor**: Chest front at 62% height, 0.35 units toward camera
- **Idle bob**: Only lookAt modulation (Y ±0.03, X ±0.015)

### 🎯 Potential Future Enhancements
- [ ] Rarity system (common/rare/legendary hats with weighted selection)
- [ ] Scrolling reel carousel instead of simple image swap
- [ ] Winner reveal animation (confetti, particle effects)
- [ ] Claim confirmation dialog
- [ ] Win history / last 3-5 hats claimed
- [ ] Sound effects (open chest, hat cycling clicks, winner fanfare)
- [ ] Mobile-optimized controls
- [ ] Save/load claimed hats to localStorage

## Notes for Future Development

### Architecture Constraints
- **No camera translation**: Background is `scene.background`, not parented to camera. Any camera dolly causes apparent crate motion. Use lookAt modulation only.
- **Audio autoplay**: Must be triggered by user gesture (keyboard, click, tap). Current implementation satisfies this.
- **Hat display alphaTest**: Required at 0.35 to prevent question mark bleed-through. Keep `transparent: false` on main hat plane.
- **Prompt positioning**: Uses world→screen projection each frame. If jittery, add lerp smoothing to pixel coordinates.

### Code Organization
- All logic in single `src/main.js` file (~1400 lines)
- No framework dependencies (vanilla JS)
- State machine controls all gameplay flow
- Button states auto-managed by state transitions
- `makeHatSvg()` function unused but kept for reference

### Performance Notes
- Bounding box calculation each frame for prompt positioning (consider caching if performance issues)
- 3D hat display uses 3 planes (glow, outline, main) - all billboarded
- Audio duration detection happens once via metadata event
- Textures preloaded once, reused for all swaps
