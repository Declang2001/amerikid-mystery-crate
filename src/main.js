import './style.css'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

const app = document.querySelector('#app')

app.innerHTML = `
  <div id="scene-root">
    <canvas id="scene-canvas"></canvas>
    <div class="overlay">
      <div class="panel">
        <div class="panel-header">
          <p class="eyebrow">AmeriKid Mystery Crate</p>
          <h1>Unbox the drop</h1>
          <p class="subtitle">Spin the crate and land on a random hat.</p>
        </div>
        <div class="controls">
          <button id="openBtn" type="button">Open</button>
          <button id="closeBtn" type="button">Close</button>
          <button id="spinBtn" type="button">Spin</button>
          <button id="claimBtn" type="button">Claim</button>
        </div>
        <div class="result-card">
          <div class="result-media">
            <img id="resultImage" alt="Hat preview" />
          </div>
          <div class="result-details">
            <p class="label">Winner</p>
            <h2 id="resultName">Awaiting spin</h2>
            <p id="resultStatus" class="status-line">Status: ready</p>
          </div>
        </div>
        <div id="animationInfo" class="animation-info">
          <p class="label">Animations</p>
          <p id="animationCount">animations found: 0</p>
          <ul id="animationList"></ul>
        </div>
        <div id="errorBanner" class="error-banner" role="alert"></div>
      </div>
    </div>
  </div>
`

const canvas = document.querySelector('#scene-canvas')
const openBtn = document.querySelector('#openBtn')
const closeBtn = document.querySelector('#closeBtn')
const spinBtn = document.querySelector('#spinBtn')
const claimBtn = document.querySelector('#claimBtn')
const resultImage = document.querySelector('#resultImage')
const resultName = document.querySelector('#resultName')
const resultStatus = document.querySelector('#resultStatus')
const animationCount = document.querySelector('#animationCount')
const animationList = document.querySelector('#animationList')
const errorBanner = document.querySelector('#errorBanner')

const BACKGROUND_URL = '/bg.jpg'

const scene = new THREE.Scene()
scene.background = new THREE.Color('#0b0c10')

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100)
camera.position.set(0, 4.0, 6.0)
camera.lookAt(0, 1.1, 0.6)

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
renderer.setPixelRatio(window.devicePixelRatio || 1)
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.outputColorSpace = THREE.SRGBColorSpace
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap

const textureLoader = new THREE.TextureLoader()
textureLoader.load(
  BACKGROUND_URL,
  (texture) => {
    texture.colorSpace = THREE.SRGBColorSpace
    scene.background = texture
  },
  undefined,
  () => {
    // Keep the solid color background if the image fails to load.
  }
)

const ambient = new THREE.AmbientLight(0xffffff, 0.8)
scene.add(ambient)

const keyLight = new THREE.DirectionalLight(0xffffff, 1.1)
keyLight.position.set(4, 6, 3)
keyLight.castShadow = true
keyLight.shadow.mapSize.width = 2048
keyLight.shadow.mapSize.height = 2048
keyLight.shadow.camera.left = -5
keyLight.shadow.camera.right = 5
keyLight.shadow.camera.top = 5
keyLight.shadow.camera.bottom = -5
keyLight.shadow.camera.near = 0.5
keyLight.shadow.camera.far = 15
scene.add(keyLight)

const fillLight = new THREE.DirectionalLight(0x7aa8ff, 0.6)
fillLight.position.set(-4, 2, -3)
scene.add(fillLight)

const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(15, 15),
  new THREE.ShadowMaterial({ opacity: 0.35 })
)
floor.rotation.x = -Math.PI / 2
floor.position.y = -0.01
floor.receiveShadow = true
scene.add(floor)

const hats = [
  { name: 'Sunset Drip Cap', image: makeHatSvg('#ff7a59', '#2b1b2d') },
  { name: 'Midnight Runner', image: makeHatSvg('#1c2541', '#f4d35e') },
  { name: 'Skyline Crown', image: makeHatSvg('#3a86ff', '#22223b') },
  { name: 'Neon Scout', image: makeHatSvg('#ff006e', '#0b1320') },
  { name: 'Desert Nomad', image: makeHatSvg('#f6bd60', '#5a3a1a') }
]

