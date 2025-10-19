'use client';

import { useMap } from 'react-leaflet';
import { useEffect, useState } from 'react';
import * as mgrs from 'mgrs';
import L from 'leaflet';
import { Copy } from "lucide-react";

function toMGRS(lat: number, lng: number, precision = 5) {
  try {
    return mgrs.forward([lng, lat], precision);
  } catch {
    return '';
  }
}

export default function MgrsCursorOverlay({ precision = 5 }: { precision?: number }) {
  const [mgrsStr, setMgrsStr] = useState('');
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [marker, setMarker] = useState<L.Marker | null>(null);

  const map = useMap();

  useEffect(() => {
    const onClick = (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;

      // ถ้ามีหมุดอยู่ และคลิกในระยะใกล้กับหมุดเดิม → ลบหมุด
      if (marker) {
        const oldPos = marker.getLatLng();
        const dist = map.distance([lat, lng], oldPos);
        if (dist < 15) { // ถ้าคลิกซ้ำจุดเดิม (ภายใน ~15m)
          marker.remove();
          setMarker(null);
          setMgrsStr('');
          setLat(null);
          setLng(null);
          return;
        } else {
          marker.remove();
        }
      }

      const mgrsCode = toMGRS(lat, lng, precision);
      setMgrsStr(mgrsCode);
      setLat(lat);
      setLng(lng);

      // ✅ ปักหมุดใหม่
      const newMarker = L.marker([lat, lng], {
        icon: L.divIcon({
          html: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffb300" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>`,
          className: "",
          iconAnchor: [11, 22],
        }),
      }).addTo(map);

      // ✅ ถ้าคลิกที่ marker เดิม → เอาออก
      newMarker.on('click', () => {
        newMarker.remove();
        setMarker(null);
        setMgrsStr('');
        setLat(null);
        setLng(null);
      });

      setMarker(newMarker);
    };

    map.on('click', onClick);
    return () => {
      map.off('click', onClick);
    };
  }, [map, precision, marker]);

  const handleCopy = async () => {
    if (!mgrsStr) return;
    try {
      await navigator.clipboard.writeText(mgrsStr);
      alert(`📋 Copied MGRS: ${mgrsStr}`);
    } catch {
      console.error("Copy failed");
    }
  };

  return (
    <>
      {/* กล่องแสดงค่า MGRS */}
      <div className="pointer-events-none absolute left-3 bottom-3 z-[1200] font-prompt">
        <div className="pointer-events-auto rounded-xl border border-zinc-700 bg-zinc-900/90 px-3 py-2 text-sm text-zinc-200 backdrop-blur shadow">
          <div className="text-xs text-zinc-400">MGRS</div>
          <div className="font-mono text-amber-300 break-all">{mgrsStr || '—'}</div>

          {lat && lng && (
            <div className="mt-1 text-[11px] text-zinc-400">
              Lat {lat.toFixed(6)}, Lng {lng.toFixed(6)}
            </div>
          )}

          {/* ✅ ปุ่ม Copy */}
          {mgrsStr && (
            <button
              onClick={handleCopy}
              className="mt-2 w-full flex items-center justify-center rounded-md bg-zinc-800 hover:bg-zinc-700 text-xs py-1 transition"
            >
              <Copy size={14} className="text-zinc-400" />
            </button>
          )}
        </div>
      </div>
    </>
  );
}
