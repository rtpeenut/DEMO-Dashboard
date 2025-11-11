'use client';

import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import { type DetectedObject } from '../types/detection';
import { getColorForObjectId, getIconName } from '@/app/utils/mapUtils';

interface MapboxObjectMarkersProps {
  map: mapboxgl.Map | null;
  objects: DetectedObject[];
  imagePath?: string;
  onSelectObject: (obj: DetectedObject, element: HTMLDivElement) => void;
}

export default function MapboxObjectMarkers({ 
  map, 
  objects, 
  imagePath,
  onSelectObject 
}: MapboxObjectMarkersProps) {
  const markers = useRef<mapboxgl.Marker[]>([]);

  useEffect(() => {
    if (!map) return;

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
        onSelectObject(obj, el);
      });

      const lat = typeof obj.lat === 'number' ? obj.lat : parseFloat(obj.lat);
      const lng = typeof obj.lng === 'number' ? obj.lng : parseFloat(obj.lng);

      const marker = new mapboxgl.Marker(el)
        .setLngLat([lng, lat])
        .addTo(map);

      markers.current.push(marker);
    });

    return () => {
      markers.current.forEach((marker) => marker.remove());
      markers.current = [];
    };
  }, [map, objects, imagePath, onSelectObject]);

  return null;
}
