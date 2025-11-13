import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://82.26.104.180:3000';
    const response = await fetch(`${apiUrl}/api/detection/drone-ids`, {
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching drone IDs:', error);
    return NextResponse.json({ error: 'Failed to fetch drone IDs' }, { status: 500 });
  }
}
