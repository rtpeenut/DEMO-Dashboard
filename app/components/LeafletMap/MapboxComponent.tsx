'use client';
/**
 * Component สำหรับแสดงแผนที่ Mapbox พร้อม markers ของวัตถุที่ตรวจจับได้
 * คลิก marker เพื่อแสดงรายละเอียดใน popup
 */

import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { Box, IconButton } from '@mui/material';
import { Icon } from '@iconify/react';
import { type DetectedObject } from '../types/detection';
import DetectionPopup from './DetectionPopup';
import MarkCirclePanel from '@/app/components/dashboard/MarkCirclePanel';
import NotificationPanel from '../dashboard/NotificationPanel';
import MapboxFollowDrone from './MapboxFollowDrone';
import MapboxZoneWatcher from './MapboxZoneWatcher';
import MapboxMarkZones from './MapboxMarkZones';
import MapboxDroneMarkers from './MapboxDroneMarkers';
import MapboxPinnedLocation from './MapboxPinnedLocation';
import Mapbox3DControls from './Mapbox3DControls';
import { latLngToMGRS, getColorForObjectId, getIconName } from '@/app/utils/mapUtils';
import { subscribeDrones } from "@/app/libs/MapData";
import 'mapbox-gl/dist/mapbox-gl.css';

// โหลด Iconify สำหรับใช้ dynamic icons
if (typeof window !== 'undefined') {
  const script = document.createElement('script');
  script.src = 'https://code.iconify.design/3/3.1.0/iconify.min.js';
  if (!document.querySelector('script[src*="iconify"]')) {
    document.head.appendChild(script);
  }
}

// ตำแหน่งพื้นฐานของกล้อง 2 จุด
const LOCATIONS = {
  defence: { lng: 101.166279, lat: 14.297567 },
  offence: { lng: 101.171298, lat: 14.286451 },
};

interface MapComponentProps {
  objects: DetectedObject[];
  imagePath?: string;
  cameraLocation?: string;
  // ความเข้ากันได้กับ LeafletMap เดิม
  selectedDrone?: any;
  onSelectDrone?: (drone: any) => void;
  followDrone?: any;
  marks?: { id: string; name: string; color: string; pos: [number, number]; radius: number }[];
  setMarks?: React.Dispatch<React.SetStateAction<any[]>>;
  onAddMark?: (mark: { name: string; color: string; pos: [number, number]; radius: number }) => Promise<void>;
  isMarking?: boolean;
  onFinishMark?: () => void;
  notifications?: any[];
  setNotifications?: React.Dispatch<React.SetStateAction<any[]>>;
  mapStyle?: string;
  onMapStyleChange?: (style: string) => void;
}

