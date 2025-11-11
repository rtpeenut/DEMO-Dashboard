// app/api/drones/route.js
import { NextResponse } from "next/server";

// ✅ Proxy/Mock API สำหรับดึงรายการโดรนเป็นระยะ
// - ถ้าตั้ง DRONE_API_URL จะดึงจากภายนอกแล้ว map ให้เป็นรูปแบบที่ UI ใช้ได้
// - ถ้าไม่ตั้ง จะส่งอาร์เรย์เปล่ากลับไป (หรือจะคืน mock ท้องถิ่นก็ได้)
export async function GET() {
  try {
    const url = process.env.DRONE_API_URL;
    if (url) {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) {
        return NextResponse.json([], { status: 200 });
      }
      const raw = await res.json();
      // แปลงเบื้องต้นให้เป็นรูป Drone ที่ frontend เข้าใจ
      const toDrone = (r) => ({
        id: r.drone_id || r.id || "unknown",
        callsign: (r.drone_id || r.id || "unnamed").toUpperCase(),
        type: "UAV",
        status: "HOSTILE",
        speedKt: r.speed_mps ? r.speed_mps * 1.94384 : 0,
        altitudeFt: r.altitude_m ? r.altitude_m * 3.28084 : 0,
        headingDeg: r.heading_deg || 0,
        position: [r.latitude, r.longitude],
        lastUpdate: r.timestamp || new Date().toISOString(),
      });
      const list = Array.isArray(raw) ? raw.map(toDrone) : [];
      return NextResponse.json(list, { status: 200 });
    }
    // ไม่มี DRONE_API_URL → คืน array ว่างไว้ก่อน
    return NextResponse.json([], { status: 200 });
  } catch (e) {
    return NextResponse.json([], { status: 200 });
  }
}
