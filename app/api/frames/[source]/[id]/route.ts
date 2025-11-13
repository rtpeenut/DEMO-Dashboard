import { NextRequest, NextResponse } from "next/server";

// ✅ GET /api/frames/[source]/[id] - Serve camera frame image
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ source: string; id: string }> }
) {
  try {
    // ✅ Await params (Next.js 15 requirement)
    const { source, id } = await params;
    
    // ลบ .jpg extension ถ้ามี
    const frameId = id.replace('.jpg', '');
    
    // ✅ ลองหลาย ports และ IPs - ใช้ IP เดียวกับ WebSocket (180) ก่อน
    const possibleUrls = [
      `http://82.26.104.180:3000/frames/${source}/${frameId}.jpg`,
      `http://82.26.104.161:3000/frames/${source}/${frameId}.jpg`,
      `http://82.26.104.180:8000/frames/${source}/${frameId}.jpg`,
      `http://82.26.104.161:8000/frames/${source}/${frameId}.jpg`,
      `http://82.26.104.180:5000/frames/${source}/${frameId}.jpg`,
      `http://localhost:8000/frames/${source}/${frameId}.jpg`,
    ];
    
    let response: Response | null = null;
    let successUrl = '';
    
    // ลองแต่ละ URL จนกว่าจะเจอ
    for (const imageUrl of possibleUrls) {
      try {
        console.log('🖼️ Trying image URL:', imageUrl);
        const res = await fetch(imageUrl, {
          cache: 'no-store',
          signal: AbortSignal.timeout(2000), // timeout 2 seconds
        });
        
        if (res.ok) {
          response = res;
          successUrl = imageUrl;
          console.log('✅ Image found at:', imageUrl);
          break;
        }
      } catch (err) {
        // ลอง URL ถัดไป
        continue;
      }
    }
    
    if (!response) {
      console.error('❌ Image not found in any URL for:', source, frameId);
      return NextResponse.json(
        { error: 'Image not found' },
        { status: 404 }
      );
    }
    
    // Get image buffer
    const imageBuffer = await response.arrayBuffer();
    
    // Return image with proper headers
    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (error) {
    console.error('Error serving frame image:', error);
    return NextResponse.json(
      { error: 'Failed to serve image' },
      { status: 500 }
    );
  }
}
