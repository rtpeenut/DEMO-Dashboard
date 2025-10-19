'use client';

import { useEffect, useRef, useState } from "react";
import { Drone, Search, Layers } from "lucide-react";
import { subscribeDrones } from "@/server/mockDatabase"; // ✅ ใช้ WebSocket สำหรับอัปเดตโดรนแบบเรียลไทม์

interface DroneData {
  id: string;
  callsign: string;
  type: string;
  status: string;
  mgrs?: string; // ✅ อาจไม่มีจาก backend
  speedKt: number;
  altitudeFt: number;
  lastUpdate?: string; // ✅ ทำเป็น optional
  imageUrl?: string; // ✅ ทำเป็น optional
}

export default function DataBar({ onClose }: { onClose?: () => void }) {
  const [toolbarHeight, setToolbarHeight] = useState<number>(0);
  const [drones, setDrones] = useState<DroneData[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // ✅ จัดการความสูงของแถบด้านขวา
    const toolbar = document.querySelector("#right-toolbar");
    if (toolbar) {
      const { height } = toolbar.getBoundingClientRect();
      setToolbarHeight(height);
    }

    // ✅ เปลี่ยนจาก fetch REST มาใช้ WebSocket โดยตรง
    // /api/drones คืนเป็น object ไม่ใช่ array ทำให้ .map พัง
    const stop = subscribeDrones((list) => {
      if (Array.isArray(list)) {
        setDrones(list as unknown as DroneData[]);
      } else {
        // กันเคสข้อมูลผิดรูปแบบ
        setDrones([]);
        console.warn("Invalid drones data from WS:", list);
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
      className="absolute z-[1100] w-[395px] max-w-[90vw]
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
          className="flex-1 bg-transparent outline-none text-sm text-white placeholder-zinc-500"
        />
        <Search size={18} className="opacity-70" />
      </div>

      {/* Drone List */}
      <div className="space-y-3 overflow-y-auto flex-1">
        {drones.map((d) => (
          <div
            key={d.id}
            className="rounded-xl bg-zinc-800/80 border border-zinc-700 p-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-900/80">
                <Drone size={34} />
              </div>
              <div>
                <div className="text-amber-400 font-extrabold">{d.callsign}</div>
                <div className="text-sm text-zinc-300">• {d.type}</div>
                <div className="text-xs text-zinc-500 mt-1">ID : {d.id}</div>
                <div className="text-xs text-zinc-400 mt-1">MGRS : {d.mgrs}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-zinc-400">STATUS</div>
              <div
                className={`font-semibold ${
                  d.status === "HOSTILE" ? "text-red-400" : "text-green-400"
                }`}
              >
                • {d.status}
              </div>
              <div className="text-xs text-zinc-400 mt-1">SPEED</div>
              <div className="text-zinc-100 font-medium">{d.speedKt.toFixed(2)} kt</div>
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}
