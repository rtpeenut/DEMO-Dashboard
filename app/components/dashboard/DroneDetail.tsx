'use client';
import { useEffect, useState } from 'react';
import { Route, Plus } from "lucide-react";
import { subscribeDrones } from "@/server/mockDatabase"; // ✅ ใช้ WebSocket ติดตามสถานะโดรนแบบเรียลไทม์

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
  };
  onClose?: () => void;
  onFollow?: (drone: any, isFollowing: boolean) => void;
  isFollowing?: boolean; // ✅ รับจาก parent
}

export default function DroneDetail({ drone, onClose, onFollow, isFollowing }: DroneDetailProps) {
  const [droneData, setDroneData] = useState(drone);

  useEffect(() => {
    // ✅ เปลี่ยนมาใช้ WebSocket (subscribeDrones) แทน REST
    // เพราะ /api/drones ไม่ได้ส่งข้อมูลเป็นอาเรย์ ทำให้ data.find พัง
    // ตรงนี้เราจะรับลิสต์โดรนจาก WS แล้วเลือกเฉพาะตัวที่ id ตรงกัน
    const stop = subscribeDrones((list) => {
      if (!Array.isArray(list)) return; // กันชนิดผิดพลาดจาก WS
      const updated = list.find((d: any) => d.id === drone.id);
      if (updated) setDroneData(updated);
    });
    return stop; // cleanup: ปิด WS subscription เมื่อ component unmount หรือ id เปลี่ยน
  }, [drone.id]);

  return (
    <div className="absolute top-14 left-4 z-[1200] w-[340px] rounded-2xl bg-zinc-900/95 backdrop-blur border border-zinc-700 shadow-2xl overflow-hidden font-prompt">
      
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

      {/* Info */}
      <div className="px-4 py-3">
        <div className="text-xs text-zinc-400 font-semibold mb-1">INFORMATION</div>
        <div className="bg-zinc-800 rounded-xl border border-zinc-700 p-3 mb-3">
          <div className="text-[13px] text-zinc-400">ID:</div>
          <div className="font-mono text-sm text-zinc-200">{droneData.id}</div>
          <div className="text-[13px] text-zinc-400 mt-2">MGRS:</div>
          <div className="bg-zinc-900 rounded-md px-2 py-1 text-xs text-zinc-300 font-mono">
            {droneData.mgrs || "—"}
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
