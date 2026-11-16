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

  const displayName = useMemo(() => {
    const fromProfile = profile?.displayName?.trim();
    if (fromProfile) return fromProfile;
    const fromMeta = (user?.user_metadata?.display_name as string | undefined)?.trim();
    if (fromMeta) return fromMeta;
    if (user?.email) return user.email.split('@')[0];
    return 'Thành viên';
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
