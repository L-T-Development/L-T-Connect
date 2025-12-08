import { NextRequest, NextResponse } from 'next/server';
import { sendNotificationEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { name, email, notificationTitle, notificationMessage, actionUrl } = body;

        // Validate required fields
        if (!name || !email || !notificationTitle || !notificationMessage) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        // Send notification email
        const result = await sendNotificationEmail({
            name,
            email,
            notificationTitle,
            notificationMessage,
            actionUrl,
        });

        if (!result.success) {
            return NextResponse.json(
                { error: result.error || 'Failed to send email' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            emailId: result.emailId
        });
    } catch (error: unknown) {
        console.error('Error in send-notification-email API:', error);
        return NextResponse.json(
            { error: (error instanceof Error ? error.message : String(error)) || 'Internal server error' },
            { status: 500 }
        );
    }
}
