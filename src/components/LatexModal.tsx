import React, { useState, useEffect, useRef } from 'react';
import katex from 'katex';
import { X, Sigma, Check, AlertCircle } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

const SAMPLE_FORMULAS = [
  { label: 'Ecuación Cuadrática', formula: 'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}' },
  { label: 'Integral Gaussiana', formula: '\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}' },
  { label: 'Identidad de Euler', formula: 'e^{i\\pi} + 1 = 0' },
  { label: 'Matriz 2x2', formula: '\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}' },
];

export const LatexModal: React.FC = () => {
  const isLatexModalOpen = useAppStore((state) => state.isLatexModalOpen);
  const toggleLatexModal = useAppStore((state) => state.toggleLatexModal);
  const addImageElement = useAppStore((state) => state.addImageElement);
  const document = useAppStore((state) => state.document);
  const activePageIndex = useAppStore((state) => state.activePageIndex);

  const [formula, setFormula] = useState('x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}');
  const [htmlPreview, setHtmlPreview] = useState('');
  const [error, setError] = useState<string | null>(null);
  const previewRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    try {
      const rendered = katex.renderToString(formula, {
        displayMode: true,
        throwOnError: true,
      });
      setHtmlPreview(rendered);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Error en la sintaxis de LaTeX');
    }
  }, [formula]);

  if (!isLatexModalOpen) return null;

  const handleInsert = () => {
    if (!formula.trim() || error) return;

    // Render formula to high-resolution PNG using SVG foreignObject
    const svgContent = `
      <svg xmlns="http://www.w3.org/2000/svg" width="500" height="120">
        <foreignObject width="100%" height="100%">
          <div xmlns="http://www.w3.org/1999/xhtml" style="font-size: 24px; color: black; display: flex; align-items: center; justify-content: center; height: 100%;">
            ${htmlPreview}
          </div>
        </foreignObject>
      </svg>
    `;

    const svgBlob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();

    img.onload = () => {
      const canvas = window.document.createElement('canvas');
      canvas.width = 500 * 2;
      canvas.height = 120 * 2;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(2, 2);
        ctx.drawImage(img, 0, 0);
        const dataUrl = canvas.toDataURL('image/png');

        const curPage = document.pages[activePageIndex];
        addImageElement({
          id: `tex-${Date.now()}`,
          x: (curPage?.width || 794) / 2 - 150,
          y: (curPage?.height || 1123) / 2 - 40,
          width: 300,
          height: 80,
          dataUrl,
        });

        toggleLatexModal();
      }
      URL.revokeObjectURL(url);
    };

    img.src = url;
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl w-full max-w-lg p-5 flex flex-col gap-4 text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-600/20 text-blue-400 rounded-lg">
              <Sigma className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-100">Editor de Ecuaciones LaTeX</h3>
              <p className="text-[11px] text-slate-400">Inserta fórmulas matemáticas con KaTeX en tu página</p>
            </div>
          </div>
          <button
            onClick={toggleLatexModal}
            className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick sample chips */}
        <div className="flex flex-wrap gap-1.5">
          {SAMPLE_FORMULAS.map((item) => (
            <button
              key={item.label}
              onClick={() => setFormula(item.formula)}
              className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1 rounded border border-slate-700 transition-all"
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Input Textarea */}
        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-300 font-medium">Código LaTeX:</label>
          <textarea
            value={formula}
            onChange={(e) => setFormula(e.target.value)}
            rows={3}
            placeholder="Escribe tu fórmula LaTeX aquí..."
            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs font-mono text-blue-300 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none shadow-inner"
          />
        </div>

        {/* Live Preview */}
        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-300 font-medium">Previsualización en tiempo real:</label>
          <div
            ref={previewRef}
            className="min-h-[90px] bg-white rounded-lg p-4 flex items-center justify-center border border-slate-300 shadow-inner overflow-x-auto text-slate-900"
          >
            {error ? (
              <div className="flex items-center gap-1.5 text-red-500 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span className="font-mono text-[11px]">{error}</span>
              </div>
            ) : (
              <div dangerouslySetInnerHTML={{ __html: htmlPreview }} />
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
          <button
            onClick={toggleLatexModal}
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={handleInsert}
            disabled={Boolean(error) || !formula.trim()}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:pointer-events-none text-white rounded-lg text-xs font-semibold shadow-md transition-all"
          >
            <Check className="w-4 h-4" />
            <span>Insertar en Página</span>
          </button>
        </div>
      </div>
    </div>
  );
};
