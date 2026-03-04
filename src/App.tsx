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
import type { SpellingCategory, Level } from './domains/spelling/spellingCategories';
import { getLevelConfig } from './domains/spelling/spellingCategories';
import { OnboardingModal } from './components/OnboardingModal';
import { useAutoSummary, usePersonalBest } from './hooks/useSessionUI';
import { useReducedMotion } from './hooks/useReducedMotion';
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
const PathPage = lazy(() => lazyRetry(() => import('./components/PathPage')).then(m => ({ default: m.PathPage })));
const BeeSimPage = lazy(() => lazyRetry(() => import('./components/BeeSimPage')).then(m => ({ default: m.BeeSimPage })));
const WrittenTestPage = lazy(() => lazyRetry(() => import('./components/WrittenTestPage')).then(m => ({ default: m.WrittenTestPage })));
const GuidedSpellingPage = lazy(() => lazyRetry(() => import('./components/GuidedSpellingPage')).then(m => ({ default: m.GuidedSpellingPage })));
const MultiplayerLobby = lazy(() => lazyRetry(() => import('./components/MultiplayerLobby')).then(m => ({ default: m.MultiplayerLobby })));
const MultiplayerMatch = lazy(() => lazyRetry(() => import('./components/MultiplayerMatch')).then(m => ({ default: m.MultiplayerMatch })));
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
        animate={window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? {} : { y: [-6, 6, -6], rotate: [-3, 3, -3] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      >
        🐝
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
    level,
    onLevelChange,
    dialect,
    onDialectChange,
  } = useUser();

  const [activeTab, setActiveTab] = useState<Tab>('game');
  const hardMode = false;
  const [timedMode, setTimedMode] = useState(false);
  const { reducedMotion } = useReducedMotion();

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
    if (stored) return getLevelConfig(stored as Level).defaultCategory;
    return 'cvc';
  });
  const prevCategoryRef = useRef(questionType);

  const setQuestionType = useCallback((type: QuestionType) => {
    if (type === 'custom') {
      openModal('showCustomLists');
      return;
    }
    setQuestionTypeRaw(type);
  }, [openModal]);

  // ── Session mode (from Path page curriculum) ──
  const [sessionSize, setSessionSize] = useState<number | null>(null);
  const [sessionAnswered, setSessionAnswered] = useState(0);
  const sessionComplete = sessionSize !== null && sessionAnswered >= sessionSize;

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
  const { records: wordRecords, recordAttempt, reviewQueue, hardestWords, masteredCount, uniqueWordsAttempted } = useWordHistory();

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
    // Track session progress
    if (sessionSize !== null) setSessionAnswered(n => n + 1);
  }, [recordAttempt, sessionSize]);

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

  // ── Level config (needed before useGameLoop) ──
  const levelConfig = useMemo(
    () => level ? getLevelConfig(level as Level) : null,
    [level],
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
    wrongStreak,
    handleSwipe,
    dismissWrongAnswer,
    timerProgress,
    dailyComplete,
    shieldBroken,
    hintWord,
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
    levelConfig?.minDifficultyLevel ?? 1,
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

  // ── Improvement celebration — week-over-week accuracy trend ──
  const [improvementToast, setImprovementToast] = useState('');
  useEffect(() => {
    // Run once on mount — compare current accuracy to last week's snapshot
    try {
      const now = new Date();
      // ISO week key: YYYY-WW
      const jan1 = new Date(now.getFullYear(), 0, 1);
      const weekNum = Math.ceil(((now.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7);
      const currentWeekKey = `${now.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;

      const raw = localStorage.getItem(STORAGE_KEYS.weeklySnapshot);
      const snapshot = raw ? JSON.parse(raw) : null;

      // Current accuracy from stats
      const currentAccuracy = stats.totalSolved > 0
        ? Math.round((stats.totalCorrect / stats.totalSolved) * 100)
        : 0;

      if (snapshot && snapshot.weekKey !== currentWeekKey && snapshot.accuracy > 0 && currentAccuracy > 0) {
        const diff = currentAccuracy - snapshot.accuracy;
        if (diff >= 10) {
          setImprovementToast(`Accuracy up ${diff}% from last week!`);
          const t = setTimeout(() => setImprovementToast(''), 4000);
          // Save updated snapshot for this week
          localStorage.setItem(STORAGE_KEYS.weeklySnapshot, JSON.stringify({
            weekKey: currentWeekKey, accuracy: currentAccuracy, wordCount: stats.totalSolved,
          }));
          return () => clearTimeout(t);
        }
      }

      // Save snapshot if none exists or it's a new week
      if (!snapshot || snapshot.weekKey !== currentWeekKey) {
        localStorage.setItem(STORAGE_KEYS.weeklySnapshot, JSON.stringify({
          weekKey: currentWeekKey, accuracy: currentAccuracy, wordCount: stats.totalSolved,
        }));
      }
    } catch { /* ignore localStorage errors */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  // ── Accuracy gate (anti-random-swipe speed bump) ──
  const [accuracyGateDismissed, setAccuracyGateDismissed] = useState(0); // tracks the totalAnswered at last dismiss
  const showAccuracyGate = useMemo(() => {
    // Never show in competitive/finite modes
    if (['daily', 'challenge', 'review'].includes(questionType)) return false;
    // Grace period: at least 5 answers
    if (totalAnswered < 5) return false;
    // Don't re-trigger until 3 more answers after last dismiss
    if (totalAnswered - accuracyGateDismissed < 3) return false;
    // Check rolling accuracy over last 5 answers
    const last5 = answerHistory.slice(-5);
    const last5Correct = last5.filter(Boolean).length;
    // < 40% of last 5 = 0 or 1 correct out of 5
    return last5Correct / last5.length < 0.4;
  }, [answerHistory, totalAnswered, accuracyGateDismissed, questionType]);

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
  const [unlockToast, setUnlockToast] = useState<{ name: string; desc: string } | null>(null);

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
        setUnlockToast({ name: badge.name, desc: badge.desc });
        const t = setTimeout(() => setUnlockToast(null), 3500);
        return () => clearTimeout(t);
      }
    }
  }, [stats, bestStreak, uid, masteredCount, wordRecords]);

  // ── Personal best detection ──
  const showPB = usePersonalBest(bestStreak, stats.bestStreak);

  // ── Streak near-miss detection (just missed 5/10/20/50) ──
  const NEAR_MISS_THRESHOLDS = [5, 10, 20, 50];
  const prevStreakRef = useRef(0);
  const [nearMissText, setNearMissText] = useState('');
  useEffect(() => {
    const prev = prevStreakRef.current;
    prevStreakRef.current = streak;
    if (streak === 0 && prev > 0) {
      const nextMilestone = NEAR_MISS_THRESHOLDS.find(m => prev >= m - 2 && prev < m);
      if (nextMilestone) {
        setNearMissText(`${prev}-streak! So close to ${nextMilestone}!`);
        const t = setTimeout(() => setNearMissText(''), 2500);
        return () => clearTimeout(t);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streak]);

  // ── Mastery graduation toast (word reached box 4) ──
  const prevMasteredRef = useRef(masteredCount);
  const [masteryToast, setMasteryToast] = useState('');
  useEffect(() => {
    const prev = prevMasteredRef.current;
    prevMasteredRef.current = masteredCount;
    if (masteredCount > prev && prev > 0) {
      // Find the most recently mastered word
      const mastered = Object.values(wordRecords)
        .filter(r => r.box >= 4)
        .sort((a, b) => b.lastCorrect - a.lastCorrect);
      const word = mastered[0]?.word;
      setMasteryToast(word ? `🎓 "${word}" mastered!` : '🎓 Word mastered!');
      const t = setTimeout(() => setMasteryToast(''), 3000);
      return () => clearTimeout(t);
    }
  }, [masteredCount, wordRecords]);

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

  // Memoize BottomNav tabs to avoid new array each render
  const navTabs = useMemo(
    () => NAV_TABS.map(t => t.id === 'path' ? { ...t, badge: reviewQueue.length } : t),
    [reviewQueue.length],
  );

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

  const handleOnboardingComplete = useCallback((d: Dialect, l: Level) => {
    onDialectChange(d);
    onLevelChange(l);
    const config = getLevelConfig(l);
    setQuestionType(config.defaultCategory);
    setShowOnboarding(false);
  }, [onDialectChange, onLevelChange, setQuestionType, setShowOnboarding]);

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
          active={activeTab === 'game'}
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
            {/* ── Timer urgency bar — visible pulse when time is running out ── */}
            {timedMode && timerProgress > 0.75 && !frozen && (
              <motion.div
                className="absolute top-0 left-0 right-0 h-1 z-20 bg-[var(--color-streak-fire)]"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 0.5, repeat: Infinity, ease: 'easeInOut' }}
                style={{ width: `${(1 - timerProgress) * 100 * 4}%`, marginLeft: 'auto', marginRight: 'auto' }}
              />
            )}
            {/* ── Score (centered, pushed down from edge) — hidden in full-screen sub-modes ── */}
            {questionType !== 'bee' && questionType !== 'written-test' && questionType !== 'guided' && !guidedMode && <div className="landscape-score flex flex-col items-center pt-[calc(env(safe-area-inset-top,12px)+32px)] pb-2 z-10 pointer-events-none [&_button]:pointer-events-auto">
              {/* Mode / category label — always shows what the user is doing */}
              {questionType === 'challenge' ? (
                <div className="text-xs ui text-[var(--color-gold)] mb-2 flex items-center gap-2">
                  <span>⚔️ Challenge</span>
                  <span className="text-[rgb(var(--color-fg))]/30">·</span>
                  <span className="text-[rgb(var(--color-fg))]/40">{totalAnswered}/{totalAnswered + problems.length}</span>
                </div>
              ) : questionType === 'daily' ? (
                <div className="text-xs ui text-[var(--color-gold)] mb-2 flex items-center gap-2">
                  <span>📅 Daily Challenge</span>
                  <span className="text-[rgb(var(--color-fg))]/30">·</span>
                  <span className="text-[rgb(var(--color-fg))]/40">{totalAnswered}/{totalAnswered + problems.length}</span>
                </div>
              ) : questionType === 'review' ? (
                <div className="flex flex-col items-center mb-2">
                  <div className="text-xs ui text-[var(--color-gold)] flex items-center gap-2">
                    <span>📖 Almost Mastered</span>
                    {(totalAnswered + problems.length) > 0 && (
                      <>
                        <span className="text-[rgb(var(--color-fg))]/30">·</span>
                        <span className="text-[rgb(var(--color-fg))]/40">{totalAnswered}/{totalAnswered + problems.length}</span>
                      </>
                    )}
                  </div>
                  {totalAnswered === 0 && (
                    <div className="text-[9px] ui text-[rgb(var(--color-fg))]/25 mt-0.5">These words are almost learned — one more practice!</div>
                  )}
                </div>
              ) : null}
              <ScoreCounter value={score} />

              {/* Shield count */}
              {/* Screen reader announcement for game feedback */}
              <div className="sr-only" role="status" aria-live="assertive">
                {flash === 'correct' && `Correct! Streak: ${streak}`}
                {flash === 'wrong' && (shieldBroken ? 'Wrong! Shield used, streak saved.' : 'Wrong! Streak reset.')}
                {milestone && `Milestone: ${milestone}`}
              </div>
              {stats.streakShields > 0 && streak > 0 && (
                <div className="text-[10px] ui text-[rgb(var(--color-fg))]/30 mt-1 flex items-center gap-0.5" title="Shields protect your streak from 1 wrong answer">
                  {'🛡️'.repeat(stats.streakShields)}
                  <span className="ml-0.5 text-[8px]">{stats.streakShields === 1 ? 'shield' : 'shields'}</span>
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
            </div>}

            {/* ── Points earned floater ── */}
            <AnimatePresence>
              {pointsFloater > 0 && (
                <motion.div
                  key={'pts' + score}
                  initial={{ opacity: 1, y: 0 }}
                  animate={{ opacity: 0, y: -30 }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  className="absolute left-1/2 -translate-x-1/2 top-[calc(env(safe-area-inset-top,16px)+100px)] z-30 text-lg ui font-bold text-[var(--color-gold)] pointer-events-none"
                >
                  +{pointsFloater} pts
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Main Problem Area ── */}
            <div className="flex-1 flex flex-col min-h-0">
              {questionType === 'bee' ? (
                <BeeSimPage
                  onExit={() => setQuestionType(levelConfig?.defaultCategory ?? 'cvc')}
                  onAnswer={(word, correct, ms, typed) => {
                    recordAttempt(word, 'bee', correct, ms, typed);
                  }}
                  onBeeResult={recordBeeResult}
                />
              ) : (questionType === 'guided' || guidedMode) ? (
                <Suspense fallback={<LoadingFallback />}>
                  <GuidedSpellingPage
                    onExit={() => { setDrillHardest(false); setDrillRootId(null); setGuidedMode(false); if (questionType === 'guided') { const prev = prevCategoryRef.current; setQuestionType(prev !== 'guided' ? prev : levelConfig?.defaultCategory ?? 'cvc'); } }}
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
                  onExit={() => setQuestionType(levelConfig?.defaultCategory ?? 'cvc')}
                />
              ) : questionType === 'review' && reviewQueue.length === 0 && totalAnswered === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center px-6 gap-3">
                  <span className="text-4xl">📖</span>
                  <h2 className="text-lg chalk text-[var(--color-chalk)]">All caught up!</h2>
                  <p className="text-xs ui text-[rgb(var(--color-fg))]/40 text-center max-w-[260px]">
                    No words to practice right now. Words you miss come back on a schedule until they&apos;re fully mastered.
                  </p>
                  <button
                    onClick={() => setQuestionType(levelConfig?.defaultCategory ?? 'cvc')}
                    className="mt-2 px-5 py-2 rounded-xl text-sm ui text-[var(--color-gold)] bg-[var(--color-gold)]/10 border border-[var(--color-gold)]/30 hover:bg-[var(--color-gold)]/20 transition-colors"
                  >
                    Back to Play
                  </button>
                </div>
              ) : dailyComplete ? (
                <DailyChallengeComplete
                  correct={totalCorrect}
                  total={totalAnswered}
                  score={score}
                  onExit={() => setQuestionType(levelConfig?.defaultCategory ?? 'cvc')}
                  mode={questionType === 'review' ? 'review' : questionType === 'challenge' ? 'challenge' : 'daily'}
                />
              ) : (
                <AnimatePresence mode="wait">
                  {currentProblem && (
                    <motion.div
                      key={currentProblem.id}
                      className="flex-1 flex flex-col min-h-0 relative"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15, ease: 'easeOut' }}
                    >
                      <ProblemView
                        problem={currentProblem}
                        frozen={frozen}
                        highlightCorrect={isFirstQuestion || hintWord}
                        showHints={totalCorrect < 4}
                        showTutorial={isFirstQuestion}
                        wrongAnswer={flash === 'wrong' && !isFirstQuestion}
                        onDismissWrong={dismissWrongAnswer}
                        onSwipe={handleSwipe}
                        level={levelConfig?.minDifficultyLevel ?? 1}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              )}
            </div>

            {/* ── Accuracy gate (anti-random-swipe) ── */}
            <AnimatePresence>
              {showAccuracyGate && !frozen && (
                <motion.div
                  key="accuracy-gate"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-40 flex items-center justify-center bg-black/60 px-6"
                >
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="w-full max-w-[300px] bg-[var(--color-surface)] rounded-2xl p-5 border border-[var(--color-gold)]/30 text-center"
                  >
                    <div className="text-3xl mb-2">🤔</div>
                    <h3 className="text-lg chalk text-[var(--color-chalk)] mb-1">Let&apos;s slow down!</h3>
                    <p className="text-xs ui text-[rgb(var(--color-fg))]/40 mb-4">
                      Try listening to each word before answering. Tap the speaker icon to hear it again.
                    </p>
                    <button
                      onClick={() => setAccuracyGateDismissed(totalAnswered)}
                      className="w-full py-2.5 rounded-xl text-sm ui font-medium text-[var(--color-gold)] bg-[var(--color-gold)]/10 border border-[var(--color-gold)]/30 hover:bg-[var(--color-gold)]/20 transition-colors"
                    >
                      Got it, I&apos;ll try harder!
                    </button>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Session complete overlay ── */}
            {sessionComplete && (
              <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/70">
                <div className="w-[300px] bg-[var(--color-surface)] rounded-2xl p-6 border border-[var(--color-gold)]/30 text-center">
                  <div className="text-2xl chalk text-[var(--color-gold)] font-bold mb-2">Session Complete!</div>
                  <div className="text-sm ui text-[rgb(var(--color-fg))]/60 mb-1">
                    {sessionSize} words practiced
                  </div>
                  <div className="text-[10px] ui text-[rgb(var(--color-fg))]/40 mb-4">
                    {totalCorrect} correct out of {totalAnswered}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setSessionSize(null); setSessionAnswered(0); setActiveTab('path'); }}
                      className="flex-1 py-2.5 rounded-xl text-sm ui font-medium text-[rgb(var(--color-fg))]/60 bg-[rgb(var(--color-fg))]/10 hover:bg-[rgb(var(--color-fg))]/15 transition-colors"
                    >
                      Back to Path
                    </button>
                    <button
                      onClick={() => { setSessionAnswered(0); }}
                      className="flex-1 py-2.5 rounded-xl text-sm ui font-medium text-[var(--color-gold)] bg-[var(--color-gold)]/10 border border-[var(--color-gold)]/30 hover:bg-[var(--color-gold)]/20 transition-colors"
                    >
                      Play Again
                    </button>
                  </div>
                </div>
              </div>
            )}

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

            {/* ── Chalk dust on wrong answer ── */}
            {flash === 'wrong' && !reducedMotion && (
              <div key={'dust' + totalAnswered} className="chalk-dust" style={{ left: '50%', top: '45%' }}>
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className="chalk-dust-particle"
                    style={{
                      '--dust-dx': `${(i - 2) * 8}px`,
                      left: `${(i - 2) * 6}px`,
                      animationDelay: `${i * 0.05}s`,
                    } as React.CSSProperties}
                  />
                ))}
              </div>
            )}

            {/* ── Scratch marks on 3+ wrong streak ── */}
            {wrongStreak >= 3 && !reducedMotion && (
              <div key={'scratch' + wrongStreak} className="scratch-marks" />
            )}

            {/* ── Streak milestone popup ── */}
            {milestone && !reducedMotion && (
              <>
              {/* Chalk snap flash before milestone */}
              <div key={'snap' + streak} className="chalk-snap" />
              <div key={milestone + streak} className="milestone-pop absolute inset-0 flex items-center justify-center z-40 text-8xl">
                {milestone}
              </div>
              </>
            )}

            {/* ── Speed bonus ── */}
            {speedBonus && !reducedMotion && (
              <div key={'speed' + score} className="speed-pop absolute left-1/2 -translate-x-1/2 top-[30%] z-40 text-sm ui text-[var(--color-gold)] whitespace-nowrap">
                ⚡ SPEED BONUS +2
              </div>
            )}

            {/* ── Personal best ── */}
            <AnimatePresence>
              {showPB && (
                <motion.div
                  initial={reducedMotion ? {} : { opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={reducedMotion ? {} : { opacity: 0, scale: 0.5 }}
                  className="absolute left-1/2 -translate-x-1/2 top-[18%] z-40 flex flex-col items-center z-40 whitespace-nowrap"
                >
                  <span className="text-lg ui font-bold text-[var(--color-gold)]">🏆 NEW PERSONAL BEST!</span>
                  <span className="text-xs ui text-[var(--color-gold)]/60">{streak}-streak</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Streak near-miss ── */}
            <AnimatePresence>
              {nearMissText && (
                <motion.div
                  key={nearMissText}
                  initial={reducedMotion ? {} : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reducedMotion ? {} : { opacity: 0 }}
                  className="absolute left-1/2 -translate-x-1/2 top-[22%] z-40 text-sm ui font-medium text-[var(--color-streak-fire)] whitespace-nowrap"
                >
                  {nearMissText}
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
                prevCategoryRef.current = questionType;
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
                if (cat.startsWith('tier-')) {
                  onLevelChange(cat as Level);
                }
                setSessionSize(null);
                setSessionAnswered(0);
                setActiveTab('game');
              }}
              onStartSession={(cat, size) => {
                setQuestionType(cat as QuestionType);
                if (cat.startsWith('tier-')) {
                  onLevelChange(cat as Level);
                }
                setSessionSize(size);
                setSessionAnswered(0);
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
              onDialectChange={handleDialectChange}
              masteredCount={masteredCount}
              uniqueWordsAttempted={uniqueWordsAttempted}
            /></Suspense>
          </motion.div>
        )}

        {/* ── Bottom Navigation — hidden during immersive sub-modes ── */}
        {!(activeTab === 'game' && (questionType === 'bee' || questionType === 'guided' || questionType === 'written-test' || guidedMode)) && (
          <BottomNav
            active={activeTab}
            onChange={handleTabChange}
            tabs={navTabs}
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
            prevCategoryRef.current = questionType;
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
        <Toast visible={!!unlockToast} icon="🏅" title={unlockToast?.name ?? ''} subtitle={unlockToast?.desc ?? ''} toastKey={unlockToast?.name} />
        <Toast visible={shieldToast} icon="🛡️" title="Shield saved your streak!" subtitle={`${stats.streakShields} shield${stats.streakShields !== 1 ? 's' : ''} left`} />
        <Toast visible={streakToast} icon="🔥" title={`${stats.dayStreak}-day streak!`} subtitle="Keep it going" />
        <Toast visible={!!improvementToast} icon="📈" title={improvementToast} subtitle="Keep improving!" toastKey={improvementToast} />
        <Toast visible={!!masteryToast} icon="⭐" title={masteryToast} subtitle="Leitner box 4 — well earned" toastKey={masteryToast} stampEffect />

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
            currentLevel={level as Level}
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
