import React, { useState } from 'react';
import {
  Copy,
  Check,
  Link2,
  Play,
  LogOut,
  Crown,
  X,
  Users,
  Swords,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { ArenaAdvanceMode, ArenaRoomState } from '../../types/arena';

interface ArenaLobbyProps {
  room: ArenaRoomState;
  currentPlayerId: string;
  onlinePlayerIds: Set<string>;
  realtimeStatus: 'idle' | 'connecting' | 'connected' | 'reconnecting';
  isBusy: boolean;
  errorMessage: string | null;
  onStartMatch: () => Promise<void>;
  onLeaveRoom: () => Promise<void>;
  onKickPlayer: (targetPlayerId: string) => Promise<void>;
  onUpdateSettings: (patch: {
    advanceMode?: ArenaAdvanceMode;
    timePerQuestion?: number;
  }) => Promise<void>;
}

export const ArenaLobby: React.FC<ArenaLobbyProps> = ({
  room,
  currentPlayerId,
  onlinePlayerIds,
  realtimeStatus,
  isBusy,
  errorMessage,
  onStartMatch,
  onLeaveRoom,
  onKickPlayer,
  onUpdateSettings,
}) => {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const isHost = room.hostPlayerId === currentPlayerId;
  const is1v1 = room.mode === '1v1';
  const canStart = isHost && (!is1v1 || room.players.length >= 2);

  const inviteUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/arena?code=${room.roomCode}`
      : `/arena?code=${room.roomCode}`;

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(room.roomCode);
      setCopiedCode(true);
      window.setTimeout(() => setCopiedCode(false), 1800);
    } catch {}
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopiedLink(true);
      window.setTimeout(() => setCopiedLink(false), 1800);
    } catch {}
  };

  return (
    <div className="max-w-5xl mx-auto space-y-5 pb-10">
      {/* Top Action Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            {is1v1 ? (
              <Swords className="w-5 h-5 text-teal-700" />
            ) : (
              <Users className="w-5 h-5 text-teal-700" />
            )}
            <h1 className="text-lg sm:text-xl font-extrabold text-slate-900">
              {room.title}
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 tabular-nums">
            <span>{is1v1 ? 'Đối kháng 1v1' : 'Phòng thi nhóm'}</span>
            <span aria-hidden="true">·</span>
            <span>{room.questionCount} câu hỏi</span>
            <span aria-hidden="true">·</span>
            <span>{room.timePerQuestion} giây / câu</span>
            <span aria-hidden="true">·</span>
            <span className="inline-flex items-center gap-1">
              {realtimeStatus === 'connected' ? (
                <Wifi className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <WifiOff className="w-3.5 h-3.5 text-amber-600" />
              )}
              <span>
                {realtimeStatus === 'connected'
                  ? 'Kết nối trực tiếp'
                  : 'Đang đồng bộ...'}
              </span>
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void onLeaveRoom()}
          className="h-10 px-3.5 text-xs font-semibold text-slate-600 hover:text-rose-700 hover:bg-rose-50 border border-slate-200 rounded-xl inline-flex items-center gap-1.5 cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>Rời phòng</span>
        </button>
      </div>

      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-800">
          {errorMessage}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left: Room Invite Code & Host Settings */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-5 space-y-5">
          <div className="text-center space-y-2 pb-4 border-b border-slate-100">
            <p className="text-xs font-semibold text-slate-500">
              Gửi mã hoặc link này cho bạn bè để vào ngay
            </p>
            <div className="py-3 px-4 bg-slate-50 border border-slate-200 rounded-2xl font-mono text-3xl sm:text-4xl font-black tracking-[0.28em] text-teal-800 select-all">
              {room.roomCode}
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => void handleCopyCode()}
                className="h-10 px-3 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl inline-flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {copiedCode ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                <span>{copiedCode ? 'Đã chép mã' : 'Chép mã phòng'}</span>
              </button>

              <button
                type="button"
                onClick={() => void handleCopyLink()}
                className="h-10 px-3 text-xs font-bold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-xl inline-flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {copiedLink ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Link2 className="w-3.5 h-3.5" />
                )}
                <span>{copiedLink ? 'Đã chép link' : 'Chép link mời'}</span>
              </button>
            </div>
          </div>

          {isHost ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="font-semibold text-slate-700">Nhịp chuyển câu</span>
                <div className="inline-flex p-0.5 bg-slate-100 rounded-lg">
                  <button
                    type="button"
                    onClick={() => void onUpdateSettings({ advanceMode: 'auto' })}
                    className={`px-2.5 py-1 text-[11px] font-semibold rounded-md cursor-pointer ${
                      room.advanceMode === 'auto'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600'
                    }`}
                  >
                    Tự động
                  </button>
                  <button
                    type="button"
                    onClick={() => void onUpdateSettings({ advanceMode: 'host' })}
                    className={`px-2.5 py-1 text-[11px] font-semibold rounded-md cursor-pointer ${
                      room.advanceMode === 'host'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600'
                    }`}
                  >
                    Chủ phòng bấm
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="font-semibold text-slate-700">Thời gian / câu</span>
                <select
                  value={room.timePerQuestion}
                  onChange={(e) =>
                    void onUpdateSettings({ timePerQuestion: Number(e.target.value) })
                  }
                  className="h-9 px-2.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg tabular-nums"
                >
                  <option value={10}>10 giây</option>
                  <option value={15}>15 giây</option>
                  <option value={20}>20 giây</option>
                  <option value={30}>30 giây</option>
                </select>
              </div>

              <button
                type="button"
                disabled={!canStart || isBusy}
                onClick={() => void onStartMatch()}
                className="w-full h-12 px-4 bg-teal-700 hover:bg-teal-800 disabled:bg-slate-200 disabled:text-slate-400 text-white text-sm font-bold rounded-xl inline-flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <Play className="w-4 h-4" />
                <span>
                  {is1v1 && room.players.length < 2
                    ? 'Đang chờ đối thủ thứ 2 vào phòng...'
                    : 'Bắt đầu trận đấu'}
                </span>
              </button>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center space-y-1">
              <p className="text-xs font-bold text-slate-800">
                Bạn đã sẵn sàng trong phòng
              </p>
              <p className="text-xs text-slate-500">
                Hãy giữ màn hình này mở, trận đấu sẽ tự động bắt đầu ngay khi chủ phòng nhấn Bắt đầu.
              </p>
            </div>
          )}
        </div>

        {/* Right: Players Roster */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold text-slate-900 tabular-nums">
              Người chơi trong sảnh ({room.players.length}
              {is1v1 ? ' / 2' : ' / 30'})
            </h2>
            <span className="text-xs text-slate-500">
              {is1v1 ? 'Chế độ tay đôi' : 'Chế độ nhiều người'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {room.players.map((p) => {
              const isMe = p.playerId === currentPlayerId;
              const isOnlineInChannel =
                onlinePlayerIds.size === 0 || onlinePlayerIds.has(p.playerId);

              return (
                <div
                  key={p.playerId}
                  className={`p-3 rounded-xl border flex items-center justify-between gap-2 ${
                    isMe
                      ? 'bg-teal-50/70 border-teal-300'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-teal-700 text-white text-xs font-bold flex items-center justify-center shrink-0">
                      {Array.from(p.displayName.trim())[0]?.toUpperCase() || 'K'}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-900 truncate">
                          {p.displayName}
                        </span>
                        {p.isHost && (
                          <span title="Chủ phòng" className="inline-flex shrink-0">
                            <Crown className="w-3.5 h-3.5 text-amber-600" />
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500">
                        {isMe ? 'Bạn' : isOnlineInChannel ? 'Đang kết nối' : 'Đang đồng bộ'}
                      </p>
                    </div>
                  </div>

                  {isHost && !p.isHost && (
                    <button
                      type="button"
                      onClick={() => void onKickPlayer(p.playerId)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg cursor-pointer"
                      title="Mời khỏi phòng"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
