'use client';

import React, { useState } from 'react';
import { Plus, Palette, Check } from 'lucide-react';

export interface ColorOption {
  name: string;
  hex: string;
}

export const PRESET_BABY_COLORS: ColorOption[] = [
  { name: 'Lacivert', hex: '#1e3a8a' },
  { name: 'Bej / Vizon', hex: '#d6c7b2' },
  { name: 'Siyah', hex: '#18181b' },
  { name: 'Pudra Pembe', hex: '#fbcfe8' },
  { name: 'Ekru / Krem', hex: '#fef3c7' },
  { name: 'Bebek Mavisi', hex: '#7dd3fc' },
  { name: 'Lila / Lavanta', hex: '#e9d5ff' },
  { name: 'Haki Yeşil', hex: '#4d7c0f' },
  { name: 'Mint Yeşili', hex: '#a7f3d0' },
  { name: 'Antrasit / Gri', hex: '#4b5563' },
  { name: 'Kırmızı', hex: '#dc2626' },
  { name: 'Kiremit', hex: '#ea580c' },
  { name: 'Hardal Sarısı', hex: '#eab308' },
  { name: 'Beyaz', hex: '#ffffff' },
];

interface Props {
  selectedColors: ColorOption[];
  onChange: (colors: ColorOption[]) => void;
}

export function ColorSwatchPicker({ selectedColors, onChange }: Props) {
  const [customName, setCustomName] = useState('');
  const [customHex, setCustomHex] = useState('#2563eb');
  const [savedCustomColors, setSavedCustomColors] = useState<ColorOption[]>([]);

  // Load custom colors from localStorage on mount
  React.useEffect(() => {
    try {
      const stored = localStorage.getItem('esla_admin_custom_colors');
      if (stored) {
        setSavedCustomColors(JSON.parse(stored));
      }
    } catch (e) {}
  }, []);

  const saveCustomColorsToStorage = (list: ColorOption[]) => {
    setSavedCustomColors(list);
    try {
      localStorage.setItem('esla_admin_custom_colors', JSON.stringify(list));
    } catch (e) {}
  };

  const isSelected = (c: ColorOption) => selectedColors.some((sc) => sc.name === c.name);

  const togglePreset = (c: ColorOption) => {
    if (isSelected(c)) {
      onChange(selectedColors.filter((sc) => sc.name !== c.name));
    } else {
      onChange([...selectedColors, c]);
    }
  };

  const addCustomColor = () => {
    if (!customName.trim()) return;
    const cleanName = customName.trim();
    const newColor = { name: cleanName, hex: customHex };

    // Save to persistent custom colors list
    if (!savedCustomColors.some((c) => c.name.toLowerCase() === cleanName.toLowerCase())) {
      const updated = [...savedCustomColors, newColor];
      saveCustomColorsToStorage(updated);
    }

    if (!selectedColors.some((c) => c.name.toLowerCase() === cleanName.toLowerCase())) {
      onChange([...selectedColors, newColor]);
    }
    setCustomName('');
  };

  const removeColor = (name: string) => {
    onChange(selectedColors.filter((sc) => sc.name !== name));
  };

  const deleteSavedCustomColor = (name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = savedCustomColors.filter((c) => c.name !== name);
    saveCustomColorsToStorage(updated);
    if (isSelected({ name, hex: '' })) {
      removeColor(name);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-slate-700 uppercase flex items-center gap-1.5">
          <Palette className="w-3.5 h-3.5 text-brand-600" />
          <span>Renk Seçimi & Paleti ({selectedColors.length} Renk Seçili)</span>
        </label>
      </div>

      {/* Preset Swatches */}
      <div className="flex flex-wrap gap-2">
        {PRESET_BABY_COLORS.map((preset) => {
          const active = isSelected(preset);
          return (
            <button
              key={preset.name}
              type="button"
              onClick={() => togglePreset(preset)}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                active 
                  ? 'bg-brand-50 text-brand-900 border-brand-400 shadow-sm' 
                  : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
              }`}
            >
              <span 
                className="w-4 h-4 rounded-full border border-black/15 shadow-inner flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: preset.hex }}
              >
                {active && (
                  <Check className={`w-2.5 h-2.5 ${preset.hex === '#ffffff' || preset.hex === '#fef3c7' || preset.hex === '#fbcfe8' ? 'text-black' : 'text-white'}`} />
                )}
              </span>
              <span>{preset.name}</span>
            </button>
          );
        })}

        {/* User Added Persistent Custom Colors */}
        {savedCustomColors.map((custom) => {
          const active = isSelected(custom);
          return (
            <div
              key={custom.name}
              onClick={() => togglePreset(custom)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                active 
                  ? 'bg-brand-50 text-brand-900 border-brand-400 shadow-sm' 
                  : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
              }`}
            >
              <span 
                className="w-4 h-4 rounded-full border border-black/15 shadow-inner flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: custom.hex }}
              >
                {active && (
                  <Check className={`w-2.5 h-2.5 ${custom.hex === '#ffffff' || custom.hex === '#fef3c7' || custom.hex === '#fbcfe8' ? 'text-black' : 'text-white'}`} />
                )}
              </span>
              <span>{custom.name}</span>
              <button
                type="button"
                onClick={(e) => deleteSavedCustomColor(custom.name, e)}
                title="Bu özel rengi hafızadan sil"
                className="ml-1 text-slate-400 hover:text-rose-600 font-bold"
              >
                ×
              </button>
            </div>
          );
        })}
      </div>

      {/* Custom Color Picker with native palette */}
      <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-wrap items-center gap-2">
        <span className="text-xs text-slate-500 font-medium">Özel Renk Ekle:</span>
        <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2 py-1">
          <input
            type="color"
            value={customHex}
            onChange={(e) => setCustomHex(e.target.value)}
            className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent p-0"
            title="Renk Paletinden Renk Seç"
          />
          <span className="text-[11px] font-mono text-slate-500 uppercase">{customHex}</span>
        </div>

        <input
          type="text"
          placeholder="Renk Adı (Örn: Gül Kurusu)"
          value={customName}
          onChange={(e) => setCustomName(e.target.value)}
          className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-brand-500 flex-1 min-w-[140px]"
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomColor(); } }}
        />

        <button
          type="button"
          onClick={addCustomColor}
          className="bg-slate-900 hover:bg-black text-white text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Ekle</span>
        </button>
      </div>

      {/* Selected Colors Preview Bar */}
      {selectedColors.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {selectedColors.map((sc) => (
            <span
              key={sc.name}
              className="inline-flex items-center gap-1.5 bg-white border border-slate-200 text-slate-800 text-xs px-2.5 py-1 rounded-lg shadow-sm"
            >
              <span
                className="w-3.5 h-3.5 rounded-full border border-black/15 shadow-inner"
                style={{ backgroundColor: sc.hex }}
              />
              <span className="font-medium">{sc.name}</span>
              <button
                type="button"
                onClick={() => removeColor(sc.name)}
                className="text-slate-400 hover:text-rose-600 font-bold ml-1 text-sm leading-none"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
