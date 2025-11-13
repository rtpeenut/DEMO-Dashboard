'use client';

import { useEffect, useRef, useState } from 'react';
import { Camera, X } from 'lucide-react';
import { getAllFrames } from '@/app/libs/MapData';
import type { Frame } from '@/app/libs/MapData';

interface CameraSidebarProps {
  onClose?: () => void;
}

interface WSImageMessage {
  type: 'image';
  name: string;
  mime: string;
  data: string; // Base64
  cam_id?: string;
  frame_id?: string | number;
  timestamp?: string;
  objects?: any[];
  image_info?: {
    width: number;
    height: number;
    quality?: number;
    mime?: string;
  };
}

export default function CameraSidebar({ onClose }: CameraSidebarProps) {
  const [frames, setFrames] = useState<Frame[]>([]);
  const [liveImages, setLiveImages] = useState<Map<string, string>>(new Map());
  const ref = useRef<HTMLDivElement>(null);
  const [toolbarHeight, setToolbarHeight] = useState<number>(0);
  const wsRef = useRef<WebSocket | null>(null);
  const [wsStatus, setWsStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('connecting');

  // ✅ จัดการขนาดให้สูงเท่ากับแถบเครื่องมือด้านขวา
  useEffect(() => {
    const toolbar = document.querySelector('#right-toolbar');
    if (toolbar) {
      const { height } = toolbar.getBoundingClientRect();
      setToolbarHeight(height);
    }
  }, []);

  // ✅ WebSocket connection สำหรับรับภาพ realtime
  useEffect(() => {
    // ใช้ WebSocket URL เดียวกับ MapData.ts หรือใช้ environment variable
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://82.26.104.180:3000/ws?role=front';
    console.log('🔌 Connecting to WebSocket for images:', wsUrl);
    
    const ws = new WebSocket(wsUrl);
    ws.binaryType = 'arraybuffer';
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('✅ WebSocket connected for images');
      setWsStatus('connected');
    };

    ws.onmessage = async (ev) => {
      try {
        // ✅ Handle binary data (ArrayBuffer/Blob)
        if (ev.data instanceof ArrayBuffer) {
          console.log('📦 Received binary image data, size:', ev.data.byteLength);
          const blob = new Blob([ev.data], { type: 'image/jpeg' });
          const url = URL.createObjectURL(blob);
          
          // ถ้ามี frame metadata จาก frameStore ให้ใช้ cam_id จากนั้น
          // ไม่งั้นใช้ default
          const frames = getAllFrames();
          if (frames.length > 0) {
            const latestFrame = frames[0];
            const camId = latestFrame.cam_id || latestFrame.source_id || 'default';
            setLiveImages(prev => {
              const newMap = new Map(prev);
              // Cleanup old URL if exists
              const oldUrl = prev.get(camId);
              if (oldUrl && oldUrl.startsWith('blob:')) {
                URL.revokeObjectURL(oldUrl);
              }
              newMap.set(camId, url);
              return newMap;
            });
          } else {
            setLiveImages(prev => {
              const newMap = new Map(prev);
              const oldUrl = prev.get('default');
              if (oldUrl && oldUrl.startsWith('blob:')) {
                URL.revokeObjectURL(oldUrl);
              }
              newMap.set('default', url);
              return newMap;
            });
          }
          return;
        }

        // ✅ Handle Blob data
        if (ev.data instanceof Blob) {
          console.log('📦 Received Blob image data, type:', ev.data.type, 'size:', ev.data.size);
          const url = URL.createObjectURL(ev.data);
          const frames = getAllFrames();
          if (frames.length > 0) {
            const latestFrame = frames[0];
            const camId = latestFrame.cam_id || latestFrame.source_id || 'default';
            setLiveImages(prev => {
              const newMap = new Map(prev);
              const oldUrl = prev.get(camId);
              if (oldUrl && oldUrl.startsWith('blob:')) {
                URL.revokeObjectURL(oldUrl);
              }
              newMap.set(camId, url);
              return newMap;
            });
          } else {
            setLiveImages(prev => {
              const newMap = new Map(prev);
              const oldUrl = prev.get('default');
              if (oldUrl && oldUrl.startsWith('blob:')) {
                URL.revokeObjectURL(oldUrl);
              }
              newMap.set('default', url);
              return newMap;
            });
          }
          return;
        }

        // ✅ Handle text/JSON data
        let rawData = ev.data;
        if (rawData instanceof Blob) {
          rawData = await rawData.text();
        }

        // Skip if not a string
        if (typeof rawData !== 'string') {
          return;
        }

        // Check if it's JSON
        const trimmed = rawData.trim();
        if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
          // Not JSON, might be binary data
          return;
        }

        // Parse JSON
        const msg = JSON.parse(rawData);
        
        // ✅ Handle image message with Base64 data
        if (msg.type === 'image' && msg.mime && msg.data) {
          const camId = msg.cam_id || msg.source_id || 'unknown';
          const imgUrl = `data:${msg.mime};base64,${msg.data}`;
          
          console.log('📸 Received Base64 image via WebSocket:', {
            camId,
            frameId: msg.frame_id,
            mime: msg.mime,
            size: msg.data.length
          });
          
          // อัปเดตภาพ live
          setLiveImages(prev => {
            const newMap = new Map(prev);
            // Cleanup old blob URL if exists
            const oldUrl = prev.get(camId);
            if (oldUrl && oldUrl.startsWith('blob:')) {
              URL.revokeObjectURL(oldUrl);
            }
            newMap.set(camId, imgUrl);
            return newMap;
          });
          return;
        }

        // ✅ Handle frame_meta message (might contain image data)
        if ((msg.kind === 'frame' || msg.kind === 'frame_meta') && msg.image_data) {
          const camId = msg.source_id || msg.cam_id || 'unknown';
          const mime = msg.image_info?.mime || 'image/jpeg';
          const imgUrl = `data:${mime};base64,${msg.image_data}`;
          
          console.log('📸 Received frame_meta with image data via WebSocket:', {
            camId,
            frameId: msg.frame_id,
            mime
          });
          
          setLiveImages(prev => {
            const newMap = new Map(prev);
            const oldUrl = prev.get(camId);
            if (oldUrl && oldUrl.startsWith('blob:')) {
              URL.revokeObjectURL(oldUrl);
            }
            newMap.set(camId, imgUrl);
            return newMap;
          });
          return;
        }

        // ✅ Log other messages for debugging
        if (msg.type !== 'hello' && msg.kind !== 'frame_meta') {
          console.log('📨 Received WebSocket message (not image):', {
            type: msg.type,
            kind: msg.kind,
            hasData: !!msg.data,
            hasImageData: !!msg.image_data
          });
        }
      } catch (err) {
        // Only log if it's not a parsing error for non-JSON data
        if (err instanceof SyntaxError) {
          // Might be binary data, ignore
          return;
        }
        console.error('❌ Error processing WebSocket message:', err);
      }
    };

    ws.onerror = (e) => {
      console.error('❌ WebSocket error:', e);
      setWsStatus('error');
    };

    ws.onclose = (event) => {
      console.log('🔌 WebSocket closed:', event.code, event.reason);
      setWsStatus('disconnected');
      // Optional: Try to reconnect after a delay
      // setTimeout(() => {
      //   if (!wsRef.current || wsRef.current.readyState === WebSocket.CLOSED) {
      //     // Reconnect logic here
      //   }
      // }, 3000);
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
      // Cleanup blob URLs - use current state
      setLiveImages(prev => {
        prev.forEach(url => {
          if (url.startsWith('blob:')) {
            URL.revokeObjectURL(url);
          }
        });
        return new Map(); // Clear the map
      });
    };
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
      <div className="mb-2 rounded-xl bg-zinc-800 px-4 py-2 text-zinc-300 font-sans text-sm flex items-center justify-between">
        <span>LIVE CAMERAS</span>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${
            wsStatus === 'connected' ? 'bg-green-500 animate-pulse' :
            wsStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' :
            wsStatus === 'error' ? 'bg-red-500' :
            'bg-gray-500'
          }`} title={
            wsStatus === 'connected' ? 'WebSocket Connected' :
            wsStatus === 'connecting' ? 'Connecting...' :
            wsStatus === 'error' ? 'WebSocket Error' :
            'WebSocket Disconnected'
          } />
          <span className="text-xs text-zinc-400">
            {wsStatus === 'connected' ? 'WS' :
             wsStatus === 'connecting' ? 'Connecting' :
             wsStatus === 'error' ? 'Error' :
             'Offline'}
          </span>
        </div>
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
            // ใช้ API route ที่จะ proxy ไปยัง external server
            imageUrl = `/api/frames/${frame.source_id}/${frame.frame_id}.jpg`;
          } else {
            imageUrl = `/api/frames/unknown/${frameId}.jpg`;
          }
          
          console.log('📷 Camera frame DEBUG:', {
            camId,
            frameId,
            source_id: frame.source_id,
            frame_id: frame.frame_id,
            fram_id: frame.fram_id,
            imageUrl,
            hasImageUrl: !!(frame as any).imageUrl,
            fullFrame: frame
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
                  src={liveImages.get(camId) || imageUrl}
                  alt={`Camera ${camId}`}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.currentTarget;
                    const currentUrl = target.src;
                    
                    // ถ้าเป็น live image ที่ error ให้ fallback ไปใช้ imageUrl
                    if (currentUrl.startsWith('data:')) {
                      target.src = imageUrl;
                      return;
                    }
                    
                    // ลอง URL อื่นๆ - ใช้ IP เดียวกับ WebSocket (180)
                    const baseUrls: string[] = [
                      'http://82.26.104.180:3000',
                      'http://82.26.104.161:3000',
                      'http://82.26.104.180:8000',
                      'http://82.26.104.161:8000',
                      'http://82.26.104.180:5000',
                      'http://82.26.104.161:5000',
                    ];
                    
                    const alternativeUrls: string[] = [];
                    if (frame.source_id && frame.frame_id) {
                      baseUrls.forEach(base => {
                        alternativeUrls.push(`${base}/frames/${frame.source_id}/${frame.frame_id}.jpg`);
                        alternativeUrls.push(`${base}/api/frames/${frame.source_id}/${frame.frame_id}.jpg`);
                      });
                    }
                    if (frame.frame_id) {
                      baseUrls.forEach(base => {
                        alternativeUrls.push(`${base}/frames/${frame.frame_id}.jpg`);
                      });
                    }
                    baseUrls.forEach(base => {
                      alternativeUrls.push(`${base}/frames/${frameId}.jpg`);
                    });
                    
                    // Filter out invalid URLs and current URL
                    const validUrls: string[] = alternativeUrls.filter(url => 
                      url !== currentUrl && 
                      !url.includes('undefined') && 
                      !url.includes('null')
                    );
                    
                    console.log('🔄 Trying alternative URLs for', camId, ':', validUrls.length, 'URLs');
                    
                    // ลอง URL ถัดไป
                    const triedCount = parseInt(target.dataset.triedCount || '0');
                    if (validUrls.length > triedCount) {
                      target.dataset.triedCount = (triedCount + 1).toString();
                      const nextUrl = validUrls[triedCount];
                      console.log(`🔄 Trying URL ${triedCount + 1}/${validUrls.length}:`, nextUrl);
                      target.src = nextUrl;
                      return;
                    }
                    
                    // ถ้าลองหมดแล้ว แสดง NO FEED
                    target.style.display = 'none';
                    const parent = target.parentElement;
                    if (parent && !parent.querySelector('.no-feed-message')) {
                      const noFeedDiv = document.createElement('div');
                      noFeedDiv.className = 'no-feed-message absolute inset-0 flex flex-col items-center justify-center text-zinc-500 text-xs font-semibold p-2';
                      const triedUrls = [currentUrl, ...validUrls].slice(0, 3); // Show first 3 URLs
                      noFeedDiv.innerHTML = `
                        <div>NO FEED</div>
                        <div class="text-[10px] text-zinc-600 mt-1 break-all text-center max-w-full px-2">
                          Tried: ${triedUrls[0] || currentUrl}
                          ${triedUrls.length > 1 ? `<br/>Also tried: ${triedUrls.length - 1} more URLs` : ''}
                        </div>
                      `;
                      parent.appendChild(noFeedDiv);
                      console.warn('⚠️ All image URLs failed for', camId, ':', triedUrls);
                    }
                  }}
                  onLoad={() => {
                    console.log('✅ Image loaded:', liveImages.get(camId) ? 'WebSocket' : 'HTTP');
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
