import { XoppDocument, Stroke, TextElement } from '../types/document';

export interface XournalPluginContext {
  document: XoppDocument;
  activePageIndex: number;
  activeLayerIndex: number;
  setColor: (color: string) => void;
  addStroke: (stroke: Stroke) => void;
  addTextElement: (text: TextElement) => void;
  deleteSelectedStrokes: () => void;
  clearActivePage: () => void;
  addNewPage: () => void;
}

export interface XournalPlugin {
  id: string;
  name: string;
  description: string;
  author: string;
  version: string;
  enabled: boolean;
  execute: (ctx: XournalPluginContext) => void | Promise<void>;
}

export const BUILTIN_PLUGINS: XournalPlugin[] = [
  {
    id: 'insert-timestamp',
    name: 'Insertar Marca de Tiempo',
    description: 'Inserta la fecha y hora actual en la esquina superior de la página activa.',
    author: 'Xournal++ Team',
    version: '1.0.0',
    enabled: true,
    execute: (ctx) => {
      const now = new Date();
      const timeStr = `📅 ${now.toLocaleDateString()} ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      ctx.addTextElement({
        id: `text-ts-${Date.now()}`,
        x: 60,
        y: 40,
        text: timeStr,
        fontSize: 14,
        fontFamily: 'sans-serif',
        color: '#475569',
        italic: true,
      });
    },
  },
  {
    id: 'cycle-color',
    name: 'Ciclo de Colores (ColorCycle)',
    description: 'Alterna instantáneamente entre los colores principales (Azul → Verde → Rojo → Púrpura → Negro).',
    author: 'Xournal++ Team',
    version: '1.0.0',
    enabled: true,
    execute: (ctx) => {
      const palette = ['#2563eb', '#16a34a', '#dc2626', '#9333ea', '#000000'];
      const curColor = ctx.document.pages[ctx.activePageIndex]?.layers[0]?.strokes?.slice(-1)[0]?.color || '#000000';
      const curIndex = palette.indexOf(curColor);
      const nextColor = palette[(curIndex + 1) % palette.length];
      ctx.setColor(nextColor);
    },
  },
  {
    id: 'clean-empty-layers',
    name: 'Limpiar Capas Vacías',
    description: 'Elimina de la página activa aquellas capas que no contienen trazos ni textos.',
    author: 'Xournal++ Team',
    version: '1.0.0',
    enabled: true,
    execute: (ctx) => {
      const page = ctx.document.pages[ctx.activePageIndex];
      if (!page || page.layers.length <= 1) return;

      const nonEmpty = page.layers.filter(
        (l) => l.strokes.length > 0 || (l.texts && l.texts.length > 0) || (l.images && l.images.length > 0)
      );

      if (nonEmpty.length > 0 && nonEmpty.length < page.layers.length) {
        page.layers = nonEmpty;
      }
    },
  },
];

