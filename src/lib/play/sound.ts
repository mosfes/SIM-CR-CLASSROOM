const STORAGE_KEY = "simclassroom-muted";

let audioContext: AudioContext | null = null;
let muted = typeof window !== "undefined" && window.localStorage.getItem(STORAGE_KEY) === "1";
type MusicKind = "wizard" | "menu";

let musicTimer: ReturnType<typeof setTimeout> | null = null;
let activeMusicKind: MusicKind | null = null;
/**
 * Bumped whenever music is started or halted. Every scheduled tick carries the
 * generation it was born in and gives up the moment it stops matching, so a
 * loop whose timer handle got lost can never keep playing underneath a newer
 * one — which is what made two tracks sound at once.
 */
let musicGeneration = 0;

/* --------------------------------------------------------------------------
 * MIXER
 * Every voice goes through a bus instead of straight to the speakers, so the
 * music and the UI effects can never just sum up on top of each other:
 *
 *   music voices -> musicDuck -> musicBus \
 *                                          -> master -> limiter -> destination
 *   sfx voices   -> sfxBus                /
 *
 * `musicDuck` is pulled down for a moment whenever an effect fires (sidechain
 * ducking), and the limiter catches whatever peaks are left.
 * ------------------------------------------------------------------------ */

/** Overall headroom. */
const MASTER_LEVEL = 0.9;
/** Music sits under the effects. */
const MUSIC_LEVEL = 0.62;
const SFX_LEVEL = 1.0;
/** How far the music drops while an effect plays. */
const DUCK_LEVEL = 0.34;
const DUCK_ATTACK = 0.02;
const DUCK_RELEASE = 0.28;

type Bus = "music" | "sfx";

let masterBus: GainNode | null = null;
let musicBus: GainNode | null = null;
let musicDuck: GainNode | null = null;
let sfxBus: GainNode | null = null;

function buildGraph(ctx: AudioContext) {
  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -10;
  limiter.knee.value = 12;
  limiter.ratio.value = 8;
  limiter.attack.value = 0.003;
  limiter.release.value = 0.18;
  limiter.connect(ctx.destination);

  masterBus = ctx.createGain();
  masterBus.gain.value = MASTER_LEVEL;
  masterBus.connect(limiter);

  musicBus = ctx.createGain();
  musicBus.gain.value = MUSIC_LEVEL;
  musicBus.connect(masterBus);

  musicDuck = ctx.createGain();
  musicDuck.gain.value = 1;
  musicDuck.connect(musicBus);

  sfxBus = ctx.createGain();
  sfxBus.gain.value = SFX_LEVEL;
  sfxBus.connect(masterBus);
}

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioContext) {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    audioContext = new Ctor();
    buildGraph(audioContext);
  }
  if (audioContext.state === "suspended") {
    audioContext.resume().catch(() => {});
  }
  return audioContext;
}

function getBus(bus: Bus): GainNode | null {
  const ctx = getContext();
  if (!ctx) return null;
  return bus === "music" ? musicDuck : sfxBus;
}

let duckUntil = 0;

/**
 * Pull the music down so a UI effect stays readable on top of it, then let it
 * swell back. Overlapping effects extend the same dip instead of stacking.
 */
function duckMusic(holdSeconds = 0) {
  const ctx = getContext();
  if (!ctx || !musicDuck) return;

  const now = ctx.currentTime;
  const releaseAt = now + DUCK_ATTACK + holdSeconds;
  if (releaseAt + DUCK_RELEASE <= duckUntil) return;
  duckUntil = releaseAt + DUCK_RELEASE;

  const gain = musicDuck.gain;
  gain.cancelScheduledValues(now);
  gain.setValueAtTime(gain.value, now);
  gain.linearRampToValueAtTime(DUCK_LEVEL, now + DUCK_ATTACK);
  gain.setValueAtTime(DUCK_LEVEL, releaseAt);
  gain.linearRampToValueAtTime(1, releaseAt + DUCK_RELEASE);
}

function resetDuck() {
  const ctx = audioContext;
  if (!ctx || !musicDuck) return;
  musicDuck.gain.cancelScheduledValues(ctx.currentTime);
  musicDuck.gain.setValueAtTime(1, ctx.currentTime);
  duckUntil = 0;
}

const LISTENERS = new Set<() => void>();

export function isMuted() {
  return muted;
}

export function isAudioRunning(): boolean {
  return Boolean(audioContext && audioContext.state === "running");
}

