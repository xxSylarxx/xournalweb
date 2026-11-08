import { SetsquareState, CompassState } from '../store/useAppStore';
import { Point } from '../types/document';

/**
 * Returns the 3 vertices of the right-angled isosceles setsquare (45-45-90) in world coordinates.
 */
export function getSetsquareVertices(state: SetsquareState): { p0: Point; p1: Point; p2: Point } {
  const { x, y, angle, size } = state;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  // Local coordinates: right angle at (0, 0), legs of length size along +X and +Y
  const p0: Point = { x, y, pressure: 0.5 };
  const p1: Point = {
    x: x + size * cos,
    y: y + size * sin,
    pressure: 0.5,
  };
  const p2: Point = {
    x: x - size * sin,
    y: y + size * cos,
    pressure: 0.5,
  };

  return { p0, p1, p2 };
}

/**
 * Renders an interactive, semi-transparent drafting setsquare (escuadra graduada)
 * with millimeter markings, degree ticks, and a center rotation wheel.
 */
export function renderSetsquare(
  ctx: CanvasRenderingContext2D,
  state: SetsquareState
) {
  const { x, y, angle, size } = state;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  // 1. Transparent plastic body
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(size, 0);
  ctx.lineTo(0, size);
  ctx.closePath();

  ctx.fillStyle = 'rgba(219, 234, 254, 0.28)'; // Soft transparent cyan/blue
  ctx.fill();

  ctx.strokeStyle = '#2563eb';
  ctx.lineWidth = 1.8;
  ctx.stroke();

  // 2. Inner triangular cutout
  const margin = size * 0.22;
  const innerSize = size - margin * 2.4;
  if (innerSize > 20) {
    ctx.beginPath();
    ctx.moveTo(margin, margin);
    ctx.lineTo(margin + innerSize, margin);
    ctx.lineTo(margin, margin + innerSize);
    ctx.closePath();
    ctx.strokeStyle = 'rgba(37, 99, 235, 0.4)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // 3. Millimeter and centimeter ticks along horizontal leg
  ctx.strokeStyle = '#1e3a8a';
  ctx.fillStyle = '#1e3a8a';
  ctx.font = '8px sans-serif';

  const cmSpacing = 37.8; // ~1 cm in 96 DPI
  const mmSpacing = cmSpacing / 10;
  for (let d = 0; d <= size - 10; d += mmSpacing) {
    const isCm = Math.round(d / mmSpacing) % 10 === 0;
    const isHalfCm = Math.round(d / mmSpacing) % 5 === 0;
    const tickLen = isCm ? 12 : isHalfCm ? 8 : 5;

    ctx.lineWidth = isCm ? 1.2 : 0.7;
    ctx.beginPath();
    ctx.moveTo(d, 0);
    ctx.lineTo(d, tickLen);
    ctx.stroke();

    if (isCm && d > 5) {
      const cmVal = Math.round(d / cmSpacing);
      ctx.fillText(`${cmVal}`, d - 3, tickLen + 9);
    }
  }

  // 4. Millimeter ticks along vertical leg
  for (let d = 0; d <= size - 10; d += mmSpacing) {
    const isCm = Math.round(d / mmSpacing) % 10 === 0;
    const isHalfCm = Math.round(d / mmSpacing) % 5 === 0;
    const tickLen = isCm ? 12 : isHalfCm ? 8 : 5;

    ctx.lineWidth = isCm ? 1.2 : 0.7;
    ctx.beginPath();
    ctx.moveTo(0, d);
    ctx.lineTo(tickLen, d);
    ctx.stroke();

    if (isCm && d > 5) {
      const cmVal = Math.round(d / cmSpacing);
      ctx.fillText(`${cmVal}`, tickLen + 3, d + 3);
    }
  }

  // 5. Protractor arc with degree marks
  const protractorRadius = size * 0.38;
  ctx.beginPath();
  ctx.arc(0, 0, protractorRadius, 0, Math.PI / 2);
  ctx.strokeStyle = 'rgba(30, 58, 138, 0.6)';
  ctx.lineWidth = 1;
  ctx.stroke();

  for (let deg = 0; deg <= 90; deg += 5) {
    const rad = (deg * Math.PI) / 180;
    const isTen = deg % 10 === 0;
    const r1 = protractorRadius;
    const r2 = protractorRadius - (isTen ? 9 : 5);

    ctx.beginPath();
    ctx.moveTo(Math.cos(rad) * r1, Math.sin(rad) * r1);
    ctx.lineTo(Math.cos(rad) * r2, Math.sin(rad) * r2);
    ctx.stroke();

    if (isTen && deg > 0 && deg < 90) {
      const rText = r2 - 8;
      ctx.fillText(`${deg}°`, Math.cos(rad) * rText - 5, Math.sin(rad) * rText + 3);
    }
  }

  // 6. Rotation handle icon at hypotenuse center
  const hypoMidX = size / 2;
  const hypoMidY = size / 2;
  ctx.beginPath();
  ctx.arc(hypoMidX, hypoMidY, 9, 0, Math.PI * 2);
  ctx.fillStyle = '#22c55e';
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.restore();
}

/**
 * Checks if a point hits the setsquare body or its rotation handle.
 */
export function hitTestSetsquare(
  pt: Point,
  state: SetsquareState
): 'rotate' | 'body' | 'none' {
  const { x, y, angle, size } = state;
  const cos = Math.cos(-angle);
  const sin = Math.sin(-angle);

  // Transform point to setsquare local space
  const dx = pt.x - x;
  const dy = pt.y - y;
  const localX = dx * cos - dy * sin;
  const localY = dx * sin + dy * cos;

  // Check rotation handle at (size/2, size/2)
  const hypoMidX = size / 2;
  const hypoMidY = size / 2;
  if (Math.hypot(localX - hypoMidX, localY - hypoMidY) <= 14) {
    return 'rotate';
  }

  // Check inside triangle: localX >= 0, localY >= 0, localX + localY <= size
  if (localX >= -5 && localY >= -5 && localX + localY <= size + 10) {
    return 'body';
  }

  return 'none';
}

/**
 * Magnetically snaps a drawing point to the nearest edge of the setsquare if within tolerance.
 */
export function snapPointToSetsquare(
  pt: Point,
  state: SetsquareState,
  tolerance = 12
): Point {
  const { p0, p1, p2 } = getSetsquareVertices(state);

  const edges = [
    { a: p0, b: p1 }, // Leg 1
    { a: p0, b: p2 }, // Leg 2
    { a: p1, b: p2 }, // Hypotenuse
  ];

  let bestDist = tolerance;
  let snappedPt: Point | null = null;

  for (const edge of edges) {
    const dx = edge.b.x - edge.a.x;
    const dy = edge.b.y - edge.a.y;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) continue;

    let t = ((pt.x - edge.a.x) * dx + (pt.y - edge.a.y) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));

    const projX = edge.a.x + t * dx;
    const projY = edge.a.y + t * dy;
    const dist = Math.hypot(pt.x - projX, pt.y - projY);

    if (dist < bestDist) {
      bestDist = dist;
      snappedPt = { ...pt, x: projX, y: projY };
    }
  }

  return snappedPt || pt;
}

