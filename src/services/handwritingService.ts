import { Point } from '../utils/strokeMatcher';
import { getKanjiInfo } from '../data/kanjiDictionary';
import { KanjiCatalogEntry, loadKanjiJoyoCatalog } from './kanjiLevelService';

export interface HandwritingCandidate {
  kanji: string;
  strokeCount: number;
  hanViet: string;
  meaning: string;
  level: string;
  score: number;
}

interface IndexedStroke {
  pts: [number, number, number, number, number, number, number, number];
  dx: number;
  dy: number;
  cx: number;
  cy: number;
}

interface IndexedKanjiEntry {
  kanji: string;
  strokeCount: number;
  strokes: IndexedStroke[];
  freqRank: number; // Lower = more common (Joyo priority)
  level: string;
  hanViet: string;
  meaning: string;
}

let cachedIndex: IndexedKanjiEntry[] | null = null;
let loadPromise: Promise<IndexedKanjiEntry[]> | null = null;

function parseCompactStrokeString(encoded: string): IndexedStroke[] {
  const parts = encoded.split('|');
  const strokes: IndexedStroke[] = [];
  for (const seg of parts) {
    if (seg.length < 16) continue;
    const x0 = parseInt(seg.slice(0, 2), 10);
    const y0 = parseInt(seg.slice(2, 4), 10);
    const x1 = parseInt(seg.slice(4, 6), 10);
    const y1 = parseInt(seg.slice(6, 8), 10);
    const x2 = parseInt(seg.slice(8, 10), 10);
    const y2 = parseInt(seg.slice(10, 12), 10);
    const x3 = parseInt(seg.slice(12, 14), 10);
    const y3 = parseInt(seg.slice(14, 16), 10);

    const dxRaw = x3 - x0;
    const dyRaw = y3 - y0;
    const len = Math.hypot(dxRaw, dyRaw) || 1;
    strokes.push({
      pts: [x0, y0, x1, y1, x2, y2, x3, y3],
      dx: dxRaw / len,
      dy: dyRaw / len,
      cx: (x0 + x1 + x2 + x3) * 0.25,
      cy: (y0 + y1 + y2 + y3) * 0.25,
    });
  }
  return strokes;
}

export async function loadHandwritingIndex(): Promise<IndexedKanjiEntry[]> {
  if (cachedIndex) return cachedIndex;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    const [hwRes, joyoList] = await Promise.all([
      fetch('/data/kanji_handwriting_index.json'),
      loadKanjiJoyoCatalog().catch(() => [] as KanjiCatalogEntry[]),
    ]);

    if (!hwRes.ok) {
      throw new Error('Không thể tải dữ liệu nhận diện nét vẽ chữ Hán.');
    }

    const rawMap = (await hwRes.json()) as Record<string, string>;
    const joyoMap = new Map<string, KanjiCatalogEntry>();
    for (const item of joyoList) {
      joyoMap.set(item.c, item);
    }

    const entries: IndexedKanjiEntry[] = [];
    for (const [kanji, encoded] of Object.entries(rawMap)) {
      const strokes = parseCompactStrokeString(encoded);
      if (strokes.length === 0) continue;
      const joyo = joyoMap.get(kanji);
      const localDict = getKanjiInfo(kanji);

      entries.push({
        kanji,
        strokeCount: strokes.length,
        strokes,
        freqRank: joyo ? (joyo.fr || 2200) : 5000,
        level: joyo?.lv || 'EXT',
        hanViet: joyo?.hv || localDict?.hanViet || '',
        meaning: joyo?.vi?.[0] || localDict?.meanings?.[0] || '',
      });
    }

    cachedIndex = entries;
    return entries;
  })();

  try {
    return await loadPromise;
  } catch (err) {
    loadPromise = null;
    throw err;
  }
}

