import './style.css'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import hats, { selectWeightedHat } from './hats.js'

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

const animationInfo = document.querySelector('#animationInfo')
animationInfo.style.display = 'none'
errorBanner.style.display = 'none'

resultImage.style.width = '100%'
resultImage.style.height = 'auto'
resultImage.style.minHeight = '200px'
resultImage.style.objectFit = 'contain'

openBtn.style.display = 'none'
closeBtn.style.display = ''

const controlsContainer = document.querySelector('.controls')
controlsContainer.style.display = 'grid'
controlsContainer.style.gridTemplateColumns = '1fr 1fr'
spinBtn.style.gridColumn = '1'
spinBtn.style.gridRow = '1'
closeBtn.style.gridColumn = '2'
closeBtn.style.gridRow = '1'
claimBtn.style.gridColumn = '1 / span 2'
claimBtn.style.gridRow = '2'

const pressXPrompt = document.createElement('div')
pressXPrompt.innerHTML = `Press <span style="display: inline-block; width: 24px; height: 24px; background: #4a90e2; border-radius: 50%; color: white; text-align: center; line-height: 24px; font-weight: bold; margin: 0 4px;">X</span> for a Random Hat`
pressXPrompt.style.cssText = `
  position: fixed;
  transform: translate(-50%, -50%);
  font-size: 20px;
  font-weight: bold;
  color: white;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
  pointer-events: auto;
  cursor: pointer;
  z-index: 100;
  display: none;
  text-transform: uppercase;
  font-family: Impact, Haettenschweiler, 'Arial Black', sans-serif;
  letter-spacing: 1px;
  white-space: nowrap;
`
document.body.appendChild(pressXPrompt)

pressXPrompt.addEventListener('click', () => {
  if (currentState === STATES.READY && playerInRange) {
    startSpin()
  }
})

window.addEventListener('keydown', (e) => {
  if (e.key === 'x' || e.key === 'X') {
    if (currentState === STATES.READY && playerInRange) {
      startSpin()
    }
  }
})

canvas.addEventListener('click', () => {
  if (currentState === STATES.READY && playerInRange) {
    startSpin()
  }
})

const spinAudio = new Audio('/audio/sound.mp3')
spinAudio.preload = 'auto'
let spinAudioDurationMs = 6000
spinAudio.addEventListener('loadedmetadata', () => {
  if (spinAudio.duration && isFinite(spinAudio.duration) && spinAudio.duration > 0) {
    spinAudioDurationMs = Math.floor(spinAudio.duration * 1000)
  }
})

// SFX Audio objects (reusable)
const openSfx = new Audio('/sfx/open.mp3')
const closeSfx = new Audio('/sfx/close.mp3')
const claimSfx = new Audio('/sfx/claim.mp3')

// SFX helper: allows rapid retriggering without console spam
function playSfx(audio, volume = 1) {
  try {
    audio.currentTime = 0
  } catch (_) {
    // Guard: audio may not be ready yet
  }
  audio.volume = volume
  audio.play().catch(() => {})
}

// One-time audio unlock on first user gesture (autoplay policy)
const unlockAudio = () => {
  const sfxList = [openSfx, closeSfx, claimSfx]
  sfxList.forEach((sfx) => {
    sfx.volume = 0
    sfx.play().then(() => sfx.pause()).catch(() => {})
  })
  document.removeEventListener('pointerdown', unlockAudio)
  document.removeEventListener('click', unlockAudio)
}
document.addEventListener('pointerdown', unlockAudio, { once: true })
document.addEventListener('click', unlockAudio, { once: true })

// Helper: Promise-based delay
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Helper: Wait for audio to have duration available (with timeout + error resilience)
const AUDIO_READY_TIMEOUT_MS = 1500
function ensureAudioReady(audio) {
  return new Promise(resolve => {
    // Already ready
    if (audio.readyState >= 1 && isFinite(audio.duration) && audio.duration > 0) {
      resolve()
      return
    }
    let resolved = false
    const cleanup = () => {
      if (resolved) return
      resolved = true
      audio.removeEventListener('loadedmetadata', onReady)
      audio.removeEventListener('canplaythrough', onReady)
      audio.removeEventListener('error', onError)
      clearTimeout(timeoutId)
      resolve()
    }
    const onReady = () => cleanup()
    const onError = () => cleanup()
    audio.addEventListener('loadedmetadata', onReady)
    audio.addEventListener('canplaythrough', onReady)
    audio.addEventListener('error', onError)
    // Timeout fallback so spin never hangs
    const timeoutId = setTimeout(cleanup, AUDIO_READY_TIMEOUT_MS)
  })
}

// Helper: Play SFX and wait for it to finish (with timeout fallback)
const SFX_PLAY_TIMEOUT_MS = 8000
function playSfxAndWait(audio, volume = 1) {
  return new Promise(resolve => {
    let resolved = false
    const cleanup = () => {
      if (resolved) return
      resolved = true
      audio.removeEventListener('ended', onEnded)
      audio.removeEventListener('error', onError)
      clearTimeout(timeoutId)
      resolve()
    }
    const onEnded = () => cleanup()
    const onError = () => cleanup()
    try {
      audio.currentTime = 0
    } catch (_) {}
    audio.volume = volume
    audio.addEventListener('ended', onEnded)
    audio.addEventListener('error', onError)
    // Timeout fallback so spin never hangs even if audio broken
    const timeoutId = setTimeout(cleanup, SFX_PLAY_TIMEOUT_MS)
    audio.play().catch(() => cleanup())
  })
}

// Pause after crate opens, before spin starts
const POST_OPEN_PAUSE_MS = 1000

// Auto-close chest after winner is shown (Part B)
const AUTO_CLOSE_AFTER_WINNER_MS = 2500
let autoCloseTimerId = null

