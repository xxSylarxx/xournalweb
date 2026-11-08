import React, { useState } from 'react';
import { X, FileDown, FileText, Image as ImageIcon, Code2 } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import {
  exportDocumentAsPdf,
  exportPageAsPng,
  exportPageAsSvg,
  downloadBlob,
} from '../engine/exporter';

export const ExportModal: React.FC = () => {
  const isExportModalOpen = useAppStore((state) => state.isExportModalOpen);
  const toggleExportModal = useAppStore((state) => state.toggleExportModal);
  const document = useAppStore((state) => state.document);
  const activePageIndex = useAppStore((state) => state.activePageIndex);

  const [format, setFormat] = useState<'pdf' | 'png' | 'svg'>('pdf');
  const [pageScope, setPageScope] = useState<'all' | 'current' | 'custom'>('all');
  const [customRange, setCustomRange] = useState('');
  const [resolutionScale, setResolutionScale] = useState<number>(2);
  const [isExporting, setIsExporting] = useState(false);

  if (!isExportModalOpen) return null;

  const parsePageIndices = (): number[] => {
    if (pageScope === 'current') return [activePageIndex];
    if (pageScope === 'all') return document.pages.map((_, idx) => idx);

    // Custom range parser: e.g. "1, 2-4, 6"
    const indices = new Set<number>();
    const parts = customRange.split(',').map((p) => p.trim());
    for (const part of parts) {
      if (part.includes('-')) {
        const [startStr, endStr] = part.split('-').map((s) => s.trim());
        const start = parseInt(startStr, 10);
        const end = parseInt(endStr, 10);
        if (!isNaN(start) && !isNaN(end)) {
          for (let i = Math.max(1, start); i <= Math.min(document.pages.length, end); i++) {
            indices.add(i - 1);
          }
        }
      } else {
        const num = parseInt(part, 10);
        if (!isNaN(num) && num >= 1 && num <= document.pages.length) {
          indices.add(num - 1);
        }
      }
    }
    return Array.from(indices).sort((a, b) => a - b);
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const selectedIndices = parsePageIndices();
      if (selectedIndices.length === 0) {
        alert('Por favor especifica un rango válido de páginas.');
        setIsExporting(false);
        return;
      }

      const docTitle = document.title || 'documento';

      if (format === 'pdf') {
        const blob = await exportDocumentAsPdf(document, selectedIndices);
        downloadBlob(blob, `${docTitle}.pdf`);
      } else if (format === 'png') {
        for (const idx of selectedIndices) {
          const page = document.pages[idx];
          if (!page) continue;
          const blob = await exportPageAsPng(page, document, resolutionScale);
          downloadBlob(blob, `${docTitle}_p${idx + 1}.png`);
        }
      } else if (format === 'svg') {
        for (const idx of selectedIndices) {
          const page = document.pages[idx];
          if (!page) continue;
          const svgContent = await exportPageAsSvg(page, document);
          const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
          downloadBlob(blob, `${docTitle}_p${idx + 1}.svg`);
        }
      }

      toggleExportModal();
    } catch (err: any) {
      alert(`Error al exportar: ${err.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn p-3">
      <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto text-slate-100 p-4 sm:p-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <FileDown className="w-5 h-5 text-blue-400" />
            <h3 className="font-semibold text-sm">Exportación Avanzada</h3>
          </div>
          <button
            onClick={toggleExportModal}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="py-4 space-y-4 text-xs">
          {/* Format selection */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-2">
              Formato de Exportación
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setFormat('pdf')}
                className={`flex flex-col items-center justify-center p-2.5 rounded-lg border transition-all ${
                  format === 'pdf'
                    ? 'bg-blue-600/20 border-blue-500 text-blue-300 font-medium'
                    : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <FileText className="w-5 h-5 text-red-400 mb-1" />
                <span>PDF (.pdf)</span>
              </button>

              <button
                type="button"
                onClick={() => setFormat('png')}
                className={`flex flex-col items-center justify-center p-2.5 rounded-lg border transition-all ${
                  format === 'png'
                    ? 'bg-blue-600/20 border-blue-500 text-blue-300 font-medium'
                    : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <ImageIcon className="w-5 h-5 text-green-400 mb-1" />
                <span>PNG (.png)</span>
              </button>

              <button
                type="button"
                onClick={() => setFormat('svg')}
                className={`flex flex-col items-center justify-center p-2.5 rounded-lg border transition-all ${
                  format === 'svg'
                    ? 'bg-blue-600/20 border-blue-500 text-blue-300 font-medium'
                    : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Code2 className="w-5 h-5 text-amber-400 mb-1" />
                <span>SVG Vectorial</span>
              </button>
            </div>
          </div>

          {/* Page scope */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-2">
              Rango de Páginas
            </label>
            <div className="space-y-1.5">
              <label className="flex items-center gap-2 cursor-pointer text-slate-200">
                <input
                  type="radio"
                  name="pageScope"
                  checked={pageScope === 'all'}
                  onChange={() => setPageScope('all')}
                  className="text-blue-600 focus:ring-0"
                />
                <span>Todas las páginas ({document.pages.length})</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-slate-200">
                <input
                  type="radio"
                  name="pageScope"
                  checked={pageScope === 'current'}
                  onChange={() => setPageScope('current')}
                  className="text-blue-600 focus:ring-0"
                />
                <span>Página actual (Página {activePageIndex + 1})</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-slate-200">
                <input
                  type="radio"
                  name="pageScope"
                  checked={pageScope === 'custom'}
                  onChange={() => setPageScope('custom')}
                  className="text-blue-600 focus:ring-0"
                />
                <span>Personalizado</span>
              </label>

              {pageScope === 'custom' && (
                <input
                  type="text"
                  value={customRange}
                  onChange={(e) => setCustomRange(e.target.value)}
                  placeholder="ej. 1, 3-5, 8"
                  className="mt-1 w-full bg-slate-800 border border-slate-700 rounded px-2.5 py-1 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              )}
            </div>
          </div>

          {/* Resolution Scale (for PNG) */}
          {format === 'png' && (
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-2">
                Resolución / DPI
              </label>
              <select
                value={resolutionScale}
                onChange={(e) => setResolutionScale(Number(e.target.value))}
                className="w-full bg-slate-800 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
              >
                <option value={1}>1x (96 DPI — Estándar pantalla)</option>
                <option value={2}>2x (192 DPI — Alta calidad Retina)</option>
                <option value={3}>3x (288 DPI — Calidad de impresión)</option>
              </select>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={toggleExportModal}
            className="px-3 py-1.5 rounded text-xs text-slate-300 hover:bg-slate-800 transition-all"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={isExporting}
            className="px-4 py-1.5 rounded text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-md disabled:opacity-50 transition-all flex items-center gap-1.5"
          >
            <FileDown className="w-3.5 h-3.5" />
            <span>{isExporting ? 'Exportando...' : 'Descargar Archivo'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

