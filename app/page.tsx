'use client';

import dynamic from "next/dynamic";
import { useState, useEffect } from "react";
import { subscribeDrones, subscribeDronesApi } from "@/app/libs/MapData";

const MapboxComponent = dynamic(() => import("@/app/components/LeafletMap/MapboxComponent"), { ssr: false });
const RightToolbar = dynamic(() => import("@/app/components/dashboardoffensive/RightToolbar"), { ssr: false });
const HomeSidebar = dynamic(() => import("@/app/components/dashboardoffensive/HomeSidebar"), { ssr: false });
const DroneDetail = dynamic(() => import("@/app/components/dashboardoffensive/DroneDetail"), { ssr: false });
const Databar = dynamic(() => import("@/app/components/dashboardoffensive/DataBar"), { ssr: false });
const NotificationSidebar = dynamic(() => import("@/app/components/dashboardoffensive/NotificationSidebar"), { ssr: false });
const SettingsSidebar = dynamic(() => import("@/app/components/dashboardoffensive/SettingsSidebar"), { ssr: false });
const DroneCounter = dynamic(() => import("@/app/components/dashboardoffensive/DroneCounter"), { ssr: false });


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

  // state
  const [openHome, setOpenHome] = useState(false);
  const [openData, setOpenData] = useState(false);
  const [openNotif, setOpenNotif] = useState(false);
  const [openSettings, setOpenSettings] = useState(false);
  const [selectedDrone, setSelectedDrone] = useState<Drone | null>(null);
  const [mapStyle, setMapStyle] = useState('mapbox://styles/mapbox/dark-v11');
  const [followDrone, setFollowDrone] = useState<Drone | null>(null);
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    if (followDrone?.id && selectedDrone?.id && followDrone.id !== selectedDrone.id) {
      setFollowDrone(null);
    }
  }, [selectedDrone, followDrone]);

  // ป้องกันแผงซ้อนกัน
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

  const [mapboxObjects, setMapboxObjects] = useState<any[]>([]);

  useEffect(() => {
    const useApi = process.env.NEXT_PUBLIC_DATA_SOURCE === "api";
    const stop = (useApi ? subscribeDronesApi : subscribeDrones)((list) => {
      if (!Array.isArray(list)) return;
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
          onSettingsClick={() => setOpenSettings((v) => !v)}
          on3DToggle={() => {
            if ((window as any).mapbox3DToggle) {
              (window as any).mapbox3DToggle();
            }
          }}
        />

        <DroneCounter marksCount={0} />

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
