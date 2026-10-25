import React, { useState, useEffect } from 'react';
import { KanjiDecomposition } from '../types/radical';
import { Lightbulb, Edit3, Check, RotateCcw, Sparkles } from 'lucide-react';

interface MnemonicStoryCardProps {
  decomposition: KanjiDecomposition;
}

export const MnemonicStoryCard: React.FC<MnemonicStoryCardProps> = ({ decomposition }) => {
  const localStorageKey = `mnemonic_story_${decomposition.kanji}`;
  const [story, setStory] = useState<string>(decomposition.mnemonicStory);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [tempStory, setTempStory] = useState<string>('');

  useEffect(() => {
    const saved = localStorage.getItem(localStorageKey);
    if (saved) {
      setStory(saved);
    } else {
      setStory(decomposition.mnemonicStory);
    }
  }, [decomposition.kanji, localStorageKey, decomposition.mnemonicStory]);

  const handleStartEdit = () => {
    setTempStory(story);
    setIsEditing(true);
  };

  const handleSave = () => {
    if (tempStory.trim()) {
      setStory(tempStory.trim());
      localStorage.setItem(localStorageKey, tempStory.trim());
    }
    setIsEditing(false);
  };

  const handleReset = () => {
    localStorage.removeItem(localStorageKey);
    setStory(decomposition.mnemonicStory);
    setIsEditing(false);
  };

  return (
    <div className="bg-gradient-to-br from-amber-950/30 via-slate-900 to-slate-900 border border-amber-500/30 rounded-2xl p-5 shadow-xl relative overflow-hidden">
      {/* Glow highlight effect */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-xl">
            <Lightbulb className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white flex items-center gap-2">
              Mẹo nhớ chữ {decomposition.kanji} ({decomposition.hanViet})
              <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20">
                Mnemonic Story
              </span>
            </h4>
            <p className="text-xs text-slate-400">Câu chuyện ghép từ các bộ thủ cấu thành</p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {!isEditing ? (
            <button
              onClick={handleStartEdit}
              className="px-2.5 py-1.5 text-xs font-medium text-amber-300 hover:text-white bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Edit3 className="w-3.5 h-3.5" />
              Sửa mẹo nhớ
            </button>
          ) : (
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleSave}
                className="px-2.5 py-1.5 text-xs font-medium text-emerald-300 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 rounded-lg transition-colors flex items-center gap-1"
              >
                <Check className="w-3.5 h-3.5" />
                Lưu
              </button>
              <button
                onClick={handleReset}
                className="p-1.5 text-xs text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
                title="Khôi phục mẹo nhớ mặc định"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Story Content Area */}
      {!isEditing ? (
        <div className="mt-3 p-3.5 bg-slate-950/60 rounded-xl border border-slate-800/80 text-sm text-amber-100/90 leading-relaxed font-sans">
          <p className="italic">"{story}"</p>
        </div>
      ) : (
        <div className="mt-3">
          <textarea
            value={tempStory}
            onChange={(e) => setTempStory(e.target.value)}
            rows={3}
            className="w-full p-3 bg-slate-950 border border-amber-500/40 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 resize-none"
            placeholder="Nhập câu chuyện mẹo nhớ riêng của bạn..."
          />
        </div>
      )}

      {/* Radical Elements Pills */}
      <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center gap-2 flex-wrap text-xs text-slate-400">
        <span className="flex items-center gap-1 text-amber-400/90">
          <Sparkles className="w-3.5 h-3.5" />
          Các bộ ghép:
        </span>
        {decomposition.components.map((comp, i) => (
          <span
            key={i}
            className="px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-slate-200 font-serif font-semibold"
          >
            {comp.radical} ({comp.hanViet})
          </span>
        ))}
      </div>
    </div>
  );
};
