import { NextResponse } from "next/server";

// ✅ Proxy API สำหรับ marks - ดึงจาก backend
// - ถ้าตั้ง MARK_API_URL จะดึงจาก backend
// - ถ้าไม่ตั้ง จะใช้ fallback เป็น in-memory storage

const getBackendUrl = () => {
  return process.env.MARK_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "http://82.26.104.161:3000";
};

// ✅ GET /api/marks - Fetch all marks
export async function GET() {
  try {
    const backendUrl = getBackendUrl();
    const url = `${backendUrl}/marks`;
    
    const res = await fetch(url, { 
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
      },
    });
    
    if (!res.ok) {
      // Fallback to in-memory storage if backend is not available
      const { getMarks } = await import("@/app/libs/MapData");
      const marks = getMarks();
      return NextResponse.json(marks, { status: 200 });
    }
    
    const data = await res.json();
    // Transform backend format to frontend format
    const formatted = Array.isArray(data) 
      ? data.map((m: any) => ({
          id: m.id,
          name: m.name,
          color: m.color,
          pos: m.pos || [m.latDeg, m.lonDeg],
          radius: m.radius || m.radiusM,
          createdAt: m.createdAt,
        }))
      : [];
    
    return NextResponse.json(formatted, { status: 200 });
  } catch (error) {
    console.error("Error fetching marks:", error);
    // Fallback to in-memory storage
    try {
      const { getMarks } = await import("@/app/libs/MapData");
      const marks = getMarks();
      return NextResponse.json(marks, { status: 200 });
    } catch (fallbackError) {
      return NextResponse.json(
        { error: "Failed to fetch marks" },
        { status: 500 }
      );
    }
  }
}

// ✅ POST /api/marks - Create a new mark
export async function POST(request: Request) {
  let body: any;
  try {
    body = await request.json();
    const { name, color, pos, radius } = body;

    // Validate required fields
    if (!name || !color || !Array.isArray(pos) || pos.length !== 2 || typeof radius !== "number") {
      return NextResponse.json(
        { error: "Invalid mark data. Required: name, color, pos [lat, lng], radius" },
        { status: 400 }
      );
    }

    // Validate position values
    if (typeof pos[0] !== "number" || typeof pos[1] !== "number") {
      return NextResponse.json(
        { error: "Position must be an array of two numbers [lat, lng]" },
        { status: 400 }
      );
    }

    const backendUrl = getBackendUrl();
    const url = `${backendUrl}/marks`;
    
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name, color, pos, radius }),
      cache: "no-store",
    });
    
    if (!res.ok) {
      // Fallback to in-memory storage if backend is not available
      const { addMark } = await import("@/app/libs/MapData");
      const newMark = addMark({
        name: String(name),
        color: String(color),
        pos: [pos[0], pos[1]] as [number, number],
        radius: Number(radius),
      });
      return NextResponse.json(newMark, { status: 201 });
    }
    
    const newMark = await res.json();
    // Transform backend format to frontend format
    const formatted = {
      id: newMark.id,
      name: newMark.name,
      color: newMark.color,
      pos: newMark.pos || [newMark.latDeg, newMark.lonDeg],
      radius: newMark.radius || newMark.radiusM,
      createdAt: newMark.createdAt,
    };
    
    return NextResponse.json(formatted, { status: 201 });
  } catch (error) {
    console.error("Error creating mark:", error);
    // Fallback to in-memory storage
    if (body) {
      try {
        const { addMark } = await import("@/app/libs/MapData");
        const { name, color, pos, radius } = body;
        const newMark = addMark({
          name: String(name),
          color: String(color),
          pos: [pos[0], pos[1]] as [number, number],
          radius: Number(radius),
        });
        return NextResponse.json(newMark, { status: 201 });
      } catch (fallbackError) {
        return NextResponse.json(
          { error: "Failed to create mark" },
          { status: 500 }
        );
      }
    }
    return NextResponse.json(
      { error: "Failed to create mark" },
      { status: 500 }
    );
  }
}

