'use client';

import * as React from 'react';
import { Loader2, Info, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { databases } from '@/lib/appwrite-client';
import { DATABASE_ID, COLLECTIONS } from '@/lib/appwrite-config';
import { ID, Permission, Role, Query } from 'appwrite';
import { useAuth } from '@/components/providers/auth-provider';
import { useCurrentWorkspace } from '@/hooks/use-current-workspace';
import { toast } from 'sonner';

// Simple leave balance type matching actual DB
interface LeaveBalance {
  $id: string;
  workspaceId: string;
  userId: string;
  year: number;
  paidLeave: number;
  unpaidLeave: number;
  halfDay: number;
  compOff: number;
  $createdAt: string;
  $updatedAt: string;
}

// Hook to fetch leave balance
function useLeaveBalance(userId?: string, workspaceId?: string) {
  const [balance, setBalance] = React.useState<LeaveBalance | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    if (!userId || !workspaceId) {
      setIsLoading(false);
      return;
    }

    const fetchBalance = async () => {
      try {
        setIsLoading(true);
        const currentYear = new Date().getFullYear();
        
        const response = await databases.listDocuments(
          DATABASE_ID,
          COLLECTIONS.LEAVE_BALANCES,
          [
            Query.equal('userId', userId),
            Query.equal('workspaceId', workspaceId),
            Query.equal('year', currentYear)
          ]
        );

        if (response.documents.length > 0) {
          setBalance(response.documents[0] as any);
        } else {
          // Create default balance if doesn't exist
          const newBalance = await databases.createDocument(
            DATABASE_ID,
            COLLECTIONS.LEAVE_BALANCES,
            ID.unique(),
            {
              userId,
              workspaceId,
              year: currentYear,
              paidLeave: 21, // Default 21 days
              unpaidLeave: 0,
              halfDay: 12, // Default 12 half days
              compOff: 0,
            }
          );
          setBalance(newBalance as any);
        }
      } catch (error) {
        console.error('Error fetching leave balance:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBalance();
  }, [userId, workspaceId]);

  return { data: balance, isLoading };
}

interface LeaveApplicationFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const LEAVE_TYPE_OPTIONS = [
  { value: 'PAID', label: 'Paid Leave' },
  { value: 'UNPAID', label: 'Unpaid Leave' },
  { value: 'HALF_DAY', label: 'Half Day' },
  { value: 'COMP_OFF', label: 'Compensatory Off' },
] as const;

export function LeaveApplicationForm({ open, onOpenChange }: LeaveApplicationFormProps) {
  const { user } = useAuth();
  const { currentWorkspaceId } = useCurrentWorkspace();
  const { data: leaveBalance, isLoading: isLoadingBalance } = useLeaveBalance(user?.$id, currentWorkspaceId || undefined);
  
  const [leaveType, setLeaveType] = React.useState('PAID');
  const [startDate, setStartDate] = React.useState('');
  const [endDate, setEndDate] = React.useState('');
  const [reason, setReason] = React.useState('');
  const [emergencyContact, setEmergencyContact] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState('');

  // Debug: Log balance data
  React.useEffect(() => {
    if (leaveBalance) {
      console.log('Leave Balance Data:', leaveBalance);
    }
  }, [leaveBalance]);

  // Get available balance for selected leave type
  const availableBalance = React.useMemo(() => {
    if (!leaveBalance) {
      console.log('No leaveBalance found');
      return 0;
    }
    
    console.log('Leave Balance Data:', leaveBalance);
    
    let balance = 0;
    switch (leaveType) {
      case 'PAID':
        balance = leaveBalance.paidLeave || 0;
        break;
      case 'UNPAID':
        balance = 999; // Unlimited for unpaid
        break;
      case 'HALF_DAY':
        balance = leaveBalance.halfDay || 0;
        break;
      case 'COMP_OFF':
        balance = leaveBalance.compOff || 0;
        break;
      default:
        balance = 0;
    }
    
    console.log(`Balance for ${leaveType}:`, balance);
    return balance;
  }, [leaveBalance, leaveType]);

  // Calculate days count (working days)
  const daysCount = React.useMemo(() => {
    if (!startDate || !endDate) return 0;
    
    // Simple day calculation - count working days (excluding weekends)
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    let count = 0;
    const currentDate = new Date(start);
    
    while (currentDate <= end) {
      const dayOfWeek = currentDate.getDay();
      // Skip Saturday (6) and Sunday (0)
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        count++;
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return count;
  }, [startDate, endDate]);

  // Check if sufficient balance
  const hasSufficientBalance = React.useMemo(() => {
    if (leaveType === 'UNPAID') return true; // Unpaid leave doesn't require balance
    return daysCount <= availableBalance;
  }, [daysCount, availableBalance, leaveType]);

  // Validation
  React.useEffect(() => {
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      if (end < start) {
        setError('End date must be after or equal to start date');
      } else if (start < new Date(new Date().setHours(0, 0, 0, 0))) {
        setError('Start date cannot be in the past');
      } else if (!hasSufficientBalance && leaveType !== 'UNPAID') {
        setError(`Insufficient balance. You need ${daysCount} days but only have ${availableBalance} days available.`);
      } else {
        setError('');
      }
    } else {
      setError('');
    }
  }, [startDate, endDate, hasSufficientBalance, daysCount, availableBalance, leaveType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || !currentWorkspaceId) {
      toast.error('Unable to submit', {
        description: 'User or workspace information is missing',
      });
      return;
    }

    if (error) {
      return;
    }

    if (!leaveType || !startDate || !endDate || !reason.trim()) {
      setError('Please fill in all required fields');
      return;
    }

    if (reason.length < 10) {
      setError('Reason must be at least 10 characters long');
      return;
    }

    setIsSubmitting(true);

    try {
      const now = new Date().toISOString();
      
      // Prepare document data matching exact Appwrite schema
      const leaveRequestData = {
        // User/Context Fields
        userId: user.$id,
        workspaceId: currentWorkspaceId,
        createdBy: user.$id,
        createdByName: user.name || user.email,
        
        // Form Inputs
        type: leaveType,
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        reason: reason.trim(),
        emergencyContact: emergencyContact.trim() || null,
        
        // Status/Logic Fields
        status: 'pending',
        daysCount: daysCount,
        createdAt: now,
        updatedAt: now,
        
        // Manager Fields (null/empty for now)
        approvedBy: null,
        approvedAt: null,
        rejectionReason: null,
      };

      // Create document with permissions
      await databases.createDocument(
        DATABASE_ID,
        COLLECTIONS.LEAVE_REQUESTS,
        ID.unique(),
        leaveRequestData,
        [
          Permission.read(Role.user(user.$id)), // User can read their own request
          Permission.update(Role.user(user.$id)), // User can update (e.g., cancel)
          Permission.delete(Role.user(user.$id)), // User can delete
          Permission.read(Role.label('manager')), // Managers can read
          Permission.update(Role.label('manager')), // Managers can update (approve/reject)
        ]
      );

      toast.success('Leave request submitted', {
        description: `Your ${LEAVE_TYPE_OPTIONS.find(t => t.value === leaveType)?.label} request for ${daysCount} day(s) has been submitted for approval.`,
      });

      // Reset form
      setLeaveType('PAID');
      setStartDate('');
      setEndDate('');
      setReason('');
      setEmergencyContact('');
      setError('');
      onOpenChange(false);
    } catch (err) {
      console.error('Error creating leave request:', err);
      toast.error('Failed to submit leave request', {
        description: err instanceof Error ? err.message : 'An unexpected error occurred',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get minimum date (today)
  const minDate = new Date().toISOString().split('T')[0];

  // Get maximum date (1 year from now)
  const maxDate = new Date(
    new Date().setFullYear(new Date().getFullYear() + 1)
  ).toISOString().split('T')[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Request Leave</DialogTitle>
          <DialogDescription>
            Submit a leave request for manager approval. Make sure to provide all necessary details.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Leave Type */}
          <div className="space-y-2">
            <Label htmlFor="leaveType">Leave Type *</Label>
            <Select value={leaveType} onValueChange={setLeaveType}>
              <SelectTrigger id="leaveType">
                <SelectValue placeholder="Select leave type" />
              </SelectTrigger>
              <SelectContent>
                {LEAVE_TYPE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Info className="h-3 w-3" />
              Available: {isLoadingBalance ? (
                <span>Loading...</span>
              ) : (
                <span className="font-semibold">{availableBalance} days</span>
              )}
            </p>
          </div>

          {/* Date Range */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date *</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                min={minDate}
                max={maxDate}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">End Date *</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate || minDate}
                max={maxDate}
                required
              />
            </div>
          </div>

          {/* Days Count Display with Balance Status */}
          {daysCount > 0 && (
            <Alert className={hasSufficientBalance ? 'border-green-500 bg-green-50 dark:bg-green-950' : 'border-amber-500 bg-amber-50 dark:bg-amber-950'}>
              <div className="flex items-start gap-2">
                {hasSufficientBalance ? (
                  <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5" />
                )}
                <div className="flex-1">
                  <AlertDescription className={hasSufficientBalance ? 'text-green-900 dark:text-green-100' : 'text-amber-900 dark:text-amber-100'}>
                    <span className="font-medium">
                      This leave request is for {daysCount} working day{daysCount !== 1 ? 's' : ''}.
                    </span>
                    {' '}
                    {hasSufficientBalance ? (
                      <span className="text-green-700 dark:text-green-300">✓ Sufficient balance available</span>
                    ) : (
                      <span className="text-amber-700 dark:text-amber-300">⚠ Insufficient balance</span>
                    )}
                  </AlertDescription>
                </div>
              </div>
            </Alert>
          )}

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason">Reason *</Label>
            <Textarea
              id="reason"
              placeholder="Please provide a detailed reason for your leave request..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              required
              minLength={10}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              {reason.length}/500 characters (minimum 10)
            </p>
          </div>

          {/* Emergency Contact */}
          <div className="space-y-2">
            <Label htmlFor="emergencyContact">Emergency Contact (Optional)</Label>
            <Input
              id="emergencyContact"
              type="tel"
              placeholder="+1 234 567 8900"
              value={emergencyContact}
              onChange={(e) => setEmergencyContact(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              A phone number where you can be reached during your leave
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Submit Button */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !!error}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Request'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
