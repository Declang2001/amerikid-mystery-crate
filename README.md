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
├── src/
│   ├── main.js          # Core application logic
│   └── style.css        # Styling and CSS variables
├── public/
│   ├── hats/            # Hat PNG assets (5 variants)
│   ├── audio/           # Mystery jingle sound file
│   ├── models/          # Optional GLTF crate model
│   └── room.png         # Environment background texture
├── index.html           # Entry point
└── package.json         # Dependencies and scripts
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

