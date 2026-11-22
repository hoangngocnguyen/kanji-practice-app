// Stroke matching & evaluation engine for Kanji stroke order, shape, and direction verification.
// Uses KanjiVG SVG path coordinates (109x109 viewBox) and normalized canvas coordinates.

export interface Point {
  x: number;
  y: number;
}

export type StrokeStrictness = 'easy' | 'normal' | 'strict';

export interface EvaluateStrokeOptions {
  strictness?: StrokeStrictness;
}

export interface StrokeEvaluationResult {
  isPass: boolean;
  score: number; // 0 - 100
  feedback: string;
  isReversed: boolean;
  distanceScore: number;
  directionScore: number;
  startPoint: Point;
  endPoint: Point;
}

interface StrictnessPreset {
  passScore: number;
  maxStartDist: number;
  maxChamferDist: number;
  distScale: number;
  endScale: number;
  minLengthRatio: number;
  maxLengthRatio: number;
}

const STRICTNESS_PRESETS: Record<StrokeStrictness, StrictnessPreset> = {
  easy: {
    passScore: 48,
    maxStartDist: 30,
    maxChamferDist: 22,
    distScale: 28,
    endScale: 28,
    minLengthRatio: 0.32,
    maxLengthRatio: 2.25,
  },
  normal: {
    passScore: 58,
    maxStartDist: 23,
    maxChamferDist: 16.5,
    distScale: 22,
    endScale: 22,
    minLengthRatio: 0.44,
    maxLengthRatio: 1.85,
  },
  strict: {
    passScore: 72,
    maxStartDist: 16,
    maxChamferDist: 11.5,
    distScale: 16.5,
    endScale: 16,
    minLengthRatio: 0.58,
    maxLengthRatio: 1.5,
  },
};

/**
 * Samples N equidistant points along an SVG path string in 109x109 coordinate space.
 */
export function sampleSvgPathPoints(pathD: string, numSamples = 36): Point[] {
  if (!pathD || typeof document === 'undefined') return [];

  try {
    const pathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    pathEl.setAttribute('d', pathD);
    const totalLength = pathEl.getTotalLength();

    if (totalLength <= 0) return [];

    const points: Point[] = [];
    for (let i = 0; i < numSamples; i++) {
      const dist = (i / (numSamples - 1)) * totalLength;
      const pt = pathEl.getPointAtLength(dist);
      points.push({ x: pt.x, y: pt.y });
    }
    return points;
  } catch (err) {
    console.error('Failed to sample SVG path:', err);
    return [];
  }
}

/**
 * Calculates total polyline arc length.
 */
function polylineLength(points: Point[]): number {
  let len = 0;
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;
    len += Math.sqrt(dx * dx + dy * dy);
  }
  return len;
}

/**
 * Normalizes raw canvas points into the 109x109 coordinate space and resamples them evenly.
 */
export function resampleUserPoints(
  rawPoints: Point[],
  canvasWidth: number,
  canvasHeight: number,
  targetCount = 36
): Point[] {
  if (rawPoints.length < 2 || canvasWidth <= 0 || canvasHeight <= 0) return [];

  const scaleX = 109 / canvasWidth;
  const scaleY = 109 / canvasHeight;
  const normalized = rawPoints.map((p) => ({
    x: p.x * scaleX,
    y: p.y * scaleY,
  }));

  const dists: number[] = [0];
  let totalLen = 0;
  for (let i = 1; i < normalized.length; i++) {
    const dx = normalized[i].x - normalized[i - 1].x;
    const dy = normalized[i].y - normalized[i - 1].y;
    totalLen += Math.sqrt(dx * dx + dy * dy);
    dists.push(totalLen);
  }

  if (totalLen <= 0.001) {
    return Array.from({ length: targetCount }, () => ({ ...normalized[0] }));
  }

  const resampled: Point[] = [];
  const step = totalLen / (targetCount - 1);
  let curSegment = 0;

  for (let i = 0; i < targetCount; i++) {
    const targetDist = i * step;

    while (curSegment < dists.length - 2 && dists[curSegment + 1] < targetDist) {
      curSegment++;
    }

    const segStartDist = dists[curSegment];
    const segEndDist = dists[curSegment + 1];
    const segLen = segEndDist - segStartDist;

    if (segLen <= 0.0001) {
      resampled.push({ ...normalized[curSegment] });
    } else {
      const t = (targetDist - segStartDist) / segLen;
      const p1 = normalized[curSegment];
      const p2 = normalized[curSegment + 1];
      resampled.push({
        x: p1.x + t * (p2.x - p1.x),
        y: p1.y + t * (p2.y - p1.y),
      });
    }
  }

  return resampled;
}

/**
 * Calculates Euclidean distance between two points.
 */
