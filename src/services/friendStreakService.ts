import { getSupabaseAccessToken } from '../utils/supabaseClient';

export const FRIEND_STREAKS_UPDATED_EVENT = 'lk-friend-streaks-updated';

export interface FreezeState {
  streakFreezes: number;
  maxFreezes: number;
  freezeRechargeDays: number;
  rechargeTarget: number;
  frozenDates: string[];
}

export interface FriendStreakPartner {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  currentStreak: number;
  longestStreak: number;
  todayCount: number;
  dailyGoal: number;
  studiedToday: boolean;
  frozenToday: boolean;
  streakFreezes: number;
}

export interface FriendStreakPair {
  pairId: string;
  partner: FriendStreakPartner;
  pairStreak: number;
  longestPairStreak: number;
  lastPairDate: string | null;
  isActiveToday: boolean;
  viewerStudiedToday: boolean;
  viewerFrozenToday: boolean;
  canNudge: boolean;
  nudgedToday: boolean;
  canRescue: boolean;
  rescueTargetDate: string | null;
  rescueReason: string | null;
  rescueCooldownActive: boolean;
  createdAt: string;
}

export interface IncomingFriendStreakInvite {
  id: string;
  inviteCode: string;
  inviter: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
  };
  expiresAt: string;
  createdAt: string;
}

export interface OutgoingFriendStreakInvite {
  id: string;
  inviteCode: string;
  invitee: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
  } | null;
  expiresAt: string;
  createdAt: string;
}

export interface FriendStreaksHubData {
  tableReady: boolean;
  maxSlots: number;
  freezeState: FreezeState;
  activePairs: FriendStreakPair[];
  incomingInvites: IncomingFriendStreakInvite[];
  outgoingInvites: OutgoingFriendStreakInvite[];
}

export interface FriendStreakInvitePreview {
  tableReady: boolean;
  invite: {
    id: string;
    inviteCode: string;
    status: 'pending' | 'accepted' | 'declined' | 'canceled' | 'expired';
    expiresAt: string;
    isTargetedToOther: boolean;
    isOwnInvite: boolean;
    alreadyConnected: boolean;
    viewerSlotsFull: boolean;
    inviter: {
      id: string;
      displayName: string;
      avatarUrl: string | null;
      currentStreak: number;
    };
  } | null;
}

async function authHeaders(required = true): Promise<Record<string, string>> {
  const token = await getSupabaseAccessToken();
  if (!token) {
    if (required) throw new Error('Vui lòng đăng nhập để sử dụng tính năng này.');
    return {};
  }
  return { Authorization: `Bearer ${token}` };
}

export async function apiGetFriendStreaksHub(): Promise<FriendStreaksHubData> {
  const headers = await authHeaders(true);
  const res = await fetch('/api/community?action=friend_streaks_hub', {
    method: 'GET',
    cache: 'no-store',
    headers,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || 'Không thể tải danh sách Streak bạn bè.');
  }
  return data as FriendStreaksHubData;
}

export async function apiGetFriendStreakInvitePreview(
  code: string
): Promise<FriendStreakInvitePreview> {
  const headers = await authHeaders(false);
  const res = await fetch(
    `/api/community?action=friend_streak_invite_preview&code=${encodeURIComponent(code)}`,
    {
      method: 'GET',
      cache: 'no-store',
      headers,
    }
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || 'Không thể tải thông tin lời mời nối Streak.');
  }
  return data as FriendStreakInvitePreview;
}

export async function apiCreateFriendStreakInvite(
  targetUserId?: string
): Promise<{
  alreadyPending?: boolean;
  invite: { id: string; inviteCode: string; expiresAt: string; createdAt?: string };
}> {
  const headers = await authHeaders(true);
  const res = await fetch('/api/community', {
    method: 'POST',
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify({
      action: 'create_friend_streak_invite',
      ...(targetUserId ? { targetUserId } : {}),
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || 'Không thể tạo lời mời nối Streak.');
  }
  return data;
}

export async function apiRespondFriendStreakInvite(params: {
  inviteId?: string;
  inviteCode?: string;
  decision: 'accept' | 'decline' | 'cancel';
}): Promise<{ ok: boolean; status: string; pairId?: string; alreadyConnected?: boolean }> {
  const headers = await authHeaders(true);
  const res = await fetch('/api/community', {
    method: 'POST',
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify({
      action: 'respond_friend_streak_invite',
      ...params,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || 'Không thể xử lý lời mời nối Streak.');
  }
  return data;
}

export async function apiNudgeFriendStreak(pairId: string): Promise<void> {
  const headers = await authHeaders(true);
  const res = await fetch('/api/community', {
    method: 'POST',
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify({
      action: 'nudge_friend_streak',
      pairId,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || 'Không thể gửi nhắc học lúc này.');
  }
}

export async function apiRescueFriendStreak(pairId: string): Promise<{
  ok: boolean;
  targetDate: string;
  remainingFreezes: number;
}> {
  const headers = await authHeaders(true);
  const res = await fetch('/api/community', {
    method: 'POST',
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify({
      action: 'rescue_friend_streak',
      pairId,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || 'Không thể cứu Streak cho bạn bè lúc này.');
  }
  return data;
}

export async function apiEndFriendStreak(pairId: string): Promise<void> {
  const headers = await authHeaders(true);
  const res = await fetch('/api/community', {
    method: 'POST',
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify({
      action: 'end_friend_streak',
      pairId,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || 'Không thể ngắt kết nối Streak bạn bè.');
  }
}
