import { PageBackground } from '../types/document';

/**
 * Draws the page background (paper color, grid lines, ruled lines, or dots).
 */
export function renderBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  background: PageBackground
) {
  // 1. Fill base paper color
  ctx.save();
  ctx.fillStyle = background.color || '#ffffff';
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = '#cbd5e1'; // light slate color for guides
  ctx.lineWidth = 1;

  switch (background.type) {
    case 'plain':
      break;

    case 'lined':
    case 'ruled': {
      const lineSpacing = 24; // standard ruled spacing
      const topMargin = 72; // 1 inch
      const leftMargin = 72; // red margin line

      // Horizontal lines
      ctx.beginPath();
      for (let y = topMargin; y < height - 20; y += lineSpacing) {
        ctx.moveTo(20, y);
        ctx.lineTo(width - 20, y);
      }
      ctx.stroke();

      // Vertical margin line in light pink/red
      ctx.strokeStyle = '#fca5a5';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(leftMargin, 20);
      ctx.lineTo(leftMargin, height - 20);
      ctx.stroke();
      break;
    }

    case 'graph': {
      const gridSize = 20; // 5mm approx in screen pixels
      ctx.beginPath();
      for (let x = gridSize; x < width; x += gridSize) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
      }
      for (let y = gridSize; y < height; y += gridSize) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      ctx.stroke();
      break;
    }

    case 'dotted': {
      const dotSpacing = 20;
      ctx.fillStyle = '#94a3b8';
      for (let x = dotSpacing; x < width; x += dotSpacing) {
        for (let y = dotSpacing; y < height; y += dotSpacing) {
          ctx.beginPath();
          ctx.arc(x, y, 1.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      break;
    }

    case 'isodotted': {
      const spacing = 24;
      const rowHeight = spacing * 0.866025; // sqrt(3)/2
      ctx.fillStyle = '#94a3b8';
      let rowIndex = 0;
      for (let y = rowHeight; y < height; y += rowHeight, rowIndex++) {
        const xOffset = (rowIndex % 2 === 1) ? spacing / 2 : 0;
        for (let x = xOffset + spacing; x < width; x += spacing) {
          ctx.beginPath();
          ctx.arc(x, y, 1.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      break;
    }

    case 'isograph': {
      const spacing = 28;
      const rowHeight = spacing * 0.866025;
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 0.8;
      ctx.beginPath();

      // Horizontal lines
      for (let y = rowHeight; y < height; y += rowHeight) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }

      // Diagonal +60 deg lines
      const tan60 = Math.tan(Math.PI / 3);
      for (let x = -height / tan60; x < width + height / tan60; x += spacing) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x + height / tan60, height);
      }

      // Diagonal -60 deg lines
      for (let x = 0; x < width + 2 * height / tan60; x += spacing) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x - height / tan60, height);
      }

      ctx.stroke();
      break;
    }

    case 'staves': {
      // Musical pentagrams (5 lines per staff, spacing 8px, margin between staffs 42px)
      const lineGap = 8;
      const staffHeight = lineGap * 4;
      const staffMargin = 44;
      const totalStaffHeight = staffHeight + staffMargin;
      const topMargin = 50;

      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 1;
      ctx.beginPath();

      for (let staffTop = topMargin; staffTop < height - 60; staffTop += totalStaffHeight) {
        for (let line = 0; line < 5; line++) {
          const y = staffTop + line * lineGap;
          ctx.moveTo(35, y);
          ctx.lineTo(width - 35, y);
        }
        // Vertical closing bar lines at ends
        ctx.moveTo(35, staffTop);
        ctx.lineTo(35, staffTop + staffHeight);
        ctx.moveTo(width - 35, staffTop);
        ctx.lineTo(width - 35, staffTop + staffHeight);
      }

      ctx.stroke();
      break;
    }

    case 'pdf':
      // Handled separately when PDF rendering is active
      break;
  }

  ctx.restore();
}

