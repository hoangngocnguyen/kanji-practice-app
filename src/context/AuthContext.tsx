import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { User } from '@supabase/supabase-js';
import {
  getCurrentSupabaseUser,
  isSupabaseConfigured,
  supabase,
} from '../utils/supabaseClient';
import {
  fetchUserProfile,
  logoutAccount,
  updateUserDisplayName,
  UserProfile,
} from '../services/authService';

interface AuthContextValue {
  supabaseEnabled: boolean;
  user: User | null;
  profile: UserProfile | null;
  isAuthLoading: boolean;
  displayName: string;
  avatarUrl: string | null;
  avatarInitials: string;
  refreshProfile: () => Promise<UserProfile | null>;
  updateDisplayName: (name: string) => Promise<UserProfile>;
  logout: () => Promise<void>;

  // Auth & Auth Guard Modals
  isAuthModalOpen: boolean;
  authModalTab: 'login' | 'signup';
  openAuthModal: (tab?: 'login' | 'signup') => void;
  closeAuthModal: () => void;

  authGuardFeature: string | null;
  openAuthGuard: (featureLabel: string) => void;
  closeAuthGuard: () => void;
  requireAuthOrGuard: (featureLabel: string, action: () => void) => boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function computeInitials(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return 'K';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const supabaseEnabled = isSupabaseConfigured();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(supabaseEnabled);

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<'login' | 'signup'>('login');
  const [authGuardFeature, setAuthGuardFeature] = useState<string | null>(null);

  const refreshProfile = useCallback(async (): Promise<UserProfile | null> => {
    if (!supabaseEnabled) return null;
    try {
      const data = await fetchUserProfile();
      setProfile(data);
      return data;
    } catch {
      return null;
    }
  }, [supabaseEnabled]);

  useEffect(() => {
    if (!supabaseEnabled || !supabase) {
      setIsAuthLoading(false);
      return;
    }

    let active = true;

    getCurrentSupabaseUser()
      .then((currentUser) => {
        if (!active) return;
        setUser(currentUser);
        if (currentUser) {
          refreshProfile();
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) setIsAuthLoading(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUser = session?.user ?? null;
      setUser(nextUser);
      if (nextUser) {
        refreshProfile();
      } else {
        setProfile(null);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [supabaseEnabled, refreshProfile]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.has('code') || params.has('oauth_error')) {
      const cleanUrl = `${window.location.pathname}${window.location.hash || ''}`;
      const timer = window.setTimeout(() => {
        window.history.replaceState({}, '', cleanUrl);
      }, 800);
      return () => window.clearTimeout(timer);
    }
  }, []);

  const displayName = useMemo(() => {
    const fromProfile = profile?.displayName?.trim() || '';
    const emailPrefix = user?.email ? user.email.split('@')[0].trim() : '';
    const isCustomName =
      user?.user_metadata?.custom_display_name === true ||
      user?.user_metadata?.custom_display_name === 'true';

    const fromGoogleMeta = (
      (user?.user_metadata?.full_name as string | undefined) ||
      (user?.user_metadata?.name as string | undefined) ||
      ''
    ).trim();
    const fromMetaDisplay = (
      (user?.user_metadata?.display_name as string | undefined) || ''
    ).trim();

    if (isCustomName && (fromProfile || fromMetaDisplay)) {
      return fromProfile || fromMetaDisplay;
    }

    const isEmailPrefix = (val: string) =>
      Boolean(emailPrefix && val && val.toLowerCase() === emailPrefix.toLowerCase());

    if (fromProfile && (!isEmailPrefix(fromProfile) || !fromGoogleMeta)) {
      return fromProfile;
    }
    if (fromMetaDisplay && (!isEmailPrefix(fromMetaDisplay) || !fromGoogleMeta)) {
      return fromMetaDisplay;
    }
    if (fromGoogleMeta) return fromGoogleMeta;
    if (fromProfile) return fromProfile;
    if (emailPrefix) return emailPrefix;
    return 'Thành viên';
  }, [profile, user]);

  const avatarUrl = useMemo(() => {
    const candidate = (
      profile?.avatarUrl ||
      (user?.user_metadata?.avatar_url as string | undefined) ||
      (user?.user_metadata?.picture as string | undefined) ||
      ''
    ).trim();
    if (candidate && /^https?:\/\//i.test(candidate)) {
      return candidate;
    }
    return null;
  }, [profile, user]);

  const avatarInitials = useMemo(() => computeInitials(displayName), [displayName]);

  const updateDisplayName = useCallback(async (name: string) => {
    const updated = await updateUserDisplayName(name);
    setProfile((prev) => ({
      ...(prev || updated),
      ...updated,
    }));
    return updated;
  }, []);

  const logout = useCallback(async () => {
    await logoutAccount();
    setUser(null);
    setProfile(null);
  }, []);

  const openAuthModal = useCallback((tab: 'login' | 'signup' = 'login') => {
    setAuthGuardFeature(null);
    setAuthModalTab(tab);
    setIsAuthModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setIsAuthModalOpen(false);
  }, []);

  const openAuthGuard = useCallback((featureLabel: string) => {
    setAuthGuardFeature(featureLabel);
  }, []);

  const closeAuthGuard = useCallback(() => {
    setAuthGuardFeature(null);
  }, []);

  const requireAuthOrGuard = useCallback(
    (featureLabel: string, action: () => void): boolean => {
      if (!user) {
        setAuthGuardFeature(featureLabel);
        return false;
      }
      action();
      return true;
    },
    [user]
  );

  return (
    <AuthContext.Provider
      value={{
        supabaseEnabled,
        user,
        profile,
        isAuthLoading,
        displayName,
        avatarUrl,
        avatarInitials,
        refreshProfile,
        updateDisplayName,
        logout,
        isAuthModalOpen,
        authModalTab,
        openAuthModal,
        closeAuthModal,
        authGuardFeature,
        openAuthGuard,
        closeAuthGuard,
        requireAuthOrGuard,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
};
