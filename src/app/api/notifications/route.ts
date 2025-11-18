import { NextResponse } from 'next/server';

export async function GET(_request: Request) {
  // TODO: Implement actual notifications query
  // For now, return empty array
  return NextResponse.json({
    notifications: [],
    total: 0,
  });
}

export async function POST(request: Request) {
  const body = await request.json();
  
  // TODO: Implement create notification
  return NextResponse.json({
    success: true,
    notification: {
      id: 'temp-id',
      ...body,
    },
  });
}
