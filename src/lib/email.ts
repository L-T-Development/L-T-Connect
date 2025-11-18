/**
 * Email Service using Resend
 * Handles all email communications for user onboarding and workspace invitations
 */

import { Resend } from 'resend';

// Only initialize Resend on the server-side
const resend = typeof window === 'undefined' 
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'L&T Connect <connect@nagarji.in>';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

interface WelcomeEmailParams {
  name: string;
  email: string;
  tempPassword: string;
  workspaceName: string;
}

interface WorkspaceInvitationParams {
  name: string;
  email: string;
  workspaceName: string;
  invitedBy: string;
  invitationToken: string;
}

interface PasswordChangedParams {
  name: string;
  email: string;
}

/**
 * Send welcome email with temporary password to new user
 */
export async function sendWelcomeEmail({
  name,
  email,
  tempPassword,
  workspaceName,
}: WelcomeEmailParams) {
  // Check if running on server-side
  if (!resend) {
    console.warn('⚠️ Email service called on client-side, skipping...');
    return { success: false, error: 'Email service not available on client-side' };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: `Welcome to ${workspaceName} - L&T Connect`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Welcome to L&T Connect</title>
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to L&T Connect!</h1>
            </div>
            
            <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb;">
              <p style="font-size: 16px; margin-bottom: 20px;">Hi <strong>${name}</strong>,</p>
              
              <p style="font-size: 16px; margin-bottom: 20px;">
                You've been added to <strong>${workspaceName}</strong> workspace. 
                Your account has been created and you can now access the platform.
              </p>
              
              <div style="background: white; padding: 20px; border-radius: 8px; border: 2px solid #667eea; margin: 25px 0;">
                <h2 style="margin-top: 0; font-size: 18px; color: #667eea;">Your Login Credentials</h2>
                <p style="margin: 10px 0;">
                  <strong>Email:</strong> ${email}<br>
                  <strong>Temporary Password:</strong> <code style="background: #f3f4f6; padding: 4px 8px; border-radius: 4px; font-size: 14px;">${tempPassword}</code>
                </p>
              </div>
              
              <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px;">
                <p style="margin: 0; font-size: 14px;">
                  <strong>⚠️ Important:</strong> This is a temporary password. 
                  You will be required to change it immediately after your first login for security purposes.
                </p>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${APP_URL}/sign-in" 
                   style="display: inline-block; background: #667eea; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                  Login to Your Account
                </a>
              </div>
              
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                <h3 style="font-size: 16px; margin-bottom: 10px;">Getting Started</h3>
                <ul style="font-size: 14px; color: #6b7280;">
                  <li>Login with your temporary password</li>
                  <li>Create a new secure password</li>
                  <li>Complete your profile</li>
                  <li>Start collaborating with your team</li>
                </ul>
              </div>
              
              <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
                If you have any questions or need assistance, please contact your workspace administrator.
              </p>
              
              <p style="font-size: 14px; color: #6b7280; margin-top: 20px;">
                Best regards,<br>
                <strong>The L&T Connect Team</strong>
              </p>
            </div>
            
            <div style="text-align: center; padding: 20px; font-size: 12px; color: #9ca3af;">
              <p>This email was sent by L&T Connect</p>
              <p>If you did not request this account, please ignore this email.</p>
            </div>
          </body>
        </html>
      `,
    });

    if (error) {
      console.error('Error sending welcome email:', error);
      throw new Error(`Failed to send welcome email: ${error.message}`);
    }

    console.log('✅ Welcome email sent to:', email, '- ID:', data?.id);
    return { success: true, emailId: data?.id };
  } catch (error: any) {
    console.error('Failed to send welcome email:', error);
    throw error;
  }
}

/**
 * Send workspace invitation to existing user
 */
export async function sendWorkspaceInvitation({
  name,
  email,
  workspaceName,
  invitedBy,
  invitationToken,
}: WorkspaceInvitationParams) {
  // Check if running on server-side
  if (!resend) {
    console.warn('⚠️ Email service called on client-side, skipping...');
    return { success: false, error: 'Email service not available on client-side' };
  }

  const acceptUrl = `${APP_URL}/workspace-invitation/${invitationToken}?action=accept`;
  const declineUrl = `${APP_URL}/workspace-invitation/${invitationToken}?action=decline`;

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: `Invitation to join ${workspaceName} - L&T Connect`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Workspace Invitation</title>
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">📨 Workspace Invitation</h1>
            </div>
            
            <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb;">
              <p style="font-size: 16px; margin-bottom: 20px;">Hi <strong>${name}</strong>,</p>
              
              <p style="font-size: 16px; margin-bottom: 20px;">
                <strong>${invitedBy}</strong> has invited you to join the <strong>${workspaceName}</strong> workspace on L&T Connect.
              </p>
              
              <div style="background: white; padding: 20px; border-radius: 8px; border: 2px solid #667eea; margin: 25px 0; text-align: center;">
                <h2 style="margin-top: 0; font-size: 18px; color: #667eea;">Join ${workspaceName}</h2>
                <p style="color: #6b7280; font-size: 14px;">Click below to accept or decline this invitation</p>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${acceptUrl}" 
                   style="display: inline-block; background: #10b981; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; margin: 0 10px;">
                  ✓ Accept Invitation
                </a>
                <a href="${declineUrl}" 
                   style="display: inline-block; background: #ef4444; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; margin: 0 10px;">
                  ✗ Decline
                </a>
              </div>
              
              <div style="background: #dbeafe; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; border-radius: 4px;">
                <p style="margin: 0; font-size: 14px;">
                  <strong>ℹ️ Note:</strong> If you accept, you'll be able to switch between all your workspaces 
                  using the workspace switcher in the top navigation.
                </p>
              </div>
              
              <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
                This invitation link will expire in 7 days for security purposes.
              </p>
              
              <p style="font-size: 14px; color: #6b7280; margin-top: 20px;">
                Best regards,<br>
                <strong>The L&T Connect Team</strong>
              </p>
            </div>
            
            <div style="text-align: center; padding: 20px; font-size: 12px; color: #9ca3af;">
              <p>This email was sent by L&T Connect</p>
              <p>If you did not expect this invitation, you can safely ignore this email.</p>
            </div>
          </body>
        </html>
      `,
    });

    if (error) {
      console.error('Error sending workspace invitation:', error);
      throw new Error(`Failed to send workspace invitation: ${error.message}`);
    }

    console.log('✅ Workspace invitation sent to:', email, '- ID:', data?.id);
    return { success: true, emailId: data?.id };
  } catch (error: any) {
    console.error('Failed to send workspace invitation:', error);
    throw error;
  }
}

