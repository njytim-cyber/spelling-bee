/**
 * hooks/usePerformanceMonitor.ts
 *
 * Samples requestAnimationFrame timing to detect low-end devices.
 * Returns true when sustained FPS drops below threshold, signaling
 * that heavy animations should be disabled.
 *
 * Runs a brief probe (~30 frames) on mount, then stops to avoid
 * wasting CPU on the monitoring itself.
 */
import { useState, useEffect } from 'react';

const LOW_FPS_THRESHOLD = 24;
const SAMPLE_FRAMES = 30;

export function usePerformanceMonitor(): boolean {
    const [lowFps, setLowFps] = useState(false);

    useEffect(() => {
        let frameCount = 0;
        let lastTime = performance.now();
        let rafId: number;
        const frameTimes: number[] = [];

        function sample(now: number) {
            const delta = now - lastTime;
            lastTime = now;
            if (frameCount > 0) { // skip first frame (unreliable)
                frameTimes.push(delta);
            }
            frameCount++;

            if (frameCount <= SAMPLE_FRAMES) {
                rafId = requestAnimationFrame(sample);
            } else {
                // Calculate median FPS from samples
                frameTimes.sort((a, b) => a - b);
                const median = frameTimes[Math.floor(frameTimes.length / 2)];
                const medianFps = median > 0 ? 1000 / median : 60;
                if (medianFps < LOW_FPS_THRESHOLD) {
                    setLowFps(true);
                }
            }
        }

        rafId = requestAnimationFrame(sample);
        return () => cancelAnimationFrame(rafId);
    }, []);

    return lowFps;
}
