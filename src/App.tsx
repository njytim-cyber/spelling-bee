import { useState, useEffect, useRef, useCallback, useMemo, lazy, Suspense } from 'react';
import type { PanInfo } from 'framer-motion';
import { AnimatePresence, motion } from 'framer-motion';
import { BlackboardLayout } from './components/BlackboardLayout';
import { ProblemView } from './components/ProblemView';
import { BeeBuddy } from './components/BeeBuddy';
import { ScoreCounter } from './components/ScoreCounter';
import { BottomNav } from './components/BottomNav';
import { ActionButtons } from './components/ActionButtons';
import { SwipeTrail } from './components/SwipeTrail';
import type { SpellingBand } from './domains/spelling/spellingCategories';
import { defaultTypeForBand, typesForBand, SPELLING_AGE_BANDS, SPELLING_BAND_LABELS } from './domains/spelling/spellingCategories';
import { useAutoSummary, usePersonalBest } from './hooks/useSessionUI';
import { OfflineBanner } from './components/OfflineBanner';
import { ReloadPrompt } from './components/ReloadPrompt';
/** Retry a dynamic import once on chunk-load failure (Cloudflare Pages cache busting) */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function lazyRetry<T extends Record<string, any>>(factory: () => Promise<T>): Promise<T> {
  return factory().catch(() => {
    const key = 'chunk-reload';
    if (!sessionStorage.getItem(key)) {
      sessionStorage.setItem(key, '1');
      window.location.reload();
    }
    return factory();
  });
}

const LeaguePage = lazy(() => lazyRetry(() => import('./components/LeaguePage')).then(m => ({ default: m.LeaguePage })));
const MePage = lazy(() => lazyRetry(() => import('./components/MePage')).then(m => ({ default: m.MePage })));
const TricksPage = lazy(() => lazyRetry(() => import('./components/TricksPage')).then(m => ({ default: m.TricksPage })));

import { useGameLoop } from './hooks/useGameLoop';
import { useStats } from './hooks/useStats';
import { loadUnlocked, saveUnlocked, checkAchievements, restoreUnlockedFromCloud } from './utils/achievements';
import { EVERY_SPELLING_ACHIEVEMENT } from './domains/spelling/spellingAchievements';
import { SessionSummary } from './components/SessionSummary';
import { WeeklyRecap } from './components/WeeklyRecap';
import { CHALK_THEMES, applyTheme, type ChalkTheme } from './utils/chalkThemes';
import { applyMode } from './hooks/useThemeMode';
import { useLocalState } from './hooks/useLocalState';
import { useFirebaseAuth } from './hooks/useFirebaseAuth';
import { collection, query, where, onSnapshot, doc, updateDoc, orderBy, limit } from 'firebase/firestore';
import { db } from './utils/firebase';
import { generateSpellingItem } from './domains/spelling/spellingGenerator';
import { generateChallenge } from './utils/dailyChallenge';
import { useWordHistory } from './hooks/useWordHistory';
import { BeeSimPage } from './components/BeeSimPage';
import { TournamentSummary } from './components/TournamentSummary';
import { SPELLING_MESSAGE_OVERRIDES } from './domains/spelling/spellingMessages';
import type { SpellingCategory } from './domains/spelling/spellingCategories';
import type { EngineItem } from './engine/domain';
import { STORAGE_KEYS, FIRESTORE } from './config';

type Tab = 'game' | 'league' | 'me' | 'magic';
const TAB_ORDER: Tab[] = ['game', 'league', 'magic', 'me'];
type QuestionType = SpellingCategory; // local alias for engine compatibility

/**
 * Creates a band-aware item generator closure.
 * The closure captures the current ageBand so the word difficulty is capped.
 */
function makeGenerateItem(band: string) {
  return (
    difficulty: number,
    categoryId: string,
    hardMode: boolean,
    rng?: () => number,
  ): EngineItem => generateSpellingItem(difficulty, categoryId, hardMode, rng, band);
}

/**
 * Creates a band-aware finite-set generator for daily / challenge modes.
 */
function makeGenerateFiniteSet(band: string) {
  return (categoryId: string, challengeId: string | null): EngineItem[] => {
    if (challengeId) {
      return generateChallenge(challengeId);
    }
    return Array.from({ length: 10 }, (_, i) =>
      generateSpellingItem(2 + Math.floor(i / 4), categoryId || 'mix', false, undefined, band)
    );
  };
}

