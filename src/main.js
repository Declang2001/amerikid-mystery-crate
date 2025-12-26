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

const BACKGROUND_URL = '/room.png'
const BG_Y_ROT = -0.6

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

    const bgGeo = new THREE.SphereGeometry(60, 64, 32)
    const bgMat = new THREE.MeshBasicMaterial({ map: texture, side: THREE.BackSide, toneMapped: false })
    const bgMesh = new THREE.Mesh(bgGeo, bgMat)
    bgMesh.rotation.y = BG_Y_ROT
    scene.add(bgMesh)

    texture.mapping = THREE.EquirectangularReflectionMapping
    const pmremGenerator = new THREE.PMREMGenerator(renderer)
    const envMap = pmremGenerator.fromEquirectangular(texture).texture
    scene.environment = envMap
    pmremGenerator.dispose()
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

// Procedural contact shadow texture (radial gradient)
function createContactShadowTexture(size = 256) {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')

  const centerX = size / 2
  const centerY = size / 2
  const radius = size / 2

  const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius)
  gradient.addColorStop(0, 'rgba(0, 0, 0, 1)')
  gradient.addColorStop(0.5, 'rgba(0, 0, 0, 0.4)')
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)')

  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, size, size)

  const texture = new THREE.CanvasTexture(canvas)
  return texture
}