export function subscribeToSoundChanges(listener: () => void) {
  LISTENERS.add(listener);
  return () => {
    LISTENERS.delete(listener);
  };
}

export function setMuted(value: boolean) {
  muted = value;
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, value ? "1" : "0");
  }
  if (value) {
    haltMusicChains();
  } else {
    resetDuck();
  }
  LISTENERS.forEach((l) => l());
}

export function toggleMuted() {
  const next = !muted;
  setMuted(next);
  if (!next) {
    if (activeMusicKind === "menu") {
      startMenuMusic();
    } else {
      startMusic();
    }
  }
  return next;
}

/** Play a single tone with custom envelope */
function playTone(
  freq: number,
  duration: number,
  opts: {
    type?: OscillatorType;
    gain?: number;
    delay?: number;
    filterFreq?: number;
    bus?: Bus;
  } = {}
) {
  if (muted) return;
  const ctx = getContext();
  if (!ctx) return;

  if (ctx.state !== "running") return;

  const { type = "triangle", gain = 0.14, delay = 0, filterFreq, bus = "sfx" } = opts;
  const output = getBus(bus);
  if (!output) return;
  const osc = ctx.createOscillator();
  const gainNode = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;

  const startTime = ctx.currentTime + delay;
  gainNode.gain.setValueAtTime(0.0001, startTime);
  gainNode.gain.linearRampToValueAtTime(gain, startTime + 0.008);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

  if (filterFreq) {
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = filterFreq;
    osc.connect(filter);
    filter.connect(gainNode);
  } else {
    osc.connect(gainNode);
  }

  gainNode.connect(output);
  osc.start(startTime);
  osc.stop(startTime + duration + 0.03);
}

/** Pitch sweep for punchy clicks and tactical transitions */
function playSweep(
  startFreq: number,
  endFreq: number,
  duration: number,
  opts: { type?: OscillatorType; gain?: number; delay?: number; bus?: Bus } = {}
) {
  if (muted) return;
  const ctx = getContext();
  if (!ctx) return;

  if (ctx.state !== "running") return;

  const { type = "sine", gain = 0.15, delay = 0, bus = "sfx" } = opts;
  const output = getBus(bus);
  if (!output) return;
  const osc = ctx.createOscillator();
  const gainNode = ctx.createGain();
  osc.type = type;

  const startTime = ctx.currentTime + delay;
  osc.frequency.setValueAtTime(startFreq, startTime);
  osc.frequency.exponentialRampToValueAtTime(Math.max(endFreq, 20), startTime + duration);

  gainNode.gain.setValueAtTime(0.0001, startTime);
  gainNode.gain.linearRampToValueAtTime(gain, startTime + 0.005);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

  osc.connect(gainNode);
  gainNode.connect(output);
  osc.start(startTime);
  osc.stop(startTime + duration + 0.02);
}

let lastHoverTime = 0;

/** Soft, clear, pleasant card hover tick */
export function playHover() {
  const now = Date.now();
  if (now - lastHoverTime < 50) return;
  lastHoverTime = now;
  duckMusic(0.02);
  playTone(1320, 0.025, { type: "sine", gain: 0.08 });
}

/** Clean, punchy tactile tap when clicking */
export function playClick() {
  duckMusic(0.04);
  playSweep(740, 240, 0.04, { type: "triangle", gain: 0.15 });
}

/** Pleasant, harmonious selection chord */
export function playSelect() {
  duckMusic(0.22);
  const notes = [293.66, 349.23, 440.0, 587.33];
  notes.forEach((freq, i) => {
    playTone(freq, 0.14, {
      type: "triangle",
      gain: 0.13,
      delay: i * 0.025,
    });
  });
  playSweep(146.83, 293.66, 0.14, { type: "sine", gain: 0.09 });
}

/** Tactical quick reverse blip */
export function playBack() {
  duckMusic(0.07);
  playSweep(440, 180, 0.07, { type: "triangle", gain: 0.11 });
}

/** Triumphant mission launch fanfare when entering the simulation */
export function playSuccess() {
  duckMusic(0.5);
  const chords = [
    { notes: [293.66, 440.0], delay: 0 },
    { notes: [349.23, 587.33], delay: 0.07 },
    { notes: [440.0, 698.46], delay: 0.14 },
    { notes: [587.33, 880.0], delay: 0.21 },
  ];

  chords.forEach(({ notes, delay }) => {
    notes.forEach((freq) => {
      playTone(freq, 0.26, { type: "triangle", gain: 0.16, delay });
    });
  });
  playSweep(220, 880, 0.30, { type: "sine", gain: 0.10, delay: 0.18 });
}

