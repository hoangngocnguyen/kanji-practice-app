import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Columns3,
  Volume2,
  RotateCcw,
  Plus,
  X,
  Sparkles,
  Layers3,
  BookOpen,
  Trash2,
  AlertCircle,
  Lightbulb,
  ExternalLink,
  ChevronRight,
  GitBranch,
} from 'lucide-react';
import { useKanji } from '../context/KanjiContext';
import { getKanjiInfo } from '../data/kanjiDictionary';
import { getFullKanjiDetail } from '../utils/kanjiApi';
import { getKanjiDecomposition } from '../data/radicalsData';
import { fetchAndDecomposeKanji } from '../utils/kanjiSubElementParser';
import { KanjiDecomposition, RadicalComponent } from '../types/radical';
import { KanjiRadicalTree } from './KanjiRadicalTree';
import { KanjiSvgView } from './KanjiSvgView';
import { KanjiGridOverlay } from './KanjiGridOverlay';
import { speakJapanese } from '../utils/speech';
import { getJlptBadgeClass } from '../utils/colorUtils';
import { extractUniqueKanji } from '../utils/kanji';
import { useJapaneseIme } from '../utils/useJapaneseIme';
import { ImeCandidatePopover } from './ImeCandidatePopover';

// Các bộ Kanji kinh điển dễ gây nhầm lẫn đề xuất sẵn
export const CONFUSION_PRESETS = [
  {
    name: '待・持・特・侍',
    label: 'Cùng chung bộ Tự 寺 (Chùa)',
    desc: 'Đãi (Đợi) / Trì (Cầm) / Đặc (Đặc biệt) / Thị (Samurai)',
    chars: ['待', '持', '特', '侍'],
  },
  {
    name: '見・観・視・覧',
    label: 'Nhóm từ "Xem, Nhìn, Quan sát"',
    desc: 'Kiến (Nhìn thấy) / Quan (Thưởng lãm) / Thị (Thị lực) / Lãm (Xem qua)',
    chars: ['見', '観', '視', '覧'],
  },
  {
    name: '日・白・百・目',
    label: 'Chữ nét tương đồng cơ bản',
    desc: 'Nhật (Mặt trời) / Bạch (Màu trắng) / Bách (Số 100) / Mục (Mắt)',
    chars: ['日', '白', '百', '目'],
  },
  {
    name: '土・士 / 未・末',
    label: 'Cặp nét dài ngắn dễ nhầm',
    desc: 'Thổ vs Sĩ / Vị (Chưa tới) vs Mạt (Phần ngọn)',
    chars: ['土', '士', '未', '末'],
  },
  {
    name: '微・徴・徹',
    label: 'Bộ chữ nhiều nét N2 - N1',
    desc: 'Vi (Vi tế, nhỏ nhoi) / Trưng (Đặc trưng) / Triệt (Triệt để)',
    chars: ['微', '徴', '徹'],
  },
  {
    name: '晴・清・精・請',
    label: 'Cùng mang bộ Thanh 青',
    desc: 'Tình (Trời nắng) / Thanh (Trong trẻo) / Tinh (Tinh tế) / Thỉnh (Thỉnh cầu)',
    chars: ['晴', '清', '精', '請'],
  },
];

