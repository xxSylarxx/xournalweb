import { create } from 'zustand';
import {
  ToolType,
  EraserType,
  LineStyle,
  LineCap,
  XoppDocument,
  Stroke,
  TextElement,
  ImageElement,
  PageBackgroundType,
} from '../types/document';
import {
  HistoryManager,
  createAddStrokeCommand,
  createDeleteStrokesCommand,
  createUpdateStrokesCommand,
  createReplaceStrokesCommand,
} from '../engine/history';
import { translateStroke, scaleStroke, rotateStroke, getStrokeBoundingBox } from '../engine/shapes';
import { clearPdfCache } from '../engine/pdfRenderer';
import { StabilizerConfig, defaultStabilizerConfig } from '../engine/stabilizer';
import { saveDraftToStorage } from '../engine/storage';

export interface ToolSettings {
  color: string;
  width: number;
}

export type GeometryToolType = 'none' | 'setsquare' | 'compass';

export interface SetsquareState {
  x: number;
  y: number;
  angle: number; // in radians
  size: number;  // hypotenuse/base length in px
}

export interface CompassState {
  centerX: number;
  centerY: number;
  radius: number;
}

export interface PreferencesState {
  pressureMultiplier: number;
  minPressure: number;
  stylusButtonAction: 'eraser' | 'select' | 'hand' | 'highlighter';
  gridSnapping: boolean;
  gridSnapSize: number;
  rotationSnapping: boolean;
  autosaveIntervalMinutes: number;
  theme: 'dark' | 'light';
}

interface AppState {
  // Tool state
  activeTool: ToolType;
  eraserType: EraserType;
  penSettings: ToolSettings;
  highlighterSettings: ToolSettings;
  eraserWidth: number;
  lineStyle: LineStyle;
  capStyle: LineCap;
  shapeRecognizerEnabled: boolean;
  fillEnabled: boolean;
  fillOpacity: number;

  // Geometry tools (Setsquare / Compass)
  geometryTool: GeometryToolType;
  setsquareState: SetsquareState;
  compassState: CompassState;

  // Stroke stabilizer
  stabilizerConfig: StabilizerConfig;

  // View modes
  viewMode: 'single' | 'paired';
  isPresentationMode: boolean;
  isFullscreen: boolean;

  // Preferences & Modals
  preferences: PreferencesState;
  isPreferencesOpen: boolean;
  isPluginsModalOpen: boolean;
  isAudioRecorderOpen: boolean;
  pageAudioMap: Record<number, string>;

  // Page navigation history
  pageHistory: number[];
  pageHistoryIndex: number;

  // Text tool settings
  fontFamily: string;
  fontSize: number;
  isBold: boolean;
  isItalic: boolean;
  textAlign: 'left' | 'center' | 'right';

  // Document state
  document: XoppDocument;
  activePageIndex: number;
  activeLayerIndex: number;

  // Selection & Clipboard
  selectedStrokeIds: string[];
  clipboard: Stroke[];

  // Viewport & UI Modals
  zoom: number;
  isLayersPanelOpen: boolean;
  isLatexModalOpen: boolean;
  isSearchOpen: boolean;
  isExportModalOpen: boolean;
  isPageSettingsModalOpen: boolean;

  // History state
  canUndo: boolean;
  canRedo: boolean;
  history: HistoryManager;

  // Actions
  setActiveTool: (tool: ToolType) => void;
  setEraserType: (type: EraserType) => void;
  setColor: (color: string) => void;
  setWidth: (width: number) => void;
  setLineStyle: (style: LineStyle) => void;
  setCapStyle: (cap: LineCap) => void;
  toggleShapeRecognizer: () => void;
  setFillEnabled: (enabled: boolean) => void;
  setFillOpacity: (opacity: number) => void;
  setZoom: (zoom: number) => void;
  setActivePage: (index: number) => void;
  setActiveLayer: (index: number) => void;
  toggleLayersPanel: () => void;
  toggleLatexModal: () => void;
  toggleSearch: (open?: boolean) => void;
  toggleExportModal: () => void;
  togglePageSettingsModal: () => void;
  togglePreferences: () => void;
  togglePluginsModal: () => void;
  toggleAudioRecorder: () => void;
  togglePresentationMode: () => void;
  toggleViewMode: () => void;
  toggleFullscreen: () => void;
  updatePreferences: (patch: Partial<PreferencesState>) => void;
  savePageAudio: (pageIndex: number, audioUrl: string) => void;
  deletePageAudio: (pageIndex: number) => void;
  jumpBack: () => void;
  jumpForward: () => void;
  jumpToNextAnnotatedPage: () => void;
  jumpToPrevAnnotatedPage: () => void;
  setGeometryTool: (tool: GeometryToolType) => void;
  updateSetsquare: (patch: Partial<SetsquareState>) => void;
  updateCompass: (patch: Partial<CompassState>) => void;
  updateStabilizerConfig: (patch: Partial<StabilizerConfig>) => void;
  addImageElement: (imgItem: ImageElement) => void;

  // Text actions
  setFontFamily: (font: string) => void;
  setFontSize: (size: number) => void;
  toggleBold: () => void;
  toggleItalic: () => void;
  setTextAlign: (align: 'left' | 'center' | 'right') => void;
  addTextElement: (textItem: TextElement) => void;
  updateTextElement: (id: string, text: string) => void;
  deleteTextElement: (id: string) => void;

  // Drawing strokes
  addStroke: (stroke: Stroke) => void;
  deleteStrokes: (deleted: { stroke: Stroke; index: number }[]) => void;
  replaceStrokes: (removed: { stroke: Stroke; index: number }[], added: Stroke[]) => void;
  clearActivePage: () => void;

