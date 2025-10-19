// app/api/drones/route.js
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ message: "WebSocket feed only — no REST endpoint" });
}