export const KanjiCompareView: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const {
    enrichedDetails,
    setEnrichedDetails,
    includeGrid,
    setIncludeGrid,
    handleInspectKanji,
  } = useKanji();

  // Danh sách các ký tự Kanji đang so sánh (tối đa 6 chữ)
  const [compareChars, setCompareChars] = useState<string[]>(() => {
    const param = searchParams.get('kanji') || searchParams.get('q');
    if (param) {
      const extracted = extractUniqueKanji(param);
      if (extracted.length > 0) return extracted.map((k) => k.kanji).slice(0, 6);
    }
    return ['待', '持', '特']; // Mặc định bộ kinh điển
  });

  // State hoạt ảnh vẽ nét đồng loạt
  const [animSyncKey, setAnimSyncKey] = useState<number>(0);
  const [animMode, setAnimMode] = useState<'off' | 'once' | 'infinite'>('once');

  // Input thêm chữ mới vào so sánh
  const [inputChar, setInputChar] = useState<string>('');
  const [imeMode, setImeMode] = useState<boolean>(true);
  const ime = useJapaneseIme<HTMLInputElement>({
    value: inputChar,
    onChange: setInputChar,
    mode: imeMode ? 'kanji' : 'off',
  });

  // State bóc tách bộ thủ cho từng chữ
  const [decompositions, setDecompositions] = useState<Record<string, KanjiDecomposition>>({});
  const [selectedTreeModalChar, setSelectedTreeModalChar] = useState<string | null>(null);

  // Cập nhật URL khi danh sách thay đổi
  useEffect(() => {
    if (compareChars.length > 0) {
      setSearchParams({ kanji: compareChars.join('') }, { replace: true });
    }
  }, [compareChars, setSearchParams]);

  // Tự động nạp chi tiết từ điển (Nghĩa, On, Kun) và Bóc tách bộ thủ cho tất cả chữ trong bảng so sánh
  useEffect(() => {
    let isMounted = true;

    compareChars.forEach((char) => {
      const currentDetail = enrichedDetails[char];
      const needsDetailFetch =
        !currentDetail ||
        !currentDetail.meanings ||
        currentDetail.meanings.length === 0 ||
        currentDetail.meanings[0].includes('Tra Mazii') ||
        currentDetail.meanings[0].includes('Bấm "Xem nét');

      if (needsDetailFetch) {
        getFullKanjiDetail(char)
          .then((detail) => {
            if (isMounted && detail) {
              setEnrichedDetails((prev) => ({
                ...prev,
                [char]: detail,
              }));
            }
          })
          .catch((err) => {
            console.warn('Lỗi nạp chi tiết Kanji:', char, err);
          });
      }

      // Nạp cấu trúc phân rã / bóc tách bộ thủ
      const hv = enrichedDetails[char]?.hanViet || getKanjiInfo(char)?.hanViet;
      const localDec = getKanjiDecomposition(char, hv);
      if (localDec) {
        setDecompositions((prev) => ({
          ...prev,
          [char]: prev[char] || localDec,
        }));
      }

      fetchAndDecomposeKanji(char, hv)
        .then((fullDec) => {
          if (isMounted && fullDec) {
            setDecompositions((prev) => ({
              ...prev,
              [char]: fullDec,
            }));
          }
        })
        .catch(() => {});
    });

    return () => {
      isMounted = false;
    };
  }, [compareChars, enrichedDetails, setEnrichedDetails]);

  // Thêm chữ mới
  const handleAddKanji = (charToAdd: string) => {
    const cleanChars = extractUniqueKanji(charToAdd).map((k) => k.kanji);
    if (cleanChars.length === 0) return;

    setCompareChars((prev) => {
      const merged = Array.from(new Set([...prev, ...cleanChars]));
      return merged.slice(0, 6);
    });
    setInputChar('');
  };

  // Xóa chữ khỏi so sánh
  const handleRemoveKanji = (charToRemove: string) => {
    setCompareChars((prev) => prev.filter((c) => c !== charToRemove));
  };

  // Chọn bộ Preset
  const handleSelectPreset = (presetChars: string[]) => {
    setCompareChars(presetChars);
    setAnimSyncKey((k) => k + 1);
    setAnimMode('once');
  };

  // Phát lại tất cả hoạt ảnh nét vẽ đồng thời
  const handlePlayAllAnimation = () => {
    setAnimSyncKey((k) => k + 1);
    setAnimMode('once');
  };

  // Phân tích thành phần bộ thủ chung và điểm khác biệt
  const comparisonAnalysis = useMemo(() => {
    if (compareChars.length < 2) return null;

    const compCounts: Record<string, { count: number; chars: string[]; meaning?: string; hanViet?: string }> = {};

    compareChars.forEach((c) => {
      const decomp = decompositions[c];
      if (decomp && decomp.components) {
        decomp.components.forEach((comp) => {
          if (!compCounts[comp.radical]) {
            compCounts[comp.radical] = {
              count: 0,
              chars: [],
              meaning: comp.meaning,
              hanViet: comp.hanViet,
            };
          }
          if (!compCounts[comp.radical].chars.includes(c)) {
            compCounts[comp.radical].count += 1;
            compCounts[comp.radical].chars.push(c);
          }
        });
      }
    });

    // Thành phần chung: xuất hiện ở từ 2 chữ trở lên
    const sharedComponents = Object.entries(compCounts)
      .filter(([_, data]) => data.count >= 2)
      .map(([rad, data]) => ({
        radical: rad,
        count: data.count,
        chars: data.chars,
        meaning: data.meaning,
        hanViet: data.hanViet,
      }));

    return {
      sharedComponents,
      compCounts,
    };
  }, [compareChars, decompositions]);

  // Helper định dạng màu sắc cho vị trí bộ thủ
  const getPositionBadge = (type?: string) => {
    switch (type) {
      case 'hen':
        return {
          badgeClass: 'bg-cyan-50 text-cyan-900 border-cyan-200',
          name: 'Bên trái (Hen)',
        };
      case 'tsukuri':
        return {
          badgeClass: 'bg-indigo-50 text-indigo-900 border-indigo-200',
          name: 'Bên phải (Tsukuri)',
        };
      case 'kanmuri':
        return {
          badgeClass: 'bg-amber-50 text-amber-900 border-amber-200',
          name: 'Phía trên (Kanmuri)',
        };
      case 'ashi':
        return {
          badgeClass: 'bg-emerald-50 text-emerald-900 border-emerald-200',
          name: 'Phía dưới (Ashi)',
        };
      case 'kamae':
      case 'tare':
      case 'nyo':
        return {
          badgeClass: 'bg-rose-50 text-rose-900 border-rose-200',
          name: 'Bao quanh / Nửa bao',
        };
      default:
        return {
          badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
          name: 'Thành phần',
        };
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Navigation & Header */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/kanji')}
              className="p-2 text-slate-500 hover:text-teal-800 hover:bg-teal-50 rounded-xl border border-slate-200 transition-colors cursor-pointer"
              title="Quay lại danh sách nét Kanji"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black text-slate-800 flex items-center gap-1.5">
                  <Columns3 className="w-5 h-5 text-teal-700" />
                  So Sánh Kanji Song Song
                </h1>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200">
                  {compareChars.length} / 6 chữ
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Đặt các chữ Hán cạnh nhau để phân tích tách bộ thủ, nhận diện nét dị biệt, đối chiếu âm On/Kun và ngữ nghĩa.
              </p>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handlePlayAllAnimation}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold transition-all shadow-2xs active:scale-95 cursor-pointer"
              title="Phát hoạt ảnh thứ tự nét viết của tất cả các chữ cùng lúc"
            >
              <RotateCcw className="w-3.5 h-3.5 text-white" />
              <span>Chạy lại nét vẽ</span>
            </button>

            <button
              type="button"
              onClick={() => setIncludeGrid((g) => !g)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                includeGrid
                  ? 'bg-teal-50 text-teal-900 border-teal-300 shadow-xs'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <span>{includeGrid ? 'Lưới ô: BẬT' : 'Lưới ô: TẮT'}</span>
            </button>

            {compareChars.length > 0 && (
              <button
                type="button"
                onClick={() => setCompareChars([])}
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer border border-slate-200"
                title="Xóa tất cả các chữ đang so sánh"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Thêm chữ Hán mới vào bảng so sánh */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <div className="relative flex-1">
            <input
              ref={ime.inputRef}
              type="text"
              value={inputChar}
              onChange={ime.handleChange}
              onKeyDown={(e) => {
                if (!ime.imeState.isOpen && e.key === 'Enter') {
                  handleAddKanji(inputChar);
                } else {
                  ime.handleKeyDown(e);
                }
              }}
              placeholder="Nhập hoặc dán thêm chữ Kanji cần so sánh (hỗ trợ gõ Romaji + Space)..."
              className="w-full px-3.5 pr-18 h-10 text-xs sm:text-sm bg-slate-50 focus:bg-white rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-700 transition-all font-medium"
            />
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <button
                type="button"
                onClick={() => setImeMode(!imeMode)}
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                  imeMode ? 'bg-teal-700 text-white shadow-2xs' : 'bg-slate-200 text-slate-500'
                }`}
                title={imeMode ? 'IME đang Bật' : 'IME Tắt'}
              >
                IME
              </button>
              {inputChar && (
                <button
                  type="button"
                  onClick={() => setInputChar('')}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-full cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {ime.imeState.isOpen && (
              <ImeCandidatePopover
                candidates={ime.imeState.candidates}
                selectedIndex={ime.imeState.selectedIndex}
                onSelectCandidate={ime.commitCandidate}
                onClose={ime.closeIme}
                reading={ime.imeState.reading}
                position={ime.imeState.position}
                isLoading={ime.imeState.isLoading}
              />
            )}
          </div>

          <button
            type="button"
            onClick={() => handleAddKanji(inputChar)}
            disabled={!inputChar.trim() || compareChars.length >= 6}
            className="h-10 px-4 text-xs sm:text-sm font-bold text-white bg-teal-700 hover:bg-teal-800 disabled:bg-slate-100 disabled:text-slate-400 border border-teal-800 rounded-xl transition-all cursor-pointer disabled:cursor-not-allowed shadow-2xs flex items-center justify-center gap-1.5 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm chữ</span>
          </button>
        </div>

        {/* Các bộ Preset gợi ý sẵn */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Bộ Kanji dễ nhầm lẫn gợi ý:</span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 no-scrollbar">
            {CONFUSION_PRESETS.map((p) => {
              const isCurrent = p.chars.join('') === compareChars.join('');
              return (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => handleSelectPreset(p.chars)}
                  className={`px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                    isCurrent
                      ? 'bg-teal-700 text-white border-teal-800 shadow-xs'
                      : 'bg-slate-50 hover:bg-teal-50/70 text-slate-700 hover:text-teal-900 border-slate-200'
                  }`}
                  title={`${p.label} - ${p.desc}`}
                >
                  <span className="font-kanji font-bold text-sm tracking-wider">{p.name}</span>
                  <span className={`text-[10px] hidden sm:inline ${isCurrent ? 'text-teal-100' : 'text-slate-400'}`}>
                    ({p.label})
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Comparison Matrix Area */}
      {compareChars.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-12 text-center space-y-3">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600">
            <Columns3 className="w-8 h-8" />
          </div>
          <h3 className="font-bold text-slate-800 text-base">Chưa có chữ Kanji nào được chọn</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Nhập chữ Hán vào ô trên hoặc chọn một trong các bộ chữ gợi ý sẵn để bắt đầu so sánh.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Box phân tích tổng quan: Bộ thủ chung & Điểm phân biệt */}
          {comparisonAnalysis && comparisonAnalysis.sharedComponents.length > 0 && (
            <div className="bg-gradient-to-r from-amber-50/90 via-teal-50/50 to-blue-50/70 border border-amber-200/90 rounded-2xl p-4 shadow-2xs space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-950">
                <Lightbulb className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Phân tích đối chiếu & Điểm chung giữa các chữ:</span>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-700">
                <span className="font-semibold text-slate-600">Thành phần chung:</span>
                {comparisonAnalysis.sharedComponents.map((item) => (
                  <span
                    key={item.radical}
                    className="inline-flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-xl border border-amber-300 font-medium shadow-2xs text-amber-950"
                  >
                    <span className="font-kanji font-bold text-sm text-teal-800">{item.radical}</span>
                    {item.hanViet && <span className="font-bold text-xs">{item.hanViet}</span>}
                    {item.meaning && <span className="text-[11px] text-slate-500">({item.meaning})</span>}
                    <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded-full font-bold">
                      {item.count}/{compareChars.length} chữ
                    </span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Grid đa cột cuộn ngang mượt mà */}
          <div className="overflow-x-auto pb-4 pt-1">
            <div
              className="grid gap-4 items-stretch"
              style={{
                gridTemplateColumns: `repeat(${compareChars.length}, minmax(280px, 1fr))`,
                minWidth: compareChars.length > 2 ? `${compareChars.length * 290}px` : 'auto',
              }}
            >
              {compareChars.map((char, index) => {
                const hex = char.codePointAt(0)?.toString(16).toLowerCase().padStart(5, '0') || '';
                const svgUrl = `https://raw.githubusercontent.com/KanjiVG/kanjivg/master/kanji/${hex}.svg`;
                const detail = enrichedDetails[char] || getKanjiInfo(char);
                const decomp = decompositions[char];

                // Kiểm tra xem ý nghĩa có phải là placeholder không
                const hasValidMeaning =
                  detail?.meanings &&
                  detail.meanings.length > 0 &&
                  !detail.meanings[0].includes('Tra Mazii') &&
                  !detail.meanings[0].includes('Bấm "Xem nét');

                const hasValidOn =
                  detail?.on && detail.on.length > 0 && !detail.on[0].includes('Tra Mazii');
                const hasValidKun =
                  detail?.kun && detail.kun.length > 0 && !detail.kun[0].includes('Tra Mazii');

                return (
                  <div
                    key={char}
                    className="bg-white rounded-2xl border-2 border-slate-200/90 shadow-xs hover:border-teal-400 transition-all flex flex-col justify-between overflow-hidden group"
                  >
                    {/* Header Cột: Chữ Hán, STT, Nút xóa */}
                    <div className="p-3.5 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-teal-100 text-teal-800 text-xs font-bold font-mono flex items-center justify-center">
                          #{index + 1}
                        </span>
                        {detail?.jlpt && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold border ${getJlptBadgeClass(detail.jlpt)}`}>
                            {detail.jlpt}
                          </span>
                        )}
                        {detail?.strokeCount && (
                          <span className="text-[11px] font-medium text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                            {detail.strokeCount} nét
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveKanji(char)}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Bỏ chữ này ra khỏi so sánh"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Vùng Trực quan: Chữ Kanji Lớn & Hoạt ảnh nét vẽ */}
                    <div className="p-4 space-y-4 flex-1">
                      {/* Tiêu đề Chữ & Hán-Việt */}
                      <div className="text-center space-y-1">
                        <div className="relative inline-flex items-center justify-center">
                          <span className="font-kanji font-black text-5xl text-slate-900 group-hover:text-teal-700 transition-colors leading-none">
                            {char}
                          </span>
                          <button
                            type="button"
                            onClick={() => speakJapanese(char)}
                            className="p-1.5 text-slate-400 hover:text-teal-700 hover:bg-teal-50 rounded-lg transition-colors cursor-pointer absolute -right-8 top-1/2 -translate-y-1/2"
                            title="Nghe phát âm"
                          >
                            <Volume2 className="w-4 h-4" />
                          </button>
                        </div>
                        <div>
                          <span className="inline-block text-xs font-bold text-teal-900 bg-teal-50 border border-teal-200 px-2.5 py-0.5 rounded-lg shadow-2xs">
                            {detail?.hanViet || 'Chưa rõ âm'}
                          </span>
                        </div>
                      </div>

                      {/* Khung Hoạt ảnh Nét Vẽ SVG */}
                      <div className="relative w-full aspect-square max-w-[190px] mx-auto bg-slate-50/70 rounded-xl border border-slate-200/90 p-2 shadow-inner flex items-center justify-center overflow-hidden">
                        {includeGrid && <KanjiGridOverlay dashed={true} type="mi" />}
                        <KanjiSvgView
                          svgUrl={svgUrl}
                          kanji={char}
                          animKey={animSyncKey}
                          loopMode={animMode}
                          className="w-full h-full object-contain relative z-0"
                        />
                      </div>

                      {/* Ý nghĩa cốt lõi */}
                      <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                          Ý nghĩa
                        </span>
                        <p className="text-xs font-semibold text-slate-800 leading-snug">
                          {hasValidMeaning ? (
                            detail.meanings.join(', ')
                          ) : (
                            <span className="text-slate-400 italic">Đang nạp nghĩa tiếng Việt...</span>
                          )}
                        </p>
                      </div>

                      {/* KHỐI BÓC TÁCH BỘ THỦ & CẤU TẠO CHỮ (TRỰC TIẾP TRÊN THẺ) */}
                      <div className="bg-gradient-to-br from-teal-50/70 via-slate-50 to-teal-50/30 rounded-xl p-3 border border-teal-200/90 shadow-2xs space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-teal-900 flex items-center gap-1.5">
                            <Layers3 className="w-3.5 h-3.5 text-teal-700" />
                            Tách bộ thủ & Cấu tạo chữ
                          </span>
                          {decomp && decomp.components && decomp.components.length > 0 && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-100/90 text-teal-900 border border-teal-200">
                              {decomp.components.length} thành phần
                            </span>
                          )}
                        </div>

                        {decomp && decomp.components && decomp.components.length > 0 ? (
                          <div className="space-y-2">
                            {/* Công thức phân rã nét: 待 = 彳 + 寺 */}
                            <div className="flex items-center flex-wrap gap-1.5 py-1 px-2 rounded-lg bg-white/90 border border-teal-100 text-xs">
                              <span className="font-kanji font-black text-sm text-teal-950">{char}</span>
                              <span className="text-slate-400 font-bold">=</span>
                              {decomp.components.map((comp, cIdx) => {
                                const pos = getPositionBadge(comp.positionType);
                                return (
                                  <React.Fragment key={cIdx}>
                                    {cIdx > 0 && <span className="text-teal-600 font-bold text-xs">+</span>}
                                    <span
                                      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md font-kanji font-bold text-xs border ${pos.badgeClass}`}
                                      title={`${comp.positionName || pos.name}: ${comp.hanViet || ''} ${comp.meaning ? '- ' + comp.meaning : ''}`}
                                    >
                                      <span>{comp.radical}</span>
                                      {comp.hanViet && (
                                        <span className="text-[10px] font-sans font-medium opacity-90">
                                          {comp.hanViet}
                                        </span>
                                      )}
                                    </span>
                                  </React.Fragment>
                                );
                              })}
                            </div>

                            {/* Danh sách thẻ chi tiết từng thành phần con */}
                            <div className="space-y-1.5">
                              {decomp.components.map((comp, cIdx) => {
                                const pos = getPositionBadge(comp.positionType);
                                return (
                                  <div
                                    key={cIdx}
                                    className={`flex items-start gap-2 p-2 rounded-xl border transition-all ${
                                      comp.positionType === 'hen'
                                        ? 'bg-cyan-50/50 border-cyan-200/90'
                                        : comp.positionType === 'tsukuri'
                                        ? 'bg-indigo-50/50 border-indigo-200/90'
                                        : 'bg-white border-slate-200'
                                    }`}
                                  >
                                    <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 shadow-2xs flex items-center justify-center shrink-0">
                                      <span className="font-kanji font-black text-base text-slate-900">
                                        {comp.radical}
                                      </span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${pos.badgeClass}`}>
                                          {comp.positionName || pos.name}
                                        </span>
                                        {comp.hanViet && (
                                          <span className="text-xs font-bold text-slate-900">
                                            {comp.hanViet}
                                          </span>
                                        )}
                                        {comp.strokeCount && (
                                          <span className="text-[10px] text-slate-400 font-mono">
                                            ({comp.strokeCount} nét)
                                          </span>
                                        )}
                                      </div>
                                      {comp.meaning && (
                                        <p className="text-[11px] text-slate-600 line-clamp-2 mt-0.5 leading-snug">
                                          {comp.meaning}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>

                            {/* Mẹo liên tưởng / Ghi nhớ nếu có */}
                            {decomp.mnemonicStory && (
                              <div className="text-[11px] text-slate-600 bg-amber-50/80 border border-amber-200/90 rounded-lg p-2 leading-relaxed flex items-start gap-1.5">
                                <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                                <span>{decomp.mnemonicStory}</span>
                              </div>
                            )}

                            {/* Nút xem sơ đồ nhánh chi tiết dạng cây */}
                            <button
                              type="button"
                              onClick={() => setSelectedTreeModalChar(char)}
                              className="w-full py-1.5 text-[11px] font-semibold text-teal-800 hover:text-teal-950 bg-white hover:bg-teal-50 border border-teal-200 rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                            >
                              <GitBranch className="w-3.5 h-3.5 text-teal-600" />
                              <span>Xem sơ đồ cây bóc tách</span>
                            </button>
                          </div>
                        ) : (
                          <div className="text-center py-2 text-xs text-slate-400 italic">
                            Đang phân tích cấu trúc bộ thủ...
                          </div>
                        )}
                      </div>

                      {/* Âm đọc On / Kun */}
                      <div className="space-y-2 pt-1 text-xs">
                        <div className="bg-blue-50/60 border border-blue-200/80 rounded-xl p-2.5">
                          <span className="text-[10px] font-bold text-blue-800 block mb-0.5">
                            Âm On (Katakana):
                          </span>
                          <span className="font-mono font-bold text-blue-950">
                            {hasValidOn ? detail.on.join(', ') : '—'}
                          </span>
                        </div>

                        <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-xl p-2.5">
                          <span className="text-[10px] font-bold text-emerald-800 block mb-0.5">
                            Âm Kun (Hiragana):
                          </span>
                          <span className="font-mono font-bold text-emerald-950">
                            {hasValidKun ? detail.kun.join(', ') : '—'}
                          </span>
                        </div>
                      </div>

                      {/* Từ ghép tiêu biểu */}
                      {detail?.examples && detail.examples.length > 0 && (
                        <div className="space-y-1.5 pt-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block flex items-center gap-1">
                            <BookOpen className="w-3 h-3" />
                            Từ vựng thường gặp
                          </span>
                          <div className="space-y-1">
                            {detail.examples.slice(0, 3).map((ex, i) => (
                              <div
                                key={i}
                                className="p-2 rounded-lg bg-slate-50 border border-slate-200/70 text-[11px] space-y-0.5"
                              >
                                <div className="flex items-center justify-between font-bold text-slate-800">
                                  <span className="font-kanji text-xs text-teal-800">{ex.word}</span>
                                  <span className="text-slate-500 font-mono text-[10px]">{ex.reading}</span>
                                </div>
                                <div className="text-slate-600 text-[10px]">
                                  {ex.hanViet ? <strong className="text-slate-700">{ex.hanViet}: </strong> : null}
                                  {ex.meaning}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Footer Thẻ Cột */}
                    <div className="p-3 bg-slate-50/80 border-t border-slate-200 text-center">
                      <button
                        type="button"
                        onClick={() => {
                          const item = {
                            id: index + 1,
                            kanji: char,
                            hex,
                            svgUrl,
                            unicodeDecimal: char.charCodeAt(0),
                            detail,
                          };
                          handleInspectKanji(item);
                        }}
                        className="w-full py-1.5 px-3 text-xs font-semibold text-teal-800 bg-white hover:bg-teal-50 border border-teal-200 rounded-xl transition-all shadow-2xs hover:shadow-xs cursor-pointer"
                      >
                        Xem chi tiết & Luyện tập
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Modal Sơ đồ Cây Bóc Tách Bộ Thủ (khi nhấn "Xem sơ đồ cây bóc tách") */}
      {selectedTreeModalChar && decompositions[selectedTreeModalChar] && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6 shadow-2xl border border-slate-200 relative animate-in zoom-in-95 duration-200">
            <button
              type="button"
              onClick={() => setSelectedTreeModalChar(null)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              title="Đóng"
            >
              <X className="w-5 h-5" />
            </button>

            <KanjiRadicalTree
              decomposition={decompositions[selectedTreeModalChar]}
              onSelectKanji={(k) => {
                handleAddKanji(k);
                setSelectedTreeModalChar(null);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
