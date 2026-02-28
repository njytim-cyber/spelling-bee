/**
 * Sound effects for Bee Sim mode
 * Uses Web Audio API for lightweight, procedurally generated sounds
 */

let audioContext: AudioContext | null = null;
let soundEnabled = true;

function getAudioContext(): AudioContext {
    if (!audioContext) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioContext;
}

export function setSoundEnabled(enabled: boolean) {
    soundEnabled = enabled;
}

export function getSoundEnabled(): boolean {
    return soundEnabled;
}

/** Play a success ding - rising major chord (enhanced with harmonics) */
export function playSuccessSound() {
    if (!soundEnabled) return;
    try {
        const ctx = getAudioContext();
        const now = ctx.currentTime;

        // Three note chord: C, E, G with subtle harmonics for richness
        [261.63, 329.63, 392.0].forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.frequency.value = freq;
            osc.type = 'sine';

            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.18, now + 0.01 + i * 0.02);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35 + i * 0.02);

            osc.start(now + i * 0.02);
            osc.stop(now + 0.45);

            // Add subtle harmonic for shimmer
            if (i === 2) {
                const harmonic = ctx.createOscillator();
                const hGain = ctx.createGain();
                harmonic.type = 'sine';
                harmonic.frequency.value = freq * 2;
                hGain.gain.setValueAtTime(0.05, now + i * 0.02);
                hGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
                harmonic.connect(hGain);
                hGain.connect(ctx.destination);
                harmonic.start(now + i * 0.02);
                harmonic.stop(now + 0.35);
            }
        });
    } catch (e) {
        console.warn('Sound playback failed:', e);
    }
}

/** Play a gentle wrong answer buzz - descending notes */
export function playWrongSound() {
    if (!soundEnabled) return;
    try {
        const ctx = getAudioContext();
        const now = ctx.currentTime;

        // Descending tones
        [220, 196, 175].forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.frequency.value = freq;
            osc.type = 'triangle';

            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.08, now + 0.01 + i * 0.06);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2 + i * 0.06);

            osc.start(now + i * 0.06);
            osc.stop(now + 0.3);
        });
    } catch (e) {
        console.warn('Sound playback failed:', e);
    }
}

/** Play applause sound - white noise burst */
export function playApplauseSound() {
    if (!soundEnabled) return;
    try {
        const ctx = getAudioContext();
        const now = ctx.currentTime;

        const bufferSize = ctx.sampleRate * 0.8;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = ctx.createBufferSource();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        noise.buffer = buffer;
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        filter.type = 'bandpass';
        filter.frequency.value = 1000;

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.2, now + 0.1);
        gain.gain.linearRampToValueAtTime(0.1, now + 0.4);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.8);

        noise.start(now);
        noise.stop(now + 0.8);
    } catch (e) {
        console.warn('Sound playback failed:', e);
    }
}

/** Play victory fanfare - triumphant ascending notes */
export function playVictorySound() {
    if (!soundEnabled) return;
    try {
        const ctx = getAudioContext();
        const now = ctx.currentTime;

        // Triumphant melody: C, E, G, C (octave up)
        [261.63, 329.63, 392.0, 523.25].forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.frequency.value = freq;
            osc.type = 'triangle';

            const startTime = now + i * 0.15;
            gain.gain.setValueAtTime(0, startTime);
            gain.gain.linearRampToValueAtTime(0.25, startTime + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.4);

            osc.start(startTime);
            osc.stop(startTime + 0.5);
        });
    } catch (e) {
        console.warn('Sound playback failed:', e);
    }
}

/** Play streak milestone sound - sparkly rising tones (enhanced for excitement) */
export function playStreakSound(count: number) {
    if (!soundEnabled) return;
    try {
        const ctx = getAudioContext();
        const now = ctx.currentTime;

        // Higher notes for longer streaks with more excitement
        const baseFreq = 440 + count * 25;
        const notes = count >= 10 ? [0, 2, 4, 5, 7, 9, 12] : [0, 2, 4, 7];

        notes.forEach((semitone, i) => {
            const freq = baseFreq * Math.pow(2, semitone / 12);
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.frequency.value = freq;
            osc.type = 'sine';

            const startTime = now + i * 0.07;
            const volume = count >= 10 ? 0.15 : 0.12;
            gain.gain.setValueAtTime(0, startTime);
            gain.gain.linearRampToValueAtTime(volume, startTime + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.3);

            osc.start(startTime);
            osc.stop(startTime + 0.35);
        });

        // Add sparkle sound for big streaks
        if (count >= 10) {
            setTimeout(() => {
                [880, 1100, 1320].forEach((freq, i) => {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = 'sine';
                    osc.frequency.value = freq;
                    gain.gain.setValueAtTime(0.08, now + 0.5 + i * 0.05);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7 + i * 0.05);
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.start(now + 0.5 + i * 0.05);
                    osc.stop(now + 0.75 + i * 0.05);
                });
            }, 0);
        }
    } catch (e) {
        console.warn('Sound playback failed:', e);
    }
}
