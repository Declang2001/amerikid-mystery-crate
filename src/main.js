import './style.css'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import hats, { selectWeightedHat } from './hats.js'

// --- Eligibility State ---
const urlParams = new URLSearchParams(window.location.search)
const customerId = urlParams.get('customer_id') || ''
const demoOverride = urlParams.get('demo') === '1'

// Preview mode: no customer_id OR demo=1 override OR logged-in with no spins and no saved win.
// Preview users get 1 local non-binding spin. No API calls.
let isPreviewMode = !customerId || demoOverride

// Eligibility state (updated on load for purchased mode)
const eligibility = {
  loggedIn: false,
  spinsRemaining: 0,
  hatWon: null,
  checked: false,
  loading: false,
  error: null
}

// Track if current spin is a purchased (entitled) spin
let isPurchasedSpin = false
// Track preview spins used this session (local only, resets on refresh)
let previewSpinsUsed = 0
const PREVIEW_SPIN_LIMIT = 1

// Inventory-aware hat availability (fetched from /api/available-hats)
let availableHatIds = null // null = not yet fetched, Set = fetched
let availabilityError = false
// Prevent double-submit on finalize
let finalizeInProgress = false
let panelPresentationReady = false
// Winner identity for order/fulfillment (set after each spin)
let spinWinnerHat = null
let spinWinnerHatId = null
let spinWinnerHatName = null

const app = document.querySelector('#app')

app.innerHTML = `
  <div id="scene-root">
    <canvas id="scene-canvas"></canvas>
    <div id="bootLayer" class="boot-layer visible boot-phase-black-screen" aria-live="polite">
      <div class="boot-black-screen">
        <div class="boot-copy boot-copy-black">
          <p class="boot-kicker">Dark Aether Uplink</p>
          <h2 class="boot-title">Candy Facts Mystery Box</h2>
          <button id="bootStartBtn" class="boot-cta" type="button" disabled>Loading...</button>
        </div>
      </div>
      <div class="boot-video-stage" aria-hidden="true">
        <video
          id="bootIdleVideo"
          class="boot-video boot-video-idle"
          playsinline
          webkit-playsinline="true"
          preload="auto"
          disablepictureinpicture
          disableremoteplayback
          src="/media/portal/idle.mp4"
        ></video>
        <video
          id="bootWalkVideo"
          class="boot-video boot-video-walk"
          playsinline
          webkit-playsinline="true"
          preload="auto"
          disablepictureinpicture
          disableremoteplayback
          src="/media/portal/walk_in_animation.mp4"
        ></video>
        <div class="boot-idle-overlay">
          <div class="boot-idle-copy">
            <p class="boot-kicker">Dark Aether Feed</p>
            <h2 class="boot-title boot-title-idle">Candy Facts Mystery Box</h2>
            <button id="bootEnterPortalBtn" class="boot-cta" type="button" disabled>Enter Portal</button>
          </div>
        </div>
      </div>
    </div>
    <div class="overlay">
      <div class="panel">
        <div class="panel-header">
          <h1 style="color: white;">CANDY FACTS MYSTERY BOX</h1>
          <p id="panelSubtitle" class="subtitle">Spin the crate and land on a random hat</p>
          <p id="eligibilityStatus" class="eligibility-status"></p>
        </div>
        <div class="controls">
          <button id="spinBtn" type="button">Spin</button>
          <button id="claimBtn" type="button">Claim</button>
          <button id="closeBtn" type="button">Close</button>
          <button id="openBtn" type="button">Open</button>
        </div>
        <div class="result-card">
          <div class="result-media">
            <img id="resultImage" alt="Hat preview" />
          </div>
          <div class="result-details">
            <p id="resultLabel" class="label">Winner</p>
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
const panelSubtitle = document.querySelector('#panelSubtitle')
const resultImage = document.querySelector('#resultImage')
const resultLabel = document.querySelector('#resultLabel')
const resultName = document.querySelector('#resultName')
const resultStatus = document.querySelector('#resultStatus')
const bootLayer = document.querySelector('#bootLayer')
const bootStartBtn = document.querySelector('#bootStartBtn')
const bootEnterPortalBtn = document.querySelector('#bootEnterPortalBtn')
const bootIdleVideo = document.querySelector('#bootIdleVideo')
const bootWalkVideo = document.querySelector('#bootWalkVideo')
const animationCount = document.querySelector('#animationCount')
const animationList = document.querySelector('#animationList')
const errorBanner = document.querySelector('#errorBanner')
const panel = document.querySelector('.panel')

const animationInfo = document.querySelector('#animationInfo')
animationInfo.style.display = 'none'
errorBanner.style.display = 'none'

const eligibilityStatus = document.querySelector('#eligibilityStatus')
eligibilityStatus.style.cssText = `
  font-size: 12px;
  margin-top: 8px;
  padding: 4px 8px;
  border-radius: 4px;
  text-align: center;
`

// --- Eligibility API Helpers ---
async function fetchEligibility() {
  if (isPreviewMode) return
  eligibility.loading = true
  updateEligibilityUI()
  try {
    const res = await fetch(`/api/eligibility?customer_id=${encodeURIComponent(customerId)}`)
    if (!res.ok) throw new Error('API error')
    const data = await res.json()
    eligibility.loggedIn = data.logged_in
    eligibility.spinsRemaining = data.spins_remaining || 0
    eligibility.hatWon = data.hat_won || null
    eligibility.checked = true
    eligibility.error = null

    // Logged-in user with no purchased spins and no saved win: fall back to preview
    if (eligibility.spinsRemaining === 0 && !eligibility.hatWon) {
      isPreviewMode = true
    }
  } catch (err) {
    eligibility.error = 'Failed to check eligibility'
    console.error('Eligibility fetch failed:', err)
  } finally {
    eligibility.loading = false
    updateEligibilityUI()
  }
}

async function consumeSpinEntitlement() {
  try {
    const res = await fetch('/api/consume-spin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customer_id: customerId })
    })
    const data = await res.json()
    if (data.ok) {
      eligibility.spinsRemaining = data.spins_remaining || 0
      updateEligibilityUI()
      return true
    } else {
      console.error('Consume spin failed:', data.reason)
      return false
    }
  } catch (err) {
    console.error('Consume spin error:', err)
    return false
  }
}

async function finalizeSpinResult(hatId) {
  try {
    const res = await fetch('/api/finalize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customer_id: customerId, hat_id: hatId })
    })
    const data = await res.json()
    if (data.ok) {
      eligibility.hatWon = hatId
      updateEligibilityUI()
      return true
    } else {
      console.error('Finalize failed:', data.reason)
      return false
    }
  } catch (err) {
    console.error('Finalize error:', err)
    return false
  }
}

async function fetchAvailableHats() {
  try {
    const res = await fetch('/api/available-hats')
    if (!res.ok) throw new Error(`API error ${res.status}`)
    const data = await res.json()
    if (data.available === null || !Array.isArray(data.available)) {
      throw new Error('Invalid response')
    }
    availableHatIds = new Set(data.available)
    availabilityError = false
  } catch (err) {
    console.error('Available hats fetch failed:', err)
    availableHatIds = null
    availabilityError = true
  }
}

function normalizeShopOrigin(value) {
  if (!value) return null
  try {
    const parsed = value.includes('://') ? new URL(value) : new URL(`https://${value}`)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null
    }
    return parsed.origin
  } catch (_) {
    return null
  }
}

function resolvePreviewCheckoutOrigin() {
  const explicitOrigin = normalizeShopOrigin(
    urlParams.get('shop_origin') || urlParams.get('shopify_origin') || urlParams.get('shop') || ''
  )
  if (explicitOrigin) {
    return explicitOrigin
  }

  if (isEmbedded && document.referrer) {
    return normalizeShopOrigin(document.referrer)
  }

  if (window.location.hostname.endsWith('.myshopify.com')) {
    return window.location.origin
  }

  return null
}

function buildPreviewCheckoutUrl(hat) {
  if (!hat?.shopifyVariantId) {
    throw new Error('Missing Shopify variant mapping for the selected hat.')
  }

  const shopOrigin = resolvePreviewCheckoutOrigin()
  if (!shopOrigin) {
    throw new Error('Unable to determine the Shopify storefront for preview checkout.')
  }

  return new URL(`/cart/${hat.shopifyVariantId}:1`, shopOrigin).toString()
}

function redirectToCheckout(url) {
  if (isEmbedded) {
    window.top.location.href = url
    return
  }

  window.location.href = url
}

function updateEligibilityUI() {
  if (!eligibilityStatus) return

  let text = ''
  let background = ''
  let color = ''

  if (isPreviewMode) {
    text = 'Preview Mode'
    background = 'rgba(100, 100, 255, 0.2)'
    color = '#aaf'
  } else if (eligibility.loading) {
    text = 'Checking eligibility...'
    background = 'rgba(255, 255, 100, 0.2)'
    color = '#ffa'
  } else if (eligibility.error) {
    text = eligibility.error
    background = 'rgba(255, 100, 100, 0.2)'
    color = '#faa'
  } else if (!eligibility.loggedIn) {
    text = 'Account not found'
    background = 'rgba(255, 255, 100, 0.2)'
    color = '#ffa'
  } else if (eligibility.hatWon) {
    text = `Hat selected: ${eligibility.hatWon}`
    background = 'rgba(100, 255, 200, 0.2)'
    color = '#afa'
  } else if (eligibility.spinsRemaining > 0) {
    const s = eligibility.spinsRemaining === 1 ? 'spin' : 'spins'
    text = `${eligibility.spinsRemaining} ${s} remaining`
    background = 'rgba(100, 255, 100, 0.2)'
    color = '#afa'
  } else {
    text = 'No spins available'
    background = 'rgba(255, 100, 100, 0.2)'
    color = '#faa'
  }

  eligibilityStatus.textContent = text
  eligibilityStatus.style.background = background
  eligibilityStatus.style.color = color
  if (panelPresentationReady) {
    updatePanelPresentation()
  }
}

// Check eligibility on load (purchased mode only)
if (!isPreviewMode && customerId) {
  fetchEligibility()
} else {
  updateEligibilityUI()
}

// Fetch hat inventory availability on load (both preview and purchased)
fetchAvailableHats()

openBtn.style.display = 'none'
closeBtn.style.display = ''

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

// --- Audio System (iframe-safe) ---
// Debug mode: add ?debugAudio=1 to URL
const debugAudio = urlParams.get('debugAudio') === '1'
const isEmbedded = window.self !== window.top
const reducedMotionQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)') || null
let prefersReducedMotion = reducedMotionQuery?.matches ?? false

// Centralized audio state
const audioState = {
  unlocked: false,
  unlockTime: null,
  lastUnlockAttempt: 0,
  lastError: null,
  playAttempts: 0,
  playSuccesses: 0
}

