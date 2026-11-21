import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';

interface LoadingContextType {
  startLoading: (key: string) => void;
  stopLoading: (key: string) => void;
  isGlobalLoading: boolean;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export const LoadingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const [activeKeys, setActiveKeys] = useState<Set<string>>(() => new Set());
  const isFirstRenderRef = useRef(true);

  const startLoading = useCallback((key: string) => {
    setActiveKeys((prev) => {
      if (prev.has(key)) return prev;
      const next = new Set(prev);
      next.add(key);
      return next;
    });
  }, []);

  const stopLoading = useCallback((key: string) => {
    setActiveKeys((prev) => {
      if (!prev.has(key)) return prev;
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  }, []);

  // Trigger brief route-transition indicator whenever route pathname changes
  useEffect(() => {
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      return;
    }

    const navKey = '__route_transition__';
    startLoading(navKey);
    const timer = window.setTimeout(() => {
      stopLoading(navKey);
    }, 240);

    return () => {
      window.clearTimeout(timer);
      stopLoading(navKey);
    };
  }, [location.pathname, startLoading, stopLoading]);

  const value = useMemo<LoadingContextType>(
    () => ({
      startLoading,
      stopLoading,
      isGlobalLoading: activeKeys.size > 0,
    }),
    [startLoading, stopLoading, activeKeys]
  );

  return <LoadingContext.Provider value={value}>{children}</LoadingContext.Provider>;
};

export function useGlobalLoading(): LoadingContextType {
  const ctx = useContext(LoadingContext);
  if (!ctx) {
    throw new Error('useGlobalLoading must be used within LoadingProvider');
  }
  return ctx;
}

/**
 * Registers an async page's loading state into the global top progress bar.
 * Automatically cleans up on unmount so navigation never leaves the bar stuck.
 */
export function usePageLoadingIndicator(key: string, isLoading: boolean): void {
  const ctx = useContext(LoadingContext);

  useEffect(() => {
    if (!ctx) return;
    if (isLoading) {
      ctx.startLoading(key);
    } else {
      ctx.stopLoading(key);
    }
    return () => {
      ctx.stopLoading(key);
    };
  }, [ctx, key, isLoading]);
}
