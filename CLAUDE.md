# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Three.js-based web application called "AmeriKid Mystery Crate" - an interactive 3D crate-opening experience with a spinning wheel mechanic to reveal random hat prizes. The application is built with vanilla JavaScript and uses Vite for development and bundling.

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

1. **Scene Setup**: Three.js scene with perspective camera, WebGL renderer, lighting (ambient + directional key/fill lights), and background texture
2. **3D Model Loading**: GLTFLoader attempts to load `/models/crate.glb` with animations
3. **Fallback System**: If model loading fails, a procedurally-generated fallback crate is created using Three.js primitives
4. **State Machine**: Application flows through states: READY → OPENING → SPINNING → WINNER_SELECTED → CLAIMING/CLOSING → CLAIMED
5. **Animation System**: Uses Three.js AnimationMixer for GLTF animations, or custom easing-based lid rotation for fallback crate
6. **UI Overlay**: DOM overlay positioned over canvas with control buttons and result display

### Key Components

**3D Scene** (`src/main.js:58-99`):
- Scene with either textured or solid color background
- Three-point lighting setup (ambient + two directional lights)
- Circular floor mesh

**Model Loading** (`src/main.js:356-388`):
- Attempts to load `/models/crate.glb` from public directory
- On success: extracts animations, sets up AnimationMixer with "open" and optional "close" clips
- On failure: calls `createFallbackCrate()` to generate procedural geometry

**Fallback Crate** (`src/main.js:390-498`):
- Procedurally generated wooden crate with lid, planks, latch, handles, and neon accent strips
- Lid rotates via `fallbackLidPivot` group with custom easing animation
- Uses multiple materials (wood, dark wood, metal, rope, neon emissive)

**State Management** (`src/main.js:149-212`):
- States control UI button enabling/disabling and flow logic
- `setState()` updates status text and calls `updateControls()`
- `usingFallback` flag affects status display

**Hat Prize System** (`src/main.js:101-147`):
- Array of 5 hats with names and procedurally-generated SVG images
- `makeHatSvg()` creates gradient-filled SVG data URLs
- `showHat()` updates UI with hat image and name

**Spin Mechanic** (`src/main.js:295-319`):
- Opens crate, cycles through hats at 160ms intervals
- Random duration (2000-2900ms), then selects random winner
- Uses `setInterval` for cycling, `setTimeout` for completion

**Animation Handling**:
- GLTF mode: Uses `playActionWithPromise()` to play AnimationActions
- Fallback mode: Uses `animateLidTo()` with easeInOut timing function
- Both return Promises for async/await flow control

### File Structure

```
/
├── index.html           # Entry HTML with #app mount point
├── src/
│   ├── main.js          # All application logic (~519 lines)
│   ├── style.css        # Styling with CSS custom properties
│   └── counter.js       # Unused Vite boilerplate (can be deleted)
├── public/
│   ├── models/          # Expected location for crate.glb
│   └── bg.jpg           # Optional background texture
└── package.json         # Dependencies and scripts
```

### Important Behaviors

**Animation Discovery** (`src/main.js:284-293`):
- `pickClip()`: Finds clip by keyword or returns first clip as fallback
- `findClip()`: Only returns exact keyword match or null
- Open animation is required; close animation is optional (will reverse open if missing)

**Responsive Canvas** (`src/main.js:513-518`):
- Window resize listener updates camera aspect ratio and renderer size

**Error Display** (`src/main.js:170-178`):
- `setError()` shows/hides error banner for model loading failures

## Asset Requirements

The app expects these assets in the `public/` directory:
- `/models/crate.glb` - GLTF model with optional "open" and "close" animations (fallback exists if missing)
- `/bg.jpg` - Optional background image (solid color fallback if missing)

## CSS Variables

Key CSS custom properties in `src/style.css`:
- `--panel-bg`: Panel background color
- `--panel-border`: Panel border color
- `--accent`: Primary neon accent (#ff33ff)
- `--accent-bright`: Secondary neon accent (#00f5ff)
- `--muted`: Muted text color

## Notes

- `src/counter.js` is unused Vite boilerplate and can be removed
- The application uses uppercase text styling globally via CSS `text-transform`
- Button states are controlled by the state machine - don't manually enable/disable
- The animation mixer updates on every frame in the render loop (`src/main.js:502-508`)
