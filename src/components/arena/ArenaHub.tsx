import React, { useEffect, useState } from 'react';
import {
  Swords,
  Users,
  Plus,
  Play,
  Trash2,
  Edit3,
  Clock,
  FolderKanban,
  BookOpen,
  ArrowRight,
  LogIn,
} from 'lucide-react';
import { KanjiLevelTab, LEVEL_METADATA } from '../../services/kanjiLevelService';
import { useDecks } from '../../context/DeckContext';
import { ArenaQuestionGeneratorConfig } from '../../pages/ArenaPage';
import { ArenaAdvanceMode, ArenaQuiz, ArenaRoomMode } from '../../types/arena';

interface ArenaHubProps {
  initialRoomCode: string;
  defaultDisplayName: string;
  isOnline: boolean;
  isAuthenticated: boolean;
  quizzes: ArenaQuiz[];
  isLoadingQuizzes: boolean;
  isBusy: boolean;
  errorMessage: string | null;
  onJoinRoom: (roomCode: string, displayName: string) => Promise<void>;
  onCreateQuickRoom: (params: {
    displayName: string;
    mode: ArenaRoomMode;
    advanceMode: ArenaAdvanceMode;
    title: string;
    timePerQuestion: number;
    generatorConfig: ArenaQuestionGeneratorConfig;
  }) => Promise<void>;
  onOpenQuizBuilder: (quiz?: ArenaQuiz) => void;
  onHostSavedQuiz: (
    quiz: ArenaQuiz,
    mode: ArenaRoomMode,
    advanceMode: ArenaAdvanceMode,
    displayName: string
  ) => Promise<void>;
  onDeleteQuiz: (quizId: string) => Promise<void>;
  onRequireLogin: () => void;
}

