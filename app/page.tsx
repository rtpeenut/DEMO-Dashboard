'use client';

import dynamic from "next/dynamic";
import { useState, useEffect } from "react";
import { subscribeDrones, subscribeDronesApi } from "@/app/libs/MapData";

const MapboxComponent = dynamic(() => import("@/app/components/LeafletMap/MapboxComponent"), { ssr: false });
const RightToolbar = dynamic(() => import("@/app/components/dashboard/RightToolbar"), { ssr: false });
const HomeSidebar = dynamic(() => import("@/app/components/dashboard/HomeSidebar"), { ssr: false });
const DroneDetail = dynamic(() => import("@/app/components/dashboard/DroneDetail"), { ssr: false });
const Databar = dynamic(() => import("@/app/components/dashboard/DataBar"), { ssr: false });
const DroneHistoryPanel = dynamic(() => import("@/app/components/dashboard/DroneHistoryPanel"), { ssr: false });
const NotificationSidebar = dynamic(() => import("@/app/components/dashboard/NotificationSidebar"), { ssr: false });
const SettingsSidebar = dynamic(() => import("@/app/components/dashboard/SettingsSidebar"), { ssr: false });
const DroneCounter = dynamic(() => import("@/app/components/dashboard/DroneCounter"), { ssr: false });



export default function HomePage() {
  type Drone = {
    id: string;
    callsign: string;
    type: string;
    status: "FRIEND" | "HOSTILE" | "UNKNOWN";
    speedKt: number;
    altitudeFt: number;
    headingDeg: number;
    lastUpdate?: string;
    mgrs?: string;
    position: [number, number];
    imageUrl?: string;
    camId?: string;
    alt?: number;
  };
  
  
  // state
  const [openHome, setOpenHome] = useState(false);
  const [openData, setOpenData] = useState(false);
  const [openNotif, setOpenNotif] = useState(false);
  const [openSettings, setOpenSettings] = useState(false);
  const [selectedDrone, setSelectedDrone] = useState<Drone | null>(null);
  const [selectedDroneHistory, setSelectedDroneHistory] = useState<{ id: string; name: string } | null>(null);
  const [toolbarHeight, setToolbarHeight] = useState<number>(0);
  const [mapStyle, setMapStyle] = useState('mapbox://styles/mapbox/dark-v11');

  // Calculate toolbar height
  useEffect(() => {
    const toolbar = document.querySelector('#right-toolbar');
    if (toolbar) {
      const { height } = toolbar.getBoundingClientRect();
      setToolbarHeight(height);
    }
  }, []);
  const [followDrone, setFollowDrone] = useState<Drone | null>(null);

  const [notifications, setNotifications] = useState<any[]>([]); // ✅ เก็บประวัติแจ้งเตือนรวมไว้ที่ระดับหน้า
  const [drones, setDrones] = useState<Drone[]>([]); // ✅ เก็บ drones สำหรับ HUD และ Sidebar
  const [filter, setFilter] = useState<'ALL' | 'FRIEND' | 'HOSTILE' | 'UNKNOWN'>('ALL');
  const [selectedCamId, setSelectedCamId] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(true);



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
      setOpenSettings(false);
    }
  }, [openHome]);
  useEffect(() => {
    if (openData) {
      setOpenHome(false);
      setOpenNotif(false);
      setOpenSettings(false);
    }
  }, [openData]);
  useEffect(() => {
    if (openNotif) {
      setOpenHome(false);
      setOpenData(false);
      setOpenSettings(false);
    }
  }, [openNotif]);

  useEffect(() => {
    if (openSettings) {
      setOpenHome(false);
      setOpenData(false);
      setOpenNotif(false);
    }
  }, [openSettings]);

  // ✅ เตรียมข้อมูลสำหรับ Mapbox (แทน Leaflet) จาก WebSocket/API
  const [mapboxObjects, setMapboxObjects] = useState<any[]>([]);

  useEffect(() => {
    const useApi = process.env.NEXT_PUBLIC_DATA_SOURCE === "api";
    const stop = (useApi ? subscribeDronesApi : subscribeDrones)((list) => {
      if (!Array.isArray(list)) return;
      
      setIsLoading(false);
      setDrones(list);
      
      // ✅ Filter by selected filter
      const filtered = list.filter((d: any) => {
        if (selectedCamId && d.camId !== selectedCamId) return false;
        return filter === 'ALL' || d.status === filter;
      });
      
      // map Drone → DetectedObject for map
      const objs = filtered
        .filter((d: any) => Array.isArray(d.position) && d.position.length === 2)
        .map((d: any) => ({
          id: d.id,
          obj_id: d.id,
          type: "drone",
          lat: d.position[0],
          lng: d.position[1],
          altitudeFt: d.altitudeFt,
          speedKt: d.speedKt,
          alt: d.alt, // ✅ เพิ่ม alt สำหรับ tooltip
          callsign: d.callsign,
        }));
      setMapboxObjects(objs);
    });
    return stop;
  }, [filter, selectedCamId]);

  // ✅ Zoom to fit function
  const handleZoomToFit = () => {
    const filtered = drones.filter((d) => {
      if (selectedCamId && d.camId !== selectedCamId) return false;
      return true;
    });
    
    if (filtered.length === 0) return;
    
    const positions = filtered
      .map(d => d.position)
      .filter((pos): pos is [number, number] => 
        Array.isArray(pos) && pos.length === 2 && typeof pos[0] === 'number' && typeof pos[1] === 'number'
      );
    
    if (positions.length === 0) return;
    
    // Call mapbox zoom to fit
    if ((window as any).mapboxZoomToFit) {
      (window as any).mapboxZoomToFit(positions);
    }
  };

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
          marks={[]}
          setMarks={() => {}}
          onAddMark={async () => {}}
          isMarking={false}
          onFinishMark={() => {}}
          notifications={notifications}
          setNotifications={setNotifications}
          mapStyle={mapStyle}
          onMapStyleChange={setMapStyle}
        />

        {openHome && (
          <HomeSidebar
            onClose={() => setOpenHome(false)}
            onSelectDrone={(drone) => {
              setSelectedDrone(drone);
              // Pan/zoom to drone position
              if (drone.position && (window as any).mapboxFlyTo) {
                (window as any).mapboxFlyTo(drone.position[0], drone.position[1]);
              }
            }}
            selectedCamId={selectedCamId}
            filter={filter}
            onFilterChange={setFilter}
          />
        )}
        {openData && (
          <Databar 
            onClose={() => setOpenData(false)} 
            onSelectDrone={(drone) => {
              console.log('Selected drone for history:', drone);
              setSelectedDroneHistory(drone);
            }}
          />
        )}
        {selectedDroneHistory && (
          <>
            {console.log('Rendering DroneHistoryPanel:', selectedDroneHistory)}
            <DroneHistoryPanel
              droneId={selectedDroneHistory.id}
              droneName={selectedDroneHistory.name}
              toolbarHeight={toolbarHeight}
              onClose={() => setSelectedDroneHistory(null)}
            />
          </>
        )}
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
          onProtectClick={() => {}}
          onSettingsClick={() => setOpenSettings((v) => !v)}
          on3DToggle={() => {
            if ((window as any).mapbox3DToggle) {
              (window as any).mapbox3DToggle();
            }
          }}
        />

        <DroneCounter marksCount={0} />



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


    </main>
  );
}
