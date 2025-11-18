import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const workspaceId = searchParams.get('workspaceId');

  // TODO: Implement actual unread count query using workspaceId
  // For now, return 0
  return NextResponse.json({
    count: 0,
    workspaceId,
  });
}
