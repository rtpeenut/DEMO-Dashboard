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
export interface Drone {
  id: string;
  callsign: string;
  type: string;
  status: "FRIEND" | "HOSTILE";
  speedKt: number;
  altitudeFt: number;
  headingDeg: number;
  position: [number, number];
  lastUpdate?: string;
  imageUrl?: string;
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
export function mapBackendDrone(raw: any): Drone {
  return {
    id: raw.drone_id || raw.id || "unknown",
    callsign: raw.drone_id?.toUpperCase() || "UNNAMED",
    type: "UAV",
    status: "HOSTILE", // หรือจะปรับจาก raw.confidence ก็ได้
    speedKt: raw.speed_mps ? raw.speed_mps * 1.94384 : 0, // m/s → knots
    altitudeFt: raw.altitude_m ? raw.altitude_m * 3.28084 : 0, // m → feet
    headingDeg: 0, // ถ้ามี heading ใน data ค่อยเพิ่ม
    position: [raw.latitude, raw.longitude],
    lastUpdate: raw.timestamp || new Date().toISOString(),
    imageUrl: raw.image_path || undefined, // ใช้ undefined ถ้าไม่มีรูป
  };
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
    const data = JSON.parse(event.data);
    if (data.type !== "drone") return;

    const drone = mapBackendDrone(data);
    const id = drone.id;

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
          lastPos: prevPos,
          stationarySince: prev?.stationarySince ?? Date.now(),
        });
      }
    } else {
      // ครั้งแรกที่เห็นหรือไม่มีตำแหน่งก่อนหน้า: ตั้งตำแหน่งเริ่มต้นไว้ (ยังไม่ถือว่าเป็นการนิ่ง)
      tracking.set(id, { lastPos: drone.position });
    }

    // ✅ เก็บ Drone ล่าสุดไว้ใน map
    droneMap.set(id, drone);

    // ✅ ส่งค่าออกไปให้ React ใช้ (รวมทุกโดรน)
    onUpdate(Array.from(droneMap.values()));
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
