'use client';

import { useEffect, useState } from 'react';
import { Drone, Shield, Swords, HelpCircle, MapPin } from 'lucide-react';
import { subscribeDrones, subscribeDronesApi } from '@/app/libs/MapData';

interface DroneStats {
  total: number;
  friend: number;
  hostile: number;
  unknown: number;
}

interface DroneCounterProps {
  marksCount?: number;
}

export default function DroneCounter({ marksCount = 0 }: DroneCounterProps) {
  const [stats, setStats] = useState<DroneStats>({
    total: 0,
    friend: 0,
    hostile: 0,
    unknown: 0,
  });

  useEffect(() => {
    const useApi = process.env.NEXT_PUBLIC_DATA_SOURCE === 'api';
    const stop = (useApi ? subscribeDronesApi : subscribeDrones)((list) => {
      if (Array.isArray(list)) {
        const friend = list.filter((d: any) => d.status === 'FRIEND').length;
        const hostile = list.filter((d: any) => d.status === 'HOSTILE').length;
        const unknown = list.filter((d: any) => d.status === 'UNKNOWN').length;
        
        setStats({
          total: list.length,
          friend,
          hostile,
          unknown,
        });
      }
    });
    return stop;
  }, []);

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000]">
      <div className="flex items-center gap-3 rounded-xl px-4 py-2 ui-card">
        {/* Total */}
        <div className="flex items-center gap-2">
          <Drone size={18} className="text-amber-400" />
          <span className="text-white font-semibold text-sm">{stats.total}</span>
        </div>

        <div className="h-5 w-px bg-zinc-700" />

        {/* Friend */}
        <div className="flex items-center gap-1.5">
          <Shield size={16} className="text-green-400" />
          <span className="text-green-400 font-semibold text-sm">{stats.friend}</span>
        </div>

        {/* Hostile */}
        <div className="flex items-center gap-1.5">
          <Swords size={16} className="text-red-400" />
          <span className="text-red-400 font-semibold text-sm">{stats.hostile}</span>
        </div>

        {/* Unknown */}
        <div className="flex items-center gap-1.5">
          <HelpCircle size={16} className="text-zinc-400" />
          <span className="text-zinc-400 font-semibold text-sm">{stats.unknown}</span>
        </div>

        <div className="h-5 w-px bg-zinc-700" />

        {/* Marks */}
        <div className="flex items-center gap-1.5">
          <MapPin size={16} className="text-blue-400" />
          <span className="text-blue-400 font-semibold text-sm">{marksCount}</span>
        </div>
      </div>
    </div>
  );
}
