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
                      "http://localhost:3000";
    
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
    const toDrone = (obj) => ({
      id: obj.obj_id || obj.drone_id || obj.id || "unknown",
      callsign: (obj.obj_id || obj.drone_id || obj.id || "unnamed").toUpperCase(),
      type: obj.type || "UAV",
      status: "HOSTILE",
      speedKt: obj.speed_kt ?? (obj.speed_mps ? obj.speed_mps * 1.94384 : 0), // รองรับทั้ง knots และ m/s
      altitudeFt: (obj.alt ?? obj.altitude_m ?? 0) * 3.28084, // m → feet (รองรับทั้ง alt และ altitude_m)
      headingDeg: obj.heading_deg || 0,
      position: [
        obj.lat ?? obj.latitude ?? 0, 
        obj.lng ?? obj.longitude ?? 0
      ], // รองรับทั้ง lat/lng และ latitude/longitude
      lastUpdate: frame.timestamp || obj.timestamp || new Date().toISOString(),
      imageUrl: obj.image_path || undefined,
    });
    
    const list = frame.objects.map(toDrone);
    return NextResponse.json(list, { status: 200 });
  } catch (e) {
    console.error("❌ Error fetching drones:", e);
    return NextResponse.json([], { status: 200 });
  }
}
