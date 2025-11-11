'use client';

import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';

interface MapboxClickHandlerProps {
  map: mapboxgl.Map | null;
  isMarking: boolean;
  onMarkClick: (pos: [number, number]) => void;
  onPinClick: (pin: { lng: number; lat: number } | null) => void;
  clickedPin: { lng: number; lat: number } | null;
}

export default function MapboxClickHandler({ 
  map, 
  isMarking, 
  onMarkClick,
  onPinClick,
  clickedPin
}: MapboxClickHandlerProps) {
  const clickedPinMarker = useRef<mapboxgl.Marker | null>(null);

  // Handle map clicks
  useEffect(() => {
    if (!map) return;
    
    const onClick = (e: any) => {
      const { lng, lat } = e.lngLat;
      
      if (isMarking) {
        // โหมดสร้าง mark zone
        onMarkClick([lat, lng]);
      } else {
        // โหมดปกติ - ตรวจสอบว่าคลิกที่เดิมหรือไม่
        const isSameLocation = clickedPin && 
          Math.abs(clickedPin.lat - lat) < 0.00001 && 
          Math.abs(clickedPin.lng - lng) < 0.00001;
        
        if (isSameLocation) {
          // คลิกที่เดิม - ลบหมุด
          onPinClick(null);
          if (clickedPinMarker.current) {
            clickedPinMarker.current.remove();
            clickedPinMarker.current = null;
          }
        } else {
          // คลิกที่ใหม่ - ปักหมุดพิกัด
          onPinClick({ lng, lat });
          
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
            .addTo(map);
          
          clickedPinMarker.current = marker;
        }
      }
    };
    
    map.on('click', onClick);
    return () => {
      map.off('click', onClick);
    };
  }, [map, isMarking, clickedPin, onMarkClick, onPinClick]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (clickedPinMarker.current) {
        clickedPinMarker.current.remove();
        clickedPinMarker.current = null;
      }
    };
  }, []);

  return null;
}
