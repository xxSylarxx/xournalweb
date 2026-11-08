import { getStroke } from 'perfect-freehand';
import { Point, Stroke } from '../types/document';
import { renderShape, applyLineDash } from './shapes';

export interface InkingOptions {
  size: number;
  thinning?: number;
  smoothing?: number;
  streamline?: number;
  easing?: (t: number) => number;
  simulatePressure?: boolean;
}

/**
 * Converts a sequence of points to a smooth outline polygon using perfect-freehand.
 */
export function getStrokeOutline(points: Point[], options: InkingOptions): number[][] {
  const inputPoints = points.map((p) => [p.x, p.y, p.pressure]);
  return getStroke(inputPoints, {
    size: options.size,
    thinning: options.thinning ?? 0.5,
    smoothing: options.smoothing ?? 0.4,
    streamline: options.streamline ?? 0.15, // Low streamline for zero perceived latency
    simulatePressure: options.simulatePressure ?? false,
    last: true,
  });
}

/**
 * High-performance version that avoids array allocations by directly accepting number[][] [x, y, pressure].
 */
export function getStrokeOutlineFromRaw(rawPoints: number[][], options: InkingOptions): number[][] {
  return getStroke(rawPoints, {
    size: options.size,
    thinning: options.thinning ?? 0.5,
    smoothing: options.smoothing ?? 0.4,
    streamline: options.streamline ?? 0.15,
    simulatePressure: options.simulatePressure ?? false,
    last: true,
  });
}

/**
 * Draws the outline polygon directly to the Canvas 2D context using quadratic curves.
 * Bypasses string serialization and Path2D parsing for maximum rendering performance.
 */
export function drawOutlineDirect(ctx: CanvasRenderingContext2D, strokePoints: number[][]) {
  if (strokePoints.length === 0) return;

  ctx.beginPath();
  const [firstX, firstY] = strokePoints[0];
  ctx.moveTo(firstX, firstY);

  const len = strokePoints.length;
  for (let i = 0; i < len; i++) {
    const [x0, y0] = strokePoints[i];
    const [x1, y1] = strokePoints[(i + 1) % len];
    ctx.quadraticCurveTo(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2);
  }

  ctx.closePath();
  ctx.fill();
}

/**
 * Converts polygon outline points into an SVG Path string (for SVG/XOPP export).
 */
export function getSvgPathFromStroke(strokePoints: number[][]): string {
  if (!strokePoints.length) return '';

  const d = strokePoints.reduce(
    (acc, [x0, y0], i, arr) => {
      const [x1, y1] = arr[(i + 1) % arr.length];
      acc.push(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2);
      return acc;
    },
    ['M', ...strokePoints[0], 'Q']
  );

  d.push('Z');
  return d.join(' ');
}

/**
 * Draws a completed stroke or active stroke onto a Canvas 2D context.
 */
export function renderStroke(
  ctx: CanvasRenderingContext2D,
  stroke:
    | Stroke
    | {
        tool: 'pen' | 'highlighter';
        color: string;
        width: number;
        points: Point[];
        opacity?: number;
        shapeType?: string;
        lineStyle?: any;
        capStyle?: any;
        fill?: string;
        fillOpacity?: number;
      }
) {
  if (stroke.points.length === 0) return;

  // Handle geometric shapes
  if ('shapeType' in stroke && stroke.shapeType && stroke.shapeType !== 'freehand') {
    renderShape(ctx, stroke as Stroke);
    return;
  }

  const isHighlighter = stroke.tool === 'highlighter';

  ctx.save();

  if (isHighlighter) {
    ctx.globalCompositeOperation = 'multiply';
    ctx.globalAlpha = stroke.opacity ?? 0.45;
  } else {
    ctx.globalAlpha = stroke.opacity ?? 1.0;
  }

  ctx.fillStyle = stroke.color;
  ctx.strokeStyle = stroke.color;

  // Single dot check
  if (stroke.points.length === 1) {
    const p = stroke.points[0];
    const radius = Math.max(1, (stroke.width / 2) * (p.pressure || 0.5));
    ctx.beginPath();
    ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }

  // If dashed/dotted line style on freehand stroke, draw center line with dashes
  if (stroke.lineStyle && stroke.lineStyle !== 'plain') {
    ctx.lineWidth = stroke.width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    applyLineDash(ctx, stroke.lineStyle, stroke.width);

    ctx.beginPath();
    ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
    for (let i = 1; i < stroke.points.length; i++) {
      const p1 = stroke.points[i - 1];
      const p2 = stroke.points[i];
      const midX = (p1.x + p2.x) / 2;
      const midY = (p1.y + p2.y) / 2;
      ctx.quadraticCurveTo(p1.x, p1.y, midX, midY);
    }
    const last = stroke.points[stroke.points.length - 1];
    ctx.lineTo(last.x, last.y);
    ctx.stroke();
    ctx.restore();
    return;
  }

  const pts = stroke.points;
  ctx.lineCap = (stroke.capStyle as CanvasLineCap) || 'round';
  ctx.lineJoin = 'round';

  const hasPressure = pts.some(
    (p) => p.pressure !== undefined && p.pressure !== 0.5 && p.pressure > 0
  );

  if (hasPressure && !isHighlighter) {
    // Exact Xournal++ pressure-sensitive rendering with smooth segment thickness
    for (let i = 0; i < pts.length - 1; i++) {
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const press = (p1.pressure ?? 0.5) * 1.2;
      ctx.lineWidth = Math.max(0.6, stroke.width * press);
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    }
  } else {
    // Exact Xournal++ smooth Catmull-Rom / midpoint Bezier vector inking
    ctx.lineWidth = stroke.width;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) {
      const p1 = pts[i - 1];
      const p2 = pts[i];
      const midX = (p1.x + p2.x) / 2;
      const midY = (p1.y + p2.y) / 2;
      ctx.quadraticCurveTo(p1.x, p1.y, midX, midY);
    }
    const last = pts[pts.length - 1];
    ctx.lineTo(last.x, last.y);
    ctx.stroke();
  }

  // Handle shape fill if any
  if (stroke.fill && stroke.fill !== 'none') {
    ctx.fillStyle = stroke.fill;
    ctx.globalAlpha = stroke.fillOpacity ?? 0.35;
    ctx.fill();
  }

  ctx.restore();
}

