"use client";

import { useEffect, useState, useRef } from "react";
import mapboxgl from "mapbox-gl";
import { Drone, subscribeDrones, subscribeDronesApi } from "@/server/mockDatabase";

interface MapboxDroneMarkersProps {
  map: mapboxgl.Map | null;
  onSelect?: (d: Drone) => void;
}

export default function MapboxDroneMarkers({ map, onSelect }: MapboxDroneMarkersProps) {
  const [drones, setDrones] = useState<Drone[]>([]);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const previousPositions = useRef<Map<string, [number, number]>>(new Map());

  // Subscribe to drones
  useEffect(() => {
    const useApi = process.env.NEXT_PUBLIC_DATA_SOURCE === "api";
    const stop = (useApi ? subscribeDronesApi : subscribeDrones)((list) => {
      if (Array.isArray(list)) setDrones(list);
      else console.warn("Invalid drones data:", list);
    });
    return stop;
  }, []);

  // Check if drone is moving
  const isDroneMoving = (droneId: string, currentPos: [number, number]): boolean => {
    const prevPos = previousPositions.current.get(droneId);
    if (!prevPos) {
      previousPositions.current.set(droneId, currentPos);
      return true; // Assume moving on first appearance
    }

    const [prevLat, prevLng] = prevPos;
    const [currLat, currLng] = currentPos;
    const moved = Math.abs(prevLat - currLat) > 0.00001 || Math.abs(prevLng - currLng) > 0.00001;

    if (moved) {
      previousPositions.current.set(droneId, currentPos);
    }

    return moved;
  };

  // Update markers
  useEffect(() => {
    if (!map || !Array.isArray(drones)) return;

    // Remove old markers
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    if (drones.length === 0) return;

    drones.forEach((drone) => {
      if (!drone.position || drone.position.length < 2) return;
      const [lat, lng] = drone.position;

      const color = drone.status === "FRIEND" ? "#4ade80" : "#f87171";
      const isMoving = isDroneMoving(drone.id, [lat, lng]);

      // Create marker element with pulse animation if moving
      const el = document.createElement('div');
      el.style.cssText = `
        position: relative;
        width: 24px;
        height: 24px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
      `;

      // Add pulse animation if drone is moving
      if (isMoving) {
        const pulseCircle = document.createElement('div');
        pulseCircle.className = 'drone-pulse';
        pulseCircle.style.cssText = `
          position: absolute;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background-color: ${color};
          opacity: 0.4;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          animation: dronePulse 2s ease-out infinite;
          pointer-events: none;
        `;
        el.appendChild(pulseCircle);
      }

      // Drone icon
      const iconEl = document.createElement('div');
      iconEl.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="${color}" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" fill="${color}" opacity="0.8"/>
          <circle cx="12" cy="12" r="6" fill="white"/>
        </svg>
      `;
      el.appendChild(iconEl);

      // Create popup
      const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
        <div style="font-size: 12px; font-family: system-ui;">
          <strong>${drone.callsign}</strong><br/>
          ${drone.altitudeFt.toFixed(0)} ft<br/>
          ${drone.speedKt.toFixed(1)} kt
        </div>
      `);

      el.addEventListener('click', (e) => {
        e.stopPropagation();
        onSelect?.(drone);
      });

      const marker = new mapboxgl.Marker(el)
        .setLngLat([lng, lat])
        .setPopup(popup)
        .addTo(map);

      markersRef.current.push(marker);
    });

    return () => {
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
    };
  }, [map, drones, onSelect]);

  return null;
}
