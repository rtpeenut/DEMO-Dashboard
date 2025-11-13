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
  const [droneIds, setDroneIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // ✅ จัดการความสูงของแถบด้านขวา
    const toolbar = document.querySelector("#right-toolbar");
    if (toolbar) {
      const { height } = toolbar.getBoundingClientRect();
      setToolbarHeight(height);
    }
  }, []);

  // ✅ ดึงรายการ drone IDs จาก database
  useEffect(() => {
    const fetchDroneIds = async () => {
      try {
        setIsLoading(true);
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://82.26.104.180:3000';
        const response = await fetch(`${apiUrl}/api/detection/drone-ids`, {
          cache: 'no-store',
        });
        
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }
        
        const ids: string[] = await response.json();
        console.log('📡 Fetched drone IDs from database:', ids.length);
        setDroneIds(ids);
      } catch (error) {
        console.error('Error fetching drone IDs:', error);
        setDroneIds([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDroneIds();
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
        {isLoading ? (
          <div className="text-center py-8 text-zinc-400 text-sm">
            Loading drone list...
          </div>
        ) : droneIds.length === 0 ? (
          <div className="text-center py-8 text-zinc-400 text-sm">
            No drones found in database
          </div>
        ) : (
          droneIds
            .filter((id) => 
              searchQuery === "" || 
              id.toLowerCase().includes(searchQuery.toLowerCase())
            )
            .map((id) => (
              <button
                key={id}
                onClick={() => {
                  console.log('Clicked drone:', id);
                  onSelectDrone?.({ id: id, name: id.toUpperCase() });
                }}
                className="w-full rounded-xl bg-zinc-800/80 border border-zinc-700 p-4 flex items-center justify-between hover:border-amber-400 hover:bg-zinc-800 transition cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-14 w-14 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-900/80">
                    <Drone size={34} />
                  </div>
                  <div className="text-left">
                    <div className="text-amber-400 font-extrabold">{id.toUpperCase()}</div>
                    <div className="text-sm text-zinc-300">• unknown</div>
                    <div className="text-xs text-zinc-500 mt-1">ID : {id}</div>
                    <div className="text-xs text-zinc-400 mt-1">MGRS : -</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-zinc-400">STATUS</div>
                  <div className="font-semibold text-zinc-300">
                    • UNKNOWN
                  </div>
                  <div className="text-xs text-zinc-400 mt-1">SPEED</div>
                  <div className="text-zinc-100 font-medium">- kt</div>
                </div>
              </button>
            ))
        )}
      </div>

    </aside>
  );
}
