'use client';

import dynamic from "next/dynamic";
import { useState, useEffect } from "react";
import { subscribeDrones, subscribeDronesApi } from "@/app/libs/MapData";

const MapboxComponent = dynamic(() => import("@/app/components/LeafletMap/MapboxComponent"), { ssr: false });
const RightToolbar = dynamic(() => import("@/app/components/dashboard/RightToolbar"), { ssr: false });
const HomeSidebar = dynamic(() => import("@/app/components/dashboard/HomeSidebar"), { ssr: false });
const DroneDetail = dynamic(() => import("@/app/components/dashboard/DroneDetail"), { ssr: false });
const Databar = dynamic(() => import("@/app/components/dashboard/DataBar"), { ssr: false });
const MarkSidebar = dynamic(() => import("@/app/components/dashboard/MarkSidebar"), { ssr: false });
const NotificationSidebar = dynamic(() => import("@/app/components/dashboard/NotificationSidebar"), { ssr: false });
const SettingsSidebar = dynamic(() => import("@/app/components/dashboard/SettingsSidebar"), { ssr: false });
const DroneCounter = dynamic(() => import("@/app/components/dashboard/DroneCounter"), { ssr: false });


export default function HomePage() {
  type Drone = {
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
  
  type Mark = {
    id: string;
    name: string;
    color: string;
    pos: [number, number];
    radius: number;
  };
  
  // state
  const [openHome, setOpenHome] = useState(false);
  const [openData, setOpenData] = useState(false);
  const [openNotif, setOpenNotif] = useState(false); // ✅ Sidebar การแจ้งเตือน
  const [openSettings, setOpenSettings] = useState(false); // ✅ Sidebar การตั้งค่า
  const [selectedDrone, setSelectedDrone] = useState<Drone | null>(null);
  const [mapStyle, setMapStyle] = useState('mapbox://styles/mapbox/dark-v11');
  const [followDrone, setFollowDrone] = useState<Drone | null>(null);
  const [showMark, setShowMark] = useState(false);
  const [marks, setMarks] = useState<Mark[]>([]);
  const [isMarking, setIsMarking] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]); // ✅ เก็บประวัติแจ้งเตือนรวมไว้ที่ระดับหน้า

  // ✅ Load marks from API on initial render
  useEffect(() => {
    const loadMarks = async () => {
      try {
        const response = await fetch("/api/marks", { cache: "no-store" });
        if (!response.ok) throw new Error("Failed to load marks");
        const data = await response.json();
        // Map API response to component state format (exclude createdAt if not needed in UI)
        setMarks(data.map((m: any) => ({
          id: m.id,
          name: m.name,
          color: m.color,
          pos: m.pos,
          radius: m.radius,
        })));
      } catch (error) {
        console.error("Error loading marks:", error);
      }
    };
    loadMarks();
  }, []);

  // ✅ Handle adding a mark via API
  const handleAddMark = async (mark: { name: string; color: string; pos: [number, number]; radius: number }) => {
    try {
      const response = await fetch("/api/marks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mark),
      });
      if (!response.ok) throw new Error("Failed to create mark");
      const newMark = await response.json();
      // Update state with the new mark (exclude createdAt from state)
      setMarks((prev: Mark[]) => [...prev, {
        id: newMark.id,
        name: newMark.name,
        color: newMark.color,
        pos: newMark.pos,
        radius: newMark.radius,
      }]);
    } catch (error) {
      console.error("Error creating mark:", error);
      throw error; // Re-throw so MapboxComponent can handle it
    }
  };

  // ✅ Handle deleting a mark via API
  const handleDeleteMark = async (id: string) => {
    try {
      const response = await fetch(`/api/marks/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete mark");
      // Update state after successful deletion
      setMarks((prev: Mark[]) => prev.filter((m: Mark) => m.id !== id));
    } catch (error) {
      console.error("Error deleting mark:", error);
    }
  };


  useEffect(() => {
    // ถ้ามีการ follow อยู่ แต่ไปดู detail ของ drone อื่น
    if (followDrone?.id && selectedDrone?.id && followDrone.id !== selectedDrone.id) {
      setFollowDrone(null); // ✅ ยกเลิกการ follow ตัวเก่าทันที
    }
  }, [selectedDrone, followDrone]);

  // ✅ ป้องกันแผงจาก RightToolbar ซ้อนกัน: เปิดอันหนึ่ง ปิดอีกอันอัตโนมัติ
  useEffect(() => {
    if (openHome) {
      setOpenData(false);
      setOpenNotif(false);
      setShowMark(false);
      setOpenSettings(false);
    }
  }, [openHome]);
  useEffect(() => {
    if (openData) {
      setOpenHome(false);
      setOpenNotif(false);
      setShowMark(false);
      setOpenSettings(false);
    }
  }, [openData]);
  useEffect(() => {
    if (openNotif) {
      setOpenHome(false);
      setOpenData(false);
      setShowMark(false);
      setOpenSettings(false);
    }
  }, [openNotif]);
  useEffect(() => {
    if (showMark) {
      setOpenHome(false);
      setOpenData(false);
      setOpenNotif(false);
      setOpenSettings(false);
    }
  }, [showMark]);
  useEffect(() => {
    if (openSettings) {
      setOpenHome(false);
      setOpenData(false);
      setOpenNotif(false);
      setShowMark(false);
    }
  }, [openSettings]);

  // ✅ เตรียมข้อมูลสำหรับ Mapbox (แทน Leaflet) จาก WebSocket/API
  const [mapboxObjects, setMapboxObjects] = useState<any[]>([]);

  useEffect(() => {
    const useApi = process.env.NEXT_PUBLIC_DATA_SOURCE === "api";
    const stop = (useApi ? subscribeDronesApi : subscribeDrones)((list) => {
      if (!Array.isArray(list)) return;
      // map Drone → DetectedObject
      const objs = list
        .filter((d: any) => Array.isArray(d.position) && d.position.length === 2)
        .map((d: any) => ({
          id: d.id,
          obj_id: d.id,
          type: "drone",
          lat: d.position[0],
          lng: d.position[1],
          altitudeFt: d.altitudeFt,
          speedKt: d.speedKt,
          callsign: d.callsign,
        }));
      setMapboxObjects(objs);
    });
    return stop;
  }, []);

  return (
    <main className="h-screen w-screen">
      <div className="relative h-full w-full">
        {/* ✅ ใช้ Mapbox แทน Leaflet */}
        <MapboxComponent
          objects={mapboxObjects}
          imagePath={undefined}
          cameraLocation={"defence"}
          selectedDrone={selectedDrone}
          onSelectDrone={(drone: any) => setSelectedDrone(drone)}
          followDrone={followDrone}
          marks={marks}
          setMarks={setMarks}
          onAddMark={handleAddMark}
          isMarking={isMarking}
          onFinishMark={() => setIsMarking(false)}
          notifications={notifications}
          setNotifications={setNotifications}
          mapStyle={mapStyle}
          onMapStyleChange={setMapStyle}
        />

        {openHome && (
          <HomeSidebar
            onClose={() => setOpenHome(false)}
            onSelectDrone={(drone) => setSelectedDrone(drone)}
          />
        )}
        {openData && <Databar onClose={() => setOpenData(false)} />}
        {openNotif && (
          <NotificationSidebar
            notifications={notifications}
            onClose={() => setOpenNotif(false)}
          />
        )}
        {openSettings && (
          <SettingsSidebar
            currentMapStyle={mapStyle}
            onMapStyleChange={setMapStyle}
            onClose={() => setOpenSettings(false)}
          />
        )}

        <RightToolbar
          onHomeClick={() => {
            setOpenData(false);
            setOpenHome((v) => !v);
          }}
          onDataClick={() => {
            setOpenHome(false);
            setOpenData((v) => !v);
          }}
          onNotifClick={() => { setOpenHome(false); setOpenData(false); setOpenNotif((v)=>!v); }}
          onMarkClick={() => setShowMark(!showMark)}
          onSettingsClick={() => setOpenSettings((v) => !v)}
          on3DToggle={() => {
            if ((window as any).mapbox3DToggle) {
              (window as any).mapbox3DToggle();
            }
          }}
        />

        {/* ✅ แสดงจำนวนโดรนทั้งหมดและวงที่สร้าง */}
        <DroneCounter marksCount={marks.length} />


        {/* ✅ กล่องรายละเอียดโดรน */}
        {selectedDrone && (
          <DroneDetail
            drone={selectedDrone}
            onClose={() => setSelectedDrone(null)}
            isFollowing={followDrone?.id === selectedDrone?.id}
            onFollow={(d, follow) => setFollowDrone(follow ? d : null)}
          />
        )}
      </div>

      {/* ✅ ใช้ Mapbox เต็มรูปแบบแล้ว - ไม่ต้องใช้ Leaflet อีกต่อไป */}


      {showMark && (
        <MarkSidebar
          marks={marks}
          onDeleteMark={handleDeleteMark}
          onAddMark={() => setIsMarking(true)}
          onClose={() => setShowMark(false)}
        />
      )}
    </main>
  );
}
