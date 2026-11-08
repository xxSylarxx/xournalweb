import React from 'react';
import { useAppStore } from '../store/useAppStore';

const PEN_PRESETS = [
  { label: 'Muy Fino', width: 0.8, size: 2 },
  { label: 'Fino', width: 1.5, size: 4 },
  { label: 'Medio', width: 2.5, size: 6 },
  { label: 'Grueso', width: 4.0, size: 8 },
  { label: 'Muy Grueso', width: 6.5, size: 10 },
];

const HIGHLIGHTER_PRESETS = [
  { label: 'Fino', width: 8.0, size: 5 },
  { label: 'Medio', width: 14.0, size: 8 },
  { label: 'Grueso', width: 22.0, size: 12 },
];

const ERASER_PRESETS = [
  { label: 'Fino', width: 10.0, size: 6 },
  { label: 'Medio', width: 18.0, size: 10 },
  { label: 'Grueso', width: 30.0, size: 14 },
];

export const StrokeWidthPicker: React.FC = () => {
  const activeTool = useAppStore((state) => state.activeTool);
  const penSettings = useAppStore((state) => state.penSettings);
  const highlighterSettings = useAppStore((state) => state.highlighterSettings);
  const eraserWidth = useAppStore((state) => state.eraserWidth);
  const setWidth = useAppStore((state) => state.setWidth);

  let presets = PEN_PRESETS;
  let currentWidth = penSettings.width;

  if (activeTool === 'highlighter') {
    presets = HIGHLIGHTER_PRESETS;
    currentWidth = highlighterSettings.width;
  } else if (activeTool === 'eraser') {
    presets = ERASER_PRESETS;
    currentWidth = eraserWidth;
  } else if (activeTool !== 'pen') {
    return null;
  }

  return (
    <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-800/80 rounded-md border border-slate-700/60 shadow-inner">
      {presets.map((preset) => {
        const isSelected = Math.abs(currentWidth - preset.width) < 0.2;
        return (
          <button
            key={preset.width}
            onClick={() => setWidth(preset.width)}
            title={`${preset.label} (${preset.width}px)`}
            className={`w-7 h-7 rounded flex items-center justify-center transition-all ${
              isSelected
                ? 'bg-blue-600/40 text-blue-400 border border-blue-500/50'
                : 'hover:bg-slate-700/60 text-slate-400 hover:text-slate-200'
            }`}
          >
            <span
              className="rounded-full bg-current"
              style={{
                width: `${preset.size}px`,
                height: `${preset.size}px`,
              }}
            />
          </button>
        );
      })}
    </div>
  );
};

