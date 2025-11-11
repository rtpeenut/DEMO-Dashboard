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
}

const MapComponent = ({ objects, imagePath, cameraLocation }: MapComponentProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<mapboxgl.Marker[]>([]);
  const selectedMarkerRef = useRef<HTMLDivElement | null>(null);

  const [selectedObject, setSelectedObject] = useState<DetectedObject | null>(null);
  const [cardPosition, setCardPosition] = useState<{ x: number; y: number } | null>(null);

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

  // หา icon name ตามประเภทวัตถุ
  const getIconName = (type: string): string => {
    const iconMap: Record<string, string> = {
      person: 'mdi:account',
      car: 'mdi:car',
      truck: 'mdi:truck',
      bike: 'mdi:bike',
      drone: 'healthicons:drone',
      default: 'mdi:map-marker',
    };
    return iconMap[type.toLowerCase()] || iconMap.default;
  };

  // สร้างสีจาก object ID (แต่ละ ID จะได้สีไม่ซ้ำกัน)
  const getColorForObjectId = (objectId: string): string => {
    const colors = [
      '#FF5722', '#2196F3', '#4CAF50', '#FFC107', '#9C27B0',
      '#00BCD4', '#E91E63', '#FF9800', '#009688', '#F44336',
      '#3F51B5', '#8BC34A', '#FFEB3B', '#673AB7', '#00E676',
    ];

    let hash = 0;
    for (let i = 0; i < objectId.length; i++) {
      hash = objectId.charCodeAt(i) + ((hash << 5) - hash);
    }

    const index = Math.abs(hash) % colors.length;
    return colors[index];
  };

  const handleClose = () => {
    setSelectedObject(null);
    setCardPosition(null);
    selectedMarkerRef.current = null;
  };

  // สร้างแผนที่ (run ครั้งเดียวตอน mount)
  useEffect(() => {
    if (!mapContainer.current) return;
    if (!((mapboxgl as any).accessToken)) {
      console.error("Mapbox token is missing. Please set NEXT_PUBLIC_MAPBOX_TOKEN in your .env");
      return;
    }

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/satellite-streets-v12',
      center: getMapCenter() as [number, number],
      zoom: 17,
    });

    return () => {
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

  // สร้าง markers สำหรับวัตถุทั้งหมด
  useEffect(() => {
    if (!map.current) return;

    // ลบ markers เก่าทั้งหมด
    markers.current.forEach((marker) => marker.remove());
    markers.current = [];

    if (objects.length === 0) return;

    objects.forEach((obj) => {
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
    </Box>
  );
};

export default MapComponent;
