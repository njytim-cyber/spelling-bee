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
import type { SpellingCategory, GradeLevel } from './domains/spelling/spellingCategories';
import { getGradeConfig } from './domains/spelling/spellingCategories';
import { OnboardingModal } from './components/OnboardingModal';
import { useAutoSummary, usePersonalBest } from './hooks/useSessionUI';
import { OfflineBanner } from './components/OfflineBanner';
import { ReloadPrompt } from './components/ReloadPrompt';
import { UserProvider, useUser } from './contexts/UserContext';
import { useAppModals } from './hooks/useAppModals';
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

import { useGameLoop } from './hooks/useGameLoop';
import { loadUnlocked, saveUnlocked, checkAchievements, restoreUnlockedFromCloud } from './utils/achievements';
import { EVERY_SPELLING_ACHIEVEMENT } from './domains/spelling/spellingAchievements';
import { SessionSummary } from './components/SessionSummary';
import { WeeklyRecap } from './components/WeeklyRecap';
import { CHALK_THEMES, applyTheme } from './utils/chalkThemes';
import { applyMode } from './hooks/useThemeMode';
import { useLocalState } from './hooks/useLocalState';
import { useFirebaseAuth } from './hooks/useFirebaseAuth';
import { collection, query, where, onSnapshot, doc, updateDoc, orderBy, limit } from 'firebase/firestore';
import { db } from './utils/firebase';
import { generateSpellingItem, generateItemForWord } from './domains/spelling/spellingGenerator';
import { generateVocabItem } from './domains/spelling/vocabGenerator';
import { generateRootQuizItem } from './domains/spelling/rootsGenerator';
import { generateEtymologyItem } from './domains/spelling/etymologyGenerator';
import { generateChallenge } from './utils/dailyChallenge';
import { useWordHistory } from './hooks/useWordHistory';
import type { WordRecord } from './hooks/useWordHistory';
import { WORD_ROOTS } from './domains/spelling/words/roots';
import { PathPage } from './components/PathPage';
import { BeeSimPage } from './components/BeeSimPage';
import { WrittenTestPage } from './components/WrittenTestPage';
const GuidedSpellingPage = lazy(() => lazyRetry(() => import('./components/GuidedSpellingPage')).then(m => ({ default: m.GuidedSpellingPage })));
import { MultiplayerLobby } from './components/MultiplayerLobby';
import { MultiplayerMatch } from './components/MultiplayerMatch';
import { useMultiplayerRoom } from './hooks/useMultiplayerRoom';
import { useCustomLists } from './hooks/useCustomLists';
import { CustomListsModal } from './components/CustomListsModal';
import { Toast } from './components/Toast';
import { generateCustomItem } from './domains/spelling/customGenerator';
import { SPELLING_MESSAGE_OVERRIDES } from './domains/spelling/spellingMessages';
import { DEFAULT_GAME_CONFIG, type EngineItem } from './engine/domain';
import { STORAGE_KEYS, FIRESTORE, NAV_TABS } from './config';
import { ensureAllTiers, getRegistryVersion, setDialect } from './domains/spelling/words';
import type { Dialect } from './domains/spelling/words';
import { DailyChallengeComplete } from './components/DailyChallengeComplete';
import { isDailyComplete, saveDailyResult } from './utils/dailyTracking';

type Tab = 'game' | 'path' | 'league' | 'me';
const TAB_ORDER: Tab[] = ['game', 'path', 'league', 'me'];
const GAME_CONFIG = { ...DEFAULT_GAME_CONFIG, wrongAnswerTapToDismiss: true };
type QuestionType = SpellingCategory; // local alias for engine compatibility

function makeGenerateItem(customPool?: import('./types/customList').CustomWord[]) {
  return (
    difficulty: number,
    categoryId: string,
    hardMode: boolean,
    rng?: () => number,
  ): EngineItem => {
    if (categoryId === 'custom' && customPool && customPool.length > 0) {
      return generateCustomItem(customPool, difficulty, categoryId, hardMode, rng);
    }
    if (categoryId === 'vocab') return generateVocabItem(difficulty, categoryId, hardMode, rng);
    if (categoryId === 'roots') return generateRootQuizItem(difficulty, categoryId, hardMode, rng);
    if (categoryId === 'etymology') return generateEtymologyItem(difficulty, categoryId, hardMode, rng);
    return generateSpellingItem(difficulty, categoryId, hardMode, rng);
  };
}

