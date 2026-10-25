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
    <div className="bg-amber-50/90 border border-amber-200/90 rounded-2xl p-5 shadow-xs relative overflow-hidden">
      {/* Glow highlight effect */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-amber-200/30 rounded-full blur-2xl pointer-events-none" />

      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-amber-100 text-amber-800 border border-amber-300 rounded-xl">
            <Lightbulb className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-extrabold text-amber-950 flex items-center gap-2">
              Mẹo nhớ chữ {decomposition.kanji} ({decomposition.hanViet})
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                Mnemonic Story
              </span>
            </h4>
            <p className="text-xs text-amber-800/80">Câu chuyện ghép từ các bộ thủ cấu thành</p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {!isEditing ? (
            <button
              onClick={handleStartEdit}
              className="px-2.5 py-1.5 text-xs font-bold text-amber-900 hover:text-amber-950 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Edit3 className="w-3.5 h-3.5" />
              Sửa mẹo nhớ
            </button>
          ) : (
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleSave}
                className="px-2.5 py-1.5 text-xs font-bold text-emerald-900 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 rounded-xl transition-colors flex items-center gap-1 cursor-pointer shadow-2xs"
              >
                <Check className="w-3.5 h-3.5 text-emerald-700" />
                Lưu
              </button>
              <button
                onClick={handleReset}
                className="p-1.5 text-xs text-amber-800 hover:text-amber-950 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-xl transition-colors cursor-pointer"
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
        <div className="mt-3 p-3.5 bg-white/90 rounded-xl border border-amber-200/80 text-sm text-amber-950 leading-relaxed font-sans shadow-2xs">
          <p className="italic font-medium">"{story}"</p>
        </div>
      ) : (
        <div className="mt-3">
          <textarea
            value={tempStory}
            onChange={(e) => setTempStory(e.target.value)}
            rows={3}
            className="w-full p-3 bg-white border border-amber-400 rounded-xl text-sm text-slate-900 placeholder-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 resize-none font-medium shadow-2xs"
            placeholder="Nhập câu chuyện mẹo nhớ riêng của bạn..."
          />
        </div>
      )}

      {/* Radical Elements Pills */}
      <div className="mt-3 pt-3 border-t border-amber-200/80 flex items-center gap-2 flex-wrap text-xs text-amber-900">
        <span className="flex items-center gap-1 font-bold text-amber-800">
          <Sparkles className="w-3.5 h-3.5 text-amber-600" />
          Các bộ ghép:
        </span>
        {decomposition.components.map((comp, i) => (
          <span
            key={i}
            className="px-2 py-0.5 rounded-lg bg-white border border-amber-200/90 text-amber-950 font-serif font-bold shadow-2xs"
          >
            {comp.radical} ({comp.hanViet})
          </span>
        ))}
      </div>
    </div>
  );
};
