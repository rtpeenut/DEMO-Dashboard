'use client';

import { useEffect, useRef, useState } from 'react';
import { Settings, Check, ChevronDown } from 'lucide-react';

interface SettingsSidebarProps {
  onClose?: () => void;
  currentMapStyle?: string;
  onMapStyleChange?: (style: string) => void;
}

// Mapbox map styles
const MAP_STYLES = [
  {
    id: 'satellite-streets-v12',
    name: 'Satellite Streets',
    url: 'mapbox://styles/mapbox/satellite-streets-v12',
    icon: '🛰️',
  },
  {
    id: 'satellite-v9',
    name: 'Satellite',
    url: 'mapbox://styles/mapbox/satellite-v9',
    icon: '🌍',
  },
  {
    id: 'streets-v12',
    name: 'Streets',
    url: 'mapbox://styles/mapbox/streets-v12',
    icon: '🗺️',
  },
  {
    id: 'outdoors-v12',
    name: 'Outdoors',
    url: 'mapbox://styles/mapbox/outdoors-v12',
    icon: '⛰️',
  },
  {
    id: 'dark-v11',
    name: 'Dark',
    url: 'mapbox://styles/mapbox/dark-v11',
    icon: '🌙',
  },
  {
    id: 'light-v11',
    name: 'Light',
    url: 'mapbox://styles/mapbox/light-v11',
    icon: '☀️',
  },
];

export default function SettingsSidebar({ 
  onClose, 
  currentMapStyle = 'satellite-streets-v12',
  onMapStyleChange 
}: SettingsSidebarProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [toolbarHeight, setToolbarHeight] = useState<number>(0);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    const toolbar = document.querySelector('#right-toolbar');
    if (toolbar) {
      const { height } = toolbar.getBoundingClientRect();
      setToolbarHeight(height);
    }
  }, []);

  const handleStyleChange = (styleUrl: string) => {
    onMapStyleChange?.(styleUrl);
    setIsDropdownOpen(false);
  };

  const currentStyle = MAP_STYLES.find(
    s => s.id === currentMapStyle || s.url === currentMapStyle
  ) || MAP_STYLES[0];

  return (
    <aside
      ref={ref}
      style={{
        height: toolbarHeight ? `${toolbarHeight}px` : 'auto',
        top: '50%',
        transform: 'translateY(-50%)',
      }}
      className="absolute right-4 md:right-[88px] z-[1100] w-full md:w-[395px] max-w-[calc(100vw-2rem)] md:max-w-[90vw]
             rounded-2xl p-3 text-white transition-all flex flex-col font-prompt ui-card ui-slide-from-toolbar"
    >
      {/* Header */}
      <div className="mb-2 flex items-center justify-between rounded-xl px-4 py-2 text-amber-400 font-bold tracking-wider ui-header">
        <span className="flex items-center gap-2">
          <Settings size={16} /> SETTINGS
        </span>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="rounded-md text-zinc-300 hover:text-white"
          >
            ✕
          </button>
        )}
      </div>

      {/* Map Style Section */}
      <div className="mb-3 rounded-xl bg-zinc-800 px-4 py-2 text-zinc-300 font-sans text-sm">
        MAP STYLE
      </div>

      {/* Dropdown */}
      <div className="px-2">
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="w-full flex items-center justify-between gap-2 px-4 py-3 rounded-xl
                     bg-zinc-800 border-2 border-zinc-700 text-white
                     hover:border-amber-500 transition-all"
        >
          <div className="flex items-center gap-3">
            <span className="text-xl">{currentStyle.icon}</span>
            <span className="font-semibold text-sm">{currentStyle.name}</span>
          </div>
          <ChevronDown 
            size={18} 
            className={`transition-transform text-zinc-400 ${isDropdownOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {/* Dropdown Menu */}
        {isDropdownOpen && (
          <div className="mt-2 rounded-xl bg-zinc-800 border border-zinc-700 overflow-hidden">
            {MAP_STYLES.map((style) => {
              const isActive = currentMapStyle === style.id || currentMapStyle === style.url;
              
              return (
                <button
                  key={style.id}
                  onClick={() => handleStyleChange(style.url)}
                  className={`w-full flex items-center justify-between px-4 py-3 text-left transition-all
                    ${isActive 
                      ? 'bg-amber-500/20 text-amber-400' 
                      : 'text-white hover:bg-zinc-700'
                    }
                    ${style.id !== MAP_STYLES[MAP_STYLES.length - 1].id ? 'border-b border-zinc-700' : ''}
                  `}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{style.icon}</span>
                    <span className="font-medium text-sm">{style.name}</span>
                  </div>
                  {isActive && (
                    <Check size={16} className="text-amber-400" />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="mt-auto pt-3 text-xs text-zinc-500 text-center">
        Map styles powered by Mapbox
      </div>
    </aside>
  );
}
