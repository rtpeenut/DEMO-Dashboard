'use client';

import dynamic from "next/dynamic";
import { useState, useEffect } from "react";

const LeafletMap = dynamic(() => import("@/app/components/LeafletMap/LeafletMap"), { ssr: false });
const RightToolbar = dynamic(() => import("@/app/components/dashboard/RightToolbar"), { ssr: false });
const HomeSidebar = dynamic(() => import("@/app/components/dashboard/HomeSidebar"), { ssr: false });
const DroneDetail = dynamic(() => import("@/app/components/dashboard/DroneDetail"), { ssr: false });
const Databar = dynamic(() => import("@/app/components/dashboard/DataBar"), { ssr: false });
const MarkSidebar = dynamic(() => import("@/app/components/dashboard/MarkSidebar"), { ssr: false });
const NotificationSidebar = dynamic(() => import("@/app/components/dashboard/NotificationSidebar"), { ssr: false });


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
  const [openNotif, setOpenNotif] = useState(false); // ✅ Sidebar การแจ้งเตือน
  const [selectedDrone, setSelectedDrone] = useState<Drone | null>(null);
  const [followDrone, setFollowDrone] = useState<Drone | null>(null);
  const [showMark, setShowMark] = useState(false);
  const [marks, setMarks] = useState<
  { id: string; name: string; color: string; pos: [number, number]; radius: number }[]
>([]);
  const [isMarking, setIsMarking] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]); // ✅ เก็บประวัติแจ้งเตือนรวมไว้ที่ระดับหน้า


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
    }
  }, [openHome]);
  useEffect(() => {
    if (openData) {
      setOpenHome(false);
      setOpenNotif(false);
      setShowMark(false);
    }
  }, [openData]);
  useEffect(() => {
    if (openNotif) {
      setOpenHome(false);
      setOpenData(false);
      setShowMark(false);
    }
  }, [openNotif]);
  useEffect(() => {
    if (showMark) {
      setOpenHome(false);
      setOpenData(false);
      setOpenNotif(false);
    }
  }, [showMark]);

  return (
    <main className="h-screen w-screen">
      <div className="relative h-full w-full">
        <LeafletMap
          selectedDrone={selectedDrone}
          onSelectDrone={(drone: any) => setSelectedDrone(drone)}
          followDrone={followDrone}
          marks={marks}
          setMarks={setMarks}
          isMarking={isMarking}
          onFinishMark={() => setIsMarking(false)}
          notifications={notifications}
          setNotifications={setNotifications}
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


        <RightToolbar
          onHomeClick={() => {
            setOpenData(false); // ปิด DataBar ถ้ามี
            setOpenHome((v) => !v);
          }}
          onDataClick={() => {
            setOpenHome(false); // ปิด HomeSidebar ถ้ามี
            setOpenData((v) => !v);
          }}
          onNotifClick={() => { setOpenHome(false); setOpenData(false); setOpenNotif((v)=>!v); }}
          onMarkClick={() => setShowMark(!showMark)}
        />


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

      {/* ✅ เอา FollowDroneUpdater ออกจากที่นี่เพราะอยู่นอก <MapContainer>
          จะทำให้ useMap() พัง (ไม่มี context ของ Leaflet)
          เราใช้ตัวที่อยู่ใน LeafletMap แทน ซึ่งถูกวางไว้ภายใน <MapContainer> แล้ว */}


      {showMark && (
        <MarkSidebar
          marks={marks}
          onDeleteMark={(id) => setMarks((prev) => prev.filter((m) => m.id !== id))}
          onAddMark={() => setIsMarking(true)}
          onClose={() => setShowMark(false)}
        />
      )}
    </main>
  );
}
