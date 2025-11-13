import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: { droneId: string } }
) {
  try {
    const { droneId } = params;
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://82.26.104.180:3000';
    const response = await fetch(`${apiUrl}/api/detection/${droneId}/path`, {
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching drone path:', error);
    return NextResponse.json({ error: 'Failed to fetch drone path' }, { status: 500 });
  }
}
