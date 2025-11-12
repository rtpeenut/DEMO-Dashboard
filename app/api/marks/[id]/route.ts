import { NextResponse } from "next/server";

// ✅ Proxy API สำหรับ marks - ดึงจาก backend
const getBackendUrl = () => {
  return process.env.MARK_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "http://82.26.104.161:3000";
};

const buildBackendUrl = (path: string) => {
  const base = getBackendUrl();
  const normalizedBase = base.endsWith("/") ? base : `${base}/`;
  return new URL(path, normalizedBase).toString();
};

const safeParseJson = async (res: Response) => {
  try {
    return await res.json();
  } catch {
    return null;
  }
};

const isPromise = <T = unknown>(value: unknown): value is Promise<T> => {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as any).then === "function"
  );
};

// ✅ DELETE /api/marks/[id] - Delete a mark by id
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const resolvedParams = isPromise<{ id: string }>(params)
    ? await params
    : params;
  const id = resolvedParams?.id;

  if (!id) {
    return NextResponse.json(
      { error: "Mark ID is required" },
      { status: 400 }
    );
  }

  try {
    const url = buildBackendUrl(`marks/${encodeURIComponent(id)}`);

    const res = await fetch(url, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    if (res.ok) {
      if (res.status === 204) {
        return NextResponse.json(
          { message: "Mark deleted successfully" },
          { status: 200 }
        );
      }
      const result = await safeParseJson(res);
      return NextResponse.json(
        result ?? { message: "Mark deleted successfully" },
        { status: 200 }
      );
    }

    const errorPayload = await safeParseJson(res);
    if (errorPayload) {
      return NextResponse.json(errorPayload, { status: res.status });
    }
    return NextResponse.json(
      { error: "Failed to delete mark" },
      { status: res.status }
    );
  } catch (error) {
    console.error("Error deleting mark:", error);
    // Fallback to in-memory storage
    try {
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
    } catch (fallbackError) {
      return NextResponse.json(
        { error: "Failed to delete mark" },
        { status: 500 }
      );
    }
  }
}