/** Multi-tone rolling spin sound */
export function playRoll() {
  duckMusic(0.2);
  const tones = [392.0, 440.0, 523.25, 587.33, 659.25, 783.99];
  tones.forEach((freq, i) => {
    playTone(freq, 0.05, { type: "triangle", gain: 0.12, delay: i * 0.03 });
  });
}

/* ========================================================================== */
/* MUSIC LOOP DRIVER                                                          */
/* ========================================================================== */

/** Invalidate every running loop, tracked or orphaned. Remembers the track. */
function haltMusicChains() {
  musicGeneration += 1;
  if (musicTimer !== null) {
    clearTimeout(musicTimer);
    musicTimer = null;
  }
}

/**
 * Drive one music loop. At most one can ever be audible: starting a track
 * invalidates whatever was playing, and a stale tick returns before it can
 * touch the shared timer handle (nulling it out used to strand a live loop
 * that nothing could stop afterwards).
 */
function runTrack(
  kind: MusicKind,
  stepMs: number,
  stepCount: number,
  voice: (step: number) => void
) {
  if (activeMusicKind === kind && musicTimer !== null) return;

  haltMusicChains();
  activeMusicKind = kind;
  if (muted) return;
  if (!getContext()) return;

  const generation = musicGeneration;
  let step = 0;

  const tick = () => {
    if (generation !== musicGeneration) return;
    if (muted || activeMusicKind !== kind) {
      musicTimer = null;
      return;
    }

    // A suspended context (autoplay is blocked until the first user gesture)
    // has a frozen clock, so every note we scheduled would carry the same
    // timestamp and fire together the moment it resumes — seconds of melody as
    // one chord. Idle here instead, and open the track from the top once audio
    // is genuinely running. getContext() retries the resume for us.
    const ctx = getContext();
    if (ctx && ctx.state === "running") {
      voice(step % stepCount);
      step += 1;
    }

    musicTimer = setTimeout(tick, stepMs);
  };

  tick();
}

/* ========================================================================== */
/* BACKGROUND MUSIC: TENSE, GROOVY & SUSPENSEFUL MEDICAL THEME (~100 BPM)     */
/* ========================================================================== */

// 32-step grid at ~100 BPM (150ms per step = steady, suspenseful adrenaline groove)
const STEP_TIME_MS = 150;

// Lead Melody (Suspenseful D minor with space to breathe)
const LEAD_TRACK: (number | null)[] = [
  // Bar 1: Steady, mysterious D minor intro
  293.66, null, 349.23, null, 440.0, 587.33, 523.25, null, // D4, -, F4, -, A4, D5, C5, -
  // Bar 2: Dramatic tension with C# leading tone
  466.16, null, 440.0, null, 554.37, null, 659.25, null,    // Bb4, -, A4, -, C#5, -, E5, -
  // Bar 3: Heroic peak
  698.46, null, 659.25, null, 587.33, 523.25, 440.0, null,  // F5, -, E5, -, D5, C5, A4, -
  // Bar 4: Suspense turnaround loop back
  392.0, null, 466.16, null, 440.0, 392.0, 554.37, null,    // G4, -, Bb4, -, A4, G4, C#5, -
];

// Synth Bass line (Warm, deep, syncopated pulse)
const BASS_TRACK: (number | null)[] = [
  // Bar 1: Root anchor
  73.42, null, null, null, 73.42, null, 87.31, null, // D2, -, -, -, D2, -, F2, -
  // Bar 2: Tension climb
  98.0, null, null, null, 110.0, null, 69.3, null,   // G2, -, -, -, A2, -, C#2, -
  // Bar 3: Dramatic shift
  73.42, null, null, null, 58.27, null, 65.41, null, // D2, -, -, -, Bb1, -, C2, -
  // Bar 4: Final turnaround
  98.0, null, null, null, 110.0, null, 69.3, null,   // G2, -, -, -, A2, -, C#2, -
];

