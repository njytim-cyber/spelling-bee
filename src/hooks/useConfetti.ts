import { useEffect, useRef, useCallback } from 'react';

const COLORS = ['#fbbf24', '#f97316', '#4ade80', '#60a5fa', '#f472b6', '#a78bfa', '#fb923c'];
const PARTICLE_COUNT = 20;

interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    color: string;
    rotation: number;
    rotationSpeed: number;
    life: number;
}

export function useConfetti() {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const particles = useRef<Particle[]>([]);
    const animRef = useRef<number>(0);

    const tick = useCallback(function tickFn() {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        particles.current = particles.current.filter(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.3;
            p.life -= 0.02;
            if (p.life <= 0) return false;
            ctx.globalAlpha = p.life;
            ctx.fillStyle = p.color;
            ctx.fillRect(p.x, p.y, p.size, p.size * 0.6);
            return true;
        });
        ctx.globalAlpha = 1;

        if (particles.current.length > 0) {
            animRef.current = requestAnimationFrame(tickFn);
        } else {
            animRef.current = 0;
        }
    }, []);

    const fire = useCallback(() => {
        if (!canvasRef.current) return;
        const canvas = canvasRef.current;
        const dpr = window.devicePixelRatio || 1;
        const w = window.innerWidth;
        const h = window.innerHeight;
        canvas.width = w * dpr;
        canvas.height = h * dpr;
        canvas.style.width = `${w}px`;
        canvas.style.height = `${h}px`;
        const ctx = canvas.getContext('2d');
        if (ctx) ctx.scale(dpr, dpr);
        const cx = w / 2;
        const cy = h * 0.35;

        // Spawn particles
        for (let i = 0; i < PARTICLE_COUNT; i++) {
            const angle = (Math.random() * Math.PI * 2);
            const speed = 4 + Math.random() * 8;
            particles.current.push({
                x: cx,
                y: cy,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 4,
                size: 4 + Math.random() * 6,
                color: COLORS[Math.floor(Math.random() * COLORS.length)],
                rotation: Math.random() * 360,
                rotationSpeed: (Math.random() - 0.5) * 10,
                life: 1,
            });
        }

        // Start animation loop if not running
        if (!animRef.current) tick();
    }, [tick]);

    useEffect(() => {
        return () => {
            if (animRef.current) cancelAnimationFrame(animRef.current);
        };
    }, []);

    return { canvasRef, fire };
}
