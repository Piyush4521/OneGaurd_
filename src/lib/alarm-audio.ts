/**
 * Web Audio API synthesizer for the OneGuard LPG Emergency Siren & Haptic feedback.
 * Operates 100% offline with zero external audio assets.
 */

let audioCtx: AudioContext | null = null;
let sirenOscillator: OscillatorNode | null = null;
let sirenGain: GainNode | null = null;
let sirenLfo: OscillatorNode | null = null;
let isSirenPlaying = false;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

/**
 * Starts the dual-tone emergency warble siren.
 */
export function startEmergencySiren() {
  if (isSirenPlaying) return;

  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // Carrier oscillator (High pitch alert tone)
    sirenOscillator = ctx.createOscillator();
    sirenOscillator.type = "sawtooth";
    sirenOscillator.frequency.setValueAtTime(880, now); // A5

    // LFO to modulate frequency for warble effect (800Hz - 1200Hz)
    sirenLfo = ctx.createOscillator();
    sirenLfo.type = "sine";
    sirenLfo.frequency.setValueAtTime(3.5, now); // 3.5 Hz warble rate

    const lfoGain = ctx.createGain();
    lfoGain.gain.setValueAtTime(260, now);

    sirenLfo.connect(lfoGain);
    lfoGain.connect(sirenOscillator.frequency);

    // Main Gain
    sirenGain = ctx.createGain();
    sirenGain.gain.setValueAtTime(0.01, now);
    sirenGain.gain.exponentialRampToValueAtTime(0.4, now + 0.1);

    sirenOscillator.connect(sirenGain);
    sirenGain.connect(ctx.destination);

    sirenOscillator.start(now);
    sirenLfo.start(now);
    isSirenPlaying = true;

    // Trigger haptic vibration if supported on mobile
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate([300, 150, 300, 150, 600]);
    }
  } catch (err) {
    console.warn("Could not start emergency siren audio:", err);
  }
}

/**
 * Stops the emergency siren.
 */
export function stopEmergencySiren() {
  if (!isSirenPlaying) return;

  try {
    if (sirenGain && audioCtx) {
      const now = audioCtx.currentTime;
      sirenGain.gain.linearRampToValueAtTime(0.001, now + 0.1);
    }
    setTimeout(() => {
      sirenOscillator?.stop();
      sirenOscillator?.disconnect();
      sirenLfo?.stop();
      sirenLfo?.disconnect();
      sirenOscillator = null;
      sirenLfo = null;
      sirenGain = null;
      isSirenPlaying = false;
    }, 120);

    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(0);
    }
  } catch (err) {
    console.warn("Could not stop siren:", err);
    isSirenPlaying = false;
  }
}

/**
 * Play a short reassuring tactile chirp (e.g. settings saved, got it, preset selected)
 */
export function playChirp(type: "success" | "tap" | "warn" = "tap") {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    if (type === "success") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.12); // A5
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      osc.start(now);
      osc.stop(now + 0.15);
    } else if (type === "warn") {
      osc.type = "triangle";
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.setValueAtTime(370, now + 0.08);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      osc.start(now);
      osc.stop(now + 0.2);
    } else {
      osc.type = "sine";
      osc.frequency.setValueAtTime(700, now);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
      osc.start(now);
      osc.stop(now + 0.04);
    }

    osc.connect(gain);
    gain.connect(ctx.destination);

    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(type === "warn" ? [50, 50, 50] : [20]);
    }
  } catch {
    // AudioContext blocked by autoplay policy until user gesture
  }
}
