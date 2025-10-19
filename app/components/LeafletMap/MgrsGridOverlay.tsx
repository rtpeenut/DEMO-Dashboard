'use client';

import { Polyline, useMap } from 'react-leaflet';
import { useEffect, useState, useCallback, useMemo } from 'react';
import L from 'leaflet';

function buildMgrsGrid(bounds: L.LatLngBounds, stepMeters: number) {
  const pad = 1.5;
  const west = bounds.getWest(), east = bounds.getEast(), south = bounds.getSouth(), north = bounds.getNorth();
  const stepDeg = stepMeters / 111320;
  const latLines: [number, number][][] = [], lngLines: [number, number][][] = [];
  const latStart = south - stepDeg * pad, latEnd = north + stepDeg * pad;
  const lngStart = west - stepDeg * pad, lngEnd = east + stepDeg * pad;
  for (let lat = latStart; lat <= latEnd; lat += stepDeg) {
    const line: [number, number][] = [];
    for (let lng = lngStart; lng <= lngEnd; lng += stepDeg) line.push([lat, lng]);
    latLines.push(line);
  }
  for (let lng = lngStart; lng <= lngEnd; lng += stepDeg) {
    const line: [number, number][] = [];
    for (let lat = latStart; lat <= latEnd; lat += stepDeg) line.push([lat, lng]);
    lngLines.push(line);
  }
  return [...latLines, ...lngLines];
}

export default function MgrsGridOverlay() {
  const map = useMap();
  const [grid, setGrid] = useState<[number, number][][]>([]);
  const [step, setStep] = useState(10000);

  const rebuild = useCallback(() => {
    const z = map.getZoom();
    const stepMeters = z >= 13 ? 1000 : 10000;
    setStep(stepMeters);
    const g = buildMgrsGrid(map.getBounds().pad(0.5), stepMeters);
    setGrid(g);
  }, [map]);

  useEffect(() => {
    if (!map.getPane('mgrs-grid')) {
      const p = map.createPane('mgrs-grid');
      p.style.zIndex = '650';
      p.style.pointerEvents = 'none';
    }
    rebuild();
    map.on('moveend zoomend', rebuild);
    return () => {
      map.off('moveend zoomend', rebuild);
    };
  }, [map, rebuild]);

  const pathOptions = useMemo(
    () => ({ color: '#000000', opacity: 0.3, weight: step <= 1000 ? 1 : 1.5, pane: 'mgrs-grid', interactive: false }),
    [step]
  );

  return grid.map((line, i) => <Polyline key={i} positions={line} pathOptions={pathOptions} />);
}
