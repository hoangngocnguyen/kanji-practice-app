import React, { useState } from 'react';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  Shuffle,
  CheckCircle2,
  Play,
} from 'lucide-react';
import { KanjiLevelTab, LEVEL_METADATA } from '../../services/kanjiLevelService';
import { generateArenaQuestions } from '../../services/arenaQuestionGenerator';
import { ArenaQuestionDraft, ArenaQuiz } from '../../types/arena';

interface ArenaQuizBuilderProps {
  initialQuiz: ArenaQuiz | null;
  isSaving: boolean;
  onBack: () => void;
  onSaveQuiz: (payload: {
    id?: string;
    title: string;
    description: string;
    levelTag: string;
    timePerQuestion: number;
    questions: ArenaQuestionDraft[];
  }) => Promise<ArenaQuiz>;
  onSaveAndLaunch: (payload: {
    id?: string;
    title: string;
    description: string;
    levelTag: string;
    timePerQuestion: number;
    questions: ArenaQuestionDraft[];
  }) => Promise<void>;
}

function createEmptyQuestion(index: number): ArenaQuestionDraft {
  const base = Date.now() + index;
  return {
    id: `custom-${base}`,
    kanji: '漢',
    mode: 'custom',
    promptPrimary: '',
    promptSub: '',
    options: [
      { id: `opt-${base}-0`, label: '' },
      { id: `opt-${base}-1`, label: '' },
      { id: `opt-${base}-2`, label: '' },
      { id: `opt-${base}-3`, label: '' },
    ],
    correctOptionId: `opt-${base}-0`,
    explanation: '',
  };
}

