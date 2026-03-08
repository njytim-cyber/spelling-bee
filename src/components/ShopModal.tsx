/**
 * components/ShopModal.tsx
 *
 * Cosmetic IAP shop — browse themed chalk color and trail packs,
 * preview contents, and purchase via Stripe one-time payment.
 */
import { memo, useState } from 'react';
import { motion } from 'framer-motion';
import { ModalShell } from './ModalShell';
import { IconClose, IconCheck } from './Icons';
import { useUser } from '../contexts/UserContext';
import { COSMETIC_PACKS, isPackRedundant } from '../utils/cosmeticPacks';
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
    const [purchasing, setPurchasing] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';

    const handleBuy = async (packId: string) => {
        trackEvent('shop_purchase_clicked', { packId });
        setPurchasing(packId);
        setError(null);
        try {
            const url = await purchasePack(packId);
            window.location.assign(url);
        } catch {
            setError('Unable to start checkout. Please try again.');
            setPurchasing(null);
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

            <p className="text-[10px] ui text-[rgb(var(--color-fg))]/40 text-center mb-4">
                One-time purchases — unlock new chalk styles, trails, and avatar flair forever
            </p>

            <div className="space-y-3">
                {COSMETIC_PACKS.map(pack => {
                    const owned = purchasedPacks.includes(pack.id);
                    const redundant = !owned && isPackRedundant(pack.id, purchasedPacks);

                    return (
                        <motion.div
                            key={pack.id}
                            className={`border rounded-xl p-3 transition-colors ${
                                owned
                                    ? 'border-[var(--color-correct)]/30 bg-[var(--color-correct)]/5'
                                    : 'border-[rgb(var(--color-fg))]/10 bg-[rgb(var(--color-fg))]/[0.02]'
                            }`}
                        >
                            {/* Header row */}
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <span className="text-xl">{pack.emoji}</span>
                                    <div>
                                        <div className="text-sm ui font-semibold text-[rgb(var(--color-fg))]/80">
                                            {pack.name}
                                        </div>
                                        <div className="text-[10px] ui text-[rgb(var(--color-fg))]/40">
                                            {pack.description}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Preview swatches */}
                            <div className="flex items-center gap-1.5 mb-2.5">
                                {pack.themeIds.map(id => {
                                    const theme = THEME_MAP.get(id);
                                    if (!theme) return null;
                                    return (
                                        <div
                                            key={id}
                                            className="w-6 h-6 rounded-full border border-[rgb(var(--color-fg))]/10"
                                            style={{ backgroundColor: isLight ? theme.lightColor : theme.color }}
                                            title={theme.name}
                                        />
                                    );
                                })}
                                {pack.trailIds.map(id => {
                                    const trail = TRAIL_MAP.get(id);
                                    if (!trail) return null;
                                    return (
                                        <span key={id} className="text-base" title={trail.name}>
                                            {trail.emoji}
                                        </span>
                                    );
                                })}
                                {(pack.flairIds ?? []).map(id => {
                                    const flair = FLAIR_MAP.get(id);
                                    if (!flair) return null;
                                    return (
                                        <span key={id} className="inline-flex items-center gap-0.5 text-[10px] ui text-[rgb(var(--color-fg))]/50 border border-[rgb(var(--color-fg))]/10 rounded-full px-1.5 py-0.5" title={flair.name}>
                                            ✨ {flair.name}
                                        </span>
                                    );
                                })}
                            </div>

                            {/* Action button */}
                            {owned ? (
                                <div className="flex items-center gap-1 text-xs ui text-[var(--color-correct)]">
                                    <IconCheck className="w-3.5 h-3.5" />
                                    <span>Owned</span>
                                </div>
                            ) : (
                                <motion.button
                                    onClick={() => handleBuy(pack.id)}
                                    disabled={purchasing !== null || redundant}
                                    whileTap={{ scale: 0.95 }}
                                    className={`w-full py-2 rounded-lg text-xs ui font-semibold transition-colors ${
                                        redundant
                                            ? 'text-[rgb(var(--color-fg))]/30 bg-[rgb(var(--color-fg))]/5 cursor-not-allowed'
                                            : 'text-[var(--color-gold)] bg-[var(--color-gold)]/10 border border-[var(--color-gold)]/30 hover:bg-[var(--color-gold)]/20 disabled:opacity-50'
                                    }`}
                                >
                                    {purchasing === pack.id
                                        ? 'Opening checkout...'
                                        : redundant
                                            ? 'Already owned via other packs'
                                            : `Buy ${pack.price}`}
                                </motion.button>
                            )}
                        </motion.div>
                    );
                })}
            </div>

            {error && (
                <p className="text-xs ui text-[var(--color-wrong)] text-center mt-3 animate-pulse">
                    {error}
                </p>
            )}
        </ModalShell>
    );
});
