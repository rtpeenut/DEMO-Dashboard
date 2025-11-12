// // ✅ ฟังก์ชันช่วยแปลงหน่วยเมตร → องศา (Lat/Lng)
// function metersToDegrees(meters: number, lat: number): [number, number] {
//   const latDeg = meters / 111320;
//   const lngDeg = meters / (111320 * Math.cos((lat * Math.PI) / 180));
//   return [latDeg, lngDeg];
// }

// // ✅ Drone Interface
// export interface Drone {
//   id: string;
//   callsign: string;
//   type: string;
//   status: "FRIEND" | "HOSTILE";
//   speedKt: number;
//   altitudeFt: number;
//   headingDeg: number;
//   position: [number, number]; // [lat, lng]
//   mgrs?: string;
//   imageUrl?: string;
//   lastUpdate?: string;
// }

// // ✅ Mock drones เริ่มต้น
// let drones: Drone[] = [
//   {
//     id: "DRN-2201",
//     callsign: "Eagle-1",
//     type: "Recon UAV",
//     status: "HOSTILE",
//     speedKt: 300,
//     altitudeFt: 21000,
//     headingDeg: 130,
//     position: [13.73, 100.52],
//   },
//   {
//     id: "DRN-2202",
//     callsign: "Falcon-2",
//     type: "Surveillance UAV",
//     status: "HOSTILE",
//     speedKt: 380,
//     altitudeFt: 25300,
//     headingDeg: 266,
//     position: [13.70, 100.57],
//   },
//   {
//     id: "DRN-2203",
//     callsign: "Hawk-3",
//     type: "Recon UAV",
//     status: "FRIEND",
//     speedKt: 220,
//     altitudeFt: 12500,
//     headingDeg: 40,
//     position: [13.78, 100.48],
//   },
//   {
//     id: "DRN-2204",
//     callsign: "Viper-4",
//     type: "Combat UAV",
//     status: "HOSTILE",
//     speedKt: 420,
//     altitudeFt: 28000,
//     headingDeg: 300,
//     position: [13.68, 100.63],
//   },
// ];

// // ✅ จำลองการเคลื่อนที่แบบสมจริง
// export async function getDrones(): Promise<Drone[]> {
//   drones = drones.map((d) => {
//     // เคลื่อนที่สุ่ม 100–300 เมตร
//     const [dLat, dLng] = metersToDegrees((Math.random() - 0.5) * 300, d.position[0]);
//     const newPos: [number, number] = [d.position[0] + dLat, d.position[1] + dLng];

//     return {
//       ...d,
//       headingDeg: (d.headingDeg + (Math.random() - 0.5) * 10) % 360,
//       position: newPos,
//       lastUpdate: new Date().toISOString(),
//     };
//   });

//   await new Promise((r) => setTimeout(r, 200));
//   return drones;
// }
// ✅ Camera Info Interface
export interface CameraInfo {
  name: string;
  sort: string;
  location: string;
  institute: string;
}

// ✅ Frame Interface
export interface Frame {
  fram_id: string;
  cam_id: string;
  token_id: {
    camera_info: CameraInfo;
  };
  timestamp: string;
  image_info: {
    width: number;
    height: number;
  };
  objects: Array<{
    obj_id: string;
    type: string | null;
    lat: number;
    lng: number;
    alt: number;
    speed_kt: number;
  }>;
}

export interface Drone {
  id: string;
  callsign: string;
  type: string;
  status: "FRIEND" | "HOSTILE" | "UNKNOWN";
  speedKt: number;
  altitudeFt: number;
  headingDeg: number;
  position: [number, number];
  lastUpdate?: string;
  imageUrl?: string;
  camId?: string; // ✅ cam_id จาก frame
  alt?: number; // ✅ altitude ในหน่วยเมตร (สำหรับแสดงใน tooltip)
}

// ✅ Mark Interface
export interface Mark {
  id: string;
  name: string;
  color: string;
  pos: [number, number]; // [lat, lng]
  radius: number;        // meters
  createdAt: string;
}

// ✅ In-memory storage for marks
let marks: Mark[] = [];

// ✅ Generate mark ID: MARK-${timestamp}-${random}
function generateMarkId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9);
  return `MARK-${timestamp}-${random}`;
}