export function pointDist(p1: Point, p2: Point): number {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Computes average nearest-neighbor distance from source points to target points.
 */
function meanNearestDistance(source: Point[], target: Point[]): number {
  if (source.length === 0 || target.length === 0) return 999;
  let sum = 0;
  for (let i = 0; i < source.length; i++) {
    let minD = Infinity;
    for (let j = 0; j < target.length; j++) {
      const d = pointDist(source[i], target[j]);
      if (d < minD) minD = d;
    }
    sum += minD;
  }
  return sum / source.length;
}

/**
 * Computes average segment tangent cosine similarity across equal chunks of the stroke.
 * Captures directional progression even for curved/hooked strokes (hane,乙,乚,フ).
 */
function computeSegmentTangentSimilarity(userPoints: Point[], targetPoints: Point[]): number {
  const len = Math.min(userPoints.length, targetPoints.length);
  if (len < 6) return 1;

  const stride = Math.max(2, Math.floor((len - 1) / 5));
  let cosSum = 0;
  let count = 0;

  for (let i = 0; i + stride < len; i += stride) {
    const ux = userPoints[i + stride].x - userPoints[i].x;
    const uy = userPoints[i + stride].y - userPoints[i].y;
    const uMag = Math.sqrt(ux * ux + uy * uy);

    const rx = targetPoints[i + stride].x - targetPoints[i].x;
    const ry = targetPoints[i + stride].y - targetPoints[i].y;
    const rMag = Math.sqrt(rx * rx + ry * ry);

    if (uMag > 0.6 && rMag > 0.6) {
      cosSum += (ux * rx + uy * ry) / (uMag * rMag);
      count++;
    }
  }

  return count > 0 ? cosSum / count : 1;
}

/**
 * Evaluates user drawn stroke against the reference SVG stroke path.
 * Uses bidirectional Chamfer distance + ordered progression + tangent alignment
 * with adaptive tolerance for short dot strokes and configurable strictness presets.
 */
export function evaluateUserStroke(
  rawUserPoints: Point[],
  pathD: string,
  canvasWidth: number,
  canvasHeight: number,
  options?: EvaluateStrokeOptions
): StrokeEvaluationResult {
  const strictness: StrokeStrictness = options?.strictness || 'normal';
  const preset = STRICTNESS_PRESETS[strictness];

  const defaultFallback: StrokeEvaluationResult = {
    isPass: false,
    score: 0,
    feedback: 'Nét vẽ quá ngắn hoặc chưa rõ ràng, hãy thử lại.',
    isReversed: false,
    distanceScore: 0,
    directionScore: 0,
    startPoint: { x: 50, y: 50 },
    endPoint: { x: 50, y: 50 },
  };

  if (!rawUserPoints || rawUserPoints.length < 3) {
    return defaultFallback;
  }

  const targetPoints = sampleSvgPathPoints(pathD, 36);
  if (targetPoints.length < 2) {
    return defaultFallback;
  }

  const refStart = targetPoints[0];
  const refEnd = targetPoints[targetPoints.length - 1];

  const userPoints = resampleUserPoints(rawUserPoints, canvasWidth, canvasHeight, 36);
  if (userPoints.length < 2) {
    return {
      ...defaultFallback,
      startPoint: refStart,
      endPoint: refEnd,
    };
  }

  const refLength = polylineLength(targetPoints);
  const userLength = polylineLength(userPoints);
  const isShortStroke = refLength < 16;

  // Reject tiny accidental taps when the target stroke is non-trivial
  if (userLength < Math.max(3, refLength * preset.minLengthRatio * 0.6)) {
    return {
      ...defaultFallback,
      score: 18,
      feedback: 'Nét vẽ quá ngắn so với nét mẫu.',
      startPoint: refStart,
      endPoint: refEnd,
    };
  }

  const userStart = userPoints[0];
  const userEnd = userPoints[userPoints.length - 1];

  const dStartStart = pointDist(userStart, refStart);
  const dEndEnd = pointDist(userEnd, refEnd);
  const dStartEnd = pointDist(userStart, refEnd);
  const dEndStart = pointDist(userEnd, refStart);

  // Overall start->end chord direction cosine
  const uVx = userEnd.x - userStart.x;
  const uVy = userEnd.y - userStart.y;
  const uMag = Math.sqrt(uVx * uVx + uVy * uVy);

  const rVx = refEnd.x - refStart.x;
  const rVy = refEnd.y - refStart.y;
  const rMag = Math.sqrt(rVx * rVx + rVy * rVy);

  let chordCosine = 1;
  if (uMag > 1.5 && rMag > 1.5) {
    chordCosine = (uVx * rVx + uVy * rVy) / (uMag * rMag);
  }

  // Segment-by-segment tangent cosine captures curve/hook direction accurately
  const tangentCosine = computeSegmentTangentSimilarity(userPoints, targetPoints);
  const effectiveCosine = rMag > 8 ? chordCosine * 0.45 + tangentCosine * 0.55 : tangentCosine;

  // Reverse stroke check: only trigger confidently when meaningful stroke length exists
  const isReverseByEndpoints =
    rMag > 6 &&
    dStartEnd + dEndStart + 3 < dStartStart + dEndEnd &&
    dStartEnd < 20 &&
    tangentCosine < 0.25;
  const isReverseByDirection =
    effectiveCosine < (isShortStroke ? -0.45 : -0.25) && userLength > 8 && refLength > 8;

  if (isReverseByEndpoints || isReverseByDirection) {
    return {
      isPass: false,
      score: Math.min(32, Math.max(12, Math.round(48 - dStartEnd))),
      feedback: 'Nét vẽ bị ngược chiều — hãy bắt đầu từ chấm đánh dấu.',
      isReversed: true,
      distanceScore: 25,
      directionScore: 0,
      startPoint: refStart,
      endPoint: refEnd,
    };
  }

  // 1. Bidirectional Chamfer distance (speed-invariant contour closeness) + ordered distance
  const meanU2R = meanNearestDistance(userPoints, targetPoints);
  const meanR2U = meanNearestDistance(targetPoints, userPoints);
  const chamferDist = (meanU2R + meanR2U) / 2;

  let totalOrderedDist = 0;
  for (let i = 0; i < targetPoints.length; i++) {
    totalOrderedDist += pointDist(userPoints[i], targetPoints[i]);
  }
  const orderedDist = totalOrderedDist / targetPoints.length;

  const blendedDist = chamferDist * 0.72 + orderedDist * 0.28;
  const distanceScore = Math.max(
    0,
    Math.min(100, Math.round((1 - blendedDist / preset.distScale) * 100))
  );

  // 2. Direction score (softened slightly for very short dot strokes)
  const clampedCos = Math.max(-1, Math.min(1, effectiveCosine));
  const rawDirNorm = Math.max(0, (clampedCos + 1) / 2);
  const dirBoosted = isShortStroke ? Math.min(1, rawDirNorm * 1.15) : rawDirNorm;
  const directionScore = Math.round(dirBoosted * 100);

  // 3. Endpoint positioning score (weighted slightly toward start point accuracy)
  const weightedEndpointErr = dStartStart * 0.58 + dEndEnd * 0.42;
  const endpointScore = Math.max(
    0,
    Math.min(100, Math.round((1 - weightedEndpointErr / preset.endScale) * 100))
  );

  // 4. Stroke length proportion score
  const lengthRatio = refLength > 0 ? userLength / refLength : 1;
  const lengthRatioOk =
    lengthRatio >= preset.minLengthRatio && lengthRatio <= preset.maxLengthRatio;
  const lengthError = Math.abs(1 - lengthRatio);
  const lengthScore = Math.max(0, Math.min(100, Math.round((1 - lengthError / 0.85) * 100)));

  // Overall score
  const rawScore = Math.round(
    distanceScore * 0.5 +
      directionScore * 0.25 +
      endpointScore * 0.15 +
      lengthScore * 0.1
  );
  const score = Math.max(0, Math.min(100, rawScore));

  const effectiveMaxStart = isShortStroke ? preset.maxStartDist + 4 : preset.maxStartDist;
  const isPass =
    score >= preset.passScore &&
    dStartStart <= effectiveMaxStart &&
    chamferDist <= preset.maxChamferDist &&
    lengthRatioOk;

  let feedback = '';
  if (isPass) {
    if (score >= 86) {
      feedback = 'Xuất sắc! Nét vẽ chuẩn xác và đúng thứ tự.';
    } else if (score >= 72) {
      feedback = 'Rất tốt! Đúng hướng và vị trí.';
    } else {
      feedback = 'Đạt! Chuyển sang nét tiếp theo.';
    }
  } else if (lengthRatio < preset.minLengthRatio) {
    feedback = 'Nét vẽ hơi ngắn — hãy kéo đủ chiều dài nét mẫu.';
  } else if (lengthRatio > preset.maxLengthRatio) {
    feedback = 'Nét vẽ kéo quá dài so với khung mẫu.';
  } else if (dStartStart > effectiveMaxStart) {
    feedback = 'Điểm đặt bút lệch khỏi vị trí đầu nét.';
  } else if (effectiveCosine < 0.35 && !isShortStroke) {
    feedback = 'Hướng kéo nét chưa đúng — kiểm tra lại chiều nét.';
  } else {
    feedback = 'Dáng nét chưa khớp — hãy bám sát quỹ đạo mẫu.';
  }

  return {
    isPass,
    score,
    feedback,
    isReversed: false,
    distanceScore,
    directionScore,
    startPoint: refStart,
    endPoint: refEnd,
  };
}