// Procedural wood texture + roughness + normal set (improved realism)
function createWoodTextureSet(width = 512, height = 512) {
  const repeatX = 3.2
  const repeatY = 1.8
  const colorCanvas = document.createElement('canvas')
  colorCanvas.width = width
  colorCanvas.height = height
  const roughCanvas = document.createElement('canvas')
  roughCanvas.width = width
  roughCanvas.height = height
  const normalCanvas = document.createElement('canvas')
  normalCanvas.width = width
  normalCanvas.height = height

  const colorCtx = colorCanvas.getContext('2d')
  const roughCtx = roughCanvas.getContext('2d')
  const normalCtx = normalCanvas.getContext('2d')

  const heightData = new Float32Array(width * height)
  const noiseSize = 128
  const noiseGrid = new Float32Array(noiseSize * noiseSize)
  for (let i = 0; i < noiseGrid.length; i++) {
    noiseGrid[i] = Math.random()
  }

  const sampleNoise = (x, y) => {
    const fx = ((x % noiseSize) + noiseSize) % noiseSize
    const fy = ((y % noiseSize) + noiseSize) % noiseSize
    const x0 = Math.floor(fx)
    const y0 = Math.floor(fy)
    const x1 = (x0 + 1) % noiseSize
    const y1 = (y0 + 1) % noiseSize
    const tx = fx - x0
    const ty = fy - y0
    const n00 = noiseGrid[y0 * noiseSize + x0]
    const n10 = noiseGrid[y0 * noiseSize + x1]
    const n01 = noiseGrid[y1 * noiseSize + x0]
    const n11 = noiseGrid[y1 * noiseSize + x1]
    const nx0 = n00 + (n10 - n00) * tx
    const nx1 = n01 + (n11 - n01) * tx
    return nx0 + (nx1 - nx0) * ty
  }

  // More subtle, varied knots
  const knots = Array.from({ length: 6 }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    radius: 12 + Math.random() * 22,
    strength: 0.3 + Math.random() * 0.35,
    swirl: Math.random() * Math.PI * 2
  }))

  // Generate color variation patches
  const colorPatches = Array.from({ length: 8 }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    radius: 80 + Math.random() * 120,
    warmth: (Math.random() - 0.5) * 0.15
  }))

  let drift = Math.random() * Math.PI * 2
  const driftVariation = Math.random() * 0.03 + 0.01
  for (let y = 0; y < height; y++) {
    drift += (Math.random() - 0.5) * driftVariation
    for (let x = 0; x < width; x++) {
      // Multi-scale noise for more natural grain
      const noiseA = sampleNoise(x * 0.05, y * 0.12)
      const noiseB = sampleNoise(x * 0.18, y * 0.35)
      const noiseC = sampleNoise(x * 0.6, y * 0.9)

      // More varied grain direction
      const warp = (noiseA - 0.5) * 8 + (noiseB - 0.5) * 3 + drift
      const grainWide = Math.sin(x * 0.09 + warp)
      const grainMedium = Math.sin(x * 0.25 + warp * 0.7 + noiseB * 3)
      const grainFine = Math.sin(x * 0.55 + noiseC * 4)

      let heightValue = 0.52 + grainWide * 0.18 + grainMedium * 0.12 + grainFine * 0.06 + (noiseA - 0.5) * 0.1

      // Add subtle knots with swirl
      for (let i = 0; i < knots.length; i++) {
        const knot = knots[i]
        const dx = x - knot.x
        const dy = y - knot.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < knot.radius * 2.5) {
          const angle = Math.atan2(dy, dx) + knot.swirl
          const ring = Math.sin(dist * 0.4 + angle * 0.8) * Math.exp(-dist / (knot.radius * 1.2))
          heightValue -= ring * 0.14 * knot.strength
        }
      }

      heightValue = Math.min(1, Math.max(0, heightValue))
      heightData[y * width + x] = heightValue
    }
  }

  const colorData = colorCtx.createImageData(width, height)
  const roughData = roughCtx.createImageData(width, height)
  const normalData = normalCtx.createImageData(width, height)

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = y * width + x
      const h = heightData[index]
      const noise = sampleNoise(x * 0.5, y * 0.5)

      // Calculate color variation from patches
      let warmthShift = 0
      for (let i = 0; i < colorPatches.length; i++) {
        const patch = colorPatches[i]
        const dx = x - patch.x
        const dy = y - patch.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        const influence = Math.exp(-dist / patch.radius)
        warmthShift += patch.warmth * influence
      }

      // More varied base colors
      const base = { r: 112, g: 76, b: 46 }
      const dark = { r: 62, g: 42, b: 24 }
      const t = Math.min(1, Math.max(0, h * 1.08))
      let r = dark.r + (base.r - dark.r) * t
      let g = dark.g + (base.g - dark.g) * t
      let b = dark.b + (base.b - dark.b) * t

      // Apply warmth variation
      r += warmthShift * 20
      g += warmthShift * 12
      b += warmthShift * 5

      // Subtle tint variation
      const tint = 0.94 + noise * 0.12
      r = Math.min(255, Math.max(0, r * tint))
      g = Math.min(255, Math.max(0, g * tint))
      b = Math.min(255, Math.max(0, b * tint))

      const cIndex = index * 4
      colorData.data[cIndex] = r
      colorData.data[cIndex + 1] = g
      colorData.data[cIndex + 2] = b
      colorData.data[cIndex + 3] = 255

      // Improved roughness detail
      let roughness = 0.58 + (1 - h) * 0.32 + (noise - 0.5) * 0.18
      roughness = Math.min(1, Math.max(0, roughness))
      const roughValue = Math.round(roughness * 255)
      roughData.data[cIndex] = roughValue
      roughData.data[cIndex + 1] = roughValue
      roughData.data[cIndex + 2] = roughValue
      roughData.data[cIndex + 3] = 255
    }
  }

  // Stronger normal map for better highlights
  const normalStrength = 3.2
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const left = heightData[y * width + Math.max(0, x - 1)]
      const right = heightData[y * width + Math.min(width - 1, x + 1)]
      const up = heightData[Math.max(0, y - 1) * width + x]
      const down = heightData[Math.min(height - 1, y + 1) * width + x]
      const dx = (right - left) * normalStrength
      const dy = (down - up) * normalStrength
      const dz = 1.0
      const len = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1
      const nx = (-dx / len) * 0.5 + 0.5
      const ny = (-dy / len) * 0.5 + 0.5
      const nz = (dz / len) * 0.5 + 0.5
      const nIndex = (y * width + x) * 4
      normalData.data[nIndex] = Math.round(nx * 255)
      normalData.data[nIndex + 1] = Math.round(ny * 255)
      normalData.data[nIndex + 2] = Math.round(nz * 255)
      normalData.data[nIndex + 3] = 255
    }
  }

  colorCtx.putImageData(colorData, 0, 0)
  roughCtx.putImageData(roughData, 0, 0)
  normalCtx.putImageData(normalData, 0, 0)

  const colorMap = new THREE.CanvasTexture(colorCanvas)
  const roughnessMap = new THREE.CanvasTexture(roughCanvas)
  const normalMap = new THREE.CanvasTexture(normalCanvas)
  colorMap.colorSpace = THREE.SRGBColorSpace

  ;[colorMap, roughnessMap, normalMap].forEach((texture) => {
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    texture.repeat.set(repeatX, repeatY)
  })

  return { colorMap, roughnessMap, normalMap }
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
  const woodMaps = createWoodTextureSet(512, 512)
  const woodTexture = woodMaps.colorMap
  const woodRoughnessMap = woodMaps.roughnessMap
  const woodNormalMap = woodMaps.normalMap

  const woodMat = new THREE.MeshStandardMaterial({
    map: woodTexture,
    roughnessMap: woodRoughnessMap,
    normalMap: woodNormalMap,
    roughness: 0.82,
    metalness: 0.05
  })
  const woodDarkMat = new THREE.MeshStandardMaterial({
    color: 0x4b311a,
    map: woodTexture,
    roughnessMap: woodRoughnessMap,
    normalMap: woodNormalMap,
    roughness: 0.9,
    metalness: 0.04
  })
  const woodInnerMat = new THREE.MeshStandardMaterial({
    color: 0x3a2515,
    map: woodTexture,
    roughnessMap: woodRoughnessMap,
    normalMap: woodNormalMap,
    roughness: 0.95,
    metalness: 0.03,
    side: THREE.DoubleSide
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

  const baseThickness = 0.08
  const baseWidth = 2.6
  const baseHeight = 1.0
  const baseDepth = 1.4
  const wallHeight = baseHeight - baseThickness

  const floorPanel = new THREE.Mesh(
    new THREE.BoxGeometry(baseWidth, baseThickness, baseDepth),
    woodMat
  )
  floorPanel.position.y = baseThickness / 2
  floorPanel.castShadow = true
  floorPanel.receiveShadow = true
  group.add(floorPanel)

  const wallFront = new THREE.Mesh(
    new THREE.BoxGeometry(baseWidth, wallHeight, baseThickness),
    woodMat
  )
  wallFront.position.set(0, baseThickness + wallHeight / 2, baseDepth / 2 - baseThickness / 2)
  wallFront.castShadow = true
  wallFront.receiveShadow = true
  group.add(wallFront)

  const wallBack = new THREE.Mesh(
    new THREE.BoxGeometry(baseWidth, wallHeight, baseThickness),
    woodMat
  )
  wallBack.position.set(0, baseThickness + wallHeight / 2, -baseDepth / 2 + baseThickness / 2)
  wallBack.castShadow = true
  wallBack.receiveShadow = true
  group.add(wallBack)

  const wallSideDepth = baseDepth - baseThickness * 2
  const wallLeft = new THREE.Mesh(
    new THREE.BoxGeometry(baseThickness, wallHeight, wallSideDepth),
    woodMat
  )
  wallLeft.position.set(-baseWidth / 2 + baseThickness / 2, baseThickness + wallHeight / 2, 0)
  wallLeft.castShadow = true
  wallLeft.receiveShadow = true
  group.add(wallLeft)

  const wallRight = new THREE.Mesh(
    new THREE.BoxGeometry(baseThickness, wallHeight, wallSideDepth),
    woodMat
  )
  wallRight.position.set(baseWidth / 2 - baseThickness / 2, baseThickness + wallHeight / 2, 0)
  wallRight.castShadow = true
  wallRight.receiveShadow = true
  group.add(wallRight)

  const innerInset = 0.001
  const innerWidth = baseWidth - baseThickness * 2
  const innerDepth = baseDepth - baseThickness * 2
  const innerHeight = wallHeight

  const innerFloor = new THREE.Mesh(
    new THREE.PlaneGeometry(innerWidth, innerDepth),
    woodInnerMat
  )
  innerFloor.rotation.x = -Math.PI / 2
  innerFloor.position.set(0, baseThickness + innerInset, 0)
  innerFloor.receiveShadow = true
  group.add(innerFloor)

  const innerFront = new THREE.Mesh(
    new THREE.PlaneGeometry(innerWidth, innerHeight),
    woodInnerMat
  )
  innerFront.position.set(0, baseThickness + innerHeight / 2, baseDepth / 2 - baseThickness - innerInset)
  innerFront.receiveShadow = true
  group.add(innerFront)

  const innerBack = new THREE.Mesh(
    new THREE.PlaneGeometry(innerWidth, innerHeight),
    woodInnerMat
  )
  innerBack.rotation.y = Math.PI
  innerBack.position.set(0, baseThickness + innerHeight / 2, -baseDepth / 2 + baseThickness + innerInset)
  innerBack.receiveShadow = true
  group.add(innerBack)

  const innerLeft = new THREE.Mesh(
    new THREE.PlaneGeometry(innerDepth, innerHeight),
    woodInnerMat
  )
  innerLeft.rotation.y = Math.PI / 2
  innerLeft.position.set(-baseWidth / 2 + baseThickness + innerInset, baseThickness + innerHeight / 2, 0)
  innerLeft.receiveShadow = true
  group.add(innerLeft)

  const innerRight = new THREE.Mesh(
    new THREE.PlaneGeometry(innerDepth, innerHeight),
    woodInnerMat
  )
  innerRight.rotation.y = -Math.PI / 2
  innerRight.position.set(baseWidth / 2 - baseThickness - innerInset, baseThickness + innerHeight / 2, 0)
  innerRight.receiveShadow = true
  group.add(innerRight)

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

  // Contact shadow (subtle radial gradient under crate)
  const shadowTexture = createContactShadowTexture(256)
  const shadowMat = new THREE.MeshBasicMaterial({
    map: shadowTexture,
    transparent: true,
    opacity: 0.25,
    depthWrite: false,
    depthTest: true,
    blending: THREE.MultiplyBlending,
    toneMapped: false
  })
  const contactShadow = new THREE.Mesh(
    new THREE.PlaneGeometry(3.5, 2.0),
    shadowMat
  )
  contactShadow.rotation.x = -Math.PI / 2
  contactShadow.position.set(0, 0.001, 0)
  contactShadow.name = 'contactShadow'
  group.add(contactShadow)

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
