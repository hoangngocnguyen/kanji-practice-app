import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Flame,
  Loader2,
  LogIn,
  Users,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  apiGetFriendStreakInvitePreview,
  apiRespondFriendStreakInvite,
  FriendStreakInvitePreview,
} from '../services/friendStreakService';
import { UserAvatar } from '../components/UserAvatar';

export const StreakInvitePage: React.FC = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { user, openAuthModal } = useAuth();

  const [preview, setPreview] = useState<FriendStreakInvitePreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);

  const loadPreview = useCallback(async () => {
    if (!code) {
      setError('Mã lời mời nối Streak không hợp lệ.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await apiGetFriendStreakInvitePreview(code);
      setPreview(res);
    } catch (err: any) {
      setError(err?.message || 'Không tìm thấy lời mời nối Streak này.');
    } finally {
      setLoading(false);
    }
  }, [code]);

  useEffect(() => {
    void loadPreview();
  }, [loadPreview, user?.id]);

  const handleAccept = async () => {
    if (!code) return;
    if (!user) {
      openAuthModal('login');
      return;
    }
    setAccepting(true);
    setError(null);
    try {
      await apiRespondFriendStreakInvite({
        inviteCode: code,
        decision: 'accept',
      });
      setAccepted(true);
      window.setTimeout(() => {
        navigate('/leaderboard?tab=friends');
      }, 900);
    } catch (err: any) {
      setError(err?.message || 'Không thể chấp nhận lời mời nối Streak.');
    } finally {
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-lg mx-auto bg-white rounded-2xl border border-slate-200 p-10 flex flex-col items-center gap-3 text-xs text-slate-500">
        <Loader2 className="w-6 h-6 animate-spin text-teal-700" />
        <span>Đang tải lời mời nối Streak...</span>
      </div>
    );
  }

  const inv = preview?.invite;

  if (!preview?.tableReady || !inv) {
    return (
      <div className="max-w-lg mx-auto bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-4">
        <AlertCircle className="w-9 h-9 text-rose-500 mx-auto" />
        <h1 className="text-base font-bold text-slate-900">
          Không thể mở lời mời nối Streak
        </h1>
        <p className="text-xs text-slate-600">
          {error || 'Lời mời không tồn tại hoặc chưa được kích hoạt trên hệ thống.'}
        </p>
        <Link
          to="/leaderboard?tab=friends"
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-xl"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Về trang Streak Bạn Bè</span>
        </Link>
      </div>
    );
  }

  return (
    <section className="max-w-lg mx-auto bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 text-center space-y-5">
      <div className="w-12 h-12 rounded-2xl bg-orange-50 border border-orange-200 text-orange-500 flex items-center justify-center mx-auto">
        <Flame className="w-6 h-6 fill-orange-400" />
      </div>

      <div className="flex flex-col items-center gap-2.5">
        <UserAvatar
          name={inv.inviter.displayName}
          avatarUrl={inv.inviter.avatarUrl}
          sizeClass="w-16 h-16"
          textSizeClass="text-lg"
          className="ring-4 ring-orange-50"
        />
        <div className="space-y-1">
          <h1 className="text-lg font-extrabold text-slate-900">
            {inv.inviter.displayName} mời bạn nối Streak!
          </h1>
          <p className="text-xs text-slate-500 tabular-nums">
            Chuỗi hiện tại của {inv.inviter.displayName}:{' '}
            <strong className="text-orange-600">{inv.inviter.currentStreak} ngày</strong>
          </p>
        </div>
      </div>

      {error && (
        <div className="px-3 py-2 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700">
          {error}
        </div>
      )}

      {accepted ? (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Đã nối Streak thành công! Đang chuyển trang...</span>
        </div>
      ) : inv.isOwnInvite ? (
        <div className="space-y-3">
          <p className="text-xs text-slate-600">
            Đây là link mời của chính bạn. Hãy gửi link này cho bạn học của bạn nhé!
          </p>
          <Link
            to="/leaderboard?tab=friends"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-xl"
          >
            <Users className="w-4 h-4" />
            <span>Quản lý Streak Bạn Bè</span>
          </Link>
        </div>
      ) : inv.alreadyConnected ? (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-teal-800">
            Hai bạn đã đang nối Streak cùng nhau rồi!
          </p>
          <Link
            to="/leaderboard?tab=friends"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-xl"
          >
            <span>Xem Streak Bạn Bè</span>
          </Link>
        </div>
      ) : inv.status !== 'pending' ? (
        <div className="space-y-3">
          <p className="text-xs text-amber-800 font-semibold">
            Lời mời này đã {inv.status === 'expired' ? 'hết hạn' : 'được sử dụng hoặc đã hủy'}.
          </p>
          <Link
            to="/leaderboard?tab=friends"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-teal-800 bg-teal-50 border border-teal-200 rounded-xl"
          >
            <span>Về trang Streak Bạn Bè</span>
          </Link>
        </div>
      ) : inv.isTargetedToOther ? (
        <p className="text-xs font-semibold text-amber-800">
          Lời mời này được gửi riêng cho một thành viên khác.
        </p>
      ) : inv.viewerSlotsFull ? (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-amber-800">
            Bạn đã đạt tối đa 6 kết nối Streak bạn bè. Hãy ngắt bớt 1 kết nối cũ để nhận lời mời mới.
          </p>
          <Link
            to="/leaderboard?tab=friends"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-teal-700 rounded-xl"
          >
            <span>Mở danh sách Streak Bạn Bè</span>
          </Link>
        </div>
      ) : !user ? (
        <button
          type="button"
          onClick={() => openAuthModal('login')}
          className="w-full py-3 min-h-[44px] text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-xl inline-flex items-center justify-center gap-2 cursor-pointer"
        >
          <LogIn className="w-4 h-4" />
          <span>Đăng nhập để chấp nhận nối Streak</span>
        </button>
      ) : (
        <button
          type="button"
          disabled={accepting}
          onClick={() => void handleAccept()}
          className="w-full py-3 min-h-[44px] text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-xl inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
        >
          <Flame className="w-4 h-4" />
          <span>
            {accepting
              ? 'Đang kết nối...'
              : `Chấp nhận nối Streak cùng ${inv.inviter.displayName}`}
          </span>
        </button>
      )}
    </section>
  );
};
