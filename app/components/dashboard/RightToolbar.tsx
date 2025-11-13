'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Home, Layers, Camera, Bell, Settings, User, Plus, Minus, Joystick, Mountain, Shield, Columns
} from "lucide-react";

function ToolbarButton({
  icon: Icon, label, onClick,
}: { icon: any; label: string; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className="mb-1 md:mb-2 grid h-10 w-10 md:h-12 md:w-12 place-items-center rounded-xl
                 hover:bg-zinc-800/80 active:scale-[.98] transition"
    >
      <Icon className="h-4 w-4 md:h-5 md:w-5 opacity-90" />
    </button>
  );
}

function ToolbarDivider() {
  return <div className="my-1 h-px bg-zinc-700/60" />;
}

// ✅ เพิ่ม prop
export default function RightToolbar({
  onHomeClick,
  onDataClick,
  onCameraClick,
  onProtectClick,
  onNotifClick,
  onSplitScreenClick,
  onZoomIn,
  onZoomOut,
  onSettingsClick,
  on3DToggle,
}: { onHomeClick?: () => void
      onDataClick?: () => void
      onCameraClick?: () => void
      onProtectClick?: () => void
      onNotifClick?: () => void
      onSplitScreenClick?: () => void
      onSettingsClick?: () => void
      onZoomIn?: () => void
      onZoomOut?: () => void
      on3DToggle?: () => void
    }) {
  // ✅ ถ้า parent ไม่ได้ส่ง callback มา ให้ยิง window event bridge แทน
  const doZoomIn = () => {
    if (onZoomIn) return onZoomIn();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('app:mapZoom', { detail: { dir: 1 } }));
    }
  };
  const doZoomOut = () => {
    if (onZoomOut) return onZoomOut();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('app:mapZoom', { detail: { dir: -1 } }));
    }
  };

  // ✅ สถานะซูมเพื่อใช้วาดตัวเลื่อน (slider)
  const [zoomInfo, setZoomInfo] = useState<{ level: number; min: number; max: number }>({ level: 12, min: 0, max: 20 });
  const trackRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startY: number; startRatio: number } | null>(null);

  // ✅ ฟังค่า zoom ปัจจุบันจากแผนที่
  useEffect(() => {
    const handler = (e: any) => {
      const { level, min, max } = e.detail || {};
      if (typeof level === 'number' && typeof min === 'number' && typeof max === 'number') {
        setZoomInfo({ level, min, max });
      }
    };
    window.addEventListener('app:zoomChanged', handler as EventListener);
    return () => window.removeEventListener('app:zoomChanged', handler as EventListener);
  }, []);

  // ✅ คำนวณตำแหน่งหัวเลื่อนจากระดับซูม (บน=ซูมมาก, ล่าง=ซูมน้อย)
  const range = Math.max(1, zoomInfo.max - zoomInfo.min);
  const ratio = Math.min(1, Math.max(0, (zoomInfo.max - zoomInfo.level) / range)); // 0..1

  const setZoomByRatio = (r: number) => {
    const clamped = Math.min(1, Math.max(0, r));
    const level = zoomInfo.max - clamped * range;
    window.dispatchEvent(new CustomEvent('app:setZoom', { detail: { level } }));
  };

  const onTrackPointerDown = (e: React.PointerEvent) => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect) return;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    const pos = (e.clientY - rect.top) / rect.height; // 0..1
    setZoomByRatio(pos);
    dragRef.current = { startY: e.clientY, startRatio: pos };
    window.addEventListener('pointermove', onTrackPointerMove as any);
    window.addEventListener('pointerup', onTrackPointerUp as any, { once: true });
  };
  const onTrackPointerMove = (e: PointerEvent) => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect) return;
    const pos = (e.clientY - rect.top) / rect.height;
    setZoomByRatio(pos);
  };
  const onTrackPointerUp = () => {
    window.removeEventListener('pointermove', onTrackPointerMove as any);
  };
  return (
    <div id="right-toolbar" className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 z-[1000]">
      <div className="flex flex-col items-center gap-2 md:gap-3">
        <div className="rounded-2xl p-2 ui-card">
          {/* เรียกใช้ onHomeClick ตรงปุ่ม Home */}
          <ToolbarButton icon={Home} label="Home" onClick={onHomeClick} />
          <ToolbarButton icon={Layers} label="Layers" onClick={onDataClick} />
          <ToolbarButton icon={Camera} label="Camera Feed" onClick={onCameraClick} />
          {/* ✅ เมื่อกด Bell ให้เปิด/ปิด Sidebar Notification */}
          <ToolbarButton icon={Bell}   label="Alerts" onClick={onNotifClick} />
          <ToolbarButton icon={Shield}   label="Protection" onClick={onProtectClick}/>
          <ToolbarDivider />
          <ToolbarButton icon={Columns} label="Split Screen" onClick={onSplitScreenClick} />
          <ToolbarButton icon={Mountain} label="3D Terrain" onClick={on3DToggle} />
          <ToolbarDivider />
          <ToolbarButton icon={Joystick} label="Locate" />
          {/* <ToolbarButton icon={Settings} label="Settings" onClick={onSettingsClick} /> */}
          <ToolbarDivider />
          <div className="flex flex-col items-center">
            {/* ✅ ปุ่มซูมแผนที่: เรียก callback จาก parent */}
            <ToolbarButton icon={Plus}  label="Zoom in" onClick={doZoomIn} />
            {/* ✅ แถบเลื่อนซูม: ลากหรือคลิกเพื่อกำหนดระดับซูม */}
            <div
              ref={trackRef}
              onPointerDown={onTrackPointerDown}
              className="my-2 h-28 w-2 rounded-full bg-zinc-700/70 relative cursor-pointer select-none"
              aria-label="Zoom slider"
              role="slider"
              aria-valuemin={zoomInfo.min}
              aria-valuemax={zoomInfo.max}
              aria-valuenow={zoomInfo.level}
            >
              {/* thumb */}
              <div
                className="absolute left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-amber-400 shadow"
                style={{ top: `calc(${ratio * 100}% - 6px)` }}
              />
            </div>
            <ToolbarButton icon={Minus} label="Zoom out" onClick={doZoomOut} />
          </div>
        </div>

        <div className="rounded-2xl p-2 ui-card">
          <ToolbarButton icon={Settings} label="Settings" onClick={onSettingsClick} />
          <ToolbarButton icon={User}     label="Account" />
        </div>
      </div>
    </div>
  );
}
