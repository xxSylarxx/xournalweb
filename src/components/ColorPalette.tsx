import React from 'react';
import { useAppStore } from '../store/useAppStore';

// Default Xournal++ palette colors
const PALETTE_COLORS = [
  '#000000', // Black
  '#333333', // Dark Gray
  '#888888', // Gray
  '#d0d0d0', // Light Gray
  '#ffffff', // White
  '#ef4444', // Red
  '#f97316', // Orange
  '#eab308', // Yellow
  '#22c55e', // Green
  '#06b6d4', // Cyan
  '#3b82f6', // Blue
  '#6366f1', // Indigo
  '#a855f7', // Purple
  '#ec4899', // Magenta
];

export const ColorPalette: React.FC = () => {
  const activeTool = useAppStore((state) => state.activeTool);
  const penSettings = useAppStore((state) => state.penSettings);
  const highlighterSettings = useAppStore((state) => state.highlighterSettings);
  const setColor = useAppStore((state) => state.setColor);

  if (activeTool !== 'pen' && activeTool !== 'highlighter') {
    return null;
  }

  const currentColor = activeTool === 'pen' ? penSettings.color : highlighterSettings.color;

  return (
    <div className="flex items-center gap-1 px-2 py-1 bg-slate-800/80 rounded-md border border-slate-700/60 shadow-inner">
      {PALETTE_COLORS.map((color) => {
        const isSelected = currentColor.toLowerCase() === color.toLowerCase();
        return (
          <button
            key={color}
            onClick={() => setColor(color)}
            title={color}
            className={`w-5 h-5 rounded-full transition-transform duration-100 flex items-center justify-center ${
              isSelected ? 'scale-125 ring-2 ring-blue-400 ring-offset-1 ring-offset-slate-900' : 'hover:scale-110 opacity-90'
            }`}
            style={{
              backgroundColor: color,
              border: color === '#ffffff' ? '1px solid #64748b' : 'none',
            }}
          />
        );
      })}

      {/* Custom HTML color picker */}
      <label className="relative cursor-pointer ml-1 w-5 h-5 rounded-full overflow-hidden border border-slate-600 flex items-center justify-center hover:opacity-80" title="Color personalizado">
        <input
          type="color"
          value={currentColor}
          onChange={(e) => setColor(e.target.value)}
          className="absolute -top-2 -left-2 w-10 h-10 opacity-0 cursor-pointer"
        />
        <span
          className="w-full h-full"
          style={{
            background: 'conic-gradient(red, yellow, lime, aqua, blue, magenta, red)',
          }}
        />
      </label>
    </div>
  );
};

