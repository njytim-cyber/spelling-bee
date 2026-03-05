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
import { usePremium } from '../hooks/usePremium';
import { useReferral } from '../hooks/useReferral';
import { STORAGE_KEYS } from '../config';
import type { ChalkTheme } from '../utils/chalkThemes';
import type { Dialect } from '../domains/spelling/words/types';
import type { Level } from '../domains/spelling/spellingCategories';
import { DEFAULT_AVATAR } from '../utils/avatarParts';
import { useProfiles } from '../hooks/useProfiles';
import type { LearnerProfile } from '../hooks/useProfiles';

interface UserContextValue {
  // Stats
  stats: ReturnType<typeof useStats>['stats'];
  accuracy: number;
  syncPending: boolean;
  syncFailed: boolean;
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
  avatarConfig: string;
  onAvatarChange: (config: string) => void;

  // Auth & Profile
  displayName: string;
  setDisplayName: (name: string) => Promise<void>;
  isAnonymous: boolean;
  linkGoogle: () => Promise<void>;
  sendEmailLink: (email: string) => Promise<void>;
  deleteAccount: () => Promise<void>;

  // Settings
  level: string;
  onLevelChange: (level: Level) => void;
  dialect: string;
  onDialectChange: (d: Dialect) => void;

  // Premium / Champion Pass
  isPremium: boolean;
  championPassExpiry: string;
  daysRemaining: number;
  activateTrial: (days: number) => string;
  extendPass: (days: number) => string;
  setExpiryFromServer: (expiry: string) => void;
  setPaidSubscription: (expiry: string, status: 'active' | 'canceled') => void;
  trialUsed: boolean;
  isTrial: boolean;
  isPaidSubscriber: boolean;
  subscriptionStatus: string;

  // Referral
  referralCode: string;
  referralCount: number;
  pendingReferral: string;
  referralRedeemed: boolean;
  referralError: string;
  redeemReferral: () => Promise<void>;
  getReferralUrl: () => string;
  shareReferral: () => Promise<void>;

  // Purchased cosmetic packs
  purchasedPacks: string[];
  addPurchasedPack: (packId: string) => void;

  // Profiles (Bee Team tier)
  profiles: LearnerProfile[];
  activeProfileId: string | null;
  activeProfile: LearnerProfile | null;
  isParentMode: boolean;
  canAddProfile: boolean;
  addProfile: (name: string, avatarConfig: string, level: string) => LearnerProfile | null;
  removeProfile: (profileId: string) => void;
  switchProfile: (profileId: string | null) => void;
  updateProfile: (profileId: string, updates: Partial<Pick<LearnerProfile, 'name' | 'avatarConfig' | 'level'>>) => void;

