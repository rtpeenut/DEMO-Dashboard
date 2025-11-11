"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";

interface Mark {
  id: string;
  name: string;
  color: string;
  pos: [number, number];
  radius: number;
}

interface MapboxMarkZonesProps {
  map: mapboxgl.Map | null;
  marks?: Mark[];
}

export default function MapboxMarkZones({ map, marks }: MapboxMarkZonesProps) {
  const markCircles = useRef<string[]>([]);
  const markLabels = useRef<mapboxgl.Marker[]>([]);

  useEffect(() => {
    if (!map || !marks) return;

    const drawMarks = () => {
      // Remove old layers and sources
      markCircles.current.forEach((sourceId) => {
        const layerId = `mark-layer-${sourceId}`;
        const borderLayerId = `${layerId}-border`;
        
        try {
          if (map.getLayer(borderLayerId)) map.removeLayer(borderLayerId);
          if (map.getLayer(layerId)) map.removeLayer(layerId);
          if (map.getSource(sourceId)) map.removeSource(sourceId);
        } catch (e) {
          // ignore
        }
      });
      markCircles.current = [];
      
      markLabels.current.forEach((label) => label.remove());
      markLabels.current = [];

      // Draw new marks
      marks.forEach((mark) => {
        const sourceId = `mark-${mark.id}`;
        const layerId = `mark-layer-${sourceId}`;
        const borderLayerId = `${layerId}-border`;

        // Check if source exists
        if (map.getSource(sourceId)) {
          try {
            if (map.getLayer(borderLayerId)) map.removeLayer(borderLayerId);
            if (map.getLayer(layerId)) map.removeLayer(layerId);
            map.removeSource(sourceId);
          } catch (e) {
            // ignore
          }
        }

        // Create GeoJSON circle
        const radiusInKm = mark.radius / 1000;
        const points = 64;
        const coords = [];
        
        for (let i = 0; i < points; i++) {
          const angle = (i / points) * 2 * Math.PI;
          const dx = radiusInKm * Math.cos(angle);
          const dy = radiusInKm * Math.sin(angle);
          const lat = mark.pos[0] + (dy / 111.32);
          const lng = mark.pos[1] + (dx / (111.32 * Math.cos(mark.pos[0] * Math.PI / 180)));
          coords.push([lng, lat]);
        }
        coords.push(coords[0]);

        map.addSource(sourceId, {
          type: 'geojson',
          data: {
            type: 'Feature',
            geometry: {
              type: 'Polygon',
              coordinates: [coords],
            },
            properties: {},
          },
        });

        // Fill layer
        map.addLayer({
          id: layerId,
          type: 'fill',
          source: sourceId,
          paint: {
            'fill-color': mark.color || '#f59e0b',
            'fill-opacity': 0.2,
          },
        });

        // Border layer
        map.addLayer({
          id: borderLayerId,
          type: 'line',
          source: sourceId,
          paint: {
            'line-color': mark.color || '#f59e0b',
            'line-width': 2,
            'line-opacity': 0.8,
          },
        });

        markCircles.current.push(sourceId);

        // Add label
        const labelEl = document.createElement('div');
        labelEl.style.cssText = `
          color: ${mark.color};
          font-weight: bold;
          text-shadow: 0 0 4px rgba(0,0,0,0.8);
          font-size: 13px;
          text-align: center;
          white-space: nowrap;
          pointer-events: none;
        `;
        labelEl.textContent = mark.name || "Unnamed";

        const labelMarker = new mapboxgl.Marker(labelEl)
          .setLngLat([mark.pos[1], mark.pos[0]])
          .addTo(map);

        markLabels.current.push(labelMarker);
      });
    };

    if (map.isStyleLoaded()) {
      drawMarks();
    } else {
      map.once('load', drawMarks);
    }

    return () => {
      markCircles.current.forEach((sourceId) => {
        const layerId = `mark-layer-${sourceId}`;
        const borderLayerId = `${layerId}-border`;
        
        try {
          if (map.getLayer(borderLayerId)) map.removeLayer(borderLayerId);
          if (map.getLayer(layerId)) map.removeLayer(layerId);
          if (map.getSource(sourceId)) map.removeSource(sourceId);
        } catch (e) {
          // ignore
        }
      });
      markCircles.current = [];
      
      markLabels.current.forEach((label) => label.remove());
      markLabels.current = [];
    };
  }, [map, marks]);

  return null;
}
