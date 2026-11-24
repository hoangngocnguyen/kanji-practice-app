import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createHash } from 'node:crypto';
import { optionalAuth, requireAuth, setCorsHeaders } from './_lib/auth.js';
import { getSupabaseAdmin, isServerSupabaseConfigured } from './_lib/supabaseAdmin.js';

function getAdminOnly(res: any): SupabaseClient | null {
  if (!isServerSupabaseConfigured()) {
    res.status(503).json({
      error: 'Máy chủ chưa cấu hình SUPABASE_URL hoặc SUPABASE_SECRET_KEY.',
      code: 'SUPABASE_NOT_CONFIGURED',
    });
    return null;
  }
  return getSupabaseAdmin();
}

function computeOptionHash(roomId: string, questionId: string, optionId: string): string {
  return createHash('sha256')
    .update(`${roomId}:${questionId}:${optionId}`)
    .digest('hex');
}

interface StoredArenaOption {
  id: string;
  label: string;
  subLabel?: string;
}

interface StoredArenaQuestion {
  id: string;
  kanji: string;
  mode: string;
  promptPrimary: string;
  promptSub?: string;
  sentenceJp?: string;
  sentenceKana?: string;
  sentenceVi?: string;
  options: StoredArenaOption[];
  correctOptionId: string;
  explanation?: string;
}

const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateRoomCode(): string {
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += ROOM_CODE_ALPHABET[Math.floor(Math.random() * ROOM_CODE_ALPHABET.length)];
  }
  return code;
}

function normalizeRoomCode(raw: unknown): string {
  return String(raw || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 6);
}

function sanitizeDisplayName(raw: unknown): string {
  return String(raw || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 40);
}

function sanitizeQuestions(rawQuestions: unknown): StoredArenaQuestion[] {
  if (!Array.isArray(rawQuestions)) return [];
  const out: StoredArenaQuestion[] = [];

  for (let i = 0; i < rawQuestions.length && out.length < 50; i++) {
    const q: any = rawQuestions[i];
    if (!q || typeof q !== 'object') continue;
    const kanji = String(q.kanji || '').trim().slice(0, 8);
    const promptPrimary = String(q.promptPrimary || '').trim().slice(0, 240);
    const optionsRaw = Array.isArray(q.options) ? q.options : [];
    const options: StoredArenaOption[] = [];

    for (let j = 0; j < optionsRaw.length && options.length < 4; j++) {
      const opt = optionsRaw[j];
      if (!opt || typeof opt !== 'object') continue;
      const optId = String(opt.id || `opt-${j}`).trim().slice(0, 48);
      const label = String(opt.label || '').trim().slice(0, 120);
      const subLabel = opt.subLabel ? String(opt.subLabel).trim().slice(0, 120) : undefined;
      if (!optId || !label) continue;
      options.push(subLabel ? { id: optId, label, subLabel } : { id: optId, label });
    }

    const correctOptionId = String(q.correctOptionId || '').trim();
    if (!kanji || !promptPrimary || options.length < 2) continue;
    if (!options.some((o) => o.id === correctOptionId)) continue;

    out.push({
      id: String(q.id || `q-${i + 1}`).trim().slice(0, 64),
      kanji,
      mode: String(q.mode || 'kanji-to-meaning').slice(0, 32),
      promptPrimary,
      ...(q.promptSub ? { promptSub: String(q.promptSub).trim().slice(0, 200) } : {}),
      ...(q.sentenceJp ? { sentenceJp: String(q.sentenceJp).trim().slice(0, 280) } : {}),
      ...(q.sentenceKana ? { sentenceKana: String(q.sentenceKana).trim().slice(0, 280) } : {}),
      ...(q.sentenceVi ? { sentenceVi: String(q.sentenceVi).trim().slice(0, 280) } : {}),
      options,
      correctOptionId,
      ...(q.explanation ? { explanation: String(q.explanation).trim().slice(0, 240) } : {}),
    });
  }

  return out;
}

