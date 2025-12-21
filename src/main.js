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
const resultImage = document.querySelector('#resultImage')
const resultName = document.querySelector('#resultName')
const resultStatus = document.querySelector('#resultStatus')
const animationCount = document.querySelector('#animationCount')
const animationList = document.querySelector('#animationList')
const errorBanner = document.querySelector('#errorBanner')

const scene = new THREE.Scene()
scene.background = new THREE.Color('#0b0c10')

const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 100)
camera.position.set(0, 1.6, 4.8)

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
renderer.setPixelRatio(window.devicePixelRatio || 1)
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.outputColorSpace = THREE.SRGBColorSpace

const ambient = new THREE.AmbientLight(0xffffff, 0.8)
scene.add(ambient)

const keyLight = new THREE.DirectionalLight(0xffffff, 1.1)
keyLight.position.set(4, 6, 3)
scene.add(keyLight)

const fillLight = new THREE.DirectionalLight(0x7aa8ff, 0.6)
fillLight.position.set(-4, 2, -3)
scene.add(fillLight)

const floor = new THREE.Mesh(
  new THREE.CircleGeometry(5, 64),
  new THREE.MeshStandardMaterial({ color: 0x10131a, roughness: 0.8, metalness: 0.1 })
)
floor.rotation.x = -Math.PI / 2
floor.position.y = -0.01
scene.add(floor)

const hats = [
  { name: 'Sunset Drip Cap', image: makeHatSvg('#ff7a59', '#2b1b2d') },
  { name: 'Midnight Runner', image: makeHatSvg('#1c2541', '#f4d35e') },
  { name: 'Skyline Crown', image: makeHatSvg('#3a86ff', '#22223b') },
  { name: 'Neon Scout', image: makeHatSvg('#ff006e', '#0b1320') },
  { name: 'Desert Nomad', image: makeHatSvg('#f6bd60', '#5a3a1a') }
]

let currentHatIndex = 0
let isSpinning = false
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
let isBusy = false

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

function setStatus(message) {
  resultStatus.textContent = message
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

function setControlsDisabled(disabled) {
  openBtn.disabled = disabled
  closeBtn.disabled = disabled
  spinBtn.disabled = disabled
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
  if (usingFallback) {
    return animateLidTo(fallbackOpenAngle, 800)
  }
  return playActionWithPromise(openAction)
}

function closeCrate() {
  if (usingFallback) {
    return animateLidTo(0, 800)
  }
  if (closeAction) {
    return playActionWithPromise(closeAction)
  }
  if (openAction) {
    return playActionWithPromise(openAction, { reverse: true })
  }
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

function startSpin() {
  if (isSpinning || isBusy) return
  isSpinning = true
  isBusy = true
  setControlsDisabled(true)
  setStatus('Status: opening')

  clearInterval(spinIntervalId)
  clearTimeout(spinTimeoutId)
  openCrate().then(() => {
    setStatus('Status: spinning')
    spinIntervalId = setInterval(() => {
      currentHatIndex = (currentHatIndex + 1) % hats.length
      showHat(currentHatIndex)
    }, 160)

    spinTimeoutId = setTimeout(() => {
      clearInterval(spinIntervalId)
      const winnerIndex = Math.floor(Math.random() * hats.length)
      currentHatIndex = winnerIndex
      showHat(winnerIndex)
      setStatus('Status: winner selected')
      isSpinning = false
      isBusy = false
      setControlsDisabled(false)
    }, 2400)
  })
}

showHat(currentHatIndex)
setStatus('Status: ready')

openBtn.addEventListener('click', () => {
  if (isBusy || isSpinning) return
  isBusy = true
  setControlsDisabled(true)
  setStatus('Status: opening')
  openCrate().then(() => {
    isBusy = false
    setControlsDisabled(false)
    setStatus('Status: ready')
  })
})

closeBtn.addEventListener('click', () => {
  if (isBusy || isSpinning) return
  isBusy = true
  setControlsDisabled(true)
  setStatus('Status: closing')
  closeCrate().then(() => {
    isBusy = false
    setControlsDisabled(false)
    setStatus('Status: ready')
  })
})

spinBtn.addEventListener('click', () => {
  startSpin()
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
    setError('')
    setStatus('Status: ready')
  },
  undefined,
  () => {
    updateAnimationInfo([])
    setError('Missing model: /models/crate.glb could not be loaded.')
    createFallbackCrate()
    usingFallback = true
    setStatus('Status: ready (using fallback crate)')
  }
)

function createFallbackCrate() {
  if (crateRoot) {
    scene.remove(crateRoot)
  }
  mixer = null
  openAction = null
  closeAction = null
  const group = new THREE.Group()
  const baseMat = new THREE.MeshStandardMaterial({
    color: 0x2b2a38,
    roughness: 0.6,
    metalness: 0.2
  })
  const lidMat = new THREE.MeshStandardMaterial({
    color: 0x3a314d,
    roughness: 0.5,
    metalness: 0.3
  })
  const base = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1, 1.2), baseMat)
  base.position.y = 0.5
  group.add(base)

  const lidPivot = new THREE.Group()
  lidPivot.position.set(0, 1.0, -0.6)
  const lid = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.3, 1.2), lidMat)
  lid.position.set(0, 0.15, 0.6)
  lidPivot.add(lid)
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
  const stripFront = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.05, 0.08), neonMatPrimary)
  stripFront.position.set(0, 0.92, 0.62)
  group.add(stripFront)

  const stripSide = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.6, 1.0), neonMatSecondary)
  stripSide.position.set(-0.88, 0.55, 0)
  group.add(stripSide)

  crateRoot = group
  fallbackLidPivot = lidPivot
  group.position.set(0, 0, 0)
  group.rotation.y = Math.PI * 0.15
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
