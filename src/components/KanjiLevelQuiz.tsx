import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  Volume2,
  ArrowRight,
  RotateCcw,
  FolderPlus,
  Award,
  PenTool,
  Flame,
  Keyboard,
  MousePointerClick,
  CheckSquare,
  Square,
} from 'lucide-react';
import { QuizTileIcon } from './icons/QuizTileIcon';
import { KanjiDetail } from '../types/kanji';
import {
  KanjiCatalogEntry,
  KanjiExampleSentence,
  catalogEntryToKanjiDetail,
  getStaticSentencesForKanji,
  loadKanjiSentencesStatic,
} from '../services/kanjiLevelService';
import { speakJapanese } from '../utils/speech';

export type QuizModeType =
  | 'kanji-to-meaning'
  | 'meaning-to-kanji'
  | 'reading'
  | 'sentence-cloze'
  | 'mixed';

type ConcreteQuizMode = Exclude<QuizModeType, 'mixed'>;
type QuizScopeType = 'displayed' | 'level' | 'selected';

interface QuizQuestion {
  id: string;
  mode: ConcreteQuizMode;
  target: KanjiCatalogEntry;
  promptPrimary: string;
  promptSub?: string;
  sentenceObj?: KanjiExampleSentence;
  options: Array<{
    id: string;
    label: string;
    subLabel?: string;
    kanjiChar: string;
    isCorrect: boolean;
  }>;
  correctOptionId: string;
}

interface KanjiLevelQuizProps {
  levelLabel: string;
  levelPool: KanjiCatalogEntry[];
  displayedPool: KanjiCatalogEntry[];
  selectedPool: KanjiCatalogEntry[];
  onInspectChar: (char: string) => void;
  onExportWrongKanji: (details: KanjiDetail[]) => void;
  onExitQuiz?: () => void;
}

function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function formatReadingsPair(entry: KanjiCatalogEntry): string {
  const on = entry.on.slice(0, 2).join('・');
  const kun = entry.kun.slice(0, 2).join('・');
  if (on && kun) return `On: ${on} · Kun: ${kun}`;
  if (on) return `On: ${on}`;
  if (kun) return `Kun: ${kun}`;
  return entry.hv;
}

function maskSentenceWithBlank(sentence: string, targetChar: string): string {
  return sentence.split(targetChar).join('【 ＿ 】');
}

const ALL_CONCRETE_MODES: ConcreteQuizMode[] = [
  'kanji-to-meaning',
  'meaning-to-kanji',
  'reading',
  'sentence-cloze',
];

