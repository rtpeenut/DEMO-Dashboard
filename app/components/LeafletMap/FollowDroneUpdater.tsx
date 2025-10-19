"use client";

import { useEffect } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";

interface FollowDroneUpdaterProps {
  followDrone?: {
    id: string;
    position?: [number, number];
  } | null;
}

export default function FollowDroneUpdater({ followDrone }: FollowDroneUpdaterProps) {
  const map = useMap();

  useEffect(() => {
    if (!followDrone?.position) return;

    const [lat, lng] = followDrone.position;
    const mapCenter = map.getCenter();
    const dist = mapCenter.distanceTo(L.latLng(lat, lng));

    // ✅ เคลื่อนที่เฉพาะเมื่อโดรนออกจากศูนย์กลางเกิน 20 เมตร
    if (dist > 20) {
      map.flyTo([lat, lng], map.getZoom(), { duration: 1.2 });
    }
  }, [followDrone?.position, map]);

  return null;
}
