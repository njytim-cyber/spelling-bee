/**
 * Shared game juice hook — sounds, confetti, screen flash for all word games.
 * Import into any game: const juice = useGameJuice();
 */
import { useState, useCallback, useRef } from 'react';
import { playSuccessSound, playWrongSound, playStreakSound, playVictorySound } from '../../utils/soundEffects';

export type ScreenFlash = 'correct' | 'wrong' | null;

export interface GameJuice {
    /** Call on correct answer — sound + confetti + green flash */
    onCorrect: () => void;
    /** Call on wrong answer — sound + red flash + shake */
    onWrong: () => void;
    /** Call on streak milestone — streak sound + confetti at 5/10/15 */
    onStreak: (count: number) => void;
    /** Call on game/round complete — victory sound + epic confetti */
    onVictory: () => void;
    /** Pass to <Confetti trigger={...} /> */
    confettiTrigger: boolean;
    /** Pass to <Confetti intensity={...} /> */
    confettiIntensity: 'normal' | 'epic';
    /** Pass to <GameShell screenFlash={...} /> */
    screenFlash: ScreenFlash;
    /** Pass to <GameShell shake={...} /> */
    shake: boolean;
    /** Floating XP text state — render this in your game */
    xpFloat: { text: string; key: number } | null;
    /** Show floating XP text (e.g. "+10 XP") */
    showXpFloat: (text: string) => void;
}

export function useGameJuice(): GameJuice {
    const [confettiTrigger, setConfettiTrigger] = useState(false);
    const [confettiIntensity, setConfettiIntensity] = useState<'normal' | 'epic'>('normal');
    const [screenFlash, setScreenFlash] = useState<ScreenFlash>(null);
    const [shake, setShake] = useState(false);
    const [xpFloat, setXpFloat] = useState<{ text: string; key: number } | null>(null);
    const xpKey = useRef(0);

    const triggerConfetti = useCallback((intensity: 'normal' | 'epic') => {
        setConfettiIntensity(intensity);
        setConfettiTrigger(false);
        // Need a tick for Confetti to see false→true transition
        requestAnimationFrame(() => setConfettiTrigger(true));
    }, []);

    const flash = useCallback((type: ScreenFlash) => {
        setScreenFlash(type);
        setTimeout(() => setScreenFlash(null), 400);
    }, []);

    const onCorrect = useCallback(() => {
        playSuccessSound();
        triggerConfetti('normal');
        flash('correct');
    }, [triggerConfetti, flash]);

    const onWrong = useCallback(() => {
        playWrongSound();
        flash('wrong');
        setShake(true);
        setTimeout(() => setShake(false), 300);
    }, [flash]);

    const onStreak = useCallback((count: number) => {
        playStreakSound(count);
        if (count % 5 === 0) triggerConfetti('epic');
        else if (count % 3 === 0) triggerConfetti('normal');
    }, [triggerConfetti]);

    const onVictory = useCallback(() => {
        playVictorySound();
        triggerConfetti('epic');
        flash('correct');
    }, [triggerConfetti, flash]);

    const showXpFloat = useCallback((text: string) => {
        setXpFloat({ text, key: ++xpKey.current });
        setTimeout(() => setXpFloat(null), 800);
    }, []);

    return {
        onCorrect, onWrong, onStreak, onVictory,
        confettiTrigger, confettiIntensity,
        screenFlash, shake, xpFloat, showXpFloat,
    };
}