export function startMusic() {
  runTrack("wizard", STEP_TIME_MS, LEAD_TRACK.length, (currentStep) => {
    // 1. Lead melody note (rich, warm presence)
    const leadNote = LEAD_TRACK[currentStep];
    if (leadNote) {
      playTone(leadNote, 0.16, {
        bus: "music",
        type: "triangle",
        gain: 0.095,
      });
    }

    // 2. Warm Synth Bass (solid foundation)
    const bassNote = BASS_TRACK[currentStep];
    if (bassNote) {
      playTone(bassNote, 0.22, {
        bus: "music",
        type: "sawtooth",
        gain: 0.110,
        filterFreq: 340,
      });
    }

    // 3. Heartbeat monitor pulse (100 BPM rhythm)
    if (currentStep % 4 === 0) {
      // Sub heartbeat "lub"
      playSweep(65, 30, 0.06, { bus: "music", type: "sine", gain: 0.070 });
      // Subtle monitor blip on alternating beats
      playTone(currentStep % 8 === 0 ? 1480 : 1100, 0.018, {
        bus: "music",
        type: "sine",
        gain: 0.025,
      });
    } else if (currentStep % 4 === 2) {
      // Sub heartbeat "dub"
      playSweep(50, 26, 0.045, { bus: "music", type: "sine", gain: 0.045 });
    }
  });
}

// ============================================================================
// BRIGHT & CHEERFUL GAME-START MENU MUSIC (C Major / F Major / Upbeat 115 BPM)
// ============================================================================
const MENU_STEP_TIME_MS = 140;

// Lead Melody (Playful, cheerful, inviting game-prep theme)
const MENU_LEAD_TRACK: (number | null)[] = [
  // Bar 1: C Major bouncy welcoming theme
  523.25, 659.25, 783.99, null, 659.25, 523.25, 587.33, 659.25, // C5, E5, G5, -, E5, C5, D5, E5
  // Bar 2: F Major happy uplifting lift
  698.46, null, 880.00, 1046.50, null, 880.00, 783.99, null,    // F5, -, A5, C6, -, A5, G5, -
  // Bar 3: Playful run down
  783.99, 659.25, 587.33, 523.25, 587.33, 659.25, 783.99, null, // G5, E5, D5, C5, D5, E5, G5, -
  // Bar 4: Cheerful cadence turnaround
  880.00, null, 783.99, 659.25, 523.25, null, null, null,        // A5, -, G5, E5, C5, -, -, -
];

// Synth Bass line (Bouncy staccato walking bass)
const MENU_BASS_TRACK: (number | null)[] = [
  // Bar 1: C Major bounce (C3 -> G3 -> C3 -> G3)
  130.81, null, 196.00, null, 130.81, null, 196.00, null,
  // Bar 2: F Major bounce (F3 -> C4 -> F3 -> C4)
  174.61, null, 261.63, null, 174.61, null, 261.63, null,
  // Bar 3: A minor / G bounce
  220.00, null, 164.81, null, 196.00, null, 246.94, null,
  // Bar 4: G7 -> C resolve
  196.00, null, 246.94, null, 130.81, null, 196.00, null,
];

export function startMenuMusic() {
  runTrack("menu", MENU_STEP_TIME_MS, MENU_LEAD_TRACK.length, (currentStep) => {
    // 1. Playful bright lead melody (marimba / bell tone)
    const leadNote = MENU_LEAD_TRACK[currentStep];
    if (leadNote) {
      playTone(leadNote, 0.13, {
        bus: "music",
        type: "triangle",
        gain: 0.105,
      });
    }

    // 2. Bouncy cheerful bass
    const bassNote = MENU_BASS_TRACK[currentStep];
    if (bassNote) {
      playTone(bassNote, 0.12, {
        bus: "music",
        type: "sine",
        gain: 0.115,
      });
    }

    // 3. Playful rhythm groove
    if (currentStep % 4 === 0) {
      // Soft gentle bouncy thump
      playSweep(125, 45, 0.05, { bus: "music", type: "sine", gain: 0.06 });
    } else if (currentStep % 2 === 1) {
      // Cheerful high shimmer tick
      playTone(2093, 0.016, { bus: "music", type: "triangle", gain: 0.025 });
    }
  });
}

/**
 * Stop the music. Pass the track you started and this becomes a no-op once
 * another screen has taken over — React does not guarantee that the old page
 * unmounts before the new one mounts, and an unscoped stop there would cut off
 * music the incoming screen had just started.
 */
export function stopMusic(kind?: MusicKind) {
  if (kind && activeMusicKind !== kind) return;
  haltMusicChains();
  activeMusicKind = null;
  resetDuck();
}
