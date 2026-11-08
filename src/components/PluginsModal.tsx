import React, { useState } from 'react';
import { X, Puzzle, Play, CheckCircle } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { BUILTIN_PLUGINS, XournalPlugin, XournalPluginContext } from '../engine/plugins';

export const PluginsModal: React.FC = () => {
  const isPluginsModalOpen = useAppStore((state) => state.isPluginsModalOpen);
  const togglePluginsModal = useAppStore((state) => state.togglePluginsModal);

  const document = useAppStore((state) => state.document);
  const activePageIndex = useAppStore((state) => state.activePageIndex);
  const activeLayerIndex = useAppStore((state) => state.activeLayerIndex);
  const setColor = useAppStore((state) => state.setColor);
  const addStroke = useAppStore((state) => state.addStroke);
  const addTextElement = useAppStore((state) => state.addTextElement);
  const deleteSelectedStrokes = useAppStore((state) => state.deleteSelectedStrokes);
  const clearActivePage = useAppStore((state) => state.clearActivePage);
  const addNewPage = useAppStore((state) => state.addNewPage);

  const [plugins, setPlugins] = useState<XournalPlugin[]>(BUILTIN_PLUGINS);
  const [lastExecutedId, setLastExecutedId] = useState<string | null>(null);

  if (!isPluginsModalOpen) return null;

  const handleRunPlugin = async (plugin: XournalPlugin) => {
    const ctx: XournalPluginContext = {
      document,
      activePageIndex,
      activeLayerIndex,
      setColor,
      addStroke,
      addTextElement,
      deleteSelectedStrokes,
      clearActivePage,
      addNewPage,
    };

    try {
      await plugin.execute(ctx);
      setLastExecutedId(plugin.id);
      setTimeout(() => setLastExecutedId(null), 2500);
    } catch (err: any) {
      alert(`Error al ejecutar plugin: ${err.message}`);
    }
  };

  const togglePluginEnabled = (id: string) => {
    setPlugins((prev) =>
      prev.map((p) => (p.id === id ? { ...p, enabled: !p.enabled } : p))
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden text-slate-100 p-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Puzzle className="w-5 h-5 text-amber-400" />
            <h3 className="font-semibold text-sm">Gestor de Plugins (API JavaScript)</h3>
          </div>
          <button
            onClick={togglePluginsModal}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="py-4 space-y-3 max-h-96 overflow-y-auto">
          {plugins.map((plugin) => {
            const wasRun = lastExecutedId === plugin.id;
            return (
              <div
                key={plugin.id}
                className="flex items-start justify-between p-3 rounded-lg border bg-slate-800/40 border-slate-800 hover:border-slate-700 transition-all"
              >
                <div className="flex-1 pr-3">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs text-white">{plugin.name}</span>
                    <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-400 font-mono">v{plugin.version}</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{plugin.description}</p>
                  <span className="text-[10px] text-slate-500 mt-0.5 block">Por {plugin.author}</span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={plugin.enabled}
                      onChange={() => togglePluginEnabled(plugin.id)}
                      className="sr-only peer"
                    />
                    <div className="w-8 h-4 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3.5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>

                  <button
                    onClick={() => handleRunPlugin(plugin)}
                    disabled={!plugin.enabled}
                    title="Ejecutar plugin ahora"
                    className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold shadow transition-all ${
                      wasRun
                        ? 'bg-green-600 text-white'
                        : 'bg-amber-600 hover:bg-amber-500 text-white disabled:opacity-30 disabled:pointer-events-none'
                    }`}
                  >
                    {wasRun ? <CheckCircle className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-white" />}
                    <span>{wasRun ? 'Ejecutado' : 'Ejecutar'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-slate-800 text-xs text-slate-400">
          <span>Soporte nativo para plugins reactivos sin recargar.</span>
          <button
            onClick={togglePluginsModal}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded font-medium"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

