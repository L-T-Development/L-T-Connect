'use client';

import React, { useState } from 'react';
import { format } from 'date-fns';
import { Check, X, Clock, User, DollarSign, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  usePendingTimeEntries,
  useApproveTimeEntry,
  useRejectTimeEntry,
} from '@/hooks/use-time-entry';
import { formatMinutesHuman } from '@/lib/utils/time-format';
import type { TimeEntry } from '@/types';

interface TimeApprovalQueueProps {
  workspaceId: string;
  approverId: string;
}

export function TimeApprovalQueue({
  workspaceId,
  approverId,
}: TimeApprovalQueueProps) {
  const [selectedEntry, setSelectedEntry] = useState<TimeEntry | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);

  const { data: pendingEntries = [] } = usePendingTimeEntries(workspaceId);
  const approveEntryMutation = useApproveTimeEntry();
  const rejectEntryMutation = useRejectTimeEntry();

  // Group entries by user
  const groupedEntries = pendingEntries.reduce((acc, entry) => {
    const userId = entry.userId;
    if (!acc[userId]) {
      acc[userId] = {
        userName: entry.userName,
        userEmail: entry.userEmail,
        entries: [],
        totalHours: 0,
        billableHours: 0,
      };
    }
    acc[userId].entries.push(entry);
    acc[userId].totalHours += entry.duration;
    if (entry.isBillable) {
      acc[userId].billableHours += entry.duration;
    }
    return acc;
  }, {} as Record<string, { userName: string; userEmail: string; entries: TimeEntry[]; totalHours: number; billableHours: number }>);

  const handleApprove = async (entry: TimeEntry) => {
    await approveEntryMutation.mutateAsync({
      id: entry.$id,
      workspaceId,
      approvedBy: approverId,
    });
  };

  const handleReject = (entry: TimeEntry) => {
    setSelectedEntry(entry);
    setIsRejectDialogOpen(true);
  };

  const confirmReject = async () => {
    if (!selectedEntry) return;

    await rejectEntryMutation.mutateAsync({
      id: selectedEntry.$id,
      workspaceId,
      rejectionReason: rejectionReason || 'No reason provided',
    });

    setIsRejectDialogOpen(false);
    setSelectedEntry(null);
    setRejectionReason('');
  };

  const approveAll = async (userId: string) => {
    const userEntries = groupedEntries[userId].entries;
    for (const entry of userEntries) {
      await approveEntryMutation.mutateAsync({
        id: entry.$id,
        workspaceId,
        approvedBy: approverId,
      });
    }
  };

  if (pendingEntries.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Time Approval Queue
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Check className="h-12 w-12 text-green-500 mb-4" />
            <h3 className="text-lg font-semibold mb-2">All Caught Up!</h3>
            <p className="text-sm text-muted-foreground">
              No pending time entries to review
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Time Approval Queue
            </CardTitle>
            <Badge variant="secondary" className="text-lg">
              {pendingEntries.length} pending
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px] pr-4">
            <div className="space-y-6">
              {Object.entries(groupedEntries).map(([userId, userData]) => (
                <div key={userId} className="space-y-3">
                  {/* User Header */}
                  <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <div className="font-semibold">{userData.userName}</div>
                        <div className="text-sm text-muted-foreground">
                          {userData.userEmail}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-muted-foreground">
                        {userData.entries.length} entries
                      </div>
                      <div className="font-semibold">
                        {formatMinutesHuman(userData.totalHours)}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => approveAll(userId)}
                        disabled={approveEntryMutation.isPending}
                        className="mt-2"
                      >
                        <Check className="h-3 w-3 mr-1" />
                        Approve All
                      </Button>
                    </div>
                  </div>

                  {/* User's Entries */}
                  <div className="space-y-2 pl-4">
                    {userData.entries.map((entry) => (
                      <TimeEntryApprovalCard
                        key={entry.$id}
                        entry={entry}
                        onApprove={handleApprove}
                        onReject={handleReject}
                        isProcessing={
                          approveEntryMutation.isPending ||
                          rejectEntryMutation.isPending
                        }
                      />
                    ))}
                  </div>

                  <Separator />
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Rejection Dialog */}
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Time Entry</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this time entry
            </DialogDescription>
          </DialogHeader>

          {selectedEntry && (
            <div className="space-y-4">
              <div className="rounded-lg border p-3 space-y-2">
                <div className="font-medium">{selectedEntry.description}</div>
                <div className="text-sm text-muted-foreground">
                  {format(new Date(selectedEntry.startTime), 'PPP')} •{' '}
                  {formatMinutesHuman(selectedEntry.duration)}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reason">Rejection Reason *</Label>
                <Textarea
                  id="reason"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Explain why this entry is being rejected..."
                  rows={4}
                  required
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsRejectDialogOpen(false);
                setRejectionReason('');
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmReject}
              disabled={!rejectionReason.trim() || rejectEntryMutation.isPending}
            >
              Reject Entry
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

interface TimeEntryApprovalCardProps {
  entry: TimeEntry;
  onApprove: (entry: TimeEntry) => void;
  onReject: (entry: TimeEntry) => void;
  isProcessing: boolean;
}

function TimeEntryApprovalCard({
  entry,
  onApprove,
  onReject,
  isProcessing,
}: TimeEntryApprovalCardProps) {
  return (
    <div className="rounded-lg border p-4 space-y-3 hover:bg-muted/50 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            {entry.taskTitle && (
              <Badge variant="outline" className="text-xs">
                {entry.taskHierarchyId}
              </Badge>
            )}
            {entry.isBillable && (
              <Badge variant="default" className="text-xs bg-green-600">
                <DollarSign className="h-3 w-3 mr-1" />
                Billable
              </Badge>
            )}
            <Badge variant="secondary" className="text-xs">
              {entry.type}
            </Badge>
          </div>

          <div className="font-medium">{entry.description}</div>

          {entry.taskTitle && (
            <div className="text-sm text-muted-foreground flex items-center gap-1">
              <FileText className="h-3 w-3" />
              {entry.taskTitle}
            </div>
          )}

          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>
              {format(new Date(entry.startTime), 'PPP')}
            </span>
            <span>•</span>
            <span>
              {format(new Date(entry.startTime), 'HH:mm')} -{' '}
              {format(new Date(entry.endTime), 'HH:mm')}
            </span>
            <span>•</span>
            <span className="font-medium text-foreground">
              {formatMinutesHuman(entry.duration)}
            </span>
          </div>

          {entry.isBillable && entry.billableRate && (
            <div className="text-sm text-green-600 font-medium">
              ${((entry.duration / 60) * entry.billableRate).toFixed(2)} earned
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Button
            size="sm"
            variant="default"
            onClick={() => onApprove(entry)}
            disabled={isProcessing}
            className="bg-green-600 hover:bg-green-700"
          >
            <Check className="h-4 w-4 mr-1" />
            Approve
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => onReject(entry)}
            disabled={isProcessing}
          >
            <X className="h-4 w-4 mr-1" />
            Reject
          </Button>
        </div>
      </div>
    </div>
  );
}
