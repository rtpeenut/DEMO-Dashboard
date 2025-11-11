"use client";

import { useEffect, useState } from "react";
import { Marker, Tooltip } from "react-leaflet";
import L from "leaflet";
import { Drone, subscribeDrones, subscribeDronesApi } from "@/server/mockDatabase"; // ✅ ใช้ WebSocket หรือ API
import { DroneIcon } from "lucide-react"; // ใช้ Icon ของ lucide-react ได้เลย

export default function DroneMarkers({
  onSelect,
}: {
  onSelect?: (d: Drone) => void;
}) {
  const [drones, setDrones] = useState<Drone[]>([]);

  // ✅ อัปเดตโดรนแบบเรียลไทม์จาก WS หรือ Polling API ตาม env
  useEffect(() => {
    const useApi = process.env.NEXT_PUBLIC_DATA_SOURCE === "api";
    const stop = (useApi ? subscribeDronesApi : subscribeDrones)((list) => {
      if (Array.isArray(list)) setDrones(list);
      else console.warn("Invalid drones data:", list);
    });
    return stop;
  }, []);

  // ✅ ถ้ายังไม่มีข้อมูล ให้ไม่ render
  if (!Array.isArray(drones) || drones.length === 0) {
    return null;
  }

  return (
    <>
      {drones.map((d) => {
        if (!d.position || d.position.length < 2) return null;
        const [lat, lng] = d.position;

        // ✅ สร้าง custom icon
        const icon = L.divIcon({
          html: `
            <div style="display:flex;align-items:center;justify-content:center;">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="${
                d.status === "FRIEND" ? "#4ade80" : "#f87171"
              }" viewBox="0 0 24 24">
                <path d="M12 2a10 10 0 1 0 10 10A10.011 10.011 0 0 0 12 2zm1 17.93V20a8 8 0 1 1 0-16v.07A8.015 8.015 0 0 1 20 12a8.015 8.015 0 0 1-7 7.93z"/>
              </svg>
            </div>
          `,
          className: "",
          iconSize: [20, 20],
        });

        return (
          <Marker
            key={d.id}
            position={[lat, lng]}
            icon={icon}
            eventHandlers={{
              click: () => onSelect?.(d),
            }}
          >
            <Tooltip direction="top" offset={[0, -8]} opacity={1}>
              <div className="text-sm">
                <strong>{d.callsign}</strong>
                <br />
                {d.altitudeFt.toFixed(0)} ft<br />
                {d.speedKt.toFixed(1)} kt
              </div>
            </Tooltip>
          </Marker>
        );
      })}
    </>
  );
}