const BACKGROUND_URL = '/room.png'
const BG_Y_ROT = -0.6

const scene = new THREE.Scene()
scene.background = new THREE.Color('#0b0c10')

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100)
camera.position.set(0, 4.0, 6.0)
const cameraTargetFinal = new THREE.Vector3(0, 1.1, 0.6)
const cameraTargetStart = new THREE.Vector3(0, 2.5, 0.6)
const cameraTargetCurrent = cameraTargetStart.clone()
camera.lookAt(cameraTargetCurrent)

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
renderer.setPixelRatio(window.devicePixelRatio || 1)
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.outputColorSpace = THREE.SRGBColorSpace
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap

const textureLoader = new THREE.TextureLoader()

const hatTextures = []
for (const hat of hats) {
  const texture = textureLoader.load(hat.image)
  texture.colorSpace = THREE.SRGBColorSpace
  hatTextures.push(texture)
}

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

// Hats imported from hats.js

let currentHatIndex = 0
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
let lidQuestionMarks = null
let currentState = 'READY'
let playerInRange = false
let introComplete = false
let introStartTime = 0
const introDuration = 1500
let hatDisplay3D = null
let hatDisplayGlow = null
let hatDisplayRoot = null
let hatDisplayOpacity = 1.0
let hatDisplayTargetOpacity = 1.0
let hatDisplayInsideY = 0
let hatDisplayAboveY = 0
let hatDisplayTargetY = 0
let hatDisplayOpenStartTime = 0
const hatRevealDelaySeconds = 0.4
let hatDisplayOutline = null
let hatDisplayScale = 1.0
let hatDisplayScaleTarget = 1.0

// Crate internal glow (yellow light, state-driven)
let crateInternalLight = null
let crateGlowIntensity = 0
let crateGlowTarget = 0
const CRATE_GLOW_MAX = 4.0
const CRATE_GLOW_RAMP_SPEED = 0.06 // ~300-500ms ramp at 60fps

// Spin timing constants (easy to tune)
const SPIN_BASE_DURATION_MS = 7000          // baseline feel
const AUDIO_SILENCE_TAIL_MS = 1800          // trims silent tail from audio end
const SPIN_END_PADDING_MS = 80              // stop a hair before trimmed audio end
const MIN_FULL_ROTATIONS = 12               // keep fast early feel
const EXTRA_FULL_ROTATIONS_MAX = 6          // random extra rotations for variety

// Crack leakage materials (driven by glow intensity)
let crateCrackMaterials = []

// Question mark glow layer
let questionMarkGlowMesh = null
let questionMarkGlowMat = null

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
  const active3DStates = [STATES.OPENING, STATES.SPINNING, STATES.WINNER_SELECTED]
  if (hatDisplay3D && hatTextures[index] && active3DStates.includes(currentState)) {
    hatDisplay3D.material.map = hatTextures[index]
    hatDisplay3D.material.needsUpdate = true
    hatDisplayScale = 1.12
    hatDisplayScaleTarget = 1.0
    if (hatDisplayGlow) {
      hatDisplayGlow.material.map = hatTextures[index]
      hatDisplayGlow.material.needsUpdate = true
    }
    if (hatDisplayOutline) {
      hatDisplayOutline.material.map = hatTextures[index]
      hatDisplayOutline.material.needsUpdate = true
    }
  }
}

