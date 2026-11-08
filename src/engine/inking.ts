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

  // Smooth pressure-sensitive polygon
  const outline = getStrokeOutline(stroke.points, {
    size: stroke.width,
    thinning: isHighlighter ? 0.05 : 0.5,
    smoothing: 0.4,
    streamline: 0.15, // Immediate response
    simulatePressure: stroke.points.every((p) => p.pressure === 0.5 || p.pressure === 0),
  });

  drawOutlineDirect(ctx, outline);

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