/**
 * Determines if a point (x, y) intersects or is near any segment of a stroke.
 * Used for stroke-based erasing.
 */
export function isPointNearStroke(stroke: Stroke, px: number, py: number, tolerance = 8): boolean {
  const points = stroke.points;
  if (points.length === 0) return false;

  const threshold = Math.max(tolerance, stroke.width / 2 + tolerance);
  const thresholdSq = threshold * threshold;

  for (let i = 0; i < points.length; i++) {
    const p1 = points[i];
    const p2 = points[i + 1] || p1;

    const distSq = distanceSqToSegment(px, py, p1.x, p1.y, p2.x, p2.y);
    if (distSq <= thresholdSq) {
      return true;
    }
  }

  return false;
}

function distanceSqToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;

  if (lenSq === 0) {
    const dpx = px - x1;
    const dpy = py - y1;
    return dpx * dpx + dpy * dpy;
  }

  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));

  const projX = x1 + t * dx;
  const projY = y1 + t * dy;

  const dX = px - projX;
  const dY = py - projY;
  return dX * dX + dY * dY;
}

/**
 * Splits or truncates a stroke based on an eraser path.
 * If the stroke is unaffected, returns [stroke].
 * If the stroke is completely erased, returns [].
 * If the stroke is partially erased, returns the remaining sub-strokes.
 */
export function splitStrokeByEraserPath(
  stroke: Stroke,
  eraserPath: Point[],
  eraserRadius: number
): Stroke[] {
  const points = stroke.points;
  if (points.length === 0) return [];
  if (eraserPath.length === 0) return [stroke];

  // 1. Densify points so that no segment between consecutive points is longer than maxStep
  const maxStep = Math.max(3, eraserRadius / 3);
  const densePoints: Point[] = [];

  for (let i = 0; i < points.length; i++) {
    densePoints.push(points[i]);
    if (i < points.length - 1) {
      const p1 = points[i];
      const p2 = points[i + 1];
      const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      if (dist > maxStep) {
        const steps = Math.ceil(dist / maxStep);
        for (let s = 1; s < steps; s++) {
          const t = s / steps;
          densePoints.push({
            x: p1.x + t * (p2.x - p1.x),
            y: p1.y + t * (p2.y - p1.y),
            pressure: (p1.pressure ?? 0.5) + t * ((p2.pressure ?? 0.5) - (p1.pressure ?? 0.5)),
          });
        }
      }
    }
  }

  // 2. Identify which points in densePoints are erased
  const threshold = eraserRadius + stroke.width / 4;
  const thresholdSq = threshold * threshold;

  const isErased: boolean[] = new Array(densePoints.length);
  let anyErased = false;
  let allErased = true;

  for (let i = 0; i < densePoints.length; i++) {
    const pt = densePoints[i];
    let erased = false;
    for (let e = 0; e < eraserPath.length; e++) {
      const e1 = eraserPath[e];
      const e2 = eraserPath[e + 1] || e1;
      if (distanceSqToSegment(pt.x, pt.y, e1.x, e1.y, e2.x, e2.y) <= thresholdSq) {
        erased = true;
        break;
      }
    }
    isErased[i] = erased;
    if (erased) anyErased = true;
    else allErased = false;
  }

  if (!anyErased) return [stroke];
  if (allErased) return [];

  // 3. Group remaining points into runs of sub-strokes
  const subStrokes: Stroke[] = [];
  let currentRun: Point[] = [];

  for (let i = 0; i < densePoints.length; i++) {
    if (!isErased[i]) {
      currentRun.push(densePoints[i]);
    } else {
      if (currentRun.length >= 2) {
        subStrokes.push({
          ...stroke,
          id: `stroke-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          points: currentRun,
          shapeType: 'freehand',
        });
      } else if (currentRun.length === 1 && densePoints.length < 5) {
        // Keep solitary point for tiny strokes/dots
        subStrokes.push({
          ...stroke,
          id: `stroke-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          points: [currentRun[0], { ...currentRun[0], x: currentRun[0].x + 0.1 }],
          shapeType: 'freehand',
        });
      }
      currentRun = [];
    }
  }

  if (currentRun.length >= 2) {
    subStrokes.push({
      ...stroke,
      id: `stroke-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      points: currentRun,
      shapeType: 'freehand',
    });
  } else if (currentRun.length === 1 && densePoints.length < 5) {
    subStrokes.push({
      ...stroke,
      id: `stroke-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      points: [currentRun[0], { ...currentRun[0], x: currentRun[0].x + 0.1 }],
      shapeType: 'freehand',
    });
  }

  return subStrokes;
}