function resampleStroke4(rawPoints: Point[], width: number, height: number): IndexedStroke | null {
  if (!rawPoints || rawPoints.length < 2 || width <= 0 || height <= 0) return null;

  const norm = rawPoints.map((p) => ({
    x: Math.max(0, Math.min(99, (p.x / width) * 99)),
    y: Math.max(0, Math.min(99, (p.y / height) * 99)),
  }));

  const dists = [0];
  let total = 0;
  for (let i = 1; i < norm.length; i++) {
    total += Math.hypot(norm[i].x - norm[i - 1].x, norm[i].y - norm[i - 1].y);
    dists.push(total);
  }

  const out: number[] = [];
  let seg = 0;
  for (let k = 0; k < 4; k++) {
    const target = total > 0 ? (k / 3) * total : 0;
    while (seg < dists.length - 2 && dists[seg + 1] < target) seg++;
    const segLen = dists[seg + 1] - dists[seg];
    const t = segLen > 0.0001 ? (target - dists[seg]) / segLen : 0;
    out.push(norm[seg].x + t * (norm[seg + 1].x - norm[seg].x));
    out.push(norm[seg].y + t * (norm[seg + 1].y - norm[seg].y));
  }

  const pts = out as [number, number, number, number, number, number, number, number];
  const dxRaw = pts[6] - pts[0];
  const dyRaw = pts[7] - pts[1];
  const len = Math.hypot(dxRaw, dyRaw) || 1;
  return {
    pts,
    dx: dxRaw / len,
    dy: dyRaw / len,
    cx: (pts[0] + pts[2] + pts[4] + pts[6]) * 0.25,
    cy: (pts[1] + pts[3] + pts[5] + pts[7]) * 0.25,
  };
}

/**
 * Also prepares a bounding-box-normalized variant of user strokes so characters drawn slightly
 * off-center or smaller inside the pad still align cleanly against centered KanjiVG glyphs.
 */
function buildBBoxNormalizedStrokes(strokes: IndexedStroke[]): IndexedStroke[] {
  let minX = 99, minY = 99, maxX = 0, maxY = 0;
  for (const s of strokes) {
    for (let i = 0; i < 8; i += 2) {
      if (s.pts[i] < minX) minX = s.pts[i];
      if (s.pts[i] > maxX) maxX = s.pts[i];
      if (s.pts[i + 1] < minY) minY = s.pts[i + 1];
      if (s.pts[i + 1] > maxY) maxY = s.pts[i + 1];
    }
  }
  const spanW = maxX - minX;
  const spanH = maxY - minY;
  // Do not stretch pure 1-stroke horizontal/vertical lines disproportionately
  const span = Math.max(spanW, spanH, 28);
  const pad = 12;
  const scale = (99 - pad * 2) / span;
  const offsetX = (99 - spanW * scale) * 0.5 - minX * scale;
  const offsetY = (99 - spanH * scale) * 0.5 - minY * scale;

  return strokes.map((s) => {
    const pts = [
      s.pts[0] * scale + offsetX,
      s.pts[1] * scale + offsetY,
      s.pts[2] * scale + offsetX,
      s.pts[3] * scale + offsetY,
      s.pts[4] * scale + offsetX,
      s.pts[5] * scale + offsetY,
      s.pts[6] * scale + offsetX,
      s.pts[7] * scale + offsetY,
    ] as [number, number, number, number, number, number, number, number];
    const dxRaw = pts[6] - pts[0];
    const dyRaw = pts[7] - pts[1];
    const len = Math.hypot(dxRaw, dyRaw) || 1;
    return {
      pts,
      dx: dxRaw / len,
      dy: dyRaw / len,
      cx: (pts[0] + pts[2] + pts[4] + pts[6]) * 0.25,
      cy: (pts[1] + pts[3] + pts[5] + pts[7]) * 0.25,
    };
  });
}

