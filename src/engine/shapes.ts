import { Stroke, LineStyle, BoundingBox } from '../types/document';

/**
 * Configures the line dash pattern on a Canvas 2D context.
 */
export function applyLineDash(ctx: CanvasRenderingContext2D, style?: LineStyle, width: number = 2) {
  switch (style) {
    case 'dash':
      ctx.setLineDash([width * 4, width * 2.5]);
      break;
    case 'dot':
      ctx.setLineDash([width * 1.2, width * 2]);
      break;
    case 'dashdot':
      ctx.setLineDash([width * 4, width * 2, width * 1.2, width * 2]);
      break;
    case 'plain':
    default:
      ctx.setLineDash([]);
      break;
  }
}

/**
 * Draws an arrowhead at the end of a line.
 */
function drawArrowhead(
  ctx: CanvasRenderingContext2D,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  size: number
) {
  const angle = Math.atan2(toY - fromY, toX - fromX);
  const headLen = Math.max(12, size * 3.5);

  ctx.save();
  ctx.setLineDash([]); // Arrowhead is always solid
  ctx.beginPath();
  ctx.moveTo(toX, toY);
  ctx.lineTo(
    toX - headLen * Math.cos(angle - Math.PI / 6),
    toY - headLen * Math.sin(angle - Math.PI / 6)
  );
  ctx.lineTo(
    toX - (headLen * 0.7) * Math.cos(angle),
    toY - (headLen * 0.7) * Math.sin(angle)
  );
  ctx.lineTo(
    toX - headLen * Math.cos(angle + Math.PI / 6),
    toY - headLen * Math.sin(angle + Math.PI / 6)
  );
  ctx.closePath();
  ctx.fillStyle = ctx.strokeStyle;
  ctx.fill();
  ctx.restore();
}

/**
 * Renders a geometric shape stroke (line, arrow, rect, ellipse).
 */
