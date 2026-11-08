import React, { useEffect, useRef, useState } from 'react';
import { Toolbar } from './components/Toolbar';
import { Sidebar } from './components/Sidebar';
import { PageCanvas } from './components/PageCanvas';
import { LayersPanel } from './components/LayersPanel';
import { LatexModal } from './components/LatexModal';
import { SearchBar } from './components/SearchBar';
import { ExportModal } from './components/ExportModal';
import { PageSettingsModal } from './components/PageSettingsModal';
import { PreferencesModal } from './components/PreferencesModal';
import { PluginsModal } from './components/PluginsModal';
import { VoiceRecorder } from './components/VoiceRecorder';
import { loadDraftFromStorage } from './engine/storage';
import { useAppStore } from './store/useAppStore';
import { ToolType, Page } from './types/document';

interface VirtualPageContainerProps {
  page: Page;
  index: number;
  total: number;
}

const VirtualPageContainer: React.FC<VirtualPageContainerProps> = ({ page, index, total }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isVisible, setIsVisible] = useState<boolean>(index === 0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      {
        rootMargin: '600px 0px 600px 0px',
        threshold: 0.01,
      }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative flex flex-col items-center"
      style={{
        minWidth: `${page.width}px`,
        minHeight: `${page.height}px`,
      }}
    >
      {/* Page number badge */}
      <div className="text-[11px] font-mono font-medium text-slate-500 mb-2">
        Página {index + 1} de {total}
      </div>

      {isVisible ? (
        <PageCanvas page={page} pageIndex={index} />
      ) : (
        <div
          className="relative shadow-md rounded-sm bg-white/80 border border-slate-300 flex flex-col items-center justify-center text-slate-400 gap-1"
          style={{ width: `${page.width}px`, height: `${page.height}px` }}
        >
          <div className="text-xs font-mono font-medium text-slate-600">Página {index + 1}</div>
          <div className="text-[10px] text-slate-400">Cargando lienzo al desplazar...</div>
        </div>
      )}
    </div>
  );
};

