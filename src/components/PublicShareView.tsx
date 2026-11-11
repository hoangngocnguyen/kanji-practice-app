import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Globe,
  Download,
  Play,
  ArrowLeft,
  Volume2,
  RotateCw,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Check,
} from 'lucide-react';
import {
  fetchPublicSharedDeck,
  isSupabaseConfigured,
  PublicSharedDeckRecord,
} from '../utils/supabaseClient';
import { useDecks } from '../context/DeckContext';
import { speakJapanese } from '../utils/speech';

interface GuestCard {
  id: string;
  type: 'kanji' | 'compound';
  front: string;
  hanViet: string;
  reading: string;
  meaning: string;
}

export const PublicShareView: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { importDeckBundle } = useDecks();

  const [record, setRecord] = useState<PublicSharedDeckRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Guest in-memory flashcard mode
  const [isPracticing, setIsPracticing] = useState(false);
  const [cardIndex, setCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!slug) {
        setError('Liên kết chia sẻ không hợp lệ.');
        setLoading(false);
        return;
      }
      if (!isSupabaseConfigured()) {
        setError(
          'Ứng dụng chưa cấu hình biến môi trường Supabase (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY) để tải bộ bài công khai.'
        );
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const data = await fetchPublicSharedDeck(slug);
        if (!active) return;
        if (!data) {
          setError('Không tìm thấy bộ ôn tập này hoặc tác giả đã tắt chia sẻ.');
        } else {
          setRecord(data);
        }
      } catch (err: any) {
        if (!active) return;
        setError(err?.message || 'Không thể tải bộ ôn tập từ máy chủ.');
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [slug]);

  const guestCards: GuestCard[] = useMemo(() => {
    if (!record?.bundle?.items) return [];
    const list: GuestCard[] = [];
    for (const item of record.bundle.items) {
      list.push({
        id: `k-${item.id}`,
        type: 'kanji',
        front: item.kanji,
        hanViet: item.hanViet,
        reading: [...item.onReadings, ...item.kunReadings].join(', '),
        meaning: item.meanings.join(', '),
      });
      for (const cw of item.compoundWords || []) {
        list.push({
          id: `cw-${cw.id}`,
          type: 'compound',
          front: cw.word,
          hanViet: cw.hanViet,
          reading: cw.reading,
          meaning: cw.meaning,
        });
      }
    }
    return list;
  }, [record]);

  const handleSaveToMyDecks = () => {
    if (!record?.bundle) return;
    importDeckBundle(record.bundle, null, true);
    setSavedSuccess(true);
    setTimeout(() => {
      navigate('/decks');
    }, 800);
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto bg-white rounded-2xl border border-slate-200 p-12 text-center text-sm text-slate-500">
        Đang tải bộ ôn tập được chia sẻ...
      </div>
    );
  }

  if (error || !record) {
    return (
      <div className="max-w-xl mx-auto bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-base font-bold text-slate-900">Không thể mở bộ bài chia sẻ</h2>
        <p className="text-xs text-slate-600">{error}</p>
        <Link
          to="/decks"
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-xl transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Về thư mục của tôi</span>
        </Link>
      </div>
    );
  }

  if (isPracticing && guestCards.length > 0) {
    const current = guestCards[cardIndex];
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setIsPracticing(false)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-teal-800 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Quay lại danh sách</span>
          </button>
          <span className="text-xs font-mono tabular-nums text-slate-500">
            {cardIndex + 1} / {guestCards.length}
          </span>
        </div>

        <div
          onClick={() => setIsFlipped((f) => !f)}
          className="bg-white rounded-2xl border border-slate-200 shadow-sm min-h-[300px] p-8 flex flex-col justify-between cursor-pointer select-none"
        >
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold text-teal-800">
              {current.type === 'kanji' ? 'Thẻ Chữ Kanji' : 'Thẻ Từ Ghép'}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                speakJapanese(current.front);
              }}
              className="p-2 text-slate-400 hover:text-teal-700 rounded-lg cursor-pointer"
            >
              <Volume2 className="w-4 h-4" />
            </button>
          </div>

          {!isFlipped ? (
            <div className="py-10 text-center space-y-3">
              <div className="font-kanji font-black text-6xl text-slate-900">{current.front}</div>
              <p className="text-xs text-slate-400">Nhấn vào thẻ để xem đáp án</p>
            </div>
          ) : (
            <div className="py-6 text-center space-y-3">
              <div className="font-kanji font-black text-4xl text-teal-900">{current.front}</div>
              {current.hanViet && (
                <div className="text-sm font-bold text-teal-700">{current.hanViet}</div>
              )}
              {current.reading && (
                <div className="font-mono text-sm text-slate-700">{current.reading}</div>
              )}
              <div className="text-base font-semibold text-slate-900 pt-1">
                {current.meaning || '—'}
              </div>
            </div>
          )}

          <div className="text-center text-[11px] text-slate-400 flex items-center justify-center gap-1">
            <RotateCw className="w-3 h-3" />
            <span>Lật thẻ</span>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            disabled={cardIndex === 0}
            onClick={() => {
              setCardIndex((i) => Math.max(0, i - 1));
              setIsFlipped(false);
            }}
            className="flex-1 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-40 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Thẻ trước</span>
          </button>
          <button
            type="button"
            disabled={cardIndex >= guestCards.length - 1}
            onClick={() => {
              setCardIndex((i) => Math.min(guestCards.length - 1, i + 1));
              setIsFlipped(false);
            }}
            className="flex-1 py-2.5 bg-teal-700 hover:bg-teal-800 disabled:opacity-40 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1 cursor-pointer"
          >
            <span>Thẻ tiếp theo</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs text-teal-800 font-semibold">
            <Globe className="w-4 h-4" />
            <span>Bộ ôn tập cộng đồng</span>
            <span aria-hidden="true">·</span>
            <span className="text-slate-500 font-normal">Tác giả: {record.author_name}</span>
          </div>
          <h1 className="text-lg font-bold text-slate-900">{record.title}</h1>
          <div className="flex items-center gap-2 text-xs text-slate-500 tabular-nums">
            <span>{record.bundle.folders.length} thư mục</span>
            <span aria-hidden="true">·</span>
            <span>{record.bundle.items.length} chữ Kanji</span>
            <span aria-hidden="true">·</span>
            <span>{guestCards.length} thẻ Flashcard</span>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-2 shrink-0">
          <button
            type="button"
            disabled={guestCards.length === 0}
            onClick={() => {
              setCardIndex(0);
              setIsFlipped(false);
              setIsPracticing(true);
            }}
            className="px-4 py-2 text-xs font-semibold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-xl flex items-center gap-1.5 cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Ôn Flashcard ngay</span>
          </button>

          <button
            type="button"
            onClick={handleSaveToMyDecks}
            className="px-4 py-2 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-xl flex items-center gap-1.5 cursor-pointer"
          >
            {savedSuccess ? <Check className="w-4 h-4" /> : <Download className="w-4 h-4" />}
            <span>{savedSuccess ? 'Đã lưu!' : 'Lưu về thư mục của tôi'}</span>
          </button>
        </div>
      </div>

      {/* Preview Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden divide-y divide-slate-100">
        {record.bundle.items.map((item) => (
          <div key={item.id} className="p-4 space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center font-kanji text-xl font-black text-slate-900">
                  {item.kanji}
                </span>
                <div>
                  <div className="text-xs font-bold text-slate-900">{item.hanViet || '—'}</div>
                  <div className="text-xs text-slate-600">{item.meanings.join(', ')}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => speakJapanese(item.kanji)}
                className="p-2 text-slate-400 hover:text-teal-700 cursor-pointer"
              >
                <Volume2 className="w-4 h-4" />
              </button>
            </div>

            {item.compoundWords && item.compoundWords.length > 0 && (
              <div className="pl-13 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
                {item.compoundWords.map((cw) => (
                  <span key={cw.id}>
                    <strong className="font-kanji text-slate-900">{cw.word}</strong>{' '}
                    <span className="font-mono text-slate-500">({cw.reading})</span>: {cw.meaning}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
