'use client';

import { useEffect, useState, useRef } from 'react';
import { Drone, Shield, Swords, HelpCircle, MapPin, Navigation } from 'lucide-react';
import { subscribeDrones, subscribeDronesApi } from '@/app/libs/MapData';
import type { Drone as DroneType } from '@/app/libs/MapData';

interface DroneStats {
  total: number;
  friend: number;
  hostile: number;
  unknown: number;
}

interface DroneCounterProps {
  marksCount?: number;
  map?: mapboxgl.Map | null;
  onNewDroneDetected?: (notification: {
    id: string;
    message: string;
    zoneName: string;
    drone: DroneType;
    time: string;
  }) => void;
  onDroneLost?: (notification: {
    id: string;
    message: string;
    zoneName: string;
    drone: DroneType;
    time: string;
  }) => void;
}

export default function DroneCounter({ marksCount = 0, map, onNewDroneDetected, onDroneLost }: DroneCounterProps) {
  const [stats, setStats] = useState<DroneStats>({
    total: 0,
    friend: 0,
    hostile: 0,
    unknown: 0,
  });
  const [bearing, setBearing] = useState(0);
  const knownDroneIds = useRef<Set<string>>(new Set());
  const knownDrones = useRef<Map<string, DroneType>>(new Map());
  const missingDroneTimers = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // ✅ Listen to map bearing changes
  useEffect(() => {
    if (!map) return;

    const updateBearing = () => {
      const currentBearing = map.getBearing();
      setBearing(currentBearing);
    };

    updateBearing();
    map.on('rotate', updateBearing);

    return () => {
      map.off('rotate', updateBearing);
    };
  }, [map]);

  // ✅ Cleanup timers on unmount
  useEffect(() => {
    return () => {
      missingDroneTimers.current.forEach((timer) => clearTimeout(timer));
      missingDroneTimers.current.clear();
    };
  }, []);

  useEffect(() => {
    const useApi = process.env.NEXT_PUBLIC_DATA_SOURCE === 'api';
    const stop = (useApi ? subscribeDronesApi : subscribeDrones)((list) => {
      if (Array.isArray(list)) {
        const friend = list.filter((d: any) => d.status === 'FRIEND').length;
        const hostile = list.filter((d: any) => d.status === 'HOSTILE').length;
        const unknown = list.filter((d: any) => d.status === 'UNKNOWN').length;
        
        setStats({
          total: list.length,
          friend,
          hostile,
          unknown,
        });

        // ✅ สร้าง Set ของ drone IDs ที่มีในรายการปัจจุบัน
        const currentDroneIds = new Set(list.map((d: DroneType) => d.id));

        // ✅ ตรวจจับโดรนใหม่และยกเลิก timer ถ้าโดรนกลับมา
        list.forEach((drone: DroneType) => {
          // ✅ ถ้าโดรนกลับมาและมี timer รออยู่ ให้ยกเลิก timer
          if (missingDroneTimers.current.has(drone.id)) {
            clearTimeout(missingDroneTimers.current.get(drone.id)!);
            missingDroneTimers.current.delete(drone.id);
          }

          if (!knownDroneIds.current.has(drone.id)) {
            knownDroneIds.current.add(drone.id);
            knownDrones.current.set(drone.id, drone);
            
            const timestamp = Date.now();
            const timeString = new Date(timestamp).toLocaleTimeString('th-TH', { 
              hour: '2-digit', 
              minute: '2-digit' 
            });
            
            // ✅ ส่งข้อมูลไปยัง parent เพื่อเก็บใน NotificationSidebar
            if (onNewDroneDetected) {
              onNewDroneDetected({
                id: `drone-detected-${drone.id}-${timestamp}`,
                message: 'ตรวจพบโดรนใหม่',
                zoneName: '',
                drone: drone,
                time: timeString,
              });
            }
          } else {
            // ✅ อัปเดตข้อมูลโดรนที่มีอยู่แล้ว
            knownDrones.current.set(drone.id, drone);
          }
        });

        // ✅ ตรวจจับโดรนที่หายไป (รอ 7 วินาทีก่อนแจ้งเตือน)
        knownDroneIds.current.forEach((droneId) => {
          if (!currentDroneIds.has(droneId)) {
            // ✅ ถ้ายังไม่มี timer สำหรับโดรนนี้ ให้สร้างใหม่
            if (!missingDroneTimers.current.has(droneId)) {
              const lostDrone = knownDrones.current.get(droneId);
              if (lostDrone) {
                // ✅ ตั้ง timer รอ 7 วินาที
                const timer = setTimeout(() => {
                  const timestamp = Date.now();
                  const timeString = new Date(timestamp).toLocaleTimeString('th-TH', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  });
                  
                  // ✅ ส่งการแจ้งเตือนโดรนหายไป
                  if (onDroneLost) {
                    onDroneLost({
                      id: `drone-lost-${droneId}-${timestamp}`,
                      message: 'โดรนหายจากแมพ',
                      zoneName: '',
                      drone: lostDrone,
                      time: timeString,
                    });
                  }
                  
                  // ✅ ลบออกจาก tracking
                  knownDroneIds.current.delete(droneId);
                  knownDrones.current.delete(droneId);
                  missingDroneTimers.current.delete(droneId);
                }, 7000); // 7 วินาที
                
                missingDroneTimers.current.set(droneId, timer);
              }
            }
          }
        });
      }
    });
    return stop;
  }, [onNewDroneDetected, onDroneLost]);

  // ✅ คำนวณทิศหลักที่ใกล้ที่สุด
  const getCardinalDirection = (deg: number): string => {
    const normalized = ((deg % 360) + 360) % 360;
    if (normalized >= 337.5 || normalized < 22.5) return 'N';
    if (normalized >= 22.5 && normalized < 67.5) return 'NE';
    if (normalized >= 67.5 && normalized < 112.5) return 'E';
    if (normalized >= 112.5 && normalized < 157.5) return 'SE';
    if (normalized >= 157.5 && normalized < 202.5) return 'S';
    if (normalized >= 202.5 && normalized < 247.5) return 'SW';
    if (normalized >= 247.5 && normalized < 292.5) return 'W';
    if (normalized >= 292.5 && normalized < 337.5) return 'NW';
    return 'N';
  };

  const direction = getCardinalDirection(bearing);

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000]">
      <div className="flex items-center gap-3 rounded-xl px-4 py-2 ui-card">
        {/* Total */}
        <div className="flex items-center gap-2">
          <Drone size={18} className="text-amber-400" />
          <span className="text-white font-semibold text-sm">{stats.total}</span>
        </div>

        <div className="h-5 w-px bg-zinc-700" />

        {/* Friend */}
        <div className="flex items-center gap-1.5">
          <Shield size={16} className="text-green-400" />
          <span className="text-green-400 font-semibold text-sm">{stats.friend}</span>
        </div>

        {/* Hostile */}
        <div className="flex items-center gap-1.5">
          <Swords size={16} className="text-red-400" />
          <span className="text-red-400 font-semibold text-sm">{stats.hostile}</span>
        </div>

        {/* Unknown */}
        <div className="flex items-center gap-1.5">
          <HelpCircle size={16} className="text-zinc-400" />
          <span className="text-zinc-400 font-semibold text-sm">{stats.unknown}</span>
        </div>

        <div className="h-5 w-px bg-zinc-700" />

        {/* Marks */}
        <div className="flex items-center gap-1.5">
          <MapPin size={16} className="text-blue-400" />
          <span className="text-blue-400 font-semibold text-sm">{marksCount}</span>
        </div>

        <div className="h-5 w-px bg-zinc-700" />

        {/* Compass */}
        <div className="flex items-center gap-2">
          <div
            style={{
              transform: `rotate(${-bearing}deg)`,
              transition: 'transform 0.3s ease-out',
            }}
          >
            <Navigation
              size={18}
              className="text-amber-400"
              fill="currentColor"
            />
          </div>
          <span className="text-amber-400 font-bold text-sm min-w-[24px]">{direction}</span>
          <span className="text-white font-semibold text-sm font-mono">{Math.abs(Math.round(bearing))}°</span>
        </div>
      </div>
    </div>
  );
}
