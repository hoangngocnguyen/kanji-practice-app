import { getSupabaseAccessToken } from '../utils/supabaseClient';

export interface PublicUserSummary {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  createdAt?: string;
}

export interface DeckLikerInfo {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  likedAt: string;
}

export interface FollowUserItem {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  followedAt: string;
  isFollowingBack?: boolean;
}

export interface DeckCommunityMeta {
  slug: string;
  likesCount: number;
  downloadsCount: number;
  viewerLiked: boolean;
  likedBy: DeckLikerInfo[];
  author: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
    followersCount: number;
    isFollowing: boolean;
  };
}

export interface MySharedDeckItem {
  slug: string;
  rootFolderId: string | null;
  title: string;
  description: string;
  kanjiCount: number;
  cardCount: number;
  likesCount: number;
  downloadsCount: number;
  likedBy: DeckLikerInfo[];
  updatedAt: string;
}

export interface PublicProfileData {
  profile: PublicUserSummary;
  followersCount: number;
  followingCount: number;
  viewerIsFollowing: boolean;
  isSelf: boolean;
  followers: FollowUserItem[];
  following: FollowUserItem[];
  sharedDecks: Array<{
    slug: string;
    title: string;
    description: string;
    kanjiCount: number;
    likesCount: number;
    downloadsCount: number;
    updatedAt: string;
  }>;
}

export interface MyFollowsData {
  followers: FollowUserItem[];
  following: FollowUserItem[];
}

export interface SearchUserResult {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  createdAt?: string;
  isFollowing: boolean;
}

async function communityRequest<T>(
  url: string,
  options: RequestInit & { requireAuth?: boolean } = {}
): Promise<T> {
  const { requireAuth = false, ...fetchOptions } = options;
  const token = await getSupabaseAccessToken();

  if (requireAuth && !token) {
    throw new Error('Vui lòng đăng nhập tài khoản để thực hiện thao tác này.');
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((fetchOptions.headers as Record<string, string>) || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    ...fetchOptions,
    cache: 'no-store',
    headers,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || `Lỗi máy chủ (${res.status}).`);
  }

  return data as T;
}

export async function apiGetDeckCommunityMeta(slug: string): Promise<DeckCommunityMeta> {
  return communityRequest<DeckCommunityMeta>(
    `/api/community?action=deck_meta&slug=${encodeURIComponent(slug)}`,
    { method: 'GET' }
  );
}

export async function apiRecordDeckDownload(
  slug: string
): Promise<{ downloadsCount: number }> {
  return communityRequest<{ downloadsCount: number }>('/api/community', {
    method: 'POST',
    body: JSON.stringify({ action: 'record_download', slug }),
  });
}

export async function apiToggleDeckLike(
  slug: string,
  desiredState?: boolean
): Promise<{
  liked: boolean;
  likesCount: number;
  likedBy: DeckLikerInfo[];
}> {
  return communityRequest('/api/community', {
    method: 'POST',
    requireAuth: true,
    body: JSON.stringify({
      action: 'toggle_like',
      slug,
      ...(typeof desiredState === 'boolean' ? { desiredState } : {}),
    }),
  });
}

export async function apiGetMyShares(): Promise<{ shares: MySharedDeckItem[] }> {
  return communityRequest('/api/community?action=my_shares', {
    method: 'GET',
    requireAuth: true,
  });
}

export async function apiUnpublishShareBySlug(
  slug: string
): Promise<{ ok: boolean; slug: string }> {
  return communityRequest('/api/community', {
    method: 'POST',
    requireAuth: true,
    body: JSON.stringify({ action: 'unpublish_share', slug }),
  });
}

export async function apiToggleFollowUser(
  targetUserId: string,
  desiredState?: boolean
): Promise<{
  isFollowing: boolean;
  followersCount: number;
}> {
  return communityRequest('/api/community', {
    method: 'POST',
    requireAuth: true,
    body: JSON.stringify({
      action: 'toggle_follow',
      targetUserId,
      ...(typeof desiredState === 'boolean' ? { desiredState } : {}),
    }),
  });
}

export async function apiGetPublicProfile(
  userId: string
): Promise<PublicProfileData> {
  return communityRequest<PublicProfileData>(
    `/api/community?action=public_profile&userId=${encodeURIComponent(userId)}`,
    { method: 'GET' }
  );
}

export async function apiGetMyFollows(): Promise<MyFollowsData> {
  return communityRequest<MyFollowsData>('/api/community?action=my_follows', {
    method: 'GET',
    requireAuth: true,
  });
}

export async function apiSearchUsers(
  query: string
): Promise<{ users: SearchUserResult[] }> {
  return communityRequest<{ users: SearchUserResult[] }>(
    `/api/community?action=search_users&q=${encodeURIComponent(query.trim())}`,
    {
      method: 'GET',
      requireAuth: true,
    }
  );
}
