import { z } from 'zod';

/**
 * Leave Management Utilities
 * Handles leave types, validation, balance calculations, and business logic
 */

// ============================================================================
// Leave Types and Constants
// ============================================================================

export const LEAVE_TYPES = {
  CASUAL: 'Casual Leave',
  SICK: 'Sick Leave',
  ANNUAL: 'Annual Leave',
  MATERNITY: 'Maternity Leave',
  PATERNITY: 'Paternity Leave',
  UNPAID: 'Unpaid Leave',
  COMPENSATORY: 'Compensatory Off',
  BEREAVEMENT: 'Bereavement Leave',
} as const;

export type LeaveType = keyof typeof LEAVE_TYPES;

export const LEAVE_STATUS = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  CANCELLED: 'Cancelled',
} as const;

export type LeaveStatus = keyof typeof LEAVE_STATUS;

// Default annual leave allocations by role
export const DEFAULT_LEAVE_ALLOCATIONS = {
  CASUAL: 12,
  SICK: 12,
  ANNUAL: 21,
  MATERNITY: 180, // 6 months
  PATERNITY: 15, // 15 days
  UNPAID: 0, // No limit
  COMPENSATORY: 0, // Earned, not allocated
  BEREAVEMENT: 7,
};

// ============================================================================
// Zod Validation Schemas
// ============================================================================

export const leaveRequestSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  leaveType: z.enum([
    'CASUAL',
    'SICK',
    'ANNUAL',
    'MATERNITY',
    'PATERNITY',
    'UNPAID',
    'COMPENSATORY',
    'BEREAVEMENT',
  ]),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  reason: z.string().min(10, 'Reason must be at least 10 characters').max(500, 'Reason is too long'),
  halfDay: z.boolean().optional(),
  emergencyContact: z.string().optional(),
  document: z.string().optional(), // Document URL if medical certificate etc
}).refine((data) => {
  const start = new Date(data.startDate);
  const end = new Date(data.endDate);
  return end >= start;
}, {
  message: 'End date must be after or equal to start date',
  path: ['endDate'],
});

export const leaveApprovalSchema = z.object({
  leaveRequestId: z.string().min(1, 'Leave request ID is required'),
  approverId: z.string().min(1, 'Approver ID is required'),
  status: z.enum(['APPROVED', 'REJECTED']),
  approverComments: z.string().optional(),
});

// ============================================================================
// Date and Balance Calculation Utilities
// ============================================================================

/**
 * Calculate number of working days between two dates (excluding weekends)
 */
export function calculateWorkingDays(startDate: Date, endDate: Date): number {
  let count = 0;
  const currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    const dayOfWeek = currentDate.getDay();
    // Skip Saturday (6) and Sunday (0)
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      count++;
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return count;
}

/**
 * Calculate leave days considering half-day option
 */
export function calculateLeaveDays(
  startDate: string,
  endDate: string,
  halfDay: boolean = false
): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  const workingDays = calculateWorkingDays(start, end);
  
  if (halfDay && workingDays === 1) {
    return 0.5;
  }
  
  return workingDays;
}

/**
 * Check if user has sufficient leave balance
 */
export function hasEnoughBalance(
  leaveType: LeaveType,
  requestedDays: number,
  currentBalance: Record<LeaveType, number>
): boolean {
  // Unpaid leave has no balance limit
  if (leaveType === 'UNPAID') {
    return true;
  }

  const balance = currentBalance[leaveType] || 0;
  return balance >= requestedDays;
}

/**
 * Calculate remaining balance after leave request
 */
export function calculateRemainingBalance(
  leaveType: LeaveType,
  requestedDays: number,
  currentBalance: Record<LeaveType, number>
): number {
  if (leaveType === 'UNPAID') {
    return Infinity;
  }

  const balance = currentBalance[leaveType] || 0;
  return Math.max(0, balance - requestedDays);
}

/**
 * Initialize default leave balance for a new user
 */
export function initializeLeaveBalance(): Record<LeaveType, number> {
  return {
    CASUAL: DEFAULT_LEAVE_ALLOCATIONS.CASUAL,
    SICK: DEFAULT_LEAVE_ALLOCATIONS.SICK,
    ANNUAL: DEFAULT_LEAVE_ALLOCATIONS.ANNUAL,
    MATERNITY: DEFAULT_LEAVE_ALLOCATIONS.MATERNITY,
    PATERNITY: DEFAULT_LEAVE_ALLOCATIONS.PATERNITY,
    UNPAID: 0,
    COMPENSATORY: 0,
    BEREAVEMENT: DEFAULT_LEAVE_ALLOCATIONS.BEREAVEMENT,
  };
}

