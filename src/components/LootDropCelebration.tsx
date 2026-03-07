/**
 * components/LootDropCelebration.tsx
 *
 * Full-screen celebration when the user finds a loot drop mid-session.
 * Shows the dropped chalk theme with a treasure chest animation.
 */
import { motion } from 'framer-motion';
import { Button } from './Button';
import { CHALK_THEMES } from '../utils/chalkThemes';

interface Props {
    themeId: string;
    themeName: string;
    onDismiss: () => void;
}

export function LootDropCelebration({ themeId, themeName, onDismiss }: Props) {
    const theme = CHALK_THEMES.find(t => t.id === themeId);
    const color = theme?.color ?? 'rgba(255, 255, 255, 0.95)';

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/70 flex items-center justify-center p-4"
            onClick={onDismiss}
        >
            <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', damping: 15, stiffness: 300 }}
                className="bg-[rgb(var(--color-bg))] rounded-2xl p-6 max-w-[320px] w-full text-center space-y-4 shadow-2xl"
                onClick={e => e.stopPropagation()}
            >
                {/* Treasure emoji */}
                <motion.div
                    initial={{ rotateZ: -10 }}
                    animate={{ rotateZ: [0, -5, 5, -5, 0] }}
                    transition={{ delay: 0.3, duration: 0.5 }}
                    className="text-5xl"
                >
                    🎁
                </motion.div>

                {/* Title */}
                <motion.h2
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="text-xl font-bold font-[family-name:var(--font-chalk)] text-[rgb(var(--color-accent))]"
                >
                    Loot Drop!
                </motion.h2>

                {/* Theme preview */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.6 }}
                    className="flex flex-col items-center gap-2"
                >
                    <div
                        className="w-16 h-16 rounded-xl border-2 border-[rgb(var(--color-fg))]/10 shadow-lg"
                        style={{ backgroundColor: color }}
                    />
                    <p className="text-sm font-semibold" style={{ color }}>
                        {themeName}
                    </p>
                    <p className="text-xs text-[rgb(var(--color-fg))]/50">
                        New chalk color unlocked!
                    </p>
                </motion.div>

                <Button className="w-full" onClick={onDismiss}>
                    Awesome!
                </Button>
            </motion.div>
        </motion.div>
    );
}
