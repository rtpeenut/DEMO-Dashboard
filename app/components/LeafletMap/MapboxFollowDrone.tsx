"use client";

import { useEffect } from "react";
import mapboxgl from "mapbox-gl";

interface MapboxFollowDroneProps {
  map: mapboxgl.Map | null;
  followDrone?: {
    id: string;
    position?: [number, number];
  } | null;
}

export default function MapboxFollowDrone({ map, followDrone }: MapboxFollowDroneProps) {
  useEffect(() => {
    if (!map || !followDrone?.position) return;

    const [lat, lng] = followDrone.position;
    const center = map.getCenter();
    
    // Calculate distance
    const R = 6371000; // Earth radius in meters
    const lat1 = center.lat * Math.PI / 180;
    const lat2 = lat * Math.PI / 180;
    const deltaLat = (lat - center.lat) * Math.PI / 180;
    const deltaLng = (lng - center.lng) * Math.PI / 180;

    const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
              Math.cos(lat1) * Math.cos(lat2) *
              Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const dist = R * c;

    // Only move if drone is more than 20m from center
    if (dist > 20) {
      map.flyTo({ 
        center: [lng, lat], 
        zoom: Math.max(map.getZoom(), 15),
        duration: 1200 
      });
    }
  }, [map, followDrone?.position]);

  return null;
}
