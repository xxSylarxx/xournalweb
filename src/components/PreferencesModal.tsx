import React from 'react';
import { X, Settings, PenTool, Magnet, Monitor } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

export const PreferencesModal: React.FC = () => {
  const isPreferencesOpen = useAppStore((state) => state.isPreferencesOpen);
  const togglePreferences = useAppStore((state) => state.togglePreferences);
  const preferences = useAppStore((state) => state.preferences);
  const updatePreferences = useAppStore((state) => state.updatePreferences);
  const stabilizerConfig = useAppStore((state) => state.stabilizerConfig);
  const updateStabilizerConfig = useAppStore((state) => state.updateStabilizerConfig);

  const [activeTab, setActiveTab] = React.useState<'input' | 'snapping' | 'interface'>('input');

  if (!isPreferencesOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn p-3">
      <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto text-slate-100 p-4 sm:p-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-blue-400" />
            <h3 className="font-semibold text-sm">Preferencias y Ajustes</h3>
          </div>
          <button
            onClick={togglePreferences}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-800 pt-3 pb-2 text-xs">
          <button
            onClick={() => setActiveTab('input')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded font-medium transition-all ${
              activeTab === 'input' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <PenTool className="w-3.5 h-3.5" />
            <span>Entrada y Stylus</span>
          </button>
          <button
            onClick={() => setActiveTab('snapping')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded font-medium transition-all ${
              activeTab === 'snapping' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Magnet className="w-3.5 h-3.5" />
            <span>Imantación (Snapping)</span>
          </button>
          <button
            onClick={() => setActiveTab('interface')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded font-medium transition-all ${
              activeTab === 'interface' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>Interfaz y Autoguardado</span>
          </button>
        </div>

        {/* Tab content */}
        <div className="py-4 space-y-4 text-xs max-h-96 overflow-y-auto">
          {activeTab === 'input' && (
            <div className="space-y-3.5">
              <div>
                <div className="flex justify-between text-slate-300 mb-1">
                  <span>Multiplicador de Sensibilidad de Presión</span>
                  <span className="font-mono text-blue-400">{preferences.pressureMultiplier}x</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="2.5"
                  step="0.1"
                  value={preferences.pressureMultiplier}
                  onChange={(e) => updatePreferences({ pressureMultiplier: parseFloat(e.target.value) })}
                  className="w-full accent-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Acción del botón lateral del Stylus</label>
                <select
                  value={preferences.stylusButtonAction}
                  onChange={(e) => updatePreferences({ stylusButtonAction: e.target.value as any })}
                  className="w-full bg-slate-800 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
                >
                  <option value="eraser">Borrador automático al presionar</option>
                  <option value="select">Selección por lazo (Lasso)</option>
                  <option value="hand">Mano / Desplazamiento (Panning)</option>
                  <option value="highlighter">Resaltador temporal</option>
                </select>
              </div>

              {/* Stabilizer Settings */}
              <div className="border-t border-slate-800 pt-3 space-y-2.5">
                <span className="font-semibold text-slate-300 block">Estabilizador de Trazo</span>
                <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={stabilizerConfig.enabled}
                    onChange={(e) => updateStabilizerConfig({ enabled: e.target.checked })}
                    className="rounded text-blue-600 focus:ring-0"
                  />
                  <span>Habilitar estabilización de trazo en tiempo real</span>
                </label>

                <div className="flex justify-between text-slate-300">
                  <span>Inercia / Suavizado de masa</span>
                  <span className="font-mono text-blue-400">{Math.round(stabilizerConfig.inertia * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="0.8"
                  step="0.05"
                  value={stabilizerConfig.inertia}
                  onChange={(e) => updateStabilizerConfig({ inertia: parseFloat(e.target.value) })}
                  className="w-full accent-blue-500"
                />

                <label className="flex items-center gap-2 cursor-pointer text-slate-300 pt-1">
                  <input
                    type="checkbox"
                    checked={stabilizerConfig.cuspDetection}
                    onChange={(e) => updateStabilizerConfig({ cuspDetection: e.target.checked })}
                    className="rounded text-blue-600 focus:ring-0"
                  />
                  <span>Detección de cúspides (preservar esquinas nítidas)</span>
                </label>
              </div>
            </div>
          )}

          {activeTab === 'snapping' && (
            <div className="space-y-3.5">
              <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                <input
                  type="checkbox"
                  checked={preferences.gridSnapping}
                  onChange={(e) => updatePreferences({ gridSnapping: e.target.checked })}
                  className="rounded text-blue-600 focus:ring-0"
                />
                <span>Imantar trazos a la cuadrícula (Grid Snapping)</span>
              </label>

              <div>
                <label className="block text-slate-300 mb-1">Tamaño de celda para imantación</label>
                <select
                  value={preferences.gridSnapSize}
                  onChange={(e) => updatePreferences({ gridSnapSize: parseInt(e.target.value, 10) })}
                  className="w-full bg-slate-800 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
                >
                  <option value={10}>10 px (Fino)</option>
                  <option value={20}>20 px (Medio — 5mm estándar)</option>
                  <option value={30}>30 px (Grande)</option>
                </select>
              </div>

              <label className="flex items-center gap-2 cursor-pointer text-slate-300 pt-2 border-t border-slate-800">
                <input
                  type="checkbox"
                  checked={preferences.rotationSnapping}
                  onChange={(e) => updatePreferences({ rotationSnapping: e.target.checked })}
                  className="rounded text-blue-600 focus:ring-0"
                />
                <span>Imantar rotación a múltiplos de 15° y 45°</span>
              </label>
            </div>
          )}

          {activeTab === 'interface' && (
            <div className="space-y-3.5">
              <div>
                <label className="block text-slate-300 mb-1">Tema de Interfaz</label>
                <select
                  value={preferences.theme}
                  onChange={(e) => updatePreferences({ theme: e.target.value as any })}
                  className="w-full bg-slate-800 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
                >
                  <option value="dark">Modo Oscuro (Predeterminado)</option>
                  <option value="light">Modo Claro</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Intervalo de Autoguardado en Caché Local</label>
                <select
                  value={preferences.autosaveIntervalMinutes}
                  onChange={(e) => updatePreferences({ autosaveIntervalMinutes: parseInt(e.target.value, 10) })}
                  className="w-full bg-slate-800 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
                >
                  <option value={1}>Cada 1 minuto</option>
                  <option value={3}>Cada 3 minutos (Recomendado)</option>
                  <option value={5}>Cada 5 minutos</option>
                  <option value={0}>Desactivado</option>
                </select>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end pt-3 border-t border-slate-800">
          <button
            onClick={togglePreferences}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded font-medium text-xs shadow"
          >
            Listo
          </button>
        </div>
      </div>
    </div>
  );
};

