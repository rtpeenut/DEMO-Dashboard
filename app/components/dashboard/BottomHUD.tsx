'use client';

import { useEffect, useState } from 'react';
import { 
  Users, 
  UserCheck, 
  UserX, 
  HelpCircle, 
  Loader2, 
  WifiOff,
  MapPin,
  MapPinOff
} from 'lucide-react';
import type { Drone, Frame } from '@/app/libs/MapData';
import { getFrameByCamId, getAllFrames } from '@/app/libs/MapData';

type FilterType = 'ALL' | 'FRIEND' | 'HOSTILE' | 'UNKNOWN';

interface BottomHUDProps {
  drones: Drone[];
  selectedCamId?: string;
  filter: FilterType;
  onFilterChange: (filter: FilterType) => void;
  onZoomToFit?: () => void;
  isLoading?: boolean;
}

export default function BottomHUD({
  drones,
  selectedCamId,
  filter,
  onFilterChange,
  onZoomToFit,
  isLoading = false,
}: BottomHUDProps) {
  const [frame, setFrame] = useState<Frame | null>(null);
  const [counts, setCounts] = useState({
    all: 0,
    friend: 0,
    hostile: 0,
    unknown: 0,
  });

  // ✅ Update frame when cam_id changes
  useEffect(() => {
    if (selectedCamId) {
      const f = getFrameByCamId(selectedCamId);
      setFrame(f);
    } else {
      // ถ้าไม่มี cam_id ที่เลือก ใช้ frame แรกที่มี
      const frames = getAllFrames();
      if (frames.length > 0) {
        setFrame(frames[0]);
      }
    }
  }, [selectedCamId]);

  // ✅ Calculate counts
  useEffect(() => {
    const filtered = selectedCamId 
      ? drones.filter(d => d.camId === selectedCamId)
      : drones;

    setCounts({
      all: filtered.length,
      friend: filtered.filter(d => d.status === 'FRIEND').length,
      hostile: filtered.filter(d => d.status === 'HOSTILE').length,
      unknown: filtered.filter(d => d.status === 'UNKNOWN').length,
    });
  }, [drones, selectedCamId]);

  const filterButtons: Array<{
    type: FilterType;
    icon: React.ReactNode;
    label: string;
    color: string;
    hoverColor: string;
    count: number;
  }> = [
    {
      type: 'ALL',
      icon: <Users className="w-5 h-5" />,
      label: 'ทั้งหมด',
      color: 'text-yellow-400',
      hoverColor: 'hover:text-yellow-300',
      count: counts.all,
    },
    {
      type: 'FRIEND',
      icon: <UserCheck className="w-5 h-5" />,
      label: 'เพื่อน',
      color: 'text-green-400',
      hoverColor: 'hover:text-green-300',
      count: counts.friend,
    },
    {
      type: 'HOSTILE',
      icon: <UserX className="w-5 h-5" />,
      label: 'ศัตรู',
      color: 'text-red-400',
      hoverColor: 'hover:text-red-300',
      count: counts.hostile,
    },
    {
      type: 'UNKNOWN',
      icon: <HelpCircle className="w-5 h-5" />,
      label: 'ไม่ทราบ',
      color: 'text-gray-400',
      hoverColor: 'hover:text-gray-300',
      count: counts.unknown,
    },
  ];

  const cameraInfo = frame?.token_id?.camera_info;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      <div className="flex items-center gap-2 px-4 py-3 rounded-full bg-black/60 backdrop-blur-xl border border-white/10 shadow-2xl">
        {/* Filter Buttons */}
        {filterButtons.map((btn) => (
          <button
            key={btn.type}
            onClick={() => onFilterChange(btn.type)}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-full transition-all
              ${filter === btn.type 
                ? `${btn.color} bg-white/10` 
                : 'text-gray-400 hover:bg-white/5'
              }
              ${btn.hoverColor}
            `}
            aria-label={`กรอง ${btn.label}`}
            title={`${btn.label}: ${btn.count} ตัว`}
          >
            {btn.icon}
            <span className="text-sm font-semibold min-w-[2rem] text-right">
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin inline" />
              ) : (
                btn.count
              )}
            </span>
          </button>
        ))}

        {/* Divider */}
        <div className="w-px h-8 bg-white/20 mx-1" />

        {/* Status Indicator */}
        <div className="flex items-center gap-2 px-3">
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
              <span className="text-xs text-gray-400">กำลังโหลด...</span>
            </>
          ) : counts.all === 0 ? (
            <>
              <WifiOff className="w-4 h-4 text-gray-500" />
              <span className="text-xs text-gray-400">ไม่มีข้อมูล</span>
            </>
          ) : (
            <>
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-xs text-gray-400">ออนไลน์</span>
            </>
          )}
        </div>

        {/* Zoom to Fit Button */}
        <button
          onClick={onZoomToFit}
          className="flex items-center gap-2 px-4 py-2 rounded-full text-blue-400 hover:text-blue-300 hover:bg-white/5 transition-all"
          aria-label="ซูมไปยังตำแหน่งทั้งหมด"
          title={cameraInfo 
            ? `กล้อง: ${cameraInfo.name}\nสถานที่: ${cameraInfo.location}\nสถาบัน: ${cameraInfo.institute}`
            : 'ซูมไปยังตำแหน่งทั้งหมด'
          }
        >
          {frame ? (
            <MapPin className="w-5 h-5" />
          ) : (
            <MapPinOff className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* Camera Info Tooltip (shown on hover over zoom button) */}
      {cameraInfo && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 rounded-lg bg-black/80 backdrop-blur-sm border border-white/10 text-xs text-gray-300 opacity-0 hover:opacity-100 transition-opacity pointer-events-none">
          <div className="font-semibold text-white mb-1">{cameraInfo.name}</div>
          <div>สถานที่: {cameraInfo.location}</div>
          <div>สถาบัน: {cameraInfo.institute}</div>
        </div>
      )}
    </div>
  );
}


