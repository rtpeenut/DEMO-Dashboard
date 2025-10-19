"use client";

import { useEffect, useRef } from "react";
import { Circle, Marker } from "react-leaflet"; //ใช้จาก react-leaflet
import L from "leaflet";
import { Drone } from "@/server/mockDatabase";

interface Mark {
  id: string;
  name: string;
  color: string;
  pos: [number, number];
  radius: number;
}

interface MarkZoneWatcherProps {
  mark: Mark;
  drones: Drone[];
  isFollowing: boolean;
  onDroneInZone?: (drone: Drone, event: "enter" | "exit") => void;
}

export default function MarkZoneWatcher({
  mark,
  drones,
  isFollowing,
  onDroneInZone,
}: MarkZoneWatcherProps) {
  const inZoneRef = useRef<Map<string, boolean>>(new Map());

  useEffect(() => {
    if (!mark?.pos || mark.pos.length !== 2 || !drones?.length) return;

    const markLatLng = L.latLng(mark.pos[0], mark.pos[1]);
    const radius = mark.radius;

    drones.forEach((drone) => {
      if (!drone.position) return;

      const droneLatLng = L.latLng(drone.position[0], drone.position[1]);
      const dist = markLatLng.distanceTo(droneLatLng);

      const key = `${drone.id}-${mark.id}`;
      const wasIn = inZoneRef.current.get(key) || false;
      const isIn = dist <= radius;

      if (!wasIn && isIn) {
        console.log(`🟢 Drone ${drone.callsign} เข้า ${mark.name}`);
        onDroneInZone?.(drone, "enter");
      } else if (wasIn && !isIn) {
        console.log(`🔴 Drone ${drone.callsign} ออก ${mark.name}`);
        onDroneInZone?.(drone, "exit");
      }

      inZoneRef.current.set(key, isIn);
    });
  }, [mark, drones]);

  return (
    <>
      <Circle
        center={mark.pos}
        radius={mark.radius}
        pathOptions={{
          color: mark.color,
          fillColor: mark.color,
          fillOpacity: 0.25,
        }}
      />
      <Marker
        position={mark.pos}
        icon={L.divIcon({
          html: `<div style="color:${mark.color};font-weight:bold;
          text-shadow:0 0 4px rgba(0,0,0,0.8);font-size:13px;
          text-align:center;">${mark.name}</div>`,
          className: "mark-label",
        })}
      />
    </>
  );
}