export function renderShape(ctx: CanvasRenderingContext2D, stroke: Stroke) {
  const points = stroke.points;
  if (points.length < 2) return;

  const start = points[0];
  const end = points[points.length - 1];

  ctx.save();

  if (stroke.tool === 'highlighter') {
    ctx.globalCompositeOperation = 'multiply';
    ctx.globalAlpha = stroke.opacity ?? 0.45;
  } else {
    ctx.globalAlpha = stroke.opacity ?? 1.0;
  }

  ctx.strokeStyle = stroke.color;
  ctx.lineWidth = stroke.width;
  ctx.lineCap = stroke.capStyle || 'round';
  ctx.lineJoin = 'round';
  applyLineDash(ctx, stroke.lineStyle, stroke.width);

  const minX = Math.min(start.x, end.x);
  const minY = Math.min(start.y, end.y);
  const width = Math.abs(end.x - start.x);
  const height = Math.abs(end.y - start.y);

  // Fill handling
  if (stroke.fill && (stroke.shapeType === 'rect' || stroke.shapeType === 'ellipse')) {
    ctx.fillStyle = stroke.fill;
    const originalAlpha = ctx.globalAlpha;
    ctx.globalAlpha = originalAlpha * (stroke.fillOpacity ?? 0.3);

    ctx.beginPath();
    if (stroke.shapeType === 'rect') {
      ctx.fillRect(minX, minY, width, height);
    } else if (stroke.shapeType === 'ellipse') {
      ctx.beginPath();
      ctx.ellipse(minX + width / 2, minY + height / 2, width / 2, height / 2, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = originalAlpha;
  }

  // Stroke outline
  ctx.beginPath();
  switch (stroke.shapeType) {
    case 'line':
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();
      break;

    case 'arrow':
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();
      drawArrowhead(ctx, start.x, start.y, end.x, end.y, stroke.width);
      break;

    case 'doubleArrow':
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();
      drawArrowhead(ctx, start.x, start.y, end.x, end.y, stroke.width);
      drawArrowhead(ctx, end.x, end.y, start.x, start.y, stroke.width);
      break;

    case 'rect':
      ctx.strokeRect(minX, minY, width, height);
      break;

    case 'ellipse':
      ctx.ellipse(minX + width / 2, minY + height / 2, Math.max(1, width / 2), Math.max(1, height / 2), 0, 0, Math.PI * 2);
      ctx.stroke();
      break;
  }

  ctx.restore();
}

/**
 * Computes bounding box for a single stroke.
 */
export function getStrokeBoundingBox(stroke: Stroke): BoundingBox {
  const pts = stroke.points;
  if (pts.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const p of pts) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }

  const pad = stroke.width / 2 + 2;
  minX -= pad;
  minY -= pad;
  maxX += pad;
  maxY += pad;

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

/**
 * Computes union bounding box for multiple strokes.
 */
export function getStrokesBoundingBox(strokes: Stroke[]): BoundingBox | null {
  if (strokes.length === 0) return null;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const s of strokes) {
    const box = getStrokeBoundingBox(s);
    if (box.minX < minX) minX = box.minX;
    if (box.minY < minY) minY = box.minY;
    if (box.maxX > maxX) maxX = box.maxX;
    if (box.maxY > maxY) maxY = box.maxY;
  }

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

/**
 * Checks if a stroke is within a rectangular selection box.
 */
export function isStrokeInBox(
  stroke: Stroke,
  box: { x: number; y: number; width: number; height: number }
): boolean {
  const left = Math.min(box.x, box.x + box.width);
  const right = Math.max(box.x, box.x + box.width);
  const top = Math.min(box.y, box.y + box.height);
  const bottom = Math.max(box.y, box.y + box.height);

  // If any point is inside the box, or bounding box overlaps
  const strokeBox = getStrokeBoundingBox(stroke);
  const overlaps =
    strokeBox.minX < right &&
    strokeBox.maxX > left &&
    strokeBox.minY < bottom &&
    strokeBox.maxY > top;

  if (!overlaps) return false;

  // Verify at least one point is inside
  return stroke.points.some((p) => p.x >= left && p.x <= right && p.y >= top && p.y <= bottom);
}

/**
 * Ray-casting algorithm to test if a point (px, py) is inside a closed polygon.
 */
export function isPointInPolygon(px: number, py: number, polygon: { x: number; y: number }[]): boolean {
  if (polygon.length < 3) return false;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;

    const intersect = yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Checks if a stroke is enclosed or intersected by a freehand lasso polygon.
 */
export function isStrokeInPolygon(stroke: Stroke, polygon: { x: number; y: number }[]): boolean {
  if (polygon.length < 3 || stroke.points.length === 0) return false;

  // 1. Quick bounding box rejection
  let polyMinX = Infinity, polyMinY = Infinity, polyMaxX = -Infinity, polyMaxY = -Infinity;
  for (const pt of polygon) {
    if (pt.x < polyMinX) polyMinX = pt.x;
    if (pt.y < polyMinY) polyMinY = pt.y;
    if (pt.x > polyMaxX) polyMaxX = pt.x;
    if (pt.y > polyMaxY) polyMaxY = pt.y;
  }

  const sBox = getStrokeBoundingBox(stroke);
  if (
    sBox.maxX < polyMinX ||
    sBox.minX > polyMaxX ||
    sBox.maxY < polyMinY ||
    sBox.minY > polyMaxY
  ) {
    return false;
  }

  // 2. Check if any point of stroke is inside the polygon
  return stroke.points.some((p) => isPointInPolygon(p.x, p.y, polygon));
}

/**
 * Translates a stroke by (dx, dy).
 */
export function translateStroke(stroke: Stroke, dx: number, dy: number): Stroke {
  return {
    ...stroke,
    points: stroke.points.map((p) => ({
      ...p,
      x: p.x + dx,
      y: p.y + dy,
    })),
  };
}

/**
 * Scales a stroke relative to an origin point.
 */
export function scaleStroke(
  stroke: Stroke,
  scaleX: number,
  scaleY: number,
  originX: number,
  originY: number
): Stroke {
  return {
    ...stroke,
    points: stroke.points.map((p) => ({
      ...p,
      x: originX + (p.x - originX) * scaleX,
      y: originY + (p.y - originY) * scaleY,
    })),
  };
}

/**
 * Rotates a stroke around an origin point by angleRad.
 */
export function rotateStroke(
  stroke: Stroke,
  angleRad: number,
  originX: number,
  originY: number
): Stroke {
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);

  return {
    ...stroke,
    points: stroke.points.map((p) => {
      const dx = p.x - originX;
      const dy = p.y - originY;
      return {
        ...p,
        x: originX + dx * cos - dy * sin,
        y: originY + dx * sin + dy * cos,
      };
    }),
  };
}

/**
 * Geometric Shape Recognizer (Freehand to clean Line, Arrow, Rect or Ellipse).
 */
export function recognizeShape(points: { x: number; y: number }[]): { shapeType: any; points: { x: number; y: number; pressure: number }[] } | null {
  if (points.length < 5) return null;

  const start = points[0];
  const end = points[points.length - 1];

  let pathLen = 0;
  let minX = points[0].x, maxX = points[0].x, minY = points[0].y, maxY = points[0].y;
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;
    pathLen += Math.hypot(dx, dy);
    if (points[i].x < minX) minX = points[i].x;
    if (points[i].x > maxX) maxX = points[i].x;
    if (points[i].y < minY) minY = points[i].y;
    if (points[i].y > maxY) maxY = points[i].y;
  }

  if (pathLen < 25) return null;

  const directDist = Math.hypot(end.x - start.x, end.y - start.y);
  const width = maxX - minX;
  const height = maxY - minY;

  // 1. Line detection: path is very straight
  if (pathLen / directDist < 1.15 && directDist > 30) {
    return {
      shapeType: 'line',
      points: [
        { x: start.x, y: start.y, pressure: 0.5 },
        { x: end.x, y: end.y, pressure: 0.5 },
      ],
    };
  }

  // 2. Closed loop shapes: start and end are close together
  const isClosed = directDist < pathLen * 0.25 || directDist < 40;
  if (isClosed && points.length >= 8 && width > 18 && height > 18) {
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const radiusX = width / 2;
    const radiusY = height / 2;

    // Check if points fit an ellipse / circle
    let ellipseErr = 0;
    for (const p of points) {
      const normX = (p.x - centerX) / (radiusX || 1);
      const normY = (p.y - centerY) / (radiusY || 1);
      const distFromBoundary = Math.abs(Math.hypot(normX, normY) - 1.0);
      ellipseErr += distFromBoundary;
    }
    const avgEllipseErr = ellipseErr / points.length;

    if (avgEllipseErr < 0.25) {
      return {
        shapeType: 'ellipse',
        points: [
          { x: minX, y: minY, pressure: 0.5 },
          { x: maxX, y: maxY, pressure: 0.5 },
        ],
      };
    }

    // Check rectangle: points stay near the 4 borders of the bounding box
    let rectErr = 0;
    for (const p of points) {
      const dLeft = Math.abs(p.x - minX);
      const dRight = Math.abs(p.x - maxX);
      const dTop = Math.abs(p.y - minY);
      const dBottom = Math.abs(p.y - maxY);
      const minBorderDist = Math.min(dLeft, dRight, dTop, dBottom);
      rectErr += minBorderDist;
    }
    const avgRectErr = rectErr / points.length;
    const maxDim = Math.max(width, height);

    if (avgRectErr / maxDim < 0.18) {
      return {
        shapeType: 'rect',
        points: [
          { x: minX, y: minY, pressure: 0.5 },
          { x: maxX, y: maxY, pressure: 0.5 },
        ],
      };
    }
  }

  return null;
}