function LoadingFallback() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <motion.div
        className="text-lg chalk text-[var(--color-chalk)]/50"
        animate={{ opacity: [0.3, 1, 0.3] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      >
        Loading...
      </motion.div>
    </div>
  );
}

function App() {
  const { user, loading: authLoading, setDisplayName, linkGoogle, sendEmailLink } = useFirebaseAuth();
  const uid = user?.uid ?? null;

  const [activeTab, setActiveTab] = useState<Tab>('game');
  const [isMagicLessonActive, setIsMagicLessonActive] = useState(false);
  const [hardMode, setHardMode] = useState(false);
  const [timedMode, setTimedMode] = useState(false);

  // ── Check URL for challenge link ──
  const [challengeId] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    const c = params.get('c');
    if (c) {
      // Clean URL so refresh doesn't re-trigger
      window.history.replaceState({}, '', window.location.pathname);
    }
    return c;
  });
  const [questionType, setQuestionTypeRaw] = useState<QuestionType>(
    challengeId ? 'challenge' : 'cvc'
  );

  // ── Tournament state (must be before setQuestionType wrapper) ──
  const [tournamentRound, setTournamentRound] = useState(0);
  const [tournamentEliminated, setTournamentEliminated] = useState(false);

  // Wrap setter to reset tournament state when entering tournament mode
  const setQuestionType = useCallback((type: QuestionType) => {
    if (type === 'tournament') {
      setTournamentRound(0);
      setTournamentEliminated(false);
    }
    setQuestionTypeRaw(type);
  }, []);

  const { stats, accuracy, recordSession, resetStats, updateCosmetics, updateBestSpeedrunTime, updateBadge, consumeShield } = useStats(uid);

  // ── Age Band (must be above useGameLoop so generators can capture it) ──
  const [ageBand, setAgeBand] = useLocalState(STORAGE_KEYS.ageBand, 'starter' as SpellingBand, uid) as [SpellingBand, (v: SpellingBand) => void];

  // ── Word history (Leitner spaced repetition) ──
  const { records: wordRecords, recordAttempt, reviewQueue, weakCategories, masteredCount } = useWordHistory();

  const onAnswer = useCallback((item: EngineItem, correct: boolean, responseTimeMs: number) => {
    const word = item.meta?.['word'] as string | undefined;
    if (word) recordAttempt(word, item.meta?.['category'] as string ?? 'mix', correct, responseTimeMs);
    // Tournament elimination
    if (questionType === 'tournament') {
      if (correct) {
        setTournamentRound(r => r + 1);
      } else {
        setTournamentEliminated(true);
      }
    }
  }, [recordAttempt, questionType]);

  // Band-aware generators — closures that capture the current ageBand + review queue
  const generateItem = useMemo(() => makeGenerateItem(ageBand), [ageBand]);
  const generateFiniteSet = useMemo(() => {
    const baseFn = makeGenerateFiniteSet(ageBand);
    return (categoryId: string, challengeId: string | null): EngineItem[] => {
      if (categoryId === 'review' && reviewQueue.length > 0) {
        // Generate items from the review queue words
        return reviewQueue.slice(0, 10).map(r =>
          generateSpellingItem(3, r.category || 'mix', false, undefined, ageBand)
        );
      }
      return baseFn(categoryId, challengeId);
    };
  }, [ageBand, reviewQueue]);

  const {
    problems,
    score,
    streak,
    bestStreak,
    totalCorrect,
    totalAnswered,
    answerHistory,
    chalkState,
    flash,
    frozen,
    milestone,
    speedBonus,
    handleSwipe,
    timerProgress,
    dailyComplete,
    speedrunFinalTime,
    speedrunElapsed,
    shieldBroken,
  } = useGameLoop(
    generateItem,
    questionType,
    hardMode,
    challengeId,
    timedMode,
    stats.streakShields,
    consumeShield,
    undefined, // use DEFAULT_GAME_CONFIG
    generateFiniteSet,
    onAnswer,
  );

  // ── Shield consumed toast ──
  const [shieldToast, setShieldToast] = useState(false);
  useEffect(() => {
    if (shieldBroken) {
      queueMicrotask(() => {
        setShieldToast(true);
        const t = setTimeout(() => setShieldToast(false), 3000);
        return () => clearTimeout(t);
      });
    }
  }, [shieldBroken]);

  const currentProblem = problems[0];
  const isFirstQuestion = totalAnswered === 0;
  const toggleHardMode = useCallback(() => setHardMode(h => !h), []);
  const toggleTimedMode = useCallback(() => setTimedMode(t => !t), []);

  // ── Score floater ──
  const prevScoreRef = useRef(0);
  const [pointsFloater, setPointsFloater] = useState(0);
  useEffect(() => {
    const delta = score - prevScoreRef.current;
    prevScoreRef.current = score;
    if (delta > 0) {
      setPointsFloater(delta);
      const t = setTimeout(() => setPointsFloater(0), 800);
      return () => clearTimeout(t);
    }
  }, [score]);

  const sessionAccuracy = useMemo(() =>
    answerHistory.length > 0
      ? Math.round(answerHistory.filter(Boolean).length / answerHistory.length * 100)
      : 0,
    [answerHistory]
  );

  // ── Session summary (auto-show on daily/speedrun finish) ──
  const { showSummary, setShowSummary, isNewSpeedrunRecord } = useAutoSummary(
    dailyComplete, speedrunFinalTime, stats.bestSpeedrunTime, updateBestSpeedrunTime, hardMode
  );

  // ── Ping Listener (Async Taunts) ──
  const [pingMessage, setPingMessage] = useState<string | null>(null);
  useEffect(() => {
    if (!uid) return;
    const q = query(
      collection(db, FIRESTORE.PINGS),
      where('targetUid', '==', uid),
      where('read', '==', false),
      orderBy('createdAt', 'desc'),
      limit(1)
    );
    const unsub = onSnapshot(q, (snap) => {
      if (!snap.empty) {
        const pingDoc = snap.docs[0];
        const data = pingDoc.data();
        setPingMessage(`${data.senderName} challenged you! ⚔️`);

        // Mark as read so it doesn't pop again
        updateDoc(doc(db, 'pings', pingDoc.id), { read: true }).catch(console.error);

        // Clear after 6 seconds
        setTimeout(() => setPingMessage(null), 6000);
      }
    });
    return unsub;
  }, [uid]);

  // Track previous tab for session recording (handled in handleTabChange)
  const prevTab = useRef<Tab>('game');
  useEffect(() => {
    prevTab.current = activeTab;
  }, [activeTab]);

  // ── Achievements ──
  const [unlocked, setUnlocked] = useState(() => loadUnlocked());
  const unlockedRef = useRef(unlocked);
  useEffect(() => { unlockedRef.current = unlocked; }, [unlocked]);
  const [unlockToast, setUnlockToast] = useState('');

  // Restore achievements from Firestore on auth
  useEffect(() => {
    if (!uid) return;
    restoreUnlockedFromCloud(uid).then(restored => {
      if (restored) {
        setUnlocked(restored);
        unlockedRef.current = restored;
      }
    });
  }, [uid]);

  // Check achievements whenever navigating away from game (i.e. stats recorded)
  useEffect(() => {
    const snap = {
      ...stats,
      bestStreak: Math.max(stats.bestStreak, bestStreak),
      // New achievement stats from word history & modes
      masteredWordCount: masteredCount,
      reviewedWords: Object.values(wordRecords).reduce((sum, r) => sum + r.attempts, 0),
      beeSessions: 0, // tracked per-session, not persisted yet
      beeNoHelpStreak: 0,
      beeBestRun: 0,
      bestTournamentRound: tournamentRound,
      tournamentSessions: 0,
    };
    const fresh = checkAchievements(EVERY_SPELLING_ACHIEVEMENT, snap, unlockedRef.current);
    if (fresh.length > 0) {
      const next = new Set(unlockedRef.current);
      fresh.forEach(id => next.add(id));
      setUnlocked(next);
      saveUnlocked(next, uid);
      // Show toast for first new unlock
      const badge = EVERY_SPELLING_ACHIEVEMENT.find(a => a.id === fresh[0]);
      if (badge) {
        setUnlockToast(badge.name);
        const t = setTimeout(() => setUnlockToast(''), 2500);
        return () => clearTimeout(t);
      }
    }
  }, [stats, bestStreak, uid, masteredCount, tournamentRound, wordRecords]);

  // ── Personal best detection ──
  const showPB = usePersonalBest(bestStreak, stats.bestStreak);

  const handleTabChange = useCallback((tab: Tab) => {
    if (prevTab.current === 'game' && tab !== 'game' && totalAnswered > 0) {
      recordSession(score, totalCorrect, totalAnswered, bestStreak, questionType, hardMode, timedMode);
      setShowSummary(true);
    }
    setActiveTab(tab);
  }, [score, totalCorrect, totalAnswered, bestStreak, questionType, recordSession, hardMode, timedMode, setShowSummary]);

  // ── Tab swipe (non-game tabs only) ──
  const handleTabSwipe = useCallback((_: unknown, info: PanInfo) => {
    if (isMagicLessonActive) return;
    if (activeTab === 'game') return; // game uses horizontal swipe for answers
    const t = 80;
    const idx = TAB_ORDER.indexOf(activeTab);
    if ((info.offset.x < -t || info.velocity.x < -400) && idx < TAB_ORDER.length - 1) {
      handleTabChange(TAB_ORDER[idx + 1]);
    } else if ((info.offset.x > t || info.velocity.x > 400) && idx > 0) {
      handleTabChange(TAB_ORDER[idx - 1]);
    }
  }, [activeTab, handleTabChange, isMagicLessonActive]);

  const [activeCostume, handleCostumeChange] = useLocalState(STORAGE_KEYS.costume, '', uid);
  const [activeTrailId, handleTrailChange] = useLocalState(STORAGE_KEYS.trail, '', uid);

  // ── Chalk themes ──
  const [activeThemeId, setActiveThemeId] = useLocalState(STORAGE_KEYS.chalkTheme, 'classic', uid);
  useEffect(() => {
    const t = CHALK_THEMES.find(th => th.id === activeThemeId);
    if (t) applyTheme(t);
  }, [activeThemeId]); // themeMode dep added below after declaration

  // Persist cosmetics to Firebase payload
  useEffect(() => {
    if (!uid) return;
    updateCosmetics(activeThemeId as string, activeCostume as string, activeTrailId as string);
  }, [uid, activeThemeId, activeCostume, activeTrailId, updateCosmetics]);

  const handleThemeChange = useCallback((t: ChalkTheme) => setActiveThemeId(t.id), [setActiveThemeId]);

  // ── Theme mode (dark/light) ──
  const [themeMode, setThemeMode] = useLocalState(STORAGE_KEYS.theme, 'dark', uid);
  useEffect(() => {
    applyMode(themeMode as 'dark' | 'light');
    // Re-apply chalk theme colours for the new mode (dark uses .color, light uses .lightColor)
    const t = CHALK_THEMES.find(th => th.id === activeThemeId);
    if (t) applyTheme(t);
  }, [themeMode, activeThemeId]);
  const toggleThemeMode = useCallback(() => {
    setThemeMode(themeMode === 'dark' ? 'light' : 'dark');
  }, [themeMode, setThemeMode]);
  // (ageBand is declared above useGameLoop)

  // ── Practice focus: find lowest-accuracy topic ──
  const levelUpSuggestion = useMemo(() => {
    const available = typesForBand(ageBand).filter(t => t.id !== 'speedrun' && t.id !== 'challenge');
    let worst: { type: QuestionType; acc: number; label: string } | null = null;
    for (const t of available) {
      const s = stats.byType[t.id];
      if (!s || s.solved < 5) continue;
      const acc = s.correct / s.solved;
      if (!worst || acc < worst.acc) worst = { type: t.id as QuestionType, acc, label: t.label };
    }
    return worst && worst.acc < 0.8 ? worst : null;
  }, [stats.byType, ageBand]);  // SpellingBand-aware via spelling typesForBand
  const handleBandChange = useCallback((band: SpellingBand) => {
    setAgeBand(band);
    // Reset to the band's default type if current type isn't in the new band
    const available = typesForBand(band);
    if (!available.some(t => t.id === questionType)) {
      setQuestionType(defaultTypeForBand(band));
    }
  }, [questionType, setAgeBand, setQuestionType]);

  // Show loading screen while Firebase auth initializes
  if (authLoading) {
    return <BlackboardLayout><LoadingFallback /></BlackboardLayout>;
  }

  return (
    <>

      <BlackboardLayout>
        <OfflineBanner />
        <ReloadPrompt suppress={activeTab === 'game'} />
        {/* ── Global Canvas Overlay (Swipe Trail) ── */}
        <SwipeTrail
          streak={streak}
          activeTrailId={activeTrailId as string}
          baseColor={CHALK_THEMES.find(t => t.id === activeThemeId)?.color}
        />

        {/* ── Top-right controls (band picker + theme toggle) — game tab only ── */}
        {activeTab === 'game' && (
          <div className="absolute top-[calc(env(safe-area-inset-top,12px)+12px)] right-4 z-50 flex items-center gap-2">
            <button
              onClick={() => {
                const idx = SPELLING_AGE_BANDS.indexOf(ageBand);
                handleBandChange(SPELLING_AGE_BANDS[(idx + 1) % SPELLING_AGE_BANDS.length]);
              }}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[rgb(var(--color-fg))]/50 active:text-[var(--color-gold)] transition-colors"
              aria-label="Change difficulty band"
            >
              <span className="text-base">{SPELLING_BAND_LABELS[ageBand].emoji}</span>
              <span className="text-[10px] ui">{SPELLING_BAND_LABELS[ageBand].label}</span>
            </button>
            <button
              onClick={toggleThemeMode}
              className="w-9 h-9 flex items-center justify-center text-[rgb(var(--color-fg))]/60 active:text-[var(--color-gold)] transition-colors"
              aria-label="Toggle theme"
            >
              {themeMode === 'light' ? (
                <motion.svg
                  viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                >
                  <circle cx="12" cy="12" r="5" />
                  <line x1="12" y1="1" x2="12" y2="3" />
                  <line x1="12" y1="21" x2="12" y2="23" />
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                  <line x1="1" y1="12" x2="3" y2="12" />
                  <line x1="21" y1="12" x2="23" y2="12" />
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                </motion.svg>
              ) : (
                <motion.svg
                  viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  animate={{ rotate: [0, -8, 8, -5, 5, 0] }}
                  transition={{ duration: 4, repeat: Infinity, repeatDelay: 3, ease: 'easeInOut' }}
                >
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </motion.svg>
              )}
            </button>
          </div>
        )}

        {activeTab === 'game' && (
          <div ref={(el) => {
            // Restart CSS animation without remounting entire subtree
            if (el && (flash === 'wrong' || flash === 'correct')) {
              el.classList.remove('wrong-shake', 'answer-bounce');
              void el.offsetHeight; // force reflow
              el.classList.add(flash === 'wrong' && !shieldBroken ? 'wrong-shake' : flash === 'correct' ? 'answer-bounce' : '');
            }
          }} className="flex-1 flex flex-col w-full">
            {/* ── Score (centered, pushed down from edge) ── */}
            <div className="landscape-score flex flex-col items-center pt-[calc(env(safe-area-inset-top,16px)+40px)] pb-6 z-30">
              {/* Challenge header */}
              {questionType === 'challenge' && (
                <div className="text-xs ui text-[var(--color-gold)] mb-2 flex items-center gap-2">
                  <span>⚔️ Challenge</span>
                  <span className="text-[rgb(var(--color-fg))]/30">·</span>
                  <span className="text-[rgb(var(--color-fg))]/40">{totalAnswered}/10</span>
                </div>
              )}
              {questionType === 'speedrun' && (
                <div className="text-xs ui text-[#FF00FF] mb-2 flex items-center gap-2">
                  <span>⏱️ Speedrun</span>
                  <span className="text-[rgb(var(--color-fg))]/30">·</span>
                  <span className="text-[rgb(var(--color-fg))]/40">{totalCorrect}/10</span>
                </div>
              )}
              {questionType === 'speedrun' ? (
                <div className="chalk text-[#FF00FF] text-7xl leading-none tabular-nums">
                  {((speedrunFinalTime ?? speedrunElapsed) / 1000).toFixed(1)}<span className="text-3xl">s</span>
                </div>
              ) : (
                <ScoreCounter value={score} />
              )}

              {/* Shield count */}
              {/* Screen reader announcement for game feedback */}
              <div className="sr-only" role="status" aria-live="assertive">
                {flash === 'correct' && `Correct! Streak: ${streak}`}
                {flash === 'wrong' && (shieldBroken ? 'Wrong! Shield used, streak saved.' : 'Wrong! Streak reset.')}
                {milestone && `Milestone: ${milestone}`}
              </div>
              {stats.streakShields > 0 && streak > 0 && (
                <div className="text-[10px] ui text-[rgb(var(--color-fg))]/30 mt-1 flex items-center gap-0.5">
                  {'🛡️'.repeat(stats.streakShields)}
                </div>
              )}

              {/* Streak display */}
              <AnimatePresence>
                {streak > 1 && (
                  <motion.div
                    key="streak"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="mt-2 flex items-center gap-1"
                  >
                    {streak <= 5 ? (
                      /* Dots for small streaks */
                      <div className="flex gap-1">
                        {Array.from({ length: streak }, (_, i) => (
                          <motion.div
                            key={i}
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: i * 0.04 }}
                            className="w-2 h-2 rounded-full bg-[var(--color-gold)]/60"
                          />
                        ))}
                      </div>
                    ) : (
                      /* Multiplier label for 6+ */
                      <span
                        className={`text-sm ui font-semibold ${streak >= 10
                          ? 'text-[var(--color-streak-fire)] on-fire'
                          : 'text-[var(--color-gold)]'
                          }`}
                      >
                        {streak >= 10 ? `🔥 ${streak}×` : `${streak}×`}
                      </span>
                    )}
                    {/* Milestone pulse */}
                    {[5, 10, 20, 50].includes(streak) && (
                      <motion.div
                        key={`milestone-glow-${streak}`}
                        className="absolute inset-0 rounded-full pointer-events-none"
                        initial={{ scale: 1, opacity: 0.6 }}
                        animate={{ scale: 2.5, opacity: 0 }}
                        transition={{ duration: 0.6 }}
                        style={{ background: 'var(--color-gold)', filter: 'blur(8px)' }}
                      />
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Daily streak */}
              {stats.dayStreak > 0 && (
                <div className="mt-1 flex items-center justify-center gap-1 text-[10px] ui text-[rgb(var(--color-fg))]/25">
                  <span>🔥 Day {stats.dayStreak}</span>
                  {(stats.streakShields || 0) > 0 && (
                    <span className="text-[var(--color-gold)] opacity-80" title="Streak Freeze Active">
                      {'🛡️'.repeat(stats.streakShields)}
                    </span>
                  )}
                </div>
              )}
              {/* Level Up suggestion — only visible when idle */}
              {isFirstQuestion && levelUpSuggestion && questionType !== 'speedrun' && questionType !== 'challenge' && (
                <motion.button
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-2 flex items-center gap-2 text-[10px] ui text-[var(--color-gold)]/70 hover:text-[var(--color-gold)] transition-colors"
                  onClick={() => setQuestionType(levelUpSuggestion.type)}
                >
                  <span>🚀</span>
                  <span>Level up your {levelUpSuggestion.label}!</span>
                  <span className="text-[rgb(var(--color-fg))]/20">({Math.round(levelUpSuggestion.acc * 100)}%)</span>
                </motion.button>
              )}
              {/* Review queue callout — when words are due */}
              {isFirstQuestion && reviewQueue.length > 0 && questionType !== 'review' && questionType !== 'speedrun' && (
                <motion.button
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-1.5 flex items-center gap-2 text-[10px] ui text-[rgb(var(--color-fg))]/40 hover:text-[rgb(var(--color-fg))]/60 transition-colors"
                  onClick={() => setQuestionType('review' as QuestionType)}
                >
                  <span>📝</span>
                  <span>{reviewQueue.length} word{reviewQueue.length !== 1 ? 's' : ''} due for review</span>
                </motion.button>
              )}
              {/* Mastered words + weak category hints */}
              {isFirstQuestion && masteredCount > 0 && (
                <div className="mt-1 text-[9px] ui text-[rgb(var(--color-fg))]/20">
                  🐝 {masteredCount} word{masteredCount !== 1 ? 's' : ''} mastered
                  {weakCategories.length > 0 && (
                    <span> · Practice {weakCategories[0].category}</span>
                  )}
                </div>
              )}
              {/* Daily challenge callout — subtle, only when idle and not already on daily */}
              {isFirstQuestion && questionType !== 'daily' && questionType !== 'speedrun' && questionType !== 'challenge' && (
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="mt-1.5 text-[10px] ui text-[rgb(var(--color-fg))]/25 hover:text-[rgb(var(--color-fg))]/40 transition-colors"
                  onClick={() => setQuestionType('daily' as QuestionType)}
                >
                  📅 Daily challenge available
                </motion.button>
              )}
            </div>

            {/* ── Points earned floater ── */}
            <AnimatePresence>
              {pointsFloater > 0 && (
                <motion.div
                  key={'pts' + score}
                  initial={{ opacity: 1, y: 0 }}
                  animate={{ opacity: 0, y: -30 }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  className="absolute left-1/2 -translate-x-1/2 top-[calc(env(safe-area-inset-top,16px)+100px)] z-30 text-lg chalk text-[var(--color-gold)] pointer-events-none"
                >
                  +{pointsFloater}
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Main Problem Area ── */}
            <div className="flex-1 flex flex-col">
              {questionType === 'bee' ? (
                <BeeSimPage
                  band={ageBand}
                  onExit={() => setQuestionType('mix' as QuestionType)}
                  onAnswer={(word, correct, ms) => {
                    recordAttempt(word, 'bee', correct, ms);
                  }}
                />
              ) : questionType === 'tournament' && tournamentEliminated ? (
                <TournamentSummary
                  round={tournamentRound}
                  onRestart={() => {
                    setTournamentRound(0);
                    setTournamentEliminated(false);
                    setQuestionType('mix' as QuestionType);
                    // Brief delay then switch back to tournament to re-trigger
                    setTimeout(() => setQuestionType('tournament' as QuestionType), 50);
                  }}
                  onExit={() => {
                    setTournamentRound(0);
                    setTournamentEliminated(false);
                    setQuestionType('mix' as QuestionType);
                  }}
                />
              ) : (
                <AnimatePresence mode="wait">
                  {currentProblem && (
                    <motion.div
                      key={currentProblem.id}
                      className="flex-1 flex flex-col"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15, ease: 'easeOut' }}
                    >
                      <ProblemView
                        problem={currentProblem}
                        frozen={frozen}
                        highlightCorrect={isFirstQuestion}
                        showHints={totalCorrect < 4}
                        onSwipe={handleSwipe}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              )}
            </div>

            {/* ── TikTok-style action buttons ── */}
            <ActionButtons
              questionType={questionType}
              onTypeChange={setQuestionType}
              hardMode={hardMode}
              onHardModeToggle={toggleHardMode}
              timedMode={timedMode}
              onTimedModeToggle={toggleTimedMode}
              timerProgress={timerProgress}
              ageBand={ageBand}
            />

            {/* ── Bee Buddy PiP ── */}
            <div className="landscape-hide">
              <BeeBuddy state={chalkState} costume={activeCostume} streak={streak} totalAnswered={totalAnswered} questionType={questionType} hardMode={hardMode} timedMode={timedMode} pingMessage={pingMessage} messageOverrides={SPELLING_MESSAGE_OVERRIDES} />
            </div>

            {/* ── Feedback flash overlay ── */}
            {flash !== 'none' && (
              <div
                className={`absolute inset-0 pointer-events-none z-30 ${flash === 'correct' ? 'flash-correct' : 'flash-wrong'
                  }`}
              />
            )}

            {/* ── Streak milestone popup ── */}
            {milestone && (
              <div key={milestone + streak} className="milestone-pop absolute inset-0 flex items-center justify-center z-40 text-8xl">
                {milestone}
              </div>
            )}

            {/* ── Speed bonus ── */}
            {speedBonus && (
              <div key={'speed' + score} className="speed-pop absolute left-1/2 -translate-x-1/2 top-[30%] z-40 text-sm ui text-[var(--color-gold)] whitespace-nowrap">
                ⚡ SPEED BONUS +2
              </div>
            )}

            {/* ── Personal best ── */}
            <AnimatePresence>
              {showPB && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                  className="absolute left-1/2 -translate-x-1/2 top-[18%] z-40 text-lg chalk text-[var(--color-gold)] whitespace-nowrap"
                >
                  🏆 NEW PERSONAL BEST!
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Non-game tabs (no wrapper — each page scrolls independently) */}
        {activeTab === 'league' && (
          <motion.div className="flex-1 flex flex-col min-h-0" onPanEnd={handleTabSwipe}>
            <Suspense fallback={<LoadingFallback />}><LeaguePage userXP={stats.totalXP} userStreak={stats.bestStreak} uid={uid} displayName={user?.displayName ?? 'You'} activeThemeId={activeThemeId as string} activeCostume={activeCostume as string} bestSpeedrunTime={stats.bestSpeedrunTime} speedrunHardMode={stats.speedrunHardMode} onStartSpeedrun={() => { setQuestionType('speedrun'); setActiveTab('game'); }} /></Suspense>
          </motion.div>
        )}

        {activeTab === 'me' && (
          <motion.div className="flex-1 flex flex-col min-h-0" onPanEnd={handleTabSwipe}>
            <Suspense fallback={<LoadingFallback />}><MePage
              stats={stats}
              accuracy={accuracy}
              sessionScore={score}
              sessionStreak={bestStreak}
              onReset={resetStats}
              unlocked={unlocked}
              activeCostume={activeCostume}
              onCostumeChange={handleCostumeChange}
              activeTheme={activeThemeId}
              onThemeChange={handleThemeChange}
              activeTrailId={activeTrailId as string}
              onTrailChange={handleTrailChange}
              displayName={user?.displayName ?? ''}
              onDisplayNameChange={setDisplayName}
              isAnonymous={user?.isAnonymous ?? true}
              onLinkGoogle={linkGoogle}
              onSendEmailLink={sendEmailLink}
              ageBand={ageBand}
              activeBadge={stats.activeBadgeId || ''}
              onBadgeChange={updateBadge}
              wordRecords={wordRecords}
            /></Suspense>
          </motion.div>
        )}

        {activeTab === 'magic' && (
          <motion.div className="flex-1 flex flex-col min-h-0" onPanEnd={!isMagicLessonActive ? handleTabSwipe : undefined}>
            <Suspense fallback={<LoadingFallback />}><TricksPage onLessonActive={setIsMagicLessonActive} /></Suspense>
          </motion.div>
        )}

        {/* ── Bottom Navigation ── */}
        <BottomNav active={activeTab} onChange={handleTabChange} />

        {/* ── Session Summary ── */}
        <SessionSummary
          solved={totalAnswered}
          correct={totalCorrect}
          bestStreak={bestStreak}
          accuracy={sessionAccuracy}
          xpEarned={score}
          answerHistory={answerHistory}
          questionType={questionType}
          visible={showSummary}
          onDismiss={() => {
            setShowSummary(false);
            if (questionType === 'speedrun') {
              // Record session stats before leaving (can't use handleTabChange — it re-shows summary)
              if (totalAnswered > 0) {
                recordSession(score, totalCorrect, totalAnswered, bestStreak, questionType, hardMode, timedMode);
              }
              setActiveTab('league');
              setQuestionType(defaultTypeForBand(ageBand) as QuestionType);
            }
          }}
          hardMode={hardMode}
          timedMode={timedMode}
          speedrunFinalTime={speedrunFinalTime}
          isNewSpeedrunRecord={isNewSpeedrunRecord}
        />

        {/* ── Weekly recap (first open of the week) ── */}
        <WeeklyRecap stats={stats} />

        {/* ── Achievement unlock toast ── */}
        <AnimatePresence>
          {unlockToast && (
            <motion.div
              key={unlockToast}
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              transition={{ duration: 0.3 }}
              className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-[var(--color-overlay)] border border-[var(--color-gold)]/30 rounded-2xl px-5 py-3 flex items-center gap-3"
            >
              <span className="text-2xl">🏅</span>
              <div>
                <div className="text-xs ui text-[rgb(var(--color-fg))]/40">Achievement Unlocked!</div>
                <div className="text-sm chalk text-[var(--color-gold)]">{unlockToast}</div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Streak shield consumed toast ── */}
        <AnimatePresence>
          {shieldToast && (
            <motion.div
              key="shield-toast"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              transition={{ duration: 0.3 }}
              className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-[var(--color-overlay)] border border-[var(--color-gold)]/30 rounded-2xl px-5 py-3 flex items-center gap-3"
            >
              <span className="text-2xl">🛡️</span>
              <div>
                <div className="text-xs ui text-[rgb(var(--color-fg))]/40">Streak Saved!</div>
                <div className="text-sm chalk text-[var(--color-gold)]">Shield protected your streak</div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </BlackboardLayout>
    </>
  );
}

export default App;
