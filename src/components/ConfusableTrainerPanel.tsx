import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Zap,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Columns3,
  Clock,
  Play,
} from 'lucide-react';
import { getKanjiInfo } from '../data/kanjiDictionary';
import { recordKanjiMistake, recordKanjiSuccess } from '../services/mistakeBankService';

export interface ConfusableGroupSet {
  id: string;
  category: 'visual' | 'phonetic';
  name: string;
  label: string;
  chars: string[];
}

export const CONFUSABLE_TRAINING_SETS: ConfusableGroupSet[] = [
  {
    id: 'vis-tera',
    category: 'visual',
    name: '待・持・特・侍・時',
    label: 'Dễ nhầm bộ Tự 寺',
    chars: ['待', '持', '特', '侍', '時'],
  },
  {
    id: 'vis-miru',
    category: 'visual',
    name: '見・観・視・覧・現',
    label: 'Nhóm nhìn / quan sát',
    chars: ['見', '観', '視', '覧', '現'],
  },
  {
    id: 'vis-nichi',
    category: 'visual',
    name: '日・白・百・目・自',
    label: 'Nét hộp cơ bản N5',
    chars: ['日', '白', '百', '目', '自'],
  },
  {
    id: 'vis-short-long',
    category: 'visual',
    name: '土・士・未・末・夫・失',
    label: 'Cặp nét dài ngắn',
    chars: ['土', '士', '未', '末', '夫', '失'],
  },
  {
    id: 'vis-dense',
    category: 'visual',
    name: '微・徴・徹・激',
    label: 'Chữ nhiều nét N2–N1',
    chars: ['微', '徴', '徹', '激'],
  },
  {
    id: 'vis-enter',
    category: 'visual',
    name: '人・入・八・千・干・牛・午',
    label: 'Nhóm nét xiên & chữ thập',
    chars: ['人', '入', '千', '干', '牛', '午'],
  },
  {
    id: 'pho-sei',
    category: 'phonetic',
    name: '青 → 清・晴・精・静・請',
    label: 'Âm phù Thanh 青',
    chars: ['青', '清', '晴', '精', '静', '請'],
  },
  {
    id: 'pho-hou',
    category: 'phonetic',
    name: '包 → 抱・泡・砲・飽',
    label: 'Âm phù Bao 包',
    chars: ['包', '抱', '泡', '砲', '飽'],
  },
  {
    id: 'pho-han',
    category: 'phonetic',
    name: '反 → 坂・板・版・飯',
    label: 'Âm phù Phản 反',
    chars: ['反', '坂', '板', '版', '飯'],
  },
  {
    id: 'pho-hi',
    category: 'phonetic',
    name: '皮 → 彼・被・破・波',
    label: 'Âm phù Bì 皮',
    chars: ['皮', '彼', '被', '破', '波'],
  },
  {
    id: 'pho-kou',
    category: 'phonetic',
    name: '工 → 空・功・紅・攻・項',
    label: 'Âm phù Công 工',
    chars: ['工', '空', '功', '紅', '攻', '項'],
  },
];

interface QuestionItem {
  targetChar: string;
  hanViet: string;
  meaning: string;
  choices: string[];
}

interface ConfusableTrainerPanelProps {
  currentCompareChars: string[];
  onSendToCompare: (chars: string[]) => void;
}

const QUESTION_TOTAL = 10;