// ✅ Get all marks
export function getMarks(): Mark[] {
  return [...marks];
}

// ✅ Add a new mark (auto-generate id and createdAt)
export function addMark(mark: Omit<Mark, 'id' | 'createdAt'>): Mark {
  const newMark: Mark = {
    ...mark,
    id: generateMarkId(),
    createdAt: new Date().toISOString(),
  };
  marks.push(newMark);
  return newMark;
}

// ✅ Delete a mark by id
export function deleteMark(id: string): boolean {
  const index = marks.findIndex(m => m.id === id);
  if (index === -1) return false;
  marks.splice(index, 1);
  return true;
}

// ✅ Update a mark (optional)
export function updateMark(id: string, updates: Partial<Omit<Mark, 'id' | 'createdAt'>>): Mark | null {
  const index = marks.findIndex(m => m.id === id);
  if (index === -1) return null;
  marks[index] = { ...marks[index], ...updates };
  return marks[index];
}

// ✅ Clear all marks (optional)
export function clearMarks(): void {
  marks = [];
}
// ✅ ฟังก์ชันคำนวณระยะห่างแบบ Haversine (เมตร) เพื่อเช็คว่า "ขยับ" หรือไม่
function distanceMeters(a: [number, number], b: [number, number]): number {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const R = 6371e3; // รัศมีโลก (เมตร)
  const [lat1, lon1] = a;
  const [lat2, lon2] = b;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const s1 = Math.sin(dLat / 2) ** 2;
  const s2 = Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(s1 + s2), Math.sqrt(1 - (s1 + s2)));
  return R * c;
}
// ✅ Map object from frame to Drone
export function mapBackendDrone(obj: any, camId?: string, timestamp?: string): Drone {
  // ✅ Determine status from type
  let status: "FRIEND" | "HOSTILE" | "UNKNOWN" = "UNKNOWN";
  const objType = (obj.type || "").toLowerCase();
  if (objType.includes("friend") || objType === "friendly") {
    status = "FRIEND";
  } else if (objType.includes("hostile") || objType === "enemy") {
    status = "HOSTILE";
  }

  // ✅ Extract values with proper fallbacks
  const lat = typeof obj.lat === 'number' ? obj.lat : (typeof obj.latitude === 'number' ? obj.latitude : 0);
  const lng = typeof obj.lng === 'number' ? obj.lng : (typeof obj.longitude === 'number' ? obj.longitude : 0);
  const alt = typeof obj.alt === 'number' ? obj.alt : (typeof obj.altitude_m === 'number' ? obj.altitude_m : 0);
  const speedKt = typeof obj.speed_kt === 'number' ? obj.speed_kt : (obj.speed_mps ? obj.speed_mps * 1.94384 : 0);
  
  return {
    id: obj.obj_id || obj.drone_id || obj.id || "unknown",
    callsign: (obj.obj_id || obj.drone_id || obj.id || "UNNAMED")?.toUpperCase(),
    type: obj.type || "unknown",
    status: status,
    speedKt: speedKt,
    altitudeFt: alt * 3.28084, // ✅ แปลงเมตรเป็นฟุต
    alt: alt, // ✅ เก็บค่าเมตรไว้สำหรับ tooltip
    headingDeg: 0,
    position: [lat, lng] as [number, number], // ✅ ใช้ lat, lng โดยตรง
    lastUpdate: timestamp || obj.timestamp || new Date().toISOString(),
    imageUrl: obj.image_path || undefined,
    camId: camId || obj.camId || obj.cam_id,
  };
}

// ✅ Store for frame data by cam_id
const frameStore = new Map<string, Frame>();

// ✅ Get frame by cam_id
export function getFrameByCamId(camId: string): Frame | null {
  return frameStore.get(camId) || null;
}

