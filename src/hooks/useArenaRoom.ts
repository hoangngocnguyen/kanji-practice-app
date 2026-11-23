import { useCallback, useEffect, useRef, useState } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../utils/supabaseClient';
import { fetchArenaRoom } from '../services/arenaService';
import { ArenaRoomState } from '../types/arena';

interface UseArenaRoomOptions {
  roomCode: string | null;
  playerId: string;
  displayName: string;
  initialRoom?: ArenaRoomState | null;
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

  const refreshRoom = useCallback(async () => {
    if (!normalizedCode || !playerId) return;
    if (refreshInFlightRef.current) {
      pendingRefreshRef.current = true;
      return;
    }

    refreshInFlightRef.current = true;
    try {
      const latest = await fetchArenaRoom(normalizedCode, playerId);
      setRoom(latest);
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

    // Immediate initial fetch when entering room
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
      .on('broadcast', { event: 'arena_event' }, () => {
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
  }, [normalizedCode, playerId, displayName, refreshRoom]);

  // Safety fallback polling while waiting or playing so cellular switches never drift
  useEffect(() => {
    if (!normalizedCode || !room) return;
    if (room.status === 'finished') return;

    const intervalMs = room.status === 'playing' ? 3500 : 4500;
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
  };
}
