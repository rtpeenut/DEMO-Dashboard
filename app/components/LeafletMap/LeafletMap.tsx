'use client';

import { MapContainer, TileLayer, useMapEvents, Circle, Marker, useMap } from 'react-leaflet';
import { useEffect, useState, useRef } from 'react';
import L from "leaflet";
import MgrsGridOverlay from './MgrsGridOverlay';
import MgrsCursorOverlay from './MgrsCursorOverlay';
import DroneMarkers from './DroneMarkers';
import MarkCirclePanel from '@/app/components/dashboard/MarkCirclePanel';
import NotificationPanel from '../dashboard/NotificationPanel';
import { subscribeDrones } from "@/app/libs/droneMapperData";
import type { Notification } from "../dashboard/NotificationPanel";
import MarkZoneWatcher from "./MarkZoneWatcher";
import FollowDroneUpdater from './FollowDroneUpdater';


interface Mark {
  id: string;
  name: string;
  color: string;
  pos: [number, number];
  radius: number;
}

// ป้ายชื่อ mark
function MarkLabel({
  position,
  text,
  color,
}: {
  position: [number, number];
  text: string;
  color: string;
}) {
  const map = useMap();

  useEffect(() => {

    const label = L.divIcon({
      html: `<div style="color:${color};font-weight:bold;text-shadow:0 0 4px rgba(0,0,0,0.8);font-size:13px;text-align:center;white-space:nowrap;">${text}</div>`,
      className: "mark-label",
    });

    const marker = L.marker(position, { icon: label, interactive: false }).addTo(map);

    return () => {
      map.removeLayer(marker);
    };
  }, [map, position, text, color]);

  return null;
}
function MarkItem({ mark }: { mark: Mark }) {
  return (
    <>
      <Circle
        center={mark.pos}
        radius={mark.radius}
        pathOptions={{
          color: mark.color,
          fillColor: mark.color,
          fillOpacity: 0.25,
        }}
      />
      <MarkLabel position={mark.pos} text={mark.name || "Unnamed"} color={mark.color} />
    </>
  );
}