function buildPublicRoomPayload(room: any, players: any[], viewerPlayerId?: string) {
  const viewer = viewerPlayerId
    ? players.find((p) => p.player_id === viewerPlayerId)
    : undefined;
  const viewerAnswers: Record<string, any> =
    viewer && viewer.answers_by_index && typeof viewer.answers_by_index === 'object'
      ? viewer.answers_by_index
      : {};

  const questions: StoredArenaQuestion[] = Array.isArray(room.questions) ? room.questions : [];
  const isFinished = room.status === 'finished';

  const publicQuestions = questions.map((q, idx) => {
    const answeredThis = Boolean(viewerAnswers[String(idx)]);
    const revealAnswer = isFinished || answeredThis;
    const publicOptions = q.options.map((opt) =>
      revealAnswer ? opt : { id: opt.id, label: opt.label }
    );
    return {
      id: q.id,
      mode: q.mode,
      promptPrimary: q.promptPrimary,
      promptSub: q.promptSub,
      sentenceVi: q.sentenceVi,
      options: publicOptions,
      correctHash: computeOptionHash(room.id, q.id, q.correctOptionId),
      ...(revealAnswer
        ? {
            kanji: q.kanji,
            sentenceJp: q.sentenceJp,
            sentenceKana: q.sentenceKana,
            correctOptionId: q.correctOptionId,
            explanation: q.explanation,
          }
        : {}),
    };
  });

  const sortedPlayers = [...players]
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (a.total_response_ms !== b.total_response_ms) {
        return a.total_response_ms - b.total_response_ms;
      }
      return new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime();
    })
    .map((p) => {
      const answers =
        p.answers_by_index && typeof p.answers_by_index === 'object'
          ? p.answers_by_index
          : {};
      const currentAns = answers[String(room.current_question_index)];
      return {
        id: p.id,
        playerId: p.player_id,
        userId: p.user_id || null,
        displayName: p.display_name,
        isHost: Boolean(p.is_host),
        isReady: Boolean(p.is_ready),
        score: Number(p.score || 0),
        streak: Number(p.streak || 0),
        maxStreak: Number(p.max_streak || 0),
        correctCount: Number(p.correct_count || 0),
        answeredCount: Number(p.answered_count || 0),
        totalResponseMs: Number(p.total_response_ms || 0),
        answeredCurrent: Boolean(currentAns),
        lastAnswerCorrect: currentAns ? Boolean(currentAns.isCorrect) : null,
        joinedAt: p.joined_at,
      };
    });

  return {
    id: room.id,
    roomCode: room.room_code,
    mode: room.mode,
    status: room.status,
    hostPlayerId: room.host_player_id,
    title: room.title,
    levelFilter: room.level_filter,
    quizId: room.quiz_id || null,
    questionCount: room.question_count,
    timePerQuestion: room.time_per_question,
    advanceMode: room.advance_mode,
    currentQuestionIndex: room.current_question_index,
    questionStartedAt: room.question_started_at,
    serverNow: new Date().toISOString(),
    questions: publicQuestions,
    players: sortedPlayers,
    myAnswers: viewerAnswers,
  };
}

async function loadRoomAndPlayers(
  supabaseAdmin: SupabaseClient,
  roomCode: string
): Promise<{ room: any; players: any[] } | null> {
  const { data: room, error } = await supabaseAdmin
    .from('arena_rooms')
    .select('*')
    .eq('room_code', roomCode)
    .maybeSingle();

  if (error) throw error;
  if (!room) return null;

  const { data: players, error: pErr } = await supabaseAdmin
    .from('arena_room_players')
    .select('*')
    .eq('room_id', room.id)
    .order('joined_at', { ascending: true });

  if (pErr) throw pErr;
  return { room, players: players || [] };
}

