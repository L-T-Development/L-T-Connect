'use client';

import * as React from 'react';
import { Calendar, TrendingDown, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useLeaveBalance } from '@/hooks/use-leave';
import {
  LEAVE_TYPES,
  type LeaveType,
  DEFAULT_LEAVE_ALLOCATIONS,
  calculateLeaveUtilization,
  getLeaveBalanceStatus,
  getLeaveTypeColor,
} from '@/lib/leave-utils';

interface LeaveBalanceDisplayProps {
  userId: string;
}

export function LeaveBalanceDisplay({ userId }: LeaveBalanceDisplayProps) {
  const { data: leaveBalance, isLoading } = useLeaveBalance(userId);

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 w-24 bg-muted rounded"></div>
              <div className="h-4 w-4 bg-muted rounded"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 w-16 bg-muted rounded mb-2"></div>
              <div className="h-2 w-full bg-muted rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!leaveBalance) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">No leave balance data available</p>
        </CardContent>
      </Card>
    );
  }

  const balances = leaveBalance.leaveBalances;

  // Filter and prepare leave types for display
  const displayLeaveTypes: LeaveType[] = ['CASUAL', 'SICK', 'ANNUAL', 'COMPENSATORY'];

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {displayLeaveTypes.map((leaveType) => {
          const remaining = balances[leaveType] || 0;
          const total = DEFAULT_LEAVE_ALLOCATIONS[leaveType] || 0;
          const used = total - remaining;
          const utilization = calculateLeaveUtilization(used, total);
          const status = getLeaveBalanceStatus(remaining, total);

          return (
            <Card key={leaveType} className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {LEAVE_TYPES[leaveType]}
                </CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2">
                  <div className="text-2xl font-bold">{remaining}</div>
                  <div className="text-sm text-muted-foreground">/ {total} days</div>
                </div>
                <Progress value={utilization} className="mt-3 h-2" />
                <div className="mt-2 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    {used} used • {utilization}%
                  </span>
                  {status === 'low' && (
                    <Badge
                      variant="outline"
                      className="bg-red-50 text-red-700 border-red-200"
                    >
                      <TrendingDown className="h-3 w-3 mr-1" />
                      Low
                    </Badge>
                  )}
                  {status === 'medium' && (
                    <Badge
                      variant="outline"
                      className="bg-yellow-50 text-yellow-700 border-yellow-200"
                    >
                      Medium
                    </Badge>
                  )}
                  {status === 'high' && (
                    <Badge
                      variant="outline"
                      className="bg-green-50 text-green-700 border-green-200"
                    >
                      <TrendingUp className="h-3 w-3 mr-1" />
                      High
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Detailed Balance Table */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Leave Balance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(LEAVE_TYPES).map(([key, label]) => {
              const leaveType = key as LeaveType;
              const remaining = balances[leaveType] || 0;
              const total = DEFAULT_LEAVE_ALLOCATIONS[leaveType] || 0;
              const used = total - remaining;

              return (
                <div
                  key={key}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <Badge
                      className={getLeaveTypeColor(leaveType)}
                      variant="outline"
                    >
                      {label}
                    </Badge>
                    <div className="flex-1">
                      <Progress
                        value={total > 0 ? (used / total) * 100 : 0}
                        className="h-2"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm ml-4">
                    <div className="text-right">
                      <div className="font-medium">{remaining}</div>
                      <div className="text-xs text-muted-foreground">Available</div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-muted-foreground">{used}</div>
                      <div className="text-xs text-muted-foreground">Used</div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{total}</div>
                      <div className="text-xs text-muted-foreground">Total</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {leaveBalance.lastResetDate && (
            <p className="text-xs text-muted-foreground mt-4 text-center">
              Last reset: {new Date(leaveBalance.lastResetDate).toLocaleDateString()}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
