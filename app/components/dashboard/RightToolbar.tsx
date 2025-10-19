'use client';

import {
  Home, Layers, Camera, Bell, Compass, Settings, User, Plus, Minus, Joystick , MapPin
} from "lucide-react";

function ToolbarButton({
  icon: Icon, label, onClick,
}: { icon: any; label: string; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className="mb-2 grid h-12 w-12 place-items-center rounded-xl
                 hover:bg-zinc-800/80 active:scale-[.98] transition"
    >
      <Icon className="h-5 w-5 opacity-90" />
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
  onMarkClick,
}: { onHomeClick?: () => void
      onDataClick?: () => void
      onMarkClick?: () => void
    }) {
  return (
    <div id="right-toolbar" className="absolute right-4 top-1/2 -translate-y-1/2 z-[1000]">
      <div className="flex flex-col items-center gap-3">
        <div className="rounded-2xl bg-zinc-900/90 backdrop-blur border border-zinc-700 p-2">
          {/* เรียกใช้ onHomeClick ตรงปุ่ม Home */}
          <ToolbarButton icon={Home} label="Home" onClick={onHomeClick} />
          <ToolbarButton icon={Layers} label="Layers" onClick={onDataClick} />
          <ToolbarButton icon={Camera} label="Snapshot" />
          <ToolbarButton icon={Bell}   label="Alerts" />
          <ToolbarButton icon={MapPin}   label="Pin" onClick={onMarkClick}/>
          <ToolbarDivider />
          <ToolbarButton icon={Joystick} label="Locate" />
          <ToolbarDivider />
          <div className="flex flex-col items-center">
            <ToolbarButton icon={Plus}  label="Zoom in" />
            <div className="my-2 h-28 w-1 rounded-full bg-zinc-700/70" />
            <ToolbarButton icon={Minus} label="Zoom out" />
          </div>
        </div>

        <div className="rounded-2xl bg-zinc-900/90 backdrop-blur border border-zinc-700 p-2">
          <ToolbarButton icon={Settings} label="Settings" />
          <ToolbarButton icon={User}     label="Account" />
        </div>
      </div>
    </div>
  );
}
