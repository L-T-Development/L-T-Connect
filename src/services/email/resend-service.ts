import 'server-only';
import { resend, DEFAULT_FROM_EMAIL, EMAIL_CONFIG } from '@/lib/email-client';

/**
 * Email service functions
 * 
 * IMPORTANT: These functions should ONLY be called from server-side code
 * (API routes, Server Actions, etc.), never from client components or hooks.
 * The 'server-only' import ensures this at build time.
 */

export interface SendEmailParams {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

/**
 * Send an email using Resend
 */
export async function sendEmail(params: SendEmailParams) {
  try {
    const response = await resend.emails.send({
      from: DEFAULT_FROM_EMAIL,
      to: Array.isArray(params.to) ? params.to : [params.to],
      subject: params.subject,
      html: params.html,
      text: params.text,
    });

    console.log('📧 Email sent successfully:', {
      to: params.to,
      subject: params.subject,
      messageId: response.data?.id,
    });

    return { success: true, data: response.data };
  } catch (error: any) {
    console.error('❌ Failed to send email:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send workspace invitation email
 */
export async function sendWorkspaceInvitationEmail({
  to,
  workspaceName,
  inviterName,
  inviteCode,
}: {
  to: string;
  workspaceName: string;
  inviterName: string;
  inviteCode: string;
}) {
  const joinUrl = `${EMAIL_CONFIG.appUrl}/onboarding?code=${inviteCode}`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
          .code-box { background: white; border: 2px dashed #667eea; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 2px; margin: 20px 0; border-radius: 6px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 You're Invited!</h1>
          </div>
          <div class="content">
            <h2>Join ${workspaceName}</h2>
            <p>Hi there! 👋</p>
            <p><strong>${inviterName}</strong> has invited you to join the <strong>${workspaceName}</strong> workspace on ${EMAIL_CONFIG.appName}.</p>
            
            <p>Use this invite code to join:</p>
            <div class="code-box">${inviteCode}</div>
            
            <p>Or click the button below to join directly:</p>
            <a href="${joinUrl}" class="button">Join Workspace</a>
            
            <p style="margin-top: 30px; font-size: 14px; color: #666;">
              This invitation link will expire in 7 days. If you didn't expect this invitation, you can safely ignore this email.
            </p>
          </div>
          <div class="footer">
            <p>Sent by ${EMAIL_CONFIG.appName}</p>
            <p>Need help? Contact us at ${EMAIL_CONFIG.supportEmail}</p>
          </div>
        </div>
      </body>
    </html>
  `;

  const text = `
    You're invited to join ${workspaceName}!
    
    ${inviterName} has invited you to join the ${workspaceName} workspace on ${EMAIL_CONFIG.appName}.
    
    Invite Code: ${inviteCode}
    
    Join now: ${joinUrl}
    
    This invitation link will expire in 7 days.
  `;

  return sendEmail({
    to,
    subject: `You're invited to join ${workspaceName} on ${EMAIL_CONFIG.appName}`,
    html,
    text,
  });
}

/**
 * Send leave approval email
 */
export async function sendLeaveApprovalEmail({
  to,
  employeeName,
  leaveType,
  startDate,
  endDate,
  days,
  approverName,
}: {
  to: string;
  employeeName: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  days: number;
  approverName: string;
}) {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
          .info-box { background: white; padding: 20px; border-left: 4px solid #10b981; margin: 20px 0; border-radius: 4px; }
          .info-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
          .info-label { font-weight: bold; color: #666; }
          .success-badge { background: #10b981; color: white; padding: 6px 12px; border-radius: 20px; display: inline-block; font-size: 14px; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✅ Leave Request Approved</h1>
          </div>
          <div class="content">
            <p>Hi ${employeeName},</p>
            <p>Great news! Your leave request has been <span class="success-badge">APPROVED</span> by ${approverName}.</p>
            
            <div class="info-box">
              <div class="info-row">
                <span class="info-label">Leave Type:</span>
                <span>${leaveType}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Start Date:</span>
                <span>${startDate}</span>
              </div>
              <div class="info-row">
                <span class="info-label">End Date:</span>
                <span>${endDate}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Duration:</span>
                <span>${days} day(s)</span>
              </div>
            </div>
            
            <p style="margin-top: 20px;">Enjoy your time off! 🌴</p>
          </div>
          <div class="footer">
            <p>Sent by ${EMAIL_CONFIG.appName}</p>
          </div>
        </div>
      </body>
    </html>
  `;

  const text = `
    Leave Request Approved
    
    Hi ${employeeName},
    
    Your leave request has been approved by ${approverName}.
    
    Leave Type: ${leaveType}
    Start Date: ${startDate}
    End Date: ${endDate}
    Duration: ${days} day(s)
    
    Enjoy your time off!
  `;

  return sendEmail({
    to,
    subject: `✅ Leave Request Approved - ${startDate} to ${endDate}`,
    html,
    text,
  });
}

/**
 * Send leave rejection email
 */
export async function sendLeaveRejectionEmail({
  to,
  employeeName,
  leaveType,
  startDate,
  endDate,
  days,
  rejectionReason,
  approverName,
}: {
  to: string;
  employeeName: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  days: number;
  rejectionReason: string;
  approverName: string;
}) {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
          .info-box { background: white; padding: 20px; border-left: 4px solid #ef4444; margin: 20px 0; border-radius: 4px; }
          .info-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
          .info-label { font-weight: bold; color: #666; }
          .rejection-badge { background: #ef4444; color: white; padding: 6px 12px; border-radius: 20px; display: inline-block; font-size: 14px; }
          .reason-box { background: #fef2f2; border: 1px solid #fecaca; padding: 15px; border-radius: 6px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>❌ Leave Request Declined</h1>
          </div>
          <div class="content">
            <p>Hi ${employeeName},</p>
            <p>We regret to inform you that your leave request has been <span class="rejection-badge">DECLINED</span> by ${approverName}.</p>
            
            <div class="info-box">
              <div class="info-row">
                <span class="info-label">Leave Type:</span>
                <span>${leaveType}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Start Date:</span>
                <span>${startDate}</span>
              </div>
              <div class="info-row">
                <span class="info-label">End Date:</span>
                <span>${endDate}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Duration:</span>
                <span>${days} day(s)</span>
              </div>
            </div>
            
            <div class="reason-box">
              <strong>Reason for Rejection:</strong>
              <p style="margin-top: 10px;">${rejectionReason}</p>
            </div>
            
            <p>If you have any questions, please contact ${approverName} or HR.</p>
          </div>
          <div class="footer">
            <p>Sent by ${EMAIL_CONFIG.appName}</p>
          </div>
        </div>
      </body>
    </html>
  `;

  const text = `
    Leave Request Declined
    
    Hi ${employeeName},
    
    Your leave request has been declined by ${approverName}.
    
    Leave Type: ${leaveType}
    Start Date: ${startDate}
    End Date: ${endDate}
    Duration: ${days} day(s)
    
    Reason: ${rejectionReason}
    
    If you have any questions, please contact ${approverName} or HR.
  `;

  return sendEmail({
    to,
    subject: `❌ Leave Request Declined - ${startDate} to ${endDate}`,
    html,
    text,
  });
}

/**
 * Send task assignment email
 */
export async function sendTaskAssignmentEmail({
  to,
  assigneeName,
  taskTitle,
  taskHierarchyId,
  taskUrl,
  assignedBy,
  projectName,
  priority,
  dueDate,
}: {
  to: string;
  assigneeName: string;
  taskTitle: string;
  taskHierarchyId: string;
  taskUrl: string;
  assignedBy: string;
  projectName: string;
  priority: string;
  dueDate?: string;
}) {
  const priorityColors: Record<string, string> = {
    CRITICAL: '#ef4444',
    HIGH: '#f97316',
    MEDIUM: '#eab308',
    LOW: '#10b981',
  };

  const priorityColor = priorityColors[priority] || '#6b7280';

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
          .task-box { background: white; padding: 20px; border-left: 4px solid #667eea; margin: 20px 0; border-radius: 4px; }
          .task-id { color: #667eea; font-weight: bold; font-size: 14px; }
          .task-title { font-size: 20px; font-weight: bold; margin: 10px 0; }
          .info-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
          .info-label { font-weight: bold; color: #666; }
          .priority-badge { padding: 4px 12px; border-radius: 20px; display: inline-block; font-size: 12px; font-weight: bold; color: white; }
          .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📋 New Task Assigned</h1>
          </div>
          <div class="content">
            <p>Hi ${assigneeName},</p>
            <p><strong>${assignedBy}</strong> has assigned you a new task in <strong>${projectName}</strong>.</p>
            
            <div class="task-box">
              <div class="task-id">${taskHierarchyId}</div>
              <div class="task-title">${taskTitle}</div>
              
              <div style="margin-top: 15px;">
                <div class="info-row">
                  <span class="info-label">Priority:</span>
                  <span class="priority-badge" style="background: ${priorityColor};">${priority}</span>
                </div>
                ${dueDate ? `
                <div class="info-row">
                  <span class="info-label">Due Date:</span>
                  <span>${dueDate}</span>
                </div>
                ` : ''}
                <div class="info-row">
                  <span class="info-label">Project:</span>
                  <span>${projectName}</span>
                </div>
              </div>
            </div>
            
            <a href="${taskUrl}" class="button">View Task</a>
            
            <p style="margin-top: 20px; font-size: 14px; color: #666;">
              Click the button above to view the task details and get started.
            </p>
          </div>
          <div class="footer">
            <p>Sent by ${EMAIL_CONFIG.appName}</p>
          </div>
        </div>
      </body>
    </html>
  `;

  const text = `
    New Task Assigned
    
    Hi ${assigneeName},
    
    ${assignedBy} has assigned you a new task in ${projectName}.
    
    Task: ${taskHierarchyId} - ${taskTitle}
    Priority: ${priority}
    ${dueDate ? `Due Date: ${dueDate}` : ''}
    
    View task: ${taskUrl}
  `;

  return sendEmail({
    to,
    subject: `📋 New Task: ${taskHierarchyId} - ${taskTitle}`,
    html,
    text,
  });
}

/**
 * Send mention notification email
 */
export async function sendMentionNotificationEmail({
  to,
  mentionedUserName,
  mentionerName,
  taskTitle,
  taskHierarchyId,
  commentText,
  taskUrl,
}: {
  to: string;
  mentionedUserName: string;
  mentionerName: string;
  taskTitle: string;
  taskHierarchyId: string;
  commentText: string;
  taskUrl: string;
}) {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
          .comment-box { background: white; padding: 20px; border-left: 4px solid #8b5cf6; margin: 20px 0; border-radius: 4px; }
          .task-id { color: #8b5cf6; font-weight: bold; font-size: 14px; }
          .button { display: inline-block; background: #8b5cf6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>💬 You were mentioned</h1>
          </div>
          <div class="content">
            <p>Hi ${mentionedUserName},</p>
            <p><strong>${mentionerName}</strong> mentioned you in a comment on:</p>
            
            <div class="comment-box">
              <div class="task-id">${taskHierarchyId}</div>
              <div style="font-size: 16px; font-weight: bold; margin: 10px 0;">${taskTitle}</div>
              
              <div style="margin-top: 15px; padding: 15px; background: #f3f4f6; border-radius: 6px;">
                <strong>${mentionerName}:</strong>
                <p style="margin-top: 5px;">${commentText}</p>
              </div>
            </div>
            
            <a href="${taskUrl}" class="button">View Comment</a>
          </div>
          <div class="footer">
            <p>Sent by ${EMAIL_CONFIG.appName}</p>
          </div>
        </div>
      </body>
    </html>
  `;

  const text = `
    You were mentioned
    
    Hi ${mentionedUserName},
    
    ${mentionerName} mentioned you in a comment on:
    ${taskHierarchyId} - ${taskTitle}
    
    Comment:
    "${commentText}"
    
    View comment: ${taskUrl}
  `;

  return sendEmail({
    to,
    subject: `💬 ${mentionerName} mentioned you in ${taskHierarchyId}`,
    html,
    text,
  });
}

/**
 * Send sprint reminder email
 */
export async function sendSprintReminderEmail({
  to,
  userName,
  sprintName,
  daysRemaining,
  projectName,
  sprintUrl,
}: {
  to: string;
  userName: string;
  sprintName: string;
  daysRemaining: number;
  projectName: string;
  sprintUrl: string;
}) {
  const urgencyColor = daysRemaining <= 2 ? '#ef4444' : '#f97316';
  
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, ${urgencyColor} 0%, #dc2626 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
          .warning-box { background: #fef2f2; border: 2px solid ${urgencyColor}; padding: 20px; margin: 20px 0; border-radius: 6px; text-align: center; }
          .days-badge { font-size: 48px; font-weight: bold; color: ${urgencyColor}; }
          .button { display: inline-block; background: ${urgencyColor}; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⏰ Sprint Ending Soon!</h1>
          </div>
          <div class="content">
            <p>Hi ${userName},</p>
            <p>This is a reminder that the <strong>${sprintName}</strong> sprint in <strong>${projectName}</strong> is ending soon.</p>
            
            <div class="warning-box">
              <div class="days-badge">${daysRemaining}</div>
              <div style="font-size: 20px; font-weight: bold; margin-top: 10px;">
                ${daysRemaining === 1 ? 'Day' : 'Days'} Remaining
              </div>
            </div>
            
            <p>Make sure to:</p>
            <ul>
              <li>Complete your assigned tasks</li>
              <li>Update task statuses</li>
              <li>Move unfinished work to backlog</li>
              <li>Prepare for sprint review</li>
            </ul>
            
            <a href="${sprintUrl}" class="button">View Sprint Board</a>
          </div>
          <div class="footer">
            <p>Sent by ${EMAIL_CONFIG.appName}</p>
          </div>
        </div>
      </body>
    </html>
  `;

  const text = `
    Sprint Ending Soon!
    
    Hi ${userName},
    
    The ${sprintName} sprint in ${projectName} is ending in ${daysRemaining} ${daysRemaining === 1 ? 'day' : 'days'}.
    
    Make sure to:
    - Complete your assigned tasks
    - Update task statuses
    - Move unfinished work to backlog
    - Prepare for sprint review
    
    View sprint: ${sprintUrl}
  `;

  return sendEmail({
    to,
    subject: `⏰ Sprint Reminder: ${sprintName} ends in ${daysRemaining} ${daysRemaining === 1 ? 'day' : 'days'}`,
    html,
    text,
  });
}