/**
 * Send password changed confirmation email
 */
export async function sendPasswordChangedEmail({
  name,
  email,
}: PasswordChangedParams) {
  // Check if running on server-side
  if (!resend) {
    console.warn('⚠️ Email service called on client-side, skipping...');
    return { success: false, error: 'Email service not available on client-side' };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: 'Password Changed Successfully - L&T Connect',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Password Changed</title>
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">🔒 Password Changed</h1>
            </div>
            
            <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb;">
              <p style="font-size: 16px; margin-bottom: 20px;">Hi <strong>${name}</strong>,</p>
              
              <p style="font-size: 16px; margin-bottom: 20px;">
                Your password has been successfully changed for your L&T Connect account.
              </p>
              
              <div style="background: #d1fae5; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; border-radius: 4px;">
                <p style="margin: 0; font-size: 14px;">
                  <strong>✓ Security Update:</strong> Your account is now secured with your new password.
                </p>
              </div>
              
              <p style="font-size: 14px; color: #6b7280; margin-top: 20px;">
                If you did not make this change, please contact your workspace administrator immediately.
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${APP_URL}/sign-in" 
                   style="display: inline-block; background: #667eea; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                  Login to Your Account
                </a>
              </div>
              
              <p style="font-size: 14px; color: #6b7280; margin-top: 20px;">
                Best regards,<br>
                <strong>The L&T Connect Team</strong>
              </p>
            </div>
            
            <div style="text-align: center; padding: 20px; font-size: 12px; color: #9ca3af;">
              <p>This is an automated security notification from L&T Connect</p>
            </div>
          </body>
        </html>
      `,
    });

    if (error) {
      console.error('Error sending password changed email:', error);
      throw new Error(`Failed to send password changed email: ${error.message}`);
    }

    console.log('✅ Password changed email sent to:', email, '- ID:', data?.id);
    return { success: true, emailId: data?.id };
  } catch (error: any) {
    console.error('Failed to send password changed email:', error);
    throw error;
  }
}

/**
 * Generate a secure random temporary password
 */
export function generateTempPassword(length: number = 12): string {
  const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // Removed I, O
  const lowercase = 'abcdefghijkmnopqrstuvwxyz'; // Removed l
  const numbers = '23456789'; // Removed 0, 1
  const special = '!@#$%^&*';
  
  const allChars = uppercase + lowercase + numbers + special;
  
  let password = '';
  // Ensure at least one of each type
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += special[Math.floor(Math.random() * special.length)];
  
  // Fill the rest randomly
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  // Shuffle the password
  return password
    .split('')
    .sort(() => Math.random() - 0.5)
    .join('');
}