let currentHatIndex = 0
let spinIntervalId = null
let spinTimeoutId = null
let mixer = null
let openClip = null
let closeClip = null
let openAction = null
let closeAction = null
let crateRoot = null
let usingFallback = false
let fallbackLidPivot = null
let fallbackOpenAngle = -Math.PI / 1.7
let crateIsOpen = false
let currentState = 'READY'

function makeHatSvg(primary, accent) {
  const svg = `
    <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 160 120'>
      <defs>
        <linearGradient id='grad' x1='0' x2='1' y1='0' y2='1'>
          <stop offset='0%' stop-color='${primary}'/>
          <stop offset='100%' stop-color='${accent}'/>
        </linearGradient>
      </defs>
      <rect width='160' height='120' rx='18' fill='url(#grad)'/>
      <path d='M30 70c10-25 90-25 100 0' fill='${accent}' opacity='0.85'/>
      <path d='M20 82c30 14 90 14 120 0' fill='${primary}' opacity='0.85'/>
      <circle cx='80' cy='48' r='18' fill='${accent}' opacity='0.9'/>
      <circle cx='80' cy='48' r='9' fill='${primary}' opacity='0.9'/>
    </svg>
  `
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

function showHat(index) {
  const hat = hats[index]
  resultImage.src = hat.image
  resultName.textContent = hat.name
}

const STATES = {
  READY: 'READY',
  OPENING: 'OPENING',
  SPINNING: 'SPINNING',
  WINNER_SELECTED: 'WINNER SELECTED',
  CLAIMING: 'CLAIMING',
  CLOSING: 'CLOSING',
  CLAIMED: 'CLAIMED'
}

function formatStatus(state) {
  const suffix = usingFallback ? ' (FALLBACK CRATE)' : ''
  return `Status: ${state}${suffix}`
}

function setState(state) {
  currentState = state
  resultStatus.textContent = formatStatus(state)
  updateControls()
}

function setError(message) {
  if (!message) {
    errorBanner.textContent = ''
    errorBanner.classList.remove('visible')
    return
  }
  errorBanner.textContent = message
  errorBanner.classList.add('visible')
}

function playAction(action, { reverse = false } = {}) {
  if (!action) return
  action.reset()
  action.clampWhenFinished = true
  action.setLoop(THREE.LoopOnce, 1)
  action.timeScale = reverse ? -1 : 1
  if (reverse) {
    action.time = action.getClip().duration
  }
  action.play()
}

function playActionWithPromise(action, options = {}) {
  if (!action) return Promise.resolve()
  const duration = action.getClip().duration * 1000
  playAction(action, options)
  return new Promise((resolve) => {
    setTimeout(resolve, duration)
  })
}

function updateControls() {
  const isLocked = [
    STATES.OPENING,
    STATES.SPINNING,
    STATES.CLAIMING,
    STATES.CLOSING
  ].includes(currentState)
  openBtn.disabled = isLocked || crateIsOpen
  closeBtn.disabled = isLocked || !crateIsOpen
  spinBtn.disabled = isLocked
  claimBtn.disabled = currentState !== STATES.WINNER_SELECTED
}

function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
}

function animateLidTo(targetAngle, duration = 900) {
  if (!fallbackLidPivot) return Promise.resolve()
  const startAngle = fallbackLidPivot.rotation.x
  return new Promise((resolve) => {
    const startTime = performance.now()
    const tick = (now) => {
      const elapsed = now - startTime
      const t = Math.min(elapsed / duration, 1)
      const eased = easeInOut(t)
      fallbackLidPivot.rotation.x = startAngle + (targetAngle - startAngle) * eased
      if (t < 1) {
        requestAnimationFrame(tick)
      } else {
        resolve()
      }
    }
    requestAnimationFrame(tick)
  })
}

