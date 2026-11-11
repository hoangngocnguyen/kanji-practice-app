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
  FolderPlus,
  FolderInput,
  Pencil,
  Trash2,
  Folder,
  ListTree,
} from 'lucide-react';
import { FolderTreeNodeInput, useDecks } from '../context/DeckContext';
import { KanjiDeckExportBundle, StudyFolder } from '../types/deck';
import { signInWithSupabase, signUpWithSupabase } from '../utils/supabaseClient';

interface JsonImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const JsonImportModal: React.FC<JsonImportModalProps> = ({ isOpen, onClose }) => {
  const { folders, detectImportConflicts, importDeckBundle } = useDecks();
  const [bundle, setBundle] = useState<KanjiDeckExportBundle | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [targetParentId, setTargetParentId] = useState<string>('');
  const [resetSrs, setResetSrs] = useState<boolean>(true);
  const [conflictMode, setConflictMode] = useState<'merge' | 'copy'>('merge');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const conflicts = bundle ? detectImportConflicts(bundle, targetParentId || null) : [];

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
    const res = importDeckBundle(
      bundle,
      targetParentId || null,
      resetSrs,
      conflicts.length > 0 ? conflictMode : 'copy'
    );
    setSuccessMsg(
      res.importedFolders > 0
        ? `Đã nhập ${res.importedFolders} thư mục và ${res.importedKanji} chữ Kanji!`
        : `Đã gộp thêm ${res.importedKanji} chữ Kanji vào thư mục có sẵn!`
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
                Bộ bài:{' '}
                {bundle.rootFolderId === '__ALL__'
                  ? `Toàn bộ thư mục (${bundle.folders.length} thư mục)`
                  : rootFolderInBundle?.name || 'Thư mục nhập'}
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

              {conflicts.length > 0 && (
                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 space-y-2">
                  <div className="font-semibold flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>Phát hiện trùng tên thư mục: "{conflicts[0]}"</span>
                  </div>
                  <div className="space-y-1.5 pl-1">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="import-conflict-mode"
                        checked={conflictMode === 'merge'}
                        onChange={() => setConflictMode('merge')}
                        className="text-teal-700"
                      />
                      <span>Gộp vào thư mục có sẵn (chỉ thêm Kanji/từ ghép mới)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="import-conflict-mode"
                        checked={conflictMode === 'copy'}
                        onChange={() => setConflictMode('copy')}
                        className="text-teal-700"
                      />
                      <span>Tạo thư mục mới với hậu tố (Bản sao)</span>
                    </label>
                  </div>
                </div>
              )}

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

const SAMPLE_FOLDER_TREE_TEXT = `JLPT N5
  Bài 1 · Gia đình & Con người
  Bài 2 · Thời gian & Số đếm
  Bài 3 · Thiên nhiên
JLPT N4
  Bài 1 · Công việc
  Bài 2 · Giao thông`;

function parseFolderTreeText(raw: string): FolderTreeNodeInput[] {
  const roots: FolderTreeNodeInput[] = [];
  const stack: { indent: number; node: FolderTreeNodeInput }[] = [];

  const insertPath = (segments: string[]) => {
    let currentList = roots;
    for (const seg of segments) {
      const clean = seg.trim();
      if (!clean) continue;
      let existing = currentList.find(
        (n) => n.name.toLowerCase() === clean.toLowerCase()
      );
      if (!existing) {
        existing = { name: clean, children: [] };
        currentList.push(existing);
      }
      currentList = existing.children;
    }
  };

  const lines = raw.split(/\r?\n/);
  for (const rawLine of lines) {
    if (!rawLine.trim() || rawLine.trim().startsWith('#')) continue;

    // Normalize tabs to 2 spaces for consistent indentation calculation
    const expanded = rawLine.replace(/\t/g, '  ');
    const leadingSpaces = expanded.match(/^(\s*)/)?.[1].length || 0;
    const stripped = expanded
      .trim()
      .replace(/^(?:[-*•]+|[├└│─]+)\s*/, '')
      .trim();

    if (!stripped) continue;

    // Support slash path syntax: "JLPT N5 / Bài 1 / Phần A"
    if (stripped.includes('/') && leadingSpaces === 0) {
      const segments = stripped.split('/').map((s) => s.trim()).filter(Boolean);
      if (segments.length > 0) {
        insertPath(segments);
        stack.length = 0;
      }
      continue;
    }

    const newNode: FolderTreeNodeInput = { name: stripped, children: [] };

    while (stack.length > 0 && stack[stack.length - 1].indent >= leadingSpaces) {
      stack.pop();
    }

    if (stack.length === 0) {
      roots.push(newNode);
    } else {
      stack[stack.length - 1].node.children.push(newNode);
    }

    stack.push({ indent: leadingSpaces, node: newNode });
  }

  return roots;
}

function countTreeNodes(nodes: FolderTreeNodeInput[]): number {
  return nodes.reduce((sum, n) => sum + 1 + countTreeNodes(n.children), 0);
}

interface FolderFormModalProps {
  isOpen: boolean;
  mode: 'create' | 'rename';
  parentId: string | null;
  folder?: StudyFolder | null;
  onClose: () => void;
}

export const FolderFormModal: React.FC<FolderFormModalProps> = ({
  isOpen,
  mode,
  parentId,
  folder,
  onClose,
}) => {
  const {
    folders,
    isDuplicateFolderName,
    createFolder,
    createFolderTree,
    renameFolder,
  } = useDecks();
  const [createTab, setCreateTab] = useState<'single' | 'tree'>('single');
  const [name, setName] = useState(mode === 'rename' && folder ? folder.name : '');
  const [treeText, setTreeText] = useState('');
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      setCreateTab('single');
      setName(mode === 'rename' && folder ? folder.name : '');
      setTreeText('');
      setError(null);
    }
  }, [isOpen, mode, folder]);

  const parsedTree = React.useMemo(
    () => (createTab === 'tree' ? parseFolderTreeText(treeText) : []),
    [createTab, treeText]
  );
  const totalTreeNodes = React.useMemo(
    () => countTreeNodes(parsedTree),
    [parsedTree]
  );

  if (!isOpen) return null;

  const targetParentId = mode === 'rename' && folder ? folder.parentId : parentId;
  const parentFolder = targetParentId
    ? folders.find((f) => f.id === targetParentId)
    : null;
  const isLiveDuplicate = isDuplicateFolderName(
    name,
    targetParentId,
    mode === 'rename' && folder ? folder.id : undefined
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'create') {
      if (createTab === 'tree') {
        if (totalTreeNodes === 0) return;
        createFolderTree(parentId, parsedTree);
        onClose();
        return;
      }
      const res = createFolder(name, parentId);
      if (!res.ok) {
        setError(res.error || 'Không thể tạo thư mục.');
        return;
      }
    } else if (folder) {
      const res = renameFolder(folder.id, name);
      if (!res.ok) {
        setError(res.error || 'Không thể đổi tên thư mục.');
        return;
      }
    }
    onClose();
  };

  const renderTreePreview = (nodes: FolderTreeNodeInput[], depth = 0): React.ReactNode =>
    nodes.map((node, idx) => (
      <React.Fragment key={`${depth}-${idx}-${node.name}`}>
        <div
          className="flex items-center gap-1.5 py-1 text-xs text-slate-700"
          style={{ paddingLeft: `${depth * 18 + 8}px` }}
        >
          <Folder className="w-3.5 h-3.5 text-teal-700 shrink-0" />
          <span className="truncate font-medium">{node.name}</span>
        </div>
        {node.children.length > 0 && renderTreePreview(node.children, depth + 1)}
      </React.Fragment>
    ));

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <form
        onSubmit={handleSubmit}
        className={`bg-white rounded-2xl w-full p-5 sm:p-6 border border-slate-200 shadow-xl space-y-4 transition-all ${
          mode === 'create' && createTab === 'tree' ? 'max-w-lg' : 'max-w-md'
        }`}
      >
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            {mode === 'create' ? (
              <FolderPlus className="w-4 h-4 text-teal-700" />
            ) : (
              <Pencil className="w-4 h-4 text-teal-700" />
            )}
            <span>
              {mode === 'create'
                ? parentFolder
                  ? `Tạo thư mục con trong "${parentFolder.name}"`
                  : 'Tạo thư mục mới'
                : 'Đổi tên thư mục'}
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

        {mode === 'create' && (
          <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => {
                setCreateTab('single');
                setError(null);
              }}
              className={`py-1.5 px-3 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                createTab === 'single'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FolderPlus className="w-3.5 h-3.5 text-teal-700" />
              <span>Tạo 1 thư mục</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setCreateTab('tree');
                setError(null);
              }}
              className={`py-1.5 px-3 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                createTab === 'tree'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ListTree className="w-3.5 h-3.5 text-teal-700" />
              <span>Tạo cả cấu trúc</span>
            </button>
          </div>
        )}

        {mode === 'create' && createTab === 'tree' ? (
          <div className="space-y-3 text-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-2">
              <div className="text-[11px] text-slate-600 space-y-0.5">
                <div>
                  Thụt đầu dòng (Space/Tab) để tạo thư mục con, hoặc dùng dấu{' '}
                  <code className="font-mono font-semibold text-teal-800">/</code> (vd:{' '}
                  <code className="font-mono">N5 / Bài 1</code>).
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTreeText(SAMPLE_FOLDER_TREE_TEXT)}
                className="px-2.5 py-1 text-[11px] font-semibold text-teal-800 bg-white hover:bg-teal-50 border border-teal-200 rounded-lg cursor-pointer whitespace-nowrap shrink-0 self-start sm:self-center"
              >
                Chèn mẫu bộ khung
              </button>
            </div>

            <textarea
              value={treeText}
              onChange={(e) => setTreeText(e.target.value)}
              rows={6}
              placeholder={SAMPLE_FOLDER_TREE_TEXT}
              autoFocus
              className="w-full p-3 text-xs font-mono bg-slate-50 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-700 leading-relaxed"
            />

            {totalTreeNodes > 0 && (
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between text-[11px] font-semibold text-slate-700">
                  <span>Xem trước cây thư mục</span>
                  <span className="text-teal-700 tabular-nums">
                    {totalTreeNodes} thư mục
                  </span>
                </div>
                <div className="max-h-36 overflow-y-auto py-1.5 px-1 bg-white">
                  {renderTreePreview(parsedTree)}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-2 text-xs">
            <label className="block space-y-1.5">
              <span className="font-semibold text-slate-700 block">Tên thư mục</span>
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setError(null);
                }}
                placeholder="Ví dụ: JLPT N3, Bài 5 - Gia đình..."
                autoFocus
                className="w-full px-3 py-2.5 text-sm bg-slate-50 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-700"
              />
            </label>

            {(isLiveDuplicate || error) && (
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>
                  {error || `Đã tồn tại thư mục "${name.trim()}" trong cùng cấp này.`}
                </span>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={
              mode === 'create' && createTab === 'tree'
                ? totalTreeNodes === 0
                : !name.trim() || isLiveDuplicate
            }
            className="px-4 py-2 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 disabled:bg-slate-200 disabled:text-slate-400 rounded-xl cursor-pointer disabled:cursor-not-allowed"
          >
            {mode === 'create'
              ? createTab === 'tree'
                ? `Tạo ${totalTreeNodes > 0 ? totalTreeNodes : ''} thư mục`
                : 'Tạo thư mục'
              : 'Lưu thay đổi'}
          </button>
        </div>
      </form>
    </div>
  );
};

interface MoveFolderModalProps {
  isOpen: boolean;
  folder: StudyFolder | null;
  onClose: () => void;
}

export const MoveFolderModal: React.FC<MoveFolderModalProps> = ({
  isOpen,
  folder,
  onClose,
}) => {
  const { folders, getDescendantFolderIds, moveFolder } = useDecks();
  const [selectedTarget, setSelectedTarget] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen && folder) {
      setSelectedTarget(folder.parentId ?? '');
      setError(null);
    }
  }, [isOpen, folder]);

  if (!isOpen || !folder) return null;

  const excludedIds = new Set(getDescendantFolderIds(folder.id));

  // Build flat indented list of valid destination folders
  const buildTargetOptions = (
    parentId: string | null = null,
    depth = 0
  ): { id: string; label: string; depth: number }[] => {
    const children = folders
      .filter((f) => f.parentId === parentId && !excludedIds.has(f.id))
      .sort((a, b) => a.sortOrder - b.sortOrder);

    const out: { id: string; label: string; depth: number }[] = [];
    for (const c of children) {
      out.push({ id: c.id, label: c.name, depth });
      out.push(...buildTargetOptions(c.id, depth + 1));
    }
    return out;
  };

  const options = buildTargetOptions(null, 0);

  const handleConfirmMove = () => {
    const targetParentId = selectedTarget === '' ? null : selectedTarget;
    const res = moveFolder(folder.id, targetParentId);
    if (!res.ok) {
      setError(res.error || 'Không thể di chuyển thư mục.');
      return;
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 border border-slate-200 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <FolderInput className="w-4 h-4 text-teal-700" />
            <span className="truncate">Di chuyển "{folder.name}"</span>
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2 text-xs">
          <p className="text-slate-500">Chọn thư mục đích mới:</p>
          <div className="max-h-64 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100">
            <label className="flex items-center gap-2.5 px-3 py-2.5 hover:bg-slate-50 cursor-pointer">
              <input
                type="radio"
                name="move-target"
                checked={selectedTarget === ''}
                onChange={() => {
                  setSelectedTarget('');
                  setError(null);
                }}
                className="text-teal-700"
              />
              <span className="font-semibold text-slate-800">
                Thư mục gốc (Ngoài cùng)
              </span>
            </label>

            {options.map((opt) => (
              <label
                key={opt.id}
                className="flex items-center gap-2.5 px-3 py-2.5 hover:bg-slate-50 cursor-pointer"
                style={{ paddingLeft: `${opt.depth * 16 + 12}px` }}
              >
                <input
                  type="radio"
                  name="move-target"
                  checked={selectedTarget === opt.id}
                  onChange={() => {
                    setSelectedTarget(opt.id);
                    setError(null);
                  }}
                  className="text-teal-700"
                />
                <span className="text-slate-700 truncate">{opt.label}</span>
              </label>
            ))}
          </div>

          {error && (
            <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleConfirmMove}
            className="px-4 py-2 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-xl cursor-pointer"
          >
            Di chuyển đến đây
          </button>
        </div>
      </div>
    </div>
  );
};

interface DeleteFolderConfirmModalProps {
  isOpen: boolean;
  folder: StudyFolder | null;
  onClose: () => void;
  onDeleted?: () => void;
}

export const DeleteFolderConfirmModal: React.FC<DeleteFolderConfirmModalProps> = ({
  isOpen,
  folder,
  onClose,
  onDeleted,
}) => {
  const { getDescendantFolderIds, getItemsForFolderRecursive, deleteFolder } = useDecks();

  if (!isOpen || !folder) return null;

  const subCount = Math.max(0, getDescendantFolderIds(folder.id).length - 1);
  const kanjiCount = getItemsForFolderRecursive(folder.id).length;

  const handleConfirm = () => {
    deleteFolder(folder.id);
    onClose();
    if (onDeleted) onDeleted();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-sm w-full p-5 border border-slate-200 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-sm font-bold text-rose-700 flex items-center gap-2">
            <Trash2 className="w-4 h-4" />
            <span>Xác nhận xóa thư mục</span>
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          Bạn có chắc muốn xóa thư mục <strong className="text-slate-900">"{folder.name}"</strong>
          {subCount > 0 ? ` cùng ${subCount} thư mục con` : ''}
          {kanjiCount > 0 ? ` và ${kanjiCount} chữ Kanji bên trong` : ''}? Hành động này không thể hoàn tác.
        </p>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl cursor-pointer"
          >
            Xóa vĩnh viễn
          </button>
        </div>
      </div>
    </div>
  );
};
