# AmeriKid Mystery Crate

An interactive 3D mystery crate experience built with Three.js and Vite, featuring COD Zombies-inspired UI and engaging loot box mechanics.

## Overview

AmeriKid Mystery Crate is an experimental front-end system designed to explore advanced animation techniques, interaction timing, and atmospheric design in web-based 3D environments. The project showcases a mystery crate opening experience where users can spin for random hat prizes through an immersive 3D interface.

This project demonstrates proficiency in:
- Real-time 3D rendering and animation
- State machine architecture for complex UI flows
- Audio-visual synchronization
- Responsive web design with vanilla JavaScript

## Features

- **Immersive 3D Environment**: Full Three.js scene with realistic lighting, shadows, and environment mapping
- **COD-Style Interaction**: Press X prompt system with keyboard, mouse, and touch support
- **Dynamic Camera System**: Cinematic intro sequence with subtle idle animations
- **3D Hat Display**: Billboarded hat models that rise from the crate with rotation and glow effects
- **Audio Integration**: Mystery jingle synchronized with spin duration and animations
- **State-Driven UI**: Clean state machine managing gameplay flow (READY → OPENING → SPINNING → CLAIMING)
- **Fallback System**: Procedurally-generated crate with glowing decals if GLTF model unavailable
- **Responsive Design**: Adaptive canvas sizing with mobile-friendly controls

## Tech Stack

- **Three.js** (v0.182.0) - 3D rendering engine
- **Vite** (v7.2.4) - Build tool and development server
- **Vanilla JavaScript** - ES modules, no framework dependencies
- **WebGL** - Hardware-accelerated graphics rendering
- **GLTF/GLB** - 3D model format support

## Getting Started

### Prerequisites

- Node.js (v16 or higher recommended)
- npm or yarn

### Installation

```bash
# Clone the repository
git clone <repository-url>

# Navigate to project directory
cd amerikid-mystery-crate

# Install dependencies
npm install
```

### Development

```bash
# Start development server with hot reload
npm run dev
```

Open your browser to the local server URL (typically `http://localhost:5173`)

### Production Build

```bash
# Build for production
npm run build

# Preview production build locally
npm run preview
```

## Project Structure

```
/
├── api/
│   ├── _lib/
│   │   └── shopify.js   # Shopify Admin API helper
│   ├── eligibility.js   # GET - Check customer spin eligibility
│   ├── consume-spin.js  # POST - Consume spin entitlement
│   └── claim-spin.js    # POST - Claim prize after spin
├── src/
│   ├── main.js          # Core application logic
│   ├── hats.js          # Hat data and weighted selection
│   └── style.css        # Styling and CSS variables
├── public/
│   ├── hats/            # Hat PNG assets (5 variants)
│   ├── audio/           # Mystery jingle sound file
│   ├── sfx/             # Sound effects (open, close, claim)
│   ├── models/          # Optional GLTF crate model
│   └── room.png         # Environment background texture
├── index.html           # Entry point
└── package.json         # Dependencies and scripts
```

## Eligibility System

The mystery crate uses tag-based eligibility via Shopify customer tags.

### Environment Variables (Vercel)

Set these in your Vercel project settings:

| Variable | Description | Example |
|----------|-------------|---------|
| `SHOPIFY_SHOP_DOMAIN` | Your Shopify store domain | `your-store.myshopify.com` |
| `SHOPIFY_ADMIN_ACCESS_TOKEN` | Admin API access token | `shpat_xxxxx` |
| `SHOPIFY_API_VERSION` | API version (optional) | `2024-10` |

### Customer Tags

| Tag | Meaning |
|-----|---------|
| `spin_ready` | Customer has purchased a spin and is eligible |
| `spin_in_progress` | Customer has spun but not yet claimed |

### Flow

1. Customer purchases spin → `spin_ready` tag added (via Shopify Flow/app)
2. Customer opens crate → `/api/consume-spin` removes `spin_ready`, adds `spin_in_progress`
3. Customer claims prize → `/api/claim-spin` removes `spin_in_progress`

### URL Parameters

| Parameter | Description |
|-----------|-------------|
| `customer_id` | Shopify customer ID (passed from store) |
| `demo` | Set to `1` to force demo mode |

### Test URLs

```bash
# Demo mode (no customer, spins allowed, claim blocked)
http://localhost:5173/

# Force demo mode even with customer_id
http://localhost:5173/?demo=1

# Real mode (requires valid customer with spin_ready tag)
http://localhost:5173/?customer_id=123456789

# Shopify iframe embed example
https://your-store.myshopify.com/pages/mystery-crate?customer_id={{ customer.id }}
```

### API Endpoints

#### `GET /api/eligibility?customer_id=123`

Returns eligibility status:

```json
{
  "logged_in": true,
  "ready": true,
  "in_progress": false,
  "tags": ["spin_ready", "other_tag"]
}
```

#### `POST /api/consume-spin`

Body: `{ "customer_id": "123" }`

Consumes spin entitlement (removes `spin_ready`, adds `spin_in_progress`).

```json
{ "ok": true }
// or
{ "ok": false, "reason": "No spin_ready tag present" }
```

#### `POST /api/claim-spin`

Body: `{ "customer_id": "123" }`

Claims prize (removes `spin_in_progress`).

```json
{ "ok": true }
// or
{ "ok": false, "reason": "No spin_in_progress tag present" }
```

## Notes

- All application logic is contained in a single `main.js` file (~1400 lines) using a clear state machine pattern
- The project uses CSS custom properties for easy theming
- Audio playback respects browser autoplay policies through user gesture triggering
- Fallback rendering ensures functionality even without 3D model assets

## Roadmap

Potential future enhancements:

- **Rarity System**: Weighted selection with common/rare/legendary tiers
- **Carousel UI**: Scrolling reel visualization for hat selection
- **Enhanced VFX**: Confetti, particle effects, and winner reveal animations
- **Claim History**: localStorage-based win tracking and history display
- **Sound Design**: Additional SFX for interactions (chest open, cycling clicks, fanfare)
- **Mobile Optimization**: Improved touch controls and responsive layouts
- **Accessibility**: Keyboard navigation and screen reader support

---

**Built as an experimental showcase for AmeriKid** | [Live Demo](https://amerikid-mystery-crate.vercel.app)

