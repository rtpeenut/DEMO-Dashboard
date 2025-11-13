import { NextResponse } from "next/server";
import { getAllFrames } from "@/app/libs/MapData";

// ✅ GET /api/frames - Fetch all camera frames
export async function GET() {
  try {
    const frames = getAllFrames();
    return NextResponse.json(frames, { status: 200 });
  } catch (error) {
    console.error("Error fetching frames:", error);
    return NextResponse.json(
      { error: "Failed to fetch frames" },
      { status: 500 }
    );
  }
}
