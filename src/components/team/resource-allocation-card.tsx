'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Calendar as CalendarIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TeamMemberWorkload } from '@/lib/team-workload';
import { getWorkloadColor, getWorkloadBgColor, getWorkloadStatus } from '@/lib/team-workload';

interface ResourceAllocationCardProps {
  workloadData: TeamMemberWorkload[];
  averageWorkload: number;
}

export function ResourceAllocationCard({ workloadData, averageWorkload }: ResourceAllocationCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              Resource Allocation
            </CardTitle>
            <CardDescription>Team member workload distribution</CardDescription>
          </div>
          <div className="text-right">
            <div className="text-sm text-muted-foreground">Average Load</div>
            <div className={cn('text-2xl font-bold', getWorkloadColor(averageWorkload))}>
              {averageWorkload}%
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {workloadData.length > 0 ? (
          workloadData.map((member) => {
            const initials = member.userName
              .split(' ')
              .map(n => n[0])
              .join('')
              .toUpperCase()
              .slice(0, 2);

            const statusIcon = 
              member.workloadPercentage > 100 ? TrendingUp :
              member.workloadPercentage < 50 ? TrendingDown :
              Minus;

            const StatusIcon = statusIcon;

            return (
              <div key={member.userId} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">{member.userName}</p>
                        <Badge
                          variant="outline"
                          className={cn('text-xs', getWorkloadBgColor(member.workloadPercentage))}
                        >
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {getWorkloadStatus(member.workloadPercentage)}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {member.totalTasks} tasks
                      </p>
                    </div>
                  </div>
                  <div className={cn('text-sm font-semibold', getWorkloadColor(member.workloadPercentage))}>
                    {member.workloadPercentage}%
                  </div>
                </div>
                <Progress
                  value={Math.min(member.workloadPercentage, 100)}
                  className={cn('h-2', getWorkloadBgColor(member.workloadPercentage))}
                />
                {member.workloadPercentage > 100 && (
                  <p className="text-xs text-orange-600 dark:text-orange-400">
                    ⚠ Overloaded by {member.workloadPercentage - 100}%
                  </p>
                )}
              </div>
            );
          })
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <CalendarIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No task assignments yet</p>
            <p className="text-xs mt-1">Assign tasks to team members to see workload distribution</p>
          </div>
        )}

        {workloadData.length > 0 && (
          <div className="pt-4 border-t space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Capacity Legend:</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-100 dark:bg-green-950/30 border border-green-300" />
                <span>Light (0-70%)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-yellow-100 dark:bg-yellow-950/30 border border-yellow-300" />
                <span>Busy (70-100%)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-orange-100 dark:bg-orange-950/30 border border-orange-300" />
                <span>High (100-150%)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-100 dark:bg-red-950/30 border border-red-300" />
                <span>Overload (150%+)</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