function audioLog(...args) {
  if (!debugAudio) return
  const prefix = `[Audio ${isEmbedded ? 'IFRAME' : 'TOP'}]`
  console.log(prefix, ...args, { ...audioState })
}

// SFX Audio objects (reusable)
const openSfx = new Audio('/sfx/open.mp3')
const closeSfx = new Audio('/sfx/close.mp3')
const claimSfx = new Audio('/sfx/claim.mp3')

// ALL audio elements that need unlocking (includes spinAudio)
const allAudioElements = [spinAudio, openSfx, closeSfx, claimSfx]

// Debounce threshold to avoid spamming unlock attempts
const UNLOCK_DEBOUNCE_MS = 300

// Synchronous unlock - MUST stay in the user gesture call stack
// Returns true if unlock succeeded, false otherwise
function tryUnlockAudio() {
  if (audioState.unlocked) return true

  // Debounce rapid attempts
  const now = Date.now()
  if (now - audioState.lastUnlockAttempt < UNLOCK_DEBOUNCE_MS) {
    return false
  }
  audioState.lastUnlockAttempt = now

  audioLog('Attempting unlock...')

  let pendingCount = 0
  let resolvedCount = 0
  let rejectedCount = 0

  for (const audio of allAudioElements) {
    // Save original state
    const prevMuted = audio.muted
    const prevVol = audio.volume

    // Mute during unlock attempt (do NOT change volume)
    audio.muted = true

    try {
      const playPromise = audio.play()
      if (playPromise) {
        pendingCount++
        playPromise.then(() => {
          resolvedCount++
          // Check if this is the first successful resolution
          if (!audioState.unlocked && resolvedCount > 0) {
            audioState.unlocked = true
            audioState.unlockTime = Date.now()
            audioLog('Unlock confirmed via promise resolution')
            hideAudioOverlay()
          }
        }).catch((err) => {
          rejectedCount++
          audioState.lastError = err.message || String(err)
          audioLog('Unlock play() rejected:', err.message)
          // If all promises rejected, unlock stays false
          if (rejectedCount === pendingCount && resolvedCount === 0) {
            audioLog('All unlock attempts rejected')
          }
        })
      } else {
        // Older browsers: no promise means synchronous success
        resolvedCount++
      }
    } catch (e) {
      audioState.lastError = e.message || String(e)
      audioLog('Unlock play() threw:', e.message)
    }

    // Immediately pause and restore state (synchronous)
    audio.pause()
    audio.currentTime = 0
    audio.muted = prevMuted
    audio.volume = prevVol
  }

  // For older browsers that don't return promises
  if (pendingCount === 0 && resolvedCount > 0) {
    audioState.unlocked = true
    audioState.unlockTime = Date.now()
    audioLog('Unlock succeeded (sync)')
    hideAudioOverlay()
  }

  return audioState.unlocked
}

// Call this at the start of startSpin, claim, close handlers
// Ensures unlock happens in the same user gesture that triggers sound
function ensureUnlockedFromGesture() {
  if (!audioState.unlocked) {
    tryUnlockAudio()
  }
  return audioState.unlocked
}

// SFX helper: guards against playing before unlock
function playSfx(audio, volume = 1) {
  audioState.playAttempts++
  if (!audioState.unlocked) {
    if (debugAudio) audioLog('playSfx blocked - not unlocked')
    return
  }
  try {
    audio.currentTime = 0
  } catch (_) {
    // Guard: audio may not be ready yet
  }
  audio.volume = volume
  audio.play().then(() => {
    audioState.playSuccesses++
  }).catch((err) => {
    audioState.lastError = err.message || String(err)
    if (debugAudio) audioLog('playSfx error:', err.message)
  })
}

// --- Iframe "Tap to enable sound" overlay ---
let audioOverlay = null

