import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  X,
  Layers3,
  Link2,
  Volume2,
  CheckCircle2,
  XCircle,
  ArrowRight,
  RotateCcw,
  FolderPlus,
  Sparkles,
  Loader2,
  Award,
} from 'lucide-react';
import { KanjiDetail } from '../types/kanji';
import { RADICALS_LIST, getKanjiDecomposition } from '../data/radicalsData';
import { fetchAndDecomposeKanji } from '../utils/kanjiSubElementParser';
import { getKanjiInfo, SINO_VIETNAMESE_MAP } from '../data/kanjiDictionary';
import { getFullKanjiDetail } from '../utils/kanjiApi';
import { speakJapanese } from '../utils/speech';

export interface DrillCompoundSeed {
  word: string;
  reading: string;
  hanViet: string;
  meaning: string;
  kanji: string;
}

interface InteractiveDrillsModalProps {
  isOpen: boolean;
  title: string;
  seedChars: string[];
  compoundSeeds?: DrillCompoundSeed[];
  initialMode?: 'radicals' | 'match';
  onSaveWrongKanji?: (details: KanjiDetail[]) => void;
  onInspectChar?: (char: string) => void;
  onClose: () => void;
}

interface RadicalPartTile {
  id: string;
  glyph: string;
  hanViet: string;
  meaning: string;
  strokeCount: number;
}

interface RadicalQuestion {
  kanji: string;
  hanViet: string;
  meaning: string;
  mnemonicStory: string;
  requiredGlyphs: string[];
  trayTiles: RadicalPartTile[];
}

interface MatchPairItem {
  id: string;
  leftWord: string;
  rightMeaning: string;
  readingHint: string;
  kanjiChar: string;
}

