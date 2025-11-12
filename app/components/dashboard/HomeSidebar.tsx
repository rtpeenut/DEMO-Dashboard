'use client';

import { useEffect, useRef, useState } from 'react';
import { Drone, Home as HomeIcon, Camera } from 'lucide-react';
import type { Drone as DroneType, Frame } from '@/app/libs/MapData';
import { subscribeDrones, getFrameByCamId, getAllFrames } from '@/app/libs/MapData';

type DroneStatus = 'FRIEND' | 'HOSTILE' | 'UNKNOWN';

interface HomeSidebarProps {
  onClose?: () => void;
  onSelectDrone?: (drone: DroneType) => void;
  selectedCamId?: string;
  filter?: DroneStatus | 'ALL';
  onFilterChange?: (filter: DroneStatus | 'ALL') => void;
}

export default function HomeSidebar({ 
  onClose, 
  onSelectDrone,
  selectedCamId,
  filter: externalFilter,
  onFilterChange,
}: HomeSidebarProps) {
  const [drones, setDrones] = useState<DroneType[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<DroneStatus | 'ALL'>(externalFilter || 'ALL');
  const [frame, setFrame] = useState<Frame | null>(null);

  // ✅ Sync filter with external (from HUD)
  useEffect(() => {
    if (externalFilter !== undefined) {
      setStatusFilter(externalFilter);
    }
  }, [externalFilter]);

  // ✅ Update frame when cam_id changes
  useEffect(() => {
    if (selectedCamId) {
      const f = getFrameByCamId(selectedCamId);
      setFrame(f);
    } else {
      const frames = getAllFrames();
      if (frames.length > 0) {
        setFrame(frames[0]);
      }
    }
  }, [selectedCamId]);

  const ref = useRef<HTMLDivElement>(null);
  const [toolbarHeight, setToolbarHeight] = useState<number>(0);

  // ✅ จัดการขนาดแถบขวา
  useEffect(() => {
    const toolbar = document.querySelector('#right-toolbar');
    if (toolbar) {
      const { height } = toolbar.getBoundingClientRect();
      setToolbarHeight(height);
    }
  }, []);

  // ✅ ดึงข้อมูลแบบ WebSocket (subscribeDrones)
  useEffect(() => {
    try {
      const stop = subscribeDrones((list) => {
        if (Array.isArray(list)) setDrones(list);
        else {
          console.warn('Invalid WebSocket data:', list);
          setDrones([]);
        }
      });
      return stop;
    } catch (e: any) {
      console.error('WebSocket error:', e);
      setError(e.message ?? 'WebSocket connection failed');
    }
  }, []);

  return (
    <aside
      ref={ref}
      style={{
        height: toolbarHeight ? `${toolbarHeight}px` : 'auto',
        top: '50%',
        transform: 'translateY(-50%)',
        right: '88px',
      }}
      className="absolute right-4 md:right-[88px] z-[1100] w-full md:w-[395px] max-w-[calc(100vw-2rem)] md:max-w-[90vw]
             rounded-2xl p-3 text-white transition-all flex flex-col font-prompt ui-card ui-slide-from-toolbar"
    >
      <div className="mb-2 flex items-center justify-between rounded-xl px-4 py-2 text-amber-400 font-bold tracking-wider ui-header">
        <span className="flex items-center gap-2"><HomeIcon size={16} /> HOME</span>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="rounded-md text-zinc-300"
            aria-label="Close home sidebar"
          >
            ✕
          </button>
        )}
      </div>
      {/* ✅ Camera Info */}
      {frame?.token_id?.camera_info && (
        <div className="mb-3 rounded-xl bg-zinc-800/80 border border-zinc-700 px-4 py-3">
          <div className="flex items-center gap-2 text-amber-400 mb-2">
            <Camera size={16} />
            <span className="font-semibold text-sm">ข้อมูลกล้อง</span>
          </div>
          <div className="text-xs text-zinc-300 space-y-1">
            <div><span className="text-zinc-400">ชื่อ:</span> {frame.token_id.camera_info.name}</div>
            <div><span className="text-zinc-400">สถานที่:</span> {frame.token_id.camera_info.location}</div>
            <div><span className="text-zinc-400">สถาบัน:</span> {frame.token_id.camera_info.institute}</div>
          </div>
        </div>
      )}

      <div className="mb-3 rounded-xl bg-zinc-800 px-4 py-2 text-zinc-300 font-sans">
        FLIGHT
      </div>

      {error && (
        <div className="m-2 rounded-lg bg-red-500/20 px-3 py-2 text-sm text-red-200">
          Failed to load drones: {error}
        </div>
      )}
      {!error && drones.length === 0 && (
        <div className="m-2 text-sm text-zinc-400">Loading drones...</div>
      )}

      {/* ✅ รายการโดรน */}
      <div className="space-y-3 overflow-y-auto pr-1 flex-1">
        {Array.isArray(drones) &&
          drones
            .filter((d) => {
              // Filter by cam_id if selected
              if (selectedCamId && d.camId !== selectedCamId) return false;
              // Filter by status
              return statusFilter === 'ALL' || d.status === statusFilter;
            })
            .map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => onSelectDrone?.(d)}
                className="w-full rounded-xl bg-zinc-800/80 border border-zinc-700 p-4 text-left transition hover:border-amber-400 hover:bg-zinc-800"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-900/80">
                    <Drone size={32} />
                  </div>
                  <div className="flex flex-1 flex-col gap-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-amber-400 font-extrabold">{d.callsign}</div>
                        <div className="text-sm text-zinc-300">&bull; {d.type}</div>
                        {d.alt !== undefined && (
                          <div className="text-xs text-zinc-500 mt-1">
                            Alt: {d.alt.toFixed(0)} m | Speed: {d.speedKt.toFixed(1)} kt
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-zinc-400">STATUS</div>
                        <div
                          className={`font-semibold ${d.status === 'HOSTILE'
                              ? 'text-red-400'
                              : d.status === 'FRIEND'
                                ? 'text-green-400'
                                : 'text-zinc-300'
                            }`}
                        >
                          {d.status}
                        </div>
                      </div>
                    </div>

                    {/* SPEED / ALTITUDE / HEADING */}
                    <div className="flex justify-center gap-9 text-sm">
                      <div className="text-center">
                        <div className="text-zinc-400 text-xs">SPEED</div>
                        <div className="text-amber-400 font-bold">
                          {d.speedKt?.toFixed(1)} <span className="text-xs">kt</span>
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-zinc-400 text-xs">ALTITUDE</div>
                        <div className="text-amber-400 font-bold">
                          {d.altitudeFt?.toLocaleString()} <span className="text-xs">ft</span>
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-zinc-400 text-xs">HEADING</div>
                        <div className="text-amber-400 font-bold">
                          {d.headingDeg?.toFixed(2)} <span className="text-xs">°</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </button>
            ))}
      </div>

      {/* ✅ ตัวกรองสถานะโดรน */}
      <div className="mt-3 rounded-xl bg-zinc-800 border border-zinc-700 p-3">
        <div className="flex items-center gap-2 text-xs flex-nowrap overflow-x-auto">
          {(['ALL', 'FRIEND', 'HOSTILE', 'UNKNOWN'] as const).map((status) => {
            const active = statusFilter === status;
            const indicatorClass =
              status === 'FRIEND'
                ? 'bg-green-400'
                : status === 'HOSTILE'
                  ? 'bg-amber-400'
                  : status === 'UNKNOWN'
                    ? 'bg-zinc-400'
                    : 'bg-zinc-500';
            return (
              <button
                key={status}
                type="button"
                onClick={() => {
                  setStatusFilter(status);
                  onFilterChange?.(status);
                }}
                aria-pressed={active}
                className={`flex items-center gap-2 rounded-lg border px-2 py-1 transition focus:outline-none whitespace-nowrap ${active
                    ? 'border-amber-500 bg-amber-500 text-zinc-900 shadow-lg'
                    : 'border-zinc-600 bg-zinc-900/60 text-zinc-200 hover:border-amber-300 hover:text-amber-100'
                  }`}
              >
                <span
                  className={`inline-block h-3 w-3 rounded-full ${indicatorClass} ${active ? 'ring-2 ring-offset-1 ring-amber-200 ring-offset-transparent' : ''
                    }`}
                />
                <span>{status}</span>
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