  // Layer management
  addNewLayer: () => void;
  deleteLayer: (index: number) => void;
  toggleLayerVisibility: (index: number) => void;
  renameLayer: (index: number, name: string) => void;
  duplicateLayer: (index: number) => void;
  moveLayer: (fromIndex: number, toIndex: number) => void;
  clearLayer: (index: number) => void;
  mergeLayerDown: (index: number) => void;
  moveSelectionToLayer: (targetLayerIndex: number) => void;

  // Selection actions
  setSelectedStrokeIds: (ids: string[]) => void;
  clearSelection: () => void;
  moveSelectedStrokes: (dx: number, dy: number) => void;
  scaleSelectedStrokes: (scaleX: number, scaleY: number, originX: number, originY: number) => void;
  rotateSelectedStrokes: (angleRad: number, originX: number, originY: number) => void;
  deleteSelectedStrokes: () => void;
  changeSelectedColor: (color: string) => void;
  changeSelectedWidth: (width: number) => void;
  changeSelectedLineStyle: (style: LineStyle) => void;
  bringSelectedToFront: () => void;
  sendSelectedToBack: () => void;
  selectAll: () => void;
  copySelection: () => void;
  cutSelection: () => void;
  pasteSelection: () => void;

  // Page management
  addNewPage: (type?: PageBackgroundType) => void;
  duplicateCurrentPage: () => void;
  movePage: (fromIndex: number, toIndex: number) => void;
  movePageToStart: () => void;
  movePageToEnd: () => void;
  deleteCurrentPage: () => void;
  setPageDimensions: (pageIndex: number, width: number, height: number) => void;
  insertVerticalSpace: (pageIndex: number, startY: number, dy: number) => void;
  setPageBackground: (pageIndex: number, type: PageBackgroundType, color?: string) => void;
  loadDocument: (doc: XoppDocument) => void;
  setDocumentTitle: (title: string) => void;

  // Undo / Redo
  undo: () => void;
  redo: () => void;
  updateHistoryState: () => void;
}

// Initial sample document
const createInitialDocument = (): XoppDocument => ({
  title: 'Nuevo Documento',
  pages: [
    {
      id: 'page-1',
      pageNumber: 1,
      width: 794,
      height: 1123,
      background: {
        type: 'lined',
        color: '#ffffff',
      },
      layers: [
        {
          id: 'layer-1',
          name: 'Capa 1',
          visible: true,
          strokes: [],
          texts: [],
        },
      ],
    },
  ],
});

const createUpdatedDocument = (
  doc: XoppDocument,
  pageIndex: number,
  layerIndex: number,
  strokes: Stroke[]
): XoppDocument => {
  const newPages = doc.pages.map((p, pIdx) => {
    if (pIdx !== pageIndex) return p;
    const newLayers = p.layers.map((l, lIdx) => {
      if (lIdx !== layerIndex) return l;
      return { ...l, strokes: [...strokes] };
    });
    return { ...p, layers: newLayers };
  });
  return { ...doc, pages: newPages };
};