function shuffleArray<T>(list: T[]): T[] {
  const arr = [...list];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function buildRadicalTray(
  kanji: string,
  requiredParts: Array<{ glyph: string; hanViet: string; meaning: string; strokeCount: number }>
): RadicalPartTile[] {
  const requiredTiles: RadicalPartTile[] = requiredParts.map((p, idx) => ({
    id: `req-${idx}-${p.glyph}`,
    glyph: p.glyph,
    hanViet: p.hanViet || SINO_VIETNAMESE_MAP[p.glyph] || '',
    meaning: p.meaning || '',
    strokeCount: p.strokeCount || 1,
  }));

  const requiredGlyphSet = new Set(requiredParts.map((p) => p.glyph));
  const avgStrokes =
    requiredParts.reduce((s, p) => s + (p.strokeCount || 2), 0) /
    Math.max(1, requiredParts.length);

  const candidates = RADICALS_LIST.filter(
    (r) => !requiredGlyphSet.has(r.character) && r.character !== kanji
  ).sort(
    (a, b) =>
      Math.abs(a.strokeCount - avgStrokes) - Math.abs(b.strokeCount - avgStrokes)
  );

  const distractorPool = shuffleArray(candidates.slice(0, 28)).slice(
    0,
    Math.max(4, 8 - requiredTiles.length)
  );

  const distractorTiles: RadicalPartTile[] = distractorPool.map((r, idx) => ({
    id: `dist-${idx}-${r.character}`,
    glyph: r.character,
    hanViet: r.hanViet,
    meaning: r.meaning,
    strokeCount: r.strokeCount,
  }));

  return shuffleArray([...requiredTiles, ...distractorTiles]);
}

const EMPTY_COMPOUND_SEEDS: DrillCompoundSeed[] = [];

export const InteractiveDrillsModal: React.FC<InteractiveDrillsModalProps> = ({
  isOpen,
  title,
  seedChars,
  compoundSeeds = EMPTY_COMPOUND_SEEDS,
  initialMode = 'radicals',
  onSaveWrongKanji,
  onInspectChar,
  onClose,
}) => {
  const [drillMode, setDrillMode] = useState<'radicals' | 'match'>(initialMode);
  const [isPreparing, setIsPreparing] = useState(false);

  // Radical assembly state
  const [radicalQuestions, setRadicalQuestions] = useState<RadicalQuestion[]>([]);
  const [radIdx, setRadIdx] = useState(0);
  const [pickedTiles, setPickedTiles] = useState<RadicalPartTile[]>([]);
  const [radStatus, setRadStatus] = useState<'idle' | 'correct' | 'wrong' | 'revealed'>('idle');
  const [radScore, setRadScore] = useState(0);
  const [radFinished, setRadFinished] = useState(false);

  // Pair matching state
  const [matchRounds, setMatchRounds] = useState<MatchPairItem[][]>([]);
  const [roundIdx, setRoundIdx] = useState(0);
  const [rightOptions, setRightOptions] = useState<MatchPairItem[]>([]);
  const [selectedLeftId, setSelectedLeftId] = useState<string | null>(null);
  const [matchedIds, setMatchedIds] = useState<string[]>([]);
  const [mismatchPair, setMismatchPair] = useState<{ left: string; right: string } | null>(null);
  const [matchMistakes, setMatchMistakes] = useState(0);
  const [matchFinished, setMatchFinished] = useState(false);

  // Shared missed characters log
  const [wrongKanjiChars, setWrongKanjiChars] = useState<string[]>([]);

  const compoundSeedsRef = React.useRef<DrillCompoundSeed[]>(compoundSeeds);
  compoundSeedsRef.current = compoundSeeds;

  const prepRequestIdRef = React.useRef(0);
  const lastSessionKeyRef = React.useRef<string>('');

  useEffect(() => {
    if (isOpen) {
      setDrillMode(initialMode);
    } else {
      lastSessionKeyRef.current = '';
      prepRequestIdRef.current += 1;
    }
  }, [isOpen, initialMode]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  const seedCharsKey = useMemo(
    () => Array.from(new Set(seedChars.filter((c) => /\p{Script=Han}/u.test(c)))).join(''),
    [seedChars]
  );

  const uniqueChars = useMemo(() => Array.from(seedCharsKey), [seedCharsKey]);

  const compoundSeedsKey = useMemo(
    () =>
      compoundSeeds
        .filter((c) => c.word && c.meaning)
        .map((c) => c.word)
        .slice(0, 60)
        .join('|'),
    [compoundSeeds]
  );

  // Prepare Radical Assembly Questions
  const prepareRadicalDrill = useCallback(async () => {
    const reqId = ++prepRequestIdRef.current;
    if (uniqueChars.length === 0) {
      setRadicalQuestions([]);
      setIsPreparing(false);
      return;
    }
    setIsPreparing(true);
    setRadIdx(0);
    setPickedTiles([]);
    setRadStatus('idle');
    setRadScore(0);
    setRadFinished(false);
    setWrongKanjiChars([]);

    try {
      const sampleChars = shuffleArray(uniqueChars).slice(0, 16);
      const decomps = await Promise.all(
        sampleChars.map(async (char) => {
          const info = getKanjiInfo(char);
          try {
            const dec = await fetchAndDecomposeKanji(char, info?.hanViet);
            return { char, dec, info };
          } catch {
            return { char, dec: getKanjiDecomposition(char, info?.hanViet), info };
          }
        })
      );

      const questions: RadicalQuestion[] = [];
      for (const { char, dec, info } of decomps) {
        const rawParts =
          dec.directComponents && dec.directComponents.length >= 2
            ? dec.directComponents
            : dec.components;

        const cleanParts = rawParts
          .filter((c) => c.radical && c.radical !== char)
          .slice(0, 4)
          .map((c) => ({
            glyph: c.variant || c.radical,
            hanViet: c.hanViet,
            meaning: c.meaning,
            strokeCount: c.strokeCount,
          }));

        if (cleanParts.length < 2) continue;

        const hv = dec.hanViet || info?.hanViet || SINO_VIETNAMESE_MAP[char] || '';
        const meaning =
          info?.meanings?.slice(0, 3).join(', ') ||
          (hv ? `Chữ Hán ${hv}` : 'Lắp ghép theo cấu tạo bộ thủ');

        questions.push({
          kanji: char,
          hanViet: hv,
          meaning,
          mnemonicStory: dec.mnemonicStory,
          requiredGlyphs: cleanParts.map((p) => p.glyph),
          trayTiles: buildRadicalTray(char, cleanParts),
        });

        if (questions.length >= 8) break;
      }

      if (reqId !== prepRequestIdRef.current) return;
      setRadicalQuestions(questions);
    } finally {
      if (reqId === prepRequestIdRef.current) {
        setIsPreparing(false);
      }
    }
  }, [uniqueChars]);

  // Prepare Pair Matching Rounds (uses real compounds if >=4, otherwise Kanji <-> Nghĩa & Hán-Việt)
  const prepareMatchDrill = useCallback(() => {
    setRoundIdx(0);
    setMatchedIds([]);
    setSelectedLeftId(null);
    setMismatchPair(null);
    setMatchMistakes(0);
    setMatchFinished(false);
    setWrongKanjiChars([]);

    let pool: MatchPairItem[] = [];
    const validCompounds = compoundSeedsRef.current.filter((c) => c.word && c.meaning);

    if (validCompounds.length >= 4) {
      pool = shuffleArray(validCompounds)
        .slice(0, 15)
        .map((c, idx) => ({
          id: `cmp-${idx}-${c.word}`,
          leftWord: c.word,
          rightMeaning: c.meaning,
          readingHint: [c.reading, c.hanViet].filter(Boolean).join(' · '),
          kanjiChar: c.kanji,
        }));
    } else {
      pool = shuffleArray(uniqueChars)
        .slice(0, 15)
        .map((char, idx) => {
          const info = getKanjiInfo(char);
          const hv = info?.hanViet || SINO_VIETNAMESE_MAP[char] || '';
          const mean = info?.meanings?.slice(0, 2).join(', ') || '';
          const reading = [...(info?.on || []).slice(0, 1), ...(info?.kun || []).slice(0, 1)]
            .filter(Boolean)
            .join('・');
          return {
            id: `kan-${idx}-${char}`,
            leftWord: char,
            rightMeaning: mean || hv || char,
            readingHint: [hv, reading].filter(Boolean).join(' · '),
            kanjiChar: char,
          };
        })
        .filter((p) => p.rightMeaning);
    }

    const chunks: MatchPairItem[][] = [];
    for (let i = 0; i < pool.length; i += 4) {
      const slice = pool.slice(i, i + 4);
      if (slice.length >= 2) chunks.push(slice);
    }

    setMatchRounds(chunks);
    if (chunks.length > 0) {
      setRightOptions(shuffleArray(chunks[0]));
    } else {
      setRightOptions([]);
    }
  }, [uniqueChars]);

  useEffect(() => {
    if (!isOpen) return;
    const sessionKey = `${drillMode}::${seedCharsKey}::${compoundSeedsKey}`;
    if (lastSessionKeyRef.current === sessionKey) return;
    lastSessionKeyRef.current = sessionKey;

    if (drillMode === 'radicals') {
      void prepareRadicalDrill();
    } else {
      prepareMatchDrill();
    }
  }, [
    isOpen,
    drillMode,
    seedCharsKey,
    compoundSeedsKey,
    prepareRadicalDrill,
    prepareMatchDrill,
  ]);

  if (!isOpen) return null;

  const currentRadQ = radicalQuestions[radIdx] || null;

  const handleToggleTile = (tile: RadicalPartTile) => {
    if (!currentRadQ || radStatus === 'correct' || radStatus === 'revealed') return;

    // Remove if already picked
    if (pickedTiles.some((t) => t.id === tile.id)) {
      setPickedTiles((prev) => prev.filter((t) => t.id !== tile.id));
      setRadStatus('idle');
      return;
    }

    if (pickedTiles.length >= currentRadQ.requiredGlyphs.length) return;

    const nextPicked = [...pickedTiles, tile];
    setPickedTiles(nextPicked);

    if (nextPicked.length === currentRadQ.requiredGlyphs.length) {
      const targetSorted = [...currentRadQ.requiredGlyphs].sort().join('|');
      const pickedSorted = nextPicked
        .map((t) => t.glyph)
        .sort()
        .join('|');

      if (targetSorted === pickedSorted) {
        setRadStatus('correct');
        setRadScore((s) => s + 1);
        speakJapanese(currentRadQ.kanji);
      } else {
        setRadStatus('wrong');
        setWrongKanjiChars((prev) =>
          prev.includes(currentRadQ.kanji) ? prev : [...prev, currentRadQ.kanji]
        );
      }
    }
  };

  const handleNextRadQuestion = () => {
    if (radIdx + 1 >= radicalQuestions.length) {
      setRadFinished(true);
    } else {
      setRadIdx((i) => i + 1);
      setPickedTiles([]);
      setRadStatus('idle');
    }
  };

  const currentRound = matchRounds[roundIdx] || [];

  const handleSelectRightMatch = (rightItem: MatchPairItem) => {
    if (!selectedLeftId || matchedIds.includes(rightItem.id)) return;

    if (selectedLeftId === rightItem.id) {
      const nextMatched = [...matchedIds, rightItem.id];
      setMatchedIds(nextMatched);
      setSelectedLeftId(null);
      setMismatchPair(null);
      speakJapanese(rightItem.leftWord);

      if (nextMatched.length >= currentRound.length) {
        window.setTimeout(() => {
          if (roundIdx + 1 >= matchRounds.length) {
            setMatchFinished(true);
          } else {
            const nextRoundIdx = roundIdx + 1;
            setRoundIdx(nextRoundIdx);
            setRightOptions(shuffleArray(matchRounds[nextRoundIdx]));
            setMatchedIds([]);
            setSelectedLeftId(null);
          }
        }, 550);
      }
    } else {
      const leftObj = currentRound.find((p) => p.id === selectedLeftId);
      setMatchMistakes((m) => m + 1);
      if (leftObj?.kanjiChar) {
        setWrongKanjiChars((prev) =>
          prev.includes(leftObj.kanjiChar) ? prev : [...prev, leftObj.kanjiChar]
        );
      }
      setMismatchPair({ left: selectedLeftId, right: rightItem.id });
      window.setTimeout(() => {
        setMismatchPair(null);
        setSelectedLeftId(null);
      }, 450);
    }
  };

  const handleExportWrong = async () => {
    if (!onSaveWrongKanji || wrongKanjiChars.length === 0) return;
    const details = await Promise.all(
      wrongKanjiChars.map(async (ch) => {
        const local = getKanjiInfo(ch);
        if (local) return local;
        return await getFullKanjiDetail(ch);
      })
    );
    onSaveWrongKanji(details.filter(Boolean));
  };

  const showSummary =
    (drillMode === 'radicals' && radFinished) ||
    (drillMode === 'match' && matchFinished);

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 max-h-[100dvh] bg-slate-900/55 backdrop-blur-[2px] flex items-center justify-center p-2.5 sm:p-4 overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-label="Luyện tập Tương tác Ghép Bộ Thủ & Nối Từ"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-4xl max-h-[94dvh] bg-slate-50 rounded-2xl sm:rounded-3xl border border-slate-200 shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Top Modal Header */}
        <div className="px-4 sm:px-6 py-3.5 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 flex items-center justify-center cursor-pointer shrink-0"
              aria-label="Đóng"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-extrabold text-slate-900 truncate">
                Luyện tương tác · {title}
              </h2>
              <p className="text-[11px] text-slate-500 truncate">
                Củng cố cấu tạo chữ Hán và phản xạ ghép nghĩa ngữ cảnh
              </p>
            </div>
          </div>

          <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200 gap-1 shrink-0">
            <button
              type="button"
              onClick={() => setDrillMode('radicals')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors ${
                drillMode === 'radicals'
                  ? 'bg-white text-teal-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers3 className="w-3.5 h-3.5 text-teal-700" />
              <span>Ghép Bộ Thủ</span>
            </button>
            <button
              type="button"
              onClick={() => setDrillMode('match')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors ${
                drillMode === 'match'
                  ? 'bg-white text-teal-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Link2 className="w-3.5 h-3.5 text-teal-700" />
              <span>Nối Từ Ghép</span>
            </button>
          </div>
        </div>

        {/* Scrollable Stage Body */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-3.5 sm:p-5">
          {showSummary ? (
            <div className="max-w-lg mx-auto bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 text-center space-y-4 my-auto">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center mx-auto">
                <Award className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base sm:text-lg font-extrabold text-slate-900">
                  Hoàn thành lượt luyện tập!
                </h3>
                <p className="text-xs text-slate-600 tabular-nums">
                  {drillMode === 'radicals'
                    ? `Bạn ghép đúng ${radScore}/${radicalQuestions.length} chữ Kanji ngay từ lần đầu.`
                    : `Bạn đã nối xong toàn bộ ${matchRounds.length} vòng (${matchMistakes} lần nhầm).`}
                </p>
              </div>

              {wrongKanjiChars.length > 0 && (
                <div className="p-3.5 rounded-xl bg-rose-50/70 border border-rose-200/80 text-left space-y-2">
                  <div className="text-xs font-bold text-rose-800">
                    Các chữ vừa nhầm ({wrongKanjiChars.length}):
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {wrongKanjiChars.map((ch) => (
                      <button
                        key={ch}
                        type="button"
                        onClick={() => onInspectChar?.(ch)}
                        className="px-2.5 py-1 bg-white hover:bg-teal-50 border border-rose-200 rounded-lg font-kanji text-base font-bold text-slate-900 cursor-pointer"
                        title={`Xem chi tiết chữ ${ch}`}
                      >
                        {ch}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() =>
                    drillMode === 'radicals'
                      ? void prepareRadicalDrill()
                      : prepareMatchDrill()
                  }
                  className="px-4 py-2 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-xl flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Chơi lượt mới</span>
                </button>

                {onSaveWrongKanji && wrongKanjiChars.length > 0 && (
                  <button
                    type="button"
                    onClick={() => void handleExportWrong()}
                    className="px-3.5 py-2 text-xs font-bold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-xl flex items-center gap-1.5 cursor-pointer"
                  >
                    <FolderPlus className="w-3.5 h-3.5" />
                    <span>Lưu chữ hay sai</span>
                  </button>
                )}
              </div>
            </div>
          ) : drillMode === 'radicals' ? (
            isPreparing ? (
              <div className="py-16 text-center space-y-2">
                <Loader2 className="w-7 h-7 animate-spin text-teal-700 mx-auto" />
                <p className="text-xs font-semibold text-slate-600">
                  Đang phân tách cấu tạo bộ thủ các chữ Kanji...
                </p>
              </div>
            ) : !currentRadQ ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center space-y-2">
                <p className="text-sm font-bold text-slate-700">
                  Chưa đủ chữ có từ 2 bộ thủ trở lên để ghép
                </p>
                <p className="text-xs text-slate-500">
                  Hãy chuyển sang chế độ <strong>Nối Từ Ghép</strong> hoặc thêm thêm chữ Kanji vào bài học.
                </p>
                <button
                  type="button"
                  onClick={() => setDrillMode('match')}
                  className="px-4 py-2 text-xs font-bold text-white bg-teal-700 rounded-xl cursor-pointer"
                >
                  Chuyển sang Nối Từ Ghép
                </button>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200/90 p-3.5 sm:p-5 space-y-4">
                {/* Progress & Status Header */}
                <div className="flex items-center justify-between text-xs text-slate-500 tabular-nums pb-2.5 border-b border-slate-100">
                  <span>
                    Câu{' '}
                    <strong className="text-slate-900">
                      {radIdx + 1}/{radicalQuestions.length}
                    </strong>{' '}
                    · Đúng ngay: <strong className="text-teal-700">{radScore}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => setRadStatus('revealed')}
                    className="text-xs font-semibold text-slate-500 hover:text-teal-800 cursor-pointer"
                  >
                    Xem đáp án
                  </button>
                </div>

                {/* 2-Zone Responsive Layout */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-5 items-center">
                  {/* Left: Meaning Clue + Assembly Equation */}
                  <div className="md:col-span-5 space-y-3.5 text-center">
                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-teal-700">
                        Ghép bộ thủ tạo chữ
                      </span>
                      {currentRadQ.hanViet && (
                        <div className="text-xl sm:text-2xl font-black text-slate-900">
                          {currentRadQ.hanViet}
                        </div>
                      )}
                      <p className="text-xs sm:text-sm font-bold text-slate-700">
                        {currentRadQ.meaning}
                      </p>
                    </div>

                    {/* Assembly Slots */}
                    <div className="flex items-center justify-center flex-wrap gap-2">
                      {currentRadQ.requiredGlyphs.map((_, slotIdx) => {
                        const tile = pickedTiles[slotIdx];
                        return (
                          <React.Fragment key={slotIdx}>
                            {slotIdx > 0 && (
                              <span className="text-sm font-black text-slate-400">+</span>
                            )}
                            <button
                              type="button"
                              onClick={() => tile && handleToggleTile(tile)}
                              disabled={!tile || radStatus === 'correct' || radStatus === 'revealed'}
                              className={`w-14 h-14 rounded-2xl border-2 flex flex-col items-center justify-center transition-all ${
                                tile
                                  ? radStatus === 'wrong'
                                    ? 'bg-rose-50 border-rose-400 text-rose-800 cursor-pointer'
                                    : radStatus === 'correct'
                                    ? 'bg-emerald-50 border-emerald-500 text-emerald-900'
                                    : 'bg-teal-50 border-teal-500 text-teal-900 cursor-pointer'
                                  : 'bg-slate-50 border-dashed border-slate-300 text-slate-300'
                              }`}
                            >
                              <span className="font-kanji text-2xl font-bold leading-none">
                                {tile ? tile.glyph : '?'}
                              </span>
                            </button>
                          </React.Fragment>
                        );
                      })}

                      <span className="text-sm font-black text-slate-400">=</span>

                      <div
                        className={`w-16 h-16 rounded-2xl border-2 flex items-center justify-center transition-all ${
                          radStatus === 'correct' || radStatus === 'revealed'
                            ? 'bg-teal-700 border-teal-800 text-white shadow-sm'
                            : 'bg-slate-100 border-slate-200 text-slate-400'
                        }`}
                      >
                        <span className="font-kanji text-4xl font-black leading-none">
                          {radStatus === 'correct' || radStatus === 'revealed'
                            ? currentRadQ.kanji
                            : '？'}
                        </span>
                      </div>
                    </div>

                    {/* Feedback / Mnemonic */}
                    {radStatus === 'wrong' && (
                      <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center justify-between gap-2">
                        <span className="flex items-center gap-1.5 font-semibold">
                          <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                          <span>Chưa đúng bộ cấu thành, chạm vào ô để đổi lại.</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setPickedTiles([]);
                            setRadStatus('idle');
                          }}
                          className="font-bold underline cursor-pointer shrink-0"
                        >
                          Xóa chọn
                        </button>
                      </div>
                    )}

                    {(radStatus === 'correct' || radStatus === 'revealed') && (
                      <div className="p-3.5 rounded-xl bg-emerald-50/80 border border-emerald-200 text-left space-y-2 animate-in fade-in duration-150">
                        <div className="flex items-center justify-between gap-2">
                          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <span>
                              {radStatus === 'correct'
                                ? `Chính xác! Chữ ${currentRadQ.kanji}`
                                : `Đáp án: ${currentRadQ.kanji} (${currentRadQ.requiredGlyphs.join(' + ')})`}
                            </span>
                          </span>
                          <button
                            type="button"
                            onClick={() => speakJapanese(currentRadQ.kanji)}
                            className="p-1.5 rounded-lg bg-white border border-emerald-200 text-teal-700 hover:bg-teal-50 cursor-pointer"
                            title="Nghe phát âm"
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <p className="text-xs text-slate-700 leading-relaxed flex items-start gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-teal-700 shrink-0 mt-0.5" />
                          <span>{currentRadQ.mnemonicStory}</span>
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Right: Shuffled Radical Tray */}
                  <div className="md:col-span-7 space-y-2.5">
                    <div className="text-xs font-semibold text-slate-600">
                      Chọn {currentRadQ.requiredGlyphs.length} bộ thủ ghép thành chữ trên:
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {currentRadQ.trayTiles.map((tile) => {
                        const isPicked = pickedTiles.some((t) => t.id === tile.id);
                        return (
                          <button
                            key={tile.id}
                            type="button"
                            disabled={radStatus === 'correct' || radStatus === 'revealed'}
                            onClick={() => handleToggleTile(tile)}
                            className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer disabled:cursor-default flex flex-col items-center justify-center gap-1 min-h-[70px] sm:min-h-[76px] ${
                              isPicked
                                ? 'bg-teal-700 text-white border-teal-800 shadow-xs'
                                : 'bg-slate-50 hover:bg-teal-50/70 text-slate-900 border-slate-200 hover:border-teal-400'
                            }`}
                          >
                            <span className="font-kanji text-2xl font-bold leading-none">
                              {tile.glyph}
                            </span>
                            <span
                              className={`text-[11px] font-bold truncate max-w-full ${
                                isPicked ? 'text-teal-100' : 'text-teal-800'
                              }`}
                            >
                              {tile.hanViet || `${tile.strokeCount} nét`}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {(radStatus === 'correct' || radStatus === 'revealed') && (
                      <div className="pt-2 flex justify-end">
                        <button
                          type="button"
                          onClick={handleNextRadQuestion}
                          className="px-4 py-2.5 text-xs sm:text-[13px] font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-xl flex items-center gap-1.5 cursor-pointer"
                        >
                          <span>
                            {radIdx + 1 >= radicalQuestions.length
                              ? 'Xem kết quả'
                              : 'Câu tiếp theo'}
                          </span>
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          ) : currentRound.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-xs text-slate-500">
              Cần tối thiểu 2 chữ Kanji hoặc từ ghép có nghĩa để tạo bảng nối cặp.
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-6 space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-500 tabular-nums pb-3 border-b border-slate-100">
                <span>
                  Vòng{' '}
                  <strong className="text-slate-900">
                    {roundIdx + 1}/{matchRounds.length}
                  </strong>{' '}
                  · Chọn 1 thẻ bên trái rồi chọn nghĩa khớp bên phải
                </span>
                <span>
                  Đã nối: <strong className="text-teal-700">{matchedIds.length}/{currentRound.length}</strong>
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-5">
                {/* Left Column: Japanese Words / Kanji */}
                <div className="space-y-2.5">
                  {currentRound.map((item) => {
                    const isMatched = matchedIds.includes(item.id);
                    const isSelected = selectedLeftId === item.id;
                    const isWrong = mismatchPair?.left === item.id;

                    return (
                      <button
                        key={item.id}
                        type="button"
                        disabled={isMatched}
                        onClick={() => {
                          setSelectedLeftId(item.id);
                          speakJapanese(item.leftWord);
                        }}
                        className={`w-full min-h-[60px] px-4 py-3 rounded-xl border text-left transition-all flex items-center justify-between gap-3 ${
                          isMatched
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-900 opacity-75'
                            : isWrong
                            ? 'bg-rose-50 border-rose-400 text-rose-900'
                            : isSelected
                            ? 'bg-teal-700 border-teal-800 text-white shadow-xs cursor-pointer'
                            : 'bg-slate-50 hover:bg-teal-50/70 border-slate-200 hover:border-teal-400 text-slate-900 cursor-pointer'
                        }`}
                      >
                        <span className="font-kanji text-2xl font-black leading-none">
                          {item.leftWord}
                        </span>
                        {isMatched ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        ) : (
                          <Volume2
                            className={`w-4 h-4 shrink-0 ${
                              isSelected ? 'text-teal-100' : 'text-slate-400'
                            }`}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Right Column: Meanings + Reading Hint */}
                <div className="space-y-2.5">
                  {rightOptions.map((item) => {
                    const isMatched = matchedIds.includes(item.id);
                    const isWrong = mismatchPair?.right === item.id;

                    return (
                      <button
                        key={item.id}
                        type="button"
                        disabled={isMatched}
                        onClick={() => handleSelectRightMatch(item)}
                        className={`w-full min-h-[60px] px-4 py-2.5 rounded-xl border text-left transition-all flex flex-col justify-center ${
                          isMatched
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-900 opacity-75'
                            : isWrong
                            ? 'bg-rose-50 border-rose-400 text-rose-900'
                            : selectedLeftId
                            ? 'bg-white hover:bg-teal-50 border-slate-200 hover:border-teal-500 text-slate-900 cursor-pointer'
                            : 'bg-white border-slate-200 text-slate-700 cursor-pointer'
                        }`}
                      >
                        <span className="text-xs sm:text-sm font-bold leading-snug">
                          {item.rightMeaning}
                        </span>
                        {item.readingHint && (
                          <span className="text-[11px] text-slate-500 font-mono truncate mt-0.5">
                            {item.readingHint}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