export default function LeafletMap({
  selectedDrone,
  onSelectDrone,
  followDrone,
  marks,
  setMarks,
  isMarking,
  onFinishMark,
  // ✅ รับ notifications และ setNotifications จากหน้า HomePage (ย้าย state ขึ้นด้านบน)
  notifications,
  setNotifications,
}: {
  selectedDrone?: any;
  onSelectDrone?: (drone: any) => void;
  followDrone?: any;
  marks: Mark[];
  setMarks: React.Dispatch<React.SetStateAction<Mark[]>>;
  isMarking?: boolean;
  onFinishMark?: () => void;
  notifications: any[];
  setNotifications: React.Dispatch<React.SetStateAction<any[]>>;
}) {
  const [pendingMark, setPendingMark] = useState<[number, number] | null>(null);
  const [drones, setDrones] = useState<any[]>([]);
  const inZoneMapRef = useRef<Map<string, boolean>>(new Map()); // ✅ คงค่าไว้ระหว่าง render

  useEffect(() => {
    const stop = subscribeDrones(setDrones);
    return stop;
  }, []);

  // ✅ ทำให้การติดตาม (follow) ใช้ตำแหน่ง "ล่าสุดจริง" จากฟีด WS เสมอ
  //    - เมื่อผู้ใช้กด Follow เราเก็บวัตถุโดรนไว้ที่ HomePage
  //    - ที่นี่จะเทียบ id กับรายการโดรนสดในแผนที่ แล้วเลือกตัวล่าสุดมาใช้งาน
  //    - ผลคือมุมกล้องจะตามโดรนแบบเรียลไทม์ ไม่ค้างที่ค่าเดิมตอนกดปุ่ม
  const liveFollow = followDrone ? (drones.find((d) => d.id === followDrone.id) ?? followDrone) : null;

  // ✅ ตัวช่วยเชื่อมปุ่มซูมจาก RightToolbar (นอกแผนที่) มาควบคุม Leaflet map
  // ใช้วิธี event bridge ผ่าน window: 'app:mapZoom' { detail: { dir: 1 | -1 } }
  function ZoomBridge() {
    const map = useMap();
    useEffect(() => {
      const handler = (e: any) => {
        const dir = e?.detail?.dir;
        if (dir === 1) map.zoomIn();
        else if (dir === -1) map.zoomOut();
      };
      const setZoomHandler = (e: any) => {
        const level = e?.detail?.level;
        if (typeof level === 'number') map.setZoom(level);
      };

      // ✅ แจ้งสถานะซูมปัจจุบันให้ RightToolbar รู้ทุกครั้งที่ซูม
      const emitZoom = () => {
        const detail = { level: map.getZoom(), min: map.getMinZoom(), max: map.getMaxZoom() };
        window.dispatchEvent(new CustomEvent('app:zoomChanged', { detail }));
      };
      emitZoom();
      map.on('zoomend', emitZoom);

      window.addEventListener('app:mapZoom', handler as EventListener);
      window.addEventListener('app:setZoom', setZoomHandler as EventListener);
      return () => {
        window.removeEventListener('app:mapZoom', handler as EventListener);
        window.removeEventListener('app:setZoom', setZoomHandler as EventListener);
        map.off('zoomend', emitZoom);
      };
    }, [map]);
    return null;
  }


  //  Handler สำหรับคลิกในแผนที่
  function MapClickHandler() {
    useMapEvents({
      click(e) {
        if (isMarking) {
          setPendingMark([e.latlng.lat, e.latlng.lng]);
        }
      },
    });
    return null;
  }

  //  เมื่อกดยืนยันในกล่อง MarkCirclePanel
  const confirmMark = (data: { name: string; radius: number; color: string }) => {
    if (!pendingMark) return;
    const newMark = {
      id: crypto.randomUUID(),
      name: data.name || "Unnamed Mark",
      pos: pendingMark,
      radius: data.radius,
      color: data.color,
    };
    setMarks((prev) => [...prev, newMark]);
    setPendingMark(null);
    onFinishMark?.();
  };


  return (
    <div className="relative h-full w-full">
      <MapContainer
        center={[13.736717, 100.523186]}
        zoom={12}
        className="h-full w-full"
        zoomControl={false}
        attributionControl={true}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap contributors"
        />

        {/* ✅ เชื่อมปุ่มซูมจาก RightToolbar มาควบคุมแผนที่ */}
        <ZoomBridge />

        {/* ✅ ส่วนของ MGRS และ Drone */}
        <MgrsGridOverlay />
        <DroneMarkers onSelect={onSelectDrone} />
        <MgrsCursorOverlay precision={5} />

        {/* ✅ คลิกเพื่อปักหมุด mark */}
        <MapClickHandler />

        {/* ✅ ติดตามโดรน: ส่งโดรนเวอร์ชันล่าสุด (liveFollow) เพื่อให้ useMap.flyTo อัปเดตตามจริง */}
        <FollowDroneUpdater followDrone={liveFollow} />

        {/* ✅ แสดงวงกลม mark ทั้งหมด */}
        {marks.map((m) => (
          <MarkZoneWatcher
            key={m.id}
            mark={m}
            drones={drones}
            isFollowing={!!followDrone}
            onDroneInZone={(drone, event) => {
              setNotifications((prev) => [
                {
                  id: `${drone.id}-${m.id}-${event}`,
                  message: event === "enter" ? "พบโดรนบินเข้าเขต" : "โดรนออกจากเขต",
                  zoneName: m.name,
                  drone,
                  time: new Date().toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  }),
                },
                ...prev,
              ]);
            }}
          />
        ))}
      </MapContainer>

      
      {/* ✅ กล่องตั้งค่ารัศมี */}
      {pendingMark && (
        <MarkCirclePanel
          position={pendingMark}
          onConfirm={confirmMark}
          onCancel={() => setPendingMark(null)}
        />
      )}

      {/* ✅ กล่องแจ้งเตือน */}
      <NotificationPanel
        notifications={notifications}
        setNotifications={setNotifications}
      />
    </div>
  );
}
