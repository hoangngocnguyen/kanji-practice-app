import { KANJI_DICTIONARY, SINO_VIETNAMESE_MAP } from '../data/kanjiDictionary';
import { hiraganaToKatakana, katakanaToHiragana, romajiToKana } from './romajiConverter';

export interface ImeCandidate {
  id: string;
  word: string;
  reading: string;
  hanViet?: string;
  meaning?: string;
  source: 'dictionary' | 'example' | 'api' | 'kana';
  isRawKana?: boolean;
}

// In-memory cache for API requests
const apiCache = new Map<string, string[]>();

// Inverted index mapping: Hiragana reading -> ImeCandidate[]
let invertedIndex: Map<string, ImeCandidate[]> | null = null;

// Initialize the inverted index from local KANJI_DICTIONARY and examples
function getInvertedIndex(): Map<string, ImeCandidate[]> {
  if (invertedIndex) return invertedIndex;

  const index = new Map<string, ImeCandidate[]>();

  const addEntry = (reading: string, candidate: ImeCandidate) => {
    if (!reading) return;
    const cleanReading = reading.trim();
    if (!cleanReading) return;
    const existing = index.get(cleanReading) || [];
    // Avoid duplicate words for the same reading
    if (!existing.some((c) => c.word === candidate.word)) {
      existing.push(candidate);
      index.set(cleanReading, existing);
    }
  };

  // 1. Index all curated Kanji in KANJI_DICTIONARY
  for (const [char, detail] of Object.entries(KANJI_DICTIONARY)) {
    const primaryMeaning = detail.meanings?.[0] || '';
    const hanViet = detail.hanViet || SINO_VIETNAMESE_MAP[char] || '';

    // Kun-yomi readings (e.g. "た.べる", "ひ", "うた.う")
    if (detail.kun && Array.isArray(detail.kun)) {
      for (const kun of detail.kun) {
        if (!kun) continue;
        // Check for okurigana dot (e.g. "た.べる")
        if (kun.includes('.')) {
          const [prefix, suffix] = kun.split('.');
          const fullWord = char + (suffix || '');
          const fullReading = prefix.replace(/[-・]/g, '') + (suffix || '');
          addEntry(fullReading, {
            id: `kun-${fullWord}-${fullReading}`,
            word: fullWord,
            reading: fullReading,
            hanViet,
            meaning: primaryMeaning,
            source: 'dictionary',
          });
        }

        // Also add the bare reading without dots/dashes
        const bareReading = kun.replace(/[-・.]/g, '');
        if (bareReading) {
          addEntry(bareReading, {
            id: `kun-bare-${char}-${bareReading}`,
            word: char,
            reading: bareReading,
            hanViet,
            meaning: primaryMeaning,
            source: 'dictionary',
          });
        }
      }
    }

    // On-yomi readings (Katakana converted to Hiragana, e.g. "ショク" -> "しょく")
    if (detail.on && Array.isArray(detail.on)) {
      for (const on of detail.on) {
        if (!on) continue;
        const cleanOn = on.replace(/[-・.]/g, '');
        const hiraganaOn = katakanaToHiragana(cleanOn);
        if (hiraganaOn) {
          addEntry(hiraganaOn, {
            id: `on-${char}-${hiraganaOn}`,
            word: char,
            reading: hiraganaOn,
            hanViet,
            meaning: primaryMeaning,
            source: 'dictionary',
          });
        }
      }
    }

    // Example compound words (e.g. "日本", "歌手", "中心")
    if (detail.examples && Array.isArray(detail.examples)) {
      for (const ex of detail.examples) {
        if (!ex.word || !ex.reading) continue;
        addEntry(ex.reading, {
          id: `ex-${ex.word}-${ex.reading}`,
          word: ex.word,
          reading: ex.reading,
          hanViet: ex.hanViet,
          meaning: ex.meaning,
          source: 'example',
        });
      }
    }
  }

  invertedIndex = index;
  return index;
}

