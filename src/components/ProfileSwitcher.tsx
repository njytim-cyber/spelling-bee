/**
 * components/ProfileSwitcher.tsx
 *
 * Horizontal profile bar shown at top of MePage for Bee Team users.
 * Displays parent + learner profiles as mini avatars.
 * Tap to switch, "+" to add new learner.
 */
import { memo, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { AvatarSvg } from './AvatarSvg';
import { ModalShell } from './ModalShell';
import { IconClose } from './Icons';
import { trackEvent } from '../utils/analytics';
import { DEFAULT_AVATAR } from '../utils/avatarParts';
import type { LearnerProfile } from '../hooks/useProfiles';

interface Props {
    profiles: LearnerProfile[];
    activeProfileId: string | null;
    canAddProfile: boolean;
    onSwitch: (profileId: string | null) => void;
    onAdd: (name: string, avatarConfig: string, level: string) => void;
    onRemove: (profileId: string) => void;
}

export const ProfileSwitcher = memo(function ProfileSwitcher({
    profiles, activeProfileId, canAddProfile, onSwitch, onAdd, onRemove,
}: Props) {
    const [showAddModal, setShowAddModal] = useState(false);
    const [newName, setNewName] = useState('');
    const [confirmRemove, setConfirmRemove] = useState<string | null>(null);

    const handleAdd = () => {
        const trimmed = newName.trim().slice(0, 20);
        if (!trimmed) return;
        onAdd(trimmed, DEFAULT_AVATAR, '');
        trackEvent('profile_created');
        setNewName('');
        setShowAddModal(false);
    };

    return (
        <>
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {/* Parent/Admin profile */}
                <button
                    onClick={() => { onSwitch(null); trackEvent('profile_switched', { target: 'parent' }); }}
                    className={`flex flex-col items-center gap-1 px-2 py-1.5 rounded-xl transition-all shrink-0 ${
                        activeProfileId === null
                            ? 'bg-[var(--color-gold)]/10 border border-[var(--color-gold)]/30'
                            : 'border border-transparent hover:bg-[rgb(var(--color-fg))]/5'
                    }`}
                >
                    <div className="w-8 h-8 rounded-full bg-[rgb(var(--color-fg))]/10 flex items-center justify-center text-xs">
                        👤
                    </div>
                    <span className={`text-[9px] ui font-medium ${
                        activeProfileId === null ? 'text-[var(--color-gold)]' : 'text-[rgb(var(--color-fg))]/50'
                    }`}>
                        Parent
                    </span>
                </button>

                {/* Learner profiles */}
                {profiles.map(p => (
                    <button
                        key={p.id}
                        onClick={() => { onSwitch(p.id); trackEvent('profile_switched', { target: 'learner' }); }}
                        onContextMenu={(e) => { e.preventDefault(); setConfirmRemove(p.id); }}
                        className={`flex flex-col items-center gap-1 px-2 py-1.5 rounded-xl transition-all shrink-0 ${
                            activeProfileId === p.id
                                ? 'bg-[var(--color-gold)]/10 border border-[var(--color-gold)]/30'
                                : 'border border-transparent hover:bg-[rgb(var(--color-fg))]/5'
                        }`}
                    >
                        <div className="w-8 h-8">
                            <AvatarSvg config={p.avatarConfig || DEFAULT_AVATAR} size={32} />
                        </div>
                        <span className={`text-[9px] ui font-medium max-w-[48px] truncate ${
                            activeProfileId === p.id ? 'text-[var(--color-gold)]' : 'text-[rgb(var(--color-fg))]/50'
                        }`}>
                            {p.name}
                        </span>
                    </button>
                ))}

                {/* Add button */}
                {canAddProfile && (
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="flex flex-col items-center gap-1 px-2 py-1.5 rounded-xl border border-dashed border-[rgb(var(--color-fg))]/15 hover:border-[var(--color-gold)]/30 transition-colors shrink-0"
                    >
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-lg text-[rgb(var(--color-fg))]/30">
                            +
                        </div>
                        <span className="text-[9px] ui text-[rgb(var(--color-fg))]/30">Add</span>
                    </button>
                )}
            </div>

            {/* Add Profile Modal */}
            <AnimatePresence>
                {showAddModal && (
                    <ModalShell onClose={() => setShowAddModal(false)} ariaLabel="Add learner profile">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-base ui font-bold text-[rgb(var(--color-fg))]/80">Add Learner</h3>
                            <button onClick={() => setShowAddModal(false)} className="text-[rgb(var(--color-fg))]/40">
                                <IconClose className="w-4 h-4" />
                            </button>
                        </div>
                        <form onSubmit={e => { e.preventDefault(); handleAdd(); }}>
                            <input
                                type="text"
                                value={newName}
                                onChange={e => setNewName(e.target.value)}
                                placeholder="Learner's name"
                                maxLength={20}
                                autoFocus
                                className="w-full px-4 py-2.5 rounded-xl bg-[rgb(var(--color-fg))]/5 border border-[rgb(var(--color-fg))]/10 text-sm ui text-[rgb(var(--color-fg))]/80 placeholder:text-[rgb(var(--color-fg))]/30 outline-none focus:border-[var(--color-gold)]/30"
                            />
                            <div className="text-[10px] ui text-[rgb(var(--color-fg))]/30 mt-1.5">
                                Each learner gets their own stats, word history, and progress
                            </div>
                            <button
                                type="submit"
                                disabled={!newName.trim()}
                                className="w-full mt-4 py-2.5 rounded-xl bg-[var(--color-gold)]/15 text-sm ui font-semibold text-[var(--color-gold)] disabled:opacity-30 transition-opacity"
                            >
                                Add Learner
                            </button>
                        </form>
                    </ModalShell>
                )}
            </AnimatePresence>

            {/* Remove Profile Confirm */}
            <AnimatePresence>
                {confirmRemove && (
                    <ModalShell onClose={() => setConfirmRemove(null)} ariaLabel="Remove learner profile">
                        <div className="text-center">
                            <div className="text-2xl mb-2">🗑️</div>
                            <h3 className="text-base ui font-bold text-[rgb(var(--color-fg))]/80 mb-2">Remove Learner?</h3>
                            <p className="text-xs ui text-[rgb(var(--color-fg))]/50 mb-4">
                                This will delete {profiles.find(p => p.id === confirmRemove)?.name}&apos;s progress and cannot be undone.
                            </p>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setConfirmRemove(null)}
                                    className="flex-1 py-2 rounded-xl bg-[rgb(var(--color-fg))]/10 text-sm ui text-[rgb(var(--color-fg))]/60"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => { onRemove(confirmRemove); setConfirmRemove(null); }}
                                    className="flex-1 py-2 rounded-xl bg-[var(--color-wrong)]/20 text-sm ui font-semibold text-[var(--color-wrong)]"
                                >
                                    Remove
                                </button>
                            </div>
                        </div>
                    </ModalShell>
                )}
            </AnimatePresence>
        </>
    );
});