const STATES = {
  READY: 'READY',
  OPENING: 'OPENING',
  SPINNING: 'SPINNING',
  WINNER_SELECTED: 'WINNER SELECTED',
  WINNER_PENDING_CLAIM: 'WINNER PENDING CLAIM',
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

// Helper: explicitly control question marks visibility (Part A)
function setQuestionMarksVisible(visible) {
  if (lidQuestionMarks) {
    lidQuestionMarks.visible = visible
  }
  if (questionMarkGlowMesh) {
    questionMarkGlowMesh.visible = visible
    if (!visible && questionMarkGlowMat) {
      questionMarkGlowMat.opacity = 0
    }
  }
}

// Helper: cancel any pending auto-close timer
function cancelAutoClose() {
  if (autoCloseTimerId) {
    clearTimeout(autoCloseTimerId)
    autoCloseTimerId = null
  }
}

// Helper: schedule auto-close after winner is shown (Part B)
function scheduleAutoClose() {
  cancelAutoClose()
  autoCloseTimerId = setTimeout(() => {
    autoCloseTimerId = null
    // Only auto-close if still in WINNER_SELECTED state
    if (currentState !== STATES.WINNER_SELECTED) return
    playSfx(closeSfx, 1)
    setState(STATES.CLOSING)
    closeCrate().then(() => {
      // Transition to WINNER_PENDING_CLAIM so hat stays visible, claim remains enabled
      setState(STATES.WINNER_PENDING_CLAIM)
      setQuestionMarksVisible(true)
    })
  }, AUTO_CLOSE_AFTER_WINNER_MS)
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

function playAction(action, { reverse = false, timeScale = 1 } = {}) {
  if (!action) return
  action.reset()
  action.clampWhenFinished = true
  action.setLoop(THREE.LoopOnce, 1)
  action.timeScale = reverse ? -timeScale : timeScale
  if (reverse) {
    action.time = action.getClip().duration
  }
  action.play()
}

function playActionWithPromise(action, options = {}) {
  if (!action) return Promise.resolve()
  const clipDurationMs = action.getClip().duration * 1000
  const targetDurationMs = options.durationMs || clipDurationMs
  const calculatedTimeScale = clipDurationMs / targetDurationMs
  playAction(action, { ...options, timeScale: calculatedTimeScale })
  return new Promise((resolve) => {
    setTimeout(resolve, targetDurationMs)
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
  spinBtn.disabled = isLocked || currentState === STATES.WINNER_PENDING_CLAIM
  // Claim enabled for both WINNER_SELECTED and WINNER_PENDING_CLAIM
  claimBtn.disabled = currentState !== STATES.WINNER_SELECTED && currentState !== STATES.WINNER_PENDING_CLAIM
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

function openCrate(durationMs) {
  if (crateIsOpen) return Promise.resolve()
  if (usingFallback) {
    return animateLidTo(fallbackOpenAngle, durationMs || 800).then(() => {
      crateIsOpen = true
    })
  }
  const actionPromise = openAction
    ? playActionWithPromise(openAction, { durationMs })
    : Promise.resolve()
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

// Wheel-of-fortune spin state
let spinAnimationId = null
let spinStartTime = 0
let spinWinnerIndex = 0
let spinTotalSteps = 0
let spinStep = 0

// Winner identity for order/fulfillment (set after each spin)
let spinWinnerHat = null
let spinWinnerHatId = null
let spinWinnerHatName = null

/**
 * Piecewise easing for wheel-of-fortune effect
 * - Phase 1 (t < 0.70): Fast, nearly linear - covers ~90% of steps
 * - Phase 2 (t >= 0.70): Very hard ease-out for dramatic late slowdown
 */
function spinEasing(t) {
  const breakpoint = 0.70
  const stepsCoveredInPhase1 = 0.90

  if (t < breakpoint) {
    // Phase 1: near-linear with tiny acceleration
    const phase1Progress = t / breakpoint
    return phase1Progress * stepsCoveredInPhase1
  } else {
    // Phase 2: very aggressive ease-out (power 5) for last ~30% of time
    const phase2Progress = (t - breakpoint) / (1 - breakpoint)
    const eased = 1 - Math.pow(1 - phase2Progress, 5)
    return stepsCoveredInPhase1 + eased * (1 - stepsCoveredInPhase1)
  }
}

async function startSpin() {
  // Block spinning during active states or when winner is pending claim
  if ([STATES.OPENING, STATES.SPINNING, STATES.CLAIMING, STATES.CLOSING, STATES.WINNER_PENDING_CLAIM].includes(currentState)) {
    return
  }
  // Cancel any pending auto-close
  cancelAutoClose()
  // Clear any existing spin
  if (spinAnimationId) {
    cancelAnimationFrame(spinAnimationId)
    spinAnimationId = null
  }

  // Part C: Always run the full open sequence - close first if already open
  if (crateIsOpen) {
    await closeCrate()
  }

  // Now run the open sequence: sync open SFX with lid animation, then pause
  setState(STATES.OPENING)
  await ensureAudioReady(openSfx)
  // Fallback to 800ms if audio failed to load or duration unavailable
  const openMs = isFinite(openSfx.duration) && openSfx.duration > 0
    ? Math.max(300, Math.min(6000, openSfx.duration * 1000))
    : 800
  await Promise.all([
    playSfxAndWait(openSfx, 1),
    openCrate(openMs)
  ])
  await delay(POST_OPEN_PAUSE_MS)

  // Pre-select winner before spin starts
  spinWinnerIndex = selectWeightedHat()
  spinWinnerHat = hats[spinWinnerIndex]
  spinWinnerHatId = spinWinnerHat.id
  spinWinnerHatName = spinWinnerHat.name

  // Calculate steps to land exactly on winner from current position
  const offset = (spinWinnerIndex - currentHatIndex + hats.length) % hats.length
  const fullRotations = MIN_FULL_ROTATIONS + Math.floor(Math.random() * (EXTRA_FULL_ROTATIONS_MAX + 1))
  spinTotalSteps = fullRotations * hats.length + offset
  spinStep = 0
  spinStartTime = performance.now()

  // Compute spin duration that trims audio silent tail
  let audioMs = SPIN_BASE_DURATION_MS
  if (Number.isFinite(spinAudio.duration) && spinAudio.duration > 0) {
    audioMs = spinAudio.duration * 1000
  }
  const effectiveAudioMs = Math.max(1000, Math.min(audioMs, audioMs - AUDIO_SILENCE_TAIL_MS))
  const spinDuration = Math.max(1000, Math.min(SPIN_BASE_DURATION_MS, effectiveAudioMs - SPIN_END_PADDING_MS))

  // Decide audio looping: loop only if spin is longer than effective audio
  const shouldLoop = spinDuration > effectiveAudioMs

  // Now start spinning: state, audio, and animation all begin together
  setState(STATES.SPINNING)
  spinAudio.currentTime = 0
  spinAudio.volume = 1
  spinAudio.loop = shouldLoop
  spinAudio.play().catch(() => {})

  function animateSpin(now) {
    const elapsed = now - spinStartTime
    const progress = Math.max(0, Math.min(elapsed / spinDuration, 1))
    const easedProgress = spinEasing(progress)

    // Calculate which step we should be on based on eased progress
    // Use (totalSteps + 1) trick so final step can be reached before easedProgress hits exactly 1.0
    const targetStep = Math.min(spinTotalSteps, Math.floor(easedProgress * (spinTotalSteps + 1)))

    // Advance through steps - each step increments currentHatIndex
    while (spinStep < targetStep && spinStep < spinTotalSteps) {
      spinStep++
      currentHatIndex = (currentHatIndex + 1) % hats.length
      showHat(currentHatIndex)
    }

    if (progress < 1) {
      spinAnimationId = requestAnimationFrame(animateSpin)
    } else {
      // Spin complete - currentHatIndex should already be on winner
      spinAudio.loop = false
      spinAudio.pause()
      spinAudio.currentTime = 0
      // Guard: only flip if somehow not on winner (should not happen)
      if (currentHatIndex !== spinWinnerIndex) {
        currentHatIndex = spinWinnerIndex
        showHat(currentHatIndex)
      }
      setState(STATES.WINNER_SELECTED)
      scheduleAutoClose()
      spinAnimationId = null
    }
  }

  spinAnimationId = requestAnimationFrame(animateSpin)
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
  cancelAutoClose()
  playSfx(closeSfx, 1)
  setState(STATES.CLOSING)
  closeCrate().then(() => {
    setState(STATES.READY)
    setQuestionMarksVisible(true)
  })
})

spinBtn.addEventListener('click', () => {
  startSpin()
})

claimBtn.addEventListener('click', () => {
  // Allow claim from both WINNER_SELECTED and WINNER_PENDING_CLAIM
  if (currentState !== STATES.WINNER_SELECTED && currentState !== STATES.WINNER_PENDING_CLAIM) return
  cancelAutoClose()
  playSfx(claimSfx, 1)
  setState(STATES.CLAIMING)
  // closeCrate will no-op if already closed (WINNER_PENDING_CLAIM case)
  closeCrate().then(() => {
    setState(STATES.CLAIMED)
    setQuestionMarksVisible(true)
  })
})

function createHatDisplay3D() {
  if (hatDisplayRoot) {
    scene.remove(hatDisplayRoot)
  }
  if (!crateRoot) return

  const bbox = new THREE.Box3().setFromObject(crateRoot)
  const center = new THREE.Vector3()
  bbox.getCenter(center)

  hatDisplayInsideY = bbox.min.y + 0.3
  hatDisplayAboveY = bbox.max.y + 0.8
  hatDisplayTargetY = hatDisplayInsideY

  hatDisplayRoot = new THREE.Group()
  hatDisplayRoot.position.set(center.x, hatDisplayInsideY, center.z)
  hatDisplayRoot.visible = false

  const glowPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(1.2, 1.2),
    new THREE.MeshBasicMaterial({
      map: hatTextures[currentHatIndex],
      color: 0xff33ff,
      transparent: true,
      opacity: 0.25,
      alphaTest: 0.35,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false,
      toneMapped: false
    })
  )
  glowPlane.name = 'hatGlow'
  glowPlane.renderOrder = 8
  glowPlane.scale.setScalar(1.18)
  hatDisplayGlow = glowPlane
  hatDisplayRoot.add(glowPlane)

  const outlinePlane = new THREE.Mesh(
    new THREE.PlaneGeometry(1.2, 1.2),
    new THREE.MeshBasicMaterial({
      map: hatTextures[currentHatIndex],
      color: 0x000000,
      transparent: true,
      opacity: 0.3,
      alphaTest: 0.35,
      depthWrite: false,
      depthTest: false,
      toneMapped: false
    })
  )
  outlinePlane.name = 'hatOutline'
  outlinePlane.renderOrder = 9
  outlinePlane.scale.setScalar(1.06)
  hatDisplayOutline = outlinePlane
  hatDisplayRoot.add(outlinePlane)

  const hatPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(1.2, 1.2),
    new THREE.MeshBasicMaterial({
      map: hatTextures[currentHatIndex],
      transparent: false,
      alphaTest: 0.35,
      toneMapped: false,
      depthWrite: false,
      depthTest: false
    })
  )
  hatPlane.name = 'hatDisplay'
  hatPlane.renderOrder = 10
  hatDisplay3D = hatPlane
  hatDisplayRoot.add(hatPlane)

  scene.add(hatDisplayRoot)
}

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
    createHatDisplay3D()
  },
  undefined,
  () => {
    updateAnimationInfo([])
    setError('Missing model: /models/crate.glb could not be loaded.')
    createFallbackCrate()
    usingFallback = true
    crateIsOpen = false
    setState(STATES.READY)
    createHatDisplay3D()
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

// Procedural crack texture for light leakage (thin jagged streaks)
function createCrackTexture(width = 256, height = 256) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')

  ctx.clearRect(0, 0, width, height)

  // Draw multiple thin jagged crack lines
  const numCracks = 4 + Math.floor(Math.random() * 3)

  for (let i = 0; i < numCracks; i++) {
    // Each crack is a thin jagged line
    ctx.beginPath()

    // Start from edge or random position
    let x = Math.random() * width * 0.3
    let y = Math.random() * height
    ctx.moveTo(x, y)

    // Create jagged path across
    const segments = 8 + Math.floor(Math.random() * 6)
    for (let j = 0; j < segments; j++) {
      x += width / segments * (0.8 + Math.random() * 0.4)
      y += (Math.random() - 0.5) * 30
      ctx.lineTo(x, y)
    }

    // Thin bright core
    ctx.strokeStyle = 'rgba(255, 230, 140, 0.9)'
    ctx.lineWidth = 1.0 + Math.random() * 0.5
    ctx.shadowColor = 'rgba(255, 200, 80, 0.8)'
    ctx.shadowBlur = 8
    ctx.stroke()

    // Softer glow pass
    ctx.strokeStyle = 'rgba(255, 200, 80, 0.3)'
    ctx.lineWidth = 3 + Math.random() * 2
    ctx.shadowBlur = 15
    ctx.stroke()
  }

  // Add a few vertical crack branches
  for (let i = 0; i < 2; i++) {
    ctx.beginPath()
    const startX = width * (0.3 + Math.random() * 0.4)
    let y = 0
    let x = startX
    ctx.moveTo(x, y)

    while (y < height) {
      y += 15 + Math.random() * 20
      x = startX + (Math.random() - 0.5) * 20
      ctx.lineTo(x, y)
    }

    ctx.strokeStyle = 'rgba(255, 220, 100, 0.7)'
    ctx.lineWidth = 0.8
    ctx.shadowColor = 'rgba(255, 200, 80, 0.6)'
    ctx.shadowBlur = 6
    ctx.stroke()
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

// Procedural concrete texture for cinder blocks
function createConcreteTexture(width = 128, height = 128) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')

  // Base gray
  ctx.fillStyle = '#4a4a4a'
  ctx.fillRect(0, 0, width, height)

  // Add noise speckle
  const imageData = ctx.getImageData(0, 0, width, height)
  const data = imageData.data
  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 40
    data[i] = Math.max(0, Math.min(255, data[i] + noise))
    data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise))
    data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise))
  }
  ctx.putImageData(imageData, 0, 0)

  // Add some darker patches
  for (let i = 0; i < 8; i++) {
    ctx.fillStyle = `rgba(30, 30, 30, ${0.1 + Math.random() * 0.15})`
    ctx.beginPath()
    ctx.arc(
      Math.random() * width,
      Math.random() * height,
      5 + Math.random() * 15,
      0, Math.PI * 2
    )
    ctx.fill()
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

// Hazard stencil texture for crate side
function createHazardStencilTexture(width = 256, height = 256) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')

  ctx.clearRect(0, 0, width, height)

  // Warning triangle
  const cx = width / 2
  const cy = height * 0.45
  const size = width * 0.35

  ctx.beginPath()
  ctx.moveTo(cx, cy - size * 0.8)
  ctx.lineTo(cx + size * 0.7, cy + size * 0.5)
  ctx.lineTo(cx - size * 0.7, cy + size * 0.5)
  ctx.closePath()

  ctx.strokeStyle = 'rgba(255, 200, 50, 0.8)'
  ctx.lineWidth = 4
  ctx.stroke()

  // Exclamation mark inside
  ctx.fillStyle = 'rgba(255, 200, 50, 0.8)'
  ctx.fillRect(cx - 4, cy - size * 0.3, 8, size * 0.4)
  ctx.beginPath()
  ctx.arc(cx, cy + size * 0.25, 5, 0, Math.PI * 2)
  ctx.fill()

  // Stencil lines below
  ctx.strokeStyle = 'rgba(255, 200, 50, 0.5)'
  ctx.lineWidth = 2
  const lineY = height * 0.78
  ctx.beginPath()
  ctx.moveTo(width * 0.15, lineY)
  ctx.lineTo(width * 0.85, lineY)
  ctx.stroke()

  ctx.beginPath()
  ctx.moveTo(width * 0.25, lineY + 12)
  ctx.lineTo(width * 0.75, lineY + 12)
  ctx.stroke()

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
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

  // Build lid from individual planks with gaps for realism
  const lidPlankCount = 4
  const lidTotalWidth = 2.6
  const lidPlankGap = 0.012
  const lidPlankWidth = (lidTotalWidth - (lidPlankCount - 1) * lidPlankGap) / lidPlankCount
  const lidPlankHeight = 0.12
  const lidPlankDepth = 1.4

  for (let i = 0; i < lidPlankCount; i++) {
    const heightVariation = (Math.random() - 0.5) * 0.015
    const plankGeo = new THREE.BoxGeometry(lidPlankWidth, lidPlankHeight, lidPlankDepth)
    const plank = new THREE.Mesh(plankGeo, woodMat)
    const xPos = -lidTotalWidth / 2 + lidPlankWidth / 2 + i * (lidPlankWidth + lidPlankGap)
    plank.position.set(xPos, 0.06 + heightVariation, 0.7)
    plank.castShadow = true
    plank.receiveShadow = true
    lidPivot.add(plank)
  }

  // Cross braces on underside of lid (visible when open)
  const braceGeo = new THREE.BoxGeometry(2.4, 0.04, 0.12)
  const brace1 = new THREE.Mesh(braceGeo, woodDarkMat)
  brace1.position.set(0, -0.02, 0.4)
  lidPivot.add(brace1)
  const brace2 = new THREE.Mesh(braceGeo, woodDarkMat)
  brace2.position.set(0, -0.02, 1.0)
  lidPivot.add(brace2)

  // Better metal material for hardware
  const hardwareMat = new THREE.MeshStandardMaterial({
    color: 0x2a2a2e,
    roughness: 0.45,
    metalness: 0.85
  })

  // Hinge plates on lid (back edge, attach to lidPivot so they move with lid)
  const hingePlateGeo = new THREE.BoxGeometry(0.22, 0.025, 0.12)
  const hingePlate1 = new THREE.Mesh(hingePlateGeo, hardwareMat)
  hingePlate1.position.set(-0.6, 0.125, 0.02)  // On lid surface, near back
  hingePlate1.castShadow = true
  lidPivot.add(hingePlate1)
  const hingePlate2 = new THREE.Mesh(hingePlateGeo, hardwareMat)
  hingePlate2.position.set(0.6, 0.125, 0.02)
  hingePlate2.castShadow = true
  lidPivot.add(hingePlate2)

  // Hinge plates on base (back edge)
  const baseHinge1 = new THREE.Mesh(hingePlateGeo, hardwareMat)
  baseHinge1.position.set(-0.6, 0.98, -0.68)
  baseHinge1.castShadow = true
  group.add(baseHinge1)
  const baseHinge2 = new THREE.Mesh(hingePlateGeo, hardwareMat)
  baseHinge2.position.set(0.6, 0.98, -0.68)
  baseHinge2.castShadow = true
  group.add(baseHinge2)

  // Hinge barrels (cylindrical pivot points)
  const barrelGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.08, 8)
  const barrel1 = new THREE.Mesh(barrelGeo, hardwareMat)
  barrel1.position.set(-0.6, 1.0, -0.69)
  barrel1.rotation.x = Math.PI / 2
  group.add(barrel1)
  const barrel2 = new THREE.Mesh(barrelGeo, hardwareMat)
  barrel2.position.set(0.6, 1.0, -0.69)
  barrel2.rotation.x = Math.PI / 2
  group.add(barrel2)

  // Front latch - hasp on lid
  const haspGeo = new THREE.BoxGeometry(0.12, 0.025, 0.18)
  const hasp = new THREE.Mesh(haspGeo, hardwareMat)
  hasp.position.set(0, 0.125, 1.35)  // Front of lid
  hasp.castShadow = true
  lidPivot.add(hasp)
  // Hasp loop
  const loopGeo = new THREE.TorusGeometry(0.035, 0.01, 6, 12, Math.PI)
  const haspLoop = new THREE.Mesh(loopGeo, hardwareMat)
  haspLoop.position.set(0, 0.11, 1.42)
  haspLoop.rotation.x = Math.PI / 2
  lidPivot.add(haspLoop)

  // Front latch - catch plate on base
  const catchGeo = new THREE.BoxGeometry(0.15, 0.08, 0.04)
  const catchPlate = new THREE.Mesh(catchGeo, hardwareMat)
  catchPlate.position.set(0, 0.92, 0.71)
  catchPlate.castShadow = true
  group.add(catchPlate)

  // Metal corner brackets (simplified)
  const bracketGeo = new THREE.BoxGeometry(0.06, 0.2, 0.06)
  const cornerPositions = [
    [-1.28, 0.15, 0.69],
    [1.28, 0.15, 0.69],
    [-1.28, 0.15, -0.69],
    [1.28, 0.15, -0.69]
  ]
  cornerPositions.forEach(([x, y, z]) => {
    const bracket = new THREE.Mesh(bracketGeo, hardwareMat)
    bracket.position.set(x, y, z)
    bracket.castShadow = true
    group.add(bracket)
  })

  // Metal straps (thinner)
  const strapGeo = new THREE.BoxGeometry(2.65, 0.04, 0.06)
  const strap1 = new THREE.Mesh(strapGeo, hardwareMat)
  strap1.position.set(0, 0.35, 0.71)
  strap1.castShadow = true
  group.add(strap1)
  const strap2 = new THREE.Mesh(strapGeo, hardwareMat)
  strap2.position.set(0, 0.7, 0.71)
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

  // Helper to draw one question mark (buttery yellow, readable base)
  const drawQuestionMark = (x, y) => {
    // Subtle shadow for depth
    qCtx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    qCtx.shadowBlur = 10;
    qCtx.shadowOffsetX = 3;
    qCtx.shadowOffsetY = 3;

    // Dark outline for readability
    qCtx.strokeStyle = '#1a1000';
    qCtx.lineWidth = 14;
    qCtx.strokeText('?', x, y);

    // Buttery yellow fill
    qCtx.shadowBlur = 0;
    qCtx.shadowOffsetX = 0;
    qCtx.shadowOffsetY = 0;
    qCtx.fillStyle = '#ffd34d';
    qCtx.fillText('?', x, y);
  };

  // Left question mark (normal orientation)
  drawQuestionMark(256, 256);

  // Right question mark (upside-down)
  qCtx.save();
  qCtx.translate(768, 256);
  qCtx.rotate(Math.PI);
  drawQuestionMark(0, 0);
  qCtx.restore();

  const qTexture = new THREE.CanvasTexture(qCanvas);
  qTexture.colorSpace = THREE.SRGBColorSpace;

  // 2) Create decal material (MeshBasicMaterial, no glow until crate opens)
  const qDecalMat = new THREE.MeshBasicMaterial({
    map: qTexture,
    transparent: true,
    toneMapped: false,
    depthTest: false,
    depthWrite: false,
    side: THREE.DoubleSide
  });

  // 3) Create plane geometry and mesh (larger)
  const qDecalPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(1.8, 0.9),
    qDecalMat
  );

  // 4) Transform to lie flat DIRECTLY on wood lid surface
  qDecalPlane.rotation.x = -Math.PI / 2;  // Rotate from vertical to horizontal
  qDecalPlane.position.set(
    0,      // centered horizontally
    0.13,   // just above lid plank top (lid at y=0.06, height=0.12, top at ~0.12)
    0.65    // centered in lid depth
  );
  qDecalPlane.scale.x = 1 / 1.35;  // Compensate for group horizontal stretch
  qDecalPlane.name = 'qmarksDecal';
  qDecalPlane.renderOrder = 999;  // Render on top

  // 5) Add to lidPivot (opens with lid)
  lidPivot.add(qDecalPlane);
  lidQuestionMarks = qDecalPlane;

  // 6) Create glow layer for question marks (controlled by visibility, not just opacity)
  const qGlowCanvas = document.createElement('canvas');
  qGlowCanvas.width = 1024;
  qGlowCanvas.height = 512;
  const qGlowCtx = qGlowCanvas.getContext('2d');
  qGlowCtx.clearRect(0, 0, 1024, 512);
  qGlowCtx.font = 'bold 420px Impact, Haettenschweiler, "Arial Black", sans-serif';
  qGlowCtx.textAlign = 'center';
  qGlowCtx.textBaseline = 'middle';

  // Draw blurred glow question marks
  const drawGlowQuestionMark = (x, y) => {
    qGlowCtx.shadowColor = '#ffea7a';
    qGlowCtx.shadowBlur = 60;
    qGlowCtx.fillStyle = 'rgba(255, 234, 122, 0.6)';
    qGlowCtx.fillText('?', x, y);
    qGlowCtx.fillText('?', x, y); // Double for stronger glow
  };
  drawGlowQuestionMark(256, 256);
  qGlowCtx.save();
  qGlowCtx.translate(768, 256);
  qGlowCtx.rotate(Math.PI);
  drawGlowQuestionMark(0, 0);
  qGlowCtx.restore();

  const qGlowTexture = new THREE.CanvasTexture(qGlowCanvas);
  qGlowTexture.colorSpace = THREE.SRGBColorSpace;

  questionMarkGlowMat = new THREE.MeshBasicMaterial({
    map: qGlowTexture,
    transparent: true,
    opacity: 0,
    toneMapped: false,
    blending: THREE.AdditiveBlending,
    depthTest: false,
    depthWrite: false,
    side: THREE.DoubleSide
  });

  questionMarkGlowMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(2.0, 1.0),
    questionMarkGlowMat
  );
  questionMarkGlowMesh.rotation.x = -Math.PI / 2;
  questionMarkGlowMesh.position.set(0, 0.14, 0.65);  // Just above base decal
  questionMarkGlowMesh.scale.x = 1 / 1.35;
  questionMarkGlowMesh.renderOrder = 998;
  questionMarkGlowMesh.visible = false;  // Start hidden, controlled in animate loop
  lidPivot.add(questionMarkGlowMesh);

  // Optional debug: visualize axes
  if (DEBUG_QMARKS) {
    const axesHelper = new THREE.AxesHelper(0.7);
    lidPivot.add(axesHelper);
  }
  // --- END QUESTION MARKS DECAL ---

  // Hot buttery yellow internal glow - point light inside crate (starts OFF)
  crateInternalLight = new THREE.PointLight(0xffe27a, 0, 2.2)
  crateInternalLight.position.set(0, 0.5, 0)
  group.add(crateInternalLight)

  // Clear crack materials array for seam leak planes
  crateCrackMaterials = []

  // Create seam leak material (thin bright strips)
  const createSeamLeakMaterial = () => {
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffe27a,
      transparent: true,
      opacity: 0,
      toneMapped: false,
      blending: THREE.AdditiveBlending,
      depthTest: true,
      depthWrite: false,
      side: THREE.DoubleSide
    })
    crateCrackMaterials.push(mat)
    return mat
  }

  // Lid seam - thin strips around lid perimeter where it meets base
  // Front lid seam
  const seamFront = new THREE.Mesh(
    new THREE.PlaneGeometry(2.4, 0.025),
    createSeamLeakMaterial()
  )
  seamFront.position.set(0, 0.98, 0.69)
  group.add(seamFront)

  // Back lid seam
  const seamBack = new THREE.Mesh(
    new THREE.PlaneGeometry(2.4, 0.025),
    createSeamLeakMaterial()
  )
  seamBack.position.set(0, 0.98, -0.69)
  group.add(seamBack)

  // Left lid seam
  const seamLeft = new THREE.Mesh(
    new THREE.PlaneGeometry(1.2, 0.025),
    createSeamLeakMaterial()
  )
  seamLeft.position.set(-1.29, 0.98, 0)
  seamLeft.rotation.y = Math.PI / 2
  group.add(seamLeft)

  // Right lid seam
  const seamRight = new THREE.Mesh(
    new THREE.PlaneGeometry(1.2, 0.025),
    createSeamLeakMaterial()
  )
  seamRight.position.set(1.29, 0.98, 0)
  seamRight.rotation.y = Math.PI / 2
  group.add(seamRight)

  // Side plank seams (vertical strips)
  const seamSide1 = new THREE.Mesh(
    new THREE.PlaneGeometry(0.02, 0.7),
    createSeamLeakMaterial()
  )
  seamSide1.position.set(0.4, 0.5, 0.705)
  group.add(seamSide1)

  const seamSide2 = new THREE.Mesh(
    new THREE.PlaneGeometry(0.02, 0.7),
    createSeamLeakMaterial()
  )
  seamSide2.position.set(-0.4, 0.5, 0.705)
  group.add(seamSide2)

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

  // Hazard stencil decal on front face
  const hazardTexture = createHazardStencilTexture(256, 256)
  const hazardMat = new THREE.MeshBasicMaterial({
    map: hazardTexture,
    transparent: true,
    toneMapped: false,
    depthTest: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1
  })
  const hazardDecal = new THREE.Mesh(
    new THREE.PlaneGeometry(0.6, 0.6),
    hazardMat
  )
  hazardDecal.position.set(0.5, 0.5, 0.706)
  hazardDecal.scale.x = 1 / 1.35 // Compensate for crate stretch
  group.add(hazardDecal)

  // Cinder blocks under crate
  const concreteTexture = createConcreteTexture(128, 128)
  const concreteMat = new THREE.MeshStandardMaterial({
    map: concreteTexture,
    roughness: 0.95,
    metalness: 0
  })

  // Standard cinder block dimensions (scaled down)
  const blockW = 0.5, blockH = 0.25, blockD = 0.3
  const cinderBlockGeo = new THREE.BoxGeometry(blockW, blockH, blockD)

  // Create cinder block with holes
  const createCinderBlock = (x, z, rotY = 0) => {
    const blockGroup = new THREE.Group()

    // Main block body
    const block = new THREE.Mesh(cinderBlockGeo, concreteMat)
    block.castShadow = true
    block.receiveShadow = true
    blockGroup.add(block)

    // Cut holes (dark insets on top)
    const holeMat = new THREE.MeshBasicMaterial({ color: 0x1a1a1a })
    const holeGeo = new THREE.BoxGeometry(blockW * 0.3, 0.02, blockD * 0.6)
    const hole1 = new THREE.Mesh(holeGeo, holeMat)
    hole1.position.set(-blockW * 0.25, blockH / 2, 0)
    blockGroup.add(hole1)
    const hole2 = new THREE.Mesh(holeGeo, holeMat)
    hole2.position.set(blockW * 0.25, blockH / 2, 0)
    blockGroup.add(hole2)

    blockGroup.position.set(x, blockH / 2, z)
    blockGroup.rotation.y = rotY
    return blockGroup
  }

  // Place 4 cinder blocks under crate corners (slightly irregular)
  const block1 = createCinderBlock(-0.7, -0.35, 0.05)
  const block2 = createCinderBlock(0.65, -0.38, -0.08)
  const block3 = createCinderBlock(-0.68, 0.32, 0.12)
  const block4 = createCinderBlock(0.72, 0.35, -0.03)

  // Add blocks to scene (not to group, so they don't scale with crate)
  scene.add(block1)
  scene.add(block2)
  scene.add(block3)
  scene.add(block4)

  // Lift crate to sit on blocks
  group.position.y = blockH

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

  const time = clock.getElapsedTime()

  if (!introComplete) {
    if (introStartTime === 0) {
      introStartTime = time
    }
    const elapsed = (time - introStartTime) * 1000
    const t = Math.min(elapsed / introDuration, 1)
    const eased = easeInOut(t)

    cameraTargetCurrent.lerpVectors(cameraTargetStart, cameraTargetFinal, eased)
    camera.lookAt(cameraTargetCurrent)

    if (t >= 1) {
      introComplete = true
      playerInRange = true
    }
  } else {
    if (currentState === STATES.READY) {
      const bobY = Math.sin(time * Math.PI * 2 * 1.0) * 0.03
      const bobX = Math.sin(time * Math.PI * 2 * 0.6) * 0.015
      const bobbedTarget = cameraTargetFinal.clone()
      bobbedTarget.y += bobY
      bobbedTarget.x += bobX
      camera.lookAt(bobbedTarget)
    } else {
      camera.lookAt(cameraTargetFinal)
    }
  }

  if (pressXPrompt && crateRoot) {
    if (currentState === STATES.READY && playerInRange) {
      const bbox = new THREE.Box3().setFromObject(crateRoot)
      const center = new THREE.Vector3()
      bbox.getCenter(center)
      const height = bbox.max.y - bbox.min.y
      const anchorY = bbox.min.y + height * 0.62
      const anchor = new THREE.Vector3(center.x, anchorY, center.z)

      const dirToCam = camera.position.clone().sub(center).normalize()
      anchor.addScaledVector(dirToCam, 0.35)

      const screenPos = anchor.clone().project(camera)
      const x = (screenPos.x * 0.5 + 0.5) * window.innerWidth
      const y = (-screenPos.y * 0.5 + 0.5) * window.innerHeight + 8

      pressXPrompt.style.left = x + 'px'
      pressXPrompt.style.top = y + 'px'
      pressXPrompt.style.display = 'block'
    } else {
      pressXPrompt.style.display = 'none'
    }
  }

  // State-driven internal glow ramp (only SPINNING and WINNER_SELECTED, not OPENING)
  if (crateInternalLight) {
    // Set target based on state: glow ON only when crate is fully open
    if (currentState === STATES.SPINNING || currentState === STATES.WINNER_SELECTED) {
      crateGlowTarget = CRATE_GLOW_MAX
    } else {
      crateGlowTarget = 0
    }
    // Smooth ramp toward target
    crateGlowIntensity += (crateGlowTarget - crateGlowIntensity) * CRATE_GLOW_RAMP_SPEED
    crateInternalLight.intensity = crateGlowIntensity

    // Drive crack material opacity with flicker
    const leak = Math.max(0, Math.min(1, crateGlowIntensity / CRATE_GLOW_MAX))
    const flicker = 0.85 + 0.15 * (Math.sin(time * 13.0) * 0.5 + 0.5)
    const crackOpacity = (0.05 + 0.35 * leak) * flicker

    for (const mat of crateCrackMaterials) {
      mat.opacity = crackOpacity
    }

    // Drive question mark glow opacity
    if (questionMarkGlowMat) {
      questionMarkGlowMat.opacity = leak * 0.7 * flicker
    }
  }

  if (hatDisplayRoot && hatDisplay3D && hatDisplayGlow) {
    const time = clock.getElapsedTime()

    // Hats visible during SPINNING, WINNER_SELECTED, and WINNER_PENDING_CLAIM
    if (currentState === STATES.SPINNING || currentState === STATES.WINNER_SELECTED || currentState === STATES.WINNER_PENDING_CLAIM) {
      hatDisplayRoot.visible = true
      hatDisplayTargetY = hatDisplayAboveY
    } else {
      hatDisplayRoot.visible = false
      hatDisplayTargetY = hatDisplayInsideY
    }

    hatDisplayRoot.position.y += (hatDisplayTargetY - hatDisplayRoot.position.y) * 0.1

    // Question marks visible when crate is closed (READY, CLAIMED, or WINNER_PENDING_CLAIM)
    // Hidden during OPENING, SPINNING, WINNER_SELECTED to avoid bleed-through
    const shouldShowQMarks = currentState === STATES.READY || currentState === STATES.CLAIMED || currentState === STATES.WINNER_PENDING_CLAIM
    setQuestionMarksVisible(shouldShowQMarks)

    hatDisplay3D.lookAt(camera.position)
    hatDisplayGlow.lookAt(camera.position)
    if (hatDisplayOutline) {
      hatDisplayOutline.lookAt(camera.position)
    }

    hatDisplayScale += (hatDisplayScaleTarget - hatDisplayScale) * 0.25
    hatDisplay3D.scale.setScalar(hatDisplayScale)
    if (hatDisplayOutline) {
      hatDisplayOutline.scale.setScalar(hatDisplayScale * 1.06)
    }

    if (currentState === STATES.SPINNING) {
      hatDisplayRoot.rotation.y += delta * 4.0
      hatDisplayGlow.material.opacity = 0.15
    } else if (currentState === STATES.WINNER_SELECTED || currentState === STATES.WINNER_PENDING_CLAIM) {
      const pulse = 0.25 + Math.sin(time * 3.0) * 0.15
      hatDisplayGlow.material.opacity = pulse
    } else {
      hatDisplayGlow.material.opacity = 0.0
    }
  }

  if (currentState !== STATES.SPINNING && !spinAudio.paused) {
    spinAudio.loop = false
    spinAudio.pause()
    spinAudio.currentTime = 0
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