/**
 * Returns Sino-Vietnamese reading for a compound word (e.g. "日本" -> "NHẬT BẢN").
 */
export function getCompoundHanViet(word: string): string {
  const parts: string[] = [];
  for (const ch of word) {
    if (SINO_VIETNAMESE_MAP[ch]) {
      parts.push(SINO_VIETNAMESE_MAP[ch]);
    } else if (KANJI_DICTIONARY[ch]?.hanViet) {
      parts.push(KANJI_DICTIONARY[ch].hanViet);
    }
  }
  return parts.join(' ');
}

/**
 * Fetches contextual transliteration candidates using Google Input Tools API.
 * Returns an array of candidate strings (e.g. ["日本", "二本", "にほん", "ニホン"]).
 */
export async function fetchContextCandidates(hiragana: string): Promise<string[]> {
  if (!hiragana || !hiragana.trim()) return [];
  const clean = hiragana.trim();
  if (apiCache.has(clean)) {
    return apiCache.get(clean)!;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1400);

    const url = `https://inputtools.google.com/request?text=${encodeURIComponent(
      clean
    )}&itc=ja-t-i0-und&num=10`;

    const resp = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!resp.ok) return [];
    const data = await resp.json();

    if (data && data[0] === 'SUCCESS' && Array.isArray(data[1]) && data[1][0]) {
      const candidates: string[] = data[1][0][1] || [];
      apiCache.set(clean, candidates);
      return candidates;
    }
  } catch (e) {
    // Graceful offline fallback
  }

  return [];
}

/**
 * Synchronous resolver for immediate offline candidates.
 */
export function getOfflineCandidates(hiragana: string): ImeCandidate[] {
  if (!hiragana || !hiragana.trim()) return [];
  const index = getInvertedIndex();
  const matched = index.get(hiragana.trim()) || [];
  return [...matched];
}

/**
 * Synchronous resolver for immediate offline candidates + raw kana fallbacks.
 */
export function resolveImeCandidatesSync(hiragana: string): ImeCandidate[] {
  const clean = hiragana.trim();
  if (!clean) return [];

  const candidates: ImeCandidate[] = [];
  const seenWords = new Set<string>();

  const offlineList = getOfflineCandidates(clean);
  for (const item of offlineList) {
    if (!seenWords.has(item.word)) {
      seenWords.add(item.word);
      candidates.push(item);
    }
  }

  if (!seenWords.has(clean)) {
    candidates.push({
      id: `kana-hira-${clean}`,
      word: clean,
      reading: clean,
      meaning: 'Hiragana nguyên bản',
      source: 'kana',
      isRawKana: true,
    });
    seenWords.add(clean);
  }

  const katakana = hiraganaToKatakana(clean);
  if (!seenWords.has(katakana)) {
    candidates.push({
      id: `kana-kata-${katakana}`,
      word: katakana,
      reading: clean,
      meaning: 'Katakana nguyên bản',
      source: 'kana',
      isRawKana: true,
    });
    seenWords.add(katakana);
  }

  return candidates.slice(0, 10);
}

/**
 * Resolves full list of IME candidates (Offline dictionary + API + Raw Hiragana/Katakana).
 */