// ✅ Get all frames
export function getAllFrames(): Frame[] {
  return Array.from(frameStore.values());
}
export function subscribeDrones(onUpdate: (list: Drone[]) => void) {
  const ws = new WebSocket("ws://82.26.104.161:3000/ws");
  // const ws = new WebSocket("ws://ace42530b32d.ngrok-free.app/ws");


  const droneMap = new Map<string, Drone>();
  // ✅ state เพิ่มเติมสำหรับตรวจจับโดรนที่ไม่ขยับเกิน 10 วินาที
  // - เก็บตำแหน่งล่าสุดที่เคลื่อนที่ (lastPos)
  // - เก็บเวลาเริ่มนิ่ง (stationarySince) เพื่อเช็คว่าเลย 10 วิหรือยัง
  const tracking = new Map<string, { lastPos?: [number, number]; stationarySince?: number }>();

  // ✅ ค่าเกณฑ์
  const STATIONARY_TIMEOUT_MS = 10_000; // 10 วินาที
  const MOVE_EPS_METERS = 2; // ถือว่า "ขยับ" ถ้าเกิน 2 เมตร (กัน jitter GPS)

  // ✅ ตั้ง interval เพื่อลบโดรนที่นิ่งเกินเวลาออกจาก list
  const pruneTimer = setInterval(() => {
    let removed = false;
    const now = Date.now();
    // ✅ 1) ลบกรณี "นิ่ง" เกินเวลา (ยังมีข้อความเข้าแต่ตำแหน่งไม่ขยับ)
    for (const [id, info] of tracking) {
      if (info.stationarySince && now - info.stationarySince > STATIONARY_TIMEOUT_MS) {
        tracking.delete(id);
        droneMap.delete(id);
        removed = true;
      }
    }
    // ✅ 2) ลบกรณี "สัญญาณหาย/ไม่อัปเดต" เกินเวลา (ไม่มีข้อความเข้าเลย)
    for (const [id, d] of droneMap) {
      const last = d.lastUpdate ? Date.parse(d.lastUpdate) : undefined;
      if (last && now - last > STATIONARY_TIMEOUT_MS) {
        tracking.delete(id);
        droneMap.delete(id);
        removed = true;
      }
    }
    // ถ้ามีการลบ ค่อยแจ้งอัปเดตให้ React
    if (removed) {
      onUpdate(Array.from(droneMap.values()));
    }
  }, 1_000);

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      
      // ✅ Handle "hello" message from server (connection confirmation)
      if (data.type === "hello" && data.ok) {
        console.log("👋 Received hello from server");
        return;
      }
      
      // ✅ รองรับทั้งรูปแบบเก่า (type: "drone") และรูปแบบใหม่ (frame with objects array)
      let objects: any[] = [];
      
      if (data.type === "drone") {
        // รูปแบบเก่า: single drone object
        objects = [data];
      } else if (data.objects && Array.isArray(data.objects)) {
        // รูปแบบใหม่: frame object with objects array (format from backend)
        // Format: { fram_id, cam_id, token_id, timestamp, image_info, objects: [...] }
        const frame: Frame = {
          fram_id: data.fram_id,
          cam_id: data.cam_id,
          token_id: data.token_id,
          timestamp: data.timestamp || new Date().toISOString(),
          image_info: data.image_info,
          objects: data.objects,
        };
        
        // ✅ เก็บ frame ตาม cam_id
        frameStore.set(frame.cam_id, frame);
        
        const frameTimestamp = frame.timestamp;
        objects = frame.objects.map((obj: any) => ({
          ...obj,
          timestamp: frameTimestamp,
          cam_id: frame.cam_id, // เพิ่ม cam_id ให้แต่ละ object
        }));
      } else {
        // ไม่ใช่รูปแบบที่รองรับ
        return;
      }

      // ✅ ประมวลผลแต่ละ object ใน frame
      for (const obj of objects) {
        const camId = obj.cam_id || data.cam_id;
        const timestamp = obj.timestamp || data.timestamp;
        const drone = mapBackendDrone(obj, camId, timestamp);
        const id = drone.id;

        // ✅ Validate position data
        if (!drone.position || !Array.isArray(drone.position) || drone.position.length !== 2) {
          console.warn(`⚠️ Invalid position for drone ${id}:`, drone.position);
          continue;
        }
        
        // ✅ Validate position values are numbers
        if (typeof drone.position[0] !== 'number' || typeof drone.position[1] !== 'number' ||
            isNaN(drone.position[0]) || isNaN(drone.position[1])) {
          console.warn(`⚠️ Invalid position values for drone ${id}:`, drone.position);
          continue;
        }

        // ✅ อัปเดต lastUpdate ให้เป็นปัจจุบันเสมอเมื่อมีข้อความเข้า
        drone.lastUpdate = new Date().toISOString();

        // ✅ ตรวจจับการเคลื่อนที่: ถ้าเปลี่ยนตำแหน่งมากกว่าเกณฑ์ ให้รีเซ็ตสถานะ "นิ่ง"
        const prev = tracking.get(id);
        const prevPos = prev?.lastPos;
        if (drone.position && prevPos) {
          const moved = distanceMeters(prevPos, drone.position) > MOVE_EPS_METERS;
          if (moved) {
            // ขยับ: รีเซ็ตเวลาเริ่มนิ่ง และอัปเดตตำแหน่งล่าสุด
            tracking.set(id, { lastPos: drone.position, stationarySince: undefined });
          } else {
            // ไม่ขยับ: ถ้ายังไม่ได้เริ่มนับ ให้นับตั้งแต่วินาทีนี้
            tracking.set(id, {
              lastPos: drone.position, // ✅ อัปเดตตำแหน่งล่าสุดเสมอ (แม้จะไม่ขยับมาก)
              stationarySince: prev?.stationarySince ?? Date.now(),
            });
          }
        } else {
          // ครั้งแรกที่เห็นหรือไม่มีตำแหน่งก่อนหน้า: ตั้งตำแหน่งเริ่มต้นไว้ (ยังไม่ถือว่าเป็นการนิ่ง)
          tracking.set(id, { lastPos: drone.position });
        }

        // ✅ เก็บ Drone ล่าสุดไว้ใน map (อัปเดตเสมอแม้ตำแหน่งจะไม่เปลี่ยนมาก)
        // ✅ ตรวจสอบว่ามีการเปลี่ยนแปลงตำแหน่งหรือไม่
        const existingDrone = droneMap.get(id);
        const positionChanged = !existingDrone || 
          !existingDrone.position || 
          !drone.position ||
          existingDrone.position[0] !== drone.position[0] ||
          existingDrone.position[1] !== drone.position[1];
        
        if (positionChanged) {
          console.log(`📍 Position updated for ${id}:`, {
            old: existingDrone?.position,
            new: drone.position,
            lat: drone.position[0],
            lng: drone.position[1],
          });
        }
        
        droneMap.set(id, drone);
      }

      // ✅ ส่งค่าออกไปให้ React ใช้ (รวมทุกโดรน) - อัปเดตเสมอแม้ตำแหน่งจะไม่เปลี่ยนมาก
      // ✅ สร้าง array ใหม่เพื่อให้ React detect การเปลี่ยนแปลง
      const updatedDrones = Array.from(droneMap.values());
      onUpdate(updatedDrones);
    } catch (error) {
      console.error("❌ Error processing WebSocket message:", error);
    }
  };

  // ✅ คืนฟังก์ชัน stop: ปิด WS และล้าง interval (สำคัญมาก)
  return () => {
    try { ws.close(); } catch {}
    clearInterval(pruneTimer);
  };
}

// ✅ แหล่งข้อมูลแบบ API Polling (ดึงจาก /api/drones เป็นระยะ)
// - ใช้เมื่ออยากสลับจาก WebSocket มาเป็น REST โดยไม่ลบของเก่า
export function subscribeDronesApi(onUpdate: (list: Drone[]) => void, intervalMs: number = 1000) {
  let stopped = false;
  let timer: any;

  const tick = async () => {
    if (stopped) return;
    try {
      const res = await fetch("/api/drones", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      // รองรับทั้ง array ของ raw และกรณีที่ backend ส่ง array ของ Drone อยู่แล้ว
      const list: Drone[] = Array.isArray(data)
        ? data.map((r: any) => (r.position ? (r as Drone) : mapBackendDrone(r)))
        : [];
      onUpdate(list);
    } catch (err) {
      // เงียบไว้/จะ log ก็ได้
      // console.warn("subscribeDronesApi error:", err);
    } finally {
      timer = setTimeout(tick, intervalMs);
    }
  };

  tick();

  return () => {
    stopped = true;
    if (timer) clearTimeout(timer);
  };
}
