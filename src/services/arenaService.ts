import { getSupabaseAccessToken } from '../utils/supabaseClient';
import {
  ArenaAdvanceDelta,
  ArenaAdvanceMode,
  ArenaPublicQuestion,
  ArenaQuestionDraft,
  ArenaQuiz,
  ArenaRoomMode,
  ArenaRoomState,
  ArenaSubmitResult,
} from '../types/arena';

const ARENA_PLAYER_ID_KEY = 'luyenkanji_arena_player_id_v1';
const ARENA_GUEST_NAME_KEY = 'luyenkanji_arena_guest_name_v1';
const ARENA_LOCAL_QUIZZES_KEY = 'luyenkanji_arena_local_quizzes_v1';

export function getOrCreateArenaPlayerId(authUserId?: string | null): string {
  if (authUserId) {
    return `user_${authUserId}`;
  }
  try {
    const existing = localStorage.getItem(ARENA_PLAYER_ID_KEY);
    if (existing && existing.length >= 8) return existing;
    const generated =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? `guest_${crypto.randomUUID()}`
        : `guest_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(ARENA_PLAYER_ID_KEY, generated);
    return generated;
  } catch {
    return `guest_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }
}

export function getSavedArenaGuestName(): string {
  try {
    return localStorage.getItem(ARENA_GUEST_NAME_KEY) || '';
  } catch {
    return '';
  }
}

export function saveArenaGuestName(name: string): void {
  try {
    localStorage.setItem(ARENA_GUEST_NAME_KEY, name.trim().slice(0, 40));
  } catch {}
}

async function arenaFetch<T = any>(
  method: 'GET' | 'POST',
  action: string,
  body?: Record<string, any>,
  query?: Record<string, string>
): Promise<T> {
  const token = await getSupabaseAccessToken().catch(() => null);
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let url = `/api/arena?action=${encodeURIComponent(action)}`;
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      url += `&${encodeURIComponent(k)}=${encodeURIComponent(v)}`;
    }
  }

  const res = await fetch(url, {
    method,
    headers,
    body: method === 'POST' ? JSON.stringify({ action, ...(body || {}) }) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || `Lỗi máy chủ (${res.status})`);
  }
  return data as T;
}

export async function fetchArenaRoom(
  roomCode: string,
  playerId: string
): Promise<ArenaRoomState> {
  const res = await arenaFetch<{ room: ArenaRoomState }>('GET', 'get_room', undefined, {
    code: roomCode,
    playerId,
  });
  return res.room;
}

export async function createArenaRoom(params: {
  playerId: string;
  displayName: string;
  mode: ArenaRoomMode;
  advanceMode: ArenaAdvanceMode;
  title: string;
  levelFilter: string;
  quizId?: string | null;
  timePerQuestion: number;
  questions: ArenaQuestionDraft[];
}): Promise<ArenaRoomState> {
  const res = await arenaFetch<{ room: ArenaRoomState }>('POST', 'create_room', params);
  return res.room;
}

export async function joinArenaRoom(params: {
  roomCode: string;
  playerId: string;
  displayName: string;
}): Promise<ArenaRoomState> {
  const res = await arenaFetch<{ room: ArenaRoomState }>('POST', 'join_room', params);
  return res.room;
}

export async function leaveArenaRoom(roomCode: string, playerId: string): Promise<void> {
  await arenaFetch('POST', 'leave_room', { roomCode, playerId });
}

export async function kickArenaPlayer(
  roomCode: string,
  playerId: string,
  targetPlayerId: string
): Promise<ArenaRoomState | null> {
  const res = await arenaFetch<{ room: ArenaRoomState | null }>('POST', 'kick_player', {
    roomCode,
    playerId,
    targetPlayerId,
  });
  return res.room;
}

export async function updateArenaRoomSettings(params: {
  roomCode: string;
  playerId: string;
  advanceMode?: ArenaAdvanceMode;
  timePerQuestion?: number;
}): Promise<ArenaRoomState | null> {
  const res = await arenaFetch<{ room: ArenaRoomState | null }>(
    'POST',
    'update_room_settings',
    params
  );
  return res.room;
}

export async function startArenaRoom(
  roomCode: string,
  playerId: string
): Promise<ArenaRoomState> {
  const res = await arenaFetch<{ room: ArenaRoomState }>('POST', 'start_room', {
    roomCode,
    playerId,
  });
  return res.room;
}

export async function submitArenaAnswer(params: {
  roomCode: string;
  playerId: string;
  questionIndex: number;
  optionId: string;
}): Promise<ArenaSubmitResult> {
  return arenaFetch<ArenaSubmitResult>('POST', 'submit_answer', params);
}

export async function advanceArenaQuestion(params: {
  roomCode: string;
  playerId: string;
  expectedIndex: number;
}): Promise<ArenaAdvanceDelta | null> {
  const res = await arenaFetch<{ delta?: ArenaAdvanceDelta | null }>(
    'POST',
    'advance_question',
    params
  );
  return res.delta ?? null;
}