/**
 * Reset annual leave balances at year start (typically Jan 1)
 */
export function shouldResetAnnualLeave(lastResetDate?: Date): boolean {
  if (!lastResetDate) return true;

  const now = new Date();
  const lastReset = new Date(lastResetDate);
  
  // Check if we're in a new year
  return now.getFullYear() > lastReset.getFullYear();
}

/**
 * Get leave type color for UI
 */
export function getLeaveTypeColor(leaveType: LeaveType): string {
  const colors: Record<LeaveType, string> = {
    CASUAL: 'bg-blue-100 text-blue-800 border-blue-200',
    SICK: 'bg-red-100 text-red-800 border-red-200',
    ANNUAL: 'bg-green-100 text-green-800 border-green-200',
    MATERNITY: 'bg-pink-100 text-pink-800 border-pink-200',
    PATERNITY: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    UNPAID: 'bg-gray-100 text-gray-800 border-gray-200',
    COMPENSATORY: 'bg-purple-100 text-purple-800 border-purple-200',
    BEREAVEMENT: 'bg-slate-100 text-slate-800 border-slate-200',
  };
  
  return colors[leaveType] || 'bg-gray-100 text-gray-800 border-gray-200';
}

/**
 * Get leave status color for UI
 */
export function getLeaveStatusColor(status: LeaveStatus): string {
  const colors: Record<LeaveStatus, string> = {
    PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    APPROVED: 'bg-green-100 text-green-800 border-green-200',
    REJECTED: 'bg-red-100 text-red-800 border-red-200',
    CANCELLED: 'bg-gray-100 text-gray-800 border-gray-200',
  };
  
  return colors[status] || 'bg-gray-100 text-gray-800 border-gray-200';
}

/**
 * Check if leave request can be cancelled
 */
export function canCancelLeaveRequest(
  status: LeaveStatus,
  startDate: string
): boolean {
  // Can only cancel pending or approved requests
  if (status !== 'PENDING' && status !== 'APPROVED') {
    return false;
  }

  // Can't cancel if leave has already started
  const start = new Date(startDate);
  const now = new Date();
  now.setHours(0, 0, 0, 0); // Reset time for date comparison
  
  return start > now;
}

/**
 * Check if user can approve/reject leave (manager check)
 */
export function canApproveLeave(
  userRole: string,
  requestUserId: string,
  approverId: string
): boolean {
  // Can't approve own leave
  if (requestUserId === approverId) {
    return false;
  }

  // Only managers and above can approve
  const managerRoles = ['MANAGER', 'ASSISTANT_MANAGER', 'ADMIN'];
  return managerRoles.includes(userRole);
}

/**
 * Format leave date range for display
 */
export function formatLeaveDateRange(startDate: string, endDate: string): string {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  const options: Intl.DateTimeFormatOptions = { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  };
  
  if (start.toDateString() === end.toDateString()) {
    return start.toLocaleDateString('en-US', options);
  }
  
  return `${start.toLocaleDateString('en-US', options)} - ${end.toLocaleDateString('en-US', options)}`;
}

/**
 * Calculate leave utilization percentage
 */
export function calculateLeaveUtilization(
  used: number,
  total: number
): number {
  if (total === 0) return 0;
  return Math.round((used / total) * 100);
}

/**
 * Get leave balance status (low, medium, high)
 */
export function getLeaveBalanceStatus(
  remaining: number,
  total: number
): 'low' | 'medium' | 'high' {
  const percentage = (remaining / total) * 100;
  
  if (percentage <= 25) return 'low';
  if (percentage <= 50) return 'medium';
  return 'high';
}

/**
 * Validate leave request dates
 */
export function validateLeaveDates(
  startDate: string,
  endDate: string
): { valid: boolean; error?: string } {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Check if dates are valid
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return { valid: false, error: 'Invalid date format' };
  }
  
  // Check if end date is before start date
  if (end < start) {
    return { valid: false, error: 'End date cannot be before start date' };
  }
  
  // Check if start date is in the past (for non-emergency leaves)
  if (start < today) {
    return { valid: false, error: 'Start date cannot be in the past' };
  }
  
  // Check if leave is too far in the future (e.g., more than 1 year)
  const oneYearFromNow = new Date();
  oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
  
  if (start > oneYearFromNow) {
    return { valid: false, error: 'Leave cannot be requested more than 1 year in advance' };
  }
  
  return { valid: true };
}