function createAudioOverlay() {
  if (!isEmbedded) return // Only show in iframes
  if (audioState.unlocked) return

  audioOverlay = document.createElement('div')
  audioOverlay.id = 'audio-unlock-overlay'
  audioOverlay.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;gap:8px;">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
        <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
      </svg>
      <span>Tap to enable sound</span>
    </div>
  `
  audioOverlay.style.cssText = `
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.7);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: system-ui, sans-serif;
    font-size: 16px;
    z-index: 9999;
    cursor: pointer;
    backdrop-filter: blur(4px);
  `

  // Overlay tap handler - always dismisses after first tap.
  // In cross-origin iframes (e.g. Shopify), Safari may reject even muted
  // play() calls, so waiting for unlock success would block forever.
  // Passive unlock listeners on document (pointerdown/touchstart) will
  // continue retrying on subsequent user gestures, so audio will unlock
  // by the time it is actually needed (e.g. the boot "Click To Enter" tap).
  function handleOverlayTap(e) {
    e.stopPropagation()
    e.preventDefault()
    audioLog('Overlay tap')
    tryUnlockAudio()
    // Always dismiss: passive listeners handle retry if unlock failed
    hideAudioOverlay()
  }

  audioOverlay.addEventListener('pointerdown', handleOverlayTap, { capture: true })
  audioOverlay.addEventListener('touchstart', handleOverlayTap, { capture: true, passive: false })
  document.body.appendChild(audioOverlay)
  audioLog('Audio overlay shown')
}

function hideAudioOverlay() {
  if (audioOverlay && audioOverlay.parentNode) {
    audioOverlay.parentNode.removeChild(audioOverlay)
    audioOverlay = null
    audioLog('Audio overlay hidden')
  }
}

// --- Visibility and focus handlers ---
function handleVisibilityChange() {
  audioLog('Visibility changed:', document.visibilityState)
}

function handleWindowFocus() {
  audioLog('Window focus gained')
}

// --- Passive unlock listener (retryable) ---
function handlePassiveUnlock() {
  if (audioState.unlocked) return
  tryUnlockAudio()
}

// --- Initialize audio system ---
document.addEventListener('visibilitychange', handleVisibilityChange)
window.addEventListener('focus', handleWindowFocus)

// Passive unlock listeners - these fire on any interaction, retry until unlocked
document.addEventListener('pointerdown', handlePassiveUnlock, { capture: true })
document.addEventListener('touchstart', handlePassiveUnlock, { capture: true, passive: true })

// Show overlay for iframe embeds
createAudioOverlay()

audioLog('Audio system initialized', { isEmbedded })

// Helper: Promise-based delay
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

const BOOT_PHASES = {
  BLACK_SCREEN: 'BLACK_SCREEN',
  IDLE_VIDEO: 'IDLE_VIDEO',
  WALK_VIDEO: 'WALK_VIDEO',
  CRATE_VIEW: 'CRATE_VIEW'
}

// Seconds before walk clip end to begin the boot-layer fade-out.
// Computed dynamically from video duration in the loadedmetadata handler.
const WALK_FADE_LEAD_S = 2.0
let walkVideoFadeThreshold = null
let walkFadeStarted = false

let bootPhase = BOOT_PHASES.BLACK_SCREEN
let sceneReady = false
const bootMediaReady = {
  idle: false,
  walk: false
}

function updateBootPresentation() {
  if (!bootLayer || !bootStartBtn || !bootEnterPortalBtn) return

  bootLayer.classList.toggle('visible', bootPhase !== BOOT_PHASES.CRATE_VIEW)
  bootLayer.classList.toggle('boot-phase-black-screen', bootPhase === BOOT_PHASES.BLACK_SCREEN)
  bootLayer.classList.toggle('boot-phase-idle-video', bootPhase === BOOT_PHASES.IDLE_VIDEO)
  bootLayer.classList.toggle('boot-phase-walk-video', bootPhase === BOOT_PHASES.WALK_VIDEO)
  bootLayer.classList.toggle('scene-ready', sceneReady)

  const blackScreenReady = sceneReady && bootMediaReady.idle
  bootStartBtn.disabled = !(bootPhase === BOOT_PHASES.BLACK_SCREEN && blackScreenReady)
  bootEnterPortalBtn.disabled = !(bootPhase === BOOT_PHASES.IDLE_VIDEO && bootMediaReady.walk)

  if (bootPhase === BOOT_PHASES.BLACK_SCREEN) {
    if (!sceneReady || !bootMediaReady.idle) {
      bootStartBtn.textContent = 'Loading...'
    } else {
      bootStartBtn.textContent = 'Click To Enter'
    }
  }
}

function setBootPhase(nextPhase) {
  bootPhase = nextPhase
  updateBootPresentation()
}

function pauseBootVideo(video, reset = false) {
  if (!video) return
  video.pause()
  if (reset) {
    try {
      video.currentTime = 0
    } catch (_) {
      // Some browsers guard seeking until metadata is ready.
    }
  }
}

function finishBootVideoHandoff() {
  pauseBootVideo(bootWalkVideo, true)
  walkFadeStarted = false
  if (bootLayer) {
    bootLayer.classList.remove('boot-fading')
    bootLayer.style.opacity = ''
  }
  // Only reset intro state if the fade did not already start it
  if (introStartTime === 0) {
    introComplete = false
    playerInRange = false
    cameraTargetCurrent.copy(cameraTargetStart)
    camera.lookAt(cameraTargetCurrent)
  }
  setBootPhase(BOOT_PHASES.CRATE_VIEW)
}

function beginWalkFade() {
  if (walkFadeStarted) return
  walkFadeStarted = true
  // Start the crate intro underneath the fading video
  introStartTime = 0
  introComplete = false
  playerInRange = false
  cameraTargetCurrent.copy(cameraTargetStart)
  camera.lookAt(cameraTargetCurrent)
  // Trigger CSS opacity fade on the boot layer
  if (bootLayer) {
    bootLayer.classList.add('boot-fading')
  }
}

function handleBootMediaReady(key) {
  bootMediaReady[key] = true
  updateBootPresentation()
}

async function startIdleVideo() {
  if (!sceneReady || !bootMediaReady.idle || bootPhase !== BOOT_PHASES.BLACK_SCREEN || !bootIdleVideo) return

  ensureUnlockedFromGesture()
  playerInRange = false
  introComplete = false
  introStartTime = 0
  pauseBootVideo(bootWalkVideo, true)

  try {
    bootIdleVideo.loop = true
    bootIdleVideo.muted = false
    bootIdleVideo.volume = 1
    bootIdleVideo.currentTime = 0
    setBootPhase(BOOT_PHASES.IDLE_VIDEO)
    await bootIdleVideo.play()
  } catch (err) {
    pauseBootVideo(bootIdleVideo, true)
    setBootPhase(BOOT_PHASES.BLACK_SCREEN)
    bootStartBtn.textContent = 'Tap To Retry'
    audioState.lastError = err?.message || String(err)
  }
}

async function startWalkVideo() {
  if (bootPhase !== BOOT_PHASES.IDLE_VIDEO || !bootWalkVideo || !bootMediaReady.walk) return

  ensureUnlockedFromGesture()
  pauseBootVideo(bootIdleVideo, true)
  walkFadeStarted = false
  if (bootLayer) {
    bootLayer.classList.remove('boot-fading')
    bootLayer.style.opacity = ''
  }

  try {
    bootWalkVideo.loop = false
    bootWalkVideo.muted = false
    bootWalkVideo.volume = 1
    bootWalkVideo.currentTime = 0
    setBootPhase(BOOT_PHASES.WALK_VIDEO)
    await bootWalkVideo.play()
  } catch (err) {
    pauseBootVideo(bootWalkVideo, true)
    setBootPhase(BOOT_PHASES.IDLE_VIDEO)
    audioState.lastError = err?.message || String(err)
  }
}

function handleWalkVideoTimeUpdate() {
  if (bootPhase !== BOOT_PHASES.WALK_VIDEO || walkVideoFadeThreshold == null || !bootWalkVideo) return
  if (bootWalkVideo.currentTime >= walkVideoFadeThreshold) {
    beginWalkFade()
  }
}

function markSceneReady() {
  sceneReady = true
  updateBootPresentation()
}

if (reducedMotionQuery?.addEventListener) {
  reducedMotionQuery.addEventListener('change', (event) => {
    prefersReducedMotion = event.matches
    updateBootPresentation()
  })
}

;[bootIdleVideo, bootWalkVideo].forEach(video => {
  if (!video) return
  video.playsInline = true
  video.crossOrigin = 'anonymous'
  video.preload = 'auto'
})

bootIdleVideo?.addEventListener('loadeddata', () => {
  handleBootMediaReady('idle')
})

bootWalkVideo?.addEventListener('loadeddata', () => {
  handleBootMediaReady('walk')
  // Compute the fade threshold once duration is known
  if (bootWalkVideo.duration && isFinite(bootWalkVideo.duration)) {
    walkVideoFadeThreshold = Math.max(0, bootWalkVideo.duration - WALK_FADE_LEAD_S)
  }
})

// Also try loadedmetadata in case loadeddata fires before duration is set on some browsers
bootWalkVideo?.addEventListener('loadedmetadata', () => {
  if (bootWalkVideo.duration && isFinite(bootWalkVideo.duration) && walkVideoFadeThreshold == null) {
    walkVideoFadeThreshold = Math.max(0, bootWalkVideo.duration - WALK_FADE_LEAD_S)
  }
})

bootWalkVideo?.addEventListener('ended', () => {
  if (bootPhase === BOOT_PHASES.WALK_VIDEO) {
    // If the fade already started, let CSS transition finish visually,
    // but still complete the handoff so the boot layer is fully removed.
    finishBootVideoHandoff()
  }
})

bootWalkVideo?.addEventListener('timeupdate', handleWalkVideoTimeUpdate)

bootStartBtn?.addEventListener('click', (event) => {
  event.stopPropagation()
  startIdleVideo()
})

bootEnterPortalBtn?.addEventListener('click', (event) => {
  event.stopPropagation()
  startWalkVideo()
})

bootIdleVideo?.load()
bootWalkVideo?.load()

if (bootIdleVideo?.readyState >= 2) {
  handleBootMediaReady('idle')
}

if (bootWalkVideo?.readyState >= 2) {
  handleBootMediaReady('walk')
}

updateBootPresentation()

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
const SCENE_FOG_COLOR = '#05060d'
const SCENE_FOG_NEAR = 8
const SCENE_FOG_FAR = 24

const scene = new THREE.Scene()
scene.background = new THREE.Color(SCENE_FOG_COLOR)
scene.fog = new THREE.Fog(SCENE_FOG_COLOR, SCENE_FOG_NEAR, SCENE_FOG_FAR)

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
    // Keep the room texture readable while scene fog still shapes the playable space.
    const bgMat = new THREE.MeshBasicMaterial({ map: texture, side: THREE.BackSide, toneMapped: false, fog: false })
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

const ambient = new THREE.AmbientLight(0xb8c6e3, 0.38)
scene.add(ambient)

const keyLight = new THREE.DirectionalLight(0xffffff, 1.18)
keyLight.position.set(4.6, 6.6, 4.2)
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

const fillLight = new THREE.DirectionalLight(0x6f95ff, 0.72)
fillLight.position.set(-5.2, 3.1, -2.2)
scene.add(fillLight)

const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(15, 15),
  new THREE.ShadowMaterial({ opacity: 0.42 })
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
let winnerRevealStartTime = -1
const WINNER_REVEAL_DURATION_MS = 420
const WINNER_REVEAL_SCALE_BOOST = 0.18
const WINNER_REVEAL_GLOW_BOOST = 0.42
const WINNER_REVEAL_LIGHT_BOOST = 2.0

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
const MIN_FULL_ROTATIONS = 2                // tuned for 15-hat pool (~30 steps)
const EXTRA_FULL_ROTATIONS_MAX = 0          // no random extra rotations

// Crack leakage materials (driven by glow intensity)
let crateCrackMaterials = []

// Question mark glow layer
let questionMarkGlowMesh = null
let questionMarkGlowMat = null
const QUESTION_MARK_BASE_PULSE_MIN = 0.35
const QUESTION_MARK_BASE_PULSE_AMPLITUDE = 0.15
const QUESTION_MARK_BASE_PULSE_SPEED = 2.5
const QUESTION_MARK_MICRO_PULSE_AMPLITUDE = 0.05
const QUESTION_MARK_MICRO_PULSE_SPEED = 8.75
const QUESTION_MARK_LEAK_INTENSITY = 0.5
const QUESTION_MARK_GLOW_SCALE_AMPLITUDE = 0.05
const QUESTION_MARK_GLOW_BASE_SCALE_X = 1 / 1.35

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
  updatePanelPresentation()
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

function withFallbackNote(text) {
  return usingFallback ? `${text} (fallback crate)` : text
}

function updatePanelPresentation() {
  if (!panel || !panelSubtitle || !resultLabel || !resultStatus) return

  const isResultState = [
    STATES.WINNER_SELECTED,
    STATES.WINNER_PENDING_CLAIM,
    STATES.CLAIMING,
    STATES.CLAIMED,
    STATES.CLOSING
  ].includes(currentState)
  const canPurchasedSpin = !isPreviewMode && eligibility.spinsRemaining > 0 && !eligibility.hatWon
  const hasSecondaryAction = isResultState && canPurchasedSpin
  const hasWinner = Boolean(spinWinnerHat)
  const winnerName = spinWinnerHatName || spinWinnerHat?.name || resultName.textContent

  panel.classList.toggle('preview-result', isPreviewMode && isResultState && hasWinner)
  panel.classList.toggle('purchased-result', !isPreviewMode && isResultState && hasWinner)
  panel.classList.toggle('claimed-result', currentState === STATES.CLAIMED)
  panel.classList.toggle('has-secondary-action', hasSecondaryAction)

  let subtitleText = 'Spin the crate and land on a random hat'
  let labelText = 'Winner'
  let statusText = formatStatus(currentState)

  if (currentState === STATES.OPENING) {
    subtitleText = 'The crate is opening'
    labelText = 'Mystery Crate'
    statusText = withFallbackNote('Preparing your spin')
  } else if (currentState === STATES.SPINNING) {
    subtitleText = 'The crate is choosing your winner'
    labelText = 'In Motion'
    statusText = withFallbackNote('Scanning through the hat pool')
  } else if (hasWinner && isResultState) {
    if (isPreviewMode) {
      if (currentState === STATES.CLAIMING) {
        subtitleText = 'Opening checkout for this exact hat'
        labelText = 'Exact Hat Checkout'
        statusText = withFallbackNote(`Loading checkout for ${winnerName}`)
      } else {
        subtitleText = 'Proceed to checkout for this exact hat'
        labelText = 'Preview Result'
        statusText = withFallbackNote(`Proceed to Checkout adds ${winnerName}`)
      }
    } else if (currentState === STATES.CLAIMED) {
      subtitleText = 'Your result is locked in for fulfillment'
      labelText = 'Saved Result'
      statusText = withFallbackNote('Saved for fulfillment')
    } else if (currentState === STATES.CLAIMING) {
      subtitleText = 'Saving your winning hat'
      labelText = 'Saving Result'
      statusText = withFallbackNote('Locking in result for fulfillment')
    } else if (hasSecondaryAction) {
      subtitleText = 'Save this hat now, or spin again for one more shot'
      labelText = 'Current Pick'
      statusText = withFallbackNote('Save Result locks in this exact hat')
    } else {
      subtitleText = 'Save this hat to lock in your final result'
      labelText = 'Final Hat'
      statusText = withFallbackNote('Ready to save for fulfillment')
    }
  }

  panelSubtitle.textContent = subtitleText
  resultLabel.textContent = labelText
  resultStatus.textContent = statusText
}

function setState(state) {
  const previousState = currentState
  currentState = state
  
  if (panel) {
    const isResultState = [
      STATES.WINNER_SELECTED,
      STATES.WINNER_PENDING_CLAIM,
      STATES.CLAIMING,
      STATES.CLAIMED,
      STATES.CLOSING
    ].includes(state)
    panel.classList.toggle('visible', isResultState)
    panel.classList.toggle('winner-reveal', state === STATES.WINNER_SELECTED)
  }

  if (state === STATES.WINNER_SELECTED && previousState !== STATES.WINNER_SELECTED) {
    winnerRevealStartTime = performance.now()
    hatDisplayScale = Math.max(hatDisplayScale, 1.08)
    hatDisplayScaleTarget = 1.0
  } else if (state !== STATES.WINNER_SELECTED) {
    winnerRevealStartTime = -1
  }
  
  updateControls()
  updatePanelPresentation()
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

  const isResultView = [
    STATES.WINNER_SELECTED,
    STATES.WINNER_PENDING_CLAIM,
    STATES.CLAIMING,
    STATES.CLAIMED,
    STATES.CLOSING
  ].includes(currentState)

  // Hide internal utility buttons from the main result console
  closeBtn.style.display = 'none'
  openBtn.style.display = 'none'

  // --- Determine spin availability ---
  const canPreviewSpin = isPreviewMode && previewSpinsUsed < PREVIEW_SPIN_LIMIT
  const canPurchasedSpin = !isPreviewMode && eligibility.spinsRemaining > 0 && !eligibility.hatWon
  const canFinalizeState = currentState === STATES.WINNER_SELECTED || currentState === STATES.WINNER_PENDING_CLAIM

  // --- Spin Button ---
  if (isPreviewMode) {
    // Preview: never show Spin Again (only 1 preview spin). Hide entirely after use.
    spinBtn.style.display = 'none'
    spinBtn.textContent = 'Spin'
    spinBtn.disabled = isLocked || !canPreviewSpin
  } else {
    // Purchased: only show Spin Again in result states when another spin exists
    const showSpinAgain = isResultView && canPurchasedSpin
    spinBtn.style.display = showSpinAgain ? 'block' : 'none'
    spinBtn.textContent = 'Spin Again'
    spinBtn.disabled = isLocked || !canPurchasedSpin
  }

  // --- Finalize / Forward Action Button ---
  if (isPreviewMode) {
    // Preview: show "Proceed to Checkout" after result, hide after claimed
    claimBtn.style.display = (isResultView && currentState !== STATES.CLAIMED) ? 'block' : 'none'
    claimBtn.disabled = false
    claimBtn.textContent = 'Proceed to Checkout'
  } else {
    // Purchased: show "Save Result" in finalizable states
    claimBtn.style.display = (isResultView && currentState !== STATES.CLAIMED) ? 'block' : 'none'
    claimBtn.disabled = isLocked || !canFinalizeState
    claimBtn.textContent = 'Save Result'
  }
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
  playSfx(openSfx, 1)
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
  playSfx(closeSfx, 1)
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

/**
 * Smooth ease-out for raffle/prize-wheel feel
 * Starts fast, immediately begins decelerating, settles into final hat.
 * Single curve eliminates the derivative jump the old piecewise approach had.
 */
function spinEasing(t) {
  return 1 - Math.pow(1 - t, 1.7)
}

function getWinnerRevealImpulse(nowMs) {
  if (currentState !== STATES.WINNER_SELECTED || winnerRevealStartTime < 0) {
    return 0
  }

  const progress = Math.min(Math.max((nowMs - winnerRevealStartTime) / WINNER_REVEAL_DURATION_MS, 0), 1)
  if (progress >= 1) {
    return 0
  }

  const shaped = 1 - Math.pow(1 - progress, 1.8)
  return Math.sin(shaped * Math.PI)
}

async function startSpin() {
  // Ensure audio unlocked in same gesture that triggers spin
  ensureUnlockedFromGesture()

  // Block spinning during active transition states only
  // WINNER_PENDING_CLAIM is allowed so "Spin Again" works after auto-close
  if ([STATES.OPENING, STATES.SPINNING, STATES.CLAIMING, STATES.CLOSING].includes(currentState)) {
    return
  }

  // --- Inventory Availability Check (before any spin consumption) ---
  await fetchAvailableHats()
  if (availabilityError || availableHatIds === null) {
    alert('Unable to verify hat availability. Please refresh and try again.')
    return
  }
  if (availableHatIds.size === 0) {
    alert('All mystery hats are currently unavailable. Please check back later.')
    return
  }

  // --- Eligibility Check ---
  if (isPreviewMode) {
    // Preview path: local-only, no API calls
    if (previewSpinsUsed >= PREVIEW_SPIN_LIMIT) {
      return
    }
    previewSpinsUsed++
    isPurchasedSpin = false
  } else {
    // Purchased path: must have spins remaining
    if (eligibility.spinsRemaining <= 0) {
      return
    }
    // Consume one purchased spin via API (safe: availability already verified above)
    const consumed = await consumeSpinEntitlement()
    if (!consumed) {
      await fetchEligibility()
      return
    }
    isPurchasedSpin = true
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

  // Now run the open sequence: open SFX plays inside openCrate(), then pause
  setState(STATES.OPENING)
  await ensureAudioReady(openSfx)
  // Fallback to 800ms if audio failed to load or duration unavailable
  const openMs = isFinite(openSfx.duration) && openSfx.duration > 0
    ? Math.max(300, Math.min(6000, openSfx.duration * 1000))
    : 800
  await openCrate(openMs)
  await delay(POST_OPEN_PAUSE_MS)

  // Pre-select winner before spin starts (filtered by inventory availability)
  spinWinnerIndex = selectWeightedHat(availableHatIds)
  if (spinWinnerIndex < 0) {
    // All hats became unavailable between the check and selection
    alert('All mystery hats are currently unavailable. Please check back later.')
    return
  }
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
      spinAnimationId = null
    }
  }

  spinAnimationId = requestAnimationFrame(animateSpin)
}

panelPresentationReady = true
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
  // Ensure audio unlocked in same gesture
  ensureUnlockedFromGesture()

  if ([STATES.OPENING, STATES.SPINNING, STATES.CLAIMING, STATES.CLOSING].includes(currentState)) {
    return
  }
  cancelAutoClose()
  setState(STATES.CLOSING)
  closeCrate().then(() => {
    setState(STATES.READY)
    setQuestionMarksVisible(true)
  })
})

spinBtn.addEventListener('click', () => {
  startSpin()
})

claimBtn.addEventListener('click', async () => {
  // Ensure audio unlocked in same gesture
  ensureUnlockedFromGesture()

  // Allow finalize from both WINNER_SELECTED and WINNER_PENDING_CLAIM
  if (currentState !== STATES.WINNER_SELECTED && currentState !== STATES.WINNER_PENDING_CLAIM) return

  // --- Preview path: redirect to checkout ---
  if (isPreviewMode) {
    let previewCheckoutUrl = ''
    try {
      previewCheckoutUrl = buildPreviewCheckoutUrl(spinWinnerHat)
    } catch (err) {
      alert(err.message || 'Unable to start preview checkout.')
      return
    }

    cancelAutoClose()
    playSfx(claimSfx, 1)
    setState(STATES.CLAIMING)
    await closeCrate()
    setQuestionMarksVisible(true)
    redirectToCheckout(previewCheckoutUrl)
    return
  }

  // --- Purchased path: finalize and persist ---
  // Prevent double-submit
  if (finalizeInProgress) return
  finalizeInProgress = true

  // Must have a winner hat ID to finalize
  if (!spinWinnerHat || !spinWinnerHat.id) {
    alert('No hat selected. Please spin first.')
    finalizeInProgress = false
    return
  }

  // Call API to persist the winning hat
  const finalized = await finalizeSpinResult(spinWinnerHat.id)
  if (!finalized) {
    alert('Failed to save result. Please try again.')
    finalizeInProgress = false
    await fetchEligibility()
    return
  }

  // Server zeroes spins on finalize; sync local state
  eligibility.spinsRemaining = 0

  cancelAutoClose()
  playSfx(claimSfx, 1)
  setState(STATES.CLAIMING)
  // closeCrate will no-op if already closed (WINNER_PENDING_CLAIM case)
  closeCrate().then(() => {
    setState(STATES.CLAIMED)
    setQuestionMarksVisible(true)
    finalizeInProgress = false
    isPurchasedSpin = false
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
  hatDisplayAboveY = bbox.max.y + 0.65
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
  glowPlane.renderOrder = 1000
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
  outlinePlane.renderOrder = 1001
  outlinePlane.scale.setScalar(1.06)
  hatDisplayOutline = outlinePlane
  hatDisplayRoot.add(outlinePlane)

  const hatPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(1.2, 1.2),
    new THREE.MeshBasicMaterial({
      map: hatTextures[currentHatIndex],
      transparent: true,
      alphaTest: 0.35,
      toneMapped: false,
      depthWrite: false,
      depthTest: false
    })
  )
  hatPlane.name = 'hatDisplay'
  hatPlane.renderOrder = 1002
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
    markSceneReady()
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
    markSceneReady()
  }
)

// Procedural contact shadow texture with support-aware grounding
function createContactShadowTexture(size = 256) {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')

  const centerX = size / 2
  const centerY = size / 2
  const radius = size / 2

  const fillSoftEllipse = (x, y, rx, ry, rotation, stops) => {
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(rotation)
    ctx.scale(rx, ry)

    const gradient = ctx.createRadialGradient(0, 0, 0.08, 0, 0, 1)
    for (const [stop, color] of stops) {
      gradient.addColorStop(stop, color)
    }

    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.arc(0, 0, 1, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }

  // Broad underside mass, kept softer so the support pockets carry most of the weight.
  fillSoftEllipse(
    centerX - size * 0.012,
    centerY + size * 0.014,
    radius * 1.02,
    radius * 0.57,
    -0.035,
    [
      [0, 'rgba(0, 0, 0, 0.52)'],
      [0.32, 'rgba(0, 0, 0, 0.28)'],
      [0.72, 'rgba(0, 0, 0, 0.11)'],
      [1, 'rgba(0, 0, 0, 0)']
    ]
  )

  // Slight center cradle keeps the crate underside connected without reverting to a perfect oval.
  fillSoftEllipse(
    centerX,
    centerY + size * 0.008,
    radius * 0.68,
    radius * 0.26,
    0,
    [
      [0, 'rgba(0, 0, 0, 0.44)'],
      [0.46, 'rgba(0, 0, 0, 0.16)'],
      [1, 'rgba(0, 0, 0, 0)']
    ]
  )

  // Support pockets roughly align to the cinder block footprint so the shadow feels loaded.
  const supportPockets = [
    { x: 0.35, y: 0.325, rx: 0.17, ry: 0.13, rot: -0.1, alpha: 0.78 },
    { x: 0.65, y: 0.315, rx: 0.16, ry: 0.125, rot: 0.08, alpha: 0.74 },
    { x: 0.34, y: 0.685, rx: 0.165, ry: 0.13, rot: 0.1, alpha: 0.75 },
    { x: 0.66, y: 0.675, rx: 0.17, ry: 0.13, rot: -0.08, alpha: 0.79 }
  ]

  for (const pocket of supportPockets) {
    fillSoftEllipse(
      size * pocket.x,
      size * pocket.y,
      radius * pocket.rx,
      radius * pocket.ry,
      pocket.rot,
      [
        [0, `rgba(0, 0, 0, ${pocket.alpha})`],
        [0.28, `rgba(0, 0, 0, ${pocket.alpha * 0.58})`],
        [0.72, 'rgba(0, 0, 0, 0.09)'],
        [1, 'rgba(0, 0, 0, 0)']
      ]
    )
  }

  // Very subtle uneven feathering keeps the edge from reading as a stamped decal.
  const featherSmudges = [
    { x: 0.22, y: 0.49, rx: 0.16, ry: 0.1, rot: -0.25, alpha: 0.12 },
    { x: 0.51, y: 0.18, rx: 0.18, ry: 0.08, rot: 0.04, alpha: 0.11 },
    { x: 0.8, y: 0.54, rx: 0.15, ry: 0.09, rot: 0.22, alpha: 0.1 }
  ]

  for (const smudge of featherSmudges) {
    fillSoftEllipse(
      size * smudge.x,
      size * smudge.y,
      radius * smudge.rx,
      radius * smudge.ry,
      smudge.rot,
      [
        [0, `rgba(0, 0, 0, ${smudge.alpha})`],
        [0.55, `rgba(0, 0, 0, ${smudge.alpha * 0.45})`],
        [1, 'rgba(0, 0, 0, 0)']
      ]
    )
  }

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
  const stainBands = Array.from({ length: 5 }, () => ({
    y: Math.random() * height,
    width: 18 + Math.random() * 34,
    strength: 0.03 + Math.random() * 0.06
  }))
  const grimeClusters = Array.from({ length: 7 }, () => ({
    x: Math.random() * width,
    y: height * (0.42 + Math.random() * 0.5),
    radiusX: 36 + Math.random() * 72,
    radiusY: 18 + Math.random() * 56,
    strength: 0.025 + Math.random() * 0.05
  }))

  const computeWoodWear = (x, y, repeatedU, repeatedV) => {
    const localU = repeatedU - Math.floor(repeatedU)
    const localV = repeatedV - Math.floor(repeatedV)
    const edgeU = Math.min(localU, 1 - localU)
    const edgeV = Math.min(localV, 1 - localV)
    const lowerPlank = Math.pow(Math.max(0, localV - 0.28) / 0.72, 1.7) * 0.42
    const seamEdge = Math.pow(1 - Math.min(1, edgeU * 9.5), 2.1) * 0.34
    const seamCross = Math.pow(1 - Math.min(1, edgeV * 11.5), 2.0) * 0.16
    const cornerRub = Math.pow(1 - Math.min(1, Math.min(edgeU, edgeV) * 10.5), 2.4) * 0.22
    const latchDx = (localU - 0.5) / 0.16
    const latchDy = (localV - 0.56) / 0.2
    const latchWear = Math.exp(-(latchDx * latchDx + latchDy * latchDy)) * 0.18

    let grimeScatter = 0
    for (let i = 0; i < grimeClusters.length; i++) {
      const cluster = grimeClusters[i]
      const dx = (x - cluster.x) / cluster.radiusX
      const dy = (y - cluster.y) / cluster.radiusY
      grimeScatter += Math.exp(-(dx * dx + dy * dy)) * cluster.strength
    }

    const breakup = 0.76 + sampleNoise(x * 0.19, y * 0.17) * 0.48
    const grime = (lowerPlank + seamEdge + seamCross + latchWear + grimeScatter) * breakup

    return { lowerPlank, seamEdge, seamCross, cornerRub, latchWear, grime }
  }

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
      const repeatedU = (x / width) * repeatX
      const repeatedV = (y / height) * repeatY
      const boardEdgeX = Math.min(repeatedU - Math.floor(repeatedU), 1 - (repeatedU - Math.floor(repeatedU)))
      const boardEdgeY = Math.min(repeatedV - Math.floor(repeatedV), 1 - (repeatedV - Math.floor(repeatedV)))
      const boardEdgeShade = Math.pow(1 - Math.min(1, boardEdgeX * 7.5), 2) * 0.09
      const boardCrossShade = Math.pow(1 - Math.min(1, boardEdgeY * 8.5), 2) * 0.03
      const wear = computeWoodWear(x, y, repeatedU, repeatedV)

      let stainShift = 0
      for (let i = 0; i < stainBands.length; i++) {
        const band = stainBands[i]
        const dist = Math.abs(y - band.y)
        stainShift += Math.exp(-(dist * dist) / (2 * band.width * band.width)) * band.strength
      }

      let heightValue =
        0.52 +
        grainWide * 0.18 +
        grainMedium * 0.12 +
        grainFine * 0.06 +
        (noiseA - 0.5) * 0.1 -
        boardEdgeShade -
        boardCrossShade * 0.45 -
        stainShift * 0.22 -
        wear.seamEdge * 0.08 -
        wear.seamCross * 0.05 -
        wear.latchWear * 0.04 -
        wear.grime * 0.05

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
      const repeatedU = (x / width) * repeatX
      const repeatedV = (y / height) * repeatY
      const boardEdgeX = Math.min(repeatedU - Math.floor(repeatedU), 1 - (repeatedU - Math.floor(repeatedU)))
      const boardEdgeY = Math.min(repeatedV - Math.floor(repeatedV), 1 - (repeatedV - Math.floor(repeatedV)))
      const boardEdgeShade = Math.pow(1 - Math.min(1, boardEdgeX * 7.5), 2) * 0.09
      const boardCrossShade = Math.pow(1 - Math.min(1, boardEdgeY * 8.5), 2) * 0.03
      const wear = computeWoodWear(x, y, repeatedU, repeatedV)

      let stainShift = 0
      for (let i = 0; i < stainBands.length; i++) {
        const band = stainBands[i]
        const dist = Math.abs(y - band.y)
        stainShift += Math.exp(-(dist * dist) / (2 * band.width * band.width)) * band.strength
      }

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

      // Subtle darker board edges and stains keep repeated planks from reading too flat.
      r *= 1 - boardEdgeShade * 0.35 - boardCrossShade * 0.18
      g *= 1 - boardEdgeShade * 0.42 - boardCrossShade * 0.22
      b *= 1 - boardEdgeShade * 0.5 - boardCrossShade * 0.26
      r -= stainShift * 14
      g -= stainShift * 10
      b -= stainShift * 5

      const rubbedLift = wear.cornerRub * (6 + noise * 3)
      r += rubbedLift
      g += rubbedLift * 0.72
      b += rubbedLift * 0.28

      const grimeDarken = wear.grime + wear.seamEdge * 0.38 + wear.lowerPlank * 0.22
      r -= grimeDarken * 26
      g -= grimeDarken * 20
      b -= grimeDarken * 12

      const latchShadow = wear.latchWear * (8 + noise * 2)
      r -= latchShadow
      g -= latchShadow * 0.86
      b -= latchShadow * 0.6

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
      let roughness =
        0.58 +
        (1 - h) * 0.32 +
        (noise - 0.5) * 0.18 +
        boardEdgeShade * 0.18 +
        stainShift * 0.08 +
        wear.grime * 0.18 +
        wear.seamEdge * 0.08 +
        wear.latchWear * 0.06
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

  // Chip and rub back the stencil so it reads field-worn instead of freshly painted.
  ctx.save()
  ctx.globalCompositeOperation = 'destination-out'
  for (let i = 0; i < 26; i++) {
    const chipX = width * (0.18 + Math.random() * 0.64)
    const chipY = height * (0.18 + Math.random() * 0.66)
    const chipW = 6 + Math.random() * 18
    const chipH = 2 + Math.random() * 7
    ctx.translate(chipX, chipY)
    ctx.rotate((Math.random() - 0.5) * 1.3)
    ctx.fillStyle = `rgba(0, 0, 0, ${0.18 + Math.random() * 0.18})`
    ctx.fillRect(-chipW / 2, -chipH / 2, chipW, chipH)
    ctx.setTransform(1, 0, 0, 1, 0, 0)
  }
  for (let i = 0; i < 9; i++) {
    const rubX = width * (0.22 + Math.random() * 0.56)
    const rubY = height * (0.22 + Math.random() * 0.52)
    const rubRadius = 10 + Math.random() * 22
    const rubGradient = ctx.createRadialGradient(rubX, rubY, 0, rubX, rubY, rubRadius)
    rubGradient.addColorStop(0, `rgba(0, 0, 0, ${0.16 + Math.random() * 0.12})`)
    rubGradient.addColorStop(1, 'rgba(0, 0, 0, 0)')
    ctx.fillStyle = rubGradient
    ctx.beginPath()
    ctx.arc(rubX, rubY, rubRadius, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()

  ctx.save()
  ctx.globalCompositeOperation = 'source-atop'
  for (let i = 0; i < 8; i++) {
    const streakX = width * (0.18 + Math.random() * 0.64)
    const streakY = height * (0.16 + Math.random() * 0.68)
    const streakW = 18 + Math.random() * 42
    const streakH = 4 + Math.random() * 9
    ctx.translate(streakX, streakY)
    ctx.rotate((Math.random() - 0.5) * 0.7)
    ctx.fillStyle = `rgba(56, 39, 19, ${0.08 + Math.random() * 0.08})`
    ctx.fillRect(-streakW / 2, -streakH / 2, streakW, streakH)
    ctx.setTransform(1, 0, 0, 1, 0, 0)
  }
  ctx.restore()

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

function createFloorGrimeTexture(width = 512, height = 512) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')

  ctx.clearRect(0, 0, width, height)

  const drawSmudge = (x, y, rx, ry, angle, color) => {
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(angle)
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }

  for (let i = 0; i < 10; i++) {
    drawSmudge(
      width * (0.18 + Math.random() * 0.64),
      height * (0.2 + Math.random() * 0.6),
      55 + Math.random() * 120,
      22 + Math.random() * 52,
      (Math.random() - 0.5) * 1.6,
      `rgba(28, 24, 19, ${0.04 + Math.random() * 0.06})`
    )
  }

  for (let i = 0; i < 5; i++) {
    drawSmudge(
      width * (0.22 + Math.random() * 0.56),
      height * (0.26 + Math.random() * 0.5),
      38 + Math.random() * 72,
      14 + Math.random() * 28,
      (Math.random() - 0.5) * 1.8,
      `rgba(74, 39, 28, ${0.04 + Math.random() * 0.05})`
    )
  }

  for (let i = 0; i < 22; i++) {
    ctx.save()
    ctx.translate(width * Math.random(), height * Math.random())
    ctx.rotate((Math.random() - 0.5) * Math.PI)
    ctx.fillStyle = `rgba(176, 166, 146, ${0.03 + Math.random() * 0.05})`
    ctx.fillRect(-2 - Math.random() * 5, -0.6, 4 + Math.random() * 12, 1.2 + Math.random() * 1.8)
    ctx.restore()
  }

  for (let i = 0; i < 48; i++) {
    const px = Math.random() * width
    const py = Math.random() * height
    const radius = 1 + Math.random() * 2.4
    const gradient = ctx.createRadialGradient(px, py, 0, px, py, radius)
    gradient.addColorStop(0, `rgba(118, 109, 94, ${0.04 + Math.random() * 0.04})`)
    gradient.addColorStop(1, 'rgba(118, 109, 94, 0)')
    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.arc(px, py, radius, 0, Math.PI * 2)
    ctx.fill()
  }

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

  const cloneTextureVariant = (texture, offsetX, offsetY) => {
    const clone = texture.clone()
    clone.wrapS = texture.wrapS
    clone.wrapT = texture.wrapT
    clone.repeat.copy(texture.repeat)
    clone.offset.set(offsetX, offsetY)
    clone.colorSpace = texture.colorSpace
    clone.needsUpdate = true
    return clone
  }

  const createWoodMaterialVariant = ({
    color = 0xffffff,
    roughness = 0.82,
    metalness = 0.05,
    offsetX = 0,
    offsetY = 0,
    normalScale = 1,
    side
  } = {}) => new THREE.MeshStandardMaterial({
    color,
    map: cloneTextureVariant(woodTexture, offsetX, offsetY),
    roughnessMap: cloneTextureVariant(woodRoughnessMap, offsetX, offsetY),
    normalMap: cloneTextureVariant(woodNormalMap, offsetX, offsetY),
    roughness,
    metalness,
    normalScale: new THREE.Vector2(normalScale, normalScale),
    envMapIntensity: 0.32,
    ...(side ? { side } : {})
  })

  const woodMat = createWoodMaterialVariant({
    roughness: 0.78,
    offsetX: 0.02,
    offsetY: 0.06,
    normalScale: 1.15
  })
  const woodMatAlt = createWoodMaterialVariant({
    color: 0xf2ebdf,
    roughness: 0.84,
    offsetX: 0.31,
    offsetY: 0.18,
    normalScale: 1.05
  })
  const woodMatDry = createWoodMaterialVariant({
    color: 0xe0d6c7,
    roughness: 0.9,
    offsetX: 0.56,
    offsetY: 0.42,
    normalScale: 0.92
  })
  const woodDarkMat = createWoodMaterialVariant({
    color: 0x765334,
    roughness: 0.88,
    metalness: 0.03,
    offsetX: 0.21,
    offsetY: 0.54,
    normalScale: 1.0
  })
  const woodDarkMatAlt = createWoodMaterialVariant({
    color: 0x644324,
    roughness: 0.92,
    metalness: 0.03,
    offsetX: 0.71,
    offsetY: 0.22,
    normalScale: 0.94
  })
  const woodInnerMat = createWoodMaterialVariant({
    color: 0x5d3a22,
    roughness: 0.95,
    metalness: 0.02,
    offsetX: 0.83,
    offsetY: 0.66,
    normalScale: 0.86,
    side: THREE.DoubleSide
  })
  const metalMat = new THREE.MeshStandardMaterial({
    color: 0x43464d,
    roughness: 0.6,
    metalness: 0.76,
    envMapIntensity: 0.66
  })
  const ropeMat = new THREE.MeshStandardMaterial({
    color: 0xc3925a,
    roughness: 0.88,
    metalness: 0.02,
    envMapIntensity: 0.18
  })

  const baseThickness = 0.08
  const baseWidth = 2.6
  const baseHeight = 1.0
  const baseDepth = 1.4
  const wallHeight = baseHeight - baseThickness

  const floorPanel = new THREE.Mesh(
    new THREE.BoxGeometry(baseWidth, baseThickness, baseDepth),
    woodMatDry
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
    woodMatAlt
  )
  wallBack.position.set(0, baseThickness + wallHeight / 2, -baseDepth / 2 + baseThickness / 2)
  wallBack.castShadow = true
  wallBack.receiveShadow = true
  group.add(wallBack)

  const wallSideDepth = baseDepth - baseThickness * 2
  const wallLeft = new THREE.Mesh(
    new THREE.BoxGeometry(baseThickness, wallHeight, wallSideDepth),
    woodMatAlt
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
  plankOffsets.forEach((y, index) => {
    const plankMat = index % 2 === 0 ? woodDarkMat : woodDarkMatAlt
    const sideMat = index % 2 === 0 ? woodDarkMatAlt : woodDarkMat

    const front = new THREE.Mesh(plankFront, plankMat)
    front.position.set(0, y, 0.67)
    front.castShadow = true
    front.receiveShadow = true
    group.add(front)
    const back = new THREE.Mesh(plankFront, sideMat)
    back.position.set(0, y, -0.67)
    back.castShadow = true
    back.receiveShadow = true
    group.add(back)
    const left = new THREE.Mesh(plankSide, sideMat)
    left.position.set(-0.97, y, 0)
    left.castShadow = true
    left.receiveShadow = true
    group.add(left)
    const right = new THREE.Mesh(plankSide, plankMat)
    right.position.set(0.97, y, 0)
    right.castShadow = true
    right.receiveShadow = true
    group.add(right)
  })

  const lidPivot = new THREE.Group()
  lidPivot.position.set(0, 1.0, -0.7)

  // Build lid from individual planks (no gaps - single smooth surface)
  const lidPlankCount = 4
  const lidTotalWidth = 2.6
  const lidPlankGap = 0  // Removed gaps to eliminate vertical seams
  const lidPlankWidth = (lidTotalWidth - (lidPlankCount - 1) * lidPlankGap) / lidPlankCount
  const lidPlankHeight = 0.12
  const lidPlankDepth = 1.4
  const lidPlankMaterials = [woodMat, woodMatAlt, woodMatDry, woodMatAlt]

  for (let i = 0; i < lidPlankCount; i++) {
    const heightVariation = (Math.random() - 0.5) * 0.015
    const plankGeo = new THREE.BoxGeometry(lidPlankWidth, lidPlankHeight, lidPlankDepth)
    const plank = new THREE.Mesh(plankGeo, lidPlankMaterials[i])
    const xPos = -lidTotalWidth / 2 + lidPlankWidth / 2 + i * (lidPlankWidth + lidPlankGap)
    plank.position.set(xPos, 0.06 + heightVariation, 0.7)
    plank.castShadow = true
    plank.receiveShadow = true
    lidPivot.add(plank)
  }

  // Cross braces on underside of lid (visible when open)
  const braceGeo = new THREE.BoxGeometry(2.4, 0.04, 0.12)
  const brace1 = new THREE.Mesh(braceGeo, woodDarkMatAlt)
  brace1.position.set(0, -0.02, 0.4)
  lidPivot.add(brace1)
  const brace2 = new THREE.Mesh(braceGeo, woodDarkMat)
  brace2.position.set(0, -0.02, 1.0)
  lidPivot.add(brace2)

  // Better metal material for hardware
  const hardwareMat = new THREE.MeshStandardMaterial({
    color: 0x30333a,
    roughness: 0.68,
    metalness: 0.78,
    envMapIntensity: 0.58
  })
  const boltHeadGeo = new THREE.CylinderGeometry(0.018, 0.02, 0.012, 6)
  const handlePinGeo = new THREE.CylinderGeometry(0.018, 0.018, 0.05, 10)
  const addBolt = (parent, x, y, z, rotationX = 0, rotationY = 0, rotationZ = 0, material = hardwareMat) => {
    const bolt = new THREE.Mesh(boltHeadGeo, material)
    bolt.position.set(x, y, z)
    bolt.rotation.set(rotationX, rotationY, rotationZ)
    bolt.castShadow = true
    parent.add(bolt)
  }

  // Hinge plates on lid (back edge, attach to lidPivot so they move with lid)
  const hingePlateGeo = new THREE.BoxGeometry(0.22, 0.025, 0.12)
  const hingePlate1 = new THREE.Mesh(hingePlateGeo, hardwareMat)
  hingePlate1.position.set(-0.6, 0.125, 0.02)  // On lid surface, near back
  hingePlate1.castShadow = true
  lidPivot.add(hingePlate1)
  addBolt(lidPivot, -0.67, 0.14, 0.02)
  addBolt(lidPivot, -0.53, 0.14, 0.02)
  const hingePlate2 = new THREE.Mesh(hingePlateGeo, hardwareMat)
  hingePlate2.position.set(0.6, 0.125, 0.02)
  hingePlate2.castShadow = true
  lidPivot.add(hingePlate2)
  addBolt(lidPivot, 0.53, 0.14, 0.02)
  addBolt(lidPivot, 0.67, 0.14, 0.02)

  // Hinge plates on base (back edge)
  const baseHinge1 = new THREE.Mesh(hingePlateGeo, hardwareMat)
  baseHinge1.position.set(-0.6, 0.98, -0.68)
  baseHinge1.castShadow = true
  group.add(baseHinge1)
  addBolt(group, -0.67, 0.995, -0.68)
  addBolt(group, -0.53, 0.995, -0.68)
  const baseHinge2 = new THREE.Mesh(hingePlateGeo, hardwareMat)
  baseHinge2.position.set(0.6, 0.98, -0.68)
  baseHinge2.castShadow = true
  group.add(baseHinge2)
  addBolt(group, 0.53, 0.995, -0.68)
  addBolt(group, 0.67, 0.995, -0.68)

  // Hinge barrels (cylindrical pivot points)
  const barrelGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.08, 8)
  const barrel1 = new THREE.Mesh(barrelGeo, metalMat)
  barrel1.position.set(-0.6, 1.0, -0.69)
  barrel1.rotation.x = Math.PI / 2
  group.add(barrel1)
  const barrel2 = new THREE.Mesh(barrelGeo, metalMat)
  barrel2.position.set(0.6, 1.0, -0.69)
  barrel2.rotation.x = Math.PI / 2
  group.add(barrel2)

  // Front latch - hasp on lid
  const haspGeo = new THREE.BoxGeometry(0.12, 0.025, 0.18)
  const hasp = new THREE.Mesh(haspGeo, hardwareMat)
  hasp.position.set(0, 0.125, 1.35)  // Front of lid
  hasp.castShadow = true
  lidPivot.add(hasp)
  addBolt(lidPivot, -0.035, 0.14, 1.35)
  addBolt(lidPivot, 0.035, 0.14, 1.35)
  // Hasp loop
  const loopGeo = new THREE.TorusGeometry(0.035, 0.01, 6, 12, Math.PI)
  const haspLoop = new THREE.Mesh(loopGeo, metalMat)
  haspLoop.position.set(0, 0.11, 1.42)
  haspLoop.rotation.x = Math.PI / 2
  lidPivot.add(haspLoop)

  // Front latch - catch plate on base
  const catchGeo = new THREE.BoxGeometry(0.15, 0.08, 0.04)
  const catchPlate = new THREE.Mesh(catchGeo, hardwareMat)
  catchPlate.position.set(0, 0.92, 0.71)
  catchPlate.castShadow = true
  group.add(catchPlate)
  addBolt(group, -0.045, 0.92, 0.735, Math.PI / 2)
  addBolt(group, 0.045, 0.92, 0.735, Math.PI / 2)

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
  addBolt(group, -1.05, 0.35, 0.742, Math.PI / 2)
  addBolt(group, 1.05, 0.35, 0.742, Math.PI / 2)
  const strap2 = new THREE.Mesh(strapGeo, hardwareMat)
  strap2.position.set(0, 0.7, 0.71)
  strap2.castShadow = true
  group.add(strap2)
  addBolt(group, -1.05, 0.7, 0.742, Math.PI / 2)
  addBolt(group, 1.05, 0.7, 0.742, Math.PI / 2)

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
  const debugFonts = urlParams.get('debugFonts') === '1';

  // Font-load helper for question marks
  async function waitForQMarkFont() {
    if (!document.fonts || !document.fonts.load) return false;
    try {
      await document.fonts.load("420px 'Black Ops One'");
      await document.fonts.ready;
      return document.fonts.check("12px 'Black Ops One'");
    } catch (e) { return false; }
  }

  // 1) Generate canvas texture with two question marks (with glow)
  const qCanvas = document.createElement('canvas');
  qCanvas.width = 1024;
  qCanvas.height = 512;
  const qCtx = qCanvas.getContext('2d');

  // 6) Create glow layer canvas (moved up for shared draw function)
  const qGlowCanvas = document.createElement('canvas');
  qGlowCanvas.width = 1024;
  qGlowCanvas.height = 512;
  const qGlowCtx = qGlowCanvas.getContext('2d');

  // Reusable function to draw both question mark canvases
  function drawQuestionMarksToCanvas() {
    // --- Main question mark canvas ---
    qCtx.clearRect(0, 0, 1024, 512);
    qCtx.font = "420px 'Black Ops One', Impact, system-ui, sans-serif";
    qCtx.textAlign = 'center';
    qCtx.textBaseline = 'middle';

    // Helper to draw one question mark (buttery yellow, readable base)
    const drawQuestionMark = (x, y) => {
      qCtx.shadowColor = 'rgba(0, 0, 0, 0.6)';
      qCtx.shadowBlur = 10;
      qCtx.shadowOffsetX = 3;
      qCtx.shadowOffsetY = 3;
      qCtx.strokeStyle = '#1a1000';
      qCtx.lineWidth = 14;
      qCtx.strokeText('?', x, y);
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

    // --- Glow question mark canvas ---
    qGlowCtx.clearRect(0, 0, 1024, 512);
    qGlowCtx.font = "420px 'Black Ops One', Impact, system-ui, sans-serif";
    qGlowCtx.textAlign = 'center';
    qGlowCtx.textBaseline = 'middle';

    const drawGlowQuestionMark = (x, y) => {
      qGlowCtx.shadowColor = '#ffea7a';
      qGlowCtx.shadowBlur = 60;
      qGlowCtx.fillStyle = 'rgba(255, 234, 122, 0.6)';
      qGlowCtx.fillText('?', x, y);
      qGlowCtx.fillText('?', x, y);
    };

    drawGlowQuestionMark(256, 256);
    qGlowCtx.save();
    qGlowCtx.translate(768, 256);
    qGlowCtx.rotate(Math.PI);
    drawGlowQuestionMark(0, 0);
    qGlowCtx.restore();
  }

  // Draw immediately (fallback font if Black Ops One not yet loaded)
  if (debugFonts) console.log('[Fonts] Before load:', document.fonts?.check("12px 'Black Ops One'"));
  drawQuestionMarksToCanvas();

  const qTexture = new THREE.CanvasTexture(qCanvas);
  qTexture.colorSpace = THREE.SRGBColorSpace;

  const qGlowTexture = new THREE.CanvasTexture(qGlowCanvas);
  qGlowTexture.colorSpace = THREE.SRGBColorSpace;

  // Re-draw after font loads
  waitForQMarkFont().then((loaded) => {
    if (debugFonts) console.log('[Fonts] After load:', loaded);
    if (loaded) {
      drawQuestionMarksToCanvas();
      qTexture.needsUpdate = true;
      qGlowTexture.needsUpdate = true;
    }
  });

  // 2) Create decal material (MeshBasicMaterial, no glow until crate opens)
  const qDecalMat = new THREE.MeshBasicMaterial({
    map: qTexture,
    transparent: true,
    toneMapped: false,
    depthTest: true,
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
  lidPivot.add(qDecalPlane)
  lidQuestionMarks = qDecalPlane;

  // 6) Glow layer material (canvas already created above)
  questionMarkGlowMat = new THREE.MeshBasicMaterial({
    map: qGlowTexture,
    transparent: true,
    opacity: 0,
    toneMapped: false,
    blending: THREE.AdditiveBlending,
    depthTest: true,
    depthWrite: false,
    side: THREE.DoubleSide
  });

  questionMarkGlowMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(2.0, 1.0),
    questionMarkGlowMat
  );
  questionMarkGlowMesh.rotation.x = -Math.PI / 2;
  questionMarkGlowMesh.position.set(0, 0.14, 0.65);  // Just above base decal
  questionMarkGlowMesh.scale.set(QUESTION_MARK_GLOW_BASE_SCALE_X, 1, 1);
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

  const seamShadowMat = new THREE.MeshBasicMaterial({
    color: 0x140d07,
    transparent: true,
    opacity: 0.32,
    depthTest: true,
    depthWrite: false,
    side: THREE.DoubleSide
  })
  const lidSeamMat = new THREE.MeshBasicMaterial({
    color: 0x1b120b,
    transparent: true,
    opacity: 0.36,
    depthTest: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1
  })

  const seamShadowFront = new THREE.Mesh(
    new THREE.PlaneGeometry(2.42, 0.05),
    seamShadowMat
  )
  seamShadowFront.position.set(0, 0.975, 0.686)
  group.add(seamShadowFront)

  const seamShadowBack = new THREE.Mesh(
    new THREE.PlaneGeometry(2.42, 0.05),
    seamShadowMat
  )
  seamShadowBack.position.set(0, 0.975, -0.686)
  group.add(seamShadowBack)

  const seamShadowLeft = new THREE.Mesh(
    new THREE.PlaneGeometry(1.22, 0.05),
    seamShadowMat
  )
  seamShadowLeft.position.set(-1.286, 0.975, 0)
  seamShadowLeft.rotation.y = Math.PI / 2
  group.add(seamShadowLeft)

  const seamShadowRight = new THREE.Mesh(
    new THREE.PlaneGeometry(1.22, 0.05),
    seamShadowMat
  )
  seamShadowRight.position.set(1.286, 0.975, 0)
  seamShadowRight.rotation.y = Math.PI / 2
  group.add(seamShadowRight)

  for (let i = 1; i < lidPlankCount; i++) {
    const seamX = -lidTotalWidth / 2 + lidPlankWidth * i
    const lidSeam = new THREE.Mesh(
      new THREE.PlaneGeometry(0.018, 1.18),
      lidSeamMat
    )
    lidSeam.rotation.x = -Math.PI / 2
    lidSeam.position.set(seamX, 0.124, 0.7)
    lidPivot.add(lidSeam)
  }

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

  // Subtle horizontal cracks on lid top (dark wood lines, left-to-right)
  const lidCrackMat = new THREE.MeshBasicMaterial({
    color: 0x1a1008,  // Dark wood brown
    transparent: true,
    opacity: 0.5,
    depthTest: true,
    depthWrite: false,
    side: THREE.DoubleSide
  })
  const lidCrackPositions = [
    { z: 0.35, width: 1.4, xOffset: 0.1 },
    { z: 0.65, width: 1.0, xOffset: -0.2 },
    { z: 0.95, width: 0.8, xOffset: 0.25 },
    { z: 1.15, width: 0.6, xOffset: -0.1 },
  ]
  lidCrackPositions.forEach(({ z, width, xOffset }) => {
    const lidCrack = new THREE.Mesh(
      new THREE.PlaneGeometry(width, 0.012),  // Thin horizontal line
      lidCrackMat
    )
    lidCrack.rotation.x = -Math.PI / 2  // Lay flat on lid
    lidCrack.position.set(xOffset, 0.13, z)  // On lid top surface (local to lidPivot)
    lidPivot.add(lidCrack)  // Attached to lid so it moves when opening
  })

  const handleGeo = new THREE.TorusGeometry(0.14, 0.03, 10, 20, Math.PI)
  const leftHandle = new THREE.Mesh(handleGeo, ropeMat)
  leftHandle.rotation.z = Math.PI / 2
  leftHandle.position.set(-1.02, 0.5, 0)
  leftHandle.castShadow = true
  leftHandle.receiveShadow = true
  group.add(leftHandle)
  const leftHandlePinTop = new THREE.Mesh(handlePinGeo, metalMat)
  leftHandlePinTop.rotation.z = Math.PI / 2
  leftHandlePinTop.position.set(-1.02, 0.64, 0)
  leftHandlePinTop.castShadow = true
  group.add(leftHandlePinTop)
  const leftHandlePinBottom = new THREE.Mesh(handlePinGeo, metalMat)
  leftHandlePinBottom.rotation.z = Math.PI / 2
  leftHandlePinBottom.position.set(-1.02, 0.36, 0)
  leftHandlePinBottom.castShadow = true
  group.add(leftHandlePinBottom)
  const rightHandle = new THREE.Mesh(handleGeo, ropeMat)
  rightHandle.rotation.z = -Math.PI / 2
  rightHandle.position.set(1.02, 0.5, 0)
  rightHandle.castShadow = true
  rightHandle.receiveShadow = true
  group.add(rightHandle)
  const rightHandlePinTop = new THREE.Mesh(handlePinGeo, metalMat)
  rightHandlePinTop.rotation.z = Math.PI / 2
  rightHandlePinTop.position.set(1.02, 0.64, 0)
  rightHandlePinTop.castShadow = true
  group.add(rightHandlePinTop)
  const rightHandlePinBottom = new THREE.Mesh(handlePinGeo, metalMat)
  rightHandlePinBottom.rotation.z = Math.PI / 2
  rightHandlePinBottom.position.set(1.02, 0.36, 0)
  rightHandlePinBottom.castShadow = true
  group.add(rightHandlePinBottom)

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

  // Local floor grime and debris keeps the scene from reading like a clean stage.
  const createFloorGrimeDecal = (texture, width, depth, x, z, rotationZ = 0, opacity = 1) => {
    const grimeMat = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      opacity,
      toneMapped: false,
      depthTest: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1
    })
    const decal = new THREE.Mesh(
      new THREE.PlaneGeometry(width, depth),
      grimeMat
    )
    decal.rotation.x = -Math.PI / 2
    decal.rotation.z = rotationZ
    decal.position.set(x, -0.008, z)
    decal.renderOrder = 1
    return decal
  }

  const floorGrimeMain = createFloorGrimeDecal(
    createFloorGrimeTexture(512, 512),
    3.35,
    2.15,
    0.02,
    0.12,
    0.08,
    0.92
  )
  const floorGrimeFront = createFloorGrimeDecal(
    createFloorGrimeTexture(512, 512),
    2.1,
    1.15,
    0.26,
    0.8,
    -0.11,
    0.8
  )
  scene.add(floorGrimeMain)
  scene.add(floorGrimeFront)

  // Cinder blocks under crate
  const concreteTexture = createConcreteTexture(128, 128)
  const concreteMat = new THREE.MeshStandardMaterial({
    map: concreteTexture,
    roughness: 0.95,
    metalness: 0
  })

  // Standard cinder block dimensions (scaled down)
  const blockW = 0.5, blockH = 0.25, blockD = 0.3
  const blockSideThickness = 0.06
  const blockFaceThickness = 0.04
  const blockCapThickness = 0.045
  const blockWebThickness = 0.05
  const cavityWidth = (blockW - blockSideThickness * 2 - blockWebThickness) / 2
  const cavityHeight = blockH - blockCapThickness * 2
  const cavityDepth = blockD - blockFaceThickness * 2

  const sideWallGeo = new THREE.BoxGeometry(blockSideThickness, blockH, blockD)
  const centerWebGeo = new THREE.BoxGeometry(blockWebThickness, blockH, blockD)
  const faceRailGeo = new THREE.BoxGeometry(blockW - blockSideThickness * 2, blockCapThickness, blockFaceThickness)
  const cavityFloorGeo = new THREE.BoxGeometry(
    cavityWidth * 0.9,
    Math.max(0.012, blockCapThickness * 0.3),
    cavityDepth * 0.82
  )
  const cavityBackGeo = new THREE.BoxGeometry(
    cavityWidth * 0.9,
    cavityHeight * 0.82,
    Math.max(0.016, blockFaceThickness * 0.55)
  )
  const cavityShadowMat = new THREE.MeshBasicMaterial({
    color: 0x171717,
    transparent: true,
    opacity: 0.9
  })

  const createBlockPiece = (geometry, material, x, y, z, options = {}) => {
    const mesh = new THREE.Mesh(geometry, material)
    mesh.position.set(x, y, z)
    mesh.castShadow = options.castShadow ?? true
    mesh.receiveShadow = options.receiveShadow ?? true
    return mesh
  }

  // Create cinder block with holes
  const createCinderBlock = (x, z, rotY = 0) => {
    const blockGroup = new THREE.Group()

    // Outer shell walls with a real hollow-core read from the current camera angle.
    blockGroup.add(createBlockPiece(sideWallGeo, concreteMat, -blockW / 2 + blockSideThickness / 2, 0, 0))
    blockGroup.add(createBlockPiece(sideWallGeo, concreteMat, blockW / 2 - blockSideThickness / 2, 0, 0))
    blockGroup.add(createBlockPiece(centerWebGeo, concreteMat, 0, 0, 0))

    const frontRailZ = blockD / 2 - blockFaceThickness / 2
    const backRailZ = -blockD / 2 + blockFaceThickness / 2
    const topRailY = blockH / 2 - blockCapThickness / 2
    const bottomRailY = -blockH / 2 + blockCapThickness / 2

    blockGroup.add(createBlockPiece(faceRailGeo, concreteMat, 0, topRailY, frontRailZ))
    blockGroup.add(createBlockPiece(faceRailGeo, concreteMat, 0, bottomRailY, frontRailZ))
    blockGroup.add(createBlockPiece(faceRailGeo, concreteMat, 0, topRailY, backRailZ))
    blockGroup.add(createBlockPiece(faceRailGeo, concreteMat, 0, bottomRailY, backRailZ))

    // Dark cavity treatment keeps the openings reading deep without adding heavy geometry.
    const cavityCenterOffset = blockW / 2 - blockSideThickness - cavityWidth / 2
    const cavityFloorY = -blockH / 2 + blockCapThickness + cavityFloorGeo.parameters.height / 2
    const cavityBackZ = -blockD / 2 + blockFaceThickness + cavityBackGeo.parameters.depth / 2

    ;[-cavityCenterOffset, cavityCenterOffset].forEach((cavityX) => {
      blockGroup.add(
        createBlockPiece(cavityFloorGeo, cavityShadowMat, cavityX, cavityFloorY, 0, {
          castShadow: false,
          receiveShadow: false
        })
      )
      blockGroup.add(
        createBlockPiece(cavityBackGeo, cavityShadowMat, cavityX, 0, cavityBackZ, {
          castShadow: false,
          receiveShadow: false
        })
      )
    })

    blockGroup.position.set(x, blockH / 2, z)
    blockGroup.rotation.y = rotY
    return blockGroup
  }

  // Place 4 corner supports plus a denser front-visible support bed.
  const block1 = createCinderBlock(-0.7, -0.35, 0.05)
  const block2 = createCinderBlock(0.65, -0.38, -0.08)
  const block3 = createCinderBlock(-0.68, 0.32, 0.12)
  const block4 = createCinderBlock(0.72, 0.35, -0.03)
  const block5 = createCinderBlock(-1.02, 0.52, 0.08)
  const block6 = createCinderBlock(1.02, 0.54, -0.06)
  const block7 = createCinderBlock(-0.34, 0.46, 0.05)
  const block8 = createCinderBlock(0.36, 0.48, -0.03)

  // Add blocks to scene (not to group, so they don't scale with crate)
  scene.add(block1)
  scene.add(block2)
  scene.add(block3)
  scene.add(block4)
  scene.add(block5)
  scene.add(block6)
  scene.add(block7)
  scene.add(block8)

  // Lift crate to sit on blocks
  group.position.y = blockH

  // Contact shadow (subtle radial gradient under crate)
  const shadowTexture = createContactShadowTexture(256)
  const shadowMat = new THREE.MeshBasicMaterial({
    map: shadowTexture,
    transparent: true,
    opacity: 0.31,
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
  // group.position.y was already set to blockH above
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
  const winnerRevealImpulse = getWinnerRevealImpulse(performance.now())

  // Allow the crate intro to begin during the walk-video fade so the scene
  // is already animating underneath the fading boot layer.
  const crateIntroActive = bootPhase === BOOT_PHASES.CRATE_VIEW || walkFadeStarted
  if (!crateIntroActive) {
    cameraTargetCurrent.copy(cameraTargetStart)
    camera.lookAt(cameraTargetCurrent)
  } else if (!introComplete) {
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
    if (bootPhase === BOOT_PHASES.CRATE_VIEW && currentState === STATES.READY && playerInRange) {
      const bbox = new THREE.Box3().setFromObject(crateRoot)
      const center = new THREE.Vector3()
      bbox.getCenter(center)
      const height = bbox.max.y - bbox.min.y
      const anchorY = bbox.min.y + height * 0.38  // Lowered to position near latch
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
    const boostedCrateGlowIntensity = crateGlowIntensity + winnerRevealImpulse * WINNER_REVEAL_LIGHT_BOOST
    crateInternalLight.intensity = boostedCrateGlowIntensity

    // Drive crack material opacity with flicker
    const leak = Math.max(0, Math.min(1, boostedCrateGlowIntensity / CRATE_GLOW_MAX))
    const flicker = 0.85 + 0.15 * (Math.sin(time * 13.0) * 0.5 + 0.5)
    const crackOpacity = (0.05 + 0.35 * leak) * flicker

    for (const mat of crateCrackMaterials) {
      mat.opacity = crackOpacity
    }

    // Drive question mark glow opacity (continuous subtle pulse + state-driven boost)
    if (questionMarkGlowMat) {
      const qmarkPulse = QUESTION_MARK_BASE_PULSE_MIN
        + QUESTION_MARK_BASE_PULSE_AMPLITUDE * Math.sin(time * QUESTION_MARK_BASE_PULSE_SPEED)
      const qmarkMicroPulse = QUESTION_MARK_MICRO_PULSE_AMPLITUDE
        * (0.5 + 0.5 * Math.sin(time * QUESTION_MARK_MICRO_PULSE_SPEED + Math.sin(time * 1.35) * 0.65))
      const questionMarkLeak = Math.max(0, Math.min(1, crateGlowIntensity / CRATE_GLOW_MAX))
      const questionMarkEnergy = qmarkPulse + qmarkMicroPulse + questionMarkLeak * QUESTION_MARK_LEAK_INTENSITY * flicker
      questionMarkGlowMat.opacity = Math.min(0.98, questionMarkEnergy)

      if (questionMarkGlowMesh) {
        const questionMarkGlowScale = 1 + questionMarkEnergy * QUESTION_MARK_GLOW_SCALE_AMPLITUDE
        questionMarkGlowMesh.scale.set(
          QUESTION_MARK_GLOW_BASE_SCALE_X * questionMarkGlowScale,
          questionMarkGlowScale,
          1
        )
      }
    }
  }

  if (hatDisplayRoot && hatDisplay3D && hatDisplayGlow) {
    const time = clock.getElapsedTime()

    // Hats visible during SPINNING, WINNER_SELECTED, WINNER_PENDING_CLAIM, CLOSING, and CLAIMING
    const isHatVisibleState = [
      STATES.SPINNING,
      STATES.WINNER_SELECTED,
      STATES.WINNER_PENDING_CLAIM,
      STATES.CLOSING,
      STATES.CLAIMING
    ].includes(currentState)

    if (isHatVisibleState) {
      hatDisplayRoot.visible = true
      hatDisplayTargetY = hatDisplayAboveY
    } else {
      hatDisplayRoot.visible = false
      hatDisplayTargetY = hatDisplayInsideY
    }

    hatDisplayRoot.position.y += (hatDisplayTargetY - hatDisplayRoot.position.y) * 0.1

    // Question marks always visible on the lid; depthTest: true prevents bleed-through
    setQuestionMarksVisible(true)

    hatDisplay3D.lookAt(camera.position)
    hatDisplayGlow.lookAt(camera.position)
    if (hatDisplayOutline) {
      hatDisplayOutline.lookAt(camera.position)
    }

    hatDisplayScale += (hatDisplayScaleTarget - hatDisplayScale) * 0.25
    const winnerRevealScaleBoost = currentState === STATES.WINNER_SELECTED
      ? winnerRevealImpulse * WINNER_REVEAL_SCALE_BOOST
      : 0
    const renderedHatScale = hatDisplayScale + winnerRevealScaleBoost
    hatDisplay3D.scale.setScalar(renderedHatScale)
    if (hatDisplayOutline) {
      hatDisplayOutline.scale.setScalar(renderedHatScale * 1.06)
    }
    if (currentState === STATES.WINNER_SELECTED || currentState === STATES.WINNER_PENDING_CLAIM) {
      hatDisplayGlow.scale.setScalar(renderedHatScale * (1.18 + winnerRevealImpulse * 0.08))
    } else {
      hatDisplayGlow.scale.setScalar(1.18)
    }

    if (currentState === STATES.SPINNING) {
      hatDisplayRoot.rotation.y += delta * 4.0
      hatDisplayGlow.material.opacity = 0.15
    } else if (currentState === STATES.WINNER_SELECTED || currentState === STATES.WINNER_PENDING_CLAIM) {
      const pulse = 0.25 + Math.sin(time * 3.0) * 0.15
      const winnerRevealGlowBoost = currentState === STATES.WINNER_SELECTED
        ? winnerRevealImpulse * WINNER_REVEAL_GLOW_BOOST
        : 0
      hatDisplayGlow.material.opacity = Math.min(0.9, pulse + winnerRevealGlowBoost)
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
