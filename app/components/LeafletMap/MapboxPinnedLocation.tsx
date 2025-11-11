"use client";

import { Copy } from 'lucide-react';
import { latLngToMGRS } from '@/app/utils/mapUtils';

interface MapboxPinnedLocationProps {
  clickedPin: { lng: number; lat: number } | null;
  onClose: () => void;
  copySuccess: boolean;
  onCopy: () => void;
}

export default function MapboxPinnedLocation({
  clickedPin,
  onClose,
  copySuccess,
  onCopy,
}: MapboxPinnedLocationProps) {
  if (!clickedPin) return null;

  return (
    <div className="absolute bottom-3 left-3 z-[1000] rounded-xl bg-zinc-800/95 backdrop-blur-md shadow-lg overflow-hidden">
      
      <div className="px-3 py-2 space-y-1.5">
        
        {/* MGRS Label */}
        <div className="text-zinc-400 text-[9px] font-medium tracking-wide">
          MGRS
        </div>

        {/* MGRS Value */}
        <div className="text-amber-400 font-mono text-sm font-bold tracking-wide">
          {latLngToMGRS(clickedPin.lat, clickedPin.lng, 5)}
        </div>

        {/* Lat/Lng */}
        <div className="text-zinc-400 text-[10px] font-mono">
          Lat {clickedPin.lat.toFixed(6)}, Lng {clickedPin.lng.toFixed(6)}
        </div>

        {/* Copy Icon */}
        <div className="flex justify-center pt-0.5">
          <button
            onClick={onCopy}
            className="text-zinc-500 hover:text-zinc-300 transition-colors p-0.5"
            title="Copy coordinates"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
