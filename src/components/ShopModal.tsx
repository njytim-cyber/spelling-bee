/**
 * components/ShopModal.tsx
 *
 * Cosmetic shop — a single one-time purchase that unlocks
 * all chalk styles, swipe trails, and avatar flair forever.
 */
import { memo, useState } from 'react';
import { motion } from 'framer-motion';
import { ModalShell } from './ModalShell';
import { IconClose, IconCheck } from './Icons';
import { useUser } from '../contexts/UserContext';
import { EVERYTHING_PACK, isPackRedundant } from '../utils/cosmeticPacks';
import { CHALK_THEMES } from '../utils/chalkThemes';
import { SWIPE_TRAILS } from '../utils/trails';
import { FLAIR_ITEMS } from '../utils/avatarParts';
import { purchasePack } from '../services/stripe';
import { trackEvent } from '../utils/analytics';

interface Props {
    onClose: () => void;
}

const THEME_MAP = new Map(CHALK_THEMES.map(t => [t.id, t]));
const TRAIL_MAP = new Map(SWIPE_TRAILS.map(t => [t.id, t]));
const FLAIR_MAP = new Map(FLAIR_ITEMS.map(f => [`flair-${f.name.toLowerCase()}`, f]));

export const ShopModal = memo(function ShopModal({ onClose }: Props) {
    const { purchasedPacks } = useUser();
    const [purchasing, setPurchasing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';

    const pack = EVERYTHING_PACK;
    const owned = purchasedPacks.includes(pack.id) || isPackRedundant(pack.id, purchasedPacks);

    const handleBuy = async () => {
        trackEvent('shop_purchase_clicked', { packId: pack.id });
        setPurchasing(true);
        setError(null);
        try {
            const url = await purchasePack(pack.id);
            window.location.assign(url);
        } catch {
            setError('Unable to start checkout. Please try again.');
            setPurchasing(false);
        }
    };

    return (
        <ModalShell onClose={onClose} ariaLabel="Cosmetic Shop" className="w-[min(380px,92vw)]">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg ui font-bold text-[var(--color-gold)]">Cosmetic Shop</h3>
                <button onClick={onClose} className="opacity-40 hover:opacity-70 transition-opacity">
                    <IconClose className="w-5 h-5" />
                </button>
            </div>

            <div className="border rounded-xl p-4 border-[rgb(var(--color-fg))]/10 bg-[rgb(var(--color-fg))]/[0.02]">
                {/* Header */}
                <div className="text-center mb-4">
                    <span className="text-3xl">{pack.emoji}</span>
                    <div className="text-base ui font-bold text-[rgb(var(--color-fg))]/80 mt-2">{pack.name}</div>
                    <div className="text-[11px] ui text-[rgb(var(--color-fg))]/40 mt-0.5">
                        One purchase — unlock everything forever
                    </div>
                </div>

                {/* Chalk themes preview */}
                <div className="mb-3">
                    <div className="text-[9px] ui text-[rgb(var(--color-fg))]/30 uppercase tracking-wider mb-1.5">
                        {pack.themeIds.length} chalk styles
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                        {pack.themeIds.map(id => {
                            const theme = THEME_MAP.get(id);
                            if (!theme) return null;
                            return (
                                <div
                                    key={id}
                                    className="w-7 h-7 rounded-full border border-[rgb(var(--color-fg))]/10"
                                    style={{ backgroundColor: isLight ? theme.lightColor : theme.color }}
                                    title={theme.name}
                                />
                            );
                        })}
                    </div>
                </div>

                {/* Trails preview */}
                <div className="mb-3">
                    <div className="text-[9px] ui text-[rgb(var(--color-fg))]/30 uppercase tracking-wider mb-1.5">
                        {pack.trailIds.length} swipe trails
                    </div>
                    <div className="flex items-center gap-2">
                        {pack.trailIds.map(id => {
                            const trail = TRAIL_MAP.get(id);
                            if (!trail) return null;
                            return (
                                <span key={id} className="text-xl" title={trail.name}>
                                    {trail.emoji}
                                </span>
                            );
                        })}
                    </div>
                </div>

                {/* Flair preview */}
                {pack.flairIds && pack.flairIds.length > 0 && (
                    <div className="mb-4">
                        <div className="text-[9px] ui text-[rgb(var(--color-fg))]/30 uppercase tracking-wider mb-1.5">
                            {pack.flairIds.length} avatar flair
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                            {pack.flairIds.map(id => {
                                const flair = FLAIR_MAP.get(id);
                                if (!flair) return null;
                                return (
                                    <span key={id} className="inline-flex items-center gap-0.5 text-[10px] ui text-[rgb(var(--color-fg))]/50 border border-[rgb(var(--color-fg))]/10 rounded-full px-2 py-0.5" title={flair.name}>
                                        ✨ {flair.name}
                                    </span>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Action */}
                {owned ? (
                    <div className="flex items-center justify-center gap-1.5 text-sm ui text-[var(--color-correct)] py-2">
                        <IconCheck className="w-4 h-4" />
                        <span>You own everything!</span>
                    </div>
                ) : (
                    <motion.button
                        onClick={handleBuy}
                        disabled={purchasing}
                        whileTap={{ scale: 0.95 }}
                        className="w-full py-3 rounded-xl text-sm ui font-bold text-[var(--color-gold)] bg-[var(--color-gold)]/10 border border-[var(--color-gold)]/30 hover:bg-[var(--color-gold)]/20 disabled:opacity-50 transition-colors"
                    >
                        {purchasing ? 'Opening checkout...' : `Unlock All — ${pack.price}`}
                    </motion.button>
                )}
            </div>

            {error && (
                <p className="text-xs ui text-[var(--color-wrong)] text-center mt-3 animate-pulse">
                    {error}
                </p>
            )}
        </ModalShell>
    );
});
