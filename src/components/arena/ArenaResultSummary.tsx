import React, { useMemo, useState } from 'react';
import {
  Trophy,
  RotateCcw,
  BookmarkPlus,
  Check,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  Flame,
} from 'lucide-react';
import { recordKanjiMistake } from '../../services/mistakeBankService';
import { ArenaRoomState } from '../../types/arena';

interface ArenaResultSummaryProps {
  room: ArenaRoomState;
  currentPlayerId: string;
  isBusy: boolean;
  onRematch: () => Promise<void>;
  onBackToHub: () => void;
}

export const ArenaResultSummary: React.FC<ArenaResultSummaryProps> = ({
  room,
  currentPlayerId,
  isBusy,
  onRematch,
  onBackToHub,
}) => {
  const [savedMistakes, setSavedMistakes] = useState(false);

  const isHost = room.hostPlayerId === currentPlayerId;
  const winner = room.players[0];
  const me = room.players.find((p) => p.playerId === currentPlayerId);
  const myRank = room.players.findIndex((p) => p.playerId === currentPlayerId) + 1;

  const wrongQuestions = useMemo(() => {
    return room.questions
      .map((q, idx) => ({
        q,
        idx,
        ans: room.myAnswers?.[String(idx)],
      }))
      .filter((entry) => !entry.ans || !entry.ans.isCorrect);
  }, [room.questions, room.myAnswers]);

  const handleSaveMistakesToBank = () => {
    const uniqueKanji = Array.from(new Set(wrongQuestions.map((w) => w.q.kanji).filter(Boolean)));
    for (const ch of uniqueKanji) {
      recordKanjiMistake(ch, 'quiz');
    }
    setSavedMistakes(true);
  };

  const myAccuracy =
    room.questions.length > 0 && me
      ? Math.round((me.correctCount / room.questions.length) * 100)
      : 0;
  const myAvgSec =
    me && me.answeredCount > 0
      ? (me.totalResponseMs / me.answeredCount / 1000).toFixed(1)
      : '0.0';

  return (
    <div className="max-w-5xl mx-auto space-y-5 pb-10">
      {/* Winner Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-teal-700 text-white flex items-center justify-center shrink-0">
            <Trophy className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h1 className="text-xl font-extrabold text-slate-900">
              {winner
                ? `${winner.displayName} giành chiến thắng!`
                : 'Trận đấu đã kết thúc'}
            </h1>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 tabular-nums">
              <span>{room.title}</span>
              <span aria-hidden="true">·</span>
              <span>Hạng của bạn: #{myRank || '-'}</span>
              <span aria-hidden="true">·</span>
              <span>Chính xác {myAccuracy}%</span>
              <span aria-hidden="true">·</span>
              <span>Tốc độ TB {myAvgSec}s/câu</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {wrongQuestions.length > 0 && (
            <button
              type="button"
              disabled={savedMistakes}
              onClick={handleSaveMistakesToBank}
              className="h-10 px-3.5 text-xs font-bold text-amber-900 bg-amber-50 hover:bg-amber-100 disabled:bg-emerald-50 disabled:text-emerald-800 border border-amber-200 disabled:border-emerald-200 rounded-xl inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              {savedMistakes ? (
                <Check className="w-4 h-4" />
              ) : (
                <BookmarkPlus className="w-4 h-4" />
              )}
              <span>
                {savedMistakes
                  ? 'Đã lưu vào Ôn tập'
                  : `Lưu ${wrongQuestions.length} câu sai vào Ôn tập`}
              </span>
            </button>
          )}

          {isHost && (
            <button
              type="button"
              disabled={isBusy}
              onClick={() => void onRematch()}
              className="h-10 px-4 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-xl inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Tái đấu</span>
            </button>
          )}

          <button
            type="button"
            onClick={onBackToHub}
            className="h-10 px-3.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Về sảnh</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Final Standings */}
        <section className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
          <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2.5">
            Bảng xếp hạng chung cuộc
          </h2>

          <div className="space-y-2">
            {room.players.map((p, idx) => {
              const isMe = p.playerId === currentPlayerId;
              const acc =
                room.questions.length > 0
                  ? Math.round((p.correctCount / room.questions.length) * 100)
                  : 0;

              return (
                <div
                  key={p.playerId}
                  className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${
                    isMe
                      ? 'bg-teal-50/80 border-teal-300'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`w-7 h-7 rounded-lg font-mono text-xs font-black flex items-center justify-center shrink-0 tabular-nums ${
                        idx === 0
                          ? 'bg-amber-500 text-white'
                          : idx === 1
                          ? 'bg-slate-400 text-white'
                          : idx === 2
                          ? 'bg-amber-700 text-white'
                          : 'bg-white border border-slate-200 text-slate-600'
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 truncate">
                        {p.displayName} {isMe ? '(Bạn)' : ''}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 tabular-nums">
                        <span>
                          {p.correctCount}/{room.questions.length} đúng ({acc}%)
                        </span>
                        {p.maxStreak >= 2 && (
                          <span className="inline-flex items-center gap-0.5 text-amber-700 font-semibold">
                            <Flame className="w-3 h-3" />
                            {p.maxStreak}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <span className="font-mono text-sm font-black text-teal-800 tabular-nums shrink-0">
                    {p.score}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        {/* Per-Question Answer Review */}
        <section className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
          <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2.5">
            Chi tiết từng câu của bạn
          </h2>

          <div className="space-y-2.5">
            {room.questions.map((q, idx) => {
              const myAns = room.myAnswers?.[String(idx)];
              const isCorrect = Boolean(myAns?.isCorrect);
              const correctOpt = q.options.find((o) => o.id === q.correctOptionId);

              return (
                <div
                  key={q.id}
                  className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 flex items-start justify-between gap-3"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    {isCorrect ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    )}
                    <div className="space-y-1 min-w-0">
                      <div className="text-xs font-bold text-slate-900">
                        Câu {idx + 1}:{' '}
                        <span className="font-kanji text-sm">{q.promptPrimary}</span>
                      </div>
                      <div className="text-[11px] text-slate-600">
                        Đáp án đúng:{' '}
                        <strong className="text-emerald-800">
                          {correctOpt?.label || q.kanji}
                        </strong>
                        {q.explanation ? ` · ${q.explanation}` : ''}
                      </div>
                    </div>
                  </div>

                  <span className="font-mono text-xs font-bold text-slate-700 tabular-nums shrink-0">
                    +{myAns?.pointsAwarded || 0}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
};
