import { jsPDF } from 'jspdf';
import { XoppDocument, Page, LineStyle } from '../types/document';
import { renderBackground } from './backgroundRenderer';
import { renderStroke, getStrokeOutline, getSvgPathFromStroke } from './inking';
import { getPdfDocumentProxy, renderPdfPageToCanvas } from './pdfRenderer';

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

function getSvgDashAttr(style?: LineStyle): string {
  switch (style) {
    case 'dash': return 'stroke-dasharray="8,6"';
    case 'dot': return 'stroke-dasharray="2.5,4"';
    case 'dashdot': return 'stroke-dasharray="10,5,2.5,5"';
    default: return '';
  }
}

function getSvgArrowhead(fromX: number, fromY: number, toX: number, toY: number, width: number, color: string, opacity: number): string {
  const angle = Math.atan2(toY - fromY, toX - fromX);
  const headLength = Math.max(10, width * 3.5);
  const arrowAngle = Math.PI / 6;

  const x1 = toX - headLength * Math.cos(angle - arrowAngle);
  const y1 = toY - headLength * Math.sin(angle - arrowAngle);
  const x2 = toX - headLength * Math.cos(angle + arrowAngle);
  const y2 = toY - headLength * Math.sin(angle + arrowAngle);

  return `    <polygon points="${toX},${toY} ${x1},${y1} ${x2},${y2}" fill="${color}" opacity="${opacity}" />\n`;
}

/**
 * Renders an entire page (background, strokes, text) to an Offscreen HTMLCanvasElement.
 */
export async function renderPageToCanvas(
  page: Page,
  document: XoppDocument,
  scale: number = 2
): Promise<HTMLCanvasElement> {
  const canvas = window.document.createElement('canvas');
  canvas.width = Math.round(page.width * scale);
  canvas.height = Math.round(page.height * scale);

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No se pudo inicializar el contexto 2D');

  // 1. Render Background
  if (page.background.type === 'pdf' && document.pdfFileBuffer && page.background.pdfPageIndex) {
    try {
      const pdfDoc = await getPdfDocumentProxy(document.pdfFileBuffer);
      await renderPdfPageToCanvas(pdfDoc, page.background.pdfPageIndex, canvas, scale);
    } catch {
      ctx.save();
      ctx.scale(scale, scale);
      renderBackground(ctx, page.width, page.height, page.background);
      ctx.restore();
    }
  } else {
    ctx.save();
    ctx.scale(scale, scale);
    renderBackground(ctx, page.width, page.height, page.background);
    ctx.restore();
  }

  // 2. Render Inks & Texts
  ctx.save();
  ctx.scale(scale, scale);

  for (const layer of page.layers) {
    if (!layer.visible) continue;
    for (const stroke of layer.strokes) {
      renderStroke(ctx, stroke);
    }
    if (layer.texts) {
      for (const t of layer.texts) {
        ctx.save();
        ctx.fillStyle = t.color || '#000000';
        const style = `${t.italic ? 'italic ' : ''}${t.bold ? 'bold ' : ''}${t.fontSize || 18}px ${t.fontFamily || 'sans-serif'}`;
        ctx.font = style;
        ctx.textBaseline = 'top';
        const lines = t.text.split('\n');
        const lineH = (t.fontSize || 18) * 1.25;
        lines.forEach((l, idx) => {
          ctx.fillText(l, t.x, t.y + idx * lineH);
        });
        ctx.restore();
      }
    }
    if (layer.images) {
      for (const imgItem of layer.images) {
        await new Promise<void>((resolve) => {
          const img = new Image();
          img.onload = () => {
            ctx.drawImage(img, imgItem.x, imgItem.y, imgItem.width, imgItem.height);
            resolve();
          };
          img.onerror = () => resolve();
          img.src = imgItem.dataUrl;
        });
      }
    }
  }

  ctx.restore();
  return canvas;
}

/**
 * Exports the complete XoppDocument as a downloadable PDF file.
 * Optionally accepts a subset of page indices to export a specific range.
 */
