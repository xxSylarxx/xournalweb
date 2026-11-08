import React, { useState } from 'react';
import {
  Eye,
  EyeOff,
  Plus,
  Trash2,
  Edit2,
  Check,
  Layers,
  X,
  Copy,
  ChevronUp,
  ChevronDown,
  RotateCcw,
  ArrowDownToLine,
  MoveRight,
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

export const LayersPanel: React.FC = () => {
  const isLayersPanelOpen = useAppStore((state) => state.isLayersPanelOpen);
  const toggleLayersPanel = useAppStore((state) => state.toggleLayersPanel);

  const document = useAppStore((state) => state.document);
  const activePageIndex = useAppStore((state) => state.activePageIndex);
  const activeLayerIndex = useAppStore((state) => state.activeLayerIndex);
  const selectedStrokeIds = useAppStore((state) => state.selectedStrokeIds);
  const setActiveLayer = useAppStore((state) => state.setActiveLayer);
  const addNewLayer = useAppStore((state) => state.addNewLayer);
  const deleteLayer = useAppStore((state) => state.deleteLayer);
  const toggleLayerVisibility = useAppStore((state) => state.toggleLayerVisibility);
  const renameLayer = useAppStore((state) => state.renameLayer);
  const duplicateLayer = useAppStore((state) => state.duplicateLayer);
  const moveLayer = useAppStore((state) => state.moveLayer);
  const clearLayer = useAppStore((state) => state.clearLayer);
  const mergeLayerDown = useAppStore((state) => state.mergeLayerDown);
  const moveSelectionToLayer = useAppStore((state) => state.moveSelectionToLayer);

  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingName, setEditingName] = useState('');

  if (!isLayersPanelOpen) return null;

  const currentPage = document.pages[activePageIndex];
  if (!currentPage) return null;

  const handleStartRename = (index: number, currentName: string) => {
    setEditingIndex(index);
    setEditingName(currentName);
  };

  const handleSaveRename = (index: number) => {
    if (editingName.trim()) {
      renameLayer(index, editingName.trim());
    }
    setEditingIndex(null);
  };

  return (
    <aside className="absolute right-3 top-16 w-72 bg-slate-900/95 backdrop-blur border border-slate-700/80 rounded-xl shadow-2xl p-3 z-40 select-none animate-fadeIn text-slate-100 flex flex-col gap-2.5">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-blue-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
            Capas ({currentPage.layers.length})
          </span>
        </div>
        <button
          onClick={toggleLayersPanel}
          className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-all"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Layers list */}
      <div className="flex flex-col gap-1.5 max-h-72 overflow-y-auto pr-1">
        {currentPage.layers.map((layer, index) => {
          const isActive = index === activeLayerIndex;
          const strokeCount = layer.strokes.length;
          const textCount = layer.texts?.length || 0;

          return (
            <div
              key={layer.id}
              onClick={() => setActiveLayer(index)}
              className={`flex items-center justify-between p-2 rounded-lg cursor-pointer border transition-all text-xs ${
                isActive
                  ? 'bg-blue-600/20 border-blue-500/80 text-white font-medium shadow-sm'
                  : 'bg-slate-800/40 border-slate-800 text-slate-300 hover:bg-slate-800'
              }`}
            >
              {/* Visibility toggle */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleLayerVisibility(index);
                }}
                title={layer.visible ? 'Ocultar capa' : 'Mostrar capa'}
                className="p-1 hover:bg-slate-700/60 rounded text-slate-400 hover:text-white mr-1.5 shrink-0"
              >
                {layer.visible ? (
                  <Eye className="w-4 h-4 text-blue-400" />
                ) : (
                  <EyeOff className="w-4 h-4 text-slate-500" />
                )}
              </button>

              {/* Layer name or edit input */}
              <div className="flex-1 min-w-0 pr-1">
                {editingIndex === index ? (
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSaveRename(index)}
                      autoFocus
                      className="bg-slate-950 border border-blue-500 rounded px-1.5 py-0.5 text-xs text-white w-28 focus:outline-none"
                    />
                    <button onClick={() => handleSaveRename(index)} className="p-0.5 hover:text-green-400">
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="truncate font-medium">{layer.name}</div>
                    <div className="text-[10px] text-slate-400">
                      {strokeCount} trazos {textCount > 0 && `• ${textCount} textos`}
                    </div>
                  </div>
                )}
              </div>

              {/* Action icons: Move up, down, duplicate, clear, rename, delete */}
              <div className="flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                {index > 0 && (
                  <button
                    onClick={() => moveLayer(index, index - 1)}
                    title="Mover arriba"
                    className="p-1 hover:bg-slate-700/60 rounded text-slate-400 hover:text-slate-200"
                  >
                    <ChevronUp className="w-3.5 h-3.5" />
                  </button>
                )}
                {index < currentPage.layers.length - 1 && (
                  <button
                    onClick={() => moveLayer(index, index + 1)}
                    title="Mover abajo"
                    className="p-1 hover:bg-slate-700/60 rounded text-slate-400 hover:text-slate-200"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                )}

                <button
                  onClick={() => duplicateLayer(index)}
                  title="Duplicar capa"
                  className="p-1 hover:bg-slate-700/60 rounded text-slate-400 hover:text-slate-200"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>

                {index > 0 && (
                  <button
                    onClick={() => mergeLayerDown(index)}
                    title="Fusionar con la capa inferior"
                    className="p-1 hover:bg-slate-700/60 rounded text-slate-400 hover:text-blue-300"
                  >
                    <ArrowDownToLine className="w-3.5 h-3.5" />
                  </button>
                )}

                {selectedStrokeIds.length > 0 && index !== activeLayerIndex && (
                  <button
                    onClick={() => moveSelectionToLayer(index)}
                    title="Mover selección a esta capa"
                    className="p-1 bg-blue-600/30 hover:bg-blue-600/60 rounded text-blue-300 hover:text-white"
                  >
                    <MoveRight className="w-3.5 h-3.5" />
                  </button>
                )}

                {strokeCount > 0 && (
                  <button
                    onClick={() => clearLayer(index)}
                    title="Limpiar capa (borrar contenido)"
                    className="p-1 hover:bg-slate-700/60 rounded text-slate-400 hover:text-amber-400"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                )}

                {editingIndex !== index && (
                  <button
                    onClick={() => handleStartRename(index, layer.name)}
                    title="Renombrar capa"
                    className="p-1 hover:bg-slate-700/60 rounded text-slate-400 hover:text-slate-200"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                )}

                {currentPage.layers.length > 1 && (
                  <button
                    onClick={() => deleteLayer(index)}
                    title="Eliminar capa"
                    className="p-1 hover:bg-red-500/20 rounded text-slate-400 hover:text-red-400"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Layer button */}
      <button
        onClick={addNewLayer}
        className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium transition-all shadow-sm"
      >
        <Plus className="w-4 h-4" />
        <span>Añadir Nueva Capa</span>
      </button>
    </aside>
  );
};
