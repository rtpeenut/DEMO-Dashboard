'use client';

import { useEffect, useRef, useState } from 'react';
import { Camera, X } from 'lucide-react';
import { getAllFrames } from '@/app/libs/MapData';
import type { Frame } from '@/app/libs/MapData';

interface CameraSidebarProps {
  onClose?: () => void;
}

export default function CameraSidebar({ onClose }: CameraSidebarProps) {
  const [frames, setFrames] = useState<Frame[]>([]);
  const ref = useRef<HTMLDivElement>(null);
  const [toolbarHeight, setToolbarHeight] = useState<number>(0);

  // ✅ จัดการขนาดให้สูงเท่ากับแถบเครื่องมือด้านขวา
  useEffect(() => {
    const toolbar = document.querySelector('#right-toolbar');
    if (toolbar) {
      const { height } = toolbar.getBoundingClientRect();
      setToolbarHeight(height);
    }
  }, []);

  // ✅ ดึงข้อมูล frames จาก frameStore โดยตรง (client-side)
  useEffect(() => {
    const updateFrames = () => {
      const allFrames = getAllFrames();
      console.log('📡 Fetched frames from frameStore:', allFrames.length, 'frames');
      if (allFrames.length > 0) {
        console.log('📸 First frame sample:', allFrames[0]);
      }
      setFrames(allFrames);
    };

    // Initial load
    updateFrames();

    // Update every 1 second to get latest frames
    const interval = setInterval(updateFrames, 1000);

    return () => clearInterval(interval);
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
      {/* Header */}
      <div className="mb-2 flex items-center justify-between rounded-xl px-4 py-2 text-amber-400 font-bold tracking-wider ui-header">
        <span className="flex items-center gap-2">
          <Camera size={16} /> CAMERA FEED
        </span>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="rounded-md text-zinc-300 hover:text-white transition"
            aria-label="Close camera sidebar"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Camera Info Header */}
      <div className="mb-2 rounded-xl bg-zinc-800 px-4 py-2 text-zinc-300 font-sans text-sm">
        LIVE CAMERAS
      </div>

      {/* Camera Feeds */}
      <div className="space-y-3 overflow-y-auto pr-1 flex-1">
        {frames.length === 0 && (
          <div className="m-2 text-sm text-zinc-400 text-center">No camera feeds available</div>
        )}
        
        {frames.map((frame) => {
          // ✅ รองรับทั้ง format เก่าและใหม่
          const cameraInfo = frame.token_id?.camera_info;
          const camId = frame.cam_id || frame.source_id || 'unknown';
          const frameId = frame.fram_id || frame.frame_id?.toString() || camId;
          
          // ✅ สร้าง URL รูปภาพ - ลองหลาย format
          // ลำดับความสำคัญ:
          // 1. ใช้ imageUrl จาก frame ถ้ามี
          // 2. ใช้ source_id + frame_id
          // 3. ใช้ frameId
          let imageUrl = '';
          
          if ((frame as any).imageUrl) {
            imageUrl = (frame as any).imageUrl;
          } else if (frame.source_id && frame.frame_id) {
            // ลอง format ต่างๆ
            imageUrl = `http://82.26.104.161:3000/frames/${frame.source_id}/${frame.frame_id}.jpg`;
          } else {
            imageUrl = `http://82.26.104.161:3000/frames/${frameId}.jpg`;
          }
          
          console.log('📷 Camera frame:', {
            camId,
            frameId,
            source_id: frame.source_id,
            frame_id: frame.frame_id,
            imageUrl,
            hasImageUrl: !!(frame as any).imageUrl
          });
          
          return (
            <div
              key={camId}
              className="rounded-2xl bg-zinc-900/60 border border-zinc-700/50 p-4 space-y-3"
            >
              {/* Camera Info */}
              {cameraInfo && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-amber-400">
                    <Camera size={14} />
                    <span className="font-semibold text-sm uppercase">{cameraInfo.name}</span>
                  </div>
                  <div className="text-xs text-zinc-400 space-y-0.5">
                    <div className="flex gap-2">
                      <span className="text-zinc-500 min-w-[60px]">สถานที่:</span>
                      <span className="text-zinc-300">{cameraInfo.location}</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="text-zinc-500 min-w-[60px]">สถาบัน:</span>
                      <span className="text-zinc-300">{cameraInfo.institute}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Camera ID */}
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-zinc-500">CAM ID:</span>
                <span className="text-white font-mono break-all">{camId.substring(0, 8)}...</span>
              </div>

              {/* Camera Feed Image */}
              <div className="relative w-full aspect-video bg-zinc-800 rounded-xl overflow-hidden border border-zinc-700">
                <img
                  src={imageUrl}
                  alt={`Camera ${camId}`}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.currentTarget;
                    const currentUrl = target.src;
                    console.error('❌ Image load failed:', currentUrl);
                    
                    // ลอง URL อื่นๆ
                    const alternativeUrls = [
                      `http://82.26.104.161:3000/frames/${frame.source_id}/${frame.frame_id}.jpg`,
                      `http://82.26.104.161:3000/frames/${frame.frame_id}.jpg`,
                      `http://82.26.104.161:3000/frames/${frameId}.jpg`,
                      `http://82.26.104.161:3000/api/frames/${frame.source_id}/${frame.frame_id}.jpg`,
                    ].filter(url => url !== currentUrl && !url.includes('undefined'));
                    
                    // ลอง URL ถัดไป
                    if (alternativeUrls.length > 0 && !target.dataset.tried) {
                      target.dataset.tried = 'true';
                      console.log('🔄 Trying alternative URL:', alternativeUrls[0]);
                      target.src = alternativeUrls[0];
                      return;
                    }
                    
                    // ถ้าลองหมดแล้ว แสดง NO FEED
                    target.style.display = 'none';
                    const parent = target.parentElement;
                    if (parent && !parent.querySelector('.no-feed-message')) {
                      const noFeedDiv = document.createElement('div');
                      noFeedDiv.className = 'no-feed-message absolute inset-0 flex flex-col items-center justify-center text-zinc-500 text-xs font-semibold p-2';
                      noFeedDiv.innerHTML = `
                        <div>NO FEED</div>
                        <div class="text-[10px] text-zinc-600 mt-1 break-all text-center">Tried: ${currentUrl}</div>
                      `;
                      parent.appendChild(noFeedDiv);
                    }
                  }}
                  onLoad={() => {
                    console.log('✅ Image loaded:', imageUrl);
                  }}
                />
                
                {/* Live Indicator */}
                <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-red-500/90 px-2 py-1 rounded text-xs font-bold">
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                  <span>LIVE</span>
                </div>

                {/* Timestamp */}
                <div className="absolute bottom-2 left-2 bg-black/70 px-2 py-1 rounded text-xs font-mono">
                  {new Date(frame.timestamp).toLocaleString('th-TH')}
                </div>
              </div>

              {/* Frame Info */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-zinc-800/60 rounded-lg px-2 py-1.5">
                  <div className="text-zinc-500">FRAME ID</div>
                  <div className="text-white font-mono text-[10px]">{frameId.substring(0, 8)}</div>
                </div>
                <div className="bg-zinc-800/60 rounded-lg px-2 py-1.5">
                  <div className="text-zinc-500">OBJECTS</div>
                  <div className="text-amber-400 font-bold">{frame.objects?.length || 0}</div>
                </div>
              </div>
              
              {/* ✅ Image Info (New Format) */}
              {frame.image_info && (
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="bg-zinc-800/60 rounded-lg px-2 py-1.5">
                    <div className="text-zinc-500">SIZE</div>
                    <div className="text-white font-mono text-[10px]">{frame.image_info.width}x{frame.image_info.height}</div>
                  </div>
                  {frame.image_info.quality && (
                    <div className="bg-zinc-800/60 rounded-lg px-2 py-1.5">
                      <div className="text-zinc-500">QUALITY</div>
                      <div className="text-white font-mono text-[10px]">{frame.image_info.quality}%</div>
                    </div>
                  )}
                  {frame.image_info.mime && (
                    <div className="bg-zinc-800/60 rounded-lg px-2 py-1.5">
                      <div className="text-zinc-500">TYPE</div>
                      <div className="text-white font-mono text-[10px]">{frame.image_info.mime.split('/')[1]?.toUpperCase()}</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
}