export async function exportDocumentAsPdf(document: XoppDocument, pageIndices?: number[]): Promise<Blob> {
  const pagesToExport = (pageIndices && pageIndices.length > 0)
    ? pageIndices.map((idx) => document.pages[idx]).filter(Boolean)
    : document.pages;

  if (pagesToExport.length === 0) {
    throw new Error('No hay páginas seleccionadas para exportar');
  }

  const firstPage = pagesToExport[0];
  const orientation = firstPage.width > firstPage.height ? 'l' : 'p';

  // 72 pt per inch standard in jsPDF (convert from 96 DPI: pt = px * 0.75)
  const pdf = new jsPDF({
    orientation,
    unit: 'pt',
    format: [firstPage.width * 0.75, firstPage.height * 0.75],
  });

  for (let i = 0; i < pagesToExport.length; i++) {
    const page = pagesToExport[i];
    const pagePtWidth = page.width * 0.75;
    const pagePtHeight = page.height * 0.75;

    if (i > 0) {
      pdf.addPage([pagePtWidth, pagePtHeight], page.width > page.height ? 'l' : 'p');
    }

    const canvas = await renderPageToCanvas(page, document, 2);
    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    pdf.addImage(imgData, 'JPEG', 0, 0, pagePtWidth, pagePtHeight);
  }

  return pdf.output('blob');
}

/**
 * Exports a single page as a high-resolution PNG image.
 */
export async function exportPageAsPng(
  page: Page,
  document: XoppDocument,
  scale: number = 2
): Promise<Blob> {
  const canvas = await renderPageToCanvas(page, document, scale);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Error al generar imagen PNG'));
    }, 'image/png');
  });
}

/**
 * Exports a single page as a clean, scalable vector SVG string.
 */
