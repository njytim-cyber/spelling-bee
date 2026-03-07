/**
 * components/TestimonialPrompt.tsx
 *
 * Inline card on MePage that prompts users for testimonials after milestones.
 * Appears when masteredCount >= 20 OR dayStreak >= 14 OR sessionsPlayed >= 25,
 * and not dismissed in the last 30 days.
 */
import { memo, useState, useCallback } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../utils/firebase';
import { STORAGE_KEYS, FIRESTORE } from '../config';
import { trackEvent } from '../utils/analytics';
import { Button } from './Button';

interface Props {
    masteredCount: number;
    dayStreak: number;
    sessionsPlayed: number;
    level: string;
    isPremium: boolean;
}

const THIRTY_DAYS_MS = 30 * 86_400_000;

function shouldShow(props: Props): boolean {
    const { masteredCount, dayStreak, sessionsPlayed } = props;
    if (masteredCount < 20 && dayStreak < 14 && sessionsPlayed < 25) return false;

    try {
        const dismissed = localStorage.getItem(STORAGE_KEYS.testimonialDismissed);
        if (dismissed && Date.now() - Number(dismissed) < THIRTY_DAYS_MS) return false;
    } catch { /* show if localStorage fails */ }

    return true;
}

export const TestimonialPrompt = memo(function TestimonialPrompt(props: Props) {
    const [text, setText] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [hidden, setHidden] = useState(false);

    const milestoneType = props.masteredCount >= 20 ? 'mastered'
        : props.dayStreak >= 14 ? 'streak' : 'sessions';

    const handleSubmit = useCallback(async () => {
        if (text.trim().length < 5) return;

        const uid = auth.currentUser?.uid;
        if (!uid) return;

        try {
            await addDoc(collection(db, FIRESTORE.TESTIMONIALS), {
                text: text.trim(),
                milestoneType,
                masteredCount: props.masteredCount,
                dayStreak: props.dayStreak,
                sessionsPlayed: props.sessionsPlayed,
                level: props.level,
                isPremium: props.isPremium,
                displayName: auth.currentUser?.displayName ?? '',
                submittedAt: serverTimestamp(),
            });
            trackEvent('testimonial_submitted', { milestone: milestoneType });
            setSubmitted(true);
        } catch {
            // Silent failure — non-critical
        }
    }, [text, milestoneType, props]);

    const handleDismiss = useCallback(() => {
        try {
            localStorage.setItem(STORAGE_KEYS.testimonialDismissed, String(Date.now()));
        } catch { /* ignore */ }
        setHidden(true);
    }, []);

    if (hidden || submitted || !shouldShow(props)) return null;

    if (!auth.currentUser) return null;

    return (
        <div className="w-full px-4 py-3 rounded-2xl bg-[rgb(var(--color-fg))]/[0.03] border border-[rgb(var(--color-fg))]/8 mb-4">
            <p className="text-sm ui font-bold text-[var(--color-chalk)] mb-1">
                Would you recommend Spelling Bee?
            </p>
            <p className="text-[11px] ui text-[rgb(var(--color-fg))]/40 mb-3">
                Tell us in one sentence!
            </p>

            <textarea
                value={text}
                onChange={e => setText(e.target.value.slice(0, 500))}
                placeholder="What do you like about Spelling Bee?"
                rows={2}
                className="w-full px-3 py-2 rounded-xl bg-[rgb(var(--color-fg))]/[0.05] border border-[rgb(var(--color-fg))]/10 text-sm ui text-[var(--color-chalk)] placeholder:text-[rgb(var(--color-fg))]/20 resize-none mb-3 focus:outline-none focus:border-[var(--color-gold)]/40"
            />

            <div className="flex gap-2">
                <Button
                    size="sm"
                    disabled={text.trim().length < 5}
                    onClick={handleSubmit}
                    className="flex-1"
                >
                    Submit
                </Button>
                <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleDismiss}
                    className="flex-1"
                >
                    Not now
                </Button>
            </div>
        </div>
    );
});
