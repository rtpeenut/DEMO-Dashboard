'use client';

import dynamic from "next/dynamic";
import { useState, useEffect } from "react";
import { subscribeDrones, subscribeDronesApi } from "@/app/libs/MapData";

const MapboxComponent = dynamic(() => import("@/app/components/LeafletMap/MapboxComponent"), { ssr: false });
const MapboxSecondaryMap = dynamic(() => import("@/app/components/LeafletMap/MapboxSecondaryMap"), { ssr: false });
const RightToolbar = dynamic(() => import("@/app/components/dashboard/RightToolbar"), { ssr: false });
const HomeSidebar = dynamic(() => import("@/app/components/dashboard/HomeSidebar"), { ssr: false });
const DroneDetail = dynamic(() => import("@/app/components/dashboard/DroneDetail"), { ssr: false });
const Databar = dynamic(() => import("@/app/components/dashboard/DataBar"), { ssr: false });
const DroneHistoryPanel = dynamic(() => import("@/app/components/dashboard/DroneHistoryPanel"), { ssr: false });
const NotificationSidebar = dynamic(() => import("@/app/components/dashboard/NotificationSidebar"), { ssr: false });
const NotificationPanel = dynamic(() => import("@/app/components/dashboard/NotificationPanel"), { ssr: false });
const CameraSidebar = dynamic(() => import("@/app/components/dashboard/CameraSidebar"), { ssr: false });
const SettingsSidebar = dynamic(() => import("@/app/components/dashboard/SettingsSidebar"), { ssr: false });
const ProtectSidebar = dynamic(() => import("@/app/components/dashboard/ProtectSidebar"), { ssr: false });
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
  const [openCamera, setOpenCamera] = useState(false);
  const [openNotif, setOpenNotif] = useState(false);
  const [openSettings, setOpenSettings] = useState(false);
  const [showProtect, setShowProtect] = useState(false);
  const [splitScreen, setSplitScreen] = useState(false);
  const [secondaryFollowDrone, setSecondaryFollowDrone] = useState<Drone | null>(null);
  const [selectedDrone, setSelectedDrone] = useState<Drone | null>(null);

  // ✅ Resize maps when split screen changes
  useEffect(() => {
    // Trigger resize after transition completes
    const timer = setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 350); // Match transition duration (300ms + buffer)

    return () => clearTimeout(timer);
  }, [splitScreen]);
  const [selectedDroneHistory, setSelectedDroneHistory] = useState<{ id: string; name: string } | null>(null);
  const [toolbarHeight, setToolbarHeight] = useState<number>(0);
  const [mapStyle, setMapStyle] = useState('mapbox://styles/mapbox/dark-v11');
  const [mapInstance, setMapInstance] = useState<any>(null);
  const [followDrone, setFollowDrone] = useState<Drone | null>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [popupNotifications, setPopupNotifications] = useState<any[]>([]);
  const [drones, setDrones] = useState<Drone[]>([]);
  const [filter, setFilter] = useState<'ALL' | 'FRIEND' | 'HOSTILE' | 'UNKNOWN'>('ALL');
  const [selectedCamId, setSelectedCamId] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const [marks, setMarks] = useState<Mark[]>([]);
  const [isMarking, setIsMarking] = useState(false);

  // Get map instance from window
  useEffect(() => {
    const checkMap = setInterval(() => {
      if ((window as any).mapboxInstance) {
        setMapInstance((window as any).mapboxInstance);
        clearInterval(checkMap);
      }
    }, 100);

    return () => clearInterval(checkMap);
  }, []);

  // Calculate toolbar height
  useEffect(() => {
    const updateToolbarHeight = () => {
      const toolbar = document.querySelector('#right-toolbar');
      if (toolbar) {
        const { height } = toolbar.getBoundingClientRect();
        setToolbarHeight(height);
      }
    };

    updateToolbarHeight();
    const timer = setTimeout(updateToolbarHeight, 100);
    window.addEventListener('resize', updateToolbarHeight);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateToolbarHeight);
    };
  }, []);

  // ✅ No need to load marks from API (using in-memory only)
  // useEffect(() => {
  //   const loadMarks = async () => {
  //     try {
  //       const response = await fetch("/api/marks", { cache: "no-store" });
  //       if (!response.ok) throw new Error("Failed to load marks");
  //       const data = await response.json();
  //       setMarks(data.map((m: any) => ({
  //         id: m.id,
  //         name: m.name,
  //         color: m.color,
  //         pos: m.pos,
  //         radius: m.radius,
  //       })));
  //     } catch (error) {
  //       console.error("Error loading marks:", error);
  //     }
  //   };
  //   loadMarks();
  // }, []);

  // ✅ Handle adding a mark (in-memory only, no backend)
  const handleAddMark = async (mark: { name: string; color: string; pos: [number, number]; radius: number }) => {
    console.log('🎯 handleAddMark called:', mark);
    try {
      // สร้าง mark ใหม่แบบ in-memory (ไม่เรียก backend)
      const newMark: Mark = {
        id: `mark-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: mark.name,
        color: mark.color,
        pos: mark.pos,
        radius: mark.radius,
      };
      
      console.log('✅ Mark created (in-memory):', newMark);
      
      // Update state
      setMarks((prev: Mark[]) => [...prev, newMark]);
      
      console.log('✅ State updated, closing marking mode');
    } catch (error) {
      console.error("❌ Error creating mark:", error);
      throw error;
    }
  };

  // ✅ Handle deleting a mark (in-memory only, no backend)
  const handleDeleteMark = async (id: string) => {
    console.log('🗑️ Deleting mark:', id);
    try {
      // ลบ mark แบบ in-memory (ไม่เรียก backend)
      setMarks((prev: Mark[]) => prev.filter((m: Mark) => m.id !== id));
      console.log('✅ Mark deleted (in-memory)');
    } catch (error) {
      console.error("❌ Error deleting mark:", error);
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
      setOpenCamera(false);
      setOpenNotif(false);
      setOpenSettings(false);
    }
  }, [openHome]);
  useEffect(() => {
    if (openData) {
      setOpenHome(false);
      setOpenCamera(false);
      setOpenNotif(false);
      setShowProtect(false);
      setOpenSettings(false);
    }
  }, [openData]);
  useEffect(() => {
    if (openCamera) {
      setOpenHome(false);
      setOpenData(false);
      setOpenNotif(false);
      setShowProtect(false);
      setOpenSettings(false);
    }
  }, [openCamera]);
  useEffect(() => {
    if (openNotif) {
      setOpenHome(false);
      setOpenData(false);
      setOpenCamera(false);
      setShowProtect(false);
      setOpenSettings(false);
    }
  }, [openNotif]);
  useEffect(() => {
    if (showProtect) {
      setOpenHome(false);
      setOpenData(false);
      setOpenCamera(false);
      setOpenNotif(false);
      setOpenSettings(false);
    }
  }, [showProtect]);
  useEffect(() => {
    if (openSettings) {
      setOpenHome(false);
      setOpenData(false);
      setOpenCamera(false);
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
    <main className="h-screen w-screen overflow-hidden">
      <div className={`relative h-full w-full flex ${splitScreen ? 'gap-2 p-2' : ''}`}>
        {/* ✅ แผนที่ฝั่งซ้าย (โดรนฝั่งเรา) */}
        {splitScreen && (
          <div className="relative w-[25%] rounded-2xl overflow-hidden shadow-2xl">
            <MapboxSecondaryMap 
              mapStyle={mapStyle} 
              followDrone={secondaryFollowDrone}
              drones={drones}
              marks={marks}
            />
          </div>
        )}

        {/* ✅ แผนที่หลัก */}
        <div className={`relative transition-all duration-300 ${splitScreen ? 'w-[calc(75%-0.5rem)] rounded-2xl overflow-hidden shadow-2xl' : 'w-full'}`}>
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

        {/* ✅ Popup แจ้งเตือนโดรนใหม่ - แสดงเฉพาะในแผนที่หลัก */}
        <NotificationPanel 
          notifications={popupNotifications}
          setNotifications={setPopupNotifications}
        />

        {/* ✅ แจ้งเตือนเมื่อกำลังสร้างวงรัศมี */}
        {isMarking && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1300]">
            <div className="flex items-center gap-2 rounded-xl px-4 py-2 ui-card bg-amber-500/90 border border-amber-400">
              <span className="text-amber-400 font-semibold text-sm">
                กรุณาเลือกจุดที่จะสร้างรัศมีป้องกัน
              </span>
            </div>
          </div>
        )}
        </div>

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
        {openCamera && (
          <CameraSidebar
            onClose={() => setOpenCamera(false)}
          />
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
        {showProtect && (
          <ProtectSidebar
            zones={marks}
            onAddZone={() => setIsMarking(true)}
            onDeleteZone={handleDeleteMark}
            isMarking={isMarking}
            onClose={() => setShowProtect(false)}
          />
        )}

        <RightToolbar
          onHomeClick={() => {
            setOpenData(false);
            setOpenCamera(false);
            setOpenHome((v) => !v);
          }}
          onDataClick={() => {
            setOpenHome(false);
            setOpenCamera(false);
            setOpenData((v) => !v);
          }}
          onCameraClick={() => {
            setOpenHome(false);
            setOpenData(false);
            setOpenCamera((v) => !v);
          }}
          onNotifClick={() => { setOpenHome(false); setOpenData(false); setOpenCamera(false); setOpenNotif((v)=>!v); }}
          onProtectClick={() => setShowProtect(!showProtect)}
          onSplitScreenClick={() => setSplitScreen((v) => !v)}
          onSettingsClick={() => setOpenSettings((v) => !v)}
          on3DToggle={() => {
            if ((window as any).mapbox3DToggle) {
              (window as any).mapbox3DToggle();
            }
          }}
        />

        {/* ✅ แสดงจำนวนโดรนทั้งหมดและวงที่สร้าง */}
        <DroneCounter 
          marksCount={marks.length}
          map={mapInstance}
          onNewDroneDetected={(notif) => {
            // ✅ เพิ่มการแจ้งเตือนโดรนใหม่เข้าไปในรายการประวัติ (ใส่ไว้หัว array)
            setNotifications((prev) => [notif, ...prev]);
            // ✅ เพิ่มการแจ้งเตือนแบบ popup (ใส่ไว้หัว array)
            setPopupNotifications((prev) => [notif, ...prev]);
          }}
          onDroneLost={(notif) => {
            // ✅ เพิ่มการแจ้งเตือนโดรนหายไปเข้าไปในรายการประวัติ (ใส่ไว้หัว array)
            setNotifications((prev) => [notif, ...prev]);
            // ✅ เพิ่มการแจ้งเตือนแบบ popup (ใส่ไว้หัว array)
            setPopupNotifications((prev) => [notif, ...prev]);
          }}
        />

        {/* ✅ กล่องรายละเอียดโดรน */}
        {selectedDrone && (
          <DroneDetail
            drone={selectedDrone}
            onClose={() => setSelectedDrone(null)}
            isFollowing={followDrone?.id === selectedDrone?.id}
            onFollow={(d, follow) => setFollowDrone(follow ? d : null)}
            onSplitScreen={(drone) => {
              if (splitScreen) {
                // ถ้าเปิดอยู่แล้ว ให้ปิด
                setSplitScreen(false);
                setSecondaryFollowDrone(null);
              } else {
                // ถ้าปิดอยู่ ให้เปิด
                setSplitScreen(true);
                setSecondaryFollowDrone(drone);
              }
            }}
            splitScreen={splitScreen}
          />
        )}
      </div>


    </main>
  );
}
