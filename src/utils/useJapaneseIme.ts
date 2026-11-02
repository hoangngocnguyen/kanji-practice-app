import { useState, useRef, useCallback } from 'react';
import { romajiToKana, KanaMode } from './romajiConverter';
import {
  ImeCandidate,
  resolveImeCandidates,
  resolveImeCandidatesSync,
  getActiveComposition,
} from './kanjiImeEngine';

export interface UseJapaneseImeOptions {
  value: string;
  onChange: (newValue: string) => void;
  mode: KanaMode;
}

export function useJapaneseIme<T extends HTMLInputElement | HTMLTextAreaElement>({
  value,
  onChange,
  mode,
}: UseJapaneseImeOptions) {
  const inputRef = useRef<T>(null);

  const [imeState, setImeState] = useState<{
    isOpen: boolean;
    reading: string;
    start: number;
    end: number;
    candidates: ImeCandidate[];
    selectedIndex: number;
    position: { top: number; left: number } | null;
    isLoading: boolean;
  }>({
    isOpen: false,
    reading: '',
    start: 0,
    end: 0,
    candidates: [],
    selectedIndex: 0,
    position: null,
    isLoading: false,
  });

  const closeIme = useCallback(() => {
    setImeState((prev) => ({ ...prev, isOpen: false }));
  }, []);

  const commitCandidate = useCallback(
    (candidate: ImeCandidate) => {
      const el = inputRef.current;
      const start = imeState.start;
      const end = imeState.end;
      const newWord = candidate.word;

      const newText = value.slice(0, start) + newWord + value.slice(end);
      onChange(newText);
      setImeState((prev) => ({ ...prev, isOpen: false }));

      setTimeout(() => {
        if (el) {
          el.focus();
          const newCaret = start + newWord.length;
          el.setSelectionRange(newCaret, newCaret);
        }
      }, 10);
    },
    [value, imeState.start, imeState.end, onChange]
  );

  const handleKeyDown = useCallback(
    async (e: React.KeyboardEvent<T>) => {
      const el = inputRef.current;
      if (!el) return;

      // When candidate popup is active
      if (imeState.isOpen) {
        if (e.key === 'Escape') {
          e.preventDefault();
          closeIme();
          return;
        }

        if (e.key === ' ' || e.key === 'Spacebar' || e.key === 'Tab') {
          e.preventDefault();
          setImeState((prev) => ({
            ...prev,
            selectedIndex: (prev.selectedIndex + 1) % prev.candidates.length,
          }));
          return;
        }

        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setImeState((prev) => ({
            ...prev,
            selectedIndex: (prev.selectedIndex + 1) % prev.candidates.length,
          }));
          return;
        }

        if (e.key === 'ArrowUp') {
          e.preventDefault();
          setImeState((prev) => ({
            ...prev,
            selectedIndex:
              (prev.selectedIndex - 1 + prev.candidates.length) % prev.candidates.length,
          }));
          return;
        }

        if (e.key === 'Enter') {
          e.preventDefault();
          const selected = imeState.candidates[imeState.selectedIndex];
          if (selected) {
            commitCandidate(selected);
          }
          return;
        }

        if (/^[1-9]$/.test(e.key)) {
          const idx = parseInt(e.key, 10) - 1;
          if (idx < imeState.candidates.length) {
            e.preventDefault();
            commitCandidate(imeState.candidates[idx]);
            return;
          }
        }
      }

      // Trigger candidate menu on Space or Tab in 'kanji' or 'hiragana' mode
      if (
        (mode === 'kanji' || mode === 'hiragana') &&
        (e.key === ' ' || e.key === 'Tab') &&
        !e.shiftKey &&
        !e.ctrlKey &&
        !e.altKey &&
        !e.metaKey
      ) {
        const caretPos = el.selectionStart || 0;
        const comp = getActiveComposition(value, caretPos);

        if (comp && comp.raw.trim().length > 0) {
          e.preventDefault();
          const reading = comp.reading;
          const syncCandidates = resolveImeCandidatesSync(reading);

          const pos = {
            top: el.offsetTop + el.offsetHeight + 6,
            left: Math.min(el.offsetLeft + 4, window.innerWidth - 340),
          };

          setImeState({
            isOpen: true,
            reading,
            start: comp.start,
            end: comp.end,
            candidates: syncCandidates,
            selectedIndex: 0,
            position: pos,
            isLoading: true,
          });

          // Resolve full candidates via API + offline
          resolveImeCandidates(reading, true).then((fullCandidates) => {
            setImeState((prev) => {
              if (!prev.isOpen || prev.reading !== reading) return prev;
              return {
                ...prev,
                candidates: fullCandidates.length > 0 ? fullCandidates : prev.candidates,
                isLoading: false,
              };
            });
          });
          return;
        }
      }
    },
    [imeState, mode, value, closeIme, commitCandidate]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<T>) => {
      const rawVal = e.target.value;
      if (mode === 'kanji') {
        // In Kanji mode, keep raw romaji while typing; convert when pressing Tab/Space
        onChange(rawVal);
      } else if (mode === 'hiragana') {
        const converted = romajiToKana(rawVal, 'hiragana', false);
        onChange(converted);
      } else if (mode === 'katakana') {
        const converted = romajiToKana(rawVal, 'katakana', false);
        onChange(converted);
      } else {
        onChange(rawVal);
      }

      if (imeState.isOpen) {
        setImeState((prev) => ({ ...prev, isOpen: false }));
      }
    },
    [mode, onChange, imeState.isOpen]
  );

  return {
    inputRef,
    imeState,
    commitCandidate,
    closeIme,
    handleKeyDown,
    handleChange,
  };
}