function openCrate() {
  if (crateIsOpen) return Promise.resolve()
  if (usingFallback) {
    return animateLidTo(fallbackOpenAngle, 800).then(() => {
      crateIsOpen = true
    })
  }
  const actionPromise = openAction ? playActionWithPromise(openAction) : Promise.resolve()
  return actionPromise.then(() => {
    crateIsOpen = true
  })
}

function closeCrate() {
  if (!crateIsOpen) return Promise.resolve()
  if (usingFallback) {
    return animateLidTo(0, 800).then(() => {
      crateIsOpen = false
    })
  }
  if (closeAction) {
    return playActionWithPromise(closeAction).then(() => {
      crateIsOpen = false
    })
  }
  if (openAction) {
    return playActionWithPromise(openAction, { reverse: true }).then(() => {
      crateIsOpen = false
    })
  }
  crateIsOpen = false
  return Promise.resolve()
}

function updateAnimationInfo(clips) {
  animationList.innerHTML = ''
  const count = clips ? clips.length : 0
  animationCount.textContent = `animations found: ${count}`
  if (!clips || clips.length === 0) return
  clips.forEach((clip) => {
    const item = document.createElement('li')
    item.textContent = clip.name || 'Unnamed clip'
    animationList.appendChild(item)
  })
}

function pickClip(clips, keyword) {
  if (!clips || clips.length === 0) return null
  const match = clips.find((clip) => clip.name.toLowerCase().includes(keyword))
  return match || clips[0]
}

function findClip(clips, keyword) {
  if (!clips || clips.length === 0) return null
  return clips.find((clip) => clip.name.toLowerCase().includes(keyword)) || null
}

async function startSpin() {
  if ([STATES.OPENING, STATES.SPINNING, STATES.CLAIMING, STATES.CLOSING].includes(currentState)) {
    return
  }
  clearInterval(spinIntervalId)
  clearTimeout(spinTimeoutId)

  setState(STATES.OPENING)
  await openCrate()

  setState(STATES.SPINNING)
  spinIntervalId = setInterval(() => {
    currentHatIndex = (currentHatIndex + 1) % hats.length
    showHat(currentHatIndex)
  }, 160)

  const spinDuration = 2000 + Math.random() * 900
  spinTimeoutId = setTimeout(() => {
    clearInterval(spinIntervalId)
    const winnerIndex = Math.floor(Math.random() * hats.length)
    currentHatIndex = winnerIndex
    showHat(winnerIndex)
    setState(STATES.WINNER_SELECTED)
  }, spinDuration)
}

showHat(currentHatIndex)
setState(STATES.READY)

openBtn.addEventListener('click', () => {
  if ([STATES.OPENING, STATES.SPINNING, STATES.CLAIMING, STATES.CLOSING].includes(currentState)) {
    return
  }
  setState(STATES.OPENING)
  openCrate().then(() => {
    setState(STATES.READY)
  })
})

closeBtn.addEventListener('click', () => {
  if ([STATES.OPENING, STATES.SPINNING, STATES.CLAIMING, STATES.CLOSING].includes(currentState)) {
    return
  }
  setState(STATES.CLOSING)
  closeCrate().then(() => {
    setState(STATES.READY)
  })
})

spinBtn.addEventListener('click', () => {
  startSpin()
})

claimBtn.addEventListener('click', () => {
  if (currentState !== STATES.WINNER_SELECTED) return
  setState(STATES.CLAIMING)
  closeCrate().then(() => {
    setState(STATES.CLAIMED)
  })
})

