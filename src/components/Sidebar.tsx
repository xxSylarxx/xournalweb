import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  FileText,
  Copy,
  ChevronUp,
  ChevronDown,
  ChevronsUp,
  ChevronsDown,
  Grid,
  BookOpen,
  Bookmark,
  Sliders,
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { PageBackgroundType, PdfBookmark } from '../types/document';

const paperTypes: { id: PageBackgroundType; label: string }[] = [
  { id: 'lined', label: 'Rayado' },
  { id: 'graph', label: 'Cuadriculado' },
  { id: 'dotted', label: 'Puntos' },
  { id: 'plain', label: 'Liso / Blanco' },
  { id: 'isodotted', label: 'Isométrico (Puntos)' },
  { id: 'isograph', label: 'Isométrico (Líneas)' },
  { id: 'staves', label: 'Pentagrama Musical' },
];

export const Sidebar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(true);
  const [isPaperMenuOpen, setIsPaperMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'pages' | 'bookmarks'>('pages');

  const document = useAppStore((state) => state.document);
  const activePageIndex = useAppStore((state) => state.activePageIndex);
  const setActivePage = useAppStore((state) => state.setActivePage);
  const addNewPage = useAppStore((state) => state.addNewPage);
  const duplicateCurrentPage = useAppStore((state) => state.duplicateCurrentPage);
  const movePage = useAppStore((state) => state.movePage);
  const deleteCurrentPage = useAppStore((state) => state.deleteCurrentPage);
  const setPageBackground = useAppStore((state) => state.setPageBackground);
  const togglePageSettingsModal = useAppStore((state) => state.togglePageSettingsModal);

  const currentPage = document.pages[activePageIndex];
  const hasBookmarks = document.bookmarks && document.bookmarks.length > 0;

  const renderBookmarkItems = (items: PdfBookmark[], depth = 0) => {
    return items.map((item, idx) => {
      const isCurrentPage = item.pageIndex === activePageIndex;
      return (
        <div key={`${item.title}-${idx}`} className="flex flex-col">
          <button
            onClick={() => setActivePage(item.pageIndex)}
            style={{ paddingLeft: `${depth * 12 + 8}px` }}
            className={`w-full text-left py-1.5 pr-2 rounded text-xs flex items-center justify-between group transition-all ${
              isCurrentPage
                ? 'bg-blue-600/20 text-blue-400 font-semibold'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-1.5 truncate">
              <Bookmark className="w-3 h-3 text-slate-500 group-hover:text-blue-400 shrink-0" />
              <span className="truncate">{item.title}</span>
            </div>
            <span className="text-[10px] font-mono text-slate-500 shrink-0">p. {item.pageIndex + 1}</span>
          </button>
          {item.children && item.children.length > 0 && renderBookmarkItems(item.children, depth + 1)}
        </div>
      );
    });
  };

  return (
    <aside
      className={`relative bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 transition-all duration-200 select-none ${
        isOpen ? 'w-56' : 'w-10'
      }`}
    >
      {/* Header / Collapse Toggle & Tabs */}
      <div className="h-10 flex items-center justify-between px-2.5 border-b border-slate-800 text-slate-300">
        {isOpen && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab('pages')}
              className={`text-xs font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded transition-all ${
                activeTab === 'pages' ? 'text-white bg-slate-800' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Páginas ({document.pages.length})
            </button>
            {hasBookmarks && (
              <button
                onClick={() => setActiveTab('bookmarks')}
                title="Tabla de Contenidos / Marcadores del PDF"
                className={`text-xs font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded transition-all flex items-center gap-1 ${
                  activeTab === 'bookmarks' ? 'text-blue-400 bg-slate-800' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <BookOpen className="w-3 h-3" />
                <span>Índice</span>
              </button>
            )}
          </div>
        )}
        <button
          onClick={() => setIsOpen(!isOpen)}
          title={isOpen ? 'Ocultar panel lateral' : 'Mostrar panel lateral'}
          className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-all ml-auto"
        >
          {isOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
      </div>

      {isOpen ? (
        activeTab === 'bookmarks' && hasBookmarks ? (
          /* PDF Outline / Bookmarks View */
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {renderBookmarkItems(document.bookmarks!)}
          </div>
        ) : (
          <>
            {/* Paper Type Quick Selector */}
            {currentPage && currentPage.background.type !== 'pdf' && (
              <div className="relative p-2 border-b border-slate-800/80 bg-slate-950/40">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-semibold text-slate-400">Tipo de Hoja</span>
                  <button
                    onClick={() => setIsPaperMenuOpen(!isPaperMenuOpen)}
                    className="flex items-center gap-1 text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-200 px-2 py-0.5 rounded transition-all border border-slate-700"
                  >
                    <Grid className="w-3 h-3 text-blue-400" />
                    <span className="capitalize">{paperTypes.find((p) => p.id === currentPage.background.type)?.label || 'Papel'}</span>
                    <ChevronDown className="w-3 h-3 text-slate-400 ml-0.5" />
                  </button>
                </div>

                {isPaperMenuOpen && (
                  <div className="absolute left-2 right-2 top-9 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl py-1 z-50 text-xs text-slate-200 animate-fadeIn">
                    {paperTypes.map((pt) => (
                      <button
                        key={pt.id}
                        onClick={() => {
                          setPageBackground(activePageIndex, pt.id);
                          setIsPaperMenuOpen(false);
                        }}
                        className={`w-full text-left px-2.5 py-1.5 hover:bg-slate-800 flex items-center justify-between ${
                          currentPage.background.type === pt.id ? 'text-blue-400 font-semibold bg-blue-600/10' : ''
                        }`}
                      >
                        <span>{pt.label}</span>
                        {currentPage.background.type === pt.id && <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Page Thumbnails List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
              {document.pages.map((page, index) => {
                const isActive = index === activePageIndex;
                const strokeCount = page.layers.reduce((acc, l) => acc + l.strokes.length, 0);

                return (
                  <div
                    key={page.id}
                    onClick={() => setActivePage(index)}
                    className={`group relative flex items-center gap-2 p-2 rounded-lg cursor-pointer border transition-all ${
                      isActive
                        ? 'bg-blue-600/20 border-blue-500/80 text-white shadow-sm'
                        : 'bg-slate-800/40 border-slate-800 text-slate-300 hover:bg-slate-800/80 hover:text-white'
                    }`}
                  >
                    {/* Thumbnail / Page Number box */}
                    <div
                      className={`w-8 h-11 rounded flex flex-col items-center justify-center border text-[11px] font-mono shadow-inner shrink-0 ${
                        isActive ? 'bg-white text-slate-900 border-blue-400 font-bold' : 'bg-slate-100 text-slate-700 border-slate-300'
                      }`}
                    >
                      <span>{index + 1}</span>
                      <span className="text-[8px] font-sans text-slate-400 -mt-0.5 uppercase">
                        {page.background.type === 'pdf' ? 'pdf' : page.background.type.slice(0, 3)}
                      </span>
                    </div>

                    {/* Page details */}
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium truncate">Página {index + 1}</div>
                      <div className="text-[10px] text-slate-400 truncate flex items-center gap-1 mt-0.5">
                        <FileText className="w-2.5 h-2.5" />
                        <span>{strokeCount} trazos</span>
                      </div>
                    </div>

                    {/* Reordering & Action Buttons */}
                    <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                      {index > 0 && (
                        <>
                          <button
                            onClick={() => movePage(index, 0)}
                            title="Mover al principio de todo"
                            className="p-0.5 hover:bg-slate-700 rounded text-slate-400 hover:text-white"
                          >
                            <ChevronsUp className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => movePage(index, index - 1)}
                            title="Mover arriba"
                            className="p-0.5 hover:bg-slate-700 rounded text-slate-400 hover:text-white"
                          >
                            <ChevronUp className="w-3 h-3" />
                          </button>
                        </>
                      )}
                      {index < document.pages.length - 1 && (
                        <>
                          <button
                            onClick={() => movePage(index, index + 1)}
                            title="Mover abajo"
                            className="p-0.5 hover:bg-slate-700 rounded text-slate-400 hover:text-white"
                          >
                            <ChevronDown className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => movePage(index, document.pages.length - 1)}
                            title="Mover al final de todo"
                            className="p-0.5 hover:bg-slate-700 rounded text-slate-400 hover:text-white"
                          >
                            <ChevronsDown className="w-3 h-3" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer Actions */}
            <div className="p-2 border-t border-slate-800 flex items-center gap-1.5">
              <button
                onClick={() => addNewPage(currentPage?.background.type || 'lined')}
                title="Añadir nueva página"
                className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-lg transition-all shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Página</span>
              </button>

              <button
                onClick={duplicateCurrentPage}
                title="Duplicar página actual"
                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 rounded-lg transition-all"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={togglePageSettingsModal}
                title="Configuración de papel y plantillas"
                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-blue-400 border border-slate-700 rounded-lg transition-all"
              >
                <Sliders className="w-3.5 h-3.5" />
              </button>

              {document.pages.length > 1 && (
                <button
                  onClick={deleteCurrentPage}
                  title="Eliminar página actual"
                  className="p-1.5 bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 border border-slate-700 rounded-lg transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </>
        )
      ) : (
        /* Collapsed View */
        <div className="flex-1 flex flex-col items-center py-2 space-y-1.5">
          {document.pages.map((_, index) => (
            <button
              key={index}
              onClick={() => setActivePage(index)}
              title={`Página ${index + 1}`}
              className={`w-6 h-6 rounded flex items-center justify-center text-xs font-mono transition-all ${
                index === activePageIndex
                  ? 'bg-blue-600 text-white font-bold shadow-sm'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {index + 1}
            </button>
          ))}
        </div>
      )}
    </aside>
  );
};
