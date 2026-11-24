import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Flame,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Clock,
  Volume2,
  Trophy,
  LogOut,
} from 'lucide-react';
import { speakJapanese } from '../../utils/speech';
import { resolveCorrectOptionsFromHashes } from '../../services/arenaService';
import { PlayerAnswerDeltaPayload } from '../../hooks/useArenaRoom';
import { ArenaRoomState, ArenaSubmitResult } from '../../types/arena';

interface ArenaMatchViewProps {
  room: ArenaRoomState;
  currentPlayerId: string;
  onOptimisticAnswer?: (delta: PlayerAnswerDeltaPayload) => void;
  onSubmitAnswer: (questionIndex: number, optionId: string) => Promise<ArenaSubmitResult>;
  onAdvanceQuestion: (expectedIndex: number) => Promise<void>;
  onLeaveRoom: () => Promise<void>;
}

export const ArenaMatchView: React.FC<ArenaMatchViewProps> = ({
  room,
  currentPlayerId,
  onOptimisticAnswer,
  onSubmitAnswer,
  onAdvanceQuestion,
  onLeaveRoom,
}) => {
  const qIndex = room.currentQuestionIndex;
  const question = room.questions[qIndex];
  const isHost = room.hostPlayerId === currentPlayerId;
  const is1v1 = room.mode === '1v1';

  // Estimate server clock offset once per room payload update
  const clockOffsetMs = useMemo(() => {
    const serverTime = room.serverNow ? new Date(room.serverNow).getTime() : Date.now();
    return serverTime - Date.now();
  }, [room.serverNow]);

  const [nowMs, setNowMs] = useState<number>(() => Date.now() + clockOffsetMs);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isAdvancing, setIsAdvancing] = useState<boolean>(false);
  const [correctOptionMap, setCorrectOptionMap] = useState<Record<string, string>>({});
  const [localResult, setLocalResult] = useState<{
    qIdx: number;
    selectedOptionId: string;
    res: ArenaSubmitResult;
  } | null>(null);
  const timeoutSubmittedForIdxRef = useRef<number | null>(null);
  const autoAdvanceTriggeredForIdxRef = useRef<number | null>(null);

  // Pre-resolve SHA-256 correct-option verifiers in RAM for 0ms instant click feedback
  useEffect(() => {
    let cancelled = false;
    void resolveCorrectOptionsFromHashes(room.id, room.questions).then((resolved) => {
      if (!cancelled) {
        setCorrectOptionMap(resolved);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [room.id, room.questions]);

  // Tick timer smoothly every 100ms
  useEffect(() => {
    const id = window.setInterval(() => {
      setNowMs(Date.now() + clockOffsetMs);
    }, 100);
    return () => window.clearInterval(id);
  }, [clockOffsetMs]);

  // Reset per-question local refs when moving to next question
  useEffect(() => {
    setIsSubmitting(false);
    setIsAdvancing(false);
    if (localResult && localResult.qIdx !== qIndex) {
      setLocalResult(null);
    }
  }, [qIndex, localResult]);

  const startedAtMs = room.questionStartedAt
    ? new Date(room.questionStartedAt).getTime()
    : nowMs;
  const preStartCountdownSec = Math.max(0, Math.ceil((startedAtMs - nowMs) / 1000));
  const isPreStartCountdown = qIndex === 0 && startedAtMs > nowMs;

  const durationMs = Math.max(5000, room.timePerQuestion * 1000);
  const elapsedMs = Math.max(0, nowMs - startedAtMs);
  const remainingMs = Math.max(0, durationMs - elapsedMs);
  const remainingSec = Math.ceil(remainingMs / 1000);
  const progressRatio = isPreStartCountdown ? 1 : Math.max(0, Math.min(1, remainingMs / durationMs));

  const savedServerAnswer = room.myAnswers?.[String(qIndex)];
  const activeResult =
    localResult?.qIdx === qIndex
      ? localResult
      : savedServerAnswer
      ? {
          qIdx: qIndex,
          selectedOptionId: savedServerAnswer.optionId,
          res: {
            isCorrect: savedServerAnswer.isCorrect,
            correctOptionId: question?.correctOptionId || '',
            explanation: question?.explanation || '',
            pointsAwarded: savedServerAnswer.pointsAwarded,
            newScore:
              room.players.find((p) => p.playerId === currentPlayerId)?.score || 0,
            streak:
              room.players.find((p) => p.playerId === currentPlayerId)?.streak || 0,
            allPlayersAnswered: room.players.every((p) => p.answeredCurrent),
          },
        }
      : null;

  const hasAnsweredCurrent = Boolean(activeResult);
  const allPlayersAnswered =
    room.players.length > 0 && room.players.every((p) => p.answeredCurrent);
  const isRoundOver =
    !isPreStartCountdown && (remainingMs <= 0 || allPlayersAnswered);

  const handleSelectOption = async (optionId: string) => {
    if (!question || isPreStartCountdown || hasAnsweredCurrent || isSubmitting) return;

    const targetQIdx = qIndex;
    const resolvedCorrectId =
      question.correctOptionId || correctOptionMap[question.id] || '';
    const currentMe = room.players.find((p) => p.playerId === currentPlayerId);

    if (resolvedCorrectId) {
      const isCorrect = optionId !== '__TIMEOUT__' && optionId === resolvedCorrectId;
      const prevStreak = currentMe?.streak || 0;
      const nextStreak = isCorrect ? prevStreak + 1 : 0;

      let pointsAwarded = 0;
      if (isCorrect) {
        const remainingRatio = Math.max(0, Math.min(1, remainingMs / durationMs));
        const speedBonus = Math.round(50 * remainingRatio);
        const comboBonus = 10 * Math.min(prevStreak, 5);
        pointsAwarded = 100 + speedBonus + comboBonus;
      }

      const optimisticScore = (currentMe?.score || 0) + pointsAwarded;
      const optimisticCorrectCount = (currentMe?.correctCount || 0) + (isCorrect ? 1 : 0);
      const optimisticAnsweredCount = (currentMe?.answeredCount || 0) + 1;
      const optimisticAllAnswered = room.players.every(
        (p) => p.playerId === currentPlayerId || p.answeredCurrent
      );

      // Instant 0ms local UI feedback + scoreboard delta
      setLocalResult({
        qIdx: targetQIdx,
        selectedOptionId: optionId,
        res: {
          isCorrect,
          correctOptionId: resolvedCorrectId,
          explanation: question.explanation || '',
          pointsAwarded,
          newScore: optimisticScore,
          streak: nextStreak,
          correctCount: optimisticCorrectCount,
          answeredCount: optimisticAnsweredCount,
          allPlayersAnswered: optimisticAllAnswered,
        },
      });

      onOptimisticAnswer?.({
        playerId: currentPlayerId,
        questionIndex: targetQIdx,
        isCorrect,
        score: optimisticScore,
        streak: nextStreak,
        correctCount: optimisticCorrectCount,
        answeredCount: optimisticAnsweredCount,
        optionId,
        pointsAwarded,
      });

      // Persist to server + broadcast delta asynchronously, then reconcile score cleanly
      setIsSubmitting(true);
      try {
        const serverRes = await onSubmitAnswer(targetQIdx, optionId);
        setLocalResult((prev) => {
          if (!prev || prev.qIdx !== targetQIdx) return prev;
          return {
            ...prev,
            res: {
              ...serverRes,
              explanation:
                serverRes.explanation || question.explanation || prev.res.explanation,
            },
          };
        });
      } catch {
        // Optimistic result remains rendered; periodic fallback poll syncs if needed
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // Fallback path if hash hasn't finished resolving
    setIsSubmitting(true);
    try {
      const res = await onSubmitAnswer(targetQIdx, optionId);
      setLocalResult({ qIdx: targetQIdx, selectedOptionId: optionId, res });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectOptionRef = useRef(handleSelectOption);
  handleSelectOptionRef.current = handleSelectOption;

  // Auto-submit timeout if player didn't answer when timer reaches 0
  useEffect(() => {
    if (isPreStartCountdown || hasAnsweredCurrent || isSubmitting) return;
    if (remainingMs > 0) return;
    if (timeoutSubmittedForIdxRef.current === qIndex) return;
    timeoutSubmittedForIdxRef.current = qIndex;

    void handleSelectOptionRef.current('__TIMEOUT__');
  }, [isPreStartCountdown, hasAnsweredCurrent, isSubmitting, remainingMs, qIndex]);

  // Auto-advance cleanly after snappy reveal in 'auto' mode once local submit finishes
  useEffect(() => {
    if (room.advanceMode !== 'auto') return;
    if (!isRoundOver || isSubmitting) return;
    if (autoAdvanceTriggeredForIdxRef.current === qIndex) return;

    const timer = window.setTimeout(() => {
      autoAdvanceTriggeredForIdxRef.current = qIndex;
      void onAdvanceQuestion(qIndex).catch(() => {
        autoAdvanceTriggeredForIdxRef.current = null;
      });
    }, 850);

    return () => window.clearTimeout(timer);
  }, [room.advanceMode, isRoundOver, isSubmitting, qIndex, onAdvanceQuestion]);

  // Keyboard shortcuts 1-4
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (!question || isPreStartCountdown || hasAnsweredCurrent || isSubmitting) return;
      const idx = ['1', '2', '3', '4'].indexOf(e.key);
      if (idx >= 0 && question.options[idx]) {
        e.preventDefault();
        void handleSelectOption(question.options[idx].id);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  });

  if (!question) {
    return (
      <div className="max-w-3xl mx-auto p-6 bg-white rounded-2xl border border-slate-200 text-center text-xs text-slate-600">
        Đang tải câu hỏi tiếp theo...
      </div>
    );
  }

  const me = room.players.find((p) => p.playerId === currentPlayerId);
  const myRank = room.players.findIndex((p) => p.playerId === currentPlayerId) + 1;
  const opponent = is1v1
    ? room.players.find((p) => p.playerId !== currentPlayerId)
    : undefined;

  const answeredCountInRoom = room.players.filter((p) => p.answeredCurrent).length;

  return (
    <div className="max-w-5xl mx-auto space-y-4 pb-10">
      {/* Top Status Strip: 1v1 Head-to-Head OR Group Rank Summary */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3.5 sm:p-4 space-y-3">
        <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
          <div className="flex items-center gap-2 tabular-nums">
            <span className="font-bold text-slate-900">
              Câu {qIndex + 1} / {room.questions.length}
            </span>
            <span aria-hidden="true">·</span>
            <span>Mã {room.roomCode}</span>
            <span aria-hidden="true">·</span>
            <span>
              {answeredCountInRoom}/{room.players.length} đã trả lời
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 font-mono text-xs font-extrabold tabular-nums ${
                remainingSec <= 5 && !isPreStartCountdown
                  ? 'text-rose-600'
                  : 'text-slate-800'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              {isPreStartCountdown ? `Bắt đầu sau ${preStartCountdownSec}s` : `${remainingSec}s`}
            </span>

            <button
              type="button"
              onClick={() => void onLeaveRoom()}
              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg cursor-pointer"
              title="Thoát trận"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Countdown Progress Bar */}
        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full origin-left transition-transform duration-100 ${
              remainingSec <= 5 && !isPreStartCountdown ? 'bg-rose-600' : 'bg-teal-700'
            }`}
            style={{ transform: `scaleX(${progressRatio})` }}
          />
        </div>

        {/* 1v1 Scoreboard vs Group Player Bar */}
        {is1v1 ? (
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="p-2.5 rounded-xl bg-teal-50/70 border border-teal-200 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-900 truncate">
                  {me?.displayName || 'Bạn'} (Bạn)
                </div>
                <div className="text-[11px] text-teal-800 flex items-center gap-1.5 tabular-nums">
                  <span>{me?.correctCount || 0} đúng</span>
                  {(me?.streak || 0) >= 2 && (
                    <span className="inline-flex items-center gap-0.5 font-bold text-amber-700">
                      <Flame className="w-3 h-3" />
                      {me?.streak}
                    </span>
                  )}
                </div>
              </div>
              <span className="font-mono text-base font-black text-teal-800 tabular-nums shrink-0">
                {me?.score || 0}
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-900 truncate">
                  {opponent?.displayName || 'Đối thủ'}
                </div>
                <div className="text-[11px] text-slate-500 flex items-center gap-1.5 tabular-nums">
                  <span>
                    {opponent?.answeredCurrent ? 'Đã chốt đáp án' : 'Đang suy nghĩ...'}
                  </span>
                  {(opponent?.streak || 0) >= 2 && (
                    <span className="inline-flex items-center gap-0.5 font-bold text-amber-700">
                      <Flame className="w-3 h-3" />
                      {opponent?.streak}
                    </span>
                  )}
                </div>
              </div>
              <span className="font-mono text-base font-black text-slate-800 tabular-nums shrink-0">
                {opponent?.score || 0}
              </span>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs">
            <div className="flex items-center gap-3 tabular-nums">
              <span className="font-bold text-slate-900">
                Hạng #{myRank > 0 ? myRank : '-'} / {room.players.length}
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-mono font-extrabold text-teal-800">
                {me?.score || 0} điểm
              </span>
              {(me?.streak || 0) >= 2 && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="inline-flex items-center gap-1 font-bold text-amber-700">
                    <Flame className="w-3.5 h-3.5" />
                    Chuỗi {me?.streak}
                  </span>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Main Battle Stage */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        <div
          className={`${
            is1v1 ? 'lg:col-span-12' : 'lg:col-span-8'
          } bg-white rounded-2xl border border-slate-200 p-5 sm:p-7 space-y-6`}
        >
          {isPreStartCountdown ? (
            <div className="py-16 text-center space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-teal-700">
                Chuẩn bị sẵn sàng
              </p>
              <div className="text-6xl font-black font-mono text-slate-900 tabular-nums">
                {preStartCountdownSec}
              </div>
              <p className="text-xs text-slate-500">
                {room.title} · {room.questions.length} câu hỏi
              </p>
            </div>
          ) : (
            <>
              {/* Question Prompt */}
              {(() => {
                const revealedKanji = activeResult?.res.kanji || question.kanji || '';
                const revealedSentenceJp =
                  activeResult?.res.sentenceJp || question.sentenceJp || '';
                const canPlayAudio =
                  hasAnsweredCurrent || question.mode === 'kanji-to-meaning';
                const audioTarget =
                  question.mode === 'sentence-cloze'
                    ? revealedSentenceJp || revealedKanji
                    : revealedKanji ||
                      (question.mode === 'kanji-to-meaning' ||
                      question.mode === 'reading'
                        ? question.promptPrimary
                        : '');

                return (
                  <div className="text-center space-y-2.5">
                    <div className="flex items-center justify-center gap-2">
                      <div
                        className={`font-kanji font-black text-slate-900 leading-tight ${
                          question.promptPrimary.length <= 2
                            ? 'text-6xl sm:text-7xl'
                            : question.promptPrimary.length <= 16
                            ? 'text-2xl sm:text-3xl'
                            : 'text-lg sm:text-2xl'
                        }`}
                      >
                        {question.mode === 'sentence-cloze' &&
                        hasAnsweredCurrent &&
                        revealedSentenceJp &&
                        revealedKanji
                          ? revealedSentenceJp.split(revealedKanji).map((seg, sIdx, arr) => (
                              <React.Fragment key={sIdx}>
                                {seg}
                                {sIdx < arr.length - 1 && (
                                  <span className="px-1.5 py-0.5 mx-0.5 rounded-lg bg-teal-700 text-white font-black">
                                    {revealedKanji}
                                  </span>
                                )}
                              </React.Fragment>
                            ))
                          : question.promptPrimary}
                      </div>
                      {canPlayAudio && audioTarget && (
                        <button
                          type="button"
                          onClick={() => speakJapanese(audioTarget)}
                          className="p-2 text-slate-400 hover:text-teal-700 hover:bg-teal-50 rounded-xl cursor-pointer shrink-0"
                          title={
                            question.mode === 'sentence-cloze'
                              ? 'Nghe cả câu ví dụ'
                              : 'Nghe phát âm'
                          }
                        >
                          <Volume2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {question.promptSub && (
                      <p className="text-xs sm:text-sm text-slate-600 font-medium">
                        {question.promptSub}
                      </p>
                    )}
                  </div>
                );
              })()}

              {/* 4 Answer Options Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {question.options.map((opt, idx) => {
                  const isSelected = activeResult?.selectedOptionId === opt.id;
                  const revealedCorrectId = activeResult?.res.correctOptionId;
                  const isCorrectOpt = Boolean(revealedCorrectId && revealedCorrectId === opt.id);
                  const isWrongSelected = Boolean(
                    activeResult && isSelected && !activeResult.res.isCorrect
                  );

                  let cardClass =
                    'bg-slate-50 hover:bg-teal-50/60 border-slate-200 hover:border-teal-600 text-slate-900';
                  if (activeResult) {
                    if (isCorrectOpt) {
                      cardClass = 'bg-emerald-50 border-emerald-500 text-emerald-950';
                    } else if (isWrongSelected) {
                      cardClass = 'bg-rose-50 border-rose-500 text-rose-950';
                    } else {
                      cardClass = 'bg-slate-50/50 border-slate-200/70 text-slate-400';
                    }
                  }

                  return (
                    <button
                      key={opt.id}
                      type="button"
                      disabled={hasAnsweredCurrent || isSubmitting}
                      onClick={() => void handleSelectOption(opt.id)}
                      className={`min-h-[60px] p-3.5 rounded-xl border text-left transition-all flex items-center justify-between gap-3 ${
                        hasAnsweredCurrent ? 'cursor-default' : 'cursor-pointer active:scale-[0.99]'
                      } ${cardClass}`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className={`w-7 h-7 rounded-lg text-xs font-mono font-bold flex items-center justify-center shrink-0 ${
                            isCorrectOpt
                              ? 'bg-emerald-600 text-white'
                              : isWrongSelected
                              ? 'bg-rose-600 text-white'
                              : 'bg-white border border-slate-200 text-slate-600'
                          }`}
                        >
                          {idx + 1}
                        </span>
                        <div className="min-w-0">
                          <div
                            className={`font-bold truncate ${
                              opt.label.length <= 2 ? 'font-kanji text-2xl' : 'text-sm'
                            }`}
                          >
                            {opt.label}
                          </div>
                          {hasAnsweredCurrent &&
                            (opt.subLabel || activeResult?.res.optionSubLabels?.[opt.id]) && (
                              <div className="text-[11px] opacity-75 truncate">
                                {opt.subLabel || activeResult?.res.optionSubLabels?.[opt.id]}
                              </div>
                            )}
                        </div>
                      </div>

                      {isCorrectOpt && (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                      )}
                      {isWrongSelected && (
                        <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Result Feedback & Host Next Button */}
              {activeResult && (
                <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-100">
                  <div className="space-y-0.5 text-xs">
                    <div
                      className={`font-bold ${
                        activeResult.res.isCorrect ? 'text-emerald-700' : 'text-rose-700'
                      }`}
                    >
                      {activeResult.res.isCorrect
                        ? `Chính xác! +${activeResult.res.pointsAwarded} điểm`
                        : activeResult.selectedOptionId === '__TIMEOUT__'
                        ? 'Hết thời gian cho câu này'
                        : 'Chưa chính xác'}
                    </div>
                    {activeResult.res.explanation && (
                      <div className="text-slate-600">{activeResult.res.explanation}</div>
                    )}
                  </div>

                  {isHost && (room.advanceMode === 'host' || isRoundOver) ? (
                    <button
                      type="button"
                      disabled={isAdvancing}
                      onClick={() => {
                        if (isAdvancing) return;
                        setIsAdvancing(true);
                        void onAdvanceQuestion(qIndex).finally(() => {
                          setIsAdvancing(false);
                        });
                      }}
                      className="h-10 px-4 bg-teal-700 hover:bg-teal-800 disabled:opacity-60 text-white text-xs font-bold rounded-xl inline-flex items-center justify-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap"
                    >
                      <span>
                        {qIndex + 1 >= room.questions.length ? 'Xem tổng kết' : 'Câu tiếp theo'}
                      </span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <span className="text-xs font-medium text-slate-500">
                      {room.advanceMode === 'host'
                        ? 'Đang chờ chủ phòng chuyển câu...'
                        : allPlayersAnswered
                        ? 'Đang chuyển sang câu tiếp theo...'
                        : 'Đang chờ người chơi khác...'}
                    </span>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Live Leaderboard Side Panel for Group Rooms */}
        {!is1v1 && (
          <aside className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                <Trophy className="w-4 h-4 text-teal-700" />
                <span>Bảng điểm trực tiếp</span>
              </div>
              <span className="text-[11px] text-slate-500 tabular-nums">
                Top {Math.min(10, room.players.length)}
              </span>
            </div>

            <div className="space-y-1.5 max-h-[360px] overflow-y-auto">
              {room.players.slice(0, 12).map((p, idx) => {
                const isMe = p.playerId === currentPlayerId;
                return (
                  <div
                    key={p.playerId}
                    className={`px-3 py-2 rounded-xl border flex items-center justify-between gap-2 text-xs ${
                      isMe
                        ? 'bg-teal-50 border-teal-300 font-bold text-teal-950'
                        : 'bg-slate-50/70 border-slate-200/80 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-5 text-center font-mono text-[11px] font-bold text-slate-500 tabular-nums">
                        {idx + 1}
                      </span>
                      <span className="truncate">{p.displayName}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 tabular-nums">
                      {p.answeredCurrent && (
                        <span
                          className={`text-[10px] font-semibold ${
                            p.lastAnswerCorrect ? 'text-emerald-600' : 'text-slate-400'
                          }`}
                        >
                          {p.lastAnswerCorrect ? 'Đúng' : 'Xong'}
                        </span>
                      )}
                      <span className="font-mono font-extrabold text-slate-900">
                        {p.score}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
};
