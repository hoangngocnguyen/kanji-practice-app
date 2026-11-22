import { fetchKanjiSvg, saveKanjiSvgToCache } from './kanji';
import { Point, sampleSvgPathPoints } from './strokeMatcher';

export interface ParsedKanjiStroke {
  id: string;
  d: string;
  index: number;
}

export interface LoadedKanjiStrokes {
  kanji: string;
  hex: string;
  svgUrl: string;
  strokes: ParsedKanjiStroke[];
  startPoints: Point[];
}

const PARSED_STROKES_CACHE = new Map<string, LoadedKanjiStrokes>();

export function getKanjiSvgMeta(kanjiChar: string): { hex: string; svgUrl: string } {
  const codePoint = kanjiChar.codePointAt(0) ?? kanjiChar.charCodeAt(0);
  const hex = codePoint.toString(16).toLowerCase().padStart(5, '0');
  return {
    hex,
    svgUrl: `https://cdn.jsdelivr.net/gh/kanjivg/kanjivg/kanji/${hex}.svg`,
  };
}

export async function loadKanjiStrokes(kanjiChar: string): Promise<LoadedKanjiStrokes> {
  const cleanChar = Array.from(kanjiChar || '').find((ch) => /\p{Script=Han}/u.test(ch)) || kanjiChar;
  if (!cleanChar) {
    throw new Error('Ký tự Kanji không hợp lệ.');
  }

  const cached = PARSED_STROKES_CACHE.get(cleanChar);
  if (cached) return cached;

  const { hex, svgUrl } = getKanjiSvgMeta(cleanChar);
  const svgText = await fetchKanjiSvg(svgUrl, hex);
  saveKanjiSvgToCache(svgUrl, svgText);

  const parser = new DOMParser();
  const doc = parser.parseFromString(svgText, 'image/svg+xml');
  const pathElements = Array.from(doc.querySelectorAll('path[d]'));

  const strokes: ParsedKanjiStroke[] = pathElements
    .map((el, i) => ({
      id: el.getAttribute('id') || `kvg-${hex}-s${i + 1}`,
      d: el.getAttribute('d') || '',
      index: i,
    }))
    .filter((s) => s.d.length > 0);

  const startPoints = strokes.map((s) => {
    const pts = sampleSvgPathPoints(s.d, 4);
    return pts[0] || { x: 50, y: 50 };
  });

  const result: LoadedKanjiStrokes = {
    kanji: cleanChar,
    hex,
    svgUrl,
    strokes,
    startPoints,
  };

  if (strokes.length > 0) {
    PARSED_STROKES_CACHE.set(cleanChar, result);
  }
  return result;
}
