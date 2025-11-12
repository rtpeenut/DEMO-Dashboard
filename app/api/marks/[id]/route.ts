import { NextResponse } from "next/server";

// ✅ Proxy API สำหรับ marks - ดึงจาก backend
const getBackendUrl = () => {
  return process.env.MARK_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "http://82.26.104.161:3000";
};

const buildBackendUrl = (path: string, baseOverride?: string) => {
  const base = baseOverride ?? getBackendUrl();
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

const shouldUseFallback = (backendUrl: string) => {
  return /(?:^|\/\/)(localhost|127\.0\.0\.1)(?::\d+)?/i.test(backendUrl);
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

  const backendUrl = getBackendUrl();
  const useFallback = shouldUseFallback(backendUrl);

  try {
    const url = buildBackendUrl(`marks/${encodeURIComponent(id)}`, backendUrl);

    const res = await fetch(url, {
      method: "DELETE",
      headers: {
        Connection: "close",
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
    return NextResponse.json(
      errorPayload ?? { error: "Failed to delete mark" },
      { status: res.status }
    );
  } catch (error) {
    console.error("Error deleting mark via backend:", error);

    if (!useFallback) {
      return NextResponse.json(
        { error: "Failed to reach backend service for deletion" },
        { status: 502 }
      );
    }

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
        { message: "Mark deleted successfully (fallback storage)" },
        { status: 200 }
      );
    } catch (fallbackError) {
      console.error("Fallback delete failed:", fallbackError);
      return NextResponse.json(
        { error: "Failed to delete mark" },
        { status: 500 }
      );
    }
  }
}

