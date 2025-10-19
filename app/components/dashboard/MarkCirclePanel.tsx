'use client';
import { useState } from "react";

interface MarkCirclePanelProps {
  position: [number, number];
  onConfirm: (data: { name: string; radius: number; color: string; pos: [number, number] }) => void;
  onCancel: () => void;
}


export default function MarkCirclePanel({ position, onConfirm, onCancel }: MarkCirclePanelProps) {
  const [radius, setRadius] = useState(500);
  const [name, setName] = useState("");
  const [color, setColor] = useState("#ffffff");

  const colorOptions = [
    "#ffffff", // ขาว
    "#f87171", // แดง
    "#facc15", // เหลือง
    "#60a5fa", // ฟ้า
    "#4ade80", // เขียว
  ];

  return (
    <div
      className="absolute top-14 left-4 z-[1200] w-[340px] rounded-2xl bg-zinc-900/95 backdrop-blur
                 border border-zinc-700 shadow-2xl overflow-hidden font-prompt"
    >
      <div className="flex justify-between items-center bg-zinc-800 px-4 py-3">
        <div className="text-amber-400 font-bold text-lg tracking-wide">MARK SETTINGS</div>
        <button onClick={onCancel} className="text-zinc-400 hover:text-white transition">✕</button>
      </div>

      <div className="p-4">
        <div className="text-sm text-zinc-300 mb-2">Latitude: {position[0].toFixed(6)}</div>
        <div className="text-sm text-zinc-300 mb-4">Longitude: {position[1].toFixed(6)}</div>

        {/* 📝 Name input */}
        <label className="text-xs text-zinc-400">Mark Name</label>
        <input
          type="text"
          placeholder="Enter mark name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full mt-1 mb-3 rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
        />

        {/* 🎨 Color picker */}
        <label className="text-xs text-zinc-400">Color</label>
        <div className="flex gap-2 mt-2 mb-4">
          {colorOptions.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={`w-6 h-6 rounded-full border-2 transition ${color === c ? "border-amber-400 scale-110" : "border-zinc-700"
                }`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>

        {/* 📏 Radius */}
        <label className="text-xs text-zinc-400">Radius (meters)</label>
        <input
          type="range"
          min={100}
          max={5000}
          step={100}
          value={radius}
          onChange={(e) => setRadius(Number(e.target.value))}
          className="w-full mt-2"
        />
        <div className="text-center text-amber-400 font-bold mb-3">{radius.toLocaleString()} m</div>

        {/* ✅ Confirm */}
        <button
          onClick={() => {
            const [lat, lng] = position;
            if (Math.abs(lat) > 90 || Math.abs(lng) > 180) {
              alert("พิกัด mark ไม่ถูกต้อง (lat/lng กลับกัน)");
              return;
            }

            // ✅ ส่งค่าออกไปพร้อมข้อมูลครบ
            onConfirm({
              name,
              radius: Number(radius), // หน่วยเมตร
              color,
              pos: [lat, lng], // เก็บเป็น [lat, lng] เสมอ
            });
          }}
          className="rounded-lg bg-amber-500 px-4 py-2 font-semibold text-black"
        >
          Confirm
        </button>
      </div>
    </div>
  );
}
