'use client';

import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

interface MapboxSecondaryMapProps {
  mapStyle?: string;
  followDrone?: any;
  drones?: any[];
  marks?: any[];
}

export default function MapboxSecondaryMap({ 
  mapStyle = 'mapbox://styles/mapbox/dark-v11',
  followDrone,
  drones = [],
  marks = []
}: MapboxSecondaryMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    // Initialize map
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: mapStyle,
      center: [100.5, 13.75], // Default center (Bangkok)
      zoom: 12,
      pitch: 0,
      bearing: 0,
    });

    // Add navigation controls
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-left');

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // Update map style when changed
  useEffect(() => {
    if (map.current && mapStyle) {
      map.current.setStyle(mapStyle);
    }
  }, [mapStyle]);

  // Follow drone
  useEffect(() => {
    if (map.current && followDrone && followDrone.position) {
      const [lat, lng] = followDrone.position;
      map.current.flyTo({
        center: [lng, lat],
        zoom: 15,
        duration: 1000
      });
    }
  }, [followDrone]);

  return (
    <div className="relative w-full h-full bg-zinc-900">
      <div ref={mapContainer} className="w-full h-full" />
    </div>
  );
}
