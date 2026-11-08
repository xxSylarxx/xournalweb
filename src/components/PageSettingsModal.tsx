import React, { useState } from 'react';
import { X, Layout } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { PageBackgroundType } from '../types/document';

interface PaperPreset {
  name: string;
  width: number;
  height: number;
}

const PRESETS: Record<string, PaperPreset> = {
  a4: { name: 'A4 (210 × 297 mm)', width: 794, height: 1123 },
  letter: { name: 'US Letter (8.5 × 11 in)', width: 816, height: 1056 },
  legal: { name: 'US Legal (8.5 × 14 in)', width: 816, height: 1344 },
  a3: { name: 'A3 (297 × 420 mm)', width: 1123, height: 1588 },
  custom: { name: 'Personalizado', width: 794, height: 1123 },
};

const BACKGROUND_OPTIONS: { id: PageBackgroundType; label: string }[] = [
  { id: 'lined', label: 'Rayado' },
  { id: 'graph', label: 'Cuadriculado (Grid)' },
  { id: 'dotted', label: 'Puntos (Dotted)' },
  { id: 'plain', label: 'En blanco (Plain)' },
  { id: 'isodotted', label: 'Isométrico Puntos' },
  { id: 'isograph', label: 'Isométrico Cuadrícula' },
  { id: 'staves', label: 'Pentagrama Musical' },
];

export const PageSettingsModal: React.FC = () => {
  const isPageSettingsModalOpen = useAppStore((state) => state.isPageSettingsModalOpen);
  const togglePageSettingsModal = useAppStore((state) => state.togglePageSettingsModal);
  const document = useAppStore((state) => state.document);
  const activePageIndex = useAppStore((state) => state.activePageIndex);
  const setPageDimensions = useAppStore((state) => state.setPageDimensions);
  const setPageBackground = useAppStore((state) => state.setPageBackground);

  const currentPage = document.pages[activePageIndex];

  const [presetKey, setPresetKey] = useState<string>('a4');
  const [customWidth, setCustomWidth] = useState<number>(currentPage?.width || 794);
  const [customHeight, setCustomHeight] = useState<number>(currentPage?.height || 1123);
  const [isLandscape, setIsLandscape] = useState<boolean>((currentPage?.width || 794) > (currentPage?.height || 1123));
  const [bgType, setBgType] = useState<PageBackgroundType>(currentPage?.background.type || 'lined');
  const [bgColor, setBgColor] = useState<string>(currentPage?.background.color || '#ffffff');
  const [applyToAll, setApplyToAll] = useState<boolean>(false);

  if (!isPageSettingsModalOpen || !currentPage) return null;

  const handlePresetChange = (key: string) => {
    setPresetKey(key);
    if (key !== 'custom') {
      const p = PRESETS[key];
      const w = isLandscape ? Math.max(p.width, p.height) : Math.min(p.width, p.height);
      const h = isLandscape ? Math.min(p.width, p.height) : Math.max(p.width, p.height);
      setCustomWidth(w);
      setCustomHeight(h);
    }
  };

  const handleOrientationToggle = (landscape: boolean) => {
    setIsLandscape(landscape);
    const w = landscape ? Math.max(customWidth, customHeight) : Math.min(customWidth, customHeight);
    const h = landscape ? Math.min(customWidth, customHeight) : Math.max(customWidth, customHeight);
    setCustomWidth(w);
    setCustomHeight(h);
  };

  const handleApply = () => {
    const targetPages = applyToAll ? document.pages.map((_, idx) => idx) : [activePageIndex];

    for (const pIdx of targetPages) {
      setPageDimensions(pIdx, customWidth, customHeight);
      setPageBackground(pIdx, bgType, bgColor);
    }

    togglePageSettingsModal();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden text-slate-100 p-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Layout className="w-5 h-5 text-blue-400" />
            <h3 className="font-semibold text-sm">Configuración de Papel y Plantilla</h3>
          </div>
          <button
            onClick={togglePageSettingsModal}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="py-4 space-y-4 text-xs">
          {/* Paper Size Preset */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1.5">
              Tamaño de Papel
            </label>
            <select
              value={presetKey}
              onChange={(e) => handlePresetChange(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
            >
              {Object.entries(PRESETS).map(([key, p]) => (
                <option key={key} value={key}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Orientation & Dimensions */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1.5">
                Orientación
              </label>
              <div className="flex bg-slate-800 rounded p-1 border border-slate-700 text-xs">
                <button
                  type="button"
                  onClick={() => handleOrientationToggle(false)}
                  className={`flex-1 py-1 rounded text-center transition-all ${
                    !isLandscape ? 'bg-blue-600 text-white font-medium shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Vertical
                </button>
                <button
                  type="button"
                  onClick={() => handleOrientationToggle(true)}
                  className={`flex-1 py-1 rounded text-center transition-all ${
                    isLandscape ? 'bg-blue-600 text-white font-medium shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Horizontal
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1.5">
                Dimensiones (px)
              </label>
              <div className="flex items-center gap-1.5 text-slate-300">
                <input
                  type="number"
                  value={customWidth}
                  onChange={(e) => {
                    setPresetKey('custom');
                    setCustomWidth(Number(e.target.value));
                  }}
                  className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-center focus:outline-none"
                />
                <span>×</span>
                <input
                  type="number"
                  value={customHeight}
                  onChange={(e) => {
                    setPresetKey('custom');
                    setCustomHeight(Number(e.target.value));
                  }}
                  className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-center focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Paper Background Pattern */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1.5">
              Patrón de Fondo
            </label>
            <select
              value={bgType}
              onChange={(e) => setBgType(e.target.value as PageBackgroundType)}
              className="w-full bg-slate-800 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
            >
              {BACKGROUND_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Paper Base Color */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1.5">
              Color de Papel
            </label>
            <div className="flex items-center gap-2">
              {[
                { label: 'Blanco', color: '#ffffff' },
                { label: 'Crema', color: '#fefce8' },
                { label: 'Amarillo suave', color: '#fef9c3' },
                { label: 'Azul pastel', color: '#f0f9ff' },
                { label: 'Modo Oscuro', color: '#0f172a' },
              ].map((c) => (
                <button
                  key={c.color}
                  type="button"
                  onClick={() => setBgColor(c.color)}
                  title={c.label}
                  className={`w-7 h-7 rounded-full border-2 transition-transform ${
                    bgColor === c.color ? 'border-blue-500 scale-110 shadow-md ring-1 ring-blue-400' : 'border-slate-700'
                  }`}
                  style={{ backgroundColor: c.color }}
                />
              ))}
              <input
                type="color"
                value={bgColor}
                onChange={(e) => setBgColor(e.target.value)}
                className="w-7 h-7 rounded cursor-pointer border border-slate-700 bg-transparent p-0"
                title="Color personalizado"
              />
            </div>
          </div>

          {/* Apply scope checkbox */}
          <div className="pt-2">
            <label className="flex items-center gap-2 cursor-pointer text-slate-300">
              <input
                type="checkbox"
                checked={applyToAll}
                onChange={(e) => setApplyToAll(e.target.checked)}
                className="rounded text-blue-600 focus:ring-0"
              />
              <span>Aplicar plantilla a todas las páginas ({document.pages.length})</span>
            </label>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={togglePageSettingsModal}
            className="px-3 py-1.5 rounded text-xs text-slate-300 hover:bg-slate-800 transition-all"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="px-4 py-1.5 rounded text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-md transition-all"
          >
            Aplicar Cambios
          </button>
        </div>
      </div>
    </div>
  );
};