export const ArenaQuizBuilder: React.FC<ArenaQuizBuilderProps> = ({
  initialQuiz,
  isSaving,
  onBack,
  onSaveQuiz,
  onSaveAndLaunch,
}) => {
  const [title, setTitle] = useState<string>(initialQuiz?.title || '');
  const [description, setDescription] = useState<string>(initialQuiz?.description || '');
  const [levelTag, setLevelTag] = useState<string>(initialQuiz?.levelTag || 'N4');
  const [timePerQuestion, setTimePerQuestion] = useState<number>(
    initialQuiz?.timePerQuestion || 15
  );
  const [questions, setQuestions] = useState<ArenaQuestionDraft[]>(() =>
    initialQuiz && initialQuiz.questions.length > 0
      ? initialQuiz.questions
      : [createEmptyQuestion(0)]
  );

  const [genLevel, setGenLevel] = useState<KanjiLevelTab>('N4');
  const [genCount, setGenCount] = useState<number>(5);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleQuickGenerateAppend = async () => {
    setFormError(null);
    setIsGenerating(true);
    try {
      const generated = await generateArenaQuestions({
        sourceType: 'jlpt',
        level: genLevel,
        count: genCount,
        mode: 'mixed',
      });
      setQuestions((prev) => {
        const cleanedPrev = prev.filter(
          (q) => q.promptPrimary.trim() || q.options.some((o) => o.label.trim())
        );
        return [...cleanedPrev, ...generated].slice(0, 50);
      });
      if (!title.trim()) {
        setTitle(`Đề kiểm tra Kanji ${genLevel === 'JOYO' ? 'Jōyō' : genLevel}`);
      }
      setLevelTag(genLevel);
    } catch (err: any) {
      setFormError(err?.message || 'Không thể sinh câu hỏi mẫu.');
    } finally {
      setIsGenerating(false);
    }
  };

  const updateQuestion = (idx: number, patch: Partial<ArenaQuestionDraft>) => {
    setQuestions((prev) => prev.map((q, i) => (i === idx ? { ...q, ...patch } : q)));
  };

  const updateOptionLabel = (qIdx: number, optIdx: number, value: string) => {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== qIdx) return q;
        const nextOpts = q.options.map((opt, j) =>
          j === optIdx ? { ...opt, label: value } : opt
        );
        return { ...q, options: nextOpts };
      })
    );
  };

  const removeQuestion = (idx: number) => {
    setQuestions((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== idx)));
  };

  const validateAndBuildPayload = () => {
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      setFormError('Vui lòng nhập tên bộ đề.');
      return null;
    }

    const validQuestions: ArenaQuestionDraft[] = [];
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const cleanPrompt = q.promptPrimary.trim();
      const cleanKanji = Array.from(q.kanji.trim())[0] || Array.from(cleanPrompt)[0] || '漢';
      const filledOpts = q.options
        .map((o) => ({ ...o, label: o.label.trim() }))
        .filter((o) => Boolean(o.label));

      if (!cleanPrompt || filledOpts.length < 2) {
        setFormError(
          `Câu ${i + 1} chưa đủ nội dung đề bài hoặc cần ít nhất 2 đáp án.`
        );
        return null;
      }

      const correctExists = filledOpts.some((o) => o.id === q.correctOptionId);
      if (!correctExists) {
        setFormError(`Câu ${i + 1} chưa chọn đáp án đúng.`);
        return null;
      }

      validQuestions.push({
        ...q,
        kanji: cleanKanji,
        promptPrimary: cleanPrompt,
        options: filledOpts,
      });
    }

    setFormError(null);
    return {
      id: initialQuiz?.id,
      title: cleanTitle,
      description: description.trim(),
      levelTag,
      timePerQuestion,
      questions: validQuestions,
    };
  };

  const handleSave = async () => {
    const payload = validateAndBuildPayload();
    if (!payload) return;
    await onSaveQuiz(payload);
  };

  const handleSaveAndLaunch = async () => {
    const payload = validateAndBuildPayload();
    if (!payload) return;
    await onSaveAndLaunch(payload);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-5 pb-10">
      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Quay lại sảnh</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={isSaving}
            onClick={() => void handleSave()}
            className="h-10 px-4 text-xs font-bold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-xl inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? 'Đang lưu...' : 'Lưu bộ đề'}</span>
          </button>

          <button
            type="button"
            disabled={isSaving}
            onClick={() => void handleSaveAndLaunch()}
            className="h-10 px-4 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-xl inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <Play className="w-3.5 h-3.5" />
            <span>Lưu &amp; Mở phòng ngay</span>
          </button>
        </div>
      </div>

      {formError && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-800">
          {formError}
        </div>
      )}

      {/* Quiz Metadata */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 grid grid-cols-1 md:grid-cols-12 gap-4">
        <div className="md:col-span-6">
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Tên bộ đề
          </label>
          <input
            type="text"
            maxLength={120}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ví dụ: Kiểm tra nhanh Kanji N4 Tuần 3"
            className="w-full h-10 px-3 text-sm bg-slate-50 focus:bg-white rounded-xl border border-slate-200 focus:outline-none focus:border-teal-700"
          />
        </div>

        <div className="md:col-span-3">
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Nhãn cấp độ
          </label>
          <select
            value={levelTag}
            onChange={(e) => setLevelTag(e.target.value)}
            className="w-full h-10 px-3 text-xs font-medium bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:border-teal-700"
          >
            {LEVEL_METADATA.map((l) => (
              <option key={l.key} value={l.key}>
                {l.label}
              </option>
            ))}
            <option value="MIXED">Tổng hợp</option>
          </select>
        </div>

        <div className="md:col-span-3">
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Thời gian mỗi câu
          </label>
          <select
            value={timePerQuestion}
            onChange={(e) => setTimePerQuestion(Number(e.target.value))}
            className="w-full h-10 px-3 text-xs font-medium bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:border-teal-700 tabular-nums"
          >
            <option value={10}>10 giây</option>
            <option value={15}>15 giây</option>
            <option value={20}>20 giây</option>
            <option value={30}>30 giây</option>
            <option value={45}>45 giây</option>
          </select>
        </div>

        <div className="md:col-span-12">
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Mô tả ngắn (không bắt buộc)
          </label>
          <input
            type="text"
            maxLength={300}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Chủ đề bài học hoặc ghi chú cho bạn bè trước khi thi..."
            className="w-full h-10 px-3 text-xs bg-slate-50 focus:bg-white rounded-xl border border-slate-200 focus:outline-none focus:border-teal-700"
          />
        </div>
      </div>

      {/* Quick Auto-populate Bar */}
      <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs text-slate-700">
          <strong className="text-slate-900">Nạp nhanh từ kho JLPT:</strong> Thêm nhanh câu hỏi chuẩn để tiết kiệm thời gian soạn.
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={genLevel}
            onChange={(e) => setGenLevel(e.target.value as KanjiLevelTab)}
            className="h-9 px-2.5 text-xs font-semibold bg-white border border-slate-200 rounded-lg"
          >
            {LEVEL_METADATA.map((l) => (
              <option key={l.key} value={l.key}>
                {l.shortLabel}
              </option>
            ))}
          </select>
          <select
            value={genCount}
            onChange={(e) => setGenCount(Number(e.target.value))}
            className="h-9 px-2.5 text-xs font-semibold bg-white border border-slate-200 rounded-lg tabular-nums"
          >
            <option value={3}>+ 3 câu</option>
            <option value={5}>+ 5 câu</option>
            <option value={10}>+ 10 câu</option>
          </select>
          <button
            type="button"
            disabled={isGenerating}
            onClick={() => void handleQuickGenerateAppend()}
            className="h-9 px-3.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Shuffle className="w-3.5 h-3.5" />
            <span>{isGenerating ? 'Đang sinh...' : 'Thêm vào đề'}</span>
          </button>
        </div>
      </div>

      {/* Questions List */}
      <div className="space-y-4">
        {questions.map((q, qIdx) => (
          <div
            key={q.id}
            className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-extrabold text-slate-900 tabular-nums">
                Câu {qIdx + 1} / {questions.length}
              </span>
              <button
                type="button"
                disabled={questions.length <= 1}
                onClick={() => removeQuestion(qIdx)}
                className="p-1.5 text-slate-400 hover:text-rose-600 disabled:opacity-30 rounded-lg cursor-pointer"
                title="Xóa câu hỏi"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Chữ Kanji chính
                </label>
                <input
                  type="text"
                  maxLength={4}
                  value={q.kanji}
                  onChange={(e) => updateQuestion(qIdx, { kanji: e.target.value })}
                  className="w-full h-11 px-2 text-center font-kanji text-xl font-bold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-teal-700"
                />
              </div>
              <div className="sm:col-span-6">
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Nội dung câu hỏi
                </label>
                <input
                  type="text"
                  value={q.promptPrimary}
                  onChange={(e) => updateQuestion(qIdx, { promptPrimary: e.target.value })}
                  placeholder="VD: Chữ 「駅」 có nghĩa là gì?"
                  className="w-full h-11 px-3 text-sm bg-slate-50 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-teal-700"
                />
              </div>
              <div className="sm:col-span-4">
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Gợi ý phụ (không bắt buộc)
                </label>
                <input
                  type="text"
                  value={q.promptSub || ''}
                  onChange={(e) => updateQuestion(qIdx, { promptSub: e.target.value })}
                  placeholder="VD: Hán-Việt: DỊCH"
                  className="w-full h-11 px-3 text-xs bg-slate-50 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-teal-700"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {q.options.map((opt, optIdx) => {
                const isCorrect = q.correctOptionId === opt.id;
                return (
                  <div
                    key={opt.id}
                    className={`flex items-center gap-2 p-2 rounded-xl border transition-colors ${
                      isCorrect
                        ? 'bg-emerald-50/70 border-emerald-500'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => updateQuestion(qIdx, { correctOptionId: opt.id })}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 cursor-pointer transition-colors ${
                        isCorrect
                          ? 'bg-emerald-600 text-white'
                          : 'bg-white border border-slate-200 text-slate-400 hover:text-emerald-600'
                      }`}
                      title="Đặt làm đáp án đúng"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </button>
                    <input
                      type="text"
                      value={opt.label}
                      onChange={(e) => updateOptionLabel(qIdx, optIdx, e.target.value)}
                      placeholder={`Đáp án ${String.fromCharCode(65 + optIdx)}`}
                      className="flex-1 min-w-0 bg-transparent text-xs font-medium text-slate-800 focus:outline-none"
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setQuestions((prev) => [...prev, createEmptyQuestion(prev.length)])}
        className="w-full py-3.5 border border-dashed border-slate-300 hover:border-teal-600 hover:bg-teal-50/40 rounded-2xl text-xs font-bold text-slate-600 hover:text-teal-800 flex items-center justify-center gap-2 cursor-pointer transition-colors"
      >
        <Plus className="w-4 h-4" />
        <span>Thêm câu hỏi mới</span>
      </button>
    </div>
  );
};
