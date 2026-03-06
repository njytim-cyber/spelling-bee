/**
 * components/CustomListsModal.tsx
 *
 * Modal for creating, managing, and practicing custom word lists.
 * Features: autocomplete word search, word detail expand, per-word Leitner stats,
 * inline rename, duplicate, smart "missed words" suggestion.
 */
import { memo, useState, useCallback, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { CustomWord, CustomWordList } from '../types/customList';
import type { WordRecord } from '../hooks/useWordHistory';
import { WordAutocomplete } from './WordAutocomplete';
import { IconCopy, IconChevronDown } from './Icons';
import { ModalShell } from './ModalShell';
import { Button } from './Button';
import { enrichWord } from '../hooks/useCustomLists';

const BOX_LABELS = ['New', 'Learning', 'Reviewing', 'Familiar', 'Mastered'];
const BOX_COLORS = [
    'text-[var(--color-wrong)]',
    'text-orange-400',
    'text-yellow-400',
    'text-green-400',
    'text-[var(--color-correct)]',
];

interface Props {
    lists: CustomWordList[];
    maxLists: number;
    onCreateFromWords: (name: string, words: CustomWord[]) => CustomWordList | null;
    onDelete: (id: string) => void;
    onRename: (id: string, name: string) => void;
    onDuplicate: (id: string) => CustomWordList | null;
    onAddWord: (listId: string, word: CustomWord) => void;
    onRemoveWord: (listId: string, word: string) => void;
    wordRecords: Record<string, WordRecord>;
    missedWords: WordRecord[];
    onPractice: (listId: string) => void;
    onClose: () => void;
}

export const CustomListsModal = memo(function CustomListsModal({
    lists, maxLists, onCreateFromWords, onDelete, onRename, onDuplicate,
    onAddWord, onRemoveWord, wordRecords, missedWords, onPractice, onClose,
}: Props) {
    const [mode, setMode] = useState<'browse' | 'create' | 'view'>('browse');
    const [newName, setNewName] = useState('');
    const [newWords, setNewWords] = useState<CustomWord[]>([]);
    const [showBulkPaste, setShowBulkPaste] = useState(false);
    const [bulkText, setBulkText] = useState('');
    const [viewList, setViewList] = useState<CustomWordList | null>(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
    const [expandedWord, setExpandedWord] = useState<string | null>(null);
    const [renamingId, setRenamingId] = useState<string | null>(null);
    const [renameValue, setRenameValue] = useState('');

    // Existing words in the current create-mode list (for dedup in autocomplete)
    const createExisting = useMemo(
        () => new Set(newWords.map(w => w.word)),
        [newWords],
    );

    // Existing words in the current view-mode list
    const viewExisting = useMemo(
        () => new Set(viewList?.words.map(w => w.word) ?? []),
        [viewList],
    );

    // ── List-level stats helper ──
    const getListStats = useCallback((list: CustomWordList) => {
        let practiced = 0, totalCorrect = 0, totalAttempts = 0, mastered = 0;
        for (const w of list.words) {
            const r = wordRecords[w.word.toLowerCase()];
            if (r && r.attempts > 0) {
                practiced++;
                totalCorrect += r.correct;
                totalAttempts += r.attempts;
                if (r.box >= 4 && (r.typedAttempts ?? 0) >= 1) mastered++;
            }
        }
        const accuracy = totalAttempts > 0 ? Math.round((totalCorrect / totalAttempts) * 100) : 0;
        return { practiced, accuracy, mastered };
    }, [wordRecords]);

    // ── Create mode handlers ──
    const handleAddToCreate = useCallback((word: CustomWord) => {
        setNewWords(prev => [...prev, word]);
    }, []);

    const handleRemoveFromCreate = useCallback((word: string) => {
        setNewWords(prev => prev.filter(w => w.word !== word));
    }, []);

    const handleCreate = useCallback(() => {
        const name = newName.trim();
        if (!name) return;

        const words = [...newWords];
        // Also add bulk-pasted words
        if (bulkText.trim()) {
            const rawWords = bulkText.split(/[,\n]+/).map(w => w.trim()).filter(w => w.length > 0);
            const existing = new Set(words.map(w => w.word));
            for (const raw of rawWords) {
                if (!existing.has(raw.toLowerCase())) {
                    words.push(enrichWord(raw));
                    existing.add(raw.toLowerCase());
                }
            }
        }
        if (words.length === 0) return;

        const list = onCreateFromWords(name, words);
        if (list) {
            setNewName('');
            setNewWords([]);
            setBulkText('');
            setShowBulkPaste(false);
            setMode('browse');
        }
    }, [newName, newWords, bulkText, onCreateFromWords]);

    // ── Inline rename ──
    const startRename = useCallback((id: string, currentName: string) => {
        setRenamingId(id);
        setRenameValue(currentName);
    }, []);

    const commitRename = useCallback(() => {
        if (renamingId && renameValue.trim()) {
            onRename(renamingId, renameValue.trim());
        }
        setRenamingId(null);
    }, [renamingId, renameValue, onRename]);

    // ── Missed words suggestion ──
    const handleCreateMissedList = useCallback(() => {
        const words = missedWords.slice(0, 20).map(r => enrichWord(r.word));
        const list = onCreateFromWords('Words to Review', words);
        if (list) {
            setViewList(list);
            setMode('view');
        }
    }, [missedWords, onCreateFromWords]);

    // Keep viewList in sync with list data changes
    const currentViewList = useMemo(() => {
        if (!viewList) return null;
        return lists.find(l => l.id === viewList.id) ?? viewList;
    }, [viewList, lists]);

    return (
        <ModalShell onClose={onClose} className="custom-scrollbar">
            <h3 className="text-lg ui font-bold text-[var(--color-gold)] text-center mb-4">
                {mode === 'create' ? 'New List' : mode === 'view' ? currentViewList?.name ?? 'List' : 'My Lists'}
            </h3>

            {/* ── Browse mode ── */}
            {mode === 'browse' && (
                <>
                    {/* Missed words suggestion */}
                    {missedWords.length >= 3 && lists.length < maxLists && (
                        <button
                            onClick={handleCreateMissedList}
                            className="w-full mb-3 px-3 py-2.5 rounded-xl bg-[var(--color-wrong)]/10 border border-[var(--color-wrong)]/20 text-left transition-colors hover:bg-[var(--color-wrong)]/15"
                        >
                            <div className="text-xs ui font-medium text-[var(--color-wrong)]/80">
                                Create list from {Math.min(missedWords.length, 20)} words you struggle with
                            </div>
                            <div className="text-[9px] ui text-[rgb(var(--color-fg))]/30 mt-0.5">
                                Auto-populated from your toughest words
                            </div>
                        </button>
                    )}

                    {lists.length === 0 ? (
                        <div className="text-center py-6">
                            <p className="text-xs ui text-[rgb(var(--color-fg))]/40 mb-3">
                                No custom lists yet. Create one to practice your own words.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-2 mb-4">
                            {lists.map(list => {
                                const stats = getListStats(list);
                                const preview = list.words.slice(0, 4).map(w => w.word).join(', ');
                                const isRenaming = renamingId === list.id;

                                return (
                                    <div key={list.id} className="px-3 py-2.5 rounded-xl bg-[rgb(var(--color-fg))]/[0.03] border border-[rgb(var(--color-fg))]/8">
                                        <div className="flex items-center justify-between mb-1">
                                            {isRenaming ? (
                                                <input
                                                    autoFocus
                                                    value={renameValue}
                                                    onChange={e => setRenameValue(e.target.value.slice(0, 40))}
                                                    onBlur={commitRename}
                                                    onKeyDown={e => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setRenamingId(null); }}
                                                    className="text-sm ui text-[var(--color-chalk)] bg-transparent border-b border-[var(--color-gold)]/40 outline-none"
                                                />
                                            ) : (
                                                <button
                                                    onClick={() => { setViewList(list); setMode('view'); }}
                                                    onDoubleClick={() => startRename(list.id, list.name)}
                                                    className="text-sm ui text-[rgb(var(--color-fg))]/70 hover:text-[rgb(var(--color-fg))]/90 transition-colors text-left"
                                                    title="Tap to view, double-tap to rename"
                                                >
                                                    {list.name}
                                                </button>
                                            )}
                                            <span className="text-[10px] ui text-[rgb(var(--color-fg))]/30">
                                                {list.words.length} {list.words.length === 1 ? 'word' : 'words'}
                                            </span>
                                        </div>

                                        {/* Word preview */}
                                        {preview && (
                                            <div className="text-[10px] ui text-[rgb(var(--color-fg))]/25 truncate mb-1.5">
                                                {preview}{list.words.length > 4 ? ` +${list.words.length - 4} more` : ''}
                                            </div>
                                        )}

                                        {/* Aggregate stats */}
                                        {stats.practiced > 0 && (
                                            <div className="text-[9px] ui text-[rgb(var(--color-fg))]/30 mb-2">
                                                {stats.practiced}/{list.words.length} practiced · {stats.accuracy}% accuracy{stats.mastered > 0 ? ` · ${stats.mastered} mastered` : ''}
                                            </div>
                                        )}

                                        <div className="flex gap-1.5">
                                            <button
                                                onClick={() => onPractice(list.id)}
                                                className="flex-1 py-1.5 rounded-lg text-[10px] ui text-[var(--color-gold)] bg-[var(--color-gold)]/10 hover:bg-[var(--color-gold)]/20 transition-colors"
                                            >
                                                Practice
                                            </button>
                                            <button
                                                onClick={() => onDuplicate(list.id)}
                                                className="px-2 py-1.5 rounded-lg text-[rgb(var(--color-fg))]/30 hover:text-[rgb(var(--color-fg))]/60 hover:bg-[rgb(var(--color-fg))]/5 transition-colors"
                                                title="Duplicate list"
                                            >
                                                <IconCopy className="w-3.5 h-3.5" />
                                            </button>
                                            {confirmDeleteId === list.id ? (
                                                <div className="flex gap-1">
                                                    <button
                                                        onClick={() => { onDelete(list.id); setConfirmDeleteId(null); }}
                                                        className="px-2 py-1.5 rounded-lg text-[10px] ui text-white bg-[var(--color-wrong)]/80 hover:bg-[var(--color-wrong)] transition-colors"
                                                    >
                                                        Confirm
                                                    </button>
                                                    <button
                                                        onClick={() => setConfirmDeleteId(null)}
                                                        className="px-2 py-1.5 rounded-lg text-[10px] ui text-[rgb(var(--color-fg))]/40 hover:text-[rgb(var(--color-fg))]/60 transition-colors"
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => setConfirmDeleteId(list.id)}
                                                    className="px-2 py-1.5 rounded-lg text-[10px] ui text-[var(--color-wrong)]/60 hover:text-[var(--color-wrong)] hover:bg-[var(--color-wrong)]/10 transition-colors"
                                                >
                                                    Delete
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {lists.length < maxLists && (
                        <Button className="w-full" onClick={() => setMode('create')}>
                            + Create List
                        </Button>
                    )}
                    {lists.length >= maxLists && (
                        <div className="text-[10px] ui text-[rgb(var(--color-fg))]/25 text-center mt-2">
                            Maximum {maxLists} lists reached
                        </div>
                    )}
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

                    <WordAutocomplete
                        onAddWord={handleAddToCreate}
                        existingWords={createExisting}
                        placeholder="Search 117K words..."
                    />

                    {/* Added words as chips */}
                    {newWords.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-3">
                            {newWords.map(w => (
                                <span key={w.word} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[rgb(var(--color-fg))]/5 text-[10px] ui text-[rgb(var(--color-fg))]/60">
                                    {w.word}
                                    {w.enriched && <span className="text-[var(--color-correct)]/50">✓</span>}
                                    <button onClick={() => handleRemoveFromCreate(w.word)} className="ml-0.5 text-[rgb(var(--color-fg))]/30 hover:text-[var(--color-wrong)] transition-colors">×</button>
                                </span>
                            ))}
                        </div>
                    )}

                    {/* Bulk paste toggle */}
                    <button
                        onClick={() => setShowBulkPaste(!showBulkPaste)}
                        className="text-[10px] ui text-[rgb(var(--color-fg))]/30 hover:text-[rgb(var(--color-fg))]/50 transition-colors mb-2"
                    >
                        {showBulkPaste ? 'Hide' : 'Or'} bulk paste words
                    </button>
                    {showBulkPaste && (
                        <textarea
                            value={bulkText}
                            onChange={e => setBulkText(e.target.value)}
                            placeholder="Paste words (comma or newline separated)"
                            rows={4}
                            className="w-full bg-[rgb(var(--color-fg))]/5 border border-[rgb(var(--color-fg))]/10 rounded-xl px-3 py-2.5 text-sm ui text-[var(--color-chalk)] placeholder:text-[rgb(var(--color-fg))]/15 outline-none mb-3 resize-none"
                        />
                    )}

                    <div className="text-[10px] ui text-[rgb(var(--color-fg))]/25 mb-3 text-center">
                        Words found in our bank will be auto-enriched with definitions and distractors
                    </div>
                    <div className="flex gap-2">
                        <Button variant="ghost" className="flex-1" onClick={() => { setMode('browse'); setNewWords([]); setNewName(''); setBulkText(''); setShowBulkPaste(false); }}>
                            Cancel
                        </Button>
                        <Button className="flex-1" onClick={handleCreate} disabled={!newName.trim() || (newWords.length === 0 && !bulkText.trim())}>
                            Create ({newWords.length + (bulkText.trim() ? bulkText.split(/[,\n]+/).filter(w => w.trim()).length : 0)} words)
                        </Button>
                    </div>
                </>
            )}

            {/* ── View mode ── */}
            {mode === 'view' && currentViewList && (
                <>
                    {/* Autocomplete to add more words */}
                    <WordAutocomplete
                        onAddWord={(word) => onAddWord(currentViewList.id, word)}
                        existingWords={viewExisting}
                        placeholder="Add more words..."
                    />

                    {/* List-level stats */}
                    {(() => {
                        const stats = getListStats(currentViewList);
                        if (stats.practiced === 0) return null;
                        return (
                            <div className="text-[10px] ui text-[rgb(var(--color-fg))]/35 text-center mb-3">
                                {stats.practiced}/{currentViewList.words.length} practiced · {stats.accuracy}% accuracy{stats.mastered > 0 ? ` · ${stats.mastered} mastered` : ''}
                            </div>
                        );
                    })()}

                    <div className="space-y-1 mb-4 max-h-[40vh] overflow-y-auto custom-scrollbar">
                        {currentViewList.words.map(w => {
                            const record = wordRecords[w.word.toLowerCase()];
                            const isExpanded = expandedWord === w.word;
                            const wordAccuracy = record && record.attempts > 0 ? Math.round((record.correct / record.attempts) * 100) : null;

                            return (
                                <div key={w.word} className="rounded-lg bg-[rgb(var(--color-fg))]/[0.02] overflow-hidden">
                                    <button
                                        onClick={() => setExpandedWord(isExpanded ? null : w.word)}
                                        className="w-full flex items-center gap-2 px-2.5 py-2 text-left"
                                    >
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-xs ui font-medium text-[rgb(var(--color-fg))]/60">{w.word}</span>
                                                {w.partOfSpeech && (
                                                    <span className="text-[8px] ui italic text-[rgb(var(--color-fg))]/25">{w.partOfSpeech}</span>
                                                )}
                                            </div>
                                            {w.definition && (
                                                <div className="text-[10px] ui text-[rgb(var(--color-fg))]/30 truncate">{w.definition}</div>
                                            )}
                                        </div>

                                        {/* Per-word stats */}
                                        {wordAccuracy !== null ? (
                                            <span className={`text-[9px] ui font-medium ${BOX_COLORS[Math.min(record!.box, 4)]}`}>
                                                {wordAccuracy}%
                                            </span>
                                        ) : (
                                            <span className="text-[9px] ui text-[rgb(var(--color-fg))]/15">—</span>
                                        )}

                                        <IconChevronDown className={`w-3 h-3 text-[rgb(var(--color-fg))]/20 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                    </button>

                                    {/* Expanded detail */}
                                    <AnimatePresence>
                                        {isExpanded && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                transition={{ duration: 0.2 }}
                                                className="overflow-hidden"
                                            >
                                                <div className="px-2.5 pb-2.5 space-y-1.5">
                                                    {w.definition && (
                                                        <div className="text-[10px] ui text-[rgb(var(--color-fg))]/40">
                                                            <span className="font-medium text-[rgb(var(--color-fg))]/50">Definition: </span>{w.definition}
                                                        </div>
                                                    )}
                                                    {w.exampleSentence && (
                                                        <div className="text-[10px] ui text-[rgb(var(--color-fg))]/35 italic">
                                                            &ldquo;{w.exampleSentence}&rdquo;
                                                        </div>
                                                    )}
                                                    {w.pronunciation && (
                                                        <div className="text-[10px] ui text-[rgb(var(--color-fg))]/30">
                                                            /{w.pronunciation}/
                                                        </div>
                                                    )}
                                                    {w.difficulty && (
                                                        <div className="text-[10px] ui text-[rgb(var(--color-fg))]/30">
                                                            Difficulty: {w.difficulty}/10
                                                        </div>
                                                    )}

                                                    {/* Leitner stats */}
                                                    {record && record.attempts > 0 ? (
                                                        <div className="text-[9px] ui text-[rgb(var(--color-fg))]/30 flex items-center gap-2">
                                                            <span className={BOX_COLORS[Math.min(record.box, 4)]}>{BOX_LABELS[Math.min(record.box, 4)]}</span>
                                                            <span>·</span>
                                                            <span>{record.correct}/{record.attempts} correct</span>
                                                        </div>
                                                    ) : (
                                                        <div className="text-[9px] ui text-[rgb(var(--color-fg))]/20">Not practiced yet</div>
                                                    )}

                                                    <button
                                                        onClick={() => { onRemoveWord(currentViewList.id, w.word); setExpandedWord(null); }}
                                                        className="text-[9px] ui text-[var(--color-wrong)]/50 hover:text-[var(--color-wrong)] transition-colors"
                                                    >
                                                        Remove word
                                                    </button>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            );
                        })}
                    </div>

                    <div className="flex gap-2">
                        <Button variant="ghost" className="flex-1" onClick={() => { setMode('browse'); setViewList(null); setExpandedWord(null); }}>
                            Back
                        </Button>
                        <Button className="flex-1" onClick={() => onPractice(currentViewList.id)}>
                            Practice
                        </Button>
                    </div>
                </>
            )}

            <Button variant="ghost" className="w-full mt-3" onClick={onClose}>
                Close
            </Button>
        </ModalShell>
    );
});
