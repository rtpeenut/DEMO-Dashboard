'use client';
import { useEffect } from "react";
import { Bell, Drone as DroneIcon } from 'lucide-react'; // ✅ ใช้ไอคอนจาก lucide-react (แทน emoji)

interface Drone {
  id: string;
  callsign: string;
  type: string;
  status: string;
  speedKt: number;
  altitudeFt: number;
  headingDeg: number;
  lastUpdate: string;
  position: [number, number];
  mgrs?: string;
  imageUrl?: string;
}
export interface Notification {
  id: string;
  message: string;
  zoneName: string;
  drone: Drone;
  time: string;
}

export default function NotificationPanel({
  notifications,
  setNotifications,
}: {
  notifications: Notification[];
  setNotifications: React.Dispatch<React.SetStateAction<Notification[]>>;
}) {
  // 🕒 ตั้งเวลาให้หายไปหลัง 8 วิ
  useEffect(() => {
    if (notifications.length === 0) return;
    const timer = setTimeout(() => {
      setNotifications((prev) => prev.slice(1));
    }, 5000);
    return () => clearTimeout(timer);
  }, [notifications, setNotifications]);

  if (notifications.length === 0) return null;

  const n = notifications[0];

  return (
    <div className="absolute bottom-4 left-4 right-4 md:right-auto z-[1200] w-auto md:w-[420px] rounded-2xl bg-zinc-900/95 backdrop-blur border border-zinc-700 shadow-2xl text-white overflow-hidden animate-fadeIn">
      
      {/* Header */}
      <div className="bg-zinc-800 px-4 py-2 font-bold text-amber-400 text-sm tracking-wide border-b border-zinc-700 flex items-center gap-2">
        {/* ✅ ใช้ Bell icon แทน emoji */}
        <Bell size={16} />
        <span>NOTIFICATION</span>
      </div>

      {/* Title */}
      <div className="bg-zinc-800/70 px-4 py-2 text-white font-semibold text-sm border-b border-zinc-700">
        {/* ✅ แสดงข้อความตาม event: เข้า/ออก ตามที่ส่งมาใน n.message */}
        {n.message} {n.zoneName ? `(${n.zoneName})` : ""}
      </div>

      {/* Drone Detail Box */}
      <div className="p-3 flex flex-col gap-2">
        <div className="bg-zinc-800 rounded-xl border border-zinc-700 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* ✅ ใช้ Drone icon แทน emoji */}
            <div className="text-white-1000"><DroneIcon size={34} /></div>
            <div>
              <div className="font-bold text-amber-400 text-sm">
                {n.drone.callsign}
              </div>
              <div className="text-xs text-zinc-400">• {n.drone.type}</div>
              <div className="text-[11px] text-zinc-500 mt-1">
                ID : {n.drone.id}
              </div>
            </div>
          </div>

          <div className="text-right">
            <div className="text-xs text-zinc-400">STATUS</div>
            <div
              className={`font-semibold text-sm ${
                n.drone.status === "HOSTILE" ? "text-red-400" : "text-green-400"
              }`}
            >
              {n.drone.status}
            </div>
            <div className="text-xs text-zinc-400 mt-1">TIME DETECTION</div>
            <div className="font-semibold text-sm">{n.time}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
