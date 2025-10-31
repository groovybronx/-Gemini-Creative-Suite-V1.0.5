import React, { useState, useEffect } from 'react';
import { useTheme } from '../hooks/useTheme';
import { themes } from '../themes';
import type { Theme, ThemeName } from '../types';

const ThemeSelector: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { theme, setThemeName, setCustomTheme } = useTheme();
  const [customColors, setCustomColors] = useState(theme.colors);

  useEffect(() => {
    setCustomColors(theme.colors);
  }, [theme]);

  const handleCustomColorChange = (colorName: keyof Theme['colors'], value: string) => {
    const newColors = { ...customColors, [colorName]: value };
    setCustomColors(newColors);
    setCustomTheme(newColors);
  };

  const colorLabels: Record<keyof Theme['colors'], string> = {
    'base-bg': 'Base Background',
    'component-bg': 'Component Background',
    'border-color': 'Borders',
    'text-primary': 'Primary Text',
    'text-secondary': 'Secondary Text',
    'accent-khaki': 'Khaki Accent',
    'accent-yellow': 'Yellow Accent',
    'accent-orange': 'Orange Accent',
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-component-bg rounded-lg shadow-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-text-primary">Select Theme</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-border-color">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2 text-text-secondary">Predefined Themes</h3>
          <div className="grid grid-cols-3 gap-4">
            {(Object.keys(themes) as (keyof typeof themes)[]).map((key) => (
              <button
                key={key}
                onClick={() => setThemeName(key as ThemeName)}
                className={`p-4 rounded-lg border-2 ${theme.name === themes[key].name ? 'border-accent-yellow' : 'border-border-color'}`}
              >
                {themes[key].name}
              </button>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-2 text-text-secondary">Custom Theme</h3>
          <div className="grid grid-cols-2 gap-4">
            {Object.entries(colorLabels).map(([key, label]) => (
              <div key={key} className="flex flex-col gap-1">
                <label className="text-sm text-text-secondary">{label}</label>
                <div className="relative">
                    <input
                      type="color"
                      value={customColors[key as keyof Theme['colors']]}
                      onChange={(e) => handleCustomColorChange(key as keyof Theme['colors'], e.target.value)}
                      className="w-full h-10 p-1 bg-transparent border-none rounded-md cursor-pointer"
                      style={{'WebkitAppearance': 'none', 'MozAppearance': 'none', 'appearance': 'none'}}
                    />
                    <div className="absolute inset-0 rounded-md pointer-events-none border border-border-color" style={{backgroundColor: customColors[key as keyof Theme['colors']]}}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ThemeSelector;