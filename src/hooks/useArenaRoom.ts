import { useCallback, useEffect, useRef, useState } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../utils/supabaseClient';
import { fetchArenaRoom } from '../services/arenaService';
import {
  ArenaAdvanceDelta,
  ArenaPlayer,
  ArenaRoomState,
} from '../types/arena';

interface UseArenaRoomOptions {
  roomCode: string | null;
  playerId: string;
  displayName: string;
  initialRoom?: ArenaRoomState | null;
}

export interface PlayerAnswerDeltaPayload {
  playerId: string;
  questionIndex: number;
  isCorrect: boolean;
  score: number;
  streak: number;
  correctCount: number;
  answeredCount: number;
  optionId?: string;
  pointsAwarded?: number;
}

function sortArenaPlayers(players: ArenaPlayer[]): ArenaPlayer[] {
  return [...players].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (a.totalResponseMs !== b.totalResponseMs) {
      return a.totalResponseMs - b.totalResponseMs;
    }
    return new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime();
  });
}

export function useArenaRoom({
  roomCode,
  playerId,
  displayName,
  initialRoom = null,
}: UseArenaRoomOptions) {
  const [room, setRoom] = useState<ArenaRoomState | null>(initialRoom);
  const [onlinePlayerIds, setOnlinePlayerIds] = useState<Set<string>>(new Set());
  const [realtimeStatus, setRealtimeStatus] = useState<
    'idle' | 'connecting' | 'connected' | 'reconnecting'
  >('idle');
  const [syncError, setSyncError] = useState<string | null>(null);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const refreshInFlightRef = useRef<boolean>(false);
  const pendingRefreshRef = useRef<boolean>(false);

  const normalizedCode = roomCode ? roomCode.trim().toUpperCase() : '';

  useEffect(() => {
    if (initialRoom && initialRoom.roomCode === normalizedCode) {
      setRoom(initialRoom);
    }
  }, [initialRoom, normalizedCode]);

  const applyPlayerAnswerDelta = useCallback((delta: PlayerAnswerDeltaPayload) => {
    setRoom((prev) => {
      if (!prev) return prev;
      if (delta.questionIndex !== prev.currentQuestionIndex) return prev;

      const updatedPlayers = prev.players.map((p) => {
        if (p.playerId !== delta.playerId) return p;
        return {
          ...p,
          score: Math.max(p.score, delta.score),
          streak: delta.streak,
          maxStreak: Math.max(p.maxStreak, delta.streak),
          correctCount: Math.max(p.correctCount, delta.correctCount),
          answeredCount: Math.max(p.answeredCount, delta.answeredCount),
          answeredCurrent: true,
          lastAnswerCorrect: delta.isCorrect,
        };
      });

      const nextMyAnswers =
        delta.playerId === playerId && delta.optionId !== undefined
          ? {
              ...prev.myAnswers,
              [String(delta.questionIndex)]: {
                optionId: delta.optionId,
                isCorrect: delta.isCorrect,
                pointsAwarded: delta.pointsAwarded ?? 0,
                elapsedMs: prev.myAnswers?.[String(delta.questionIndex)]?.elapsedMs ?? 0,
              },
            }
          : prev.myAnswers;

      return {
        ...prev,
        players: sortArenaPlayers(updatedPlayers),
        myAnswers: nextMyAnswers,
      };
    });
  }, [playerId]);

  const applyAdvanceDelta = useCallback((delta: ArenaAdvanceDelta) => {
    setRoom((prev) => {
      if (!prev || prev.roomCode !== delta.roomCode) return prev;

      // Monotonic guard: ignore stale transitions
      if (prev.status === 'finished' && delta.status !== 'finished') return prev;
      if (
        delta.status === 'playing' &&
        prev.status === 'playing' &&
        delta.currentQuestionIndex <= prev.currentQuestionIndex
      ) {
        return prev;
      }

      if (delta.status === 'finished') {
        return {
          ...prev,
          status: 'finished',
          serverNow: delta.serverNow,
        };
      }

      return {
        ...prev,
        status: delta.status,
        currentQuestionIndex: delta.currentQuestionIndex,
        questionStartedAt: delta.questionStartedAt,
        serverNow: delta.serverNow,
        players: prev.players.map((p) => ({
          ...p,
          answeredCurrent: false,
          lastAnswerCorrect: null,
        })),
      };
    });
  }, []);

  const refreshRoom = useCallback(async () => {
    if (!normalizedCode || !playerId) return;
    if (refreshInFlightRef.current) {
      pendingRefreshRef.current = true;
      return;
    }

    refreshInFlightRef.current = true;
    try {
      const latest = await fetchArenaRoom(normalizedCode, playerId);
      setRoom((prev) => {
        if (!prev || prev.roomCode !== latest.roomCode) return latest;
        if (prev.status === 'finished' && latest.status === 'playing') return prev;
        if (
          prev.status === 'playing' &&
          latest.status === 'playing' &&
          latest.currentQuestionIndex < prev.currentQuestionIndex
        ) {
          return prev;
        }
        return latest;
      });
      setSyncError(null);
    } catch (err: any) {
      setSyncError(err?.message || 'Không thể đồng bộ trạng thái phòng.');
    } finally {
      refreshInFlightRef.current = false;
      if (pendingRefreshRef.current) {
        pendingRefreshRef.current = false;
        void refreshRoom();
      }
    }
  }, [normalizedCode, playerId]);

  const broadcastSync = useCallback(
    (eventType: string, payload?: Record<string, any>) => {
      const ch = channelRef.current;
      if (!ch) return;
      void ch.send({
        type: 'broadcast',
        event: 'arena_event',
        payload: {
          eventType,
          byPlayerId: playerId,
          at: Date.now(),
          ...(payload || {}),
        },
      });
    },
    [playerId]
  );

  // Connect to Supabase Realtime Channel (Broadcast + Presence)
  useEffect(() => {
    if (!normalizedCode || !playerId) {
      setRealtimeStatus('idle');
      setOnlinePlayerIds(new Set());
      return;
    }

    void refreshRoom();

    if (!supabase) {
      setRealtimeStatus('reconnecting');
      return;
    }

    setRealtimeStatus('connecting');
    const channel = supabase.channel(`arena:room:${normalizedCode}`, {
      config: {
        broadcast: { self: false },
        presence: { key: playerId },
      },
    });
    channelRef.current = channel;

    channel
      .on('broadcast', { event: 'arena_event' }, ({ payload }) => {
        const evt = payload || {};
        const type = String(evt.eventType || '');

        if (type === 'player:answered' && evt.playerId) {
          applyPlayerAnswerDelta({
            playerId: String(evt.playerId),
            questionIndex: Number(evt.questionIndex),
            isCorrect: Boolean(evt.isCorrect),
            score: Number(evt.score || 0),
            streak: Number(evt.streak || 0),
            correctCount: Number(evt.correctCount || 0),
            answeredCount: Number(evt.answeredCount || 0),
          });
          return;
        }

        if (type === 'question:advanced' && evt.delta) {
          const delta = evt.delta as ArenaAdvanceDelta;
          applyAdvanceDelta(delta);
          if (delta.status === 'finished') {
            void refreshRoom();
          }
          return;
        }

        if (type === 'room:started' && evt.questionStartedAt) {
          setRoom((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              status: 'playing',
              currentQuestionIndex: 0,
              questionStartedAt: String(evt.questionStartedAt),
              serverNow: String(evt.serverNow || new Date().toISOString()),
              myAnswers: {},
              players: prev.players.map((p) => ({
                ...p,
                score: 0,
                streak: 0,
                maxStreak: 0,
                correctCount: 0,
                answeredCount: 0,
                totalResponseMs: 0,
                answeredCurrent: false,
                lastAnswerCorrect: null,
              })),
            };
          });
          return;
        }

        void refreshRoom();
      })
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<Record<string, any>>();
        const active = new Set<string>(Object.keys(state));
        setOnlinePlayerIds(active);
      })
      .on('presence', { event: 'join' }, () => {
        void refreshRoom();
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setRealtimeStatus('connected');
          void channel.track({
            playerId,
            displayName: displayName || 'Người chơi',
            onlineAt: Date.now(),
          });
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setRealtimeStatus('reconnecting');
        }
      });

    return () => {
      channelRef.current = null;
      void supabase.removeChannel(channel);
    };
  }, [
    normalizedCode,
    playerId,
    displayName,
    refreshRoom,
    applyPlayerAnswerDelta,
    applyAdvanceDelta,
  ]);

  // Safety fallback poll only to recover genuinely missed packets (never steals hot path)
  useEffect(() => {
    if (!normalizedCode || !room) return;
    if (room.status === 'finished') return;

    const intervalMs = room.status === 'playing' ? 10000 : 5000;
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void refreshRoom();
      }
    }, intervalMs);

    const onFocus = () => void refreshRoom();
    window.addEventListener('focus', onFocus);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', onFocus);
    };
  }, [normalizedCode, room?.status, refreshRoom]);

  return {
    room,
    setRoom,
    onlinePlayerIds,
    realtimeStatus,
    syncError,
    refreshRoom,
    broadcastSync,
    applyPlayerAnswerDelta,
    applyAdvanceDelta,
  };
}
