/**
 * components/CustomListsModal.tsx
 *
 * Modal for creating, managing, and practicing custom word lists.
 * 340px wide, follows the standard modal pattern.
 */
import { memo, useState } from 'react';
import type { CustomWordList } from '../types/customList';
import { ModalShell } from './ModalShell';

interface Props {
    lists: CustomWordList[];
    onCreate: (name: string, rawWords: string[]) => CustomWordList | null;
    onDelete: (id: string) => void;
    onPractice: (listId: string) => void;
    onClose: () => void;
}

export const CustomListsModal = memo(function CustomListsModal({
    lists, onCreate, onDelete, onPractice, onClose,
}: Props) {
    const [mode, setMode] = useState<'browse' | 'create' | 'view'>('browse');
    const [newName, setNewName] = useState('');
    const [newWords, setNewWords] = useState('');
    const [viewList, setViewList] = useState<CustomWordList | null>(null);

    const handleCreate = () => {
        const rawWords = newWords.split(/[,\n]+/).map(w => w.trim()).filter(w => w.length > 0);
        if (!newName.trim() || rawWords.length === 0) return;
        const list = onCreate(newName, rawWords);
        if (list) {
            setNewName('');
            setNewWords('');
            setMode('browse');
        }
    };

    return (
        <ModalShell onClose={onClose} className="custom-scrollbar">
                <h3 className="text-lg ui font-bold text-[var(--color-gold)] text-center mb-4">
                    {mode === 'create' ? 'New List' : mode === 'view' ? viewList?.name ?? 'List' : 'Custom Lists'}
                </h3>

                {/* ── Browse mode ── */}
                {mode === 'browse' && (
                    <>
                        {lists.length === 0 ? (
                            <div className="text-center py-6">
                                <p className="text-xs ui text-[rgb(var(--color-fg))]/40 mb-3">
                                    No custom lists yet. Create one to practice your own words.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-2 mb-4">
                                {lists.map(list => {
                                    const enriched = list.words.filter(w => w.enriched).length;
                                    return (
                                        <div key={list.id} className="px-3 py-2.5 rounded-xl bg-[rgb(var(--color-fg))]/[0.03] border border-[rgb(var(--color-fg))]/8">
                                            <div className="flex items-center justify-between mb-1">
                                                <button
                                                    onClick={() => { setViewList(list); setMode('view'); }}
                                                    className="text-sm ui text-[rgb(var(--color-fg))]/70 hover:text-[rgb(var(--color-fg))]/90 transition-colors text-left"
                                                >
                                                    {list.name}
                                                </button>
                                                <span className="text-[10px] ui text-[rgb(var(--color-fg))]/30">
                                                    {list.words.length} words
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1 mb-2">
                                                <div className="flex-1 h-1 bg-[rgb(var(--color-fg))]/5 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-[var(--color-correct)]/40 rounded-full"
                                                        style={{ width: `${list.words.length > 0 ? (enriched / list.words.length) * 100 : 0}%` }}
                                                    />
                                                </div>
                                                <span className="text-[9px] ui text-[rgb(var(--color-fg))]/25">
                                                    {enriched}/{list.words.length} enriched
                                                </span>
                                            </div>
                                            <div className="flex gap-1.5">
                                                <button
                                                    onClick={() => onPractice(list.id)}
                                                    className="flex-1 py-1.5 rounded-lg text-[10px] ui text-[var(--color-gold)] bg-[var(--color-gold)]/10 hover:bg-[var(--color-gold)]/20 transition-colors"
                                                >
                                                    Practice
                                                </button>
                                                <button
                                                    onClick={() => onDelete(list.id)}
                                                    className="px-3 py-1.5 rounded-lg text-[10px] ui text-[var(--color-wrong)]/60 hover:text-[var(--color-wrong)] hover:bg-[var(--color-wrong)]/10 transition-colors"
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        <button
                            onClick={() => setMode('create')}
                            className="w-full py-2.5 rounded-xl border-2 border-[var(--color-gold)]/40 bg-[var(--color-gold)]/10 text-sm ui text-[var(--color-gold)] hover:bg-[var(--color-gold)]/20 transition-colors"
                        >
                            + Create List
                        </button>
                    </>
                )}

                {/* ── Create mode ── */}
                {mode === 'create' && (
                    <>
                        <input
                            type="text"
                            value={newName}
                            onChange={e => setNewName(e.target.value.slice(0, 40))}
                            placeholder="List name"
                            className="w-full bg-[rgb(var(--color-fg))]/5 border border-[rgb(var(--color-fg))]/10 rounded-xl px-3 py-2.5 text-sm ui text-[var(--color-chalk)] placeholder:text-[rgb(var(--color-fg))]/15 outline-none mb-3"
                        />
                        <textarea
                            value={newWords}
                            onChange={e => setNewWords(e.target.value)}
                            placeholder="Enter words (comma or newline separated)"
                            rows={6}
                            className="w-full bg-[rgb(var(--color-fg))]/5 border border-[rgb(var(--color-fg))]/10 rounded-xl px-3 py-2.5 text-sm ui text-[var(--color-chalk)] placeholder:text-[rgb(var(--color-fg))]/15 outline-none mb-3 resize-none"
                        />
                        <div className="text-[10px] ui text-[rgb(var(--color-fg))]/25 mb-3 text-center">
                            Words found in our bank will be auto-enriched with definitions and distractors
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setMode('browse')}
                                className="flex-1 py-2.5 rounded-xl text-sm ui text-[rgb(var(--color-fg))]/40 hover:text-[rgb(var(--color-fg))]/60 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreate}
                                disabled={!newName.trim() || !newWords.trim()}
                                className="flex-1 py-2.5 rounded-xl border-2 border-[var(--color-gold)]/40 bg-[var(--color-gold)]/10 text-sm ui text-[var(--color-gold)] hover:bg-[var(--color-gold)]/20 transition-colors disabled:opacity-30"
                            >
                                Create
                            </button>
                        </div>
                    </>
                )}

                {/* ── View mode ── */}
                {mode === 'view' && viewList && (
                    <>
                        <div className="space-y-1 mb-4 max-h-[40vh] overflow-y-auto custom-scrollbar">
                            {viewList.words.map((w, i) => (
                                <div key={i} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-[rgb(var(--color-fg))]/[0.02]">
                                    <span className="text-xs ui text-[rgb(var(--color-fg))]/60 flex-1">{w.word}</span>
                                    {w.enriched && (
                                        <span className="text-[9px] ui text-[var(--color-correct)]/50">enriched</span>
                                    )}
                                </div>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setMode('browse')}
                                className="flex-1 py-2 text-sm ui text-[rgb(var(--color-fg))]/40 hover:text-[rgb(var(--color-fg))]/60 transition-colors"
                            >
                                Back
                            </button>
                            <button
                                onClick={() => onPractice(viewList.id)}
                                className="flex-1 py-2 rounded-xl border-2 border-[var(--color-gold)]/40 bg-[var(--color-gold)]/10 text-sm ui text-[var(--color-gold)] hover:bg-[var(--color-gold)]/20 transition-colors"
                            >
                                Practice
                            </button>
                        </div>
                    </>
                )}

                <button
                    onClick={onClose}
                    className="w-full mt-3 py-2 text-sm ui text-[rgb(var(--color-fg))]/40 hover:text-[rgb(var(--color-fg))]/60 transition-colors"
                >
                    Back
                </button>
        </ModalShell>
    );
});
