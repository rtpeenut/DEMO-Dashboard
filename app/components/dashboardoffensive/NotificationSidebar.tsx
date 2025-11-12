'use client';

import { useEffect, useRef, useState } from 'react';
import { Bell, Drone as DroneIcon } from 'lucide-react';

// ✅ โครงสร้าง notification ให้สอดคล้องกับ NotificationPanel
interface DroneInfo {
  id: string;
  callsign: string;
  type: string;
  status: string;
  speedKt: number;
  altitudeFt: number;
  headingDeg: number;
  lastUpdate?: string;
  position?: [number, number];
  mgrs?: string;
  imageUrl?: string;
}

export interface NotificationItem {
  id: string;
  message: string; // ✅ ใช้ข้อความ “เข้า/ออก” จาก MarkZoneWatcher
  zoneName: string;
  drone: DroneInfo;
  time: string; // HH:mm
}

export default function NotificationSidebar({
  notifications,
  onClose,
}: {
  notifications: NotificationItem[];
  onClose?: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [toolbarHeight, setToolbarHeight] = useState<number>(0);

  // ✅ จัดการขนาดให้สูงเท่ากับแถบเครื่องมือด้านขวา
  useEffect(() => {
    const toolbar = document.querySelector('#right-toolbar');
    if (toolbar) {
      const { height } = (toolbar as HTMLElement).getBoundingClientRect();
      setToolbarHeight(height);
    }
  }, []);

  // ✅ เรียงใหม่→เก่า โดยใช้ลำดับที่แอปใส่มาอยู่แล้ว (LeafletMap ใส่รายการใหม่ไว้หัว array)
  const items = Array.isArray(notifications) ? notifications : [];

  return (
    <aside
      ref={ref}
      style={{
        height: toolbarHeight ? `${toolbarHeight}px` : 'auto',
        top: '50%',
        transform: 'translateY(-50%)',
        right: '88px',
      }}
      className="absolute right-4 md:right-[88px] z-[1100] w-full md:w-[395px] max-w-[calc(100vw-2rem)] md:max-w-[90vw]
             rounded-2xl p-3 text-white transition-all flex flex-col font-prompt ui-card ui-slide-from-toolbar"
    >
      <div className="mb-2 flex items-center justify-between rounded-xl px-4 py-2 text-amber-400 font-bold tracking-wider ui-header">
        <span className="flex items-center gap-2"><Bell size={16} /> NOTIFICATIONS</span>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="rounded-md text-zinc-300"
            aria-label="Close notification sidebar"
          >
            ✕
          </button>
        )}
      </div>

      <div className="mb-3 rounded-xl bg-zinc-800 px-4 py-2 text-zinc-300 font-sans">
        HISTORY
      </div>

      {/* ✅ รายการประวัติแจ้งเตือนแบบเลื่อนดูได้ */}
      <div className="space-y-3 overflow-y-auto pr-1 flex-1">
        {items.length === 0 && (
          <div className="m-2 text-sm text-zinc-400 text-center">No notifications yet</div>
        )}
        {items.map((n) => {
          const isEnter = n.message?.includes("เข้า");
          const accent = isEnter ? "text-green-400" : "text-amber-400";
          return (
            <div
              key={n.id}
              className="w-full rounded-xl bg-zinc-800/80 border border-zinc-700 p-4 text-left ui-hover ring-1 ring-amber-500/10"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-900/80 text-amber-400">
                  <DroneIcon size={24} />
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-amber-400 font-extrabold">{n.drone.callsign}</div>
                      <div className="text-sm text-zinc-300">• {n.drone.type}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-zinc-400">TIME</div>
                      <div className="font-semibold text-zinc-200">{n.time}</div>
                    </div>
                  </div>

                  {/* Event box */}
                  <div className="mt-3 rounded-lg border border-zinc-700/70 bg-zinc-900/60 px-3 py-2">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="ui-pill px-2 py-[2px] rounded-md text-[11px] font-semibold">EVENT</span>
                      <span className={`text-[11px] ${accent}`}>{isEnter ? "ENTER" : "EXIT"}</span>
                    </div>
                    <div className="text-sm text-zinc-100 leading-snug">
                      {n.message} {n.zoneName ? `(${n.zoneName})` : ''}
                    </div>
                  </div>

                  <div className="mt-2 text-xs text-zinc-400">ID: <span className="text-zinc-300">{n.drone.id}</span></div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
