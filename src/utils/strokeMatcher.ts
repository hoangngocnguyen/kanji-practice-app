// Stroke matching & evaluation engine for Kanji stroke order and direction verification
// Uses KanjiVG SVG path coordinates (109x109 viewBox) and normalized canvas coordinates.

export interface Point {
  x: number;
  y: number;
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

/**
 * Samples N equidistant points along an SVG path string in 109x109 coordinate space.
 */
export function sampleSvgPathPoints(pathD: string, numSamples = 32): Point[] {
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
 * Normalizes raw canvas points into the 109x109 coordinate space and resamples them evenly.
 */
export function resampleUserPoints(
  rawPoints: Point[],
  canvasWidth: number,
  canvasHeight: number,
  targetCount = 32
): Point[] {
  if (rawPoints.length < 2) return [];

  // 1. Normalize points to 109x109 space
  const scaleX = 109 / canvasWidth;
  const scaleY = 109 / canvasHeight;
  const normalized = rawPoints.map((p) => ({
    x: p.x * scaleX,
    y: p.y * scaleY,
  }));

  // 2. Compute cumulative chord distances
  const dists: number[] = [0];
  let totalLen = 0;
  for (let i = 1; i < normalized.length; i++) {
    const dx = normalized[i].x - normalized[i - 1].x;
    const dy = normalized[i].y - normalized[i - 1].y;
    totalLen += Math.sqrt(dx * dx + dy * dy);
    dists.push(totalLen);
  }

  if (totalLen <= 0.001) {
    return new Array(targetCount).fill({ ...normalized[0] });
  }

  // 3. Resample targetCount equidistant points
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
 * Evaluates user drawn stroke against the reference SVG stroke path.
 * Checks:
 * 1. Reversed direction (drawing backwards)
 * 2. Start point & end point proximity
 * 3. Curve path deviation (mean point-to-point Euclidean distance)
 * 4. Overall trajectory similarity
 */
export function evaluateUserStroke(
  rawUserPoints: Point[],
  pathD: string,
  canvasWidth: number,
  canvasHeight: number
): StrokeEvaluationResult {
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

  const targetPoints = sampleSvgPathPoints(pathD, 32);
  if (targetPoints.length < 2) {
    return defaultFallback;
  }

  const refStart = targetPoints[0];
  const refEnd = targetPoints[targetPoints.length - 1];

  const userPoints = resampleUserPoints(rawUserPoints, canvasWidth, canvasHeight, 32);
  if (userPoints.length < 2) {
    return {
      ...defaultFallback,
      startPoint: refStart,
      endPoint: refEnd,
    };
  }

  const userStart = userPoints[0];
  const userEnd = userPoints[userPoints.length - 1];

  // 1. Check if stroke was drawn in reverse direction
  // Normal direction distances
  const dStartStart = pointDist(userStart, refStart);
  const dEndEnd = pointDist(userEnd, refEnd);
  // Reversed direction distances
  const dStartEnd = pointDist(userStart, refEnd);
  const dEndStart = pointDist(userEnd, refStart);

  // Vector cosine similarity
  const uVx = userEnd.x - userStart.x;
  const uVy = userEnd.y - userStart.y;
  const uMag = Math.sqrt(uVx * uVx + uVy * uVy);

  const rVx = refEnd.x - refStart.x;
  const rVy = refEnd.y - refStart.y;
  const rMag = Math.sqrt(rVx * rVx + rVy * rVy);

  let cosineSim = 1;
  if (uMag > 1 && rMag > 1) {
    cosineSim = (uVx * rVx + uVy * rVy) / (uMag * rMag);
  }

  // Detect reversed stroke:
  // Either user start is much closer to ref end AND user end is much closer to ref start,
  // OR the direction vector is opposite (cosineSim < -0.3)
  const isReversed =
    (dStartEnd + dEndStart < dStartStart + dEndEnd && dStartEnd < 18) ||
    (cosineSim < -0.35 && uMag > 8 && rMag > 8);

  if (isReversed) {
    return {
      isPass: false,
      score: Math.min(30, Math.max(10, Math.round(50 - dStartEnd))),
      feedback: '⚠️ Nét vẽ bị ngược chiều! Hãy vẽ theo chiều mũi tên/chấm hướng dẫn.',
      isReversed: true,
      distanceScore: 25,
      directionScore: 0,
      startPoint: refStart,
      endPoint: refEnd,
    };
  }

  // 2. Average point-to-point Euclidean distance in 109x109 space
  let totalPointDist = 0;
  for (let i = 0; i < 32; i++) {
    totalPointDist += pointDist(userPoints[i], targetPoints[i]);
  }
  const avgDist = totalPointDist / 32;

  // Maximum acceptable average distance in 109x109 scale is ~22 units for passing
  // Convert avgDist into distanceScore: 0 units -> 100%, 25 units -> 0%
  const distanceScore = Math.max(0, Math.min(100, Math.round((1 - avgDist / 26) * 100)));

  // 3. Direction score based on cosine similarity
  const dirNormalized = Math.max(0, (cosineSim + 1) / 2); // 0 to 1
  const directionScore = Math.round(dirNormalized * 100);

  // 4. Endpoint accuracy bonus/penalty
  const endpointError = (dStartStart + dEndEnd) / 2;
  const endpointScore = Math.max(0, Math.min(100, Math.round((1 - endpointError / 24) * 100)));

  // Weighted overall score:
  // 55% shape curve fidelity (distanceScore)
  // 25% direction similarity (directionScore)
  // 20% endpoint positioning (endpointScore)
  const rawScore = Math.round(distanceScore * 0.55 + directionScore * 0.25 + endpointScore * 0.2);
  const score = Math.max(0, Math.min(100, rawScore));

  const isPass = score >= 55 && dStartStart < 26;

  let feedback = '';
  if (score >= 85) {
    feedback = '✨ Xuất sắc! Nét vẽ chuẩn xác và đúng thứ tự!';
  } else if (score >= 70) {
    feedback = '👍 Rất tốt! Nét vẽ đúng hướng và vị trí.';
  } else if (score >= 55) {
    feedback = '✓ Đạt! Tiếp tục với nét tiếp theo.';
  } else if (dStartStart > 24) {
    feedback = '⚠️ Điểm bắt đầu vẽ chưa đúng vị trí. Hãy chú ý chấm xanh đánh dấu!';
  } else {
    feedback = '❌ Nét vẽ lệch quá nhiều so với nét mẫu. Hãy đồ lại cẩn thận hơn.';
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