export const KanjiLevelQuiz: React.FC<KanjiLevelQuizProps> = ({
  levelLabel,
  levelPool,
  displayedPool,
  selectedPool,
  onInspectChar,
  onExportWrongKanji,
  onExitQuiz,
}) => {
  const [selectedModes, setSelectedModes] = useState<ConcreteQuizMode[]>([
    'kanji-to-meaning',
  ]);
  const [scope, setScope] = useState<QuizScopeType>(
    selectedPool.length >= 4 ? 'selected' : 'displayed'
  );
  const [questionCount, setQuestionCount] = useState<number>(10);
  const [clozeInputStyle, setClozeInputStyle] = useState<'choice' | 'type'>('choice');
  const [typedKanjiAnswer, setTypedKanjiAnswer] = useState<string>('');

  const [sessionState, setSessionState] = useState<'setup' | 'active' | 'summary'>('setup');
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState<number>(0);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [answeredCorrect, setAnsweredCorrect] = useState<boolean | null>(null);
  const [score, setScore] = useState<number>(0);
  const [streak, setStreak] = useState<number>(0);
  const [bestStreak, setBestStreak] = useState<number>(0);
  const [wrongEntries, setWrongEntries] = useState<KanjiCatalogEntry[]>([]);

  // Ensure static sentence dictionary is loaded in background (no-op if already loaded on /levels)
  useEffect(() => {
    void loadKanjiSentencesStatic();
  }, []);

  // Keep scope valid if selectedPool empties
  useEffect(() => {
    if (scope === 'selected' && selectedPool.length === 0) {
      setScope('displayed');
    }
  }, [scope, selectedPool.length]);

  const activeSourcePool = useMemo(() => {
    if (scope === 'selected' && selectedPool.length > 0) return selectedPool;
    if (scope === 'level') return levelPool;
    return displayedPool.length > 0 ? displayedPool : levelPool;
  }, [scope, selectedPool, levelPool, displayedPool]);

  const distractorPool = useMemo(() => {
    return levelPool.length >= 10 ? levelPool : activeSourcePool;
  }, [levelPool, activeSourcePool]);

  const toggleQuizMode = useCallback((mode: ConcreteQuizMode) => {
    setSelectedModes((prev) => {
      if (prev.includes(mode)) {
        // Always keep at least 1 mode selected
        if (prev.length === 1) return prev;
        return prev.filter((m) => m !== mode);
      }
      return [...prev, mode];
    });
  }, []);

  const selectAllModes = useCallback(() => {
    setSelectedModes(ALL_CONCRETE_MODES);
  }, []);

  const isAllModesSelected = selectedModes.length === ALL_CONCRETE_MODES.length;

  const buildQuestions = useCallback(
    (
      pool: KanjiCatalogEntry[],
      desiredModes: ConcreteQuizMode[],
      count: number
    ): QuizQuestion[] => {
      const modesToUse: ConcreteQuizMode[] =
        desiredModes.length > 0 ? desiredModes : ['kanji-to-meaning'];
      const onlyClozeSelected =
        modesToUse.length === 1 && modesToUse[0] === 'sentence-cloze';

      // If only sentence-cloze is selected, prefer items that have static sentences containing the target character
      const candidatePool = onlyClozeSelected
        ? (() => {
            const withSent = pool.filter((e) =>
              getStaticSentencesForKanji(e.c, 2).some((s) => s.jp.includes(e.c))
            );
            return withSent.length > 0 ? withSent : pool;
          })()
        : pool;

      const shuffledTargets = shuffleArray(candidatePool).slice(
        0,
        count === -1 ? candidatePool.length : Math.min(count, candidatePool.length)
      );

      const built: QuizQuestion[] = [];

      for (let i = 0; i < shuffledTargets.length; i++) {
        const target = shuffledTargets[i];
        let mode: ConcreteQuizMode = modesToUse[i % modesToUse.length];

        const staticSentences = getStaticSentencesForKanji(target.c, 2).filter((s) =>
          s.jp.includes(target.c)
        );
        const hasReading = target.on.length > 0 || target.kun.length > 0;

        const isCompatible = (m: ConcreteQuizMode) => {
          if (m === 'sentence-cloze') return staticSentences.length > 0;
          if (m === 'reading') return hasReading;
          return true;
        };

        if (!isCompatible(mode)) {
          const fallbackSelected = modesToUse.find((m) => isCompatible(m));
          mode = fallbackSelected || 'kanji-to-meaning';
        }

        // Select 3 distractors that do not collide visually or by primary answer text
        const targetPrimaryMeaning = (target.vi[0] || target.hv).toLowerCase();
        const targetReadingStr = formatReadingsPair(target);

        const distractors: KanjiCatalogEntry[] = [];
        for (const cand of shuffleArray(distractorPool)) {
          if (cand.c === target.c) continue;
          if (mode === 'kanji-to-meaning') {
            const candMeaning = (cand.vi[0] || cand.hv).toLowerCase();
            if (candMeaning === targetPrimaryMeaning) continue;
          }
          if (mode === 'reading') {
            if (cand.on.length === 0 && cand.kun.length === 0) continue;
            if (formatReadingsPair(cand) === targetReadingStr) continue;
          }
          distractors.push(cand);
          if (distractors.length >= 3) break;
        }

        // Fill remaining distractors if pool was ultra small
        if (distractors.length < 3) {
          for (const cand of shuffleArray(levelPool)) {
            if (cand.c !== target.c && !distractors.some((d) => d.c === cand.c)) {
              distractors.push(cand);
              if (distractors.length >= 3) break;
            }
          }
        }

        const allChoices = shuffleArray([target, ...distractors]);

        if (mode === 'kanji-to-meaning') {
          const correctOptId = `opt-${i}-${target.c}`;
          built.push({
            id: `q-${i}-${target.c}`,
            mode,
            target,
            promptPrimary: target.c,
            promptSub: `Hán-Việt: ${target.hv}`,
            options: allChoices.map((ch) => ({
              id: `opt-${i}-${ch.c}`,
              label: ch.vi.slice(0, 2).join(', ') || ch.hv,
              subLabel: undefined,
              kanjiChar: ch.c,
              isCorrect: ch.c === target.c,
            })),
            correctOptionId: correctOptId,
          });
        } else if (mode === 'meaning-to-kanji') {
          const correctOptId = `opt-${i}-${target.c}`;
          built.push({
            id: `q-${i}-${target.c}`,
            mode,
            target,
            promptPrimary: target.vi.slice(0, 2).join(' · ') || target.hv,
            promptSub: `Âm Hán-Việt: ${target.hv}`,
            options: allChoices.map((ch) => ({
              id: `opt-${i}-${ch.c}`,
              label: ch.c,
              subLabel: undefined,
              kanjiChar: ch.c,
              isCorrect: ch.c === target.c,
            })),
            correctOptionId: correctOptId,
          });
        } else if (mode === 'reading') {
          const correctOptId = `opt-${i}-${target.c}`;
          built.push({
            id: `q-${i}-${target.c}`,
            mode,
            target,
            promptPrimary: target.c,
            promptSub: `Nghĩa: ${target.vi[0] || target.hv}`,
            options: allChoices.map((ch) => ({
              id: `opt-${i}-${ch.c}`,
              label: formatReadingsPair(ch),
              subLabel: undefined,
              kanjiChar: ch.c,
              isCorrect: ch.c === target.c,
            })),
            correctOptionId: correctOptId,
          });
        } else {
          // sentence-cloze (0ms static corpus)
          const sent = staticSentences[0];
          const correctOptId = `opt-${i}-${target.c}`;
          built.push({
            id: `q-${i}-${target.c}`,
            mode: 'sentence-cloze',
            target,
            promptPrimary: maskSentenceWithBlank(sent.jp, target.c),
            promptSub: sent.vi,
            sentenceObj: sent,
            options: allChoices.map((ch) => ({
              id: `opt-${i}-${ch.c}`,
              label: ch.c,
              subLabel: ch.hv,
              kanjiChar: ch.c,
              isCorrect: ch.c === target.c,
            })),
            correctOptionId: correctOptId,
          });
        }
      }

      return shuffleArray(built);
    },
    [distractorPool, levelPool]
  );

  const startQuiz = useCallback(
    (customPool?: KanjiCatalogEntry[]) => {
      const pool = customPool && customPool.length > 0 ? customPool : activeSourcePool;
      if (pool.length === 0) return;

      const actualCount =
        questionCount === -1 ? Math.min(pool.length, 200) : Math.min(questionCount, pool.length);

      const generated = buildQuestions(pool, selectedModes, actualCount);
      setQuestions(generated);
      setCurrentIdx(0);
      setSelectedOptionId(null);
      setAnsweredCorrect(null);
      setTypedKanjiAnswer('');
      setScore(0);
      setStreak(0);
      setBestStreak(0);
      setWrongEntries([]);
      setSessionState('active');
    },
    [activeSourcePool, questionCount, selectedModes, buildQuestions]
  );

  const currentQuestion = questions[currentIdx] || null;
  const isAnswered = selectedOptionId !== null || answeredCorrect !== null;

  const handleSelectOption = useCallback(
    (optionId: string) => {
      if (!currentQuestion || isAnswered) return;
      const opt = currentQuestion.options.find((o) => o.id === optionId);
      if (!opt) return;

      setSelectedOptionId(optionId);
      const isRight = opt.isCorrect;
      setAnsweredCorrect(isRight);

      if (isRight) {
        setScore((s) => s + 1);
        setStreak((st) => {
          const next = st + 1;
          setBestStreak((b) => Math.max(b, next));
          return next;
        });
      } else {
        setStreak(0);
        setWrongEntries((prev) =>
          prev.some((x) => x.c === currentQuestion.target.c)
            ? prev
            : [...prev, currentQuestion.target]
        );
      }
    },
    [currentQuestion, isAnswered]
  );

  const handleSubmitTypedCloze = useCallback(
    (e?: React.FormEvent) => {
      e?.preventDefault();
      if (!currentQuestion || isAnswered) return;
      const cleaned = typedKanjiAnswer.trim();
      if (!cleaned) return;

      const isRight =
        cleaned === currentQuestion.target.c ||
        cleaned.includes(currentQuestion.target.c);
      setAnsweredCorrect(isRight);
      if (isRight) {
        setSelectedOptionId(currentQuestion.correctOptionId);
        setScore((s) => s + 1);
        setStreak((st) => {
          const next = st + 1;
          setBestStreak((b) => Math.max(b, next));
          return next;
        });
      } else {
        setSelectedOptionId('typed-wrong');
        setStreak(0);
        setWrongEntries((prev) =>
          prev.some((x) => x.c === currentQuestion.target.c)
            ? prev
            : [...prev, currentQuestion.target]
        );
      }
    },
    [currentQuestion, isAnswered, typedKanjiAnswer]
  );

  const handleNextQuestion = useCallback(() => {
    if (currentIdx + 1 >= questions.length) {
      setSessionState('summary');
    } else {
      setCurrentIdx((idx) => idx + 1);
      setSelectedOptionId(null);
      setAnsweredCorrect(null);
      setTypedKanjiAnswer('');
    }
  }, [currentIdx, questions.length]);

  // Keyboard shortcuts: 1-4 to pick options, Enter to advance
  useEffect(() => {
    if (sessionState !== 'active' || !currentQuestion) return;

    const handleKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') {
        if (e.key === 'Enter' && isAnswered) {
          e.preventDefault();
          handleNextQuestion();
        }
        return;
      }

      if (!isAnswered) {
        if (['1', '2', '3', '4'].includes(e.key)) {
          const optIdx = Number(e.key) - 1;
          const opt = currentQuestion.options[optIdx];
          if (opt) {
            e.preventDefault();
            handleSelectOption(opt.id);
          }
        }
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleNextQuestion();
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [sessionState, currentQuestion, isAnswered, handleSelectOption, handleNextQuestion]);

  const modeCards: Array<{
    key: ConcreteQuizMode;
    title: string;
    desc: string;
  }> = [
    {
      key: 'kanji-to-meaning',
      title: 'Kanji → Nghĩa Việt',
      desc: 'Nhìn chữ Hán, chọn đúng nghĩa tiếng Việt.',
    },
    {
      key: 'meaning-to-kanji',
      title: 'Nghĩa / Hán-Việt → Kanji',
      desc: 'Đọc nghĩa Việt & âm Hán-Việt, chọn mặt chữ Kanji.',
    },
    {
      key: 'reading',
      title: 'Âm đọc On / Kun',
      desc: 'Luyện ghi nhớ cách đọc Onyomi và Kunyomi chuẩn.',
    },
    {
      key: 'sentence-cloze',
      title: 'Điền Kanji vào câu ví dụ',
      desc: 'Hoàn thiện câu tiếng Nhật thực tế — mở ngay lập tức (0ms).',
    },
  ];

  // 1. SETUP VIEW
  if (sessionState === 'setup') {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 sm:p-7 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900">
              Luyện tập & Kiểm tra nhanh · {levelLabel}
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
              Chọn 1, nhiều hoặc tất cả dạng câu hỏi, chọn phạm vi từ vựng và bắt đầu kiểm tra. Hỗ trợ phím 1–4 và Enter.
            </p>
          </div>
          {onExitQuiz && (
            <button
              type="button"
              onClick={onExitQuiz}
              className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer self-start sm:self-auto"
            >
              Quay lại danh sách
            </button>
          )}
        </div>

        {/* Mode selection (1, multiple, or all) */}
        <div className="space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
              1. Chọn dạng bài Quiz{' '}
              <span className="normal-case font-semibold text-teal-700">
                (Đã chọn {selectedModes.length}/{ALL_CONCRETE_MODES.length})
              </span>
            </div>
            <button
              type="button"
              onClick={() =>
                isAllModesSelected
                  ? setSelectedModes(['kanji-to-meaning'])
                  : selectAllModes()
              }
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold border cursor-pointer transition-colors ${
                isAllModesSelected
                  ? 'bg-teal-700 text-white border-teal-800'
                  : 'bg-slate-50 hover:bg-teal-50 text-teal-800 border-slate-200 hover:border-teal-300'
              }`}
            >
              {isAllModesSelected ? 'Đã chọn tất cả 4 dạng' : 'Chọn tất cả'}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {modeCards.map((mc) => {
              const active = selectedModes.includes(mc.key);
              return (
                <button
                  key={mc.key}
                  type="button"
                  onClick={() => toggleQuizMode(mc.key)}
                  aria-pressed={active}
                  className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex items-start justify-between gap-3 ${
                    active
                      ? 'bg-teal-50/80 border-teal-600 ring-1 ring-teal-500/30'
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/70'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="font-bold text-sm text-slate-900">{mc.title}</div>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">{mc.desc}</p>
                  </div>
                  <span
                    className={`shrink-0 mt-0.5 ${
                      active ? 'text-teal-700' : 'text-slate-300'
                    }`}
                  >
                    {active ? (
                      <CheckSquare className="w-4 h-4" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </span>
                </button>
              );
            })}

            {/* Select All / Mixed shortcut card */}
            <button
              type="button"
              onClick={selectAllModes}
              aria-pressed={isAllModesSelected}
              className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex items-start justify-between gap-3 ${
                isAllModesSelected
                  ? 'bg-teal-50/80 border-teal-600 ring-1 ring-teal-500/30'
                  : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/70'
              }`}
            >
              <div className="min-w-0">
                <div className="font-bold text-sm text-slate-900">Tổng hợp cả 4 dạng</div>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Chọn nhanh tất cả dạng bài, trộn ngẫu nhiên nghĩa, âm đọc và câu ví dụ.
                </p>
              </div>
              <span
                className={`shrink-0 mt-0.5 ${
                  isAllModesSelected ? 'text-teal-700' : 'text-slate-300'
                }`}
              >
                {isAllModesSelected ? (
                  <CheckSquare className="w-4 h-4" />
                ) : (
                  <Square className="w-4 h-4" />
                )}
              </span>
            </button>
          </div>
        </div>

        {/* Scope & Count row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          <div className="space-y-2">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
              2. Phạm vi câu hỏi
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setScope('displayed')}
                className={`px-3 py-2 rounded-xl text-xs font-semibold border cursor-pointer tabular-nums ${
                  scope === 'displayed'
                    ? 'bg-teal-700 text-white border-teal-800'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                Đang hiển thị ({displayedPool.length})
              </button>
              <button
                type="button"
                onClick={() => setScope('level')}
                className={`px-3 py-2 rounded-xl text-xs font-semibold border cursor-pointer tabular-nums ${
                  scope === 'level'
                    ? 'bg-teal-700 text-white border-teal-800'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                Toàn bộ {levelLabel} ({levelPool.length})
              </button>
              {selectedPool.length > 0 && (
                <button
                  type="button"
                  onClick={() => setScope('selected')}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold border cursor-pointer tabular-nums ${
                    scope === 'selected'
                      ? 'bg-teal-700 text-white border-teal-800'
                      : 'bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100'
                  }`}
                >
                  Các chữ đã chọn ({selectedPool.length})
                </button>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
              3. Số câu hỏi
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                { val: 10, label: '10 câu' },
                { val: 20, label: '20 câu' },
                { val: 30, label: '30 câu' },
                { val: -1, label: `Tất cả (${Math.min(activeSourcePool.length, 200)})` },
              ].map((opt) => (
                <button
                  key={opt.val}
                  type="button"
                  onClick={() => setQuestionCount(opt.val)}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold border cursor-pointer tabular-nums ${
                    questionCount === opt.val
                      ? 'bg-teal-700 text-white border-teal-800'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Start Button */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-3">
          <div className="text-xs text-slate-500 tabular-nums">
            Kho từ vựng khả dụng: <strong className="text-slate-800">{activeSourcePool.length} chữ</strong>
          </div>
          <button
            type="button"
            disabled={activeSourcePool.length === 0}
            onClick={() => startQuiz()}
            className="px-6 py-2.5 min-h-[42px] bg-teal-700 hover:bg-teal-800 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold text-xs sm:text-[13px] rounded-xl shadow-xs cursor-pointer flex items-center gap-2 transition-all active:scale-95"
          >
            <QuizTileIcon className="w-[18px] h-[18px]" />
            <span>Bắt đầu Quiz ngay</span>
          </button>
        </div>
      </div>
    );
  }

  // 2. SUMMARY VIEW
  if (sessionState === 'summary') {
    const accuracy = questions.length > 0 ? Math.round((score / questions.length) * 100) : 0;
    const wrongDetails = wrongEntries.map(catalogEntryToKanjiDetail);

    return (
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 sm:p-8 max-w-3xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700">
            <Award className="w-7 h-7" />
          </div>
          <h3 className="text-xl font-bold text-slate-900">Hoàn thành bài kiểm tra!</h3>
          <p className="text-sm text-slate-600 tabular-nums">
            Kết quả: <strong className="text-teal-700">{score}/{questions.length}</strong> câu đúng ({accuracy}%) · Chuỗi đúng dài nhất: <strong>{bestStreak}</strong>
          </p>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
            <div className="text-[11px] font-semibold text-slate-500">Độ chính xác</div>
            <div className="text-2xl font-black text-teal-700 tabular-nums mt-0.5">{accuracy}%</div>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
            <div className="text-[11px] font-semibold text-slate-500">Trả lời đúng</div>
            <div className="text-2xl font-black text-emerald-700 tabular-nums mt-0.5">{score}</div>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
            <div className="text-[11px] font-semibold text-slate-500">Cần ôn lại</div>
            <div className="text-2xl font-black text-rose-600 tabular-nums mt-0.5">{wrongEntries.length}</div>
          </div>
        </div>

        {/* Wrong characters list */}
        {wrongEntries.length > 0 ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="text-sm font-bold text-slate-900">
                Các chữ Kanji cần ôn lại ({wrongEntries.length})
              </h4>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => startQuiz(wrongEntries)}
                  className="px-3 py-1.5 text-xs font-bold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-xl cursor-pointer flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Ôn lại chữ làm sai</span>
                </button>
                <button
                  type="button"
                  onClick={() => onExportWrongKanji(wrongDetails)}
                  className="px-3 py-1.5 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-xl cursor-pointer flex items-center gap-1.5"
                >
                  <FolderPlus className="w-3.5 h-3.5" />
                  <span>Lưu chữ sai vào Bộ thẻ</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {wrongEntries.map((entry) => (
                <div
                  key={entry.c}
                  className="p-3 rounded-xl border border-slate-200 bg-slate-50/70 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      type="button"
                      onClick={() => onInspectChar(entry.c)}
                      className="w-11 h-11 rounded-xl bg-white border border-slate-200 hover:border-teal-500 font-kanji text-2xl font-bold text-slate-900 flex items-center justify-center shrink-0 cursor-pointer"
                      title="Xem nét viết chữ này"
                    >
                      {entry.c}
                    </button>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 truncate">
                        {entry.hv} · <span className="text-slate-600 font-normal">{entry.vi.join(', ')}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono truncate mt-0.5">
                        {formatReadingsPair(entry)}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onInspectChar(entry.c)}
                    className="p-2 text-slate-400 hover:text-teal-700 hover:bg-white rounded-lg cursor-pointer shrink-0"
                    title="Luyện nét viết"
                  >
                    <PenTool className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-center text-sm font-semibold text-emerald-800">
            Xuất sắc! Bạn không làm sai chữ nào trong phiên ôn tập này.
          </div>
        )}

        <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setSessionState('setup')}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
          >
            Đổi chế độ Quiz
          </button>
          <button
            type="button"
            onClick={() => startQuiz()}
            className="px-5 py-2 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-xl cursor-pointer flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Làm đề mới ngay</span>
          </button>
        </div>
      </div>
    );
  }

  // 4. ACTIVE QUIZ QUESTION VIEW
  if (!currentQuestion) return null;

  const progressPct = Math.round(((currentIdx + (isAnswered ? 1 : 0)) / questions.length) * 100);
  const isCloze = currentQuestion.mode === 'sentence-cloze';
  const isKanjiOptions =
    currentQuestion.mode === 'meaning-to-kanji' || isCloze;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-4 sm:p-7 max-w-3xl mx-auto space-y-5">
      {/* Progress & Top Controls */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 font-semibold text-slate-600 tabular-nums">
            <span>
              Câu <strong className="text-slate-900">{currentIdx + 1}</strong> / {questions.length}
            </span>
            <span>·</span>
            <span className="text-teal-700 font-bold">Đúng {score}</span>
            {streak >= 2 && (
              <span className="inline-flex items-center gap-1 text-amber-700 font-bold">
                <span>·</span>
                <Flame className="w-3.5 h-3.5" />
                <span>{streak}</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {isCloze && (
              <div className="inline-flex p-0.5 bg-slate-100 rounded-lg border border-slate-200 text-[11px] font-semibold">
                <button
                  type="button"
                  onClick={() => setClozeInputStyle('choice')}
                  className={`px-2 py-1 rounded-md flex items-center gap-1 cursor-pointer ${
                    clozeInputStyle === 'choice' ? 'bg-white text-teal-800 shadow-2xs' : 'text-slate-600'
                  }`}
                >
                  <MousePointerClick className="w-3 h-3" />
                  <span>Chọn thẻ</span>
                </button>
                <button
                  type="button"
                  onClick={() => setClozeInputStyle('type')}
                  className={`px-2 py-1 rounded-md flex items-center gap-1 cursor-pointer ${
                    clozeInputStyle === 'type' ? 'bg-white text-teal-800 shadow-2xs' : 'text-slate-600'
                  }`}
                >
                  <Keyboard className="w-3 h-3" />
                  <span>Tự gõ</span>
                </button>
              </div>
            )}
            <button
              type="button"
              onClick={() => setSessionState('setup')}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 px-2.5 py-1 rounded-lg hover:bg-slate-100 cursor-pointer"
            >
              Thoát Quiz
            </button>
          </div>
        </div>

        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-teal-700 transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Question Prompt Card */}
      <div className="py-5 px-4 sm:px-6 rounded-2xl bg-slate-50/80 border border-slate-200/80 text-center space-y-2.5">
        <div className="text-[11px] font-bold uppercase tracking-wider text-teal-800">
          {currentQuestion.mode === 'kanji-to-meaning' && 'Chọn nghĩa tiếng Việt đúng'}
          {currentQuestion.mode === 'meaning-to-kanji' && 'Chọn chữ Kanji tương ứng'}
          {currentQuestion.mode === 'reading' && 'Chọn âm đọc On / Kun đúng'}
          {currentQuestion.mode === 'sentence-cloze' && 'Điền chữ Kanji còn thiếu vào câu ví dụ'}
        </div>

        {currentQuestion.mode === 'kanji-to-meaning' || currentQuestion.mode === 'reading' ? (
          <div className="space-y-1.5">
            <div className="flex items-center justify-center gap-3">
              <span className="font-kanji font-black text-6xl sm:text-7xl text-slate-900 leading-none select-none">
                {currentQuestion.promptPrimary}
              </span>
              <button
                type="button"
                onClick={() => speakJapanese(currentQuestion.target.c)}
                className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-teal-700 hover:border-teal-300 cursor-pointer"
                title="Nghe phát âm tiếng Nhật"
              >
                <Volume2 className="w-4 h-4" />
              </button>
            </div>
            {isAnswered && (
              <p className="text-xs font-semibold text-slate-600">{currentQuestion.promptSub}</p>
            )}
          </div>
        ) : currentQuestion.mode === 'meaning-to-kanji' ? (
          <div className="space-y-1">
            <div className="text-xl sm:text-2xl font-bold text-slate-900 leading-snug">
              {currentQuestion.promptPrimary}
            </div>
            <p className="text-xs font-semibold text-slate-600">
              {currentQuestion.promptSub}
            </p>
          </div>
        ) : (
          // sentence-cloze prompt
          <div className="space-y-2">
            <div className="font-kanji text-xl sm:text-2xl font-bold text-slate-900 leading-relaxed break-words">
              {isAnswered && currentQuestion.sentenceObj
                ? currentQuestion.sentenceObj.jp
                    .split(currentQuestion.target.c)
                    .map((seg, i, arr) => (
                      <React.Fragment key={i}>
                        {seg}
                        {i < arr.length - 1 && (
                          <span className="px-1.5 py-0.5 mx-0.5 rounded-lg bg-teal-700 text-white font-black">
                            {currentQuestion.target.c}
                          </span>
                        )}
                      </React.Fragment>
                    ))
                : currentQuestion.promptPrimary}
            </div>
            <p className="text-xs sm:text-sm text-slate-600">
              Nghĩa câu: <strong className="text-slate-800 font-medium">{currentQuestion.promptSub}</strong>
            </p>
            {isAnswered && currentQuestion.sentenceObj && (
              <button
                type="button"
                onClick={() => speakJapanese(currentQuestion.sentenceObj!.jp)}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-teal-700 hover:bg-teal-50 cursor-pointer"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>Nghe cả câu ví dụ</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Answer Interaction Area */}
      {isCloze && clozeInputStyle === 'type' ? (
        <form onSubmit={handleSubmitTypedCloze} className="flex flex-col sm:flex-row gap-2.5">
          <input
            type="text"
            value={typedKanjiAnswer}
            disabled={isAnswered}
            onChange={(e) => setTypedKanjiAnswer(e.target.value)}
            placeholder="Nhập chữ Kanji còn thiếu (ví dụ: 日)..."
            autoFocus
            className="flex-1 px-4 py-3 text-base font-kanji text-center bg-slate-50 focus:bg-white rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-700"
          />
          <button
            type="submit"
            disabled={isAnswered || !typedKanjiAnswer.trim()}
            className="px-5 py-3 text-xs sm:text-[13px] font-bold text-white bg-teal-700 hover:bg-teal-800 disabled:bg-slate-200 disabled:text-slate-400 rounded-xl cursor-pointer"
          >
            Kiểm tra
          </button>
        </form>
      ) : (
        <div
          className={`grid gap-3 ${
            isKanjiOptions ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-1 sm:grid-cols-2'
          }`}
        >
          {currentQuestion.options.map((opt, idx) => {
            const isSelected = selectedOptionId === opt.id;
            let cardClass =
              'bg-white border-slate-200 hover:border-teal-500 hover:bg-teal-50/40 text-slate-800';

            if (isAnswered) {
              if (opt.isCorrect) {
                cardClass =
                  'bg-emerald-50 border-emerald-500 text-emerald-950 ring-1 ring-emerald-400';
              } else if (isSelected && !opt.isCorrect) {
                cardClass = 'bg-rose-50 border-rose-500 text-rose-950 ring-1 ring-rose-400';
              } else {
                cardClass = 'bg-slate-50/70 border-slate-200/70 text-slate-400 opacity-75';
              }
            }

            return (
              <button
                key={opt.id}
                type="button"
                disabled={isAnswered}
                onClick={() => handleSelectOption(opt.id)}
                className={`relative p-3.5 sm:p-4 rounded-xl border-2 text-left transition-all cursor-pointer disabled:cursor-default flex ${
                  isKanjiOptions
                    ? 'flex-col items-center justify-center text-center min-h-[104px]'
                    : 'items-center justify-between gap-3 min-h-[60px]'
                } ${cardClass}`}
              >
                <span className="absolute top-2 left-2.5 text-[10px] font-mono font-bold text-slate-400">
                  {idx + 1}
                </span>

                {isKanjiOptions ? (
                  <>
                    <span className="font-kanji font-black text-4xl leading-none">
                      {opt.label}
                    </span>
                    {isAnswered && opt.subLabel && (
                      <span className="text-[11px] font-semibold text-slate-600 mt-1.5">
                        {opt.subLabel}
                      </span>
                    )}
                  </>
                ) : (
                  <span className="pl-5 font-semibold text-sm leading-snug">{opt.label}</span>
                )}

                {isAnswered && opt.isCorrect && (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 absolute top-2 right-2" />
                )}
                {isAnswered && isSelected && !opt.isCorrect && (
                  <XCircle className="w-4 h-4 text-rose-600 shrink-0 absolute top-2 right-2" />
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Dual-coded Answer Feedback + Next CTA */}
      {isAnswered && (
        <div
          className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in duration-150 ${
            answeredCorrect
              ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
              : 'bg-rose-50/80 border-rose-200 text-rose-950'
          }`}
        >
          <div className="space-y-0.5 min-w-0">
            <div className="flex items-center gap-1.5 text-sm font-bold">
              {answeredCorrect ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Chính xác!</span>
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>
                    Chưa đúng — Đáp án là{' '}
                    <span className="font-kanji text-base underline">{currentQuestion.target.c}</span>
                  </span>
                </>
              )}
            </div>
            <p className="text-xs opacity-90">
              <strong>{currentQuestion.target.c}</strong> ({currentQuestion.target.hv}) ·{' '}
              {formatReadingsPair(currentQuestion.target)} · Nghĩa:{' '}
              {currentQuestion.target.vi.join(', ')}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onInspectChar(currentQuestion.target.c)}
              className="px-3 py-2 text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl cursor-pointer flex items-center gap-1"
            >
              <PenTool className="w-3.5 h-3.5 text-teal-700" />
              <span>Xem nét</span>
            </button>
            <button
              type="button"
              onClick={handleNextQuestion}
              className="px-4 py-2 text-xs font-bold bg-teal-700 hover:bg-teal-800 text-white rounded-xl cursor-pointer flex items-center gap-1.5"
            >
              <span>{currentIdx + 1 >= questions.length ? 'Xem tổng kết' : 'Câu tiếp'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