export async function resolveImeCandidates(
  hiragana: string,
  includeApi: boolean = true
): Promise<ImeCandidate[]> {
  const clean = hiragana.trim();
  if (!clean) return [];

  const candidates: ImeCandidate[] = [];
  const seenWords = new Set<string>();

  // 1. Offline dictionary candidates (instant)
  const offlineList = getOfflineCandidates(clean);
  for (const item of offlineList) {
    if (!seenWords.has(item.word)) {
      seenWords.add(item.word);
      candidates.push(item);
    }
  }

  // 2. Online context candidates via Google Transliterate API
  if (includeApi) {
    try {
      const apiWords = await fetchContextCandidates(clean);
      for (const word of apiWords) {
        if (!seenWords.has(word)) {
          seenWords.add(word);
          const hanViet = getCompoundHanViet(word);
          // Check if this word exists in examples
          let meaning = '';
          for (const ch of word) {
            if (KANJI_DICTIONARY[ch]?.meanings?.[0]) {
              meaning = KANJI_DICTIONARY[ch].meanings[0];
              break;
            }
          }

          candidates.push({
            id: `api-${word}`,
            word,
            reading: clean,
            hanViet: hanViet || undefined,
            meaning: meaning || undefined,
            source: 'api',
          });
        }
      }
    } catch {
      // Fallback
    }
  }

  // 3. Always ensure Hiragana option is available
  if (!seenWords.has(clean)) {
    candidates.push({
      id: `kana-hira-${clean}`,
      word: clean,
      reading: clean,
      meaning: 'Hiragana nguyên bản',
      source: 'kana',
      isRawKana: true,
    });
    seenWords.add(clean);
  }

  // 4. Always ensure Katakana option is available
  const katakana = hiraganaToKatakana(clean);
  if (!seenWords.has(katakana)) {
    candidates.push({
      id: `kana-kata-${katakana}`,
      word: katakana,
      reading: clean,
      meaning: 'Katakana nguyên bản',
      source: 'kana',
      isRawKana: true,
    });
    seenWords.add(katakana);
  }

  return candidates.slice(0, 10);
}

/**
 * Check if character is Japanese Kana (Hiragana or Katakana, including prolonged sound).
 */
export function isKanaChar(char: string): boolean {
  if (!char) return false;
  const code = char.charCodeAt(0);
  // Hiragana: 0x3040 - 0x309F
  // Katakana: 0x30A0 - 0x30FF
  // Prolonged sound mark ー: 0x30FC
  return (
    (code >= 0x3040 && code <= 0x309F) ||
    (code >= 0x30A0 && code <= 0x30FF) ||
    code === 0x30fc
  );
}

/**
 * Check if character is a Latin letter, digit, hyphen or apostrophe used in Romaji.
 */
export function isRomajiLetter(char: string): boolean {
  if (!char) return false;
  return /[a-zA-Z0-9'\-]/.test(char);
}

/**
 * Check if character is a composition candidate (either Kana or Romaji).
 */
export function isCompositionChar(char: string): boolean {
  return isKanaChar(char) || isRomajiLetter(char);
}

export interface CompositionRange {
  raw: string; // The raw characters in the text (e.g. "hana" or "はな")
  reading: string; // Hiragana reading (e.g. "はな")
  start: number;
  end: number;
  isRomaji: boolean;
}

/**
 * Extract active composition word (Romaji or Kana) preceding or at the current caret position.
 */
export function getActiveComposition(
  text: string,
  caretPos: number
): CompositionRange | null {
  if (!text || caretPos <= 0) return null;

  let start = caretPos;
  // Scan backwards while characters are composition chars (Kana or Romaji)
  while (start > 0 && isCompositionChar(text[start - 1])) {
    start--;
  }

  let end = caretPos;
  // Scan forwards while characters are composition chars
  while (end < text.length && isCompositionChar(text[end])) {
    end++;
  }

  if (start === end) return null;

  const raw = text.slice(start, end);
  if (!raw.trim()) return null;

  const containsRomaji = /[a-zA-Z]/.test(raw);
  const reading = containsRomaji
    ? romajiToKana(raw, 'hiragana', true)
    : raw;

  return {
    raw,
    reading,
    start,
    end,
    isRomaji: containsRomaji,
  };
}

/**
 * Backward compatibility alias for getActiveComposition.
 */
export function getActiveKanaComposition(
  text: string,
  caretPos: number
): { word: string; start: number; end: number } | null {
  const comp = getActiveComposition(text, caretPos);
  if (!comp) return null;
  return {
    word: comp.reading,
    start: comp.start,
    end: comp.end,
  };
}
