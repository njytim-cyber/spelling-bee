/**
 * hooks/useAppModals.ts
 *
 * Consolidates modal state management to reduce App.tsx state variables.
 */
import { useState, useCallback } from 'react';

interface ModalState {
  showOnboarding: boolean;
  showCustomLists: boolean;
  showMultiplayerLobby: boolean;
  showSummary: boolean;
}

export function useAppModals() {
  const [modals, setModals] = useState<ModalState>({
    showOnboarding: false,
    showCustomLists: false,
    showMultiplayerLobby: false,
    showSummary: false,
  });

  const openModal = useCallback((name: keyof ModalState) => {
    setModals(prev => ({ ...prev, [name]: true }));
  }, []);

  const closeModal = useCallback((name: keyof ModalState) => {
    setModals(prev => ({ ...prev, [name]: false }));
  }, []);

  const setShowOnboarding = useCallback((value: boolean) => {
    setModals(prev => ({ ...prev, showOnboarding: value }));
  }, []);

  const setShowSummary = useCallback((value: boolean) => {
    setModals(prev => ({ ...prev, showSummary: value }));
  }, []);

  return {
    ...modals,
    openModal,
    closeModal,
    setShowOnboarding,
    setShowSummary,
  };
}