export default async function handler(
  req: VercelRequest | any,
  res: VercelResponse | any
) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const action = String(
    req.method === 'GET' ? req.query?.action || '' : req.body?.action || ''
  ).trim();

  if (!action) {
    return res.status(400).json({ error: 'Thiếu tham số action.' });
  }

  try {
    // ------------------------------------------------------------------------
    // GET: Fetch full live room state (sanitized for viewer)
    // ------------------------------------------------------------------------
    if (req.method === 'GET' && action === 'get_room') {
      const code = normalizeRoomCode(req.query?.code);
      const playerId = String(req.query?.playerId || '').trim();
      if (code.length !== 6) {
        return res.status(400).json({ error: 'Mã phòng phải gồm đúng 6 ký tự.' });
      }

      const supabaseAdmin = getAdminOnly(res);
      if (!supabaseAdmin) return;

      const loaded = await loadRoomAndPlayers(supabaseAdmin, code);
      if (!loaded) {
        return res.status(404).json({ error: 'Không tìm thấy phòng thi đấu này.' });
      }

      if (new Date(loaded.room.expires_at).getTime() < Date.now()) {
        return res.status(410).json({ error: 'Phòng thi đấu đã hết hạn.' });
      }

      return res
        .status(200)
        .json({ room: buildPublicRoomPayload(loaded.room, loaded.players, playerId) });
    }

    // ------------------------------------------------------------------------
    // GET: List host's saved custom quizzes
    // ------------------------------------------------------------------------
    if (req.method === 'GET' && action === 'list_quizzes') {
      const ctx = await requireAuth(req, res);
      if (!ctx) return;

      const { data, error } = await ctx.supabaseAdmin
        .from('arena_quizzes')
        .select('id, owner_id, title, description, level_tag, time_per_question, questions, play_count, created_at, updated_at')
        .eq('owner_id', ctx.user.id)
        .order('updated_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return res.status(200).json({ quizzes: data || [] });
    }

    // ------------------------------------------------------------------------
    // POST: Save / Update custom quiz (authenticated)
    // ------------------------------------------------------------------------
    if (req.method === 'POST' && action === 'save_quiz') {
      const ctx = await requireAuth(req, res);
      if (!ctx) return;

      const quizId = req.body?.id ? String(req.body.id).trim() : null;
      const title = String(req.body?.title || '').trim().slice(0, 120);
      const description = String(req.body?.description || '').trim().slice(0, 400);
      const levelTag = String(req.body?.levelTag || 'MIXED').trim().slice(0, 24);
      const timePerQuestion = Math.min(
        60,
        Math.max(5, Math.floor(Number(req.body?.timePerQuestion) || 15))
      );
      const questions = sanitizeQuestions(req.body?.questions);

      if (!title) {
        return res.status(400).json({ error: 'Vui lòng nhập tên bộ đề.' });
      }
      if (questions.length < 1) {
        return res.status(400).json({ error: 'Bộ đề phải có ít nhất 1 câu hỏi hợp lệ.' });
      }

      if (quizId) {
        const { data: updated, error } = await ctx.supabaseAdmin
          .from('arena_quizzes')
          .update({
            title,
            description,
            level_tag: levelTag,
            time_per_question: timePerQuestion,
            questions,
          })
          .eq('id', quizId)
          .eq('owner_id', ctx.user.id)
          .select('*')
          .single();

        if (error) throw error;
        return res.status(200).json({ quiz: updated });
      }

      const { data: created, error } = await ctx.supabaseAdmin
        .from('arena_quizzes')
        .insert({
          owner_id: ctx.user.id,
          title,
          description,
          level_tag: levelTag,
          time_per_question: timePerQuestion,
          questions,
        })
        .select('*')
        .single();

      if (error) throw error;
      return res.status(200).json({ quiz: created });
    }

    // ------------------------------------------------------------------------
    // POST: Delete custom quiz (authenticated)
    // ------------------------------------------------------------------------
    if (req.method === 'POST' && action === 'delete_quiz') {
      const ctx = await requireAuth(req, res);
      if (!ctx) return;

      const quizId = String(req.body?.id || '').trim();
      if (!quizId) {
        return res.status(400).json({ error: 'Thiếu ID bộ đề.' });
      }

      const { error } = await ctx.supabaseAdmin
        .from('arena_quizzes')
        .delete()
        .eq('id', quizId)
        .eq('owner_id', ctx.user.id);

      if (error) throw error;
      return res.status(200).json({ success: true });
    }

    // ------------------------------------------------------------------------
    // POST: Create Live Room (Guest OR Authenticated)
    // ------------------------------------------------------------------------
    if (req.method === 'POST' && action === 'create_room') {
      const ctx = await optionalAuth(req, res);
      if (!ctx) return;

      const playerId = String(req.body?.playerId || '').trim().slice(0, 128);
      const displayName = sanitizeDisplayName(req.body?.displayName) || 'Chủ phòng';
      const mode = req.body?.mode === 'group' ? 'group' : '1v1';
      const advanceMode = req.body?.advanceMode === 'host' ? 'host' : 'auto';
      const title = String(req.body?.title || 'Đấu trường Kanji').trim().slice(0, 140);
      const levelFilter = String(req.body?.levelFilter || 'N5').trim().slice(0, 32);
      const quizId = req.body?.quizId ? String(req.body.quizId).trim() : null;
      const timePerQuestion = Math.min(
        60,
        Math.max(5, Math.floor(Number(req.body?.timePerQuestion) || 15))
      );
      const questions = sanitizeQuestions(req.body?.questions);

      if (playerId.length < 4) {
        return res.status(400).json({ error: 'Thiếu mã định danh người chơi.' });
      }
      if (questions.length < 1) {
        return res.status(400).json({ error: 'Không có câu hỏi hợp lệ để mở phòng.' });
      }

      let createdRoom: any = null;
      for (let attempt = 0; attempt < 6; attempt++) {
        const roomCode = generateRoomCode();
        const { data, error } = await ctx.supabaseAdmin
          .from('arena_rooms')
          .insert({
            room_code: roomCode,
            mode,
            status: 'waiting',
            host_player_id: playerId,
            host_user_id: ctx.user?.id || null,
            title,
            level_filter: levelFilter,
            quiz_id: quizId,
            question_count: questions.length,
            time_per_question: timePerQuestion,
            advance_mode: advanceMode,
            current_question_index: 0,
            questions,
          })
          .select('*')
          .single();

        if (!error && data) {
          createdRoom = data;
          break;
        }
        if (error && !String(error.message || '').includes('duplicate')) {
          throw error;
        }
      }

      if (!createdRoom) {
        return res.status(500).json({ error: 'Không thể sinh mã phòng mới, vui lòng thử lại.' });
      }

      const { data: hostPlayer, error: pErr } = await ctx.supabaseAdmin
        .from('arena_room_players')
        .insert({
          room_id: createdRoom.id,
          player_id: playerId,
          user_id: ctx.user?.id || null,
          display_name: displayName,
          is_host: true,
          is_ready: true,
        })
        .select('*')
        .single();

      if (pErr) throw pErr;

      if (quizId) {
        const { data: quizRow } = await ctx.supabaseAdmin
          .from('arena_quizzes')
          .select('play_count')
          .eq('id', quizId)
          .maybeSingle();
        if (quizRow) {
          await ctx.supabaseAdmin
            .from('arena_quizzes')
            .update({ play_count: Number(quizRow.play_count || 0) + 1 })
            .eq('id', quizId);
        }
      }

      return res.status(200).json({
        room: buildPublicRoomPayload(createdRoom, [hostPlayer], playerId),
      });
    }

    // ------------------------------------------------------------------------
    // POST: Join Live Room (Guest OR Authenticated)
    // ------------------------------------------------------------------------
    if (req.method === 'POST' && action === 'join_room') {
      const ctx = await optionalAuth(req, res);
      if (!ctx) return;

      const roomCode = normalizeRoomCode(req.body?.roomCode);
      const playerId = String(req.body?.playerId || '').trim().slice(0, 128);
      const displayName = sanitizeDisplayName(req.body?.displayName);

      if (roomCode.length !== 6) {
        return res.status(400).json({ error: 'Mã phòng phải gồm 6 ký tự.' });
      }
      if (playerId.length < 4) {
        return res.status(400).json({ error: 'Thiếu mã định danh người chơi.' });
      }
      if (!displayName) {
        return res.status(400).json({ error: 'Vui lòng nhập tên hiển thị để vào phòng.' });
      }

      const loaded = await loadRoomAndPlayers(ctx.supabaseAdmin, roomCode);
      if (!loaded) {
        return res.status(404).json({ error: `Không tìm thấy phòng có mã ${roomCode}.` });
      }

      const { room, players } = loaded;
      if (new Date(room.expires_at).getTime() < Date.now()) {
        return res.status(410).json({ error: 'Phòng thi đấu đã hết hạn.' });
      }

      const existingPlayer = players.find((p) => p.player_id === playerId);
      if (existingPlayer) {
        await ctx.supabaseAdmin
          .from('arena_room_players')
          .update({
            display_name: displayName,
            user_id: ctx.user?.id || existingPlayer.user_id || null,
            last_seen_at: new Date().toISOString(),
          })
          .eq('id', existingPlayer.id);
      } else {
        if (room.status === 'finished') {
          return res.status(409).json({ error: 'Trận đấu này đã kết thúc.' });
        }
        if (room.mode === '1v1' && players.length >= 2) {
          return res.status(409).json({ error: 'Phòng 1v1 này đã đủ 2 người chơi.' });
        }
        if (room.mode === 'group' && players.length >= 30) {
          return res.status(409).json({ error: 'Phòng nhóm đã đạt tối đa 30 người.' });
        }
        if (room.status === 'playing' && room.mode === '1v1') {
          return res.status(409).json({ error: 'Trận 1v1 đang diễn ra.' });
        }

        const { error: insertErr } = await ctx.supabaseAdmin
          .from('arena_room_players')
          .insert({
            room_id: room.id,
            player_id: playerId,
            user_id: ctx.user?.id || null,
            display_name: displayName,
            is_host: false,
            is_ready: true,
          });
        if (insertErr) throw insertErr;
      }

      const refreshed = await loadRoomAndPlayers(ctx.supabaseAdmin, roomCode);
      if (!refreshed) {
        return res.status(404).json({ error: 'Không tìm thấy phòng.' });
      }

      return res.status(200).json({
        room: buildPublicRoomPayload(refreshed.room, refreshed.players, playerId),
      });
    }

    // ------------------------------------------------------------------------
    // POST: Leave Room
    // ------------------------------------------------------------------------
    if (req.method === 'POST' && action === 'leave_room') {
      const ctx = await optionalAuth(req, res);
      if (!ctx) return;

      const roomCode = normalizeRoomCode(req.body?.roomCode);
      const playerId = String(req.body?.playerId || '').trim();
      const loaded = await loadRoomAndPlayers(ctx.supabaseAdmin, roomCode);
      if (!loaded) return res.status(200).json({ success: true });

      const { room, players } = loaded;
      await ctx.supabaseAdmin
        .from('arena_room_players')
        .delete()
        .eq('room_id', room.id)
        .eq('player_id', playerId);

      if (room.host_player_id === playerId) {
        const remaining = players.filter((p) => p.player_id !== playerId);
        if (remaining.length === 0) {
          await ctx.supabaseAdmin.from('arena_rooms').delete().eq('id', room.id);
        } else {
          const nextHost = remaining[0];
          await ctx.supabaseAdmin
            .from('arena_rooms')
            .update({ host_player_id: nextHost.player_id })
            .eq('id', room.id);
          await ctx.supabaseAdmin
            .from('arena_room_players')
            .update({ is_host: true })
            .eq('id', nextHost.id);
        }
      }

      return res.status(200).json({ success: true });
    }

    // ------------------------------------------------------------------------
    // POST: Host Kick Player in Waiting Lobby
    // ------------------------------------------------------------------------
    if (req.method === 'POST' && action === 'kick_player') {
      const ctx = await optionalAuth(req, res);
      if (!ctx) return;

      const roomCode = normalizeRoomCode(req.body?.roomCode);
      const hostPlayerId = String(req.body?.playerId || '').trim();
      const targetPlayerId = String(req.body?.targetPlayerId || '').trim();
      const loaded = await loadRoomAndPlayers(ctx.supabaseAdmin, roomCode);
      if (!loaded) return res.status(404).json({ error: 'Không tìm thấy phòng.' });

      if (loaded.room.host_player_id !== hostPlayerId) {
        return res.status(403).json({ error: 'Chỉ chủ phòng mới có quyền mời người chơi ra ngoài.' });
      }
      if (targetPlayerId === hostPlayerId) {
        return res.status(400).json({ error: 'Không thể tự mời chính mình.' });
      }

      await ctx.supabaseAdmin
        .from('arena_room_players')
        .delete()
        .eq('room_id', loaded.room.id)
        .eq('player_id', targetPlayerId);

      const refreshed = await loadRoomAndPlayers(ctx.supabaseAdmin, roomCode);
      return res.status(200).json({
        room: refreshed
          ? buildPublicRoomPayload(refreshed.room, refreshed.players, hostPlayerId)
          : null,
      });
    }

    // ------------------------------------------------------------------------
    // POST: Host Update Room Settings in Waiting Lobby
    // ------------------------------------------------------------------------
    if (req.method === 'POST' && action === 'update_room_settings') {
      const ctx = await optionalAuth(req, res);
      if (!ctx) return;

      const roomCode = normalizeRoomCode(req.body?.roomCode);
      const playerId = String(req.body?.playerId || '').trim();
      const loaded = await loadRoomAndPlayers(ctx.supabaseAdmin, roomCode);
      if (!loaded) return res.status(404).json({ error: 'Không tìm thấy phòng.' });

      if (loaded.room.host_player_id !== playerId) {
        return res.status(403).json({ error: 'Chỉ chủ phòng mới chỉnh được cài đặt phòng.' });
      }
      if (loaded.room.status !== 'waiting') {
        return res.status(409).json({ error: 'Chỉ đổi cài đặt khi đang ở sảnh chờ.' });
      }

      const patch: Record<string, any> = {};
      if (req.body?.advanceMode === 'auto' || req.body?.advanceMode === 'host') {
        patch.advance_mode = req.body.advanceMode;
      }
      if (req.body?.timePerQuestion !== undefined) {
        patch.time_per_question = Math.min(
          60,
          Math.max(5, Math.floor(Number(req.body.timePerQuestion) || 15))
        );
      }

      if (Object.keys(patch).length > 0) {
        await ctx.supabaseAdmin
          .from('arena_rooms')
          .update(patch)
          .eq('id', loaded.room.id);
      }

      const refreshed = await loadRoomAndPlayers(ctx.supabaseAdmin, roomCode);
      return res.status(200).json({
        room: refreshed
          ? buildPublicRoomPayload(refreshed.room, refreshed.players, playerId)
          : null,
      });
    }

    // ------------------------------------------------------------------------
    // POST: Host Start Match
    // ------------------------------------------------------------------------
    if (req.method === 'POST' && action === 'start_room') {
      const supabaseAdmin = getAdminOnly(res);
      if (!supabaseAdmin) return;

      const roomCode = normalizeRoomCode(req.body?.roomCode);
      const playerId = String(req.body?.playerId || '').trim();
      const loaded = await loadRoomAndPlayers(supabaseAdmin, roomCode);
      if (!loaded) return res.status(404).json({ error: 'Không tìm thấy phòng.' });

      const { room, players } = loaded;
      if (room.host_player_id !== playerId) {
        return res.status(403).json({ error: 'Chỉ chủ phòng mới có thể bắt đầu trận đấu.' });
      }
      if (room.mode === '1v1' && players.length < 2) {
        return res
          .status(409)
          .json({ error: 'Chế độ 1v1 cần đủ 2 người chơi trong sảnh chờ mới bắt đầu được.' });
      }

      const startAt = new Date(Date.now() + 2000).toISOString();
      await Promise.all([
        supabaseAdmin
          .from('arena_room_players')
          .update({
            score: 0,
            streak: 0,
            max_streak: 0,
            correct_count: 0,
            answered_count: 0,
            total_response_ms: 0,
            answers_by_index: {},
          })
          .eq('room_id', room.id),
        supabaseAdmin
          .from('arena_rooms')
          .update({
            status: 'playing',
            current_question_index: 0,
            question_started_at: startAt,
          })
          .eq('id', room.id),
      ]);

      const refreshed = await loadRoomAndPlayers(supabaseAdmin, roomCode);
      return res.status(200).json({
        room: refreshed
          ? buildPublicRoomPayload(refreshed.room, refreshed.players, playerId)
          : null,
      });
    }

    // ------------------------------------------------------------------------
    // POST: Authoritative Answer Submission (Idempotent per question index)
    // ------------------------------------------------------------------------
    if (req.method === 'POST' && action === 'submit_answer') {
      const supabaseAdmin = getAdminOnly(res);
      if (!supabaseAdmin) return;

      const roomCode = normalizeRoomCode(req.body?.roomCode);
      const playerId = String(req.body?.playerId || '').trim();
      const questionIndex = Math.floor(Number(req.body?.questionIndex));
      const optionId = String(req.body?.optionId || '').trim();

      const loaded = await loadRoomAndPlayers(supabaseAdmin, roomCode);
      if (!loaded) return res.status(404).json({ error: 'Không tìm thấy phòng.' });

      const { room, players } = loaded;
      if (room.status !== 'playing') {
        return res.status(409).json({ error: 'Trận đấu chưa bắt đầu hoặc đã kết thúc.' });
      }
      if (questionIndex !== room.current_question_index) {
        return res.status(409).json({ error: 'Câu hỏi này đã chuyển sang lượt khác.' });
      }

      const player = players.find((p) => p.player_id === playerId);
      if (!player) {
        return res.status(403).json({ error: 'Bạn không có mặt trong phòng này.' });
      }

      const questions: StoredArenaQuestion[] = Array.isArray(room.questions) ? room.questions : [];
      const targetQuestion = questions[questionIndex];
      if (!targetQuestion) {
        return res.status(400).json({ error: 'Chỉ mục câu hỏi không hợp lệ.' });
      }

      const existingAnswers: Record<string, any> =
        player.answers_by_index && typeof player.answers_by_index === 'object'
          ? { ...player.answers_by_index }
          : {};

      const optionSubLabels: Record<string, string> = {};
      for (const opt of targetQuestion.options) {
        if (opt.subLabel) optionSubLabels[opt.id] = opt.subLabel;
      }

      // Idempotent guard: already submitted this question
      const prevEntry = existingAnswers[String(questionIndex)];
      if (prevEntry) {
        const answeredAll = players.every((p) =>
          Boolean(p.answers_by_index?.[String(questionIndex)])
        );
        return res.status(200).json({
          isCorrect: Boolean(prevEntry.isCorrect),
          correctOptionId: targetQuestion.correctOptionId,
          explanation: targetQuestion.explanation || '',
          kanji: targetQuestion.kanji,
          ...(targetQuestion.sentenceJp ? { sentenceJp: targetQuestion.sentenceJp } : {}),
          ...(Object.keys(optionSubLabels).length > 0 ? { optionSubLabels } : {}),
          pointsAwarded: Number(prevEntry.pointsAwarded || 0),
          newScore: Number(player.score || 0),
          streak: Number(player.streak || 0),
          correctCount: Number(player.correct_count || 0),
          answeredCount: Number(player.answered_count || 0),
          allPlayersAnswered: answeredAll,
        });
      }

      const maxMs = Math.max(5000, Number(room.time_per_question || 15) * 1000);
      const startedMs = room.question_started_at
        ? new Date(room.question_started_at).getTime()
        : Date.now();
      const rawElapsed = Math.max(250, Date.now() - startedMs);
      const clampedElapsedMs = Math.min(maxMs, rawElapsed);

      const isCorrect =
        optionId !== '__TIMEOUT__' && optionId === targetQuestion.correctOptionId;
      const prevStreak = Number(player.streak || 0);
      const nextStreak = isCorrect ? prevStreak + 1 : 0;
      const nextMaxStreak = Math.max(Number(player.max_streak || 0), nextStreak);

      let pointsAwarded = 0;
      if (isCorrect) {
        const remainingRatio = Math.max(0, Math.min(1, (maxMs - clampedElapsedMs) / maxMs));
        const speedBonus = Math.round(50 * remainingRatio);
        const comboBonus = 10 * Math.min(prevStreak, 5);
        pointsAwarded = 100 + speedBonus + comboBonus;
      }

      const newScore = Number(player.score || 0) + pointsAwarded;
      const nextCorrectCount = Number(player.correct_count || 0) + (isCorrect ? 1 : 0);
      const nextAnsweredCount = Number(player.answered_count || 0) + 1;
      const nextTotalMs = Number(player.total_response_ms || 0) + clampedElapsedMs;

      existingAnswers[String(questionIndex)] = {
        optionId,
        isCorrect,
        pointsAwarded,
        elapsedMs: clampedElapsedMs,
      };

      const { error: updateErr } = await supabaseAdmin
        .from('arena_room_players')
        .update({
          score: newScore,
          streak: nextStreak,
          max_streak: nextMaxStreak,
          correct_count: nextCorrectCount,
          answered_count: nextAnsweredCount,
          total_response_ms: nextTotalMs,
          answers_by_index: existingAnswers,
          last_seen_at: new Date().toISOString(),
        })
        .eq('id', player.id);

      if (updateErr) throw updateErr;

      const updatedPlayers = players.map((p) =>
        p.id === player.id ? { ...p, answers_by_index: existingAnswers } : p
      );
      const allPlayersAnswered = updatedPlayers.every((p) =>
        Boolean(p.answers_by_index?.[String(questionIndex)])
      );

      return res.status(200).json({
        isCorrect,
        correctOptionId: targetQuestion.correctOptionId,
        explanation: targetQuestion.explanation || '',
        kanji: targetQuestion.kanji,
        ...(targetQuestion.sentenceJp ? { sentenceJp: targetQuestion.sentenceJp } : {}),
        ...(Object.keys(optionSubLabels).length > 0 ? { optionSubLabels } : {}),
        pointsAwarded,
        newScore,
        streak: nextStreak,
        correctCount: nextCorrectCount,
        answeredCount: nextAnsweredCount,
        allPlayersAnswered,
      });
    }

    // ------------------------------------------------------------------------
    // POST: Atomic Question Advance / Match Finish (Fast Delta Response)
    // ------------------------------------------------------------------------
    if (req.method === 'POST' && action === 'advance_question') {
      const supabaseAdmin = getAdminOnly(res);
      if (!supabaseAdmin) return;

      const roomCode = normalizeRoomCode(req.body?.roomCode);
      const playerId = String(req.body?.playerId || '').trim();
      const expectedIndex = Math.floor(Number(req.body?.expectedIndex));

      const loaded = await loadRoomAndPlayers(supabaseAdmin, roomCode);
      if (!loaded) return res.status(404).json({ error: 'Không tìm thấy phòng.' });

      const { room, players } = loaded;
      const serverNow = new Date().toISOString();

      if (room.status !== 'playing' || room.current_question_index !== expectedIndex) {
        return res.status(200).json({
          delta: {
            roomCode,
            status: room.status,
            currentQuestionIndex: room.current_question_index,
            questionStartedAt: room.question_started_at,
            serverNow,
          },
        });
      }

      const isHost = room.host_player_id === playerId;
      const allAnswered = players.every((p) =>
        Boolean(p.answers_by_index?.[String(expectedIndex)])
      );
      const startedMs = room.question_started_at
        ? new Date(room.question_started_at).getTime()
        : 0;
      const timedOut =
        startedMs > 0 &&
        Date.now() - startedMs >= Number(room.time_per_question || 15) * 1000 - 500;

      if (room.advance_mode === 'host' && !isHost) {
        return res.status(403).json({ error: 'Đang chờ chủ phòng chuyển sang câu tiếp theo.' });
      }
      if (!isHost && !allAnswered && !timedOut) {
        return res
          .status(409)
          .json({ error: 'Chưa hết thời gian hoặc vẫn còn người chơi chưa trả lời.' });
      }

      const questions: StoredArenaQuestion[] = Array.isArray(room.questions) ? room.questions : [];
      const nextIndex = expectedIndex + 1;

      if (nextIndex >= questions.length) {
        await supabaseAdmin
          .from('arena_rooms')
          .update({ status: 'finished' })
          .eq('id', room.id)
          .eq('current_question_index', expectedIndex)
          .eq('status', 'playing');

        return res.status(200).json({
          delta: {
            roomCode,
            status: 'finished',
            currentQuestionIndex: expectedIndex,
            questionStartedAt: room.question_started_at,
            serverNow,
          },
        });
      }

      const nextStartedAt = new Date().toISOString();
      await supabaseAdmin
        .from('arena_rooms')
        .update({
          current_question_index: nextIndex,
          question_started_at: nextStartedAt,
        })
        .eq('id', room.id)
        .eq('current_question_index', expectedIndex)
        .eq('status', 'playing');

      return res.status(200).json({
        delta: {
          roomCode,
          status: 'playing',
          currentQuestionIndex: nextIndex,
          questionStartedAt: nextStartedAt,
          serverNow: nextStartedAt,
        },
      });
    }

    // ------------------------------------------------------------------------
    // POST: Rematch (Host resets room to Waiting Lobby with fresh or same questions)
    // ------------------------------------------------------------------------
    if (req.method === 'POST' && action === 'rematch_room') {
      const ctx = await optionalAuth(req, res);
      if (!ctx) return;

      const roomCode = normalizeRoomCode(req.body?.roomCode);
      const playerId = String(req.body?.playerId || '').trim();
      const loaded = await loadRoomAndPlayers(ctx.supabaseAdmin, roomCode);
      if (!loaded) return res.status(404).json({ error: 'Không tìm thấy phòng.' });

      if (loaded.room.host_player_id !== playerId) {
        return res.status(403).json({ error: 'Chỉ chủ phòng mới tạo được ván tái đấu.' });
      }

      const nextQuestions = sanitizeQuestions(req.body?.questions);
      const patch: Record<string, any> = {
        status: 'waiting',
        current_question_index: 0,
        question_started_at: null,
      };
      if (nextQuestions.length > 0) {
        patch.questions = nextQuestions;
        patch.question_count = nextQuestions.length;
      }

      await ctx.supabaseAdmin
        .from('arena_rooms')
        .update(patch)
        .eq('id', loaded.room.id);

      await ctx.supabaseAdmin
        .from('arena_room_players')
        .update({
          score: 0,
          streak: 0,
          max_streak: 0,
          correct_count: 0,
          answered_count: 0,
          total_response_ms: 0,
          answers_by_index: {},
        })
        .eq('room_id', loaded.room.id);

      const refreshed = await loadRoomAndPlayers(ctx.supabaseAdmin, roomCode);
      return res.status(200).json({
        room: refreshed
          ? buildPublicRoomPayload(refreshed.room, refreshed.players, playerId)
          : null,
      });
    }

    return res.status(400).json({ error: `Action '${action}' không được hỗ trợ.` });
  } catch (err: any) {
    return res.status(500).json({
      error: err?.message || 'Lỗi máy chủ Đấu trường Kanji.',
    });
  }
}