function strokeDistance(a: IndexedStroke, b: IndexedStroke): number {
  let ptDist = 0;
  for (let i = 0; i < 8; i += 2) {
    ptDist += Math.hypot(a.pts[i] - b.pts[i], a.pts[i + 1] - b.pts[i + 1]);
  }
  ptDist *= 0.25; // average Euclidean distance across the 4 sampled points

  const cos = a.dx * b.dx + a.dy * b.dy; // [-1, 1]
  const dirPenalty = (1 - cos) * 14; // up to ~28 penalty if drawn reversed

  return ptDist + dirPenalty;
}

function scoreCandidate(
  userAbs: IndexedStroke[],
  userBBox: IndexedStroke[],
  target: IndexedKanjiEntry
): number {
  const k = userAbs.length;
  const m = target.strokeCount;
  const targetStrokes = target.strokes;

  // Greedy near-order alignment (allows adjacent stroke swaps ±2 indices with small order penalty)
  const computePassCost = (uStrokes: IndexedStroke[]) => {
    const used = new Uint8Array(m);
    let totalCost = 0;
    const compareCount = Math.min(k, m);

    for (let i = 0; i < compareCount; i++) {
      let bestCost = 9999;
      let bestIdx = -1;
      const startWin = Math.max(0, i - 2);
      const endWin = Math.min(m - 1, i + 2);

      for (let j = startWin; j <= endWin; j++) {
        if (used[j]) continue;
        const orderPenalty = Math.abs(i - j) * 4.5;
        const d = strokeDistance(uStrokes[i], targetStrokes[j]) + orderPenalty;
        if (d < bestCost) {
          bestCost = d;
          bestIdx = j;
        }
      }

      if (bestIdx === -1) {
        for (let j = 0; j < m; j++) {
          if (used[j]) continue;
          const d = strokeDistance(uStrokes[i], targetStrokes[j]) + 10;
          if (d < bestCost) {
            bestCost = d;
            bestIdx = j;
          }
        }
      }

      if (bestIdx >= 0) used[bestIdx] = 1;
      totalCost += bestCost;
    }

    return totalCost / Math.max(1, compareCount);
  };

  const absCost = computePassCost(userAbs);
  const bboxCost = computePassCost(userBBox);
  const geomCost = absCost * 0.58 + bboxCost * 0.42;

  // Stroke count difference penalty
  const countDiff = Math.abs(k - m);
  const countPenalty = countDiff === 0 ? 0 : countDiff * 11;

  // Slight tie-break preference for common Jōyō Kanji
  const freqBonus = target.freqRank <= 2200 ? (2200 - target.freqRank) * 0.0022 : -4;

  const rawScore = 100 - geomCost * 1.45 - countPenalty + freqBonus;
  return Math.max(0, Math.min(99, Math.round(rawScore)));
}

export async function recognizeHandwrittenKanji(
  rawUserStrokes: Point[][],
  canvasWidth: number,
  canvasHeight: number,
  limit = 12
): Promise<HandwritingCandidate[]> {
  const userAbs: IndexedStroke[] = [];
  for (const stroke of rawUserStrokes) {
    const resampled = resampleStroke4(stroke, canvasWidth, canvasHeight);
    if (resampled) userAbs.push(resampled);
  }

  if (userAbs.length === 0) return [];

  const index = await loadHandwritingIndex();
  const userBBox = buildBBoxNormalizedStrokes(userAbs);
  const k = userAbs.length;
  const minStrokes = k <= 2 ? 1 : Math.max(1, k - 1);
  const maxStrokes = k <= 2 ? k + 3 : k + 2;

  const scored: HandwritingCandidate[] = [];
  for (const entry of index) {
    if (entry.strokeCount < minStrokes || entry.strokeCount > maxStrokes) continue;
    const score = scoreCandidate(userAbs, userBBox, entry);
    scored.push({
      kanji: entry.kanji,
      strokeCount: entry.strokeCount,
      hanViet: entry.hanViet,
      meaning: entry.meaning,
      level: entry.level,
      score,
    });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit);
}
