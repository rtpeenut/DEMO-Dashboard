'use client';
import { useEffect, useState, useMemo } from 'react';
import { Route, Plus } from "lucide-react";
import { subscribeDrones, subscribeDronesApi } from "@/app/libs/MapData"; // ✅ ใช้ WebSocket/REST ตามการตั้งค่า
import { latLngToMGRS } from "@/app/utils/mapUtils";

interface DroneDetailProps {
  drone: {
    id: string;
    callsign: string;
    type: string;
    speedKt: number;
    altitudeFt: number;
    headingDeg: number;
    lastUpdate?: string;
    mgrs?: string;
    position?: [number, number];
    imageUrl?: string;
    idCamera?: string; // ✅ รอรับจาก API
    size?: string; // ✅ รอรับจาก API
  };
  onClose?: () => void;
  onFollow?: (drone: any, isFollowing: boolean) => void;
  isFollowing?: boolean; // ✅ รับจาก parent
}

export default function DroneDetail({ drone, onClose, onFollow, isFollowing }: DroneDetailProps) {
  const [droneData, setDroneData] = useState(drone);

  useEffect(() => {
    // ✅ เลือกแหล่งข้อมูลจาก env: NEXT_PUBLIC_DATA_SOURCE = 'api' | 'ws'
    const useApi = process.env.NEXT_PUBLIC_DATA_SOURCE === "api";
    const stop = (useApi ? subscribeDronesApi : subscribeDrones)((list) => {
      if (!Array.isArray(list)) return; // กันชนิดผิดพลาดจาก WS
      const updated = list.find((d: any) => d.id === drone.id);
      if (updated) setDroneData(updated);
    });
    return stop; // cleanup
  }, [drone.id]);

  // Calculate MGRS from position
  const mgrsCoordinate = useMemo(() => {
    if (droneData.mgrs) return droneData.mgrs;
    if (droneData.position && droneData.position.length === 2) {
      const [lat, lng] = droneData.position;
      return latLngToMGRS(lat, lng, 5);
    }
    return "—";
  }, [droneData.position, droneData.mgrs]);

  return (
    <div className="absolute top-14 left-4 right-4 md:right-auto z-[1200] w-auto md:w-[340px] rounded-2xl bg-zinc-900/95 backdrop-blur border border-zinc-700 shadow-2xl overflow-hidden font-prompt">
      
      {/* Header */}
      <div className="flex justify-between items-center bg-zinc-800 px-4 py-3">
        <div className="flex items-center gap-2">
          {/* ✅ ใช้ droneData เพื่ออัปเดตแบบเรียลไทม์จาก WebSocket */}
          <div className="text-amber-400 font-bold text-lg tracking-wide">{droneData.callsign}</div>
          <div className="text-zinc-300 text-sm">• {droneData.type}</div>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-zinc-400 hover:text-white transition">
            ✕
          </button>
        )}
      </div>

      {/* Drone Image */}
      <div className="px-4 pt-3">
        <div className="relative w-full h-48 bg-gradient-to-b from-blue-500/20 to-zinc-900 rounded-xl overflow-hidden border border-zinc-700 flex items-center justify-center">
          {droneData.imageUrl ? (
            <img 
              src={droneData.imageUrl} 
              alt={droneData.callsign}
              className="w-full h-full object-contain"
              onError={(e) => {
                // Show NO IMAGE if image fails to load
                const parent = e.currentTarget.parentElement;
                if (parent) {
                  e.currentTarget.style.display = 'none';
                  const noImageDiv = document.createElement('div');
                  noImageDiv.className = 'text-zinc-500 text-sm font-semibold';
                  noImageDiv.textContent = 'NO IMAGE';
                  parent.appendChild(noImageDiv);
                }
              }}
            />
          ) : (
            <div className="text-zinc-500 text-sm font-semibold">NO IMAGE</div>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="px-4 py-3">
        <div className="text-xs text-zinc-400 font-semibold mb-1">INFORMATION</div>
        <div className="bg-zinc-800 rounded-xl border border-zinc-700 p-3 mb-3">
          {/* ID Row - 3 columns */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <div className="text-[13px] text-zinc-400">ID:</div>
              <div className="font-mono text-sm text-zinc-200">{droneData.id}</div>
            </div>
            <div>
              <div className="text-[13px] text-zinc-400">IDCamera:</div>
              <div className="font-mono text-sm text-zinc-200">{droneData.idCamera || "—"}</div>
            </div>
            <div>
              <div className="text-[13px] text-zinc-400">Size:</div>
              <div className="font-mono text-sm text-zinc-200">{droneData.size || "—"}</div>
            </div>
          </div>
          
          <div className="text-[13px] text-zinc-400 mt-3">MGRS:</div>
          <div className="bg-zinc-900 rounded-md px-2 py-1 text-xs text-zinc-300 font-mono">
            {mgrsCoordinate}
          </div>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="bg-zinc-800 rounded-xl border border-zinc-700 py-2">
            <div className="text-xs text-zinc-400">SPEED</div>
            {/* ✅ แสดงทศนิยม 3 ตำแหน่ง */}
            <div className="text-amber-400 font-bold">{(droneData.speedKt ?? 0).toFixed(3)} <span className="text-xs">kt</span></div>
          </div>
          <div className="bg-zinc-800 rounded-xl border border-zinc-700 py-2">
            <div className="text-xs text-zinc-400">HEADING</div>
            <div className="text-amber-400 font-bold">{(droneData.headingDeg ?? 0).toFixed(2)}°</div>
          </div>
          <div className="bg-zinc-800 rounded-xl border border-zinc-700 py-2">
            <div className="text-xs text-zinc-400">ALTITUDE</div>
            {/* ✅ แสดงทศนิยม 3 ตำแหน่ง */}
            <div className="text-amber-400 font-bold">{(droneData.altitudeFt ?? 0).toFixed(3)} <span className="text-xs">ft</span></div>
          </div>
        </div>

        {/* Position */}
        <div className="grid grid-cols-2 gap-3 text-center mt-3">
          <div className="bg-zinc-800 rounded-xl border border-zinc-700 py-2">
            <div className="text-xs text-zinc-400">LATITUDE</div>
            <div className="text-amber-400 font-bold">
              {/* ✅ แสดงทศนิยม 3 ตำแหน่ง และอัปเดตแบบเรียลไทม์ */}
              {droneData.position ? droneData.position[0].toFixed(3) : "—"}
            </div>
          </div>
          <div className="bg-zinc-800 rounded-xl border border-zinc-700 py-2">
            <div className="text-xs text-zinc-400">LONGITUDE</div>
            <div className="text-amber-400 font-bold">
              {/* ✅ แสดงทศนิยม 3 ตำแหน่ง และอัปเดตแบบเรียลไทม์ */}
              {droneData.position ? droneData.position[1].toFixed(3) : "—"}
            </div>
          </div>
        </div>

        {/* Last Update */}
        <div className="bg-zinc-800 border border-zinc-700 mt-3 rounded-xl p-2 text-center">
          <div className="text-xs text-zinc-400">LAST UPDATE</div>
          {/* ✅ แสดงวันเวลาแบบปกติ (locale) ถ้าไม่มีค่า ใช้เวลาปัจจุบันแทน */}
          <div className="text-amber-400 font-bold">
            {new Date(droneData.lastUpdate ?? Date.now()).toLocaleString()}
          </div>
        </div>

        {/* Buttons */}
        <div className="grid grid-cols-2 gap-3 mt-3">
          {/* ROUTE */}
          <button className="flex flex-col items-center justify-center gap-1 rounded-xl bg-zinc-800 border border-zinc-700 py-3 text-sm hover:bg-zinc-700 transition">
            <Route size={18} className="text-white" />
            <span>ROUTE</span>
          </button>

          {/* FOLLOW */}
          <button
            onClick={() => onFollow?.(droneData, !isFollowing)} // ✅ ไม่มี state ซ้ำ
            className={`flex flex-col items-center justify-center gap-1 rounded-xl border py-3 text-sm transition
              ${
                isFollowing
                  ? "bg-amber-500 border-amber-400 text-black"
                  : "bg-zinc-800 border-zinc-700 hover:bg-zinc-700 text-white"
              }`}
          >
            <Plus size={18} />
            <span>{isFollowing ? "FOLLOWING" : "FOLLOW"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
