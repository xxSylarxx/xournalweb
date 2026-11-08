import React, { useRef, useState } from 'react';
import {
  Pen,
  Highlighter,
  Eraser,
  Hand,
  MousePointer,
  LassoSelect,
  Type,
  Bold,
  Italic,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Minus,
  ArrowRight,
  Square,
  Circle,
  PaintBucket,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Trash2,
  FilePlus,
  Grid,
  FolderOpen,
  Download,
  FileText,
  Copy,
  Scissors,
  ArrowUp,
  ArrowDown,
  Shapes,
  Layers,
  Sigma,
  FileDown,
  MoveVertical,
  ChevronsLeftRight,
  Sparkles,
  Triangle,
  Compass,
  Search,
  Sliders,
  Presentation,
  Columns2,
  Mic,
  Puzzle,
  Settings,
  SkipBack,
  SkipForward,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { ColorPalette } from './ColorPalette';
import { StrokeWidthPicker } from './StrokeWidthPicker';
import { ToolType, PageBackgroundType, LineStyle, LineCap } from '../types/document';
import { parseXopp, exportXopp } from '../engine/xoppCodec';
import { importPdfAsDocument } from '../engine/pdfRenderer';
import { downloadBlob } from '../engine/exporter';

export const Toolbar: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const pdfInputRef = useRef<HTMLInputElement | null>(null);
  const fileHandleRef = useRef<any>(null);
  const [isShapesMenuOpen, setIsShapesMenuOpen] = useState(false);
  const [isLineStyleMenuOpen, setIsLineStyleMenuOpen] = useState(false);
  const [isCapStyleMenuOpen, setIsCapStyleMenuOpen] = useState(false);
  const [isBackgroundMenuOpen, setIsBackgroundMenuOpen] = useState(false);

  const activeTool = useAppStore((state) => state.activeTool);
  const setActiveTool = useAppStore((state) => state.setActiveTool);
  const eraserType = useAppStore((state) => state.eraserType);
  const setEraserType = useAppStore((state) => state.setEraserType);

  const lineStyle = useAppStore((state) => state.lineStyle);
  const setLineStyle = useAppStore((state) => state.setLineStyle);
  const capStyle = useAppStore((state) => state.capStyle);
  const setCapStyle = useAppStore((state) => state.setCapStyle);
  const shapeRecognizerEnabled = useAppStore((state) => state.shapeRecognizerEnabled);
  const toggleShapeRecognizer = useAppStore((state) => state.toggleShapeRecognizer);
  const fillEnabled = useAppStore((state) => state.fillEnabled);
  const setFillEnabled = useAppStore((state) => state.setFillEnabled);

  // Text tool controls
  const fontFamily = useAppStore((state) => state.fontFamily);
  const setFontFamily = useAppStore((state) => state.setFontFamily);
  const fontSize = useAppStore((state) => state.fontSize);
  const setFontSize = useAppStore((state) => state.setFontSize);
  const isBold = useAppStore((state) => state.isBold);
  const toggleBold = useAppStore((state) => state.toggleBold);
  const isItalic = useAppStore((state) => state.isItalic);
  const toggleItalic = useAppStore((state) => state.toggleItalic);
  const textAlign = useAppStore((state) => state.textAlign);
  const setTextAlign = useAppStore((state) => state.setTextAlign);

  // Panels & Modals
  const isLayersPanelOpen = useAppStore((state) => state.isLayersPanelOpen);
  const toggleLayersPanel = useAppStore((state) => state.toggleLayersPanel);
  const toggleLatexModal = useAppStore((state) => state.toggleLatexModal);
  const toggleSearch = useAppStore((state) => state.toggleSearch);
  const toggleExportModal = useAppStore((state) => state.toggleExportModal);
  const togglePageSettingsModal = useAppStore((state) => state.togglePageSettingsModal);
  const togglePreferences = useAppStore((state) => state.togglePreferences);
  const togglePluginsModal = useAppStore((state) => state.togglePluginsModal);
  const toggleAudioRecorder = useAppStore((state) => state.toggleAudioRecorder);
  const isAudioRecorderOpen = useAppStore((state) => state.isAudioRecorderOpen);

  // View modes & history
  const viewMode = useAppStore((state) => state.viewMode);
  const toggleViewMode = useAppStore((state) => state.toggleViewMode);
  const isPresentationMode = useAppStore((state) => state.isPresentationMode);
  const togglePresentationMode = useAppStore((state) => state.togglePresentationMode);
  const jumpBack = useAppStore((state) => state.jumpBack);
  const jumpForward = useAppStore((state) => state.jumpForward);
  const jumpToPrevAnnotatedPage = useAppStore((state) => state.jumpToPrevAnnotatedPage);
  const jumpToNextAnnotatedPage = useAppStore((state) => state.jumpToNextAnnotatedPage);

  // Geometry tools
  const geometryTool = useAppStore((state) => state.geometryTool);
  const setGeometryTool = useAppStore((state) => state.setGeometryTool);

  const selectedStrokeIds = useAppStore((state) => state.selectedStrokeIds);
  const deleteSelectedStrokes = useAppStore((state) => state.deleteSelectedStrokes);
  const copySelection = useAppStore((state) => state.copySelection);
  const cutSelection = useAppStore((state) => state.cutSelection);
  const bringSelectedToFront = useAppStore((state) => state.bringSelectedToFront);
  const sendSelectedToBack = useAppStore((state) => state.sendSelectedToBack);

  const canUndo = useAppStore((state) => state.canUndo);
  const canRedo = useAppStore((state) => state.canRedo);
  const undo = useAppStore((state) => state.undo);
  const redo = useAppStore((state) => state.redo);
  const clearActivePage = useAppStore((state) => state.clearActivePage);

  const zoom = useAppStore((state) => state.zoom);
  const setZoom = useAppStore((state) => state.setZoom);

  const document = useAppStore((state) => state.document);
  const activePageIndex = useAppStore((state) => state.activePageIndex);
  const addNewPage = useAppStore((state) => state.addNewPage);
  const setPageBackground = useAppStore((state) => state.setPageBackground);
  const loadDocument = useAppStore((state) => state.loadDocument);
  const setDocumentTitle = useAppStore((state) => state.setDocumentTitle);

  const currentPage = document.pages[activePageIndex];

  const mainTools: { id: ToolType; label: string; icon: React.ReactNode }[] = [
    { id: 'hand', label: 'Mano / Paneo (H)', icon: <Hand className="w-4 h-4" /> },
    { id: 'verticalSpace', label: 'Espacio Vertical (V)', icon: <MoveVertical className="w-4 h-4" /> },
    { id: 'selectRect', label: 'Seleccionar Rectángulo (S)', icon: <MousePointer className="w-4 h-4" /> },
    { id: 'selectRegion', label: 'Seleccionar Lazo Libre', icon: <LassoSelect className="w-4 h-4" /> },
    { id: 'pen', label: 'Pluma (P)', icon: <Pen className="w-4 h-4" /> },
    { id: 'highlighter', label: 'Resaltador', icon: <Highlighter className="w-4 h-4" /> },
    { id: 'eraser', label: 'Borrador (E)', icon: <Eraser className="w-4 h-4" /> },
    { id: 'text', label: 'Texto (T)', icon: <Type className="w-4 h-4" /> },
  ];

  const shapeTools: { id: ToolType; label: string; icon: React.ReactNode }[] = [
    { id: 'line', label: 'Línea (L)', icon: <Minus className="w-4 h-4" /> },
    { id: 'arrow', label: 'Flecha simple', icon: <ArrowRight className="w-4 h-4" /> },
    { id: 'doubleArrow', label: 'Flecha doble', icon: <ChevronsLeftRight className="w-4 h-4" /> },
    { id: 'rect', label: 'Rectángulo (R)', icon: <Square className="w-4 h-4" /> },
    { id: 'ellipse', label: 'Elipse (C)', icon: <Circle className="w-4 h-4" /> },
  ];

  const isShapeActive =
    activeTool === 'line' ||
    activeTool === 'arrow' ||
    activeTool === 'doubleArrow' ||
    activeTool === 'rect' ||
    activeTool === 'ellipse';

  const handleOpenXoppPicker = async () => {
    if ('showOpenFilePicker' in window) {
      try {
        const [handle] = await (window as any).showOpenFilePicker({
          types: [
            {
              description: 'Documentos Xournal++ (*.xopp, *.xoj)',
              accept: { 'application/x-xopp': ['.xopp', '.xoj'] },
            },
          ],
          multiple: false,
        });
        const file = await handle.getFile();
        const buffer = new Uint8Array(await file.arrayBuffer());
        const parsedDoc = parseXopp(buffer);
        parsedDoc.title = file.name.replace(/\.(xopp|xoj)$/i, '');
        fileHandleRef.current = handle;
        loadDocument(parsedDoc);
        return;
      } catch (err: any) {
        if (err.name === 'AbortError') return;
      }
    }
    fileInputRef.current?.click();
  };

  const handleOpenFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const buffer = new Uint8Array(await file.arrayBuffer());
      const parsedDoc = parseXopp(buffer);
      if (!parsedDoc.title || parsedDoc.title === 'Documento sin título') {
        parsedDoc.title = file.name.replace(/\.(xopp|xoj)$/i, '');
      }
      fileHandleRef.current = null;
      loadDocument(parsedDoc);
    } catch (err: any) {
      alert(`Error al abrir archivo .xopp: ${err.message}`);
    } finally {
      if (e.target) e.target.value = '';
    }
  };

  const handleOpenPdf = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const pdfDoc = await importPdfAsDocument(file);
      fileHandleRef.current = null;
      loadDocument(pdfDoc);
    } catch (err: any) {
      alert(`Error al abrir PDF: ${err.message}`);
    } finally {
      if (e.target) e.target.value = '';
    }
  };

  const handleSaveFile = async () => {
    try {
      const xoppBytes = exportXopp(document);

      // 1. Direct overwrite if opened via File System Access API
      if (fileHandleRef.current && 'createWritable' in fileHandleRef.current) {
        try {
          const writable = await fileHandleRef.current.createWritable();
          await writable.write(xoppBytes);
          await writable.close();
          return;
        } catch {
          // Fall through to save picker or download
        }
      }

      // 2. File System Access API Save Picker
      if ('showSaveFilePicker' in window) {
        try {
          const handle = await (window as any).showSaveFilePicker({
            suggestedName: `${document.title || 'notas'}.xopp`,
            types: [
              {
                description: 'Documento Xournal++ (*.xopp)',
                accept: { 'application/x-xopp': ['.xopp'] },
              },
            ],
          });
          const writable = await handle.createWritable();
          await writable.write(xoppBytes);
          await writable.close();
          fileHandleRef.current = handle;
          return;
        } catch (err: any) {
          if (err.name === 'AbortError') return;
        }
      }

      // 3. Fallback standard browser download
      const blob = new Blob([xoppBytes.buffer as ArrayBuffer], { type: 'application/x-xopp' });
      downloadBlob(blob, `${document.title || 'notas'}.xopp`);
    } catch (err: any) {
      alert(`Error al guardar archivo .xopp: ${err.message}`);
    }
  };

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-slate-100 flex flex-col shrink-0 shadow-md select-none z-30">
      {/* ── FILA 1: Archivo, Navegación de Páginas, Zoom, Vistas y Configuración ── */}
      <div className="h-10 px-3 flex items-center justify-between border-b border-slate-800/80 text-xs relative z-20">
        {/* Izquierda: Logo + Título + Archivo + Deshacer/Rehacer */}
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="flex items-center gap-1.5 pr-2 border-r border-slate-800">
            <img src="/xournalpp.svg" alt="Xournal++ Logo" className="w-5 h-5 drop-shadow" />
            <span className="font-bold tracking-wide text-xs hidden sm:inline text-slate-200">
              Xournal<span className="text-blue-400">++</span>
            </span>
            <input
              type="text"
              value={document.title}
              onChange={(e) => setDocumentTitle(e.target.value)}
              className="bg-transparent text-[11px] text-slate-400 hover:text-slate-200 focus:text-white border-none focus:outline-none focus:ring-0 p-0 max-w-[120px] truncate ml-1"
              title="Editar nombre del documento"
            />
          </div>

          {/* Archivo: Abrir, PDF, Guardar, Exportar */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".xopp,.xoj"
            className="hidden"
            onChange={handleOpenFile}
          />
          <input
            ref={pdfInputRef}
            type="file"
            accept=".pdf"
            className="hidden"
            onChange={handleOpenPdf}
          />

          <button
            onClick={handleOpenXoppPicker}
            title="Abrir archivo .xopp"
            className="flex items-center gap-1 px-2 py-1 rounded text-slate-300 hover:bg-slate-800 hover:text-white transition-all"
          >
            <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
            <span>Abrir</span>
          </button>

          <button
            onClick={() => pdfInputRef.current?.click()}
            title="Anotar archivo PDF"
            className="flex items-center gap-1 px-2 py-1 rounded text-slate-300 hover:bg-slate-800 hover:text-white transition-all"
          >
            <FileText className="w-3.5 h-3.5 text-red-400" />
            <span>PDF</span>
          </button>

          <button
            onClick={handleSaveFile}
            title="Guardar archivo .xopp"
            className="flex items-center gap-1 px-2 py-1 rounded text-slate-300 hover:bg-slate-800 hover:text-white transition-all"
          >
            <Download className="w-3.5 h-3.5 text-green-400" />
            <span>Guardar</span>
          </button>

          <button
            onClick={toggleExportModal}
            title="Exportación avanzada (PDF, PNG, SVG con opciones de rango y DPI)"
            className="flex items-center gap-1 px-2 py-1 rounded text-slate-300 hover:bg-slate-800 hover:text-white transition-all"
          >
            <FileDown className="w-3.5 h-3.5 text-blue-400" />
            <span>Exportar</span>
          </button>

          <div className="h-4 w-[1px] bg-slate-800 mx-1" />

          {/* Deshacer / Rehacer */}
          <button
            onClick={undo}
            disabled={!canUndo}
            title="Deshacer (Ctrl+Z)"
            className="p-1 rounded text-slate-300 hover:bg-slate-800 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-all"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={redo}
            disabled={!canRedo}
            title="Rehacer (Ctrl+Y)"
            className="p-1 rounded text-slate-300 hover:bg-slate-800 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-all"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Derecha: Fondo, Páginas, Zoom, Historial, Vistas, Preferencias */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Fondo de página */}
          {currentPage && (
            <div className="relative">
              <button
                onClick={() => setIsBackgroundMenuOpen(!isBackgroundMenuOpen)}
                title="Cambiar fondo de página"
                className={`flex items-center gap-1 p-1 rounded transition-all ${
                  isBackgroundMenuOpen ? 'bg-slate-800 text-blue-400' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Grid className="w-3.5 h-3.5" />
              </button>
              {isBackgroundMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsBackgroundMenuOpen(false)}
                  />
                  <div className="absolute right-0 top-full mt-1.5 flex flex-col bg-slate-800 border border-slate-700 shadow-2xl rounded-md p-1 min-w-[160px] z-50 animate-fadeIn">
                    <span className="text-[10px] uppercase text-slate-400 px-2 py-1 font-bold">Fondo de página</span>
                    {[
                      { id: 'lined', label: 'Rayado' },
                      { id: 'graph', label: 'Cuadriculado' },
                      { id: 'dotted', label: 'Puntos' },
                      { id: 'plain', label: 'En blanco' },
                      { id: 'isodotted', label: 'Isométrico (Puntos)' },
                      { id: 'isograph', label: 'Isométrico (Líneas)' },
                      { id: 'staves', label: 'Pentagrama Musical' },
                    ].map((bg) => (
                      <button
                        key={bg.id}
                        onClick={() => {
                          setPageBackground(activePageIndex, bg.id as PageBackgroundType);
                          setIsBackgroundMenuOpen(false);
                        }}
                        className={`text-left text-xs px-2 py-1.5 rounded hover:bg-slate-700 ${
                          currentPage.background.type === bg.id ? 'text-blue-400 font-semibold bg-slate-700/60' : 'text-slate-200'
                        }`}
                      >
                        {bg.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Configuración de plantilla */}
          <button
            onClick={togglePageSettingsModal}
            title="Configuración de tamaño de papel y plantilla"
            className="p-1 rounded text-slate-300 hover:bg-slate-800 hover:text-blue-400 transition-all"
          >
            <Sliders className="w-3.5 h-3.5" />
          </button>

          {/* Limpiar Página */}
          <button
            onClick={clearActivePage}
            title="Limpiar página actual"
            className="p-1 rounded text-slate-400 hover:bg-red-500/20 hover:text-red-400 transition-all"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>

          {/* + Página */}
          <button
            onClick={() => addNewPage(currentPage?.background.type || 'lined')}
            title="Añadir nueva página"
            className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 transition-all border border-slate-700"
          >
            <FilePlus className="w-3 h-3 text-blue-400" />
            <span>+ Pág</span>
          </button>

          <div className="h-4 w-[1px] bg-slate-800 mx-1" />

          {/* Zoom */}
          <div className="flex items-center gap-0.5 bg-slate-800/80 rounded border border-slate-700 px-1 py-0.5">
            <button
              onClick={() => setZoom(zoom - 0.1)}
              title="Reducir zoom"
              className="p-0.5 hover:text-white text-slate-400 rounded"
            >
              <ZoomOut className="w-3 h-3" />
            </button>
            <button
              onClick={() => setZoom(1.0)}
              title="Restablecer zoom a 100%"
              className="text-[11px] px-1 text-slate-300 font-mono hover:text-white"
            >
              {Math.round(zoom * 100)}%
            </button>
            <button
              onClick={() => setZoom(zoom + 0.1)}
              title="Aumentar zoom"
              className="p-0.5 hover:text-white text-slate-400 rounded"
            >
              <ZoomIn className="w-3 h-3" />
            </button>
            <button
              onClick={() => setZoom(1.0)}
              title="Restablecer vista"
              className="p-0.5 hover:text-white text-slate-400 rounded ml-0.5"
            >
              <RotateCcw className="w-2.5 h-2.5" />
            </button>
          </div>

          <div className="h-4 w-[1px] bg-slate-800 mx-1" />

          {/* Historial de navegación */}
          <div className="flex items-center bg-slate-800/60 rounded border border-slate-700 p-0.5 gap-0.5">
            <button
              onClick={jumpBack}
              title="Historial: Página anterior visitada (Alt+←)"
              className="p-0.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-all"
            >
              <ChevronLeft className="w-3 h-3" />
            </button>
            <button
              onClick={jumpForward}
              title="Historial: Página siguiente visitada (Alt+→)"
              className="p-0.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-all"
            >
              <ChevronRight className="w-3 h-3" />
            </button>
            <button
              onClick={jumpToPrevAnnotatedPage}
              title="Saltar a página anterior con notas"
              className="p-0.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-all"
            >
              <SkipBack className="w-3 h-3" />
            </button>
            <button
              onClick={jumpToNextAnnotatedPage}
              title="Saltar a siguiente página con notas"
              className="p-0.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-all"
            >
              <SkipForward className="w-3 h-3" />
            </button>
          </div>

          <div className="h-4 w-[1px] bg-slate-800 mx-1" />

          {/* Vistas: Paired Pages & Modo Presentación */}
          <button
            onClick={toggleViewMode}
            title={viewMode === 'paired' ? 'Vista: 2 páginas emparejadas (Libro)' : 'Vista: 1 sola página vertical'}
            className={`p-1 rounded text-xs transition-all ${
              viewMode === 'paired'
                ? 'bg-blue-600/30 text-blue-400 ring-1 ring-blue-500'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <Columns2 className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={togglePresentationMode}
            title="Modo Presentación (F5)"
            className={`p-1 rounded text-xs transition-all ${
              isPresentationMode
                ? 'bg-amber-600/30 text-amber-300 ring-1 ring-amber-500'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <Presentation className="w-3.5 h-3.5" />
          </button>

          {/* Grabador de Audio */}
          <button
            onClick={toggleAudioRecorder}
            title="Nota de voz para esta página"
            className={`p-1 rounded text-xs transition-all ${
              isAudioRecorderOpen
                ? 'bg-red-600/30 text-red-400 ring-1 ring-red-500'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <Mic className="w-3.5 h-3.5" />
          </button>

          {/* Plugins */}
          <button
            onClick={togglePluginsModal}
            title="Plugins y Complementos JavaScript"
            className="p-1 rounded text-slate-400 hover:bg-slate-800 hover:text-purple-400 transition-all"
          >
            <Puzzle className="w-3.5 h-3.5" />
          </button>

          {/* Preferencias */}
          <button
            onClick={togglePreferences}
            title="Preferencias de Xournal++"
            className="p-1 rounded text-slate-400 hover:bg-slate-800 hover:text-white transition-all"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── FILA 2: Herramientas de Dibujo, Formas, Estilos, Colores y Capas ── */}
      <div className="h-11 px-3 flex items-center justify-between text-xs gap-2 relative z-10">
        {/* Izquierda: Herramientas de Dibujo + Formas + LaTeX + Geometría + Estilos */}
        <div className="flex items-center gap-1 shrink-0">
          {mainTools.map((t) => {
            const isActive = activeTool === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTool(t.id)}
                title={t.label}
                className={`p-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1 ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm ring-1 ring-blue-400'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                {t.icon}
              </button>
            );
          })}

          {/* Formas Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsShapesMenuOpen(!isShapesMenuOpen)}
              title="Herramientas de formas (Línea, Flecha, Rectángulo, Elipse)"
              className={`p-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1 ${
                isShapeActive
                  ? 'bg-blue-600 text-white shadow-sm ring-1 ring-blue-400'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Shapes className="w-4 h-4" />
            </button>

            {isShapesMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsShapesMenuOpen(false)}
                />
                <div className="absolute left-0 top-full mt-1.5 flex flex-col bg-slate-800 border border-slate-700 shadow-2xl rounded-md p-1 min-w-[140px] z-50 animate-fadeIn">
                  <span className="text-[10px] uppercase text-slate-400 px-2 py-1 font-bold">Formas</span>
                  {shapeTools.map((st) => (
                    <button
                      key={st.id}
                      onClick={() => {
                        setActiveTool(st.id);
                        setIsShapesMenuOpen(false);
                      }}
                      className={`flex items-center gap-2 px-2 py-1.5 rounded text-xs text-left hover:bg-slate-700 ${
                        activeTool === st.id ? 'text-blue-400 font-semibold bg-slate-700/50' : 'text-slate-200'
                      }`}
                    >
                      {st.icon}
                      <span>{st.label}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Reconocedor automático de formas */}
          <button
            onClick={toggleShapeRecognizer}
            title={
              shapeRecognizerEnabled
                ? 'Reconocedor de Formas: ACTIVADO'
                : 'Reconocedor de Formas: DESACTIVADO'
            }
            className={`p-1.5 rounded-md text-xs font-medium transition-all ${
              shapeRecognizerEnabled
                ? 'bg-amber-500/30 text-amber-300 ring-1 ring-amber-400'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-4 h-4" />
          </button>

          {/* Selector de modo borrador: Trazo vs Estándar */}
          {activeTool === 'eraser' && (
            <div className="flex items-center bg-slate-800/90 rounded border border-slate-700 p-0.5 text-[10px] gap-0.5">
              <button
                onClick={() => setEraserType('stroke')}
                title="Borrador de Trazo (Elimina el trazo completo al tocarlo)"
                className={`px-1.5 py-0.5 rounded transition-all ${
                  eraserType === 'stroke'
                    ? 'bg-blue-600 text-white font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Trazo
              </button>
              <button
                onClick={() => setEraserType('standard')}
                title="Borrador Estándar (Borra con precisión sin pintar blanco sobre el fondo)"
                className={`px-1.5 py-0.5 rounded transition-all ${
                  eraserType === 'standard' || eraserType === 'whiteout'
                    ? 'bg-blue-600 text-white font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Estándar
              </button>
            </div>
          )}

          <div className="h-4 w-[1px] bg-slate-800 mx-1" />

          {/* LaTeX */}
          <button
            onClick={toggleLatexModal}
            title="Insertar fórmula LaTeX (KaTeX)"
            className="p-1.5 rounded-md text-xs font-medium text-purple-400 hover:bg-slate-800 transition-all"
          >
            <Sigma className="w-4 h-4" />
          </button>

          {/* Escuadra */}
          <button
            onClick={() => setGeometryTool(geometryTool === 'setsquare' ? 'none' : 'setsquare')}
            title="Escuadra interactiva graduada"
            className={`p-1.5 rounded-md text-xs font-medium transition-all ${
              geometryTool === 'setsquare'
                ? 'bg-blue-600/30 text-blue-300 ring-1 ring-blue-400'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <Triangle className="w-4 h-4" />
          </button>

          {/* Compás */}
          <button
            onClick={() => setGeometryTool(geometryTool === 'compass' ? 'none' : 'compass')}
            title="Compás interactivo de dibujo"
            className={`p-1.5 rounded-md text-xs font-medium transition-all ${
              geometryTool === 'compass'
                ? 'bg-blue-600/30 text-blue-300 ring-1 ring-blue-400'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <Compass className="w-4 h-4" />
          </button>

          {/* Buscar Ctrl+F */}
          <button
            onClick={() => toggleSearch()}
            title="Buscar texto en notas (Ctrl+F)"
            className="p-1.5 rounded-md text-xs font-medium text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-all"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Controles de Formato de Texto o Estilos de Trazo */}
          {activeTool === 'text' ? (
            <div className="flex items-center gap-1 border-l border-slate-800 pl-1.5">
              <select
                value={fontFamily}
                onChange={(e) => setFontFamily(e.target.value)}
                className="bg-slate-800 text-slate-200 text-xs rounded border border-slate-700 px-1 py-0.5 focus:outline-none"
              >
                <option value="sans-serif">Sans-Serif</option>
                <option value="serif">Serif</option>
                <option value="monospace">Monospace</option>
                <option value="cursive">Cursive</option>
              </select>

              <select
                value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
                className="bg-slate-800 text-slate-200 text-xs rounded border border-slate-700 px-1 py-0.5 focus:outline-none"
              >
                {[12, 14, 16, 18, 24, 32, 40, 48].map((s) => (
                  <option key={s} value={s}>{s} pt</option>
                ))}
              </select>

              <button
                onClick={toggleBold}
                title="Negrita"
                className={`p-1 rounded text-xs ${isBold ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}
              >
                <Bold className="w-3 h-3" />
              </button>

              <button
                onClick={toggleItalic}
                title="Cursiva"
                className={`p-1 rounded text-xs ${isItalic ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}
              >
                <Italic className="w-3 h-3" />
              </button>

              <button
                onClick={() => setTextAlign('left')}
                title="Alinear a la izquierda"
                className={`p-1 rounded text-xs ${textAlign === 'left' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}
              >
                <AlignLeft className="w-3 h-3" />
              </button>

              <button
                onClick={() => setTextAlign('center')}
                title="Centrar texto"
                className={`p-1 rounded text-xs ${textAlign === 'center' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}
              >
                <AlignCenter className="w-3 h-3" />
              </button>

              <button
                onClick={() => setTextAlign('right')}
                title="Alinear a la derecha"
                className={`p-1 rounded text-xs ${textAlign === 'right' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}
              >
                <AlignRight className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1 border-l border-slate-800 pl-1.5">
              <div className="relative">
                <button
                  onClick={() => setIsLineStyleMenuOpen(!isLineStyleMenuOpen)}
                  title={`Estilo de trazo: ${lineStyle}`}
                  className="px-1.5 py-1 rounded text-xs text-slate-300 hover:bg-slate-800 flex items-center gap-1 font-mono border border-slate-700/60"
                >
                  {lineStyle === 'plain' && '──'}
                  {lineStyle === 'dash' && '- -'}
                  {lineStyle === 'dot' && '···'}
                  {lineStyle === 'dashdot' && '-·-'}
                </button>

                {isLineStyleMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setIsLineStyleMenuOpen(false)}
                    />
                    <div className="absolute left-0 top-full mt-1.5 flex flex-col bg-slate-800 border border-slate-700 shadow-2xl rounded-md p-1 min-w-[120px] z-50 animate-fadeIn">
                      {[
                        { id: 'plain', label: 'Sólido ──' },
                        { id: 'dash', label: 'Discontinuo - -' },
                        { id: 'dot', label: 'Puntos ···' },
                        { id: 'dashdot', label: 'Punto y raya -·-' },
                      ].map((ls) => (
                        <button
                          key={ls.id}
                          onClick={() => {
                            setLineStyle(ls.id as LineStyle);
                            setIsLineStyleMenuOpen(false);
                          }}
                          className={`text-left text-xs px-2 py-1.5 rounded hover:bg-slate-700 ${
                            lineStyle === ls.id ? 'text-blue-400 font-semibold' : 'text-slate-200'
                          }`}
                        >
                          {ls.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Cap Style Selector */}
              <div className="relative">
                <button
                  onClick={() => setIsCapStyleMenuOpen(!isCapStyleMenuOpen)}
                  title={`Extremo de trazo (Cap Style): ${capStyle}`}
                  className="px-1.5 py-1 text-[11px] font-mono rounded text-slate-300 hover:bg-slate-800 border border-slate-700/60 flex items-center gap-1"
                >
                  {capStyle === 'round' ? '● Round' : capStyle === 'square' ? '■ Square' : '▌ Butt'}
                </button>

                {isCapStyleMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setIsCapStyleMenuOpen(false)}
                    />
                    <div className="absolute left-0 top-full mt-1.5 flex flex-col bg-slate-800 border border-slate-700 shadow-2xl rounded-md p-1 min-w-[105px] z-50 animate-fadeIn">
                      <span className="text-[9px] uppercase text-slate-400 px-2 py-0.5 font-bold">Cap Style</span>
                      {(['round', 'butt', 'square'] as LineCap[]).map((cap) => (
                        <button
                          key={cap}
                          onClick={() => {
                            setCapStyle(cap);
                            setIsCapStyleMenuOpen(false);
                          }}
                          className={`text-left text-xs px-2 py-1.5 rounded hover:bg-slate-700 capitalize ${
                            capStyle === cap ? 'text-blue-400 font-semibold' : 'text-slate-200'
                          }`}
                        >
                          {cap === 'round' ? '● Redondo' : cap === 'butt' ? '▌ Plano (Butt)' : '■ Cuadrado'}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Relleno */}
              <button
                onClick={() => setFillEnabled(!fillEnabled)}
                title={fillEnabled ? 'Relleno: Activado' : 'Relleno: Desactivado'}
                className={`p-1.5 rounded text-xs transition-all ${
                  fillEnabled
                    ? 'bg-blue-600/30 text-blue-400 border border-blue-500/50'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                <PaintBucket className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Derecha: Selección + Grosor + Paleta de Colores + Capas */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Barra de Selección activa */}
          {selectedStrokeIds.length > 0 && (
            <div className="flex items-center gap-1 bg-blue-950/60 border border-blue-500/40 rounded px-1.5 py-0.5 animate-fadeIn">
              <span className="text-[10px] text-blue-300 font-mono mr-1">{selectedStrokeIds.length} sel.</span>
              <button
                onClick={bringSelectedToFront}
                title="Traer al frente"
                className="p-1 hover:bg-blue-800/50 text-blue-300 rounded"
              >
                <ArrowUp className="w-3 h-3" />
              </button>
              <button
                onClick={sendSelectedToBack}
                title="Enviar al fondo"
                className="p-1 hover:bg-blue-800/50 text-blue-300 rounded"
              >
                <ArrowDown className="w-3 h-3" />
              </button>
              <button
                onClick={copySelection}
                title="Copiar (Ctrl+C)"
                className="p-1 hover:bg-blue-800/50 text-blue-300 rounded"
              >
                <Copy className="w-3 h-3" />
              </button>
              <button
                onClick={cutSelection}
                title="Cortar (Ctrl+X)"
                className="p-1 hover:bg-blue-800/50 text-blue-300 rounded"
              >
                <Scissors className="w-3 h-3" />
              </button>
              <button
                onClick={deleteSelectedStrokes}
                title="Eliminar seleccionados (Supr)"
                className="p-1 hover:bg-red-500/20 text-red-400 rounded"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Grosor de trazo */}
          <StrokeWidthPicker />

          {/* Paleta de Colores */}
          <ColorPalette />

          <div className="h-4 w-[1px] bg-slate-800 mx-0.5" />

          {/* Panel de Capas */}
          <button
            onClick={toggleLayersPanel}
            title="Panel de capas"
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium border transition-all ${
              isLayersPanelOpen
                ? 'bg-blue-600/30 text-blue-400 border-blue-500/50'
                : 'text-slate-300 hover:bg-slate-800 border-slate-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Capas</span>
          </button>
        </div>
      </div>
    </header>
  );
};
