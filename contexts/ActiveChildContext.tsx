/**
 * ActiveChildContext
 *
 * Stores the currently selected child ID globally so the progress screen
 * always defaults to the same child selected on the dashboard, even when
 * navigated via the bottom tab bar (no URL params).
 *
 * Persisted to AsyncStorage so the selection survives cold starts.
 * Works for both the preschool path (useParentDashboardState) and the
 * K12 path (useK12ParentDashboard), which previously never wrote here.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@edudash:activeChildId';

interface ActiveChildContextValue {
  activeChildId: string | null;
  /** Persists to AsyncStorage and updates in-memory state */
  setActiveChildId: (id: string | null) => void;
  /** True while the initial AsyncStorage read is in progress */
  isHydrated: boolean;
}

const ActiveChildContext = createContext<ActiveChildContextValue>({
  activeChildId: null,
  setActiveChildId: () => {},
  isHydrated: false,
});

export function ActiveChildProvider({ children }: { children: ReactNode }) {
  const [activeChildId, _setActiveChildId] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  // Hydrate from AsyncStorage on mount
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (stored) _setActiveChildId(stored);
      })
      .catch(() => {})
      .finally(() => setIsHydrated(true));
  }, []);

  const setActiveChildId = useCallback((id: string | null) => {
    _setActiveChildId(id);
    if (id) {
      AsyncStorage.setItem(STORAGE_KEY, id).catch(() => {});
    } else {
      AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
    }
  }, []);

  return (
    <ActiveChildContext.Provider value={{ activeChildId, setActiveChildId, isHydrated }}>
      {children}
    </ActiveChildContext.Provider>
  );
}

export function useActiveChild(): ActiveChildContextValue {
  return useContext(ActiveChildContext);
}