export const useAppStore = create<AppState>((set, get) => {
  const history = new HistoryManager(() => {
    set({
      canUndo: get().history.canUndo(),
      canRedo: get().history.canRedo(),
    });
  });

  return {
    activeTool: 'pen',
    eraserType: 'stroke',
    penSettings: {
      color: '#000000',
      width: 2.0,
    },
    highlighterSettings: {
      color: '#fef08a',
      width: 14.0,
    },
    eraserWidth: 16.0,
    lineStyle: 'plain',
    capStyle: 'round',
    shapeRecognizerEnabled: false,
    fillEnabled: false,
    fillOpacity: 0.35,

    // Geometry tools
    geometryTool: 'none',
    setsquareState: {
      x: 250,
      y: 250,
      angle: 0,
      size: 260,
    },
    compassState: {
      centerX: 350,
      centerY: 350,
      radius: 120,
    },

    // Stroke stabilizer
    stabilizerConfig: { ...defaultStabilizerConfig },

    fontFamily: 'sans-serif',
    fontSize: 18,
    isBold: false,
    isItalic: false,
    textAlign: 'left',

    document: createInitialDocument(),
    activePageIndex: 0,
    activeLayerIndex: 0,

    selectedStrokeIds: [],
    clipboard: [],

    // View modes
    viewMode: 'single',
    isPresentationMode: false,
    isFullscreen: false,

    // Preferences & Modals
    preferences: {
      pressureMultiplier: 1.0,
      minPressure: 0.05,
      stylusButtonAction: 'eraser',
      gridSnapping: false,
      gridSnapSize: 20,
      rotationSnapping: true,
      autosaveIntervalMinutes: 3,
      theme: 'dark',
    },
    isPreferencesOpen: false,
    isPluginsModalOpen: false,
    isAudioRecorderOpen: false,
    pageAudioMap: {},

    // Page navigation history
    pageHistory: [0],
    pageHistoryIndex: 0,

    zoom: 1.0,
    isLayersPanelOpen: false,
    isLatexModalOpen: false,
    isSearchOpen: false,
    isExportModalOpen: false,
    isPageSettingsModalOpen: false,

    canUndo: false,
    canRedo: false,
    history,

    setActiveTool: (tool) => {
      set({ activeTool: tool });
      if (tool !== 'selectRect' && tool !== 'selectRegion') {
        set({ selectedStrokeIds: [] });
      }
    },

    setEraserType: (type) => set({ eraserType: type }),

    setColor: (color) => {
      const tool = get().activeTool;
      if (tool === 'pen' || tool === 'line' || tool === 'arrow' || tool === 'rect' || tool === 'ellipse' || tool === 'text') {
        set({ penSettings: { ...get().penSettings, color } });
      } else if (tool === 'highlighter') {
        set({ highlighterSettings: { ...get().highlighterSettings, color } });
      }

      if (get().selectedStrokeIds.length > 0) {
        get().changeSelectedColor(color);
      }
    },

    setWidth: (width) => {
      const tool = get().activeTool;
      if (tool === 'pen' || tool === 'line' || tool === 'arrow' || tool === 'rect' || tool === 'ellipse') {
        set({ penSettings: { ...get().penSettings, width } });
      } else if (tool === 'highlighter') {
        set({ highlighterSettings: { ...get().highlighterSettings, width } });
      } else if (tool === 'eraser') {
        set({ eraserWidth: width });
      }

      if (get().selectedStrokeIds.length > 0) {
        get().changeSelectedWidth(width);
      }
    },

    setLineStyle: (style) => {
      set({ lineStyle: style });
      if (get().selectedStrokeIds.length > 0) {
        get().changeSelectedLineStyle(style);
      }
    },

    setCapStyle: (cap) => set({ capStyle: cap }),
    toggleShapeRecognizer: () => set({ shapeRecognizerEnabled: !get().shapeRecognizerEnabled }),

    setFillEnabled: (enabled) => set({ fillEnabled: enabled }),
    setFillOpacity: (opacity) => set({ fillOpacity: opacity }),

    setFontFamily: (font) => set({ fontFamily: font }),
    setFontSize: (size) => set({ fontSize: Math.max(8, Math.min(72, size)) }),
    toggleBold: () => set({ isBold: !get().isBold }),
    toggleItalic: () => set({ isItalic: !get().isItalic }),
    setTextAlign: (textAlign) => set({ textAlign }),

    setZoom: (zoom) => set({ zoom: Math.max(0.3, Math.min(3.0, zoom)) }),
    toggleLayersPanel: () => set({ isLayersPanelOpen: !get().isLayersPanelOpen }),
    toggleLatexModal: () => set({ isLatexModalOpen: !get().isLatexModalOpen }),
    toggleSearch: (open) => set({ isSearchOpen: open !== undefined ? open : !get().isSearchOpen }),
    toggleExportModal: () => set({ isExportModalOpen: !get().isExportModalOpen }),
    togglePageSettingsModal: () => set({ isPageSettingsModalOpen: !get().isPageSettingsModalOpen }),
    togglePreferences: () => set({ isPreferencesOpen: !get().isPreferencesOpen }),
    togglePluginsModal: () => set({ isPluginsModalOpen: !get().isPluginsModalOpen }),
    toggleAudioRecorder: () => set({ isAudioRecorderOpen: !get().isAudioRecorderOpen }),
    togglePresentationMode: () => set({ isPresentationMode: !get().isPresentationMode }),
    toggleViewMode: () => set({ viewMode: get().viewMode === 'single' ? 'paired' : 'single' }),
    toggleFullscreen: () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
        set({ isFullscreen: true });
      } else {
        document.exitFullscreen().catch(() => {});
        set({ isFullscreen: false });
      }
    },
    updatePreferences: (patch) => set({ preferences: { ...get().preferences, ...patch } }),
    savePageAudio: (pageIndex, audioUrl) => set({ pageAudioMap: { ...get().pageAudioMap, [pageIndex]: audioUrl } }),
    deletePageAudio: (pageIndex) => {
      const nextMap = { ...get().pageAudioMap };
      delete nextMap[pageIndex];
      set({ pageAudioMap: nextMap });
    },
    jumpBack: () => {
      const { pageHistory, pageHistoryIndex } = get();
      if (pageHistoryIndex > 0) {
        const newIdx = pageHistoryIndex - 1;
        set({ pageHistoryIndex: newIdx, activePageIndex: pageHistory[newIdx] });
      }
    },
    jumpForward: () => {
      const { pageHistory, pageHistoryIndex } = get();
      if (pageHistoryIndex < pageHistory.length - 1) {
        const newIdx = pageHistoryIndex + 1;
        set({ pageHistoryIndex: newIdx, activePageIndex: pageHistory[newIdx] });
      }
    },
    jumpToNextAnnotatedPage: () => {
      const { document, activePageIndex } = get();
      for (let i = activePageIndex + 1; i < document.pages.length; i++) {
        const hasContent = document.pages[i].layers.some(
          l => (l.strokes && l.strokes.length > 0) || (l.texts && l.texts.length > 0) || (l.images && l.images.length > 0)
        );
        if (hasContent) {
          get().setActivePage(i);
          return;
        }
      }
    },
    jumpToPrevAnnotatedPage: () => {
      const { document, activePageIndex } = get();
      for (let i = activePageIndex - 1; i >= 0; i--) {
        const hasContent = document.pages[i].layers.some(
          l => (l.strokes && l.strokes.length > 0) || (l.texts && l.texts.length > 0) || (l.images && l.images.length > 0)
        );
        if (hasContent) {
          get().setActivePage(i);
          return;
        }
      }
    },

    setGeometryTool: (tool) => set({ geometryTool: tool }),
    updateSetsquare: (patch) => set({ setsquareState: { ...get().setsquareState, ...patch } }),
    updateCompass: (patch) => set({ compassState: { ...get().compassState, ...patch } }),
    updateStabilizerConfig: (patch) => set({ stabilizerConfig: { ...get().stabilizerConfig, ...patch } }),

    addImageElement: (imgItem) => {
      const { document, activePageIndex, activeLayerIndex } = get();
      const page = document.pages[activePageIndex];
      if (!page) return;
      const layer = page.layers[activeLayerIndex];
      if (!layer) return;

      if (!layer.images) layer.images = [];
      layer.images.push(imgItem);
      const nextDoc = { ...document };
      set({ document: nextDoc });
      saveDraftToStorage(nextDoc);
    },

    setActivePage: (index) => {
      const { document, activePageIndex, pageHistory, pageHistoryIndex } = get();
      if (index === activePageIndex) return;
      if (index >= 0 && index < document.pages.length) {
        const nextHist = [...pageHistory.slice(0, pageHistoryIndex + 1), index];
        set({
          activePageIndex: index,
          selectedStrokeIds: [],
          activeLayerIndex: 0,
          pageHistory: nextHist,
          pageHistoryIndex: nextHist.length - 1,
        });
      }
    },

    setActiveLayer: (index) => {
      const { document, activePageIndex } = get();
      const page = document.pages[activePageIndex];
      if (page && index >= 0 && index < page.layers.length) {
        set({ activeLayerIndex: index });
      }
    },

    addStroke: (stroke) => {
      const { document, activePageIndex, activeLayerIndex, history } = get();
      const page = document.pages[activePageIndex];
      if (!page) return;
      const layer = page.layers[activeLayerIndex];
      if (!layer) return;

      const cmd = createAddStrokeCommand(layer.strokes, stroke, () => {
        const updatedDoc = createUpdatedDocument(get().document, activePageIndex, activeLayerIndex, layer.strokes);
        set({ document: updatedDoc });
        saveDraftToStorage(updatedDoc);
      });

      history.execute(cmd);
    },

    deleteStrokes: (deleted) => {
      if (deleted.length === 0) return;
      const { document, activePageIndex, activeLayerIndex, history } = get();
      const page = document.pages[activePageIndex];
      if (!page) return;
      const layer = page.layers[activeLayerIndex];
      if (!layer) return;

      const cmd = createDeleteStrokesCommand(layer.strokes, deleted, () => {
        const updatedDoc = createUpdatedDocument(get().document, activePageIndex, activeLayerIndex, layer.strokes);
        set({ document: updatedDoc });
        saveDraftToStorage(updatedDoc);
      });

      history.execute(cmd);
    },

    replaceStrokes: (removed, added) => {
      if (removed.length === 0 && added.length === 0) return;
      const { document, activePageIndex, activeLayerIndex, history } = get();
      const page = document.pages[activePageIndex];
      if (!page) return;
      const layer = page.layers[activeLayerIndex];
      if (!layer) return;

      const cmd = createReplaceStrokesCommand(layer.strokes, removed, added, () => {
        const updatedDoc = createUpdatedDocument(get().document, activePageIndex, activeLayerIndex, layer.strokes);
        set({ document: updatedDoc });
        saveDraftToStorage(updatedDoc);
      });

      history.execute(cmd);
    },

    clearActivePage: () => {
      const { document, activePageIndex, activeLayerIndex, history } = get();
      const page = document.pages[activePageIndex];
      if (!page) return;
      const layer = page.layers[activeLayerIndex];
      if (!layer || layer.strokes.length === 0) return;

      const deleted = layer.strokes.map((s, index) => ({ stroke: s, index }));
      const cmd = createDeleteStrokesCommand(layer.strokes, deleted, () => {
        const updatedDoc = createUpdatedDocument(get().document, activePageIndex, activeLayerIndex, []);
        set({ document: updatedDoc, selectedStrokeIds: [] });
        saveDraftToStorage(updatedDoc);
      });
      history.execute(cmd);
    },

    // Layer management
    addNewLayer: () => {
      const { document, activePageIndex } = get();
      const page = document.pages[activePageIndex];
      if (!page) return;

      const newLayer = {
        id: `layer-${Date.now()}`,
        name: `Capa ${page.layers.length + 1}`,
        visible: true,
        strokes: [],
        texts: [],
      };

      page.layers.push(newLayer);
      set({
        document: { ...document },
        activeLayerIndex: page.layers.length - 1,
      });
    },

    deleteLayer: (index) => {
      const { document, activePageIndex, activeLayerIndex } = get();
      const page = document.pages[activePageIndex];
      if (!page || page.layers.length <= 1) return;

      page.layers.splice(index, 1);
      const nextActive = Math.min(activeLayerIndex, page.layers.length - 1);
      set({
        document: { ...document },
        activeLayerIndex: nextActive,
      });
    },

    toggleLayerVisibility: (index) => {
      const { document, activePageIndex } = get();
      const page = document.pages[activePageIndex];
      if (!page || !page.layers[index]) return;

      page.layers[index].visible = !page.layers[index].visible;
      set({ document: { ...document } });
    },

    renameLayer: (index, name) => {
      const { document, activePageIndex } = get();
      const page = document.pages[activePageIndex];
      if (!page || !page.layers[index]) return;

      const newPages = document.pages.map((p, pIdx) => {
        if (pIdx !== activePageIndex) return p;
        const newLayers = p.layers.map((l, lIdx) => (lIdx === index ? { ...l, name } : l));
        return { ...p, layers: newLayers };
      });
      set({ document: { ...document, pages: newPages } });
    },

    duplicateLayer: (index) => {
      const { document, activePageIndex } = get();
      const page = document.pages[activePageIndex];
      if (!page || !page.layers[index]) return;

      const srcLayer = page.layers[index];
      const clonedStrokes = srcLayer.strokes.map((s) => ({
        ...s,
        id: `stroke-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        points: s.points.map((p) => ({ ...p })),
      }));
      const clonedTexts = srcLayer.texts?.map((t) => ({
        ...t,
        id: `text-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      }));

      const newLayer = {
        id: `layer-${Date.now()}`,
        name: `${srcLayer.name} (Copia)`,
        visible: true,
        strokes: clonedStrokes,
        texts: clonedTexts,
      };

      const newPages = document.pages.map((p, pIdx) => {
        if (pIdx !== activePageIndex) return p;
        const newLayers = [...p.layers];
        newLayers.splice(index + 1, 0, newLayer);
        return { ...p, layers: newLayers };
      });

      set({
        document: { ...document, pages: newPages },
        activeLayerIndex: index + 1,
      });
    },

    moveLayer: (fromIndex, toIndex) => {
      const { document, activePageIndex } = get();
      const page = document.pages[activePageIndex];
      if (!page || fromIndex < 0 || fromIndex >= page.layers.length || toIndex < 0 || toIndex >= page.layers.length) {
        return;
      }

      const newPages = document.pages.map((p, pIdx) => {
        if (pIdx !== activePageIndex) return p;
        const newLayers = [...p.layers];
        const [moved] = newLayers.splice(fromIndex, 1);
        newLayers.splice(toIndex, 0, moved);
        return { ...p, layers: newLayers };
      });

      set({
        document: { ...document, pages: newPages },
        activeLayerIndex: toIndex,
      });
    },

    clearLayer: (index) => {
      const { document, activePageIndex } = get();
      const page = document.pages[activePageIndex];
      if (!page || !page.layers[index]) return;

      const newPages = document.pages.map((p, pIdx) => {
        if (pIdx !== activePageIndex) return p;
        const newLayers = p.layers.map((l, lIdx) =>
          lIdx === index ? { ...l, strokes: [], texts: [], images: [] } : l
        );
        return { ...p, layers: newLayers };
      });

      set({
        document: { ...document, pages: newPages },
        selectedStrokeIds: [],
      });
    },

    mergeLayerDown: (index) => {
      const { document, activePageIndex } = get();
      const page = document.pages[activePageIndex];
      if (!page || index <= 0 || index >= page.layers.length) return;

      const upperLayer = page.layers[index];
      const lowerLayer = page.layers[index - 1];

      const mergedLower = {
        ...lowerLayer,
        strokes: [...lowerLayer.strokes, ...upperLayer.strokes],
        texts: [...(lowerLayer.texts || []), ...(upperLayer.texts || [])],
        images: [...(lowerLayer.images || []), ...(upperLayer.images || [])],
      };

      const newPages = document.pages.map((p, pIdx) => {
        if (pIdx !== activePageIndex) return p;
        const newLayers = [...p.layers];
        newLayers.splice(index, 1); // remove upper
        newLayers[index - 1] = mergedLower; // replace lower with merged
        return { ...p, layers: newLayers };
      });

      set({
        document: { ...document, pages: newPages },
        activeLayerIndex: index - 1,
      });
    },

    moveSelectionToLayer: (targetLayerIndex) => {
      const { document, activePageIndex, activeLayerIndex, selectedStrokeIds } = get();
      if (selectedStrokeIds.length === 0 || targetLayerIndex === activeLayerIndex) return;

      const page = document.pages[activePageIndex];
      if (!page || targetLayerIndex < 0 || targetLayerIndex >= page.layers.length) return;

      const srcLayer = page.layers[activeLayerIndex];
      const targetLayer = page.layers[targetLayerIndex];
      if (!srcLayer || !targetLayer) return;

      const selectedSet = new Set(selectedStrokeIds);
      const movedStrokes = srcLayer.strokes.filter((s) => selectedSet.has(s.id));
      const remainingStrokes = srcLayer.strokes.filter((s) => !selectedSet.has(s.id));

      const newPages = document.pages.map((p, pIdx) => {
        if (pIdx !== activePageIndex) return p;
        const newLayers = p.layers.map((l, lIdx) => {
          if (lIdx === activeLayerIndex) {
            return { ...l, strokes: remainingStrokes };
          }
          if (lIdx === targetLayerIndex) {
            return { ...l, strokes: [...l.strokes, ...movedStrokes] };
          }
          return l;
        });
        return { ...p, layers: newLayers };
      });

      set({
        document: { ...document, pages: newPages },
        activeLayerIndex: targetLayerIndex,
      });
    },

    // Text actions
    addTextElement: (textItem) => {
      const { document, activePageIndex, activeLayerIndex } = get();
      const page = document.pages[activePageIndex];
      if (!page) return;
      const layer = page.layers[activeLayerIndex];
      if (!layer) return;

      if (!layer.texts) layer.texts = [];
      layer.texts.push(textItem);
      set({ document: { ...document } });
    },

    updateTextElement: (id, text) => {
      const { document, activePageIndex, activeLayerIndex } = get();
      const page = document.pages[activePageIndex];
      if (!page) return;
      const layer = page.layers[activeLayerIndex];
      if (!layer || !layer.texts) return;

      const item = layer.texts.find((t) => t.id === id);
      if (item) {
        item.text = text;
        set({ document: { ...document } });
      }
    },

    deleteTextElement: (id) => {
      const { document, activePageIndex, activeLayerIndex } = get();
      const page = document.pages[activePageIndex];
      if (!page) return;
      const layer = page.layers[activeLayerIndex];
      if (!layer || !layer.texts) return;

      layer.texts = layer.texts.filter((t) => t.id !== id);
      set({ document: { ...document } });
    },

    // Selection actions
    setSelectedStrokeIds: (ids) => set({ selectedStrokeIds: ids }),
    clearSelection: () => set({ selectedStrokeIds: [] }),

    moveSelectedStrokes: (dx, dy) => {
      const { document, activePageIndex, activeLayerIndex, selectedStrokeIds, history } = get();
      if (selectedStrokeIds.length === 0 || (dx === 0 && dy === 0)) return;

      const page = document.pages[activePageIndex];
      if (!page) return;
      const layer = page.layers[activeLayerIndex];
      if (!layer) return;

      const selectedSet = new Set(selectedStrokeIds);
      const beforeStrokes: Stroke[] = [];
      const afterStrokes: Stroke[] = [];

      for (const s of layer.strokes) {
        if (selectedSet.has(s.id)) {
          beforeStrokes.push(s);
          afterStrokes.push(translateStroke(s, dx, dy));
        }
      }

      const cmd = createUpdateStrokesCommand(layer.strokes, beforeStrokes, afterStrokes, () => {
        const updatedDoc = createUpdatedDocument(get().document, activePageIndex, activeLayerIndex, layer.strokes);
        set({ document: updatedDoc });
      });

      history.execute(cmd);
    },

    scaleSelectedStrokes: (scaleX, scaleY, originX, originY) => {
      const { document, activePageIndex, activeLayerIndex, selectedStrokeIds, history } = get();
      if (selectedStrokeIds.length === 0) return;

      const page = document.pages[activePageIndex];
      if (!page) return;
      const layer = page.layers[activeLayerIndex];
      if (!layer) return;

      const selectedSet = new Set(selectedStrokeIds);
      const beforeStrokes: Stroke[] = [];
      const afterStrokes: Stroke[] = [];

      for (const s of layer.strokes) {
        if (selectedSet.has(s.id)) {
          beforeStrokes.push(s);
          afterStrokes.push(scaleStroke(s, scaleX, scaleY, originX, originY));
        }
      }

      const cmd = createUpdateStrokesCommand(layer.strokes, beforeStrokes, afterStrokes, () => {
        const updatedDoc = createUpdatedDocument(get().document, activePageIndex, activeLayerIndex, layer.strokes);
        set({ document: updatedDoc });
      });

      history.execute(cmd);
    },

    rotateSelectedStrokes: (angleRad, originX, originY) => {
      const { document, activePageIndex, activeLayerIndex, selectedStrokeIds, history } = get();
      if (selectedStrokeIds.length === 0 || angleRad === 0) return;

      const page = document.pages[activePageIndex];
      if (!page) return;
      const layer = page.layers[activeLayerIndex];
      if (!layer) return;

      const selectedSet = new Set(selectedStrokeIds);
      const beforeStrokes: Stroke[] = [];
      const afterStrokes: Stroke[] = [];

      for (const s of layer.strokes) {
        if (selectedSet.has(s.id)) {
          beforeStrokes.push(s);
          afterStrokes.push(rotateStroke(s, angleRad, originX, originY));
        }
      }

      const cmd = createUpdateStrokesCommand(layer.strokes, beforeStrokes, afterStrokes, () => {
        const updatedDoc = createUpdatedDocument(get().document, activePageIndex, activeLayerIndex, layer.strokes);
        set({ document: updatedDoc });
      });

      history.execute(cmd);
    },

    deleteSelectedStrokes: () => {
      const { document, activePageIndex, activeLayerIndex, selectedStrokeIds, history } = get();
      if (selectedStrokeIds.length === 0) return;

      const page = document.pages[activePageIndex];
      if (!page) return;
      const layer = page.layers[activeLayerIndex];
      if (!layer) return;

      const selectedSet = new Set(selectedStrokeIds);
      const deleted: { stroke: Stroke; index: number }[] = [];

      layer.strokes.forEach((s, idx) => {
        if (selectedSet.has(s.id)) {
          deleted.push({ stroke: s, index: idx });
        }
      });

      const cmd = createDeleteStrokesCommand(layer.strokes, deleted, () => {
        const updatedDoc = createUpdatedDocument(get().document, activePageIndex, activeLayerIndex, layer.strokes);
        set({ document: updatedDoc, selectedStrokeIds: [] });
      });

      history.execute(cmd);
    },

    changeSelectedColor: (color) => {
      const { document, activePageIndex, activeLayerIndex, selectedStrokeIds, history } = get();
      if (selectedStrokeIds.length === 0) return;

      const page = document.pages[activePageIndex];
      if (!page) return;
      const layer = page.layers[activeLayerIndex];
      if (!layer) return;

      const selectedSet = new Set(selectedStrokeIds);
      const before: Stroke[] = [];
      const after: Stroke[] = [];

      for (const s of layer.strokes) {
        if (selectedSet.has(s.id)) {
          before.push(s);
          after.push({ ...s, color });
        }
      }

      const cmd = createUpdateStrokesCommand(layer.strokes, before, after, () => {
        const updatedDoc = createUpdatedDocument(get().document, activePageIndex, activeLayerIndex, layer.strokes);
        set({ document: updatedDoc });
      });

      history.execute(cmd);
    },

    changeSelectedWidth: (width) => {
      const { document, activePageIndex, activeLayerIndex, selectedStrokeIds, history } = get();
      if (selectedStrokeIds.length === 0) return;

      const page = document.pages[activePageIndex];
      if (!page) return;
      const layer = page.layers[activeLayerIndex];
      if (!layer) return;

      const selectedSet = new Set(selectedStrokeIds);
      const before: Stroke[] = [];
      const after: Stroke[] = [];

      for (const s of layer.strokes) {
        if (selectedSet.has(s.id)) {
          before.push(s);
          after.push({ ...s, width });
        }
      }

      const cmd = createUpdateStrokesCommand(layer.strokes, before, after, () => {
        const updatedDoc = createUpdatedDocument(get().document, activePageIndex, activeLayerIndex, layer.strokes);
        set({ document: updatedDoc });
      });

      history.execute(cmd);
    },

    changeSelectedLineStyle: (lineStyle) => {
      const { document, activePageIndex, activeLayerIndex, selectedStrokeIds, history } = get();
      if (selectedStrokeIds.length === 0) return;

      const page = document.pages[activePageIndex];
      if (!page) return;
      const layer = page.layers[activeLayerIndex];
      if (!layer) return;

      const selectedSet = new Set(selectedStrokeIds);
      const before: Stroke[] = [];
      const after: Stroke[] = [];

      for (const s of layer.strokes) {
        if (selectedSet.has(s.id)) {
          before.push(s);
          after.push({ ...s, lineStyle });
        }
      }

      const cmd = createUpdateStrokesCommand(layer.strokes, before, after, () => {
        const updatedDoc = createUpdatedDocument(get().document, activePageIndex, activeLayerIndex, layer.strokes);
        set({ document: updatedDoc });
      });

      history.execute(cmd);
    },

    bringSelectedToFront: () => {
      const { document, activePageIndex, activeLayerIndex, selectedStrokeIds } = get();
      if (selectedStrokeIds.length === 0) return;
      const page = document.pages[activePageIndex];
      if (!page) return;
      const layer = page.layers[activeLayerIndex];
      if (!layer) return;

      const selectedSet = new Set(selectedStrokeIds);
      const unselected = layer.strokes.filter((s) => !selectedSet.has(s.id));
      const selected = layer.strokes.filter((s) => selectedSet.has(s.id));

      const updatedDoc = createUpdatedDocument(document, activePageIndex, activeLayerIndex, [...unselected, ...selected]);
      set({ document: updatedDoc });
    },

    sendSelectedToBack: () => {
      const { document, activePageIndex, activeLayerIndex, selectedStrokeIds } = get();
      if (selectedStrokeIds.length === 0) return;
      const page = document.pages[activePageIndex];
      if (!page) return;
      const layer = page.layers[activeLayerIndex];
      if (!layer) return;

      const selectedSet = new Set(selectedStrokeIds);
      const unselected = layer.strokes.filter((s) => !selectedSet.has(s.id));
      const selected = layer.strokes.filter((s) => selectedSet.has(s.id));

      const updatedDoc = createUpdatedDocument(document, activePageIndex, activeLayerIndex, [...selected, ...unselected]);
      set({ document: updatedDoc });
    },

    selectAll: () => {
      const { document, activePageIndex, activeLayerIndex } = get();
      const page = document.pages[activePageIndex];
      if (!page) return;
      const layer = page.layers[activeLayerIndex];
      if (!layer || layer.strokes.length === 0) return;

      set({
        activeTool: 'selectRect',
        selectedStrokeIds: layer.strokes.map((s) => s.id),
      });
    },

    copySelection: () => {
      const { document, activePageIndex, activeLayerIndex, selectedStrokeIds } = get();
      if (selectedStrokeIds.length === 0) return;
      const page = document.pages[activePageIndex];
      if (!page) return;
      const layer = page.layers[activeLayerIndex];
      if (!layer) return;

      const selectedSet = new Set(selectedStrokeIds);
      const copied = layer.strokes
        .filter((s) => selectedSet.has(s.id))
        .map((s) => JSON.parse(JSON.stringify(s)));

      set({ clipboard: copied });
    },

    cutSelection: () => {
      get().copySelection();
      get().deleteSelectedStrokes();
    },

    pasteSelection: () => {
      const { clipboard, document, activePageIndex, activeLayerIndex, history } = get();
      if (clipboard.length === 0) return;

      const page = document.pages[activePageIndex];
      if (!page) return;
      const layer = page.layers[activeLayerIndex];
      if (!layer) return;

      const pastedIds: string[] = [];
      const offset = 20;

      for (const item of clipboard) {
        const newStroke: Stroke = {
          ...item,
          id: `stroke-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          points: item.points.map((p: any) => ({
            ...p,
            x: p.x + offset,
            y: p.y + offset,
          })),
        };

        pastedIds.push(newStroke.id);
        const cmd = createAddStrokeCommand(layer.strokes, newStroke, () => {
          set({ document: { ...document } });
        });
        history.execute(cmd);
      }

      set({
        activeTool: 'selectRect',
        selectedStrokeIds: pastedIds,
      });
    },

    addNewPage: (type = 'lined') => {
      const { document, activePageIndex } = get();
      const newPageNumber = document.pages.length + 1;
      const newPage = {
        id: `page-${Date.now()}`,
        pageNumber: newPageNumber,
        width: 794,
        height: 1123,
        background: {
          type: type,
          color: '#ffffff',
        },
        layers: [
          {
            id: `layer-${Date.now()}`,
            name: 'Capa 1',
            visible: true,
            strokes: [],
            texts: [],
          },
        ],
      };

      const updatedPages = [...document.pages];
      updatedPages.splice(activePageIndex + 1, 0, newPage);

      set({
        document: {
          ...document,
          pages: updatedPages,
        },
        activePageIndex: activePageIndex + 1,
        selectedStrokeIds: [],
      });
    },

    duplicateCurrentPage: () => {
      const { document, activePageIndex } = get();
      const page = document.pages[activePageIndex];
      if (!page) return;

      const clonedLayers = page.layers.map((l) => ({
        ...l,
        id: `layer-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        strokes: l.strokes.map((s) => ({
          ...s,
          id: `stroke-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          points: s.points.map((p) => ({ ...p })),
        })),
        texts: l.texts?.map((t) => ({
          ...t,
          id: `text-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        })),
        images: l.images?.map((img) => ({ ...img, id: `img-${Date.now()}` })),
      }));

      const newPage = {
        ...page,
        id: `page-${Date.now()}`,
        pageNumber: activePageIndex + 2,
        layers: clonedLayers,
      };

      const updatedPages = [...document.pages];
      updatedPages.splice(activePageIndex + 1, 0, newPage);
      // Re-index page numbers
      updatedPages.forEach((p, idx) => { p.pageNumber = idx + 1; });

      set({
        document: {
          ...document,
          pages: updatedPages,
        },
        activePageIndex: activePageIndex + 1,
        selectedStrokeIds: [],
      });
    },

    movePage: (fromIndex, toIndex) => {
      const { document } = get();
      if (fromIndex < 0 || fromIndex >= document.pages.length || toIndex < 0 || toIndex >= document.pages.length) {
        return;
      }

      const updatedPages = [...document.pages];
      const [movedPage] = updatedPages.splice(fromIndex, 1);
      updatedPages.splice(toIndex, 0, movedPage);
      updatedPages.forEach((p, idx) => { p.pageNumber = idx + 1; });

      set({
        document: {
          ...document,
          pages: updatedPages,
        },
        activePageIndex: toIndex,
        selectedStrokeIds: [],
      });
    },

    movePageToStart: () => {
      const { activePageIndex } = get();
      if (activePageIndex > 0) {
        get().movePage(activePageIndex, 0);
      }
    },

    movePageToEnd: () => {
      const { document, activePageIndex } = get();
      if (activePageIndex < document.pages.length - 1) {
        get().movePage(activePageIndex, document.pages.length - 1);
      }
    },

    setPageDimensions: (pageIndex, width, height) => {
      const { document } = get();
      if (pageIndex < 0 || pageIndex >= document.pages.length) return;

      const updatedPages = document.pages.map((p, idx) => {
        if (idx !== pageIndex) return p;
        return {
          ...p,
          width: Math.max(200, width),
          height: Math.max(200, height),
        };
      });

      set({ document: { ...document, pages: updatedPages } });
    },

    deleteCurrentPage: () => {
      const { document, activePageIndex } = get();
      if (document.pages.length <= 1) return;

      const updatedPages = document.pages.filter((_, idx) => idx !== activePageIndex);
      updatedPages.forEach((p, idx) => { p.pageNumber = idx + 1; });
      const nextIndex = Math.min(activePageIndex, updatedPages.length - 1);

      set({
        document: {
          ...document,
          pages: updatedPages,
        },
        activePageIndex: nextIndex,
        selectedStrokeIds: [],
      });
    },

    insertVerticalSpace: (pageIndex, startY, dy) => {
      const { document } = get();
      const page = document.pages[pageIndex];
      if (!page || dy === 0) return;

      const updatedPages = document.pages.map((p, idx) => {
        if (idx !== pageIndex) return p;

        const newLayers = p.layers.map((layer) => {
          const newStrokes = layer.strokes.map((stroke) => {
            const bbox = getStrokeBoundingBox(stroke);
            if (bbox.minY >= startY) {
              return translateStroke(stroke, 0, dy);
            } else if (bbox.maxY > startY) {
              const newPoints = stroke.points.map((pt) => {
                if (pt.y >= startY) {
                  return { ...pt, y: pt.y + dy };
                }
                return pt;
              });
              return {
                ...stroke,
                points: newPoints,
              };
            }
            return stroke;
          });

          const newTexts = layer.texts?.map((t) => {
            if (t.y >= startY) {
              return { ...t, y: t.y + dy };
            }
            return t;
          });

          return { ...layer, strokes: newStrokes, texts: newTexts };
        });

        return {
          ...p,
          height: Math.max(p.height, p.height + dy),
          layers: newLayers,
        };
      });

      set({ document: { ...document, pages: updatedPages } });
    },

    setPageBackground: (pageIndex, type, color) => {
      const { document } = get();
      if (pageIndex < 0 || pageIndex >= document.pages.length) return;

      const updatedPages = document.pages.map((p, idx) => {
        if (idx !== pageIndex) return p;
        return {
          ...p,
          background: {
            ...p.background,
            type,
            color: color || p.background.color || '#ffffff',
          },
        };
      });

      set({ document: { ...document, pages: updatedPages } });
    },

    loadDocument: (doc) => {
      clearPdfCache();
      get().history.clear();
      set({
        document: doc,
        activePageIndex: 0,
        activeLayerIndex: 0,
        selectedStrokeIds: [],
        canUndo: false,
        canRedo: false,
      });
    },

    setDocumentTitle: (title) => {
      const { document } = get();
      set({ document: { ...document, title } });
    },

    undo: () => {
      get().history.undo();
      set({ selectedStrokeIds: [] });
    },

    redo: () => {
      get().history.redo();
      set({ selectedStrokeIds: [] });
    },

    updateHistoryState: () => {
      set({
        canUndo: get().history.canUndo(),
        canRedo: get().history.canRedo(),
      });
    },
  };
});
