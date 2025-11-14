// app/api/drones/route.js
import { NextResponse } from "next/server";

// ✅ Proxy API สำหรับดึงรายการโดรนจาก backend
// - ดึงจาก /api/drones endpoint ซึ่งส่ง array ของ drone summaries
// - แปลงให้เป็น array ของ Drone ที่ frontend เข้าใจ
export async function GET() {
  try {
    // ✅ ใช้ backend URL
    const backendUrl = process.env.DRONE_API_URL || 
                      process.env.NEXT_PUBLIC_BACKEND_URL || 
                      "http://localhost:3000";
    
    const url = `${backendUrl}/api/drones`;
    
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
    
    const drones = await res.json();
    
    // ✅ Handle empty or invalid response
    if (!Array.isArray(drones)) {
      return NextResponse.json([], { status: 200 });
    }
    
    // ✅ แปลง backend drone format ให้เป็นรูป Drone ที่ frontend เข้าใจ
    // Backend format: { id, lastSeenAt, lastLat, lastLon, lastAltM, lastSpeedMS, lastHeadingDeg, ... }
    const toDrone = (drone) => ({
      id: drone.id || "unknown",
      callsign: (drone.id || "unnamed").toUpperCase(),
      type: "UAV",
      status: "HOSTILE",
      speedKt: drone.lastSpeedMS ? drone.lastSpeedMS * 1.94384 : 0, // m/s → knots
      altitudeFt: drone.lastAltM ? drone.lastAltM * 3.28084 : 0, // m → feet
      headingDeg: drone.lastHeadingDeg || 0,
      position: [
        drone.lastLat ?? 0, 
        drone.lastLon ?? 0
      ],
      lastUpdate: drone.lastSeenAt || drone.updatedAt || new Date().toISOString(),
    });
    
    const list = drones.map(toDrone).filter(d => d.position[0] !== 0 || d.position[1] !== 0); // Filter out drones with no position
    return NextResponse.json(list, { status: 200 });
  } catch (e) {
    console.error("❌ Error fetching drones:", e);
    return NextResponse.json([], { status: 200 });
  }
}
