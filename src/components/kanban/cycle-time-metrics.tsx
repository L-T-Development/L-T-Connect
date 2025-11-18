'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, TrendingDown, TrendingUp, Activity } from 'lucide-react';
import { differenceInHours } from 'date-fns';

interface Task {
  $id: string;
  title: string;
  hierarchyId: string;
  status: string;
  $createdAt: string;
  $updatedAt: string;
  startedAt?: string; // When task moved to "In Progress"
  completedAt?: string; // When task moved to "Done"
}

interface CycleTimeMetricsProps {
  tasks: Task[];
}

export function CycleTimeMetrics({ tasks }: CycleTimeMetricsProps) {
  const completedTasks = tasks.filter(t => t.status === 'DONE' && t.completedAt);

  // Calculate Lead Time (creation to completion)
  const leadTimes = completedTasks
    .map(task => {
      const created = new Date(task.$createdAt);
      const completed = new Date(task.completedAt!);
      return differenceInHours(completed, created) / 24; // in days
    })
    .filter(time => time > 0);

  // Calculate Cycle Time (started to completion)
  const cycleTimes = completedTasks
    .filter(t => t.startedAt)
    .map(task => {
      const started = new Date(task.startedAt!);
      const completed = new Date(task.completedAt!);
      return differenceInHours(completed, started) / 24; // in days
    })
    .filter(time => time > 0);

  const averageLeadTime = leadTimes.length > 0
    ? leadTimes.reduce((a, b) => a + b, 0) / leadTimes.length
    : 0;

  const averageCycleTime = cycleTimes.length > 0
    ? cycleTimes.reduce((a, b) => a + b, 0) / cycleTimes.length
    : 0;

  // Get recent tasks for trend
  const recentCount = 10;
  const recentLeadTimes = leadTimes.slice(-recentCount);
  const olderLeadTimes = leadTimes.slice(-recentCount * 2, -recentCount);
  
  const recentAvgLead = recentLeadTimes.length > 0
    ? recentLeadTimes.reduce((a, b) => a + b, 0) / recentLeadTimes.length
    : 0;
  
  const olderAvgLead = olderLeadTimes.length > 0
    ? olderLeadTimes.reduce((a, b) => a + b, 0) / olderLeadTimes.length
    : 0;

  const leadTimeTrend = olderAvgLead > 0
    ? ((recentAvgLead - olderAvgLead) / olderAvgLead) * 100
    : 0;

  const formatTime = (days: number) => {
    if (days < 1) return `${Math.round(days * 24)}h`;
    if (days < 7) return `${Math.round(days * 10) / 10}d`;
    return `${Math.round(days / 7 * 10) / 10}w`;
  };

  // Get slowest and fastest tasks
  const sortedByLeadTime = [...completedTasks]
    .map(task => ({
      task,
      leadTime: differenceInHours(new Date(task.completedAt!), new Date(task.$createdAt)) / 24,
    }))
    .sort((a, b) => b.leadTime - a.leadTime);

  const slowestTasks = sortedByLeadTime.slice(0, 5);
  const fastestTasks = sortedByLeadTime.slice(-5).reverse();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <Clock className="h-5 w-5 text-blue-600" />
          Lead Time & Cycle Time Analysis
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Track how long tasks take from creation to completion
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950 dark:to-cyan-950">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="h-5 w-5 text-blue-600" />
            <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100">Average Lead Time</h4>
          </div>
          <p className="text-3xl font-bold text-blue-900 dark:text-blue-100">
            {formatTime(averageLeadTime)}
          </p>
          <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
            Creation → Completion
          </p>
          {leadTimeTrend !== 0 && (
            <div className={`flex items-center gap-1 mt-2 text-xs ${
              leadTimeTrend > 0 ? 'text-red-600' : 'text-green-600'
            }`}>
              {leadTimeTrend > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {Math.abs(Math.round(leadTimeTrend))}% vs previous {recentCount}
            </div>
          )}
        </Card>

        <Card className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-5 w-5 text-purple-600" />
            <h4 className="text-sm font-medium text-purple-900 dark:text-purple-100">Average Cycle Time</h4>
          </div>
          <p className="text-3xl font-bold text-purple-900 dark:text-purple-100">
            {formatTime(averageCycleTime)}
          </p>
          <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
            Started → Completion
          </p>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="h-5 w-5 text-green-600" />
            <h4 className="text-sm font-medium text-green-900 dark:text-green-100">Wait Time</h4>
          </div>
          <p className="text-3xl font-bold text-green-900 dark:text-green-100">
            {formatTime(averageLeadTime - averageCycleTime)}
          </p>
          <p className="text-xs text-green-600 dark:text-green-400 mt-1">
            Time before work started
          </p>
        </Card>
      </div>

      {/* Task Lists */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Slowest Tasks */}
        <Card className="p-6">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-red-600" />
            Longest Lead Times
          </h4>
          <div className="space-y-3">
            {slowestTasks.length > 0 ? (
              slowestTasks.map(({ task, leadTime }) => (
                <div key={task.$id} className="flex items-start justify-between gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-mono text-gray-500 dark:text-gray-400 mb-1">
                      {task.hierarchyId}
                    </p>
                    <p className="text-sm text-gray-900 dark:text-gray-100 line-clamp-2">
                      {task.title}
                    </p>
                  </div>
                  <Badge variant="destructive" className="flex-shrink-0">
                    {formatTime(leadTime)}
                  </Badge>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                No completed tasks yet
              </p>
            )}
          </div>
        </Card>

        {/* Fastest Tasks */}
        <Card className="p-6">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-green-600" />
            Shortest Lead Times
          </h4>
          <div className="space-y-3">
            {fastestTasks.length > 0 ? (
              fastestTasks.map(({ task, leadTime }) => (
                <div key={task.$id} className="flex items-start justify-between gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-mono text-gray-500 dark:text-gray-400 mb-1">
                      {task.hierarchyId}
                    </p>
                    <p className="text-sm text-gray-900 dark:text-gray-100 line-clamp-2">
                      {task.title}
                    </p>
                  </div>
                  <Badge variant="outline" className="flex-shrink-0 bg-green-50 text-green-700 border-green-300">
                    {formatTime(leadTime)}
                  </Badge>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                No completed tasks yet
              </p>
            )}
          </div>
        </Card>
      </div>

      {/* Insights */}
      <Card className="p-6 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950 dark:to-purple-950">
        <h4 className="text-sm font-semibold text-indigo-900 dark:text-indigo-100 mb-3">
          💡 Insights & Recommendations
        </h4>
        <div className="space-y-2 text-sm text-indigo-800 dark:text-indigo-200">
          {averageLeadTime - averageCycleTime > averageCycleTime && (
            <p>
              • Tasks spend more time waiting than being worked on. Consider reviewing prioritization and queue management.
            </p>
          )}
          {leadTimeTrend > 20 && (
            <p>
              • Lead time is increasing. This may indicate growing complexity or capacity issues.
            </p>
          )}
          {averageCycleTime < 2 && (
            <p>
              • ✓ Excellent cycle time! Your team is executing work efficiently.
            </p>
          )}
          {completedTasks.length < 10 && (
            <p>
              • Collect more data for more accurate metrics. Current sample: {completedTasks.length} tasks.
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}
