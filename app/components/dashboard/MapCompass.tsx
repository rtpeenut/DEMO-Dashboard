'use client';

import { useEffect, useState } from 'react';
import { Navigation } from 'lucide-react';

interface MapCompassProps {
  map: mapboxgl.Map | null;
}

export default function MapCompass({ map }: MapCompassProps) {
  const [bearing, setBearing] = useState(0);

  useEffect(() => {
    if (!map) return;

    const updateBearing = () => {
      const currentBearing = map.getBearing();
      setBearing(currentBearing);
    };

    // Initial bearing
    updateBearing();

    // Update on map rotation
    map.on('rotate', updateBearing);

    return () => {
      map.off('rotate', updateBearing);
    };
  }, [map]);

  return (
    <div className="fixed top-4 left-4 z-[1000]">
      <div className="relative w-24 rounded-xl bg-zinc-900/80 backdrop-blur-xl border border-zinc-700 shadow-2xl ui-card p-2">
        {/* Compass Circle */}
        <div className="relative w-20 h-20 mx-auto rounded-lg bg-zinc-800/60 border border-zinc-700/50">
          {/* Cardinal Directions */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative w-full h-full">
              {/* N */}
              <div className="absolute top-1 left-1/2 -translate-x-1/2 text-[10px] font-bold text-amber-400">
                N
              </div>
              {/* E */}
              <div className="absolute right-1 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-zinc-500">
                E
              </div>
              {/* S */}
              <div className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[10px] font-semibold text-zinc-500">
                S
              </div>
              {/* W */}
              <div className="absolute left-1 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-zinc-500">
                W
              </div>
            </div>
          </div>

          {/* Compass Needle */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              style={{
                transform: `rotate(${-bearing}deg)`,
                transition: 'transform 0.3s ease-out',
              }}
              className="relative"
            >
              <Navigation
                size={20}
                className="text-amber-400 drop-shadow-lg"
                fill="currentColor"
              />
            </div>
          </div>
        </div>

        {/* Bearing Display - Below Compass */}
        <div className="mt-1 flex items-center justify-center">
          <span className="text-xs font-mono font-bold text-amber-400 bg-zinc-800/80 px-2 py-0.5 rounded border border-zinc-700/50">
            {Math.abs(Math.round(bearing))}°
          </span>
        </div>
      </div>
    </div>
  );
}