export const App: React.FC = () => {
  const document = useAppStore((state) => state.document);
  const zoom = useAppStore((state) => state.zoom);
  const undo = useAppStore((state) => state.undo);
  const redo = useAppStore((state) => state.redo);
  const activeTool = useAppStore((state) => state.activeTool);
  const setActiveTool = useAppStore((state) => state.setActiveTool);

  const selectedStrokeIds = useAppStore((state) => state.selectedStrokeIds);
  const deleteSelectedStrokes = useAppStore((state) => state.deleteSelectedStrokes);
  const copySelection = useAppStore((state) => state.copySelection);
  const cutSelection = useAppStore((state) => state.cutSelection);
  const pasteSelection = useAppStore((state) => state.pasteSelection);
  const selectAll = useAppStore((state) => state.selectAll);
  const toggleSearch = useAppStore((state) => state.toggleSearch);
  const isPresentationMode = useAppStore((state) => state.isPresentationMode);
  const togglePresentationMode = useAppStore((state) => state.togglePresentationMode);
  const viewMode = useAppStore((state) => state.viewMode);
  const toggleFullscreen = useAppStore((state) => state.toggleFullscreen);
  const loadDocument = useAppStore((state) => state.loadDocument);

  // Auto-restore draft from IndexedDB/localStorage on startup
  useEffect(() => {
    loadDraftFromStorage()
      .then((draft) => {
        if (draft && draft.doc && draft.doc.pages && draft.doc.pages.length > 0) {
          loadDocument({
            title: draft.doc.title || 'Documento Recuperado',
            pages: draft.doc.pages,
          });
        }
      })
      .catch(() => {});
  }, [loadDocument]);

  const previousToolRef = useRef<ToolType>('pen');

  // Keyboard Shortcuts (Undo, Redo, Copy, Paste, Delete, Tool switching, Spacebar Panning)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      // Spacebar hold -> Hand Tool
      if (e.code === 'Space' && !e.repeat && activeTool !== 'hand') {
        previousToolRef.current = activeTool;
        setActiveTool('hand');
        return;
      }

      // Undo / Redo
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
      }
      // Copy
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
        if (selectedStrokeIds.length > 0) {
          e.preventDefault();
          copySelection();
        }
      }
      // Cut
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'x') {
        if (selectedStrokeIds.length > 0) {
          e.preventDefault();
          cutSelection();
        }
      }
      // Paste (internal strokes or system clipboard text)
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
        e.preventDefault();
        const clipboardStrokes = useAppStore.getState().clipboard;
        if (clipboardStrokes && clipboardStrokes.length > 0) {
          pasteSelection();
        } else if (navigator.clipboard && typeof navigator.clipboard.readText === 'function') {
          navigator.clipboard
            .readText()
            .then((clipText) => {
              if (clipText && clipText.trim()) {
                const state = useAppStore.getState();
                state.addTextElement({
                  id: `text-${Date.now()}`,
                  x: 80,
                  y: 120,
                  text: clipText,
                  fontFamily: state.fontFamily,
                  fontSize: state.fontSize,
                  color: state.penSettings.color,
                  bold: state.isBold,
                  italic: state.isItalic,
                  align: state.textAlign,
                });
              }
            })
            .catch(() => {});
        }
      }
      // Select All
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        selectAll();
      }
      // Search (Ctrl+F)
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        toggleSearch(true);
      }
      // Delete selected
      else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedStrokeIds.length > 0) {
          e.preventDefault();
          deleteSelectedStrokes();
        }
      }
      // Presentation Mode (F5)
      else if (e.key === 'F5') {
        e.preventDefault();
        togglePresentationMode();
      }
      // Fullscreen (F11)
      else if (e.key === 'F11') {
        e.preventDefault();
        toggleFullscreen();
      }
      // Tool shortcuts
      else if (e.key.toLowerCase() === 'p') {
        setActiveTool('pen');
      } else if (e.key.toLowerCase() === 'h' || e.key.toLowerCase() === 'm') {
        setActiveTool('hand');
      } else if (e.key.toLowerCase() === 'e') {
        setActiveTool('eraser');
      } else if (e.key.toLowerCase() === 's') {
        if (e.shiftKey) {
          setActiveTool('selectRegion');
        } else {
          setActiveTool('selectRect');
        }
      } else if (e.key.toLowerCase() === 't') {
        setActiveTool('text');
      } else if (e.key.toLowerCase() === 'l') {
        setActiveTool('line');
      } else if (e.key.toLowerCase() === 'r') {
        setActiveTool('rect');
      } else if (e.key.toLowerCase() === 'c') {
        setActiveTool('ellipse');
      } else if (e.key.toLowerCase() === 'v' && !e.ctrlKey && !e.metaKey) {
        setActiveTool('verticalSpace');
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      // Spacebar release -> return to previous tool
      if (e.code === 'Space' && activeTool === 'hand') {
        setActiveTool(previousToolRef.current);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [
    activeTool,
    selectedStrokeIds,
    undo,
    redo,
    setActiveTool,
    copySelection,
    cutSelection,
    pasteSelection,
    selectAll,
    deleteSelectedStrokes,
    togglePresentationMode,
    toggleFullscreen,
    toggleSearch,
  ]);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-950 font-sans">
      {/* Top Application Toolbar or Presentation Pill */}
      {isPresentationMode ? (
        <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-slate-900/95 backdrop-blur-md border border-slate-700/80 px-4 py-2 rounded-full shadow-2xl text-xs text-slate-200">
          <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          <span className="font-semibold text-amber-300">Modo Presentación</span>
          <span className="text-slate-400 text-[11px]">(Presiona F5 para salir)</span>
          <button
            onClick={togglePresentationMode}
            className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white font-medium rounded-full text-[11px] transition-all"
          >
            Salir
          </button>
        </div>
      ) : (
        <Toolbar />
      )}

      {/* Main Workspace (Sidebar + Canvas Area + Floating Layers Panel) */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Pages Sidebar (hidden in presentation mode) */}
        {!isPresentationMode && <Sidebar />}

        {/* Modals & Floating Toolbars */}
        <LayersPanel />
        <LatexModal />
        <SearchBar />
        <ExportModal />
        <PageSettingsModal />
        <PreferencesModal />
        <PluginsModal />
        <VoiceRecorder />

        {/* Scrollable Viewport for Document Pages */}
        <main className="flex-1 overflow-auto bg-slate-200/90 flex flex-col items-center py-8 px-4 relative">
          <div
            className="flex flex-col items-center gap-8 origin-top"
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: 'top center',
            }}
          >
            {viewMode === 'paired' ? (
              <div className="flex flex-col items-center gap-8">
                {(() => {
                  const pairs: [Page, Page | null, number][] = [];
                  for (let i = 0; i < document.pages.length; i += 2) {
                    pairs.push([document.pages[i], document.pages[i + 1] || null, i]);
                  }
                  return pairs.map(([p1, p2, idx]) => (
                    <div key={p1.id} className="flex flex-row items-start gap-6">
                      <VirtualPageContainer page={p1} index={idx} total={document.pages.length} />
                      {p2 && <VirtualPageContainer page={p2} index={idx + 1} total={document.pages.length} />}
                    </div>
                  ));
                })()}
              </div>
            ) : (
              document.pages.map((page, index) => (
                <VirtualPageContainer
                  key={page.id}
                  page={page}
                  index={index}
                  total={document.pages.length}
                />
              ))
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;
