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
/**
 * Drone interface สำหรับแสดงผลบนแผนที่
 */
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
  mgrs?: string;
  imageUrl?: string;
}

/**
 * คำนวณระยะห่างแบบ Haversine (เมตร) เพื่อเช็คว่า "ขยับ" หรือไม่
 */
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

/**
 * แปลงข้อมูลจาก API object-detection ให้เป็น Drone interface
 */
function mapDetectedObjectToDrone(obj: any, cameraInfo: any): Drone {
  const lat = parseFloat(obj.lat);
  const lng = parseFloat(obj.lng);
  
  // กำหนด status จาก objective
  let status: "FRIEND" | "HOSTILE" = "HOSTILE";
  if (obj.objective === "our" || obj.objective === "friend") {
    status = "FRIEND";
  }

  return {
    id: obj.obj_id,
    callsign: obj.obj_id.toUpperCase(),
    type: obj.type || "drone",
    status,
    speedKt: 0, // API ไม่มีข้อมูล speed ให้ set เป็น 0
    altitudeFt: 0, // API ไม่มีข้อมูล altitude ให้ set เป็น 0
    headingDeg: 0, // API ไม่มีข้อมูล heading ให้ set เป็น 0
    position: [lat, lng],
    lastUpdate: new Date().toISOString(),
    mgrs: undefined, // API ไม่มีข้อมูล MGRS
    imageUrl: undefined, // API ไม่มีข้อมูล imageUrl
  };
}

/**
 * Subscribe to real-time drone updates from Socket.IO
 * ใช้ Socket.IO เชื่อมต่อกับ API และรับข้อมูลแบบ real-time
 */
export function subscribeDrones(onUpdate: (list: Drone[]) => void) {
  // ใช้ environment variables จาก .env
  const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'https://tesa-api.crma.dev';
  const CAMERA_ID = process.env.NEXT_PUBLIC_CAMERA_ID || '';

  // เชื่อมต่อ Socket.IO
  const socket = require('socket.io-client')(SOCKET_URL);

  const droneMap = new Map<string, Drone>();
  const tracking = new Map<string, { lastPos?: [number, number]; stationarySince?: number }>();

  // ค่าเกณฑ์
  const STATIONARY_TIMEOUT_MS = 10_000; // 10 วินาที
  const MOVE_EPS_METERS = 2; // ถือว่า "ขยับ" ถ้าเกิน 2 เมตร

  // เมื่อเชื่อมต่อสำเร็จ
  socket.on('connect', () => {
    console.log('Connected to Socket.IO server');
    // Subscribe to camera
    socket.emit('subscribe_camera', { cam_id: CAMERA_ID });
  });

  // รับข้อมูล object detection แบบ real-time
  socket.on('object_detection', (data: any) => {
    console.log('Received object detection:', data);

    if (!data.objects || !Array.isArray(data.objects)) {
      return;
    }

    // แปลง objects ทั้งหมดเป็น Drone
    data.objects.forEach((obj: any) => {
      const drone = mapDetectedObjectToDrone(obj, data.camera);
      const id = drone.id;

      // อัปเดต lastUpdate
      drone.lastUpdate = new Date().toISOString();

      // ตรวจจับการเคลื่อนที่
      const prev = tracking.get(id);
      const prevPos = prev?.lastPos;
      
      if (drone.position && prevPos) {
        const moved = distanceMeters(prevPos, drone.position) > MOVE_EPS_METERS;
        if (moved) {
          tracking.set(id, { lastPos: drone.position, stationarySince: undefined });
        } else {
          tracking.set(id, {
            lastPos: prevPos,
            stationarySince: prev?.stationarySince ?? Date.now(),
          });
        }
      } else {
        tracking.set(id, { lastPos: drone.position });
      }

      droneMap.set(id, drone);
    });

    // ส่งข้อมูลอัปเดตไปให้ React
    onUpdate(Array.from(droneMap.values()));
  });

  // ตั้ง interval เพื่อลบโดรนที่นิ่งเกินเวลา
  const pruneTimer = setInterval(() => {
    let removed = false;
    const now = Date.now();

    // ลบกรณี "นิ่ง" เกินเวลา
    for (const [id, info] of tracking) {
      if (info.stationarySince && now - info.stationarySince > STATIONARY_TIMEOUT_MS) {
        tracking.delete(id);
        droneMap.delete(id);
        removed = true;
      }
    }

    // ลบกรณี "สัญญาณหาย" เกินเวลา
    for (const [id, d] of droneMap) {
      const last = d.lastUpdate ? Date.parse(d.lastUpdate) : undefined;
      if (last && now - last > STATIONARY_TIMEOUT_MS) {
        tracking.delete(id);
        droneMap.delete(id);
        removed = true;
      }
    }

    if (removed) {
      onUpdate(Array.from(droneMap.values()));
    }
  }, 1_000);

  socket.on('disconnect', () => {
    console.log('Disconnected from Socket.IO server');
  });

  // คืนฟังก์ชัน cleanup
  return () => {
    socket.emit('unsubscribe_camera', { cam_id: CAMERA_ID });
    socket.disconnect();
    clearInterval(pruneTimer);
  };
}
