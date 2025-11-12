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

  // ✅ Sync filter with external (from HUD)
  useEffect(() => {
    if (externalFilter !== undefined) {
      setStatusFilter(externalFilter);
    }
  }, [externalFilter]);

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
      {/* ✅ Information Header */}
      <div className="mb-2 rounded-xl bg-zinc-800 px-4 py-2 text-zinc-300 font-sans text-sm">
        INFORMATION
      </div>

      {/* ✅ Camera Info - แสดงด้านนอก */}
      {(() => {
        const allFrames = getAllFrames();
        const currentFrame = selectedCamId ? getFrameByCamId(selectedCamId) : allFrames[0];
        
        return currentFrame?.token_id?.camera_info ? (
          <div className="mb-3 rounded-xl bg-zinc-800/60 border border-zinc-700/50 px-3 py-2.5">
            <div className="flex items-center gap-2 text-amber-400 mb-2">
              <Camera size={14} />
              <span className="font-semibold text-xs uppercase">Camera Information</span>
            </div>
            <div className="text-xs text-zinc-300 space-y-1">
              <div className="flex gap-2">
                <span className="text-zinc-500 min-w-[60px]">ชื่อ:</span>
                <span className="text-zinc-200">{currentFrame.token_id.camera_info.name}</span>
              </div>
              <div className="flex gap-2">
                <span className="text-zinc-500 min-w-[60px]">สถานที่:</span>
                <span className="text-zinc-200">{currentFrame.token_id.camera_info.location}</span>
              </div>
              <div className="flex gap-2">
                <span className="text-zinc-500 min-w-[60px]">สถาบัน:</span>
                <span className="text-zinc-200">{currentFrame.token_id.camera_info.institute}</span>
              </div>
            </div>
          </div>
        ) : null;
      })()}

      {error && (
        <div className="m-2 rounded-lg bg-red-500/20 px-3 py-2 text-sm text-red-200">
          Failed to load drones: {error}
        </div>
      )}
      {!error && drones.length === 0 && (
        <div className="m-2 text-sm text-zinc-400">Loading drones...</div>
      )}

      {/* ✅ รายการโดรนจัดกลุ่มตาม Frame และ Camera */}
      <div className="space-y-4 overflow-y-auto pr-1 flex-1">
        {(() => {
          // Group drones by camId
          const groupedDrones = new Map<string, DroneType[]>();
          const filteredDrones = drones.filter((d) => {
            if (selectedCamId && d.camId !== selectedCamId) return false;
            return statusFilter === 'ALL' || d.status === statusFilter;
          });

          filteredDrones.forEach((d) => {
            const camId = d.camId || 'unknown';
            if (!groupedDrones.has(camId)) {
              groupedDrones.set(camId, []);
            }
            groupedDrones.get(camId)!.push(d);
          });

          return Array.from(groupedDrones.entries()).map(([camId, drones]) => {
            const frameData = getFrameByCamId(camId);
            const framId = frameData?.fram_id || 'unknown';
            
            return (
              <div key={camId} className="rounded-2xl bg-zinc-900/60 border border-zinc-700/50 p-4">
                {/* Header: Frame ID และ Camera ID */}
                <div className="mb-3 space-y-1.5">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-zinc-400 font-medium">FRAME:</span>
                    <span className="text-amber-400 font-bold text-base">{framId}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-zinc-400 font-medium text-xs">CAM:</span>
                    <span className="text-white text-[10px] font-mono break-all">{camId}</span>
                  </div>
                </div>

                {/* รายการโดรนในกลุ่มนี้ */}
                <div className="space-y-3">
                  {drones.map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => onSelectDrone?.(d)}
                      className="w-full rounded-xl bg-zinc-800/80 border border-zinc-700 p-3 text-left transition hover:border-amber-400 hover:bg-zinc-800"
                    >
                      <div className="flex items-center gap-3">
                        {/* Icon */}
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-900/80">
                          <Drone size={24} className="text-zinc-400" />
                        </div>

                        {/* ข้อมูลโดรน */}
                        <div className="flex flex-1 flex-col gap-2">
                          {/* บรรทัดแรก: ชื่อและสถานะ */}
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="text-amber-400 font-bold text-base">{d.callsign}</div>
                              <div className="text-xs text-zinc-400">&bull; {d.type}</div>
                            </div>
                            <div className="text-right">
                              <div className="text-[10px] text-zinc-500 uppercase">STATUS</div>
                              <div
                                className={`font-bold text-sm ${
                                  d.status === 'HOSTILE'
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

                          {/* บรรทัดที่สอง: Speed, Altitude, Heading */}
                          <div className="flex justify-between gap-4 text-xs">
                            <div className="text-center">
                              <div className="text-zinc-500 uppercase">SPEED</div>
                              <div className="text-amber-400 font-bold">
                                {d.speedKt?.toFixed(1)} <span className="text-[10px]">kt</span>
                              </div>
                            </div>
                            <div className="text-center">
                              <div className="text-zinc-500 uppercase">ALTITUDE</div>
                              <div className="text-amber-400 font-bold">
                                {d.altitudeFt?.toLocaleString()} <span className="text-[10px]">ft</span>
                              </div>
                            </div>
                            <div className="text-center">
                              <div className="text-zinc-500 uppercase">HEADING</div>
                              <div className="text-amber-400 font-bold">
                                {d.headingDeg?.toFixed(2)} <span className="text-[10px]">°</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            );
          });
        })()}
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