function shuffle<T>(list: T[]): T[] {
  const arr = [...list];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export const ConfusableTrainerPanel: React.FC<ConfusableTrainerPanelProps> = ({
  currentCompareChars,
  onSendToCompare,
}) => {
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'visual' | 'phonetic'>('all');
  const [selectedSetId, setSelectedSetId] = useState<string>('vis-tera');
  const [phase, setPhase] = useState<'setup' | 'playing' | 'summary'>('setup');
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [qIndex, setQIndex] = useState(0);
  const [pickedChar, setPickedChar] = useState<string | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [streak, setStreak] = useState(0);
  const [wrongChars, setWrongChars] = useState<string[]>([]);
  const [reactionTimesMs, setReactionTimesMs] = useState<number[]>([]);
  const questionStartRef = useRef<number>(Date.now());

  const customSetAvailable = currentCompareChars.length >= 2;

  const filteredSets = useMemo(() => {
    if (categoryFilter === 'all') return CONFUSABLE_TRAINING_SETS;
    return CONFUSABLE_TRAINING_SETS.filter((s) => s.category === categoryFilter);
  }, [categoryFilter]);

  const startBlitz = useCallback(
    (setId: string) => {
      let pool: string[] = [];
      let fallbackDistractors: string[] = [];

      if (setId === '__CUSTOM__' && currentCompareChars.length >= 2) {
        pool = currentCompareChars;
        fallbackDistractors = ['待', '持', '特', '時', '未', '末'];
      } else if (setId === '__MIX_ALL__') {
        const allChars = Array.from(new Set(CONFUSABLE_TRAINING_SETS.flatMap((s) => s.chars)));
        pool = allChars;
        fallbackDistractors = allChars;
      } else {
        const found = CONFUSABLE_TRAINING_SETS.find((s) => s.id === setId) || CONFUSABLE_TRAINING_SETS[0];
        pool = found.chars;
        fallbackDistractors = pool;
      }

      const built: QuestionItem[] = [];
      for (let i = 0; i < QUESTION_TOTAL; i++) {
        // Pick target rotating evenly across the pool
        const shuffledPool = shuffle(pool);
        const targetChar = shuffledPool[i % shuffledPool.length];
        const info = getKanjiInfo(targetChar);
        const hanViet = info?.hanViet || targetChar;
        const meaning = info?.meanings?.slice(0, 2).join(', ') || hanViet;

        // If mixing all, pull distractors from the SAME confusable group for true challenge
        let candidateDistractorPool = pool;
        if (setId === '__MIX_ALL__') {
          const matchingGroup = CONFUSABLE_TRAINING_SETS.find((g) => g.chars.includes(targetChar));
          if (matchingGroup) candidateDistractorPool = matchingGroup.chars;
        }

        const distractors = shuffle(
          Array.from(new Set([...candidateDistractorPool, ...fallbackDistractors])).filter(
            (c) => c !== targetChar
          )
        ).slice(0, 3);

        built.push({
          targetChar,
          hanViet,
          meaning,
          choices: shuffle([targetChar, ...distractors]),
        });
      }

      setSelectedSetId(setId);
      setQuestions(built);
      setQIndex(0);
      setPickedChar(null);
      setCorrectCount(0);
      setStreak(0);
      setWrongChars([]);
      setReactionTimesMs([]);
      setPhase('playing');
      questionStartRef.current = Date.now();
    },
    [currentCompareChars]
  );

  const currentQuestion = questions[qIndex] || null;

  const handlePickChoice = useCallback(
    (ch: string) => {
      if (!currentQuestion || pickedChar !== null) return;
      const elapsed = Math.max(150, Date.now() - questionStartRef.current);
      setPickedChar(ch);
      setReactionTimesMs((prev) => [...prev, elapsed]);

      const isCorrect = ch === currentQuestion.targetChar;
      if (isCorrect) {
        setCorrectCount((c) => c + 1);
        setStreak((s) => s + 1);
        recordKanjiSuccess(currentQuestion.targetChar);
      } else {
        setStreak(0);
        setWrongChars((prev) =>
          prev.includes(currentQuestion.targetChar)
            ? prev
            : [...prev, currentQuestion.targetChar]
        );
        recordKanjiMistake(currentQuestion.targetChar, 'confusable');
      }

      window.setTimeout(() => {
        if (qIndex + 1 >= questions.length) {
          setPhase('summary');
        } else {
          setQIndex((idx) => idx + 1);
          setPickedChar(null);
          questionStartRef.current = Date.now();
        }
      }, isCorrect ? 380 : 900);
    },
    [currentQuestion, pickedChar, qIndex, questions.length]
  );

  // Keyboard 1-4 support during active round
  useEffect(() => {
    if (phase !== 'playing' || !currentQuestion || pickedChar !== null) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (['1', '2', '3', '4'].includes(e.key)) {
        const idx = Number(e.key) - 1;
        const ch = currentQuestion.choices[idx];
        if (ch) {
          e.preventDefault();
          handlePickChoice(ch);
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [phase, currentQuestion, pickedChar, handlePickChoice]);

  if (phase === 'playing' && currentQuestion) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-7 space-y-6 max-w-2xl mx-auto">
        {/* Progress & Live Stats */}
        <div className="flex items-center justify-between gap-3 text-xs">
          <span className="font-bold text-slate-600 tabular-nums">
            Câu {qIndex + 1} / {questions.length}
          </span>
          <div className="flex items-center gap-3 tabular-nums">
            <span className="inline-flex items-center gap-1 font-bold text-amber-600">
              <Zap className="w-3.5 h-3.5 fill-current" />
              {streak} liên tiếp
            </span>
            <button
              type="button"
              onClick={() => setPhase('setup')}
              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold cursor-pointer"
            >
              Thoát
            </button>
          </div>
        </div>

        {/* Prompt */}
        <div className="text-center space-y-2 py-2">
          <div className="text-xl sm:text-2xl font-black text-teal-800 tracking-tight">
            {currentQuestion.hanViet}
          </div>
          <div className="text-sm sm:text-base font-semibold text-slate-700">
            {currentQuestion.meaning}
          </div>
        </div>

        {/* 4 Confusable Kanji Choices */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {currentQuestion.choices.map((ch, idx) => {
            const isPicked = pickedChar === ch;
            const isRight = ch === currentQuestion.targetChar;
            let tileClass =
              'bg-slate-50 hover:bg-teal-50/70 border-slate-200 hover:border-teal-500 text-slate-900';
            if (pickedChar !== null) {
              if (isRight) {
                tileClass = 'bg-emerald-50 border-emerald-500 text-emerald-900 ring-2 ring-emerald-500/20';
              } else if (isPicked) {
                tileClass = 'bg-rose-50 border-rose-500 text-rose-900';
              } else {
                tileClass = 'bg-slate-50 border-slate-200 text-slate-400 opacity-60';
              }
            }

            return (
              <button
                key={ch}
                type="button"
                disabled={pickedChar !== null}
                onClick={() => handlePickChoice(ch)}
                className={`relative h-28 sm:h-32 rounded-2xl border-2 flex flex-col items-center justify-center transition-all cursor-pointer active:scale-95 ${tileClass}`}
              >
                <span className="absolute top-2 left-2.5 text-[10px] font-bold text-slate-400 tabular-nums">
                  {idx + 1}
                </span>
                <span className="font-kanji font-bold text-5xl leading-none">{ch}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  if (phase === 'summary') {
    const avgSec =
      reactionTimesMs.length > 0
        ? (
            reactionTimesMs.reduce((a, b) => a + b, 0) /
            reactionTimesMs.length /
            1000
          ).toFixed(2)
        : '0.00';
    const acc = Math.round((correctCount / Math.max(1, questions.length)) * 100);

    return (
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-7 space-y-5 max-w-2xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            {acc >= 80 ? (
              <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
            ) : (
              <XCircle className="w-6 h-6 text-amber-600 shrink-0" />
            )}
            <div>
              <h3 className="text-base font-extrabold text-slate-900 tabular-nums">
                Đúng {correctCount}/{questions.length} câu ({acc}%)
              </h3>
              <p className="text-xs text-slate-500 inline-flex items-center gap-1 tabular-nums">
                <Clock className="w-3 h-3" />
                Tốc độ trung bình: {avgSec} giây/câu
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPhase('setup')}
              className="px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
            >
              Đổi nhóm
            </button>
            <button
              type="button"
              onClick={() => startBlitz(selectedSetId)}
              className="px-3.5 py-2 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-xl flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Chơi lại</span>
            </button>
          </div>
        </div>

        {wrongChars.length > 0 ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-700">
                Chữ vừa nhầm ({wrongChars.length}) — đã tự lưu vào Chữ hay sai
              </span>
              <button
                type="button"
                onClick={() => onSendToCompare(wrongChars)}
                className="px-3 py-1.5 text-xs font-bold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-xl flex items-center gap-1.5 cursor-pointer"
              >
                <Columns3 className="w-3.5 h-3.5" />
                <span>So sánh nhóm này</span>
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {wrongChars.map((ch) => {
                const info = getKanjiInfo(ch);
                return (
                  <div
                    key={ch}
                    className="px-3 py-2 rounded-xl border border-rose-200 bg-rose-50/50 flex items-center gap-2"
                  >
                    <span className="font-kanji font-bold text-2xl text-slate-900">{ch}</span>
                    <div className="text-xs">
                      <div className="font-bold text-teal-800">{info?.hanViet || ''}</div>
                      <div className="text-[11px] text-slate-600">
                        {info?.meanings?.[0] || ''}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <p className="text-xs text-emerald-700 font-semibold">
            Chuẩn xác tuyệt đối! Bạn phân biệt rất tốt nhóm chữ này.
          </p>
        )}
      </div>
    );
  }

  // Setup View
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl">
          {(
            [
              { id: 'all', label: 'Tất cả' },
              { id: 'visual', label: 'Hình dáng' },
              { id: 'phonetic', label: 'Âm phù' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setCategoryFilter(tab.id)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                categoryFilter === tab.id
                  ? 'bg-white text-teal-800 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {customSetAvailable && (
            <button
              type="button"
              onClick={() => startBlitz('__CUSTOM__')}
              className="px-3.5 py-2 text-xs font-bold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-xl flex items-center gap-1.5 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Luyện nhóm đang so sánh ({currentCompareChars.length})</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => startBlitz('__MIX_ALL__')}
            className="px-3.5 py-2 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-xl flex items-center gap-1.5 cursor-pointer"
          >
            <Zap className="w-3.5 h-3.5 fill-current" />
            <span>Trộn tất cả (10 câu)</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredSets.map((set) => (
          <button
            key={set.id}
            type="button"
            onClick={() => startBlitz(set.id)}
            className="p-4 rounded-2xl border border-slate-200/90 hover:border-teal-600 bg-white hover:bg-teal-50/35 text-left transition-all cursor-pointer flex flex-col justify-between gap-2.5 group"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold text-teal-700">
                {set.category === 'phonetic' ? 'Âm phù' : 'Dễ nhầm'}
              </span>
              <span className="text-[11px] font-semibold text-slate-400 group-hover:text-teal-700">
                Bắt đầu →
              </span>
            </div>
            <div className="font-kanji font-bold text-lg text-slate-900 tracking-wide">
              {set.name}
            </div>
            <div className="text-xs text-slate-500">{set.label}</div>
          </button>
        ))}
      </div>
    </div>
  );
};