export async function exportPageAsSvg(page: Page, document: XoppDocument): Promise<string> {
  const width = page.width;
  const height = page.height;

  let svg = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  svg += `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">\n`;

  // Background color
  svg += `  <rect width="${width}" height="${height}" fill="${page.background.color || '#ffffff'}" />\n`;

  // If PDF background, render PDF page to canvas and embed as base64 image
  if (page.background.type === 'pdf' && document.pdfFileBuffer && page.background.pdfPageIndex) {
    try {
      const pdfDoc = await getPdfDocumentProxy(document.pdfFileBuffer);
      const canvas = window.document.createElement('canvas');
      await renderPdfPageToCanvas(pdfDoc, page.background.pdfPageIndex, canvas, 2);
      const bgData = canvas.toDataURL('image/jpeg', 0.9);
      svg += `  <image href="${bgData}" x="0" y="0" width="${width}" height="${height}" />\n`;
    } catch (e) {
      console.warn('Could not embed PDF background in SVG:', e);
    }
  }

  // Layers
  for (const layer of page.layers) {
    if (!layer.visible) continue;
    svg += `  <g id="${layer.id}" data-name="${escapeXml(layer.name)}">\n`;

    // Strokes
    for (const stroke of layer.strokes) {
      const opacity = stroke.opacity ?? (stroke.tool === 'highlighter' ? 0.45 : 1.0);
      const blend = stroke.tool === 'highlighter' ? 'style="mix-blend-mode: multiply;"' : '';

      if (stroke.shapeType === 'line') {
        const p1 = stroke.points[0];
        const p2 = stroke.points[stroke.points.length - 1];
        svg += `    <line x1="${p1.x}" y1="${p1.y}" x2="${p2.x}" y2="${p2.y}" stroke="${stroke.color}" stroke-width="${stroke.width}" stroke-linecap="${stroke.capStyle || 'round'}" opacity="${opacity}" ${getSvgDashAttr(stroke.lineStyle)} ${blend} />\n`;
      } else if (stroke.shapeType === 'arrow' || stroke.shapeType === 'doubleArrow') {
        const p1 = stroke.points[0];
        const p2 = stroke.points[stroke.points.length - 1];
        svg += `    <line x1="${p1.x}" y1="${p1.y}" x2="${p2.x}" y2="${p2.y}" stroke="${stroke.color}" stroke-width="${stroke.width}" stroke-linecap="${stroke.capStyle || 'round'}" opacity="${opacity}" ${getSvgDashAttr(stroke.lineStyle)} ${blend} />\n`;
        svg += getSvgArrowhead(p1.x, p1.y, p2.x, p2.y, stroke.width, stroke.color, opacity);
        if (stroke.shapeType === 'doubleArrow') {
          svg += getSvgArrowhead(p2.x, p2.y, p1.x, p1.y, stroke.width, stroke.color, opacity);
        }
      } else if (stroke.shapeType === 'rect') {
        const p1 = stroke.points[0];
        const p2 = stroke.points[stroke.points.length - 1];
        const rx = Math.min(p1.x, p2.x);
        const ry = Math.min(p1.y, p2.y);
        const rw = Math.abs(p2.x - p1.x);
        const rh = Math.abs(p2.y - p1.y);
        const fill = stroke.fill ? `fill="${stroke.fill}" fill-opacity="${stroke.fillOpacity ?? 0.3}"` : 'fill="none"';
        svg += `    <rect x="${rx}" y="${ry}" width="${rw}" height="${rh}" stroke="${stroke.color}" stroke-width="${stroke.width}" ${fill} opacity="${opacity}" ${getSvgDashAttr(stroke.lineStyle)} ${blend} />\n`;
      } else if (stroke.shapeType === 'ellipse') {
        const p1 = stroke.points[0];
        const p2 = stroke.points[stroke.points.length - 1];
        const cx = (p1.x + p2.x) / 2;
        const cy = (p1.y + p2.y) / 2;
        const rx = Math.abs(p2.x - p1.x) / 2;
        const ry = Math.abs(p2.y - p1.y) / 2;
        const fill = stroke.fill ? `fill="${stroke.fill}" fill-opacity="${stroke.fillOpacity ?? 0.3}"` : 'fill="none"';
        svg += `    <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" stroke="${stroke.color}" stroke-width="${stroke.width}" ${fill} opacity="${opacity}" ${getSvgDashAttr(stroke.lineStyle)} ${blend} />\n`;
      } else {
        const outline = getStrokeOutline(stroke.points, {
          size: stroke.width,
          thinning: stroke.tool === 'highlighter' ? 0.05 : 0.5,
          smoothing: 0.4,
          streamline: 0.15,
          simulatePressure: stroke.points.every((p) => p.pressure === 0.5 || p.pressure === 0),
        });
        const pathData = getSvgPathFromStroke(outline);
        if (pathData) {
          svg += `    <path d="${pathData}" fill="${stroke.color}" opacity="${opacity}" ${blend} />\n`;
        }
      }
    }

    // Texts
    if (layer.texts) {
      for (const t of layer.texts) {
        const lines = t.text.split('\n');
        const lineH = (t.fontSize || 18) * 1.25;
        const weight = t.bold ? 'bold' : 'normal';
        const fontStyle = t.italic ? 'italic' : 'normal';
        const anchor = t.align === 'center' ? 'middle' : t.align === 'right' ? 'end' : 'start';

        svg += `    <text x="${t.x}" y="${t.y}" font-family="${t.fontFamily || 'sans-serif'}" font-size="${t.fontSize || 18}" font-weight="${weight}" font-style="${fontStyle}" fill="${t.color || '#000000'}" text-anchor="${anchor}">\n`;
        lines.forEach((line, idx) => {
          svg += `      <tspan x="${t.x}" dy="${idx === 0 ? t.fontSize || 18 : lineH}">${escapeXml(line)}</tspan>\n`;
        });
        svg += `    </text>\n`;
      }
    }

    // Images
    if (layer.images) {
      for (const img of layer.images) {
        svg += `    <image href="${img.dataUrl}" x="${img.x}" y="${img.y}" width="${img.width}" height="${img.height}" />\n`;
      }
    }

    svg += `  </g>\n`;
  }

  svg += `</svg>\n`;
  return svg;
}

/**
 * Downloads a Blob as a file with the specified filename.
 */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = window.document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