function makeGenerateFiniteSet() {
  return (categoryId: string, challengeId: string | null): EngineItem[] => {
    if (challengeId) {
      return generateChallenge(challengeId);
    }
    return Array.from({ length: 10 }, (_, i) =>
      generateSpellingItem(2 + Math.floor(i / 4), categoryId || 'cvc', false)
    );
  };
}

const LOADING_WORDS = ['SPELL', 'LEARN', 'WORDS', 'BRAIN', 'SMART', 'THINK', 'QUEST'];
const LOADING_TIPS = [
  '"I before E, except after C"',
  'The word "rhythm" has no vowels!',
  '"Queue" — 4 silent letters in a row',
  'Practice makes permanent',
  '"Necessary" — one collar, two socks',
  'Sound it out, one syllable at a time',
];

function LoadingFallback() {
  const [tipIndex] = useState(() => Math.floor(Math.random() * LOADING_TIPS.length));
  const [wordIndex] = useState(() => Math.floor(Math.random() * LOADING_WORDS.length));
  const word = LOADING_WORDS[wordIndex];

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-6 px-6">
      {/* Animated bee */}
      <motion.div
        className="text-5xl"
        animate={{ y: [-6, 6, -6], rotate: [-3, 3, -3] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      >
        <span role="img" aria-label="bee">&#x1F41D;</span>
      </motion.div>

      {/* Letter tiles */}
      <div className="flex gap-1.5">
        {word.split('').map((letter, i) => (
          <motion.div
            key={i}
            className="w-10 h-12 rounded-lg bg-[var(--color-gold)]/15 border-2 border-[var(--color-gold)]/30 flex items-center justify-center text-xl chalk text-[var(--color-gold)]"
            initial={{ opacity: 0, y: 20, rotateX: 90 }}
            animate={{ opacity: 1, y: 0, rotateX: 0 }}
            transition={{ delay: i * 0.1, duration: 0.4, ease: 'backOut' }}
          >
            {letter}
          </motion.div>
        ))}
      </div>

      {/* Pulsing dots */}
      <div className="flex gap-1.5">
        {[0, 1, 2].map(i => (
          <motion.div
            key={i}
            className="w-2 h-2 rounded-full bg-[var(--color-chalk)]/30"
            animate={{ opacity: [0.2, 1, 0.2], scale: [0.8, 1.2, 0.8] }}
            transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
          />
        ))}
      </div>

      {/* Fun tip */}
      <motion.p
        className="text-xs ui text-[rgb(var(--color-fg))]/30 text-center max-w-[240px]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        {LOADING_TIPS[tipIndex]}
      </motion.p>
    </div>
  );
}

function AppInner() {
  const { user } = useFirebaseAuth();
  const uid = user?.uid ?? null;

  // User state from context
  const {
    stats,
    recordSession,
    recordBeeResult,
    consumeShield,
    purchaseStreakFreeze,
    updateCosmetics,
    activeCostume,
    activeTheme,
    activeTrailId,
    grade,
    onGradeChange,
    dialect,
    onDialectChange,
  } = useUser();

  const [activeTab, setActiveTab] = useState<Tab>('game');
  const hardMode = false;
  const [timedMode, setTimedMode] = useState(false);

  // ── Modals ──
  const {
    showOnboarding,
    showCustomLists,
    showMultiplayerLobby,
    showSummary,
    openModal,
    closeModal,
    setShowOnboarding,
    setShowSummary,
  } = useAppModals();

  // ── Multiplayer ──
  const mp = useMultiplayerRoom(uid, user?.displayName ?? 'Player');

  // ── Custom Word Lists ──
  const customLists = useCustomLists();
  const [activeCustomListId, setActiveCustomListId] = useState<string | null>(null);

  // ── Hardest-words drill override ──
  const [drillHardest, setDrillHardest] = useState(false);

  // ── Root-family drill override ──
  const [drillRootId, setDrillRootId] = useState<string | null>(null);

  // ── Guided mode toggle (MCQ vs text-entry) ──
  const [guidedMode, setGuidedMode] = useState(false);
  const toggleGuidedMode = useCallback(() => setGuidedMode(g => !g), []);

  // ── Daily challenge completion ──
  const [dailyCompleted, setDailyCompleted] = useState(() => isDailyComplete());

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
  const [questionType, setQuestionTypeRaw] = useState<QuestionType>(() => {
    if (challengeId) return 'challenge';
    const stored = localStorage.getItem(STORAGE_KEYS.grade);
    if (stored) return getGradeConfig(stored as GradeLevel).defaultCategory;
    return 'cvc';
  });

  const setQuestionType = useCallback((type: QuestionType) => {
    if (type === 'custom') {
      openModal('showCustomLists');
      return;
    }
    setQuestionTypeRaw(type);
  }, [openModal]);

  const handleDialectChange = useCallback(async (d: Dialect) => {
    onDialectChange(d);
    await setDialect(d);
    setWordRegistryVersion(getRegistryVersion());
  }, [onDialectChange]);

  // ── Load all word tiers ──
  const [wordRegistryVersion, setWordRegistryVersion] = useState(() => getRegistryVersion());
  useEffect(() => {
    let cancelled = false;
    ensureAllTiers().then(async () => {
      // Apply stored dialect after tiers are loaded
      const stored = localStorage.getItem(STORAGE_KEYS.dialect) || 'en-US';
      if (stored === 'en-GB') await setDialect(stored as Dialect);
      if (!cancelled) setWordRegistryVersion(getRegistryVersion());
    });
    return () => { cancelled = true; };
  }, []);

  // ── Word history (Leitner spaced repetition) ──
  const { records: wordRecords, recordAttempt, reviewQueue, hardestWords, masteredCount } = useWordHistory();

  // Root-family drill queue — maps root's example words to WordRecord[] for GuidedSpellingPage
  const drillRootQueue = useMemo(() => {
    if (!drillRootId) return undefined;
    const root = WORD_ROOTS.find(r => r.root === drillRootId);
    if (!root) return undefined;
    return root.examples.map(w => {
      const key = w.toLowerCase();
      return wordRecords[key] ?? { word: key, category: 'roots', attempts: 0, correct: 0, lastSeen: 0, lastCorrect: 0, box: 0, nextReview: 0 } as WordRecord;
    });
  }, [drillRootId, wordRecords]);

  const onAnswer = useCallback((item: EngineItem, correct: boolean, responseTimeMs: number) => {
    const word = item.meta?.['word'] as string | undefined;
    if (word) recordAttempt(word, item.meta?.['category'] as string ?? 'cvc', correct, responseTimeMs);
  }, [recordAttempt]);

  // wordRegistryVersion ensures generators refresh after loading new tiers
  const activeCustomList = activeCustomListId ? customLists.getList(activeCustomListId) : null;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const generateItem = useMemo(() => makeGenerateItem(activeCustomList?.words), [wordRegistryVersion, activeCustomList]);
  const generateFiniteSet = useMemo(() => {
    const baseFn = makeGenerateFiniteSet();
    return (categoryId: string, challengeId: string | null): EngineItem[] => {
      if (categoryId === 'review' && reviewQueue.length > 0) {
        return reviewQueue.slice(0, 10).map(r => {
          // Generate an item for the exact review word (not a random word from its category)
          const item = generateItemForWord(r.word, r.category || 'review');
          // Fallback if word not found in current word bank (e.g. dialect changed)
          return item ?? generateSpellingItem(3, r.category || 'cvc', false);
        });
      }
      return baseFn(categoryId, challengeId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reviewQueue, wordRegistryVersion]);

  // ── Grade config (needed before useGameLoop) ──
  const gradeConfig = useMemo(
    () => grade ? getGradeConfig(grade as GradeLevel) : null,
    [grade],
  );

  // Initialize onboarding state on mount
  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEYS.grade) || !localStorage.getItem(STORAGE_KEYS.dialect)) {
      setShowOnboarding(true);
    }
  }, [setShowOnboarding]);

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
    dismissWrongAnswer,
    timerProgress,
    dailyComplete,
    shieldBroken,
  } = useGameLoop(
    generateItem,
    questionType,
    hardMode,
    challengeId,
    timedMode,
    stats.streakShields,
    consumeShield,
    GAME_CONFIG,
    generateFiniteSet,
    onAnswer,
    gradeConfig?.minDifficultyLevel ?? 1,
  );

  // ── Shield consumed toast ──
  const [shieldToast, setShieldToast] = useState(false);
  useEffect(() => {
    if (!shieldBroken) return;
    let t: ReturnType<typeof setTimeout>;
    queueMicrotask(() => {
      setShieldToast(true);
      t = setTimeout(() => setShieldToast(false), 3000);
    });
    return () => clearTimeout(t);
  }, [shieldBroken]);

  // ── Streak toast — show once per session when dayStreak > 1 ──
  const streakToastShown = useRef(false);
  const [streakToast, setStreakToast] = useState(false);
  useEffect(() => {
    if (stats.dayStreak > 1 && !streakToastShown.current) {
      streakToastShown.current = true;
      setStreakToast(true);
      const t = setTimeout(() => setStreakToast(false), 3000);
      return () => clearTimeout(t);
    }
  }, [stats.dayStreak]);

  const currentProblem = problems[0];
  const isFirstQuestion = totalAnswered === 0;
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

  // ── Session summary (auto-show on daily finish) ──
  useAutoSummary(dailyComplete, setShowSummary);

  // ── Save daily result when daily set is completed ──
  useEffect(() => {
    if (dailyComplete && questionType === 'daily' && !dailyCompleted) {
      saveDailyResult({ score, correct: totalCorrect, total: totalAnswered, timeMs: Date.now() });
      setDailyCompleted(true);
    }
  }, [dailyComplete, questionType, dailyCompleted, score, totalCorrect, totalAnswered]);

  // ── Ping Listener (Async Taunts) ──
  const [pingMessage, setPingMessage] = useState<string | null>(null);
  useEffect(() => {
    if (!uid) return;
    let pingTimer: ReturnType<typeof setTimeout>;
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
        clearTimeout(pingTimer);
        pingTimer = setTimeout(() => setPingMessage(null), 6000);
      }
    });
    return () => { unsub(); clearTimeout(pingTimer); };
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
      bestTournamentRound: 0,
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
  }, [stats, bestStreak, uid, masteredCount, wordRecords]);

  // ── Personal best detection ──
  const showPB = usePersonalBest(bestStreak, stats.bestStreak);

  const pendingTabRef = useRef<Tab | null>(null);
  const handleTabChange = useCallback((tab: Tab) => {
    // If summary is already showing, just update the destination
    if (showSummary) {
      pendingTabRef.current = tab;
      return;
    }
    // Reset guided mode when leaving game tab
    if (tab !== 'game' && guidedMode) setGuidedMode(false);
    if (prevTab.current === 'game' && tab !== 'game' && totalAnswered > 0) {
      recordSession(score, totalCorrect, totalAnswered, bestStreak, questionType, hardMode, timedMode);
      setShowSummary(true);
      pendingTabRef.current = tab;        // defer the tab switch
      return;                             // stay on game tab to show summary
    }
    setActiveTab(tab);
  }, [score, totalCorrect, totalAnswered, bestStreak, questionType, recordSession, hardMode, timedMode, setShowSummary, showSummary, guidedMode]);

  // ── Tab swipe (non-game tabs only) ──
  const handleTabSwipe = useCallback((_: unknown, info: PanInfo) => {
    if (activeTab === 'game') return; // game uses horizontal swipe for answers
    const t = 80;
    const idx = TAB_ORDER.indexOf(activeTab);
    if ((info.offset.x < -t || info.velocity.x < -400) && idx < TAB_ORDER.length - 1) {
      handleTabChange(TAB_ORDER[idx + 1]);
    } else if ((info.offset.x > t || info.velocity.x > 400) && idx > 0) {
      handleTabChange(TAB_ORDER[idx - 1]);
    }
  }, [activeTab, handleTabChange]);

  const handleOnboardingComplete = useCallback((d: Dialect, g: GradeLevel) => {
    onDialectChange(d);
    onGradeChange(g);
    const config = getGradeConfig(g);
    setQuestionType(config.defaultCategory);
    setShowOnboarding(false);
  }, [onDialectChange, onGradeChange, setQuestionType, setShowOnboarding]);

  const handleGradeChange = useCallback((g: GradeLevel) => {
    onGradeChange(g);
    const config = getGradeConfig(g);
    setQuestionType(config.defaultCategory);
  }, [onGradeChange, setQuestionType]);

  // ── Chalk themes ──
  useEffect(() => {
    const t = CHALK_THEMES.find(th => th.id === activeTheme);
    if (t) applyTheme(t);
  }, [activeTheme]); // themeMode dep added below after declaration

  // Persist cosmetics to Firebase payload
  useEffect(() => {
    if (!uid) return;
    updateCosmetics(activeTheme, activeCostume, activeTrailId);
  }, [uid, activeTheme, activeCostume, activeTrailId, updateCosmetics]);

  // ── Theme mode (dark/light) ──
  const [themeMode, setThemeMode] = useLocalState(STORAGE_KEYS.theme, 'dark', uid);
  useEffect(() => {
    applyMode(themeMode as 'dark' | 'light');
    // Re-apply chalk theme colours for the new mode (dark uses .color, light uses .lightColor)
    const t = CHALK_THEMES.find(th => th.id === activeTheme);
    if (t) applyTheme(t);
  }, [themeMode, activeTheme]);
  const toggleThemeMode = useCallback(() => {
    setThemeMode(themeMode === 'dark' ? 'light' : 'dark');
  }, [themeMode, setThemeMode]);

  return (
    <>
      <BlackboardLayout>
        <OfflineBanner />
        <ReloadPrompt suppress={activeTab === 'game'} />
        {/* ── Global Canvas Overlay (Swipe Trail) ── */}
        <SwipeTrail
          streak={streak}
          activeTrailId={activeTrailId}
          baseColor={CHALK_THEMES.find(t => t.id === activeTheme)?.color}
        />

        {/* ── Top-right controls (theme toggle) — game tab only, hidden during immersive sub-modes ── */}
        {activeTab === 'game' && questionType !== 'bee' && questionType !== 'guided' && questionType !== 'written-test' && !guidedMode && (
          <div className="absolute top-[calc(env(safe-area-inset-top,12px)+12px)] right-4 z-50 flex items-center gap-2">
            <button
              onClick={toggleThemeMode}
              className="w-9 h-9 flex items-center justify-center text-[rgb(var(--color-fg))]/60 active:text-[var(--color-gold)] transition-colors"
              aria-label="Toggle theme"
            >
              {themeMode === 'light' ? (
                <motion.svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                >
                  <circle cx="12" cy="12" r="5" />
                  <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                  <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                </motion.svg>
              ) : (
                <motion.svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
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
          }} className="flex-1 flex flex-col w-full min-h-0">
            {/* ── Score (centered, pushed down from edge) — hidden in full-screen sub-modes ── */}
            {questionType !== 'bee' && questionType !== 'written-test' && questionType !== 'guided' && !guidedMode && <div className="landscape-score flex flex-col items-center pt-[calc(env(safe-area-inset-top,12px)+32px)] pb-2 z-10 pointer-events-none [&_button]:pointer-events-auto">
              {/* Challenge header */}
              {questionType === 'challenge' && (
                <div className="text-xs ui text-[var(--color-gold)] mb-2 flex items-center gap-2">
                  <span>⚔️ Challenge</span>
                  <span className="text-[rgb(var(--color-fg))]/30">·</span>
                  <span className="text-[rgb(var(--color-fg))]/40">{totalAnswered}/10</span>
                </div>
              )}
              <ScoreCounter value={score} />

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
                <div className="mt-1 flex flex-col items-center gap-0.5">
                  <div className="flex items-center justify-center gap-1 text-[10px] ui text-[rgb(var(--color-fg))]/25">
                    <span>🔥 Day {stats.dayStreak}</span>
                    {(stats.streakShields || 0) > 0 && (
                      <span className="text-[var(--color-gold)] opacity-80" title="Streak shields">
                        {'🛡️'.repeat(stats.streakShields)}
                      </span>
                    )}
                    {(stats.streakFreezes || 0) > 0 && (
                      <span className="opacity-60" title={`${stats.streakFreezes} streak freeze${stats.streakFreezes !== 1 ? 's' : ''}`}>
                        {'❄️'.repeat(Math.min(stats.streakFreezes, 3))}
                      </span>
                    )}
                  </div>
                  {/* Streak danger — show protection count when streak is notable */}
                  {streak > 5 && (
                    <span className="text-[9px] ui text-[rgb(var(--color-fg))]/15">
                      {1 + (stats.streakFreezes || 0) + (stats.streakShields || 0)} miss{(1 + (stats.streakFreezes || 0) + (stats.streakShields || 0)) !== 1 ? 'es' : ''} until streak breaks
                    </span>
                  )}
                </div>
              )}
              {/* Grade level label */}
              {gradeConfig && (
                <div className="mt-1.5 text-xs ui text-[rgb(var(--color-fg))]/40 font-medium">
                  {gradeConfig.label} <span className="text-[rgb(var(--color-fg))]/20">{gradeConfig.grades}</span>
                </div>
              )}
            </div>}

            {/* ── Points earned floater ── */}
            <AnimatePresence>
              {pointsFloater > 0 && (
                <motion.div
                  key={'pts' + score}
                  initial={{ opacity: 1, y: 0 }}
                  animate={{ opacity: 0, y: -30 }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  className="absolute left-1/2 -translate-x-1/2 top-[calc(env(safe-area-inset-top,16px)+100px)] z-30 text-lg ui text-[var(--color-gold)] pointer-events-none"
                >
                  +{pointsFloater}
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Main Problem Area ── */}
            <div className="flex-1 flex flex-col min-h-0">
              {questionType === 'bee' ? (
                <BeeSimPage
                  onExit={() => setQuestionType(gradeConfig?.defaultCategory ?? 'cvc')}
                  onAnswer={(word, correct, ms, typed) => {
                    recordAttempt(word, 'bee', correct, ms, typed);
                  }}
                  onBeeResult={recordBeeResult}
                />
              ) : (questionType === 'guided' || guidedMode) ? (
                <Suspense fallback={<LoadingFallback />}>
                  <GuidedSpellingPage
                    onExit={() => { setDrillHardest(false); setDrillRootId(null); setGuidedMode(false); if (questionType === 'guided') setQuestionType(gradeConfig?.defaultCategory ?? 'cvc'); }}
                    onAnswer={(word, correct, ms, typed) => {
                      recordAttempt(word, drillRootId ? 'roots' : 'guided', correct, ms, typed);
                    }}
                    reviewQueue={drillRootId ? drillRootQueue : drillHardest ? hardestWords : reviewQueue}
                    masteredCount={masteredCount}
                    onOpenBee={() => setQuestionType('bee')}
                  />
                </Suspense>
              ) : questionType === 'written-test' ? (
                <WrittenTestPage
                  onExit={() => setQuestionType(gradeConfig?.defaultCategory ?? 'cvc')}
                />
              ) : dailyComplete ? (
                <DailyChallengeComplete
                  correct={totalCorrect}
                  total={totalAnswered}
                  score={score}
                  onExit={() => setQuestionType(gradeConfig?.defaultCategory ?? 'cvc')}
                  mode={questionType === 'review' ? 'review' : questionType === 'challenge' ? 'challenge' : 'daily'}
                />
              ) : (
                <AnimatePresence mode="wait">
                  {currentProblem && (
                    <motion.div
                      key={currentProblem.id}
                      className="flex-1 flex flex-col min-h-0"
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
                        wrongAnswer={flash === 'wrong' && !isFirstQuestion}
                        onDismissWrong={dismissWrongAnswer}
                        onSwipe={handleSwipe}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              )}
            </div>

            {/* ── TikTok-style action buttons — hidden during immersive sub-modes ── */}
            {questionType !== 'bee' && questionType !== 'guided' && questionType !== 'written-test' && !guidedMode && (
              <ActionButtons
                questionType={questionType}
                onTypeChange={setQuestionType}
                timedMode={timedMode}
                onTimedModeToggle={toggleTimedMode}
                timerProgress={timerProgress}
                guidedMode={guidedMode}
                onGuidedModeToggle={toggleGuidedMode}
              />
            )}

            {/* ── Bee Buddy PiP — hidden during bee sim and full-screen sub-modes ── */}
            {questionType !== 'bee' && questionType !== 'written-test' && questionType !== 'guided' && !guidedMode && (
              <div className="landscape-hide">
                <BeeBuddy state={chalkState} costume={activeCostume} streak={streak} totalAnswered={totalAnswered} questionType={questionType} hardMode={hardMode} timedMode={timedMode} pingMessage={pingMessage} messageOverrides={SPELLING_MESSAGE_OVERRIDES} />
              </div>
            )}

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
                  className="absolute left-1/2 -translate-x-1/2 top-[18%] z-40 text-lg ui font-bold text-[var(--color-gold)] whitespace-nowrap"
                >
                  🏆 NEW PERSONAL BEST!
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Non-game tabs (no wrapper — each page scrolls independently) */}
        {activeTab === 'path' && (
          <motion.div className="flex-1 flex flex-col min-h-0" onPanEnd={handleTabSwipe}>
            <PathPage
              records={wordRecords}
              reviewDueCount={reviewQueue.length}
              hardestWordCount={hardestWords.length}
              onDrillHardest={() => {
                setDrillHardest(true);
                setQuestionType('guided');
                setActiveTab('game');
              }}
              onDrillRoot={(rootId) => {
                setDrillRootId(rootId);
                setGuidedMode(true);
                setActiveTab('game');
              }}
              onPractice={(cat) => {
                setQuestionType(cat as QuestionType);
                // If practicing a tier category, also update grade level to match
                if (cat.startsWith('tier-')) {
                  onGradeChange(cat as GradeLevel);
                }
                setActiveTab('game');
              }}
            />
          </motion.div>
        )}

        {activeTab === 'league' && (
          <motion.div className="flex-1 flex flex-col min-h-0" onPanEnd={handleTabSwipe}>
            <Suspense fallback={<LoadingFallback />}><LeaguePage userXP={stats.totalXP} userStreak={stats.bestStreak} uid={uid} displayName={user?.displayName ?? 'You'} activeThemeId={activeTheme} activeCostume={activeCostume} onOpenMultiplayer={() => openModal('showMultiplayerLobby')} onOpenBee={() => { setQuestionType('bee'); setActiveTab('game'); }} onOpenWrittenTest={() => { setQuestionType('written-test'); setActiveTab('game'); }} onOpenWotc={(tier) => { setQuestionType(tier); setActiveTab('game'); }} /></Suspense>
          </motion.div>
        )}

        {activeTab === 'me' && (
          <motion.div className="flex-1 flex flex-col min-h-0" onPanEnd={handleTabSwipe}>
            <Suspense fallback={<LoadingFallback />}><MePage
              unlocked={unlocked}
              onGradeChange={handleGradeChange}
              onDialectChange={handleDialectChange}
            /></Suspense>
          </motion.div>
        )}

        {/* ── Bottom Navigation — hidden during immersive sub-modes ── */}
        {!(activeTab === 'game' && (questionType === 'bee' || questionType === 'guided' || questionType === 'written-test' || guidedMode)) && (
          <BottomNav
            active={activeTab}
            onChange={handleTabChange}
            tabs={NAV_TABS.map(t => t.id === 'path' ? { ...t, badge: reviewQueue.length } : t)}
          />
        )}

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
            if (pendingTabRef.current) {
              setActiveTab(pendingTabRef.current);
              pendingTabRef.current = null;
            }
          }}
          hardMode={hardMode}
          timedMode={timedMode}
          hardestWordCount={hardestWords.length}
          onDrillHardest={() => {
            setDrillHardest(true);
            setQuestionType('guided');
            setShowSummary(false);
            pendingTabRef.current = null;
          }}
          totalXP={stats.totalXP}
          streakFreezes={stats.streakFreezes}
          onPurchaseFreeze={purchaseStreakFreeze}
        />

        {/* ── Weekly recap (first open of the week) ── */}
        <WeeklyRecap stats={stats} />

        {/* ── Toasts ── */}
        <Toast visible={!!unlockToast} icon="🏅" title={unlockToast || ''} subtitle="Achievement Unlocked!" toastKey={unlockToast || undefined} />
        <Toast visible={shieldToast} icon="🛡️" title="Shield protected your streak" subtitle="Streak Saved!" />
        <Toast visible={streakToast} icon="🔥" title={`${stats.dayStreak}-day streak!`} subtitle="Keep it going" />

        {/* ── Custom Lists Modal ── */}
        <AnimatePresence>
          {showCustomLists && (
            <CustomListsModal
              lists={customLists.lists}
              onCreate={customLists.createList}
              onDelete={customLists.deleteList}
              onPractice={(listId) => {
                setActiveCustomListId(listId);
                closeModal('showCustomLists');
                setQuestionTypeRaw('custom');
              }}
              onClose={() => closeModal('showCustomLists')}
            />
          )}
        </AnimatePresence>

        {/* ── Multiplayer Lobby Modal ── */}
        <AnimatePresence>
          {showMultiplayerLobby && mp.phase !== 'playing' && mp.phase !== 'finished' && (
            <MultiplayerLobby
              phase={mp.phase === 'creating' ? 'creating' : mp.phase === 'lobby' ? 'lobby' : 'idle'}
              roomCode={mp.roomCode}
              players={Object.entries(mp.roomData?.players ?? {}).map(([id, p]) => ({ uid: id, displayName: p.displayName, ready: p.ready }))}
              isHost={mp.isHost}
              error={mp.error}
              onCreate={mp.createRoom}
              onJoin={mp.joinRoom}
              onReady={mp.setReady}
              onStart={mp.startMatch}
              onClose={() => { mp.leaveRoom(); closeModal('showMultiplayerLobby'); }}
            />
          )}
        </AnimatePresence>

        {/* ── Multiplayer Match (full-screen overlay) ── */}
        {(mp.phase === 'playing' || mp.phase === 'finished') && mp.roomData && uid && (
          <div className="fixed inset-0 z-50 bg-[var(--color-bg)]">
            <MultiplayerMatch
              phase={mp.phase}
              roomData={mp.roomData}
              currentRound={mp.currentRound}
              roundTimeLeft={mp.roundTimeLeft}
              uid={uid}
              onSubmitAnswer={mp.submitAnswer}
              onLeave={() => { mp.leaveRoom(); closeModal('showMultiplayerLobby'); }}
            />
          </div>
        )}
      </BlackboardLayout>

      {/* ── Onboarding (first launch) ── */}
      <AnimatePresence>
        {showOnboarding && (
          <OnboardingModal
            onComplete={handleOnboardingComplete}
            currentDialect={dialect as Dialect}
            currentGrade={grade as GradeLevel}
          />
        )}
      </AnimatePresence>
    </>
  );
}

function App() {
  const { user, loading: authLoading } = useFirebaseAuth();
  const uid = user?.uid ?? null;

  // Show loading screen while Firebase auth initializes
  if (authLoading) {
    return <BlackboardLayout><LoadingFallback /></BlackboardLayout>;
  }

  return (
    <UserProvider uid={uid}>
      <AppInner />
    </UserProvider>
  );
}

export default App;