export async function resolveCorrectOptionsFromHashes(
  roomId: string,
  questions: ArenaPublicQuestion[]
): Promise<Record<string, string>> {
  const resolved: Record<string, string> = {};
  if (
    typeof crypto === 'undefined' ||
    !crypto.subtle ||
    typeof TextEncoder === 'undefined'
  ) {
    for (const q of questions) {
      if (q.correctOptionId) resolved[q.id] = q.correctOptionId;
    }
    return resolved;
  }

  const encoder = new TextEncoder();

  await Promise.all(
    questions.map(async (q) => {
      if (q.correctOptionId) {
        resolved[q.id] = q.correctOptionId;
        return;
      }
      if (!q.correctHash) return;

      for (const opt of q.options) {
        const buf = await crypto.subtle.digest(
          'SHA-256',
          encoder.encode(`${roomId}:${q.id}:${opt.id}`)
        );
        const bytes = new Uint8Array(buf);
        let hex = '';
        for (let i = 0; i < bytes.length; i++) {
          hex += bytes[i].toString(16).padStart(2, '0');
        }
        if (hex === q.correctHash) {
          resolved[q.id] = opt.id;
          return;
        }
      }
    })
  );

  return resolved;
}

export async function rematchArenaRoom(params: {
  roomCode: string;
  playerId: string;
  questions?: ArenaQuestionDraft[];
}): Promise<ArenaRoomState | null> {
  const res = await arenaFetch<{ room: ArenaRoomState | null }>('POST', 'rematch_room', params);
  return res.room;
}

// ============================================================================
// Quiz Library (Cloud Supabase for logged-in users + Local fallback)
// ============================================================================

export function loadLocalArenaQuizzes(): ArenaQuiz[] {
  try {
    const raw = localStorage.getItem(ARENA_LOCAL_QUIZZES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveLocalArenaQuizzes(quizzes: ArenaQuiz[]): void {
  try {
    localStorage.setItem(ARENA_LOCAL_QUIZZES_KEY, JSON.stringify(quizzes.slice(0, 30)));
  } catch {}
}

function normalizeServerQuiz(row: any): ArenaQuiz {
  return {
    id: row.id,
    ownerId: row.owner_id,
    title: row.title,
    description: row.description || '',
    levelTag: row.level_tag || 'MIXED',
    timePerQuestion: Number(row.time_per_question || 15),
    questions: Array.isArray(row.questions) ? row.questions : [],
    playCount: Number(row.play_count || 0),
    updatedAt: row.updated_at || row.created_at || new Date().toISOString(),
    isLocalOnly: false,
  };
}

export async function listMyArenaQuizzes(isAuthenticated: boolean): Promise<ArenaQuiz[]> {
  const localQuizzes = loadLocalArenaQuizzes();
  if (!isAuthenticated) return localQuizzes;

  try {
    const res = await arenaFetch<{ quizzes: any[] }>('GET', 'list_quizzes');
    const cloud = (res.quizzes || []).map(normalizeServerQuiz);
    const cloudIds = new Set(cloud.map((q) => q.id));
    const merged = [...cloud, ...localQuizzes.filter((l) => !cloudIds.has(l.id))];
    return merged;
  } catch {
    return localQuizzes;
  }
}

export async function saveArenaQuiz(
  quiz: {
    id?: string;
    title: string;
    description: string;
    levelTag: string;
    timePerQuestion: number;
    questions: ArenaQuestionDraft[];
  },
  isAuthenticated: boolean
): Promise<ArenaQuiz> {
  if (isAuthenticated) {
    const isLocalId = Boolean(quiz.id && quiz.id.startsWith('local-'));
    const res = await arenaFetch<{ quiz: any }>('POST', 'save_quiz', {
      ...quiz,
      id: isLocalId ? undefined : quiz.id,
    });
    const saved = normalizeServerQuiz(res.quiz);
    if (isLocalId && quiz.id) {
      const local = loadLocalArenaQuizzes().filter((q) => q.id !== quiz.id);
      saveLocalArenaQuizzes(local);
    }
    return saved;
  }

  const localList = loadLocalArenaQuizzes();
  const id = quiz.id || `local-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const entry: ArenaQuiz = {
    id,
    title: quiz.title.trim(),
    description: quiz.description.trim(),
    levelTag: quiz.levelTag || 'MIXED',
    timePerQuestion: quiz.timePerQuestion,
    questions: quiz.questions,
    playCount: 0,
    updatedAt: new Date().toISOString(),
    isLocalOnly: true,
  };
  const next = [entry, ...localList.filter((q) => q.id !== id)];
  saveLocalArenaQuizzes(next);
  return entry;
}

export async function deleteArenaQuiz(
  quizId: string,
  isAuthenticated: boolean
): Promise<void> {
  if (quizId.startsWith('local-') || !isAuthenticated) {
    const local = loadLocalArenaQuizzes().filter((q) => q.id !== quizId);
    saveLocalArenaQuizzes(local);
    return;
  }
  await arenaFetch('POST', 'delete_quiz', { id: quizId });
}
