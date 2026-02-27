/**
 * utils/beeSounds.ts
 *
 * Synthesized sound effects for the spelling bee simulation.
 * Uses Web Audio API to generate sounds programmatically — no external files needed.
 * All sounds are short, pleasant, and designed to match real bee atmosphere.
 */

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
    if (ctx && ctx.state !== 'closed') return ctx;
    try {
        ctx = new AudioContext();
        return ctx;
    } catch {
        return null;
    }
}

/** Resume AudioContext after user gesture (required by browsers) */
function ensureResumed(ac: AudioContext): Promise<void> {
    if (ac.state === 'suspended') return ac.resume();
    return Promise.resolve();
}

// ── Individual sound effects ─────────────────────────────────────────────────

/** Bright ding/bell — correct answer (like the Scripps bee bell) */
export async function playDing(): Promise<void> {
    const ac = getCtx();
    if (!ac) return;
    await ensureResumed(ac);
    const t = ac.currentTime;

    // Two-tone bell: fundamental + octave harmonic
    const osc1 = ac.createOscillator();
    const osc2 = ac.createOscillator();
    const gain = ac.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(1200, t);
    osc1.frequency.exponentialRampToValueAtTime(800, t + 0.3);

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1800, t);
    osc2.frequency.exponentialRampToValueAtTime(1200, t + 0.2);

    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ac.destination);

    osc1.start(t);
    osc2.start(t);
    osc1.stop(t + 0.5);
    osc2.stop(t + 0.5);
}

/** Buzzer — incorrect answer (short, low, not harsh) */
export async function playBuzzer(): Promise<void> {
    const ac = getCtx();
    if (!ac) return;
    await ensureResumed(ac);
    const t = ac.currentTime;

    const osc = ac.createOscillator();
    const gain = ac.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.linearRampToValueAtTime(120, t + 0.3);

    gain.gain.setValueAtTime(0.1, t);
    gain.gain.linearRampToValueAtTime(0.1, t + 0.2);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

    osc.connect(gain);
    gain.connect(ac.destination);

    osc.start(t);
    osc.stop(t + 0.35);
}

/** Audience gasp — short breathy white noise burst */
export async function playGasp(): Promise<void> {
    const ac = getCtx();
    if (!ac) return;
    await ensureResumed(ac);
    const t = ac.currentTime;

    const duration = 0.4;
    const bufferSize = Math.ceil(ac.sampleRate * duration);
    const buffer = ac.createBuffer(1, bufferSize, ac.sampleRate);
    const data = buffer.getChannelData(0);

    // Filtered white noise with a quick rise and slow fall
    for (let i = 0; i < bufferSize; i++) {
        const env = Math.exp(-3 * (i / bufferSize));
        data[i] = (Math.random() * 2 - 1) * env;
    }

    const source = ac.createBufferSource();
    source.buffer = buffer;

    // Band-pass filter to make it sound breathy
    const filter = ac.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2000, t);
    filter.Q.setValueAtTime(0.8, t);

    const gain = ac.createGain();
    gain.gain.setValueAtTime(0.06, t);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(ac.destination);

    source.start(t);
    source.stop(t + duration);
}

/** Audience applause — layered noise bursts simulating clapping */
export async function playApplause(): Promise<void> {
    const ac = getCtx();
    if (!ac) return;
    await ensureResumed(ac);
    const t = ac.currentTime;

    const duration = 1.2;
    const bufferSize = Math.ceil(ac.sampleRate * duration);
    const buffer = ac.createBuffer(1, bufferSize, ac.sampleRate);
    const data = buffer.getChannelData(0);

    // Rhythmic clapping pattern: short bursts of noise
    for (let i = 0; i < bufferSize; i++) {
        const time = i / ac.sampleRate;
        // Modulate with a clap-like pattern (rapid bursts)
        const clapRate = 8; // claps per second
        const clapPhase = (time * clapRate) % 1;
        const clapEnv = clapPhase < 0.3 ? 1 : 0.1;
        // Overall fade-in then fade-out envelope
        const overallEnv = Math.min(1, time * 5) * Math.exp(-1.5 * Math.max(0, time - 0.5));
        data[i] = (Math.random() * 2 - 1) * clapEnv * overallEnv;
    }

    const source = ac.createBufferSource();
    source.buffer = buffer;

    const filter = ac.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(800, t);

    const gain = ac.createGain();
    gain.gain.setValueAtTime(0.08, t);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(ac.destination);

    source.start(t);
    source.stop(t + duration);
}