export const ArenaHub: React.FC<ArenaHubProps> = ({
  initialRoomCode,
  defaultDisplayName,
  isOnline,
  isAuthenticated,
  quizzes,
  isLoadingQuizzes,
  isBusy,
  errorMessage,
  onJoinRoom,
  onCreateQuickRoom,
  onOpenQuizBuilder,
  onHostSavedQuiz,
  onDeleteQuiz,
  onRequireLogin,
}) => {
  const { folders, items } = useDecks();

  const [joinCode, setJoinCode] = useState<string>(initialRoomCode);
  const [displayName, setDisplayName] = useState<string>(defaultDisplayName);

  // Create room config
  const [createMode, setCreateMode] = useState<ArenaRoomMode>('1v1');
  const [sourceType, setSourceType] = useState<'jlpt' | 'folder'>('jlpt');
  const [selectedLevel, setSelectedLevel] = useState<KanjiLevelTab>('N5');
  const [selectedFolderId, setSelectedFolderId] = useState<string>(
    () => folders[0]?.id || ''
  );
  const [questionCount, setQuestionCount] = useState<number>(10);
  const [timePerQuestion, setTimePerQuestion] = useState<number>(15);
  const [questionMode, setQuestionMode] = useState<
    'mixed' | 'kanji-to-meaning' | 'meaning-to-kanji' | 'reading' | 'sentence-cloze'
  >('mixed');
  const [advanceMode, setAdvanceMode] = useState<ArenaAdvanceMode>('auto');
  const [groupQuizModalMode, setGroupQuizModalMode] = useState<Record<string, ArenaRoomMode>>({});

  useEffect(() => {
    if (initialRoomCode) {
      setJoinCode(initialRoomCode);
    }
  }, [initialRoomCode]);

  useEffect(() => {
    if (defaultDisplayName && !displayName) {
      setDisplayName(defaultDisplayName);
    }
  }, [defaultDisplayName, displayName]);

  useEffect(() => {
    if (!selectedFolderId && folders.length > 0) {
      setSelectedFolderId(folders[0].id);
    }
  }, [folders, selectedFolderId]);

  const usableFolders = folders.filter((f) =>
    items.some((it) => it.folderId === f.id)
  );

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = joinCode.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    const cleanName = displayName.trim();
    if (cleanCode.length !== 6 || !cleanName) return;
    void onJoinRoom(cleanCode, cleanName);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = displayName.trim() || 'Chủ phòng';
    const folderObj = folders.find((f) => f.id === selectedFolderId);
    const title =
      sourceType === 'folder' && folderObj
        ? `${createMode === '1v1' ? '1v1' : 'Thi nhóm'} · ${folderObj.name}`
        : `${createMode === '1v1' ? '1v1' : 'Phòng thi'} Kanji ${
            selectedLevel === 'JOYO' ? 'Jōyō' : selectedLevel
          }`;

    void onCreateQuickRoom({
      displayName: cleanName,
      mode: createMode,
      advanceMode,
      title,
      timePerQuestion,
      generatorConfig: {
        sourceType,
        level: selectedLevel,
        folderId: selectedFolderId,
        count: questionCount,
        mode: questionMode,
      },
    });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-8">
      {/* Compact Hero Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-700 text-white flex items-center justify-center shrink-0">
              <Swords className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Đấu trường Kanji
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500">
            Thi đấu 1v1 trực tiếp hoặc mở phòng nhóm kiểu Wayground · Bạn bè nhập tên chơi ngay qua mã 6 ký tự
          </p>
        </div>

        <button
          type="button"
          onClick={() => onOpenQuizBuilder()}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[42px] text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-xl transition-colors cursor-pointer shrink-0 whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          <span>Tạo bộ đề mới</span>
        </button>
      </div>

      {!isOnline && (
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-medium">
          Bạn đang ngoại tuyến. Đấu trường trực tuyến cần kết nối Internet để tạo phòng và thi đấu với bạn bè.
        </div>
      )}

      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
          {errorMessage}
        </div>
      )}

      {/* Primary Two-Column Layout: Join Code + Quick Match Setup */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left: Join Room with 6-char code */}
        <section className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
          <div className="space-y-1">
            <h2 className="text-base font-bold text-slate-900">Vào phòng bằng mã mời</h2>
            <p className="text-xs text-slate-500">
              Nhập mã 6 ký tự từ bạn bè để tham gia ngay, không cần tài khoản.
            </p>
          </div>

          <form onSubmit={handleJoinSubmit} className="space-y-3.5">
            <div>
              <label
                htmlFor="arena-display-name"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Tên hiển thị của bạn
              </label>
              <input
                id="arena-display-name"
                type="text"
                maxLength={40}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Ví dụ: Minh Nhật"
                className="w-full h-11 px-3.5 text-sm bg-slate-50 focus:bg-white text-slate-900 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
                required
              />
            </div>

            <div>
              <label
                htmlFor="arena-room-code"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Mã phòng (6 ký tự)
              </label>
              <input
                id="arena-room-code"
                type="text"
                maxLength={6}
                value={joinCode}
                onChange={(e) =>
                  setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))
                }
                placeholder="VD: K7M9P2"
                className="w-full h-12 px-4 text-center text-lg font-mono font-extrabold tracking-[0.25em] uppercase bg-slate-50 focus:bg-white text-slate-900 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
                required
              />
            </div>

            <button
              type="submit"
              disabled={
                !isOnline ||
                isBusy ||
                joinCode.trim().length !== 6 ||
                !displayName.trim()
              }
              className="w-full h-11 px-4 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Tham gia phòng đấu</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </section>

        {/* Right: Quick Create Room (Random JLPT / Folder) */}
        <section className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-slate-900">Mở phòng đấu nhanh</h2>
              <p className="text-xs text-slate-500">
                Lấy câu hỏi ngẫu nhiên từ bộ JLPT hoặc thư mục Flashcard của bạn.
              </p>
            </div>

            {/* Segmented Mode Switch: 1v1 vs Group */}
            <div className="inline-flex p-1 bg-slate-100 rounded-xl shrink-0">
              <button
                type="button"
                onClick={() => setCreateMode('1v1')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                  createMode === '1v1'
                    ? 'bg-white text-teal-800 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Swords className="w-3.5 h-3.5" />
                <span>Đấu 1v1</span>
              </button>
              <button
                type="button"
                onClick={() => setCreateMode('group')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                  createMode === 'group'
                    ? 'bg-white text-teal-800 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Phòng nhóm</span>
              </button>
            </div>
          </div>

          <form onSubmit={handleCreateSubmit} className="space-y-4">
            {/* Source Switch */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSourceType('jlpt')}
                className={`h-11 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                  sourceType === 'jlpt'
                    ? 'bg-teal-50 border-teal-700 text-teal-900'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <BookOpen className="w-4 h-4 shrink-0" />
                <span className="truncate">Theo cấp độ JLPT</span>
              </button>
              <button
                type="button"
                onClick={() => setSourceType('folder')}
                disabled={usableFolders.length === 0}
                className={`h-11 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50 ${
                  sourceType === 'folder'
                    ? 'bg-teal-50 border-teal-700 text-teal-900'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <FolderKanban className="w-4 h-4 shrink-0" />
                <span className="truncate">
                  {usableFolders.length > 0 ? 'Từ thư mục của tôi' : 'Chưa có thư mục'}
                </span>
              </button>
            </div>

            {sourceType === 'jlpt' ? (
              <div>
                <span className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Chọn cấp độ Kanji
                </span>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                  {LEVEL_METADATA.map((lvl) => (
                    <button
                      key={lvl.key}
                      type="button"
                      onClick={() => setSelectedLevel(lvl.key)}
                      className={`h-10 px-2 rounded-lg border text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                        selectedLevel === lvl.key
                          ? 'bg-teal-700 border-teal-700 text-white'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {lvl.shortLabel}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <label
                  htmlFor="arena-folder-select"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Chọn thư mục Flashcard
                </label>
                <select
                  id="arena-folder-select"
                  value={selectedFolderId}
                  onChange={(e) => setSelectedFolderId(e.target.value)}
                  className="w-full h-11 px-3 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-teal-700"
                >
                  {usableFolders.map((f) => {
                    const cnt = items.filter((it) => it.folderId === f.id).length;
                    return (
                      <option key={f.id} value={f.id}>
                        {f.name} ({cnt} Kanji)
                      </option>
                    );
                  })}
                </select>
              </div>
            )}

            {/* Parameters Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label
                  htmlFor="arena-q-count"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Số câu hỏi
                </label>
                <select
                  id="arena-q-count"
                  value={questionCount}
                  onChange={(e) => setQuestionCount(Number(e.target.value))}
                  className="w-full h-10 px-3 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-teal-700 tabular-nums"
                >
                  <option value={5}>5 câu (Nhanh)</option>
                  <option value={10}>10 câu (Chuẩn)</option>
                  <option value={15}>15 câu</option>
                  <option value={20}>20 câu</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="arena-q-time"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Thời gian mỗi câu
                </label>
                <select
                  id="arena-q-time"
                  value={timePerQuestion}
                  onChange={(e) => setTimePerQuestion(Number(e.target.value))}
                  className="w-full h-10 px-3 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-teal-700 tabular-nums"
                >
                  <option value={10}>10 giây / câu</option>
                  <option value={15}>15 giây / câu</option>
                  <option value={20}>20 giây / câu</option>
                  <option value={30}>30 giây / câu</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="arena-q-mode"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Dạng câu hỏi
                </label>
                <select
                  id="arena-q-mode"
                  value={questionMode}
                  onChange={(e) => setQuestionMode(e.target.value as any)}
                  className="w-full h-10 px-3 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-teal-700"
                >
                  <option value="mixed">Trộn 4 dạng</option>
                  <option value="kanji-to-meaning">Kanji → Nghĩa Việt</option>
                  <option value="meaning-to-kanji">Nghĩa Việt → Kanji</option>
                  <option value="reading">Âm đọc On / Kun</option>
                  <option value="sentence-cloze">Điền Kanji vào câu</option>
                </select>
              </div>
            </div>

            {createMode === 'group' && (
              <div className="flex items-center justify-between gap-3 pt-1">
                <span className="text-xs font-medium text-slate-600">
                  Nhịp chuyển câu:
                </span>
                <div className="inline-flex p-0.5 bg-slate-100 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setAdvanceMode('auto')}
                    className={`px-2.5 py-1 text-[11px] font-semibold rounded-md cursor-pointer ${
                      advanceMode === 'auto'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600'
                    }`}
                  >
                    Tự động đồng bộ
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdvanceMode('host')}
                    className={`px-2.5 py-1 text-[11px] font-semibold rounded-md cursor-pointer ${
                      advanceMode === 'host'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600'
                    }`}
                  >
                    Chủ phòng bấm Tiếp
                  </button>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={!isOnline || isBusy || !displayName.trim()}
              className="w-full h-11 px-4 bg-teal-700 hover:bg-teal-800 disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <Play className="w-4 h-4" />
              <span>
                {createMode === '1v1'
                  ? 'Tạo phòng đấu 1v1 & lấy mã mời'
                  : 'Mở phòng thi nhóm'}
              </span>
            </button>
          </form>
        </section>
      </div>

      {/* Saved Custom Quizzes Library (Wayground style) */}
      <section className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Bộ đề tự tạo của bạn
            </h2>
            <p className="text-xs text-slate-500">
              Soạn sẵn câu hỏi trước rồi mở phòng cho bạn bè hoặc lớp học vào thi cùng lúc.
            </p>
          </div>
          {!isAuthenticated && (
            <button
              type="button"
              onClick={onRequireLogin}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-teal-800 bg-teal-50 hover:bg-teal-100 rounded-xl border border-teal-200 cursor-pointer shrink-0 whitespace-nowrap"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Đăng nhập để đồng bộ bộ đề</span>
            </button>
          )}
        </div>

        {isLoadingQuizzes ? (
          <div className="py-8 text-center text-xs text-slate-500">
            Đang tải danh sách bộ đề...
          </div>
        ) : quizzes.length === 0 ? (
          <div className="py-10 text-center space-y-3">
            <p className="text-sm font-medium text-slate-600">
              Bạn chưa có bộ đề tự tạo nào.
            </p>
            <button
              type="button"
              onClick={() => onOpenQuizBuilder()}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-xl cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Soạn bộ đề đầu tiên</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {quizzes.map((quiz) => {
              const targetMode = groupQuizModalMode[quiz.id] || 'group';
              return (
                <div
                  key={quiz.id}
                  className="p-4 rounded-xl border border-slate-200 hover:border-slate-300 bg-slate-50/40 flex flex-col justify-between gap-3 transition-colors"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-bold text-slate-900 line-clamp-1">
                        {quiz.title}
                      </h3>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => onOpenQuizBuilder(quiz)}
                          className="p-1.5 text-slate-500 hover:text-teal-800 hover:bg-teal-50 rounded-lg cursor-pointer"
                          title="Chỉnh sửa bộ đề"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void onDeleteQuiz(quiz.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                          title="Xóa bộ đề"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 tabular-nums">
                      <span>{quiz.questions.length} câu</span>
                      <span aria-hidden="true">·</span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {quiz.timePerQuestion}s/câu
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{quiz.levelTag}</span>
                      {quiz.playCount > 0 && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>{quiz.playCount} lượt thi</span>
                        </>
                      )}
                    </div>

                    {quiz.description && (
                      <p className="text-xs text-slate-600 line-clamp-2">
                        {quiz.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200/80">
                    <div className="inline-flex p-0.5 bg-slate-200/70 rounded-lg">
                      <button
                        type="button"
                        onClick={() =>
                          setGroupQuizModalMode((prev) => ({ ...prev, [quiz.id]: '1v1' }))
                        }
                        className={`px-2 py-1 text-[11px] font-semibold rounded-md cursor-pointer ${
                          targetMode === '1v1'
                            ? 'bg-white text-slate-900 shadow-2xs'
                            : 'text-slate-600'
                        }`}
                      >
                        1v1
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setGroupQuizModalMode((prev) => ({ ...prev, [quiz.id]: 'group' }))
                        }
                        className={`px-2 py-1 text-[11px] font-semibold rounded-md cursor-pointer ${
                          targetMode === 'group'
                            ? 'bg-white text-slate-900 shadow-2xs'
                            : 'text-slate-600'
                        }`}
                      >
                        Nhóm
                      </button>
                    </div>

                    <button
                      type="button"
                      disabled={!isOnline || isBusy}
                      onClick={() =>
                        void onHostSavedQuiz(
                          quiz,
                          targetMode,
                          targetMode === 'group' ? 'host' : 'auto',
                          displayName.trim() || 'Chủ phòng'
                        )
                      }
                      className="px-3.5 py-2 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 disabled:bg-slate-300 rounded-lg inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>Mở phòng thi</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
