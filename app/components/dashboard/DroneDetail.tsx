'use client';
import { useEffect, useState, useMemo } from 'react';
import { Route, Plus, Columns } from "lucide-react";
import { subscribeDrones, subscribeDronesApi, getFrameByCamId, getAllFrames } from "@/app/libs/MapData"; // ✅ ใช้ WebSocket/REST ตามการตั้งค่า
import { latLngToMGRS } from "@/app/utils/mapUtils";

interface DroneDetailProps {
  drone: {
    id: string;
    callsign: string;
    type: string;
    status?: "FRIEND" | "HOSTILE" | "UNKNOWN";
    speedKt: number;
    altitudeFt: number;
    headingDeg: number;
    lastUpdate?: string;
    mgrs?: string;
    position?: [number, number];
    imageUrl?: string;
    idCamera?: string;
    camId?: string;
    size?: string;
    alt?: number;
  };
  onClose?: () => void;
  onFollow?: (drone: any, isFollowing: boolean) => void;
  isFollowing?: boolean;
  onSplitScreen?: (drone: any) => void;
  splitScreen?: boolean;
}

export default function DroneDetail({ drone, onClose, onFollow, isFollowing, onSplitScreen, splitScreen }: DroneDetailProps) {
  const [droneData, setDroneData] = useState(drone);
  const [imageUrl, setImageUrl] = useState<string>('');

  useEffect(() => {
    // ✅ อัปเดต droneData เมื่อ drone prop เปลี่ยน
    setDroneData(drone);
  }, [drone]);

  useEffect(() => {
    // ✅ เลือกแหล่งข้อมูลจาก env: NEXT_PUBLIC_DATA_SOURCE = 'api' | 'ws'
    const useApi = process.env.NEXT_PUBLIC_DATA_SOURCE === "api";
    const stop = (useApi ? subscribeDronesApi : subscribeDrones)((list) => {
      if (!Array.isArray(list)) return; // กันชนิดผิดพลาดจาก WS
      
      // ✅ หา drone โดยใช้ id, callsign, หรือ obj_id (รองรับทั้งสองแบบ)
      const updated = list.find((d: any) => {
        const dId = d.id || (d as any).obj_id;
        const dCallsign = d.callsign || d.id || (d as any).obj_id;
        const droneId = drone.id || (drone as any).obj_id;
        const droneCallsign = drone.callsign || drone.id || (drone as any).obj_id;
        
        const match = dId === droneId || 
               dId === droneCallsign ||
               dCallsign === droneId ||
               dCallsign === droneCallsign ||
               d.id === drone.id ||
               d.callsign === drone.callsign;
        
        return match;
      });
      
      if (updated) {
        // ✅ ตรวจสอบว่ามีการเปลี่ยนแปลงตำแหน่งหรือไม่
        const positionChanged = !droneData.position || 
          !updated.position ||
          droneData.position[0] !== updated.position[0] ||
          droneData.position[1] !== updated.position[1];
        
        // ✅ Debug: Log when drone is found and updated
        if (positionChanged) {
          console.log(`🔄 Updating drone ${drone.id}:`, {
            oldPosition: droneData.position,
            newPosition: updated.position,
            lat: updated.position?.[0],
            lng: updated.position?.[1],
            altitudeFt: updated.altitudeFt,
            speedKt: updated.speedKt,
            alt: updated.alt,
          });
        }
        
        // ✅ อัปเดตทุก field รวมถึง position และ altitudeFt โดยใช้ข้อมูลใหม่ทั้งหมด
        setDroneData((prev) => {
          // ✅ ตรวจสอบว่า position และ altitudeFt มีค่าถูกต้อง
          const newPosition = updated.position && Array.isArray(updated.position) && updated.position.length === 2
            ? [updated.position[0], updated.position[1]] as [number, number] // ✅ สร้าง array ใหม่เพื่อให้ React detect การเปลี่ยนแปลง
            : prev.position;
          const newAltitudeFt = typeof updated.altitudeFt === 'number' && !isNaN(updated.altitudeFt)
            ? updated.altitudeFt
            : prev.altitudeFt;
          const newSpeedKt = typeof updated.speedKt === 'number' && !isNaN(updated.speedKt)
            ? updated.speedKt
            : prev.speedKt;
          const newAlt = typeof updated.alt === 'number' && !isNaN(updated.alt)
            ? updated.alt
            : prev.alt;
          
          // ✅ ตรวจสอบว่ามีการเปลี่ยนแปลงจริงหรือไม่
          const hasChanges = 
            (newPosition && prev.position && (
              newPosition[0] !== prev.position[0] || 
              newPosition[1] !== prev.position[1]
            )) ||
            newAltitudeFt !== prev.altitudeFt ||
            newSpeedKt !== prev.speedKt ||
            newAlt !== prev.alt;
          
          if (hasChanges) {
            return {
              ...prev,
              ...updated,
              status: (updated as any).status || (prev as any).status,
              imageUrl: (updated as any).imageUrl || (prev as any).imageUrl,
              camId: (updated as any).camId || (prev as any).camId,
              position: newPosition,
              altitudeFt: newAltitudeFt,
              speedKt: newSpeedKt,
              alt: newAlt,
              lastUpdate: updated.lastUpdate || prev.lastUpdate,
            };
          }
          
          // ✅ อัปเดต status, imageUrl, และ camId แม้ไม่มี changes อื่น
          return {
            ...prev,
            status: (updated as any).status || (prev as any).status,
            imageUrl: (updated as any).imageUrl || (prev as any).imageUrl,
            camId: (updated as any).camId || (prev as any).camId,
            lastUpdate: updated.lastUpdate || prev.lastUpdate,
          };
        });
      } else {
        // ✅ Debug: Log when drone is not found
        console.warn(`⚠️ Drone ${drone.id} not found in list. Available IDs:`, list.map((d: any) => d.id || (d as any).obj_id));
      }
    });
    return stop; // cleanup
  }, [drone.id, drone.callsign]);

  // ✅ Calculate image URL from frame data (same logic as CameraSidebar)
  useEffect(() => {
    const calculateImageUrl = () => {
      // ✅ ใช้ imageUrl จาก droneData ก่อน
      let url = droneData.imageUrl;
      const camId = (droneData as any).camId || droneData.idCamera || droneData.id;
      
      // ✅ ถ้าไม่มี imageUrl ให้ดึงจาก frame data
      if (!url) {
        // ✅ ลองหา frame จาก camId โดยตรง
        let frame = getFrameByCamId(camId);
        
        // ✅ ถ้าไม่เจอ ลองหา frame ที่มี drone นี้อยู่ใน objects
        if (!frame) {
          const allFrames = getAllFrames();
          const foundFrame = allFrames.find(f => {
            return f.objects?.some((obj: any) => {
              const objId = obj.drone_id || obj.obj_id || obj.id;
              const objCallsign = (obj.drone_id || obj.obj_id || obj.id || '').toUpperCase();
              const droneId = droneData.id || '';
              const droneCallsign = (droneData.callsign || '').toUpperCase();
              return objId === droneId || 
                     objId === droneCallsign ||
                     objCallsign === droneId ||
                     objCallsign === droneCallsign;
            });
          });
          if (foundFrame) frame = foundFrame;
        }
        
        // ✅ ถ้ายังไม่เจอ ลองใช้ frame ล่าสุดที่มี camId ใกล้เคียง
        if (!frame) {
          const allFrames = getAllFrames();
          const foundFrame = allFrames.find(f => {
            const fCamId = f.cam_id || f.source_id || '';
            return fCamId === camId || 
                   fCamId.includes(camId) || 
                   camId.includes(fCamId) ||
                   fCamId.toLowerCase().includes(camId.toLowerCase());
          });
          if (foundFrame) frame = foundFrame;
        }
        
        // ✅ ถ้ายังไม่เจอ ใช้ frame ล่าสุด
        if (!frame) {
          const allFrames = getAllFrames();
          if (allFrames.length > 0) {
            frame = allFrames[allFrames.length - 1];
          }
        }
        
        if (frame) {
          // ใช้ logic เดียวกับ CameraSidebar
          if ((frame as any).imageUrl) {
            url = (frame as any).imageUrl;
          } else if (frame.source_id && frame.frame_id) {
            // ✅ ใช้ API route ที่จะ proxy ไปยัง external server
            url = `/api/frames/${frame.source_id}/${frame.frame_id}.jpg`;
          } else if (frame.fram_id) {
            const frameCamId = frame.cam_id || frame.source_id || camId;
            url = `/api/frames/${frameCamId}/${frame.fram_id}.jpg`;
          } else {
            const frameId = frame.fram_id || frame.frame_id?.toString() || camId;
            url = `/api/frames/unknown/${frameId}.jpg`;
          }
        } else if (camId) {
          // Fallback: ลองใช้ camId
          url = `/api/frames/${camId}/latest.jpg`;
        }
      }
      
      // ✅ อัปเดต imageUrl state
      if (url && url !== imageUrl) {
        console.log('🔄 Updating drone image URL:', {
          droneId: droneData.id,
          camId,
          oldUrl: imageUrl,
          newUrl: url
        });
        setImageUrl(url);
      }
    };
    
    // ตรวจสอบทันที
    calculateImageUrl();
    
    // ตรวจสอบทุก 2 วินาทีสำหรับ frame data ใหม่
    const interval = setInterval(calculateImageUrl, 2000);
    
    return () => clearInterval(interval);
  }, [droneData.id, droneData.callsign, droneData.imageUrl, (droneData as any).camId, droneData.idCamera, imageUrl]);

  // Calculate MGRS from position
  const mgrsCoordinate = useMemo(() => {
    if (droneData.mgrs) return droneData.mgrs;
    if (droneData.position && droneData.position.length === 2) {
      const [lat, lng] = droneData.position;
      return latLngToMGRS(lat, lng, 5);
    }
    return "—";
  }, [droneData.position, droneData.mgrs]);

  return (
    <div 
      className="absolute top-14 z-[1200] w-auto md:w-[340px] rounded-2xl bg-zinc-900/95 backdrop-blur border border-zinc-700 shadow-2xl overflow-hidden font-prompt transition-all duration-300"
      style={{
        left: splitScreen ? 'calc(25% + 1rem)' : '1rem',
        right: splitScreen ? 'auto' : '1rem',
      }}
    >
      
      {/* Header */}
      <div className="flex justify-between items-center bg-zinc-800 px-4 py-3">
        <div className="flex items-center gap-2">
          {/* ✅ ใช้ droneData เพื่ออัปเดตแบบเรียลไทม์จาก WebSocket */}
          <div className="text-amber-400 font-bold text-lg tracking-wide">{droneData.callsign}</div>
          <div className="text-zinc-300 text-sm">• {droneData.type}</div>
        </div>
        <div className="flex items-center gap-3">
          {/* ✅ Add Status Display */}
          {(droneData as any).status && (
            <div className="text-right">
              <div className="text-[10px] text-zinc-500 uppercase">STATUS</div>
              <div
                className={`font-bold text-sm ${
                  (droneData as any).status === 'HOSTILE'
                    ? 'text-red-400'
                    : (droneData as any).status === 'FRIEND'
                    ? 'text-green-400'
                    : 'text-zinc-300'
                }`}
              >
                {(droneData as any).status}
              </div>
            </div>
          )}
          {onClose && (
            <button onClick={onClose} className="text-zinc-400 hover:text-white transition">
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Drone Image */}
      <div className="px-4 pt-3">
        <div className="relative w-full h-48 bg-gradient-to-b from-blue-500/20 to-zinc-900 rounded-xl overflow-hidden border border-zinc-700 flex items-center justify-center">
          {imageUrl || droneData.imageUrl ? (
            <img 
              key={`img-${droneData.id}-${imageUrl || droneData.imageUrl}`}
              src={imageUrl || droneData.imageUrl}
              alt={droneData.callsign}
              className="w-full h-full object-contain"
              onError={(e) => {
                const target = e.currentTarget;
                const currentUrl = target.src;
                const triedCount = parseInt(target.dataset.triedCount || '0');
                const camId = (droneData as any).camId || droneData.idCamera || droneData.id;
                
                console.warn('❌ Drone image failed to load:', {
                  url: currentUrl,
                  droneId: droneData.id,
                  callsign: droneData.callsign,
                  camId,
                  triedCount
                });
                
                // ✅ ลอง URL อื่นๆ - ใช้ IP เดียวกับ WebSocket (180)
                const baseUrls: string[] = [
                  'http://82.26.104.180:3000',
                  'http://82.26.104.161:3000',
                  'http://82.26.104.180:8000',
                  'http://82.26.104.161:8000',
                  'http://82.26.104.180:5000',
                  'http://82.26.104.161:5000',
                ];
                
                const alternativeUrls: string[] = [];
                
                // ดึง frame data เพื่อสร้าง URL
                const allFrames = getAllFrames();
                let frame = getFrameByCamId(camId);
                
                if (!frame) {
                  frame = allFrames.find(f => {
                    return f.objects?.some((obj: any) => {
                      const objId = obj.drone_id || obj.obj_id || obj.id;
                      return objId === droneData.id || objId === droneData.callsign;
                    });
                  }) || null;
                }
                
                if (frame && frame.source_id && frame.frame_id) {
                  baseUrls.forEach(base => {
                    alternativeUrls.push(`${base}/frames/${frame.source_id}/${frame.frame_id}.jpg`);
                  });
                }
                
                if (frame && frame.fram_id) {
                  const frameCamId = frame.cam_id || frame.source_id || camId;
                  baseUrls.forEach(base => {
                    alternativeUrls.push(`${base}/frames/${frameCamId}/${frame.fram_id}.jpg`);
                  });
                }
                
                if (camId) {
                  baseUrls.forEach(base => {
                    alternativeUrls.push(`${base}/frames/${camId}/latest.jpg`);
                    alternativeUrls.push(`${base}/frames/${camId}.jpg`);
                  });
                }
                
                // กรอง URL ที่ไม่ถูกต้อง
                const validUrls = alternativeUrls.filter(url => 
                  url !== currentUrl && 
                  !url.includes('undefined') && 
                  !url.includes('null')
                );
                
                console.log('🔄 Trying alternative URLs for', camId, ':', validUrls.length, 'URLs');
                
                // ลอง URL ถัดไป
                if (validUrls.length > triedCount) {
                  target.dataset.triedCount = (triedCount + 1).toString();
                  const nextUrl = validUrls[triedCount];
                  console.log(`🔄 Trying URL ${triedCount + 1}/${validUrls.length}:`, nextUrl);
                  target.src = nextUrl;
                  return;
                }
                
                // ถ้าลองหมดแล้ว แสดง NO IMAGE
                target.style.display = 'none';
                const parent = target.parentElement;
                if (parent && !parent.querySelector('.no-image-message')) {
                  const noImageDiv = document.createElement('div');
                  noImageDiv.className = 'no-image-message text-zinc-500 text-sm font-semibold';
                  noImageDiv.textContent = 'NO IMAGE';
                  parent.appendChild(noImageDiv);
                }
              }}
              onLoad={() => {
                console.log('✅ Drone image loaded:', {
                  droneId: droneData.id,
                  url: imageUrl || droneData.imageUrl,
                  source: 'api/frames route'
                });
              }}
            />
          ) : (
            <div className="text-zinc-500 text-sm font-semibold">NO IMAGE</div>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="px-4 py-3">
        <div className="text-xs text-zinc-400 font-semibold mb-1">INFORMATION</div>
        <div className="bg-zinc-800 rounded-xl border border-zinc-700 p-3 mb-3">
          {/* ID Row - 3 columns */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <div className="text-[13px] text-zinc-400">ID:</div>
              <div className="font-mono text-sm text-zinc-200">{droneData.id.substring(0, 6)}</div>
            </div>
            <div>
              <div className="text-[13px] text-zinc-400">CAM ID:</div>
              <div className="font-mono text-sm text-zinc-200">
                {droneData.idCamera 
                  ? droneData.idCamera.substring(0, 6) 
                  : (droneData as any).camId 
                    ? (droneData as any).camId.substring(0, 6)
                    : "—"}
                    ..
              </div>
            </div>
            <div>
              <div className="text-[13px] text-zinc-400">Size:</div>
              <div className="font-mono text-sm text-zinc-200">{droneData.size || "—"}</div>
            </div>
          </div>
          
          <div className="text-[13px] text-zinc-400 mt-3">MGRS:</div>
          <div className="bg-zinc-900 rounded-md px-2 py-1 text-xs text-zinc-300 font-mono">
            {mgrsCoordinate}
          </div>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="bg-zinc-800 rounded-xl border border-zinc-700 py-2">
            <div className="text-xs text-zinc-400">SPEED</div>
            {/* ✅ แสดงทศนิยม 3 ตำแหน่ง */}
            <div className="text-amber-400 font-bold">{(droneData.speedKt ?? 0).toFixed(3)} <span className="text-xs">kt</span></div>
          </div>
          <div className="bg-zinc-800 rounded-xl border border-zinc-700 py-2">
            <div className="text-xs text-zinc-400">HEADING</div>
            <div className="text-amber-400 font-bold">{(droneData.headingDeg ?? 0).toFixed(2)}°</div>
          </div>
          <div className="bg-zinc-800 rounded-xl border border-zinc-700 py-2">
            <div className="text-xs text-zinc-400">ALTITUDE</div>
            {/* ✅ แสดงทศนิยม 3 ตำแหน่ง */}
            <div className="text-amber-400 font-bold">{(droneData.altitudeFt ?? 0).toFixed(3)} <span className="text-xs">ft</span></div>
          </div>
        </div>

        {/* Position */}
        <div className="grid grid-cols-2 gap-3 text-center mt-3">
          <div className="bg-zinc-800 rounded-xl border border-zinc-700 py-2">
            <div className="text-xs text-zinc-400">LATITUDE</div>
            <div className="text-amber-400 font-bold">
              {/* ✅ แสดงทศนิยม 6 ตำแหน่ง เพื่อให้เห็นการเปลี่ยนแปลงชัดเจนขึ้น */}
              {droneData.position && droneData.position[0] !== undefined 
                ? droneData.position[0].toFixed(6) 
                : "—"}
            </div>
          </div>
          <div className="bg-zinc-800 rounded-xl border border-zinc-700 py-2">
            <div className="text-xs text-zinc-400">LONGITUDE</div>
            <div className="text-amber-400 font-bold">
              {/* ✅ แสดงทศนิยม 6 ตำแหน่ง เพื่อให้เห็นการเปลี่ยนแปลงชัดเจนขึ้น */}
              {droneData.position && droneData.position[1] !== undefined 
                ? droneData.position[1].toFixed(6) 
                : "—"}
            </div>
          </div>
        </div>

        {/* Last Update */}
        <div className="bg-zinc-800 border border-zinc-700 mt-3 rounded-xl p-2 text-center">
          <div className="text-xs text-zinc-400">LAST UPDATE</div>
          {/* ✅ แสดงวันเวลาแบบปกติ (locale) ถ้าไม่มีค่า ใช้เวลาปัจจุบันแทน */}
          <div className="text-amber-400 font-bold">
            {new Date(droneData.lastUpdate ?? Date.now()).toLocaleString()}
          </div>
        </div>

        {/* Buttons */}
        <div className="grid grid-cols-3 gap-2 mt-3">
          {/* ROUTE */}
          <button className="flex flex-col items-center justify-center gap-1 rounded-xl bg-zinc-800 border border-zinc-700 py-3 text-sm hover:bg-zinc-700 transition">
            <Route size={18} className="text-white" />
            <span className="text-xs">ROUTE</span>
          </button>

          {/* FOLLOW */}
          <button
            onClick={() => onFollow?.(droneData, !isFollowing)}
            className={`flex flex-col items-center justify-center gap-1 rounded-xl border py-3 text-sm transition
              ${
                isFollowing
                  ? "bg-amber-500 border-amber-400 text-black"
                  : "bg-zinc-800 border-zinc-700 hover:bg-zinc-700 text-white"
              }`}
          >
            <Plus size={18} />
            <span className="text-xs">{isFollowing ? "FOLLOWING" : "FOLLOW"}</span>
          </button>

          {/* SPLIT SCREEN */}
          <button
            onClick={() => onSplitScreen?.(droneData)}
            className={`flex flex-col items-center justify-center gap-1 rounded-xl border py-3 text-sm transition
              ${
                splitScreen
                  ? "bg-amber-500 border-amber-400 text-black"
                  : "bg-zinc-800 border-zinc-700 hover:bg-zinc-700 text-white"
              }`}
          >
            <Columns size={18} />
            <span className="text-xs">{splitScreen ? "SPLIT ON" : "SPLIT"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
