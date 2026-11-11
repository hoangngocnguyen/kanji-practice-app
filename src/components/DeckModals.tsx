import React, { useState } from 'react';
import {
  X,
  Upload,
  Cloud,
  Check,
  Copy,
  Globe,
  RefreshCw,
  LogOut,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { useDecks } from '../context/DeckContext';
import { KanjiDeckExportBundle } from '../types/deck';
import { signInWithSupabase, signUpWithSupabase } from '../utils/supabaseClient';

interface JsonImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const JsonImportModal: React.FC<JsonImportModalProps> = ({ isOpen, onClose }) => {
  const { folders, importDeckBundle } = useDecks();
  const [bundle, setBundle] = useState<KanjiDeckExportBundle | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [targetParentId, setTargetParentId] = useState<string>('');
  const [resetSrs, setResetSrs] = useState<boolean>(true);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setSuccessMsg(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        if (
          !parsed ||
          parsed.appName !== 'LuyenKanji' ||
          !Array.isArray(parsed.folders) ||
          !Array.isArray(parsed.items)
        ) {
          setError('Tệp JSON không đúng định dạng bộ thẻ Luyện Kanji.');
          setBundle(null);
          return;
        }
        setBundle(parsed as KanjiDeckExportBundle);
      } catch {
        setError('Không thể đọc nội dung tệp JSON.');
        setBundle(null);
      }
    };
    reader.readAsText(file);
  };

  const handleImport = () => {
    if (!bundle) return;
    const res = importDeckBundle(bundle, targetParentId || null, resetSrs);
    setSuccessMsg(
      `Đã nhập thành công ${res.importedFolders} thư mục và ${res.importedKanji} chữ Kanji!`
    );
    setTimeout(() => {
      setBundle(null);
      setSuccessMsg(null);
      onClose();
    }, 900);
  };

  const rootFolderInBundle = bundle?.folders.find((f) => f.id === bundle.rootFolderId);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 border border-slate-200 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Upload className="w-4 h-4 text-teal-700" />
            <span>Nhập thư mục bài học (.json)</span>
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3 text-xs">
          <label className="block border-2 border-dashed border-slate-200 hover:border-teal-400 rounded-xl p-5 text-center cursor-pointer transition-colors bg-slate-50/70">
            <input
              type="file"
              accept=".json,application/json"
              onChange={handleFileChange}
              className="hidden"
            />
            <Upload className="w-6 h-6 text-teal-700 mx-auto mb-1.5" />
            <span className="font-semibold text-slate-800 block">
              Chọn tệp .json được chia sẻ từ bạn bè
            </span>
            <span className="text-slate-400 text-[11px]">
              Giữ nguyên cấu trúc thư mục cha-con & danh sách từ ghép
            </span>
          </label>

          {error && (
            <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {bundle && (
            <div className="p-3 rounded-xl bg-teal-50/60 border border-teal-200 space-y-2">
              <div className="font-bold text-teal-950">
                Bộ bài: {rootFolderInBundle?.name || 'Thư mục nhập'}
              </div>
              <div className="text-slate-600 tabular-nums">
                Gồm <strong>{bundle.folders.length}</strong> thư mục ·{' '}
                <strong>{bundle.items.length}</strong> chữ Kanji
              </div>

              <label className="block space-y-1 pt-1">
                <span className="font-semibold text-slate-700 block">Nhập vào vị trí:</span>
                <select
                  value={targetParentId}
                  onChange={(e) => setTargetParentId(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                >
                  <option value="">Làm thư mục gốc (Ngoài cùng)</option>
                  {folders.map((f) => (
                    <option key={f.id} value={f.id}>
                      Bên trong: {f.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex items-center gap-2 pt-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={resetSrs}
                  onChange={(e) => setResetSrs(e.target.checked)}
                  className="rounded border-slate-300 text-teal-700"
                />
                <span className="text-slate-700">
                  Đặt lại tiến độ ôn SRS về ban đầu (khuyên dùng)
                </span>
              </label>
            </div>
          )}

          {successMsg && (
            <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold flex items-center gap-2">
              <Check className="w-4 h-4" />
              <span>{successMsg}</span>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
          >
            Đóng
          </button>
          <button
            type="button"
            disabled={!bundle}
            onClick={handleImport}
            className="px-4 py-2 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 disabled:bg-slate-200 disabled:text-slate-400 rounded-xl cursor-pointer disabled:cursor-not-allowed"
          >
            Xác nhận nhập
          </button>
        </div>
      </div>
    </div>
  );
};

interface SupabaseCloudModalProps {
  isOpen: boolean;
  shareFolderId: string | null;
  onClose: () => void;
}

export const SupabaseCloudModal: React.FC<SupabaseCloudModalProps> = ({
  isOpen,
  shareFolderId,
  onClose,
}) => {
  const {
    folders,
    supabaseEnabled,
    cloudUser,
    isSyncing,
    lastSyncedAt,
    syncError,
    syncNowToCloud,
    pullFromCloud,
    logoutCloud,
    publishFolderPublicly,
    unpublishFolderPublicly,
  } = useDecks();

  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const targetFolder = shareFolderId ? folders.find((f) => f.id === shareFolderId) : null;
  const shareUrl = targetFolder?.shareSlug
    ? `${window.location.origin}/share/${targetFolder.shareSlug}`
    : '';

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setStatusMsg(null);
    setAuthLoading(true);
    try {
      if (authMode === 'login') {
        await signInWithSupabase(email, password);
        setStatusMsg('Đăng nhập thành công!');
      } else {
        await signUpWithSupabase(email, password);
        setStatusMsg('Đăng ký thành công! Vui lòng kiểm tra email nếu cần xác nhận.');
      }
    } catch (err: any) {
      setAuthError(err?.message || 'Lỗi xác thực Supabase.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleToggleShare = async () => {
    if (!targetFolder) return;
    setAuthError(null);
    try {
      if (targetFolder.isPublic) {
        await unpublishFolderPublicly(targetFolder.id);
        setStatusMsg('Đã tắt chia sẻ công khai.');
      } else {
        await publishFolderPublicly(targetFolder.id);
        setStatusMsg('Đã xuất bản bộ ôn tập công khai!');
      }
    } catch (err: any) {
      setAuthError(err?.message || 'Không thể cập nhật trạng thái chia sẻ.');
    }
  };

  const handleCopyShareUrl = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 1800);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 border border-slate-200 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Cloud className="w-4 h-4 text-teal-700" />
            <span>
              {targetFolder ? `Chia sẻ: ${targetFolder.name}` : 'Tài khoản & Đồng bộ Supabase'}
            </span>
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {!supabaseEnabled ? (
          <div className="space-y-3 text-xs text-slate-600">
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 space-y-1.5">
              <p className="font-bold">Chế độ Offline-first đang hoạt động</p>
              <p>
                Hiện tại mọi thư mục và tiến độ SRS được lưu an toàn trong trình duyệt của bạn. Bạn vẫn có thể dùng tính năng <strong>Xuất / Nhập file JSON</strong> để chia sẻ cho bạn bè ngay lập tức.
              </p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
              <p className="font-bold text-slate-800">Để bật đồng bộ Cloud & Link chia sẻ công khai:</p>
              <ol className="list-decimal pl-4 space-y-1">
                <li>Tạo project miễn phí tại Supabase và chạy script SQL trong <code>docs/supabase_decks_schema.sql</code>.</li>
                <li>Thêm <code>VITE_SUPABASE_URL</code> và <code>VITE_SUPABASE_ANON_KEY</code> vào biến môi trường Vercel hoặc <code>.env</code>.</li>
              </ol>
            </div>
          </div>
        ) : !cloudUser ? (
          <form onSubmit={handleAuthSubmit} className="space-y-3 text-xs">
            <div className="flex gap-1 p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                onClick={() => setAuthMode('login')}
                className={`flex-1 py-1.5 rounded-lg font-semibold cursor-pointer ${
                  authMode === 'login' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
                }`}
              >
                Đăng nhập
              </button>
              <button
                type="button"
                onClick={() => setAuthMode('signup')}
                className={`flex-1 py-1.5 rounded-lg font-semibold cursor-pointer ${
                  authMode === 'signup' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
                }`}
              >
                Đăng ký tài khoản
              </button>
            </div>

            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email của bạn..."
              required
              className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-teal-600"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mật khẩu (tối thiểu 6 ký tự)..."
              required
              minLength={6}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-teal-600"
            />

            {authError && (
              <div className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-700">
                {authError}
              </div>
            )}
            {statusMsg && (
              <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700">
                {statusMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={authLoading}
              className="w-full py-2.5 bg-teal-700 hover:bg-teal-800 text-white font-bold rounded-xl cursor-pointer"
            >
              {authLoading
                ? 'Đang xử lý...'
                : authMode === 'login'
                ? 'Đăng nhập Supabase'
                : 'Tạo tài khoản mới'}
            </button>
          </form>
        ) : (
          <div className="space-y-4 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div>
                <div className="font-bold text-slate-900">{cloudUser.email}</div>
                <div className="text-slate-500 text-[11px]">
                  {lastSyncedAt
                    ? `Đồng bộ gần nhất: ${new Date(lastSyncedAt).toLocaleTimeString('vi-VN')}`
                    : 'Sẵn sàng đồng bộ đám mây'}
                </div>
              </div>
              <button
                type="button"
                onClick={logoutCloud}
                className="p-1.5 text-slate-500 hover:text-rose-600 rounded-lg cursor-pointer"
                title="Đăng xuất"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={isSyncing}
                onClick={() => syncNowToCloud().then(() => setStatusMsg('Đã lưu lên Cloud!'))}
                className="py-2 px-3 bg-teal-700 hover:bg-teal-800 text-white font-semibold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>Lưu lên Cloud</span>
              </button>
              <button
                type="button"
                disabled={isSyncing}
                onClick={() => pullFromCloud().then(() => setStatusMsg('Đã tải từ Cloud về máy!'))}
                className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Cloud className="w-3.5 h-3.5" />
                <span>Tải từ Cloud</span>
              </button>
            </div>

            {targetFolder && (
              <div className="pt-3 border-t border-slate-100 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Globe className="w-4 h-4 text-teal-700" />
                    <span>Chia sẻ công khai cho mọi người</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleToggleShare}
                    className={`px-3 py-1 rounded-lg font-bold cursor-pointer ${
                      targetFolder.isPublic
                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                        : 'bg-teal-700 text-white'
                    }`}
                  >
                    {targetFolder.isPublic ? 'Tắt chia sẻ' : 'Bật chia sẻ'}
                  </button>
                </div>

                {targetFolder.isPublic && shareUrl && (
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      readOnly
                      value={shareUrl}
                      className="flex-1 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-mono text-[11px]"
                    />
                    <button
                      type="button"
                      onClick={handleCopyShareUrl}
                      className="px-2.5 py-1.5 bg-teal-50 text-teal-800 border border-teal-200 rounded-lg font-semibold cursor-pointer flex items-center gap-1"
                    >
                      {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedLink ? 'Đã chép' : 'Chép'}</span>
                    </button>
                    <a
                      href={shareUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1.5 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200"
                      title="Mở trang chia sẻ"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                )}
              </div>
            )}

            {(syncError || authError) && (
              <div className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-700">
                {syncError || authError}
              </div>
            )}
            {statusMsg && (
              <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700">
                {statusMsg}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
