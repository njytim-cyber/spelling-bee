/**
 * components/Button.tsx
 *
 * Shared button component with variant/size system.
 * Replaces duplicated Tailwind button styles across the app.
 */
import { forwardRef } from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';

type Variant = 'gold' | 'goldSolid' | 'secondary' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'ref'> {
    variant?: Variant;
    size?: Size;
}

const VARIANT_CLASSES: Record<Variant, string> = {
    gold: 'rounded-xl border-2 border-[var(--color-gold)]/40 bg-[var(--color-gold)]/10 ui text-[var(--color-gold)] hover:bg-[var(--color-gold)]/20 active:bg-[var(--color-gold)]/30 transition-colors disabled:opacity-40',
    goldSolid: 'rounded-xl ui font-medium text-white bg-[var(--color-gold)] hover:bg-[var(--color-gold)]/90 disabled:opacity-40 transition-colors',
    secondary: 'rounded-xl ui font-medium text-[rgb(var(--color-fg))]/60 bg-[rgb(var(--color-fg))]/10 hover:bg-[rgb(var(--color-fg))]/15 transition-colors disabled:opacity-40',
    ghost: 'ui text-[rgb(var(--color-fg))]/40 hover:text-[rgb(var(--color-fg))]/60 transition-colors disabled:opacity-40',
};

const SIZE_CLASSES: Record<Size, string> = {
    sm: 'px-3 py-1 text-[10px]',
    md: 'py-2.5 text-sm',
    lg: 'px-10 py-3 text-lg',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    function Button({ variant = 'gold', size = 'md', className, ...props }, ref) {
        return (
            <motion.button
                ref={ref}
                whileTap={{ scale: 0.95 }}
                className={`${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${className ?? ''}`}
                {...props}
            />
        );
    },
);
