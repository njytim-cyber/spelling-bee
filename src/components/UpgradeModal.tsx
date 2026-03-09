/**
 * components/UpgradeModal.tsx
 *
 * Paywall modal for Champion Pass. Shows benefits, share-to-unlock CTA,
 * and 7-day free trial button. Chalk-aesthetic design.
 */
import { memo, useState } from 'react';
import { motion } from 'framer-motion';
import { ModalShell } from './ModalShell';
import { Button } from './Button';
import { IconCheck, IconClose, IconGift, IconShare } from './Icons';
import { useUser } from '../contexts/UserContext';
import { trackEvent } from '../utils/analytics';
import { startCheckout, openCustomerPortal } from '../services/stripe';

interface Props {
    onClose: () => void;
}

const PREMIUM_FEATURES = [
    'All 10 levels (117,000+ words)',
    'Unlimited spaced repetition',
    'Etymology quiz & roots study',
    'Advanced timed challenges',
    'Premium chalk styles & trails',
];

export const UpgradeModal = memo(function UpgradeModal({ onClose }: Props) {
    const {
        referralCode,
        shareReferral,
        activateTrial,
        isPremium,
        isPaidSubscriber,
        daysRemaining,
        trialUsed,
    } = useUser();

    const [trialActivated, setTrialActivated] = useState(false);
    const [copied, setCopied] = useState(false);
    const [purchaseToast, setPurchaseToast] = useState<string | null>(null);
    const [purchasing, setPurchasing] = useState(false);

    // Track paywall impressions
    useState(() => { trackEvent('paywall_shown'); });

    const handlePurchase = async (plan: 'monthly' | 'annual' | 'bee-team-monthly' | 'bee-team-annual') => {
        trackEvent('purchase_clicked', { plan });
        setPurchasing(true);
        try {
            const url = await startCheckout(plan);
            window.location.href = url;
        } catch {
            setPurchaseToast('Unable to start checkout. Please try again.');
            setTimeout(() => setPurchaseToast(null), 3000);
            setPurchasing(false);
        }
    };

    const handleManageSubscription = async () => {
        setPurchasing(true);
        try {
            const url = await openCustomerPortal();
            window.location.href = url;
        } catch {
            setPurchaseToast('Unable to open subscription management.');
            setTimeout(() => setPurchaseToast(null), 3000);
            setPurchasing(false);
        }
    };

    const handleStartTrial = () => {
        activateTrial(7);
        setTrialActivated(true);
        trackEvent('trial_started');
    };

    const handleCopyCode = async () => {
        try {
            await navigator.clipboard.writeText(referralCode);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // Silent fail
        }
    };

    if (trialActivated) {
        return (
            <ModalShell onClose={onClose} ariaLabel="Champion Pass activated">
                <div className="text-center">
                    <motion.div
                        className="text-6xl mb-4"
                        initial={{ scale: 0 }}
                        animate={{ scale: [0, 1.3, 1] }}
                        transition={{ duration: 0.5 }}
                    >
                        🏆
                    </motion.div>
                    <h3 className="text-xl ui font-bold text-[var(--color-gold)] mb-2">
                        Champion Pass Activated!
                    </h3>
                    <p className="text-sm ui text-[rgb(var(--color-fg))]/50 mb-6">
                        You have 7 days of full access. All 10 levels are now unlocked!
                    </p>

                    <div className="bg-[rgb(var(--color-fg))]/[0.03] border border-[rgb(var(--color-fg))]/8 rounded-xl p-4 mb-4">
                        <p className="text-xs ui text-[rgb(var(--color-fg))]/40 mb-2">
                            Share your code to earn more free time:
                        </p>
                        <button
                            onClick={handleCopyCode}
                            className="text-lg ui font-bold text-[var(--color-gold)] tracking-widest"
                        >
                            {copied ? '✅ Copied!' : referralCode}
                        </button>
                    </div>

                    <Button className="w-full" onClick={onClose}>
                        Start Spelling!
                    </Button>
                </div>
            </ModalShell>
        );
    }

    if (isPremium) {
        return (
            <ModalShell onClose={onClose} ariaLabel="Champion Pass active">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg ui font-bold text-[var(--color-gold)]">Champion Pass</h3>
                    <button onClick={onClose} className="opacity-40 hover:opacity-70 transition-opacity">
                        <IconClose className="w-5 h-5" />
                    </button>
                </div>
                <div className="text-center">
                    <div className="text-4xl mb-2">🏆</div>
                    <p className="text-sm ui text-[var(--color-gold)] font-semibold mb-1">Active</p>
                    <p className="text-xs ui text-[rgb(var(--color-fg))]/40 mb-4">
                        {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'} remaining
                    </p>

                    <div className="bg-[rgb(var(--color-fg))]/[0.03] border border-[rgb(var(--color-fg))]/8 rounded-xl p-4 mb-4">
                        <p className="text-xs ui text-[rgb(var(--color-fg))]/40 mb-2">
                            Each friend who uses your code adds 7 more days:
                        </p>
                        <button
                            onClick={handleCopyCode}
                            className="text-lg ui font-bold text-[var(--color-gold)] tracking-widest"
                        >
                            {copied ? '✅ Copied!' : referralCode}
                        </button>
                    </div>

                    <Button className="w-full flex items-center justify-center gap-2 mb-2" onClick={shareReferral}>
                        <IconShare className="w-4 h-4" />
                        Share & Earn More Time
                    </Button>

                    {isPaidSubscriber && (
                        <Button variant="ghost" className="w-full" onClick={handleManageSubscription} disabled={purchasing}>
                            {purchasing ? 'Opening...' : 'Manage Subscription'}
                        </Button>
                    )}
                </div>
            </ModalShell>
        );
    }

    return (
        <ModalShell onClose={onClose} ariaLabel="Upgrade to Champion Pass" className="w-[min(360px,90vw)]">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg ui font-bold text-[var(--color-gold)]">Champion Pass</h3>
                <button onClick={onClose} className="opacity-40 hover:opacity-70 transition-opacity">
                    <IconClose className="w-5 h-5" />
                </button>
            </div>

            {/* Champion features */}
            <div className="space-y-2.5 mb-5">
                {PREMIUM_FEATURES.map(f => (
                    <div key={f} className="flex items-start gap-2">
                        <IconCheck className="w-3.5 h-3.5 text-[var(--color-gold)] shrink-0 mt-0.5" />
                        <span className="text-xs ui text-[rgb(var(--color-fg))] leading-tight">{f}</span>
                    </div>
                ))}
            </div>

            {/* Referral CTA */}
            <div className="bg-[rgb(var(--color-fg))]/[0.03] border border-[rgb(var(--color-fg))]/8 rounded-xl p-4 mb-4">
                <div className="flex items-center gap-2 mb-2">
                    <IconGift className="w-4 h-4 text-[var(--color-gold)]" />
                    <span className="text-xs ui font-semibold text-[var(--color-gold)]">Invite Friends, Get Free Access</span>
                </div>
                <p className="text-[10px] ui text-[rgb(var(--color-fg))]/40 mb-3">
                    Share your referral code. When a friend joins, you BOTH get 7 days of Champion Pass free.
                </p>
                <div className="flex gap-2">
                    <button
                        onClick={handleCopyCode}
                        className="flex-1 py-2 rounded-lg border border-[rgb(var(--color-fg))]/15 text-xs ui text-[rgb(var(--color-fg))]/60 hover:text-[var(--color-gold)] hover:border-[var(--color-gold)]/30 transition-colors font-mono tracking-wider"
                    >
                        {copied ? '✅ Copied!' : referralCode}
                    </button>
                    <motion.button
                        onClick={shareReferral}
                        whileTap={{ scale: 0.95 }}
                        className="px-4 py-2 rounded-lg bg-[var(--color-gold)]/10 border border-[var(--color-gold)]/30 text-xs ui text-[var(--color-gold)]"
                    >
                        <IconShare className="w-3.5 h-3.5" />
                    </motion.button>
                </div>
            </div>

            {/* Trial CTA — hidden if already used */}
            {!trialUsed && (
                <>
                    <Button size="lg" className="w-full mb-3 font-semibold text-base" onClick={handleStartTrial}>
                        Start 7-Day Free Trial
                    </Button>
                    <p className="text-[9px] ui text-[rgb(var(--color-fg))]/20 text-center mb-4">
                        No credit card required. Full access for 7 days.
                    </p>
                </>
            )}

            {/* Purchase buttons */}
            <div className="grid grid-cols-2 gap-2 mb-3">
                <motion.button
                    onClick={() => handlePurchase('monthly')}
                    disabled={purchasing}
                    whileTap={{ scale: 0.95 }}
                    className="py-3 rounded-xl border border-[var(--color-gold)]/30 bg-[var(--color-gold)]/5 text-center disabled:opacity-50"
                >
                    <span className="text-base ui font-bold text-[var(--color-gold)]">$4.99</span>
                    <span className="block text-[10px] ui text-[rgb(var(--color-fg))]/40">/month</span>
                </motion.button>
                <motion.button
                    onClick={() => handlePurchase('annual')}
                    disabled={purchasing}
                    whileTap={{ scale: 0.95 }}
                    className="py-3 rounded-xl border-2 border-[var(--color-gold)]/40 bg-[var(--color-gold)]/10 text-center relative disabled:opacity-50"
                >
                    <span className="absolute -top-2 right-2 text-[8px] ui font-bold bg-[var(--color-gold)] text-black px-1.5 py-0.5 rounded-full">
                        SAVE 50%
                    </span>
                    <span className="text-base ui font-bold text-[var(--color-gold)]">$29.99</span>
                    <span className="block text-[10px] ui text-[rgb(var(--color-fg))]/40">/year</span>
                </motion.button>
            </div>

            {/* Bee Team tier */}
            <div className="mt-4 pt-3 border-t border-[rgb(var(--color-fg))]/5">
                <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm">👨‍👩‍👧‍👦</span>
                    <span className="text-xs ui font-semibold text-[rgb(var(--color-fg))]/60">Bee Team — Family & Classroom</span>
                </div>
                <div className="text-[10px] ui text-[rgb(var(--color-fg))]/35 mb-2 space-y-0.5">
                    <p>Everything in Champion Pass, plus:</p>
                    <div className="flex items-start gap-1.5">
                        <IconCheck className="w-3 h-3 text-[var(--color-correct)] shrink-0 mt-0.5" />
                        <span>Up to 5 learner profiles</span>
                    </div>
                    <div className="flex items-start gap-1.5">
                        <IconCheck className="w-3 h-3 text-[var(--color-correct)] shrink-0 mt-0.5" />
                        <span>Parent/teacher dashboard</span>
                    </div>
                    <div className="flex items-start gap-1.5">
                        <IconCheck className="w-3 h-3 text-[var(--color-correct)] shrink-0 mt-0.5" />
                        <span>Printable certificates & reports</span>
                    </div>
                    <div className="flex items-start gap-1.5">
                        <IconCheck className="w-3 h-3 text-[var(--color-correct)] shrink-0 mt-0.5" />
                        <span>Custom school/class branding</span>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                    <motion.button
                        onClick={() => handlePurchase('bee-team-monthly')}
                        disabled={purchasing}
                        whileTap={{ scale: 0.95 }}
                        className="py-2 rounded-xl border border-[rgb(var(--color-fg))]/15 text-center disabled:opacity-50"
                    >
                        <span className="text-sm ui font-bold text-[rgb(var(--color-fg))]/60">$7.99</span>
                        <span className="block text-[9px] ui text-[rgb(var(--color-fg))]/30">/month</span>
                    </motion.button>
                    <motion.button
                        onClick={() => handlePurchase('bee-team-annual')}
                        disabled={purchasing}
                        whileTap={{ scale: 0.95 }}
                        className="py-2 rounded-xl border border-[rgb(var(--color-fg))]/15 bg-[rgb(var(--color-fg))]/[0.02] text-center relative disabled:opacity-50"
                    >
                        <span className="absolute -top-2 right-2 text-[8px] ui font-bold bg-[var(--color-gold)] text-black px-1.5 py-0.5 rounded-full">
                            SAVE 48%
                        </span>
                        <span className="text-sm ui font-bold text-[rgb(var(--color-fg))]/60">$49.99</span>
                        <span className="block text-[9px] ui text-[rgb(var(--color-fg))]/30">/year</span>
                    </motion.button>
                </div>
            </div>

            {/* Purchase toast */}
            {purchaseToast && (
                <p className="text-xs ui text-[var(--color-gold)] text-center animate-pulse">
                    {purchaseToast}
                </p>
            )}
        </ModalShell>
    );
});
