// app/api/drones/route.js
import { NextResponse } from "next/server";

// ✅ Proxy API สำหรับดึงรายการโดรนจาก backend
// - ดึงจาก /frames/latest endpoint ซึ่งส่ง frame object พร้อม objects array
// - แปลง objects array ให้เป็น array ของ Drone ที่ frontend เข้าใจ
export async function GET() {
  try {
    // ✅ ใช้ backend URL (เหมือนกับ marks API)
    const backendUrl = process.env.DRONE_API_URL || 
                      process.env.NEXT_PUBLIC_BACKEND_URL || 
                      "http://82.26.104.161:3000";
    
    const url = `${backendUrl}/frames/latest`;
    
    const res = await fetch(url, { 
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
      },
    });
    
    if (!res.ok) {
      console.warn(`⚠️ Failed to fetch from ${url}: ${res.status}`);
      return NextResponse.json([], { status: 200 });
    }
    
    const frame = await res.json();
    
    // ✅ Handle empty frame
    if (!frame || !frame.objects || !Array.isArray(frame.objects)) {
      return NextResponse.json([], { status: 200 });
    }
    
    // ✅ แปลง objects array ให้เป็นรูป Drone ที่ frontend เข้าใจ
    // รูปแบบใหม่: { obj_id, type, lat, lng, alt, speed_kt }
    // รูปแบบเก่า: { drone_id, latitude, longitude, altitude_m, speed_mps }
    const toDrone = (obj) => {
      const droneId = obj.obj_id || obj.drone_id || obj.id || "unknown";
      const droneCallsign = (obj.obj_id || obj.drone_id || obj.id || "unnamed").toUpperCase();
      const droneIdLower = droneId.toLowerCase();
      
      // ✅ Special case: TRACK-0, TRACK-1, TRACK-02, and TRACK-03 are always HOSTILE
      if (droneIdLower === "track-0" || droneCallsign === "TRACK-0" || 
          droneIdLower === "track-1" || droneCallsign === "TRACK-1" ||
          droneIdLower === "track-02" || droneCallsign === "TRACK-02" ||
          droneIdLower === "track-03" || droneCallsign === "TRACK-03" ||
          droneId === "track-0" || droneId === "track-1" ||
          droneId === "TRACK-0" || droneId === "TRACK-1" ||
          droneId === "track-02" || droneId === "TRACK-02" ||
          droneId === "track-03" || droneId === "TRACK-03") {
        return {
          id: droneId,
          callsign: droneCallsign,
          type: obj.type || "UAV",
          status: "HOSTILE",
          speedKt: obj.speed_kt ?? (obj.speed_mps ? obj.speed_mps * 1.94384 : 0),
          altitudeFt: (obj.alt ?? obj.altitude_m ?? 0) * 3.28084,
          headingDeg: obj.heading_deg || 0,
          position: [
            obj.lat ?? obj.latitude ?? 0, 
            obj.lng ?? obj.longitude ?? 0
          ],
          lastUpdate: frame.timestamp || obj.timestamp || new Date().toISOString(),
          imageUrl: obj.image_path || undefined,
        };
      }
      
      // ✅ Special case: Drones "007" and "123" are always FRIEND
      if (droneId === "007" || droneCallsign === "007" || droneId === "123" || droneCallsign === "123") {
        return {
          id: droneId,
          callsign: droneCallsign,
          type: obj.type || "UAV",
          status: "FRIEND",
          speedKt: obj.speed_kt ?? (obj.speed_mps ? obj.speed_mps * 1.94384 : 0),
          altitudeFt: (obj.alt ?? obj.altitude_m ?? 0) * 3.28084,
          headingDeg: obj.heading_deg || 0,
          position: [
            obj.lat ?? obj.latitude ?? 0, 
            obj.lng ?? obj.longitude ?? 0
          ],
          lastUpdate: frame.timestamp || obj.timestamp || new Date().toISOString(),
          imageUrl: obj.image_path || undefined,
        };
      }
      
      // ✅ Default to HOSTILE for all drones except "007" and "123"
      // Only override if type/status explicitly says FRIEND
      let status = "HOSTILE";
      const objType = (obj.type || "").toLowerCase();
      if (objType.includes("friend") || objType === "friendly") {
        status = "FRIEND";
      }
      // ✅ Also check status field if provided directly
      if (obj.status) {
        const objStatus = String(obj.status).toUpperCase();
        if (objStatus === "FRIEND" || objStatus === "HOSTILE" || objStatus === "UNKNOWN") {
          status = objStatus;
        }
      }
      
      return {
        id: droneId,
        callsign: droneCallsign,
        type: obj.type || "UAV",
        status: status,
        speedKt: obj.speed_kt ?? (obj.speed_mps ? obj.speed_mps * 1.94384 : 0), // รองรับทั้ง knots และ m/s
        altitudeFt: (obj.alt ?? obj.altitude_m ?? 0) * 3.28084, // m → feet (รองรับทั้ง alt และ altitude_m)
        headingDeg: obj.heading_deg || 0,
        position: [
          obj.lat ?? obj.latitude ?? 0, 
          obj.lng ?? obj.longitude ?? 0
        ], // รองรับทั้ง lat/lng และ latitude/longitude
        lastUpdate: frame.timestamp || obj.timestamp || new Date().toISOString(),
        imageUrl: obj.image_path || undefined,
      };
    };
    
    const list = frame.objects.map(toDrone);
    return NextResponse.json(list, { status: 200 });
  } catch (e) {
    console.error("❌ Error fetching drones:", e);
    return NextResponse.json([], { status: 200 });
  }
}
