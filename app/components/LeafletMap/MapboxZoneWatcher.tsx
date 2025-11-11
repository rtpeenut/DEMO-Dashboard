"use client";

import { useEffect, useRef } from "react";
import { Drone } from "@/server/mockDatabase";

interface Mark {
  id: string;
  name: string;
  color: string;
  pos: [number, number];
  radius: number;
}

interface MapboxZoneWatcherProps {
  marks?: Mark[];
  drones: Drone[];
  isFollowing: boolean;
  onDroneInZone?: (drone: Drone, mark: Mark, event: "enter" | "exit") => void;
}

export default function MapboxZoneWatcher({
  marks,
  drones,
  isFollowing,
  onDroneInZone,
}: MapboxZoneWatcherProps) {
  const inZoneRef = useRef<Map<string, boolean>>(new Map());

  useEffect(() => {
    if (!marks || !drones || !isFollowing) return;

    marks.forEach((mark) => {
      if (!mark?.pos || mark.pos.length !== 2) return;

      drones.forEach((drone) => {
        if (!drone.position || drone.position.length < 2) return;

        // Calculate distance using Haversine formula
        const R = 6371000; // Earth radius in meters
        const lat1 = mark.pos[0] * Math.PI / 180;
        const lat2 = drone.position[0] * Math.PI / 180;
        const deltaLat = (drone.position[0] - mark.pos[0]) * Math.PI / 180;
        const deltaLng = (drone.position[1] - mark.pos[1]) * Math.PI / 180;

        const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
                  Math.cos(lat1) * Math.cos(lat2) *
                  Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const dist = R * c;

        const key = `${drone.id}-${mark.id}`;
        const wasIn = inZoneRef.current.get(key) || false;
        const isIn = dist <= mark.radius;

        if (!wasIn && isIn) {
          console.log(`🟢 Drone ${drone.callsign} เข้า ${mark.name}`);
          onDroneInZone?.(drone, mark, "enter");
          inZoneRef.current.set(key, true);
        } else if (wasIn && !isIn) {
          console.log(`🔴 Drone ${drone.callsign} ออก ${mark.name}`);
          onDroneInZone?.(drone, mark, "exit");
          inZoneRef.current.set(key, false);
        }
      });
    });
  }, [marks, drones, isFollowing, onDroneInZone]);

  return null;
}