/**
 * Renders an interactive drafting compass.
 */
export function renderCompass(
  ctx: CanvasRenderingContext2D,
  state: CompassState
) {
  const { centerX, centerY, radius } = state;

  ctx.save();

  // 1. Center needle indicator
  ctx.beginPath();
  ctx.arc(centerX, centerY, 5, 0, Math.PI * 2);
  ctx.fillStyle = '#ef4444'; // Red center needle
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // 2. Guide circle
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(59, 130, 246, 0.45)';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([6, 4]);
  ctx.stroke();

  // 3. Radius bar and resize handle
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(centerX, centerY);
  ctx.lineTo(centerX + radius, centerY);
  ctx.strokeStyle = '#3b82f6';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Radius handle
  ctx.beginPath();
  ctx.arc(centerX + radius, centerY, 6, 0, Math.PI * 2);
  ctx.fillStyle = '#22c55e';
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Radius text badge
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(centerX + radius / 2 - 20, centerY - 18, 40, 16);
  ctx.fillStyle = '#ffffff';
  ctx.font = '10px sans-serif';
  ctx.fillText(`${Math.round(radius)} px`, centerX + radius / 2 - 16, centerY - 6);

  ctx.restore();
}

/**
 * Snaps a drawing point magnetically to the compass circumference.
 */
export function snapPointToCompass(
  pt: Point,
  state: CompassState,
  tolerance = 14
): Point {
  const dx = pt.x - state.centerX;
  const dy = pt.y - state.centerY;
  const dist = Math.hypot(dx, dy);

  if (Math.abs(dist - state.radius) <= tolerance && dist > 0) {
    const scale = state.radius / dist;
    return {
      ...pt,
      x: state.centerX + dx * scale,
      y: state.centerY + dy * scale,
    };
  }

  return pt;
}