  // Custom branding (Bee Team)
  customBranding: string;
  setCustomBranding: (branding: string) => void;
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
    syncPending,
    syncFailed,
    recordSession,
    recordBeeResult,
    resetStats,
    updateBadge,
    consumeShield,
    purchaseStreakFreeze,
    updateCosmetics
  } = useStats(uid);

  const { user, setDisplayName, linkGoogle, sendEmailLink, deleteAccount } = useFirebaseAuth();

  // Premium & Referral
  const premium = usePremium(uid);
  const referral = useReferral(uid);

  // Profiles (Bee Team)
  const profilesHook = useProfiles(uid);

  // Custom branding (Bee Team)
  const [customBranding, setCustomBranding] = useLocalState(STORAGE_KEYS.customBranding, '', uid);

  // Cosmetics
  const [activeCostume, setActiveCostume] = useLocalState(STORAGE_KEYS.costume, '', uid);
  const [activeTheme, setActiveTheme] = useLocalState(STORAGE_KEYS.chalkTheme, 'classic', uid);
  const [activeTrailId, setActiveTrailId] = useLocalState(STORAGE_KEYS.trail, '', uid);
  const [avatarConfig, setAvatarConfig] = useLocalState(STORAGE_KEYS.stickFigureStyle, DEFAULT_AVATAR, uid);

  // Settings
  const [level, setLevel] = useLocalState(STORAGE_KEYS.grade, '', uid);
  const [dialect, setDialect] = useLocalState(STORAGE_KEYS.dialect, 'en-US', uid);

  // Purchased packs (JSON array of pack IDs)
  const [purchasedPacksRaw, setPurchasedPacksRaw] = useLocalState(STORAGE_KEYS.purchasedPacks, '[]', uid);
  const purchasedPacks = useMemo<string[]>(() => {
    try { return JSON.parse(purchasedPacksRaw as string); } catch { return []; }
  }, [purchasedPacksRaw]);
  const addPurchasedPack = useCallback((packId: string) => {
    if (!purchasedPacks.includes(packId)) {
      setPurchasedPacksRaw(JSON.stringify([...purchasedPacks, packId]));
    }
  }, [purchasedPacks, setPurchasedPacksRaw]);

  const onCostumeChange = useCallback((id: string) => setActiveCostume(id), [setActiveCostume]);
  const onThemeChange = useCallback((theme: ChalkTheme) => setActiveTheme(theme.id), [setActiveTheme]);
  const onTrailChange = useCallback((id: string) => setActiveTrailId(id), [setActiveTrailId]);
  const onAvatarChange = useCallback((config: string) => setAvatarConfig(config), [setAvatarConfig]);
  const onLevelChange = useCallback((l: Level) => setLevel(l), [setLevel]);
  const onDialectChange = useCallback((d: Dialect) => setDialect(d), [setDialect]);

  const value = useMemo<UserContextValue>(() => ({
    stats,
    accuracy,
    syncPending,
    syncFailed,
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
    avatarConfig: avatarConfig as string,
    onAvatarChange,
    displayName: user?.displayName ?? '',
    setDisplayName,
    isAnonymous: user?.isAnonymous ?? true,
    linkGoogle,
    sendEmailLink,
    deleteAccount,
    level: level as string,
    onLevelChange,
    dialect: dialect as string,
    onDialectChange,
    // Premium
    isPremium: premium.isPremium,
    championPassExpiry: premium.championPassExpiry,
    daysRemaining: premium.daysRemaining,
    activateTrial: premium.activateTrial,
    extendPass: premium.extendPass,
    setExpiryFromServer: premium.setExpiryFromServer,
    setPaidSubscription: premium.setPaidSubscription,
    trialUsed: premium.trialUsed,
    isTrial: premium.isTrial,
    isPaidSubscriber: premium.isPaidSubscriber,
    subscriptionStatus: premium.subscriptionStatus,
    // Referral
    referralCode: referral.referralCode,
    referralCount: referral.referralCount,
    pendingReferral: referral.pendingReferral,
    referralRedeemed: referral.referralRedeemed,
    referralError: referral.referralError,
    redeemReferral: referral.redeemReferral,
    getReferralUrl: referral.getReferralUrl,
    shareReferral: referral.shareReferral,
    // Purchased packs
    purchasedPacks,
    addPurchasedPack,
    // Profiles (Bee Team)
    profiles: profilesHook.profiles,
    activeProfileId: profilesHook.activeProfileId,
    activeProfile: profilesHook.activeProfile,
    isParentMode: profilesHook.isParentMode,
    canAddProfile: profilesHook.canAddProfile,
    addProfile: profilesHook.addProfile,
    removeProfile: profilesHook.removeProfile,
    switchProfile: profilesHook.switchProfile,
    updateProfile: profilesHook.updateProfile,
    // Custom branding
    customBranding: customBranding as string,
    setCustomBranding: (v: string) => setCustomBranding(v),
  }), [
    stats, accuracy, syncPending, syncFailed, recordSession, recordBeeResult, resetStats,
    updateBadge, consumeShield, purchaseStreakFreeze, updateCosmetics,
    activeCostume, onCostumeChange, activeTheme, onThemeChange,
    activeTrailId, onTrailChange, avatarConfig, onAvatarChange, user?.displayName, setDisplayName,
    user?.isAnonymous, linkGoogle, sendEmailLink, deleteAccount, level, onLevelChange,
    dialect, onDialectChange,
    premium.isPremium, premium.championPassExpiry, premium.daysRemaining,
    premium.activateTrial, premium.extendPass, premium.setExpiryFromServer,
    premium.setPaidSubscription, premium.trialUsed, premium.isTrial,
    premium.isPaidSubscriber, premium.subscriptionStatus,
    referral.referralCode, referral.referralCount, referral.pendingReferral,
    referral.referralRedeemed, referral.referralError, referral.redeemReferral,
    referral.getReferralUrl, referral.shareReferral,
    purchasedPacks, addPurchasedPack,
    profilesHook.profiles, profilesHook.activeProfileId, profilesHook.activeProfile,
    profilesHook.isParentMode, profilesHook.canAddProfile,
    profilesHook.addProfile, profilesHook.removeProfile, profilesHook.switchProfile,
    profilesHook.updateProfile,
    customBranding, setCustomBranding,
  ]);

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUser must be used within UserProvider');
  return ctx;
}
