import { NextRequest, NextResponse } from 'next/server';
import { 
  sendLeaveApprovalEmail, 
  sendLeaveRejectionEmail 
} from '@/services/email/resend-service';

/**
 * API route to send leave-related emails
 * This must be done server-side since RESEND_API_KEY is not available on client
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, ...emailData } = body;

    let result;

    if (type === 'approval') {
      const { to, employeeName, leaveType, startDate, endDate, days, approverName } = emailData;
      
      if (!to || !employeeName || !leaveType || !startDate || !endDate || !days || !approverName) {
        return NextResponse.json(
          { error: 'Missing required fields for approval email' },
          { status: 400 }
        );
      }

      result = await sendLeaveApprovalEmail({
        to,
        employeeName,
        leaveType,
        startDate,
        endDate,
        days,
        approverName,
      });
    } else if (type === 'rejection') {
      const { to, employeeName, leaveType, startDate, endDate, days, rejectionReason, approverName } = emailData;
      
      if (!to || !employeeName || !leaveType || !startDate || !endDate || !days || !rejectionReason || !approverName) {
        return NextResponse.json(
          { error: 'Missing required fields for rejection email' },
          { status: 400 }
        );
      }

      result = await sendLeaveRejectionEmail({
        to,
        employeeName,
        leaveType,
        startDate,
        endDate,
        days,
        rejectionReason,
        approverName,
      });
    } else {
      return NextResponse.json(
        { error: 'Invalid email type. Must be "approval" or "rejection"' },
        { status: 400 }
      );
    }

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to send email' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      message: `Leave ${type} email sent successfully` 
    });
  } catch (error: any) {
    console.error('Error sending leave email:', error);
    return NextResponse.json(
      { error: (error instanceof Error ? error.message : String(error)) || 'Internal server error' },
      { status: 500 }
    );
  }
}
