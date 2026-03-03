/**
 * contexts/UserContext.tsx
 *
 * Consolidates user-related state (stats, cosmetics, auth) to reduce
 * prop drilling and stabilize component memoization.
 */
import { createContext, useContext, useCallback, useMemo } from 'react';
import type { ReactNode } from 'react';
import { useStats } from '../hooks/useStats';
import { useLocalState } from '../hooks/useLocalState';
import { useFirebaseAuth } from '../hooks/useFirebaseAuth';
import { STORAGE_KEYS } from '../config';
import type { ChalkTheme } from '../utils/chalkThemes';
import type { Dialect } from '../domains/spelling/words/types';
import type { Level } from '../domains/spelling/spellingCategories';

interface UserContextValue {
  // Stats
  stats: ReturnType<typeof useStats>['stats'];
  accuracy: number;
  recordSession: ReturnType<typeof useStats>['recordSession'];
  recordBeeResult: ReturnType<typeof useStats>['recordBeeResult'];
  resetStats: ReturnType<typeof useStats>['resetStats'];
  updateBadge: ReturnType<typeof useStats>['updateBadge'];
  consumeShield: ReturnType<typeof useStats>['consumeShield'];
  purchaseStreakFreeze: ReturnType<typeof useStats>['purchaseStreakFreeze'];
  updateCosmetics: ReturnType<typeof useStats>['updateCosmetics'];

  // Cosmetics
  activeCostume: string;
  onCostumeChange: (id: string) => void;
  activeTheme: string;
  onThemeChange: (theme: ChalkTheme) => void;
  activeTrailId: string;
  onTrailChange: (id: string) => void;

  // Auth & Profile
  displayName: string;
  setDisplayName: (name: string) => Promise<void>;
  isAnonymous: boolean;
  linkGoogle: () => Promise<void>;
  sendEmailLink: (email: string) => Promise<void>;

  // Settings
  level: string;
  onLevelChange: (level: Level) => void;
  dialect: string;
  onDialectChange: (d: Dialect) => void;
}

const UserContext = createContext<UserContextValue | null>(null);

interface UserProviderProps {
  children: ReactNode;
  uid: string | null;
}

export function UserProvider({ children, uid }: UserProviderProps) {
  const {
    stats,
    accuracy,
    recordSession,
    recordBeeResult,
    resetStats,
    updateBadge,
    consumeShield,
    purchaseStreakFreeze,
    updateCosmetics
  } = useStats(uid);

  const { user, setDisplayName, linkGoogle, sendEmailLink } = useFirebaseAuth();

  // Cosmetics
  const [activeCostume, setActiveCostume] = useLocalState(STORAGE_KEYS.costume, '', uid);
  const [activeTheme, setActiveTheme] = useLocalState(STORAGE_KEYS.chalkTheme, 'classic', uid);
  const [activeTrailId, setActiveTrailId] = useLocalState(STORAGE_KEYS.trail, '', uid);

  // Settings
  const [level, setLevel] = useLocalState(STORAGE_KEYS.grade, '', uid);
  const [dialect, setDialect] = useLocalState(STORAGE_KEYS.dialect, 'en-US', uid);

  const onCostumeChange = useCallback((id: string) => setActiveCostume(id), [setActiveCostume]);
  const onThemeChange = useCallback((theme: ChalkTheme) => setActiveTheme(theme.id), [setActiveTheme]);
  const onTrailChange = useCallback((id: string) => setActiveTrailId(id), [setActiveTrailId]);
  const onLevelChange = useCallback((l: Level) => setLevel(l), [setLevel]);
  const onDialectChange = useCallback((d: Dialect) => setDialect(d), [setDialect]);

  const value = useMemo<UserContextValue>(() => ({
    stats,
    accuracy,
    recordSession,
    recordBeeResult,
    resetStats,
    updateBadge,
    consumeShield,
    purchaseStreakFreeze,
    updateCosmetics,
    activeCostume: activeCostume as string,
    onCostumeChange,
    activeTheme: activeTheme as string,
    onThemeChange,
    activeTrailId: activeTrailId as string,
    onTrailChange,
    displayName: user?.displayName ?? '',
    setDisplayName,
    isAnonymous: user?.isAnonymous ?? true,
    linkGoogle,
    sendEmailLink,
    level: level as string,
    onLevelChange,
    dialect: dialect as string,
    onDialectChange,
  }), [
    stats, accuracy, recordSession, recordBeeResult, resetStats,
    updateBadge, consumeShield, purchaseStreakFreeze, updateCosmetics,
    activeCostume, onCostumeChange, activeTheme, onThemeChange,
    activeTrailId, onTrailChange, user?.displayName, setDisplayName,
    user?.isAnonymous, linkGoogle, sendEmailLink, level, onLevelChange,
    dialect, onDialectChange,
  ]);

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUser must be used within UserProvider');
  return ctx;
}
