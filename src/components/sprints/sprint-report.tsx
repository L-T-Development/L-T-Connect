'use client';

import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FileText, Download, Share2, CheckCircle2, TrendingUp, Target, Users } from 'lucide-react';
import { format } from 'date-fns';

interface Task {
  $id: string;
  title: string;
  status: string;
  priority: string;
}

interface RetrospectiveItem {
  id: string;
  text: string;
}

interface RetrospectiveData {
  wentWell: RetrospectiveItem[];
  didntGoWell: RetrospectiveItem[];
  actionItems: RetrospectiveItem[];
}

interface SprintReportProps {
  sprint: {
    $id: string;
    name: string;
    goal?: string;
    startDate: string;
    endDate: string;
    status: string;
  };
  tasks: Task[];
  retrospective?: RetrospectiveData;
  velocity?: number;
  averageVelocity?: number;
}

export function SprintReport({ sprint, tasks, retrospective, velocity, averageVelocity }: SprintReportProps) {
  const reportRef = useRef<HTMLDivElement>(null);

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'DONE').length;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  
  const tasksByStatus = {
    TODO: tasks.filter(t => t.status === 'TODO').length,
    IN_PROGRESS: tasks.filter(t => t.status === 'IN_PROGRESS').length,
    REVIEW: tasks.filter(t => t.status === 'REVIEW').length,
    DONE: completedTasks,
  };

  const tasksByPriority = {
    CRITICAL: tasks.filter(t => t.priority === 'CRITICAL').length,
    HIGH: tasks.filter(t => t.priority === 'HIGH').length,
    MEDIUM: tasks.filter(t => t.priority === 'MEDIUM').length,
    LOW: tasks.filter(t => t.priority === 'LOW').length,
  };

  const handlePrint = () => {
    window.print();
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${sprint.name} - Sprint Report`,
          text: `Sprint Report for ${sprint.name}`,
          url,
        });
      } catch (err) {
        console.error('Share failed:', err);
      }
    } else {
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(url);
      alert('Link copied to clipboard!');
    }
  };

  return (
    <div className="space-y-6">
      {/* Actions */}
      <div className="flex items-center justify-between print:hidden">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Sprint Report</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Comprehensive summary of {sprint.name}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleShare}>
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
          <Button onClick={handlePrint}>
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Report Content */}
      <div ref={reportRef} className="space-y-6 print:p-8">
        {/* Header */}
        <div className="text-center border-b pb-6 print:border-black">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            {sprint.name}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {format(new Date(sprint.startDate), 'MMM d, yyyy')} - {format(new Date(sprint.endDate), 'MMM d, yyyy')}
          </p>
          {sprint.goal && (
            <div className="mt-4 bg-blue-50 dark:bg-blue-950 rounded-lg p-4 inline-block">
              <div className="flex items-center gap-2 text-blue-900 dark:text-blue-100">
                <Target className="h-5 w-5" />
                <span className="font-semibold">Sprint Goal:</span>
              </div>
              <p className="text-blue-800 dark:text-blue-200 mt-1">{sprint.goal}</p>
            </div>
          )}
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4 print:border-2">
            <div className="flex items-center gap-2 text-green-600 mb-2">
              <CheckCircle2 className="h-5 w-5" />
              <span className="text-sm font-medium">Completion Rate</span>
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{completionRate}%</p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {completedTasks} of {totalTasks} tasks
            </p>
          </Card>

          <Card className="p-4 print:border-2">
            <div className="flex items-center gap-2 text-blue-600 mb-2">
              <FileText className="h-5 w-5" />
              <span className="text-sm font-medium">Total Tasks</span>
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{completedTasks}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              of {totalTasks} completed
            </p>
          </Card>

          {velocity !== undefined && (
            <Card className="p-4 print:border-2">
              <div className="flex items-center gap-2 text-purple-600 mb-2">
                <TrendingUp className="h-5 w-5" />
                <span className="text-sm font-medium">Velocity</span>
              </div>
              <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{velocity}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {averageVelocity && `Avg: ${averageVelocity}`}
              </p>
            </Card>
          )}

          <Card className="p-4 print:border-2">
            <div className="flex items-center gap-2 text-orange-600 mb-2">
              <Users className="h-5 w-5" />
              <span className="text-sm font-medium">Sprint Status</span>
            </div>
            <p className="text-xl font-bold text-gray-900 dark:text-gray-100 capitalize">
              {sprint.status.toLowerCase()}
            </p>
          </Card>
        </div>

        {/* Task Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-6 print:border-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Tasks by Status
            </h3>
            <div className="space-y-3">
              {Object.entries(tasksByStatus).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                    {status.replace('_', ' ')}
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${
                          status === 'DONE'
                            ? 'bg-green-500'
                            : status === 'REVIEW'
                            ? 'bg-purple-500'
                            : status === 'IN_PROGRESS'
                            ? 'bg-blue-500'
                            : 'bg-gray-400'
                        }`}
                        style={{ width: `${totalTasks > 0 ? (count / totalTasks) * 100 : 0}%` }}
                      />
                    </div>
                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 w-8 text-right">
                      {count}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6 print:border-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Tasks by Priority
            </h3>
            <div className="space-y-3">
              {Object.entries(tasksByPriority).map(([priority, count]) => (
                <div key={priority} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-3 h-3 rounded-full ${
                        priority === 'CRITICAL'
                          ? 'bg-red-500'
                          : priority === 'HIGH'
                          ? 'bg-orange-500'
                          : priority === 'MEDIUM'
                          ? 'bg-yellow-500'
                          : 'bg-green-500'
                      }`}
                    />
                    <span className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                      {priority.toLowerCase()}
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {count}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Retrospective Summary */}
        {retrospective && (
          <Card className="p-6 print:border-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Retrospective Highlights
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h4 className="text-sm font-semibold text-green-600 dark:text-green-400 mb-2">
                  ✓ What Went Well ({retrospective.wentWell.length})
                </h4>
                <ul className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
                  {retrospective.wentWell.slice(0, 3).map(item => (
                    <li key={item.id} className="flex items-start gap-2">
                      <span className="text-green-500 mt-0.5">•</span>
                      <span>{item.text}</span>
                    </li>
                  ))}
                  {retrospective.wentWell.length > 3 && (
                    <li className="text-gray-500 italic">
                      +{retrospective.wentWell.length - 3} more...
                    </li>
                  )}
                </ul>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-red-600 dark:text-red-400 mb-2">
                  ⚠ What Didn't Go Well ({retrospective.didntGoWell.length})
                </h4>
                <ul className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
                  {retrospective.didntGoWell.slice(0, 3).map(item => (
                    <li key={item.id} className="flex items-start gap-2">
                      <span className="text-red-500 mt-0.5">•</span>
                      <span>{item.text}</span>
                    </li>
                  ))}
                  {retrospective.didntGoWell.length > 3 && (
                    <li className="text-gray-500 italic">
                      +{retrospective.didntGoWell.length - 3} more...
                    </li>
                  )}
                </ul>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-blue-600 dark:text-blue-400 mb-2">
                  💡 Action Items ({retrospective.actionItems.length})
                </h4>
                <ul className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
                  {retrospective.actionItems.slice(0, 3).map(item => (
                    <li key={item.id} className="flex items-start gap-2">
                      <span className="text-blue-500 mt-0.5">•</span>
                      <span>{item.text}</span>
                    </li>
                  ))}
                  {retrospective.actionItems.length > 3 && (
                    <li className="text-gray-500 italic">
                      +{retrospective.actionItems.length - 3} more...
                    </li>
                  )}
                </ul>
              </div>
            </div>
          </Card>
        )}

        {/* Footer */}
        <div className="text-center text-sm text-gray-500 dark:text-gray-400 pt-6 border-t print:border-black">
          <p>Generated on {format(new Date(), 'MMMM d, yyyy')} • L&T Connect</p>
        </div>
      </div>
    </div>
  );
}
