import { gunzipSync, gzipSync } from 'fflate';
import { XMLParser, XMLBuilder } from 'fast-xml-parser';
import {
  XoppDocument,
  Page,
  Layer,
  Stroke,
  Point,
  PageBackgroundType,
} from '../types/document';

/**
 * Checks if a byte buffer is GZIP compressed (0x1F 0x8B).
 */
function isGzip(data: Uint8Array): boolean {
  return data.length >= 2 && data[0] === 0x1f && data[1] === 0x8b;
}

/**
 * Parses an .xopp or .xoj file from raw binary buffer.
 */
export function parseXopp(buffer: Uint8Array): XoppDocument {
  let xmlString: string;

  if (isGzip(buffer)) {
    const decompressed = gunzipSync(buffer);
    xmlString = new TextDecoder('utf-8').decode(decompressed);
  } else {
    // Plain uncompressed XML (some .xoj or exported files)
    xmlString = new TextDecoder('utf-8').decode(buffer);
  }

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    textNodeName: '#text',
    isArray: (name) => ['page', 'layer', 'stroke', 'text'].indexOf(name) !== -1,
  });

  const parsed = parser.parse(xmlString);
  const xournal = parsed.xournal;
  if (!xournal) {
    throw new Error('El archivo no tiene el formato XML de Xournal / Xournal++.');
  }

  const title = xournal.title || 'Documento sin título';
  const xmlPages = Array.isArray(xournal.page) ? xournal.page : [xournal.page];

  const pages: Page[] = xmlPages.filter(Boolean).map((p: any, pageIndex: number) => {
    const width = parseFloat(p['@_width']) || 794;
    const height = parseFloat(p['@_height']) || 1123;

    // Background parse
    const bgNode = p.background || {};
    const bgType = (bgNode['@_type'] || 'plain') as PageBackgroundType;
    const bgColor = bgNode['@_color'] || '#ffffff';
    const bgStyle = bgNode['@_style'] || 'lined';

    // Layers parse
    const rawLayers = Array.isArray(p.layer) ? p.layer : p.layer ? [p.layer] : [];
    const layers: Layer[] = rawLayers.map((l: any, layerIndex: number) => {
      const rawStrokes = Array.isArray(l.stroke) ? l.stroke : l.stroke ? [l.stroke] : [];
      const strokes: Stroke[] = rawStrokes.map((s: any, strokeIndex: number) => {
        const tool = (s['@_tool'] === 'highlighter' ? 'highlighter' : 'pen') as 'pen' | 'highlighter';
        const color = normalizeHexColor(s['@_color'] || '#000000');
        const width = parseFloat(s['@_width']) || 2.0;

        // Parse coordinates string: "x1 y1 x2 y2 x3 y3 ..."
        const coordsText = (typeof s === 'string' ? s : s['#text'] || '').trim();
        const coords = coordsText.split(/\s+/).map((n: string) => parseFloat(n));

        const points: Point[] = [];
        for (let i = 0; i < coords.length - 1; i += 2) {
          const x = coords[i];
          const y = coords[i + 1];
          if (!isNaN(x) && !isNaN(y)) {
            points.push({ x, y, pressure: 0.5 });
          }
        }

        return {
          id: `stroke-${pageIndex}-${layerIndex}-${strokeIndex}`,
          tool,
          color,
          width,
          points,
          opacity: tool === 'highlighter' ? 0.45 : 1.0,
        };
      });

      return {
        id: `layer-${pageIndex}-${layerIndex}`,
        name: l['@_name'] || `Capa ${layerIndex + 1}`,
        visible: true,
        strokes,
      };
    });

    if (layers.length === 0) {
      layers.push({
        id: `layer-${pageIndex}-0`,
        name: 'Capa 1',
        visible: true,
        strokes: [],
      });
    }

    return {
      id: `page-${pageIndex + 1}`,
      pageNumber: pageIndex + 1,
      width,
      height,
      background: {
        type: bgType,
        color: bgColor,
        style: bgStyle,
      },
      layers,
    };
  });

  return {
    title,
    pages,
  };
}

/**
 * Serializes a document into standard Xournal++ .xopp file bytes (GZIP XML).
 */
export function exportXopp(document: XoppDocument): Uint8Array {
  const xmlObj = {
    '?xml': {
      '@_version': '1.0',
      '@_standalone': 'no',
    },
    xournal: {
      '@_creator': 'Xournal++ Web',
      '@_fileversion': '4',
      title: document.title,
      page: document.pages.map((p) => ({
        '@_width': p.width.toFixed(2),
        '@_height': p.height.toFixed(2),
        background: {
          '@_type': p.background.type,
          '@_color': p.background.color || '#ffffff',
          '@_style': p.background.style || 'lined',
        },
        layer: p.layers.map((l) => ({
          '@_name': l.name,
          stroke: l.strokes.map((s) => ({
            '@_tool': s.tool,
            '@_color': s.color,
            '@_width': s.width.toFixed(2),
            '#text': s.points.map((pt) => `${pt.x.toFixed(2)} ${pt.y.toFixed(2)}`).join(' '),
          })),
        })),
      })),
    },
  };

  const builder = new XMLBuilder({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    textNodeName: '#text',
    format: true,
    suppressEmptyNode: true,
  });

  const xmlContent = builder.build(xmlObj);
  const utf8Bytes = new TextEncoder().encode(xmlContent);

  // Compress using GZIP
  return gzipSync(utf8Bytes, { level: 6 });
}

function normalizeHexColor(c: string): string {
  if (!c) return '#000000';
  if (c.startsWith('#')) return c;
  // If named color or numeric, ensure # prefix
  return `#${c}`;
}