const loader = new GLTFLoader()
loader.load(
  '/models/crate.glb',
  (gltf) => {
    crateRoot = gltf.scene
    scene.add(crateRoot)
    crateRoot.position.set(0, 0, 0)
    crateRoot.rotation.y = Math.PI * 0.15

    if (gltf.animations && gltf.animations.length > 0) {
      mixer = new THREE.AnimationMixer(crateRoot)
      openClip = pickClip(gltf.animations, 'open')
      closeClip = findClip(gltf.animations, 'close')
      openAction = openClip ? mixer.clipAction(openClip) : null
      closeAction = closeClip && closeClip !== openClip ? mixer.clipAction(closeClip) : null
    }

    updateAnimationInfo(gltf.animations || [])
    usingFallback = false
    crateIsOpen = false
    setError('')
    setState(STATES.READY)
  },
  undefined,
  () => {
    updateAnimationInfo([])
    setError('Missing model: /models/crate.glb could not be loaded.')
    createFallbackCrate()
    usingFallback = true
    crateIsOpen = false
    setState(STATES.READY)
  }
)

// Procedural wood texture generator
function createWoodTexture(width = 512, height = 512) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  // Base wood color (warm brown)
  ctx.fillStyle = '#6a4426';
  ctx.fillRect(0, 0, width, height);

  // Wood grain lines (vertical with natural variation)
  for (let i = 0; i < 80; i++) {
    const x = Math.random() * width;
    const grainWidth = 1 + Math.random() * 2;
    const darkness = 0.7 + Math.random() * 0.3;
    ctx.strokeStyle = `rgba(75, 49, 26, ${darkness})`;
    ctx.lineWidth = grainWidth;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    // Add curves for natural look
    for (let y = 0; y < height; y += 20) {
      ctx.lineTo(x + (Math.random() - 0.5) * 4, y);
    }
    ctx.stroke();
  }

  // Add wood knots
  for (let i = 0; i < 3; i++) {
    const kx = Math.random() * width;
    const ky = Math.random() * height;
    const gradient = ctx.createRadialGradient(kx, ky, 0, kx, ky, 15);
    gradient.addColorStop(0, 'rgba(30, 20, 10, 0.8)');
    gradient.addColorStop(1, 'rgba(30, 20, 10, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(kx - 15, ky - 15, 30, 30);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// Procedural roughness/bump map generator
function createWoodRoughnessMap(width = 512, height = 512) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  // Base medium gray
  ctx.fillStyle = '#888888';
  ctx.fillRect(0, 0, width, height);

  // Add variation for wood grain roughness
  for (let i = 0; i < 100; i++) {
    const x = Math.random() * width;
    const grainWidth = 2 + Math.random() * 3;
    const gray = 100 + Math.random() * 100;
    ctx.strokeStyle = `rgb(${gray}, ${gray}, ${gray})`;
    ctx.lineWidth = grainWidth;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    for (let y = 0; y < height; y += 15) {
      ctx.lineTo(x + (Math.random() - 0.5) * 5, y);
    }
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

// Procedural crack texture for light leakage (subtle)
function createCrackTexture(width = 256, height = 256) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  ctx.clearRect(0, 0, width, height);

  // Draw subtle glowing cracks
  ctx.strokeStyle = 'rgba(255, 51, 255, 0.3)';
  ctx.lineWidth = 0.8;
  ctx.shadowColor = 'rgba(255, 51, 255, 0.4)';
  ctx.shadowBlur = 6;

  // Sparse crack pattern (fewer, smaller cracks)
  for (let i = 0; i < 2; i++) {
    ctx.beginPath();
    const startX = Math.random() * width;
    const startY = Math.random() * height;
    ctx.moveTo(startX, startY);

    for (let j = 0; j < 3; j++) {
      const x = startX + (Math.random() - 0.5) * width * 0.4;
      const y = startY + (Math.random() - 0.5) * height * 0.4;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createFallbackCrate() {
  if (crateRoot) {
    scene.remove(crateRoot)
  }
  mixer = null
  openAction = null
  closeAction = null
  const group = new THREE.Group()

  // Generate procedural textures
  const woodTexture = createWoodTexture(512, 512)
  const woodRoughnessMap = createWoodRoughnessMap(512, 512)

  const woodMat = new THREE.MeshStandardMaterial({
    map: woodTexture,
    roughnessMap: woodRoughnessMap,
    roughness: 0.85,
    metalness: 0.05
  })
  const woodDarkMat = new THREE.MeshStandardMaterial({
    color: 0x4b311a,
    roughness: 0.9,
    metalness: 0.04
  })
  const metalMat = new THREE.MeshStandardMaterial({
    color: 0x3f3f46,
    roughness: 0.4,
    metalness: 0.7
  })
  const ropeMat = new THREE.MeshStandardMaterial({
    color: 0xb7844b,
    roughness: 0.8,
    metalness: 0.05
  })

  const base = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.0, 1.4), woodMat)
  base.position.y = 0.5
  base.castShadow = true
  base.receiveShadow = true
  group.add(base)

  const plankFront = new THREE.BoxGeometry(1.8, 0.14, 0.05)
  const plankSide = new THREE.BoxGeometry(0.05, 0.14, 1.2)
  const plankOffsets = [0.2, 0.45, 0.7]
  plankOffsets.forEach((y) => {
    const front = new THREE.Mesh(plankFront, woodDarkMat)
    front.position.set(0, y, 0.67)
    front.castShadow = true
    front.receiveShadow = true
    group.add(front)
    const back = new THREE.Mesh(plankFront, woodDarkMat)
    back.position.set(0, y, -0.67)
    back.castShadow = true
    back.receiveShadow = true
    group.add(back)
    const left = new THREE.Mesh(plankSide, woodDarkMat)
    left.position.set(-0.97, y, 0)
    left.castShadow = true
    left.receiveShadow = true
    group.add(left)
    const right = new THREE.Mesh(plankSide, woodDarkMat)
    right.position.set(0.97, y, 0)
    right.castShadow = true
    right.receiveShadow = true
    group.add(right)
  })

  const lidPivot = new THREE.Group()
  lidPivot.position.set(0, 1.0, -0.7)
  const lid = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.20, 1.4), woodMat)
  lid.position.set(0, 0.10, 0.7)
  lid.castShadow = true
  lid.receiveShadow = true
  lidPivot.add(lid)

  const lidPlank = new THREE.BoxGeometry(1.75, 0.06, 0.38)
  const lidPlankOffsets = [-0.35, 0, 0.35]
  lidPlankOffsets.forEach((z) => {
    const plank = new THREE.Mesh(lidPlank, woodDarkMat)
    plank.position.set(0, 0.23, 0.65 + z)
    plank.castShadow = true
    plank.receiveShadow = true
    lidPivot.add(plank)
  })

  // Metal hardware - hinges on back
  const hingeGeo = new THREE.BoxGeometry(0.15, 0.08, 0.04)
  const hinge1 = new THREE.Mesh(hingeGeo, metalMat)
  hinge1.position.set(-0.7, 1.0, -0.69)
  hinge1.castShadow = true
  group.add(hinge1)
  const hinge2 = new THREE.Mesh(hingeGeo, metalMat)
  hinge2.position.set(0.7, 1.0, -0.69)
  hinge2.castShadow = true
  group.add(hinge2)

  // Metal corner brackets
  const bracketGeo = new THREE.BoxGeometry(0.08, 0.25, 0.08)
  const cornerPositions = [
    [-1.28, 0.2, 0.69],
    [1.28, 0.2, 0.69],
    [-1.28, 0.2, -0.69],
    [1.28, 0.2, -0.69],
    [-1.28, 0.8, 0.69],
    [1.28, 0.8, 0.69]
  ]
  cornerPositions.forEach(([x, y, z]) => {
    const bracket = new THREE.Mesh(bracketGeo, metalMat)
    bracket.position.set(x, y, z)
    bracket.castShadow = true
    group.add(bracket)
  })

  // Metal straps wrapping around crate
  const strapGeo = new THREE.BoxGeometry(2.65, 0.06, 0.08)
  const strap1 = new THREE.Mesh(strapGeo, metalMat)
  strap1.position.set(0, 0.35, 0.71)
  strap1.castShadow = true
  group.add(strap1)
  const strap2 = new THREE.Mesh(strapGeo, metalMat)
  strap2.position.set(0, 0.65, 0.71)
  strap2.castShadow = true
  group.add(strap2)

  // Emissive question mark material
  const qMarkMat = new THREE.MeshStandardMaterial({
    color: 0xff33ff,
    emissive: 0xff33ff,
    emissiveIntensity: 1.0,
    metalness: 0.3,
    roughness: 0.2
  })

  // --- QUESTION MARKS: cleanup legacy attempts (not new decal) ---
  {
    const old = lidPivot.getObjectByName("qmarks");
    if (old) lidPivot.remove(old);

    const kill = [];
    lidPivot.traverse((o) => {
      if (!o) return;
      const nm = (o.name || "").toLowerCase();
      // Remove old "qmarks" or "qmark" named objects, but NOT "qmarksDecal"
      if (nm === "qmarks" || (nm.includes("qmark") && !nm.includes("decal"))) {
        kill.push(o);
      }
      // Remove meshes using old qMarkMat, but NOT qDecalMat
      if (o.isMesh && o.material === qMarkMat) kill.push(o);
    });
    kill.forEach((o) => {
      if (o.parent) o.parent.remove(o);
    });
  }
  // --- END QUESTION MARKS CLEANUP ---

  // --- QUESTION MARKS: Decal / Textured Plane (Approach A) ---
  const DEBUG_QMARKS = false;

  // 1) Generate canvas texture with two question marks (with glow)
  const qCanvas = document.createElement('canvas');
  qCanvas.width = 1024;
  qCanvas.height = 512;
  const qCtx = qCanvas.getContext('2d');

  // Clear to transparent
  qCtx.clearRect(0, 0, 1024, 512);

  // Setup for glow drawing
  qCtx.font = 'bold 420px Impact, Haettenschweiler, "Arial Black", sans-serif';
  qCtx.textAlign = 'center';
  qCtx.textBaseline = 'middle';

  // Helper to draw one question mark with glow
  const drawGlowingQuestionMark = (x, y) => {
    // Pass 1: Outer glow (large, faint)
    qCtx.shadowColor = '#ff33ff';
    qCtx.shadowBlur = 150;
    qCtx.fillStyle = 'rgba(255, 51, 255, 0.3)';
    qCtx.fillText('?', x, y);

    // Pass 2: Mid glow (medium)
    qCtx.shadowBlur = 80;
    qCtx.fillStyle = 'rgba(255, 51, 255, 0.6)';
    qCtx.fillText('?', x, y);

    // Pass 3: Core with stroke (crisp, bright)
    qCtx.shadowBlur = 30;
    qCtx.strokeStyle = '#ffffff';
    qCtx.lineWidth = 5;
    qCtx.fillStyle = '#ff33ff';
    qCtx.strokeText('?', x, y);
    qCtx.fillText('?', x, y);
  };

  // Left question mark (normal orientation)
  drawGlowingQuestionMark(256, 256);

  // Right question mark (upside-down)
  qCtx.save();
  qCtx.translate(768, 256);
  qCtx.rotate(Math.PI);
  drawGlowingQuestionMark(0, 0);
  qCtx.restore();

  const qTexture = new THREE.CanvasTexture(qCanvas);
  qTexture.colorSpace = THREE.SRGBColorSpace;

  // 2) Create decal material (MeshBasicMaterial for unlit glow)
  const qDecalMat = new THREE.MeshBasicMaterial({
    map: qTexture,
    transparent: true,
    toneMapped: false,
    blending: THREE.AdditiveBlending,
    depthTest: false,
    depthWrite: false,
    side: THREE.DoubleSide
  });

  // 3) Create plane geometry and mesh (larger)
  const qDecalPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(1.8, 0.9),
    qDecalMat
  );

  // 4) Transform to lie flat on lid surface
  qDecalPlane.rotation.x = -Math.PI / 2;  // Rotate from vertical to horizontal
  qDecalPlane.position.set(
    0,      // centered horizontally
    0.275,  // above lid top (0.20) and planks (0.26)
    0.65    // centered in lid depth
  );
  qDecalPlane.scale.x = 1 / 1.35;  // Compensate for group horizontal stretch
  qDecalPlane.name = 'qmarksDecal';
  qDecalPlane.renderOrder = 999;  // Render on top

  // 5) Add to lidPivot (opens with lid)
  lidPivot.add(qDecalPlane);

  // Optional debug: visualize axes
  if (DEBUG_QMARKS) {
    const axesHelper = new THREE.AxesHelper(0.7);
    lidPivot.add(axesHelper);
  }
  // --- END QUESTION MARKS DECAL ---

  // Inner purple glow - point light inside the crate
  const purpleLight = new THREE.PointLight(0xff33ff, 0.4, 3)
  purpleLight.position.set(0, 0.5, 0)
  group.add(purpleLight)

  // Crack planes for subtle light leakage on side faces only
  const crackTexture = createCrackTexture(256, 256)
  const crackMat = new THREE.MeshBasicMaterial({
    map: crackTexture,
    transparent: true,
    opacity: 0.25,
    emissive: 0xff33ff,
    emissiveIntensity: 0.2,
    toneMapped: false,
    blending: THREE.AdditiveBlending,
    depthTest: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
    side: THREE.DoubleSide
  })

  // Left side crack (avoiding straps at y=0.35 and y=0.65)
  const crackLeft = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.35), crackMat)
  crackLeft.position.set(-1.303, 0.50, 0.1)  // Pushed outward slightly
  crackLeft.rotation.y = -Math.PI / 2
  group.add(crackLeft)

  // Right side crack (avoiding straps)
  const crackRight = new THREE.Mesh(new THREE.PlaneGeometry(0.35, 0.3), crackMat)
  crackRight.position.set(1.303, 0.55, -0.2)  // Pushed outward slightly
  crackRight.rotation.y = Math.PI / 2
  group.add(crackRight)

  const latch = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.06), metalMat)
  latch.position.set(0, 0.6, 0.67)
  group.add(latch)

  const handleGeo = new THREE.TorusGeometry(0.14, 0.03, 10, 20, Math.PI)
  const leftHandle = new THREE.Mesh(handleGeo, ropeMat)
  leftHandle.rotation.z = Math.PI / 2
  leftHandle.position.set(-1.02, 0.5, 0)
  group.add(leftHandle)
  const rightHandle = new THREE.Mesh(handleGeo, ropeMat)
  rightHandle.rotation.z = -Math.PI / 2
  rightHandle.position.set(1.02, 0.5, 0)
  group.add(rightHandle)

  group.add(lidPivot)

  const neonMatPrimary = new THREE.MeshStandardMaterial({
    color: 0xff33ff,
    emissive: 0xff33ff,
    emissiveIntensity: 0.7,
    metalness: 0.4,
    roughness: 0.25
  })
  const neonMatSecondary = new THREE.MeshStandardMaterial({
    color: 0x00f5ff,
    emissive: 0x00f5ff,
    emissiveIntensity: 0.7,
    metalness: 0.4,
    roughness: 0.25
  })
  const stripFront = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.05, 0.08), neonMatPrimary)
  stripFront.position.set(0, 0.9, 0.62)
  group.add(stripFront)

  const stripSide = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.55, 1.0), neonMatSecondary)
  stripSide.position.set(-0.9, 0.5, 0)
  group.add(stripSide)

  crateRoot = group
  fallbackLidPivot = lidPivot
  group.position.set(0, 0, 0)
  group.rotation.y = 0
  group.scale.x = 1.35  // Horizontal stretch
  scene.add(group)
}

const clock = new THREE.Clock()

function animate() {
  requestAnimationFrame(animate)
  const delta = clock.getDelta()
  if (mixer) {
    mixer.update(delta)
  }
  renderer.render(scene, camera)
}

animate()

window.addEventListener('resize', () => {
  const { innerWidth, innerHeight } = window
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})
