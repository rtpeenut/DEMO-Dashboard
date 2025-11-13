'use client';

import { useEffect, useRef, useState } from "react";
import { Drone, Search, Layers } from "lucide-react";
import { subscribeDrones, subscribeDronesApi } from "@/app/libs/MapData";


interface DroneData {
  id: string;
  callsign: string;
  type: string;
  status: string;
  mgrs?: string;
  speedKt: number;
  altitudeFt: number;
  lastUpdate?: string;
  imageUrl?: string;
}

interface DataBarProps {
  onClose?: () => void;
  onSelectDrone?: (drone: { id: string; name: string } | null) => void;
}

export default function DataBar({ onClose, onSelectDrone }: DataBarProps) {
  const [toolbarHeight, setToolbarHeight] = useState<number>(0);
  const [drones, setDrones] = useState<DroneData[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // ✅ จัดการความสูงของแถบด้านขวา
    const toolbar = document.querySelector("#right-toolbar");
    if (toolbar) {
      const { height } = toolbar.getBoundingClientRect();
      setToolbarHeight(height);
    }

    // ✅ เลือกแหล่งข้อมูลจาก env: NEXT_PUBLIC_DATA_SOURCE = 'api' | 'ws'
    const useApi = process.env.NEXT_PUBLIC_DATA_SOURCE === "api";
    const stop = (useApi ? subscribeDronesApi : subscribeDrones)((list) => {
      if (Array.isArray(list)) {
        setDrones(list as unknown as DroneData[]);
      } else {
        // กันเคสข้อมูลผิดรูปแบบ
        setDrones([]);
        console.warn("Invalid drones data:", list);
      }
    });

    return stop; // cleanup: ปิด subscription เมื่อ unmount
  }, []);

  return (
    <aside
      ref={ref}
      style={{
        height: toolbarHeight ? `${toolbarHeight}px` : "auto",
        top: "50%",
        transform: "translateY(-50%)",
        right: "88px",
      }}
      className="absolute right-4 md:right-[88px] z-[1100] w-full md:w-[395px] max-w-[calc(100vw-2rem)] md:max-w-[90vw]
                 rounded-2xl p-3 text-white transition-all flex flex-col font-prompt ui-card ui-slide-from-toolbar"
    >
      {/* Header */}
      <div className="mb-2 flex items-center justify-between rounded-xl px-4 py-2 text-amber-400 font-bold tracking-wider ui-header">
        <span className="flex items-center gap-2"><Layers size={16} /> DATA</span>
        {onClose && (
          <button
            onClick={onClose}
            className="rounded-md text-zinc-300 hover:text-amber-400"
            aria-label="Close"
          >
            ✕
          </button>
        )}
      </div>

      {/* Subheader */}
      <div className="mb-3 rounded-xl bg-zinc-800 px-4 py-2 text-zinc-300 font-sans">
        DETECTION DETAILS
      </div>

      {/* Search box */}
      <div className="flex items-center rounded-xl bg-zinc-800 px-3 py-2 mb-3 border border-zinc-700">
        <input
          type="text"
          placeholder="Search Drone ID..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 bg-transparent outline-none text-sm text-white placeholder-zinc-500"
        />
        <Search size={18} className="opacity-70" />
      </div>

      {/* Drone List */}
      <div className="space-y-3 overflow-y-auto flex-1">
        {drones
          .filter((d) => 
            searchQuery === "" || 
            d.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
            d.callsign.toLowerCase().includes(searchQuery.toLowerCase())
          )
          .map((d) => (
            <button
              key={d.id}
              onClick={() => {
                console.log('Clicked drone:', d.id, d.callsign);
                onSelectDrone?.({ id: d.id, name: d.callsign });
              }}
              className="w-full rounded-xl bg-zinc-800/80 border border-zinc-700 p-4 flex items-center justify-between hover:border-amber-400 hover:bg-zinc-800 transition cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-900/80">
                  <Drone size={34} />
                </div>
                <div className="text-left">
                  <div className="text-amber-400 font-extrabold">{d.callsign}</div>
                  <div className="text-sm text-zinc-300">• {d.type}</div>
                  <div className="text-xs text-zinc-500 mt-1">ID : {d.id}</div>
                  <div className="text-xs text-zinc-400 mt-1">MGRS : {d.mgrs || '-'}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-zinc-400">STATUS</div>
                <div
                  className={`font-semibold ${
                    d.status === "HOSTILE" ? "text-red-400" : 
                    d.status === "FRIEND" ? "text-green-400" : 
                    "text-zinc-300"
                  }`}
                >
                  • {d.status}
                </div>
                <div className="text-xs text-zinc-400 mt-1">SPEED</div>
                <div className="text-zinc-100 font-medium">{d.speedKt.toFixed(2)} kt</div>
              </div>
            </button>
          ))}
      </div>

    </aside>
  );
}
