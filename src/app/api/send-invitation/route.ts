import { NextRequest, NextResponse } from 'next/server';
import { sendWorkspaceInvitationEmail } from '@/services/email/resend-service';

/**
 * API route to send workspace invitation emails
 * This must be done server-side since RESEND_API_KEY is not available on client
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { to, workspaceName, inviterName, inviteCode } = body;

    // Validate required fields
    if (!to || !workspaceName || !inviterName || !inviteCode) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Send the invitation email
    const result = await sendWorkspaceInvitationEmail({
      to,
      workspaceName,
      inviterName,
      inviteCode,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to send invitation email' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Invitation email sent successfully' 
    });
  } catch (error: any) {
    console.error('Error sending invitation email:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