const MapComponent = ({
  objects,
  imagePath,
  cameraLocation,
  onSelectDrone,
  followDrone,
  marks,
  setMarks,
  onAddMark,
  isMarking,
  onFinishMark,
  notifications,
  setNotifications,
  mapStyle: externalMapStyle,
  onMapStyleChange,
}: MapComponentProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<mapboxgl.Marker[]>([]);
  const selectedMarkerRef = useRef<HTMLDivElement | null>(null);
  const mapEventHandlersBound = useRef(false);

  const [selectedObject, setSelectedObject] = useState<DetectedObject | null>(null);
  const [cardPosition, setCardPosition] = useState<{ x: number; y: number } | null>(null);
  const [pendingMark, setPendingMark] = useState<[number, number] | null>(null);
  const [drones, setDrones] = useState<any[]>([]);
  const [clickedPin, setClickedPin] = useState<{ lng: number; lat: number } | null>(null);
  const clickedPinMarker = useRef<mapboxgl.Marker | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [mapStyle, setMapStyle] = useState(externalMapStyle || 'mapbox://styles/mapbox/satellite-streets-v12');
  const [is3DEnabled, setIs3DEnabled] = useState(false);

  // Sync external map style changes
  useEffect(() => {
    if (externalMapStyle) {
      setMapStyle(externalMapStyle);
    }
  }, [externalMapStyle]);

  // ✅ รองรับทั้ง Vite และ Next.js: ใช้ import.meta.env ถ้ามี ไม่งั้น fallback เป็น NEXT_PUBLIC_MAPBOX_TOKEN
  const mapboxToken = (() => {
    try {
      // @ts-ignore - import.meta อาจไม่มีใน Next.js
      const vite = typeof import.meta !== 'undefined' ? (import.meta as any).env?.VITE_MAPBOX_TOKEN : undefined;
      // เผื่อกรณีที่เรา shim ไว้ที่ window.import.meta.env จาก layout.tsx
      const viteWindow =
        typeof window !== 'undefined'
          ? (window as any)?.import?.meta?.env?.VITE_MAPBOX_TOKEN
          : undefined;
      // เผื่ออ่านตัวแปรช่วยที่ตั้งไว้ใน layout.tsx
      const globalToken = typeof window !== 'undefined' ? (window as any).__MAPBOX_TOKEN : undefined;
      return vite || viteWindow || globalToken || process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';
    } catch {
      return process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';
    }
  })();
  (mapboxgl as any).accessToken = mapboxToken;

  // หาจุดกึ่งกลางแผนที่ตาม camera location
  const getMapCenter = () => {
    if (cameraLocation === 'defence') return [LOCATIONS.defence.lng, LOCATIONS.defence.lat];
    if (cameraLocation === 'offence') return [LOCATIONS.offence.lng, LOCATIONS.offence.lat];
    return [101.166279, 14.297567];
  };

  const handleClose = () => {
    setSelectedObject(null);
    setCardPosition(null);
    selectedMarkerRef.current = null;
  };

  // Handle pinned location close
  const handlePinClose = () => {
    setClickedPin(null);
    if (clickedPinMarker.current) {
      clickedPinMarker.current.remove();
      clickedPinMarker.current = null;
    }
  };

  // Handle copy coordinates
  const handleCopyCoordinates = () => {
    if (!clickedPin) return;
    const mgrs = latLngToMGRS(clickedPin.lat, clickedPin.lng, 5);
    const text = `Lat: ${clickedPin.lat.toFixed(6)}, Lng: ${clickedPin.lng.toFixed(6)}\nMGRS: ${mgrs}`;
    navigator.clipboard.writeText(text);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  // Handle drone zone events
  const handleDroneInZone = (drone: any, mark: any, event: "enter" | "exit") => {
    if (!setNotifications) return;
    
    setNotifications((prev: any[]) => [
      {
        id: `${drone.id}-${mark.id}-${event}-${Date.now()}`,
        message: event === "enter" ? "พบโดรนบินเข้าเขต" : "โดรนออกจากเขต",
        zoneName: mark.name,
        drone,
        time: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      },
      ...prev,
    ]);
  };

  // Subscribe drones real-time
  useEffect(() => {
    const stop = subscribeDrones(setDrones);
    return stop;
  }, []);

  // สร้างแผนที่ (run ครั้งเดียวตอน mount)
  useEffect(() => {
    if (!mapContainer.current) return;
    if (!((mapboxgl as any).accessToken)) {
      console.error("Mapbox token is missing. Please set NEXT_PUBLIC_MAPBOX_TOKEN in your .env");
      return;
    }

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: mapStyle,
      center: getMapCenter() as [number, number],
      zoom: 17,
    });



    // Bridge zoom events ให้เข้ากับ RightToolbar เดิม
    const m = map.current;
    const emitZoomChanged = () => {
      const level = m.getZoom();
      const min = m.getMinZoom();
      const max = m.getMaxZoom();
      window.dispatchEvent(new CustomEvent('app:zoomChanged', { detail: { level, min, max } }));
    };
    m.on('zoom', emitZoomChanged);
    m.on('load', emitZoomChanged);

    // ฟัง event จาก toolbar
    if (!mapEventHandlersBound.current) {
      window.addEventListener('app:mapZoom', (e: any) => {
        const dir = e?.detail?.dir ?? 0;
        if (!m) return;
        const target = m.getZoom() + (dir > 0 ? 1 : -1);
        m.easeTo({ zoom: target, duration: 250 });
      });
      window.addEventListener('app:setZoom', (e: any) => {
        const level = e?.detail?.level;
        if (typeof level === 'number') {
          m.easeTo({ zoom: level, duration: 100 });
        }
      });
      mapEventHandlersBound.current = true;
    }

    return () => {
      try {
        m.off('zoom', emitZoomChanged);
        m.off('load', emitZoomChanged);
      } catch {}
      map.current?.remove();
    };
  }, []);

  // อัพเดทจุดกึ่งกลางแผนที่เมื่อ camera location เปลี่ยน
  useEffect(() => {
    if (map.current && cameraLocation) {
      map.current.flyTo({
        center: getMapCenter() as [number, number],
        zoom: 17,
        duration: 1000,
      });
    }
  }, [cameraLocation]);

  // เปลี่ยน map style แบบ dynamic
  useEffect(() => {
    if (map.current && mapStyle) {
      map.current.setStyle(mapStyle);
    }
  }, [mapStyle]);

  // สร้าง markers สำหรับวัตถุทั้งหมด (ยกเว้นโดรน เพราะมี MapboxDroneMarkers แสดงแล้ว)
  useEffect(() => {
    if (!map.current) return;

    // ลบ markers เก่าทั้งหมด
    markers.current.forEach((marker) => marker.remove());
    markers.current = [];

    if (objects.length === 0) return;

    objects.forEach((obj) => {
      // ข้าม drone เพราะมี MapboxDroneMarkers แสดงแล้ว
      if (obj.type === 'drone') return;
      
      const color = getColorForObjectId(obj.obj_id);
      const iconName = getIconName(obj.type);

      // สร้าง DOM element สำหรับ marker
      const el = document.createElement('div');
      el.className = 'marker';
      el.style.cssText = `
        position: relative;
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
      `;

      // วงกลม pulse animation
      const pulseCircle = document.createElement('div');
      pulseCircle.className = 'pulse-circle';
      pulseCircle.style.cssText = `
        position: absolute;
        width: 60px;
        height: 60px;
        border-radius: 50%;
        background-color: ${color};
        opacity: 0.4;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        animation: pulse 2s ease-out infinite;
        pointer-events: none;
      `;

      // container สำหรับ icon
      const iconContainer = document.createElement('div');
      iconContainer.className = 'iconify-marker';
      iconContainer.style.cssText = `
        cursor: pointer;
        position: relative;
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        background-color: white;
        border-radius: 50%;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        border: 3px solid ${color};
      `;

      // icon element
      const iconElement = document.createElement('span');
      iconElement.className = 'iconify';
      iconElement.setAttribute('data-icon', iconName);
      iconElement.style.cssText = `
        color: ${color};
        font-size: 24px;
      `;

      // ประกอบ DOM elements เข้าด้วยกัน
      iconContainer.appendChild(iconElement);
      el.appendChild(pulseCircle);
      el.appendChild(iconContainer);

      // เมื่อคลิก marker
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        setSelectedObject(obj);
        selectedMarkerRef.current = el;
        // เรียก callback แบบเดิม (เลือกโดรน)
        onSelectDrone?.(obj);

        const rect = el.getBoundingClientRect();
        setCardPosition({
          x: rect.left + rect.width / 2,
          y: rect.top,
        });
      });

      const lat = typeof obj.lat === 'number' ? obj.lat : parseFloat(obj.lat);
      const lng = typeof obj.lng === 'number' ? obj.lng : parseFloat(obj.lng);

      const marker = new mapboxgl.Marker(el)
        .setLngLat([lng, lat])
        .addTo(map.current!);

      markers.current.push(marker);
    });
  }, [objects, imagePath]);



  // คลิกเพื่อปัก mark หรือปักหมุดพิกัด
  useEffect(() => {
    if (!map.current) return;
    const m = map.current;
    const onClick = (e: any) => {
      const { lng, lat } = e.lngLat;
      
      if (isMarking) {
        // โหมดสร้าง mark zone
        setPendingMark([lat, lng]);
      } else {
        // โหมดปกติ - ตรวจสอบว่าคลิกที่เดิมหรือไม่
        const isSameLocation = clickedPin && 
          Math.abs(clickedPin.lat - lat) < 0.00001 && 
          Math.abs(clickedPin.lng - lng) < 0.00001;
        
        if (isSameLocation) {
          // คลิกที่เดิม - ลบหมุด
          setClickedPin(null);
          if (clickedPinMarker.current) {
            clickedPinMarker.current.remove();
            clickedPinMarker.current = null;
          }
        } else {
          // คลิกที่ใหม่ - ปักหมุดพิกัด
          setClickedPin({ lng, lat });
          
          // ลบหมุดเก่า
          if (clickedPinMarker.current) {
            clickedPinMarker.current.remove();
          }
          
          // สร้างหมุดใหม่ (ใช้ Lucide MapPin icon)
          const pinEl = document.createElement('div');
          pinEl.style.cssText = `
            width: 40px;
            height: 40px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            filter: drop-shadow(0 2px 4px rgba(0,0,0,0.4));
          `;
          // Lucide MapPin SVG
          pinEl.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
          `;
          
          const marker = new mapboxgl.Marker(pinEl)
            .setLngLat([lng, lat])
            .addTo(m);
          
          clickedPinMarker.current = marker;
        }
      }
    };
    m.on('click', onClick);
    return () => {
      m.off('click', onClick);
    };
  }, [isMarking, clickedPin]);

  // ยืนยัน mark จาก MarkCirclePanel
  const confirmMark = async (data: { name: string; radius: number; color: string }) => {
    if (!pendingMark) return;
    
    const markData = {
      name: data.name || "Unnamed Mark",
      pos: pendingMark,
      radius: data.radius,
      color: data.color,
    };

    // Use API callback if available, otherwise fallback to setMarks
    if (onAddMark) {
      try {
        await onAddMark(markData);
        setPendingMark(null);
        onFinishMark?.();
      } catch (error) {
        console.error("Failed to create mark:", error);
        // Optionally show error to user
      }
    } else if (setMarks) {
      // Fallback to old behavior for backward compatibility
      const newMark = {
        id: crypto.randomUUID(),
        ...markData,
      };
      setMarks((prev: any[]) => [...prev, newMark]);
      setPendingMark(null);
      onFinishMark?.();
    }
  };



  // อัพเดทตำแหน่ง popup เมื่อแผนที่เลื่อนหรือ zoom
  useEffect(() => {
    if (!map.current || !selectedMarkerRef.current) return;

    const updateCardPosition = () => {
      if (selectedMarkerRef.current) {
        const rect = selectedMarkerRef.current.getBoundingClientRect();
        setCardPosition({
          x: rect.left + rect.width / 2,
          y: rect.top,
        });
      }
    };

    map.current.on('move', updateCardPosition);
    map.current.on('zoom', updateCardPosition);

    return () => {
      map.current?.off('move', updateCardPosition);
      map.current?.off('zoom', updateCardPosition);
    };
  }, [selectedObject]);

  return (
    <Box sx={{ position: 'relative', height: '100%', width: '100%' }}>
      {/* CSS Animation สำหรับ pulse effect */}
      <style>
        {`
          @keyframes pulse {
            0% {
              transform: translate(-50%, -50%) scale(0.5);
              opacity: 0.8;
            }
            50% {
              transform: translate(-50%, -50%) scale(1.2);
              opacity: 0.4;
            }
            100% {
              transform: translate(-50%, -50%) scale(1.8);
              opacity: 0;
            }
          }
        `}
      </style>

      {/* Container ของแผนที่ */}
      <Box
        ref={mapContainer}
        sx={{
          height: '100%',
          width: '100%',
          borderRadius: 1,
          overflow: 'hidden',
        }}
      />

      {/* Pinned Location Display - แสดงเฉพาะเมื่อมีการปักหมุด */}
      <MapboxPinnedLocation
        clickedPin={clickedPin}
        onClose={handlePinClose}
        copySuccess={copySuccess}
        onCopy={handleCopyCoordinates}
      />

      {/* Detection Popup */}
      {selectedObject && cardPosition && (
        <Box
          sx={{
            position: 'fixed',
            left: cardPosition.x,
            top: cardPosition.y,
            transform: 'translate(-50%, -100%)',
            zIndex: 9999,
            mb: 1,
          }}
        >
          {/* ปุ่มปิด popup */}
          <IconButton
            onClick={handleClose}
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
              backgroundColor: 'rgba(0, 0, 0, 0.6)',
              color: 'white',
              zIndex: 1,
              '&:hover': {
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
              },
            }}
          >
            <Icon icon="mdi:close" width={16} />
          </IconButton>

          <DetectionPopup object={selectedObject} imagePath={imagePath} />
        </Box>
      )}

      {/* MarkCirclePanel - กล่องตั้งค่า mark */}
      {pendingMark && (
        <MarkCirclePanel
          position={pendingMark}
          onConfirm={confirmMark}
          onCancel={() => {
            setPendingMark(null);
            onFinishMark?.();
          }}
        />
      )}

      {/* NotificationPanel - แสดงการแจ้งเตือน */}
      {notifications && setNotifications && (
        <NotificationPanel
          notifications={notifications}
          setNotifications={setNotifications}
        />
      )}

      {/* Sub-components for map features */}
      <Mapbox3DControls 
        map={map.current} 
        is3DEnabled={is3DEnabled}
        setIs3DEnabled={setIs3DEnabled}
      />
      <MapboxFollowDrone 
        map={map.current} 
        followDrone={followDrone ? drones.find(d => d.id === followDrone.id) || followDrone : null} 
      />
      <MapboxMarkZones map={map.current} marks={marks} />
      <MapboxZoneWatcher 
        marks={marks} 
        drones={drones} 
        isFollowing={!!followDrone}
        onDroneInZone={handleDroneInZone}
      />
      <MapboxDroneMarkers map={map.current} onSelect={onSelectDrone} />
    </Box>
  );
};

export default MapComponent;
