import { NextResponse } from "next/server";

// ✅ Proxy API สำหรับ marks - ดึงจาก backend
const getBackendUrl = () => {
  return process.env.MARK_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3000";
};

// ✅ DELETE /api/marks/[id] - Delete a mark by id
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    // Handle both Next.js 13/14 (sync params) and 15+ (async params)
    const resolvedParams = params instanceof Promise ? await params : params;
    const { id } = resolvedParams;

    if (!id) {
      return NextResponse.json(
        { error: "Mark ID is required" },
        { status: 400 }
      );
    }

    const backendUrl = getBackendUrl();
    const url = `${backendUrl}/marks/${id}`;
    
    const res = await fetch(url, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });
    
    if (!res.ok) {
      // Fallback to in-memory storage if backend is not available
      const { deleteMark } = await import("@/app/libs/MapData");
      const deleted = deleteMark(id);
      
      if (!deleted) {
        return NextResponse.json(
          { error: "Mark not found" },
          { status: 404 }
        );
      }
      
      return NextResponse.json(
        { message: "Mark deleted successfully" },
        { status: 200 }
      );
    }
    
    const result = await res.json();
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("Error deleting mark:", error);
    // Fallback to in-memory storage
    try {
      const { deleteMark } = await import("@/app/libs/MapData");
      const resolvedParams = params instanceof Promise ? await params : params;
      const { id } = resolvedParams;
      const deleted = deleteMark(id);
      
      if (!deleted) {
        return NextResponse.json(
          { error: "Mark not found" },
          { status: 404 }
        );
      }
      
      return NextResponse.json(
        { message: "Mark deleted successfully" },
        { status: 200 }
      );
    } catch (fallbackError) {
      return NextResponse.json(
        { error: "Failed to delete mark" },
        { status: 500 }
      );
    }
  }
}

