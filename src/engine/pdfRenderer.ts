import * as pdfjsLib from 'pdfjs-dist';
import { XoppDocument, Page, PdfBookmark } from '../types/document';

// Configure PDF.js worker
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
  ).toString();
}

// In-memory cache of loaded PDFDocumentProxy objects
const pdfDocCache = new Map<string, pdfjsLib.PDFDocumentProxy>();

/**
 * Loads a PDF document proxy from Uint8Array buffer.
 */
export async function getPdfDocumentProxy(
  pdfBuffer: Uint8Array,
  docKey: string = 'current-pdf'
): Promise<pdfjsLib.PDFDocumentProxy> {
  if (pdfDocCache.has(docKey)) {
    return pdfDocCache.get(docKey)!;
  }

  // Clone buffer slice to ensure detached ArrayBuffer compatibility
  const copy = pdfBuffer.slice().buffer;
  const loadingTask = pdfjsLib.getDocument({ data: copy });
  const proxy = await loadingTask.promise;
  pdfDocCache.set(docKey, proxy);
  return proxy;
}

/**
 * Extracts the hierarchical Table of Contents (Outline / Bookmarks) from a PDF.
 */
export async function getPdfBookmarks(pdfDoc: pdfjsLib.PDFDocumentProxy): Promise<PdfBookmark[]> {
  try {
    const rawOutline = await pdfDoc.getOutline();
    if (!rawOutline || !Array.isArray(rawOutline)) return [];

    async function parseItems(items: any[]): Promise<PdfBookmark[]> {
      const result: PdfBookmark[] = [];
      for (const item of items) {
        let pageIndex = 0;
        try {
          if (typeof item.dest === 'string') {
            const dest = await pdfDoc.getDestination(item.dest);
            if (dest && dest[0]) {
              const ref = dest[0];
              pageIndex = await pdfDoc.getPageIndex(ref);
            }
          } else if (Array.isArray(item.dest) && item.dest[0]) {
            pageIndex = await pdfDoc.getPageIndex(item.dest[0]);
          }
        } catch {
          // Default to first page if resolution fails
          pageIndex = 0;
        }

        const bookmark: PdfBookmark = {
          title: item.title || 'Sección',
          pageIndex,
        };

        if (item.items && Array.isArray(item.items) && item.items.length > 0) {
          bookmark.children = await parseItems(item.items);
        }

        result.push(bookmark);
      }
      return result;
    }

    return await parseItems(rawOutline);
  } catch (err) {
    console.warn('Could not read PDF outline:', err);
    return [];
  }
}

/**
 * Renders a specific PDF page onto a target canvas.
 */
export async function renderPdfPageToCanvas(
  pdfDoc: pdfjsLib.PDFDocumentProxy,
  pageNumber: number,
  canvas: HTMLCanvasElement,
  dpr: number = 1
): Promise<void> {
  if (pageNumber < 1 || pageNumber > pdfDoc.numPages) return;

  const page = await pdfDoc.getPage(pageNumber);
  const unscaledViewport = page.getViewport({ scale: 1 });

  // Compute scale so PDF matches canvas CSS dimensions
  const cssWidth = canvas.width / dpr;
  const scale = (cssWidth / unscaledViewport.width) * dpr;
  const viewport = page.getViewport({ scale });

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const renderContext = {
    canvasContext: ctx,
    viewport: viewport,
  };

  await page.render(renderContext).promise;
}

/**
 * Renders a transparent text layer over the PDF canvas for text selection and clipboard copying.
 */
export async function renderPdfTextLayer(
  pdfDoc: pdfjsLib.PDFDocumentProxy,
  pageNumber: number,
  container: HTMLDivElement,
  pageWidth: number,
  pageHeight: number
): Promise<void> {
  if (pageNumber < 1 || pageNumber > pdfDoc.numPages) return;

  try {
    const page = await pdfDoc.getPage(pageNumber);
    const unscaledViewport = page.getViewport({ scale: 1 });
    const scale = pageWidth / unscaledViewport.width;
    const viewport = page.getViewport({ scale });

    const textContent = await page.getTextContent();
    container.innerHTML = '';
    container.style.width = `${pageWidth}px`;
    container.style.height = `${pageHeight}px`;

    for (const item of textContent.items as any[]) {
      if (!item.str || !item.transform) continue;

      const tx = pdfjsLib.Util.transform(viewport.transform, item.transform);
      const fontHeight = Math.sqrt(tx[2] * tx[2] + tx[3] * tx[3]);

      const span = document.createElement('span');
      span.textContent = item.str;
      span.style.position = 'absolute';
      span.style.left = `${tx[4]}px`;
      span.style.top = `${tx[5] - fontHeight}px`;
      span.style.fontSize = `${fontHeight}px`;
      span.style.fontFamily = item.fontName || 'sans-serif';
      span.style.color = 'transparent';
      span.style.cursor = 'text';
      span.style.userSelect = 'text';
      span.style.whiteSpace = 'pre';
      span.style.transformOrigin = 'left bottom';
      span.className = 'pdf-text-item select-text selection:bg-yellow-300/40 selection:text-transparent';

      container.appendChild(span);
    }
  } catch (err) {
    console.warn('Error rendering PDF text layer:', err);
  }
}

/**
 * Imports a PDF file and converts each of its pages into a XoppDocument page.
 */
export async function importPdfAsDocument(file: File): Promise<XoppDocument> {
  const arrayBuffer = await file.arrayBuffer();
  const pdfBytes = new Uint8Array(arrayBuffer);

  const docKey = `pdf-${Date.now()}`;
  const pdfDoc = await getPdfDocumentProxy(pdfBytes, docKey);
  const numPages = pdfDoc.numPages;

  const pages: Page[] = [];

  for (let i = 1; i <= numPages; i++) {
    const page = await pdfDoc.getPage(i);
    const viewport = page.getViewport({ scale: 1 });

    // Convert PDF points (72 DPI) to screen standard points (approx 96 DPI: scale * 1.33)
    const scaleFactor = 1.3333;
    const width = Math.round(viewport.width * scaleFactor);
    const height = Math.round(viewport.height * scaleFactor);

    pages.push({
      id: `page-pdf-${i}-${Date.now()}`,
      pageNumber: i,
      width,
      height,
      background: {
        type: 'pdf',
        color: '#ffffff',
        pdfPageIndex: i,
      },
      layers: [
        {
          id: `layer-${i}-1`,
          name: 'Capa 1',
          visible: true,
          strokes: [],
          texts: [],
        },
      ],
    });
  }

  // Extract outlines/bookmarks if available
  const bookmarks = await getPdfBookmarks(pdfDoc);

  return {
    title: file.name.replace(/\.pdf$/i, ''),
    pages,
    pdfFileBuffer: pdfBytes,
    pdfFileName: file.name,
    bookmarks: bookmarks.length > 0 ? bookmarks : undefined,
  };
}

/**
 * Clears the PDF proxy cache when changing documents.
 */
export function clearPdfCache() {
  pdfDocCache.clear();
}
