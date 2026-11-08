import { Point } from '../types/document';

export interface StabilizerConfig {
  enabled: boolean;
  deadzoneRadius: number; // e.g. 1.5 - 3.0 px
  inertia: number;        // 0.0 (raw) to 0.8 (super smooth)
  cuspDetection: boolean; // Preserves sharp corners
  cuspAngleThresholdDeg: number; // e.g. 55 degrees
}

export const defaultStabilizerConfig: StabilizerConfig = {
  enabled: false,
  deadzoneRadius: 0.5,
  inertia: 0.0,
  cuspDetection: true,
  cuspAngleThresholdDeg: 60,
};

/**
 * High-performance real-time stroke stabilizer.
 * Filters tremor, applies mass-spring inertia and preserves corner cusps.
 */
export class StrokeStabilizer {
  private config: StabilizerConfig;
  private currentX = 0;
  private currentY = 0;
  private lastRawX = 0;
  private lastRawY = 0;
  private prevDirX = 0;
  private prevDirY = 0;
  private hasPoint = false;

  constructor(config: StabilizerConfig = defaultStabilizerConfig) {
    this.config = config;
  }

  public reset(startPt?: Point) {
    if (startPt) {
      this.currentX = startPt.x;
      this.currentY = startPt.y;
      this.lastRawX = startPt.x;
      this.lastRawY = startPt.y;
      this.prevDirX = 0;
      this.prevDirY = 0;
      this.hasPoint = true;
    } else {
      this.hasPoint = false;
    }
  }

  public setConfig(config: Partial<StabilizerConfig>) {
    this.config = { ...this.config, ...config };
  }

  /**
   * Filters and stabilizes a new raw input point from the stylus/mouse.
   * Returns null if point falls inside deadzone (jitter filtering).
   */
  public push(rawPt: Point): Point | null {
    if (!this.config.enabled) {
      return rawPt;
    }

    if (!this.hasPoint) {
      this.reset(rawPt);
      return rawPt;
    }

    const dx = rawPt.x - this.lastRawX;
    const dy = rawPt.y - this.lastRawY;
    const dist = Math.hypot(dx, dy);

    // 1. Deadzone filter (drop microscopic jitter)
    if (dist < this.config.deadzoneRadius) {
      return null;
    }

    this.lastRawX = rawPt.x;
    this.lastRawY = rawPt.y;

    // 2. Cusp detection: sharp direction change
    if (this.config.cuspDetection && dist > 2) {
      const dirX = dx / dist;
      const dirY = dy / dist;

      if (this.prevDirX !== 0 || this.prevDirY !== 0) {
        // Dot product between previous direction and current direction
        const dot = Math.max(-1, Math.min(1, this.prevDirX * dirX + this.prevDirY * dirY));
        const angleDeg = (Math.acos(dot) * 180) / Math.PI;

        if (angleDeg > this.config.cuspAngleThresholdDeg) {
          // Sharp cusp detected! Snap stabilized position to cusp vertex to keep it sharp
          this.currentX = rawPt.x;
          this.currentY = rawPt.y;
          this.prevDirX = dirX;
          this.prevDirY = dirY;
          return {
            x: rawPt.x,
            y: rawPt.y,
            pressure: rawPt.pressure,
            time: rawPt.time,
          };
        }
      }

      this.prevDirX = dirX;
      this.prevDirY = dirY;
    }

    // 3. Inertia / Exponential Weighted Moving Average (EWMA)
    const inertia = Math.max(0, Math.min(0.85, this.config.inertia));
    const alpha = 1.0 - inertia;

    this.currentX += (rawPt.x - this.currentX) * alpha;
    this.currentY += (rawPt.y - this.currentY) * alpha;

    return {
      x: this.currentX,
      y: this.currentY,
      pressure: rawPt.pressure,
      time: rawPt.time,
    };
  }

  /**
   * Finalizes the stroke when pointer is lifted, snapping directly to final raw coordinate.
   */
  public finalize(lastPt: Point): Point {
    this.currentX = lastPt.x;
    this.currentY = lastPt.y;
    return lastPt;
  }
}

