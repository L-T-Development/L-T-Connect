'use client';

import React from 'react';
import { Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Line, ComposedChart, ReferenceLine } from 'recharts';
import { format } from 'date-fns';
import { TrendingUp, Activity } from 'lucide-react';

interface Sprint {
  $id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: string;
}

interface Task {
  $id: string;
  sprintId?: string;
  status: string;
}

interface VelocityChartProps {
  sprints: Sprint[];
  allTasks: Task[];
  currentSprintId?: string;
}

export function VelocityChart({ sprints, allTasks, currentSprintId }: VelocityChartProps) {
  // Get completed or closed sprints, sorted by end date
  const completedSprints = sprints
    .filter(s => s.status === 'COMPLETED' || s.status === 'CLOSED')
    .sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime())
    .slice(-10); // Last 10 sprints

  // Calculate velocity for each sprint (using task count instead of story points)
  const velocityData = completedSprints.map(sprint => {
    const sprintTasks = allTasks.filter(t => t.sprintId === sprint.$id);
    const completedTasks = sprintTasks.filter(t => t.status === 'DONE');
    const taskCount = completedTasks.length;
    
    return {
      sprintId: sprint.$id,
      sprintName: sprint.name.length > 15 ? sprint.name.substring(0, 15) + '...' : sprint.name,
      fullName: sprint.name,
      velocity: taskCount,
      endDate: sprint.endDate,
      isCurrent: sprint.$id === currentSprintId,
    };
  });

  // Calculate average velocity
  const totalVelocity = velocityData.reduce((sum, data) => sum + data.velocity, 0);
  const averageVelocity = velocityData.length > 0 ? Math.round(totalVelocity / velocityData.length) : 0;

  // Calculate current sprint velocity if in progress (task count based)
  let currentSprintVelocity = 0;
  if (currentSprintId) {
    const currentSprintTasks = allTasks.filter(t => t.sprintId === currentSprintId);
    const completedTasks = currentSprintTasks.filter(t => t.status === 'DONE');
    currentSprintVelocity = completedTasks.length;
  }

  // Get trend (last 3 sprints vs previous 3 sprints)
  const getTrend = () => {
    if (velocityData.length < 3) return { direction: 'neutral', percentage: 0 };
    
    const recentThree = velocityData.slice(-3);
    const previousThree = velocityData.slice(-6, -3);
    
    if (previousThree.length === 0) return { direction: 'neutral', percentage: 0 };
    
    const recentAvg = recentThree.reduce((sum, d) => sum + d.velocity, 0) / recentThree.length;
    const previousAvg = previousThree.reduce((sum, d) => sum + d.velocity, 0) / previousThree.length;
    
    const percentageChange = previousAvg > 0 ? ((recentAvg - previousAvg) / previousAvg) * 100 : 0;
    
    return {
      direction: percentageChange > 5 ? 'up' : percentageChange < -5 ? 'down' : 'neutral',
      percentage: Math.abs(Math.round(percentageChange)),
    };
  };

  const trend = getTrend();

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
          <p className="font-semibold text-sm text-gray-900 dark:text-gray-100">{data.fullName}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Ended: {format(new Date(data.endDate), 'MMM d, yyyy')}
          </p>
          <p className="text-sm font-bold text-blue-600 dark:text-blue-400 mt-1">
            Velocity: {data.velocity} tasks
          </p>
          {data.velocity < averageVelocity && (
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
              Below average (-{averageVelocity - data.velocity})
            </p>
          )}
          {data.velocity > averageVelocity && (
            <p className="text-xs text-green-600 dark:text-green-400 mt-1">
              Above average (+{data.velocity - averageVelocity})
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  if (velocityData.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Velocity Trend</h3>
        </div>
        <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
          <div className="text-center">
            <Activity className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No completed sprints yet</p>
            <p className="text-sm mt-1">Velocity tracking will appear after completing sprints</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
      {/* Header with stats */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Team Velocity Trend</h3>
          </div>
          <div className="flex items-center gap-2 text-sm">
            {trend.direction === 'up' && (
              <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                <TrendingUp className="h-4 w-4" />
                +{trend.percentage}% trend
              </span>
            )}
            {trend.direction === 'down' && (
              <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
                <TrendingUp className="h-4 w-4 rotate-180" />
                -{trend.percentage}% trend
              </span>
            )}
            {trend.direction === 'neutral' && (
              <span className="text-gray-600 dark:text-gray-400">Stable</span>
            )}
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-4">
            <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">Average Velocity</p>
            <p className="text-2xl font-bold text-blue-900 dark:text-blue-100 mt-1">
              {averageVelocity} <span className="text-sm font-normal">pts</span>
            </p>
          </div>
          
          {currentSprintId && (
            <div className="bg-purple-50 dark:bg-purple-950 rounded-lg p-4">
              <p className="text-sm text-purple-600 dark:text-purple-400 font-medium">Current Sprint</p>
              <p className="text-2xl font-bold text-purple-900 dark:text-purple-100 mt-1">
                {currentSprintVelocity} <span className="text-sm font-normal">pts</span>
              </p>
              <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                {currentSprintVelocity >= averageVelocity ? 'On track' : 'Below average'}
              </p>
            </div>
          )}

          <div className="bg-green-50 dark:bg-green-950 rounded-lg p-4">
            <p className="text-sm text-green-600 dark:text-green-400 font-medium">Sprints Completed</p>
            <p className="text-2xl font-bold text-green-900 dark:text-green-100 mt-1">
              {velocityData.length}
            </p>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="p-6">
        <ResponsiveContainer width="100%" height={350}>
          <ComposedChart data={velocityData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis 
              dataKey="sprintName" 
              tick={{ fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis 
              label={{ value: 'Story Points', angle: -90, position: 'insideLeft' }}
              tick={{ fontSize: 12 }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            
            {/* Average velocity line */}
            <ReferenceLine 
              y={averageVelocity} 
              stroke="#6366f1" 
              strokeDasharray="5 5"
              label={{ value: `Avg: ${averageVelocity}`, position: 'right', fill: '#6366f1', fontSize: 12 }}
            />
            
            {/* Velocity bars */}
            <Bar 
              dataKey="velocity" 
              fill="#3b82f6"
              name="Sprint Velocity"
              radius={[8, 8, 0, 0]}
            />
            
            {/* Trend line */}
            <Line 
              type="monotone" 
              dataKey="velocity" 
              stroke="#8b5cf6" 
              strokeWidth={2}
              dot={{ fill: '#8b5cf6', r: 4 }}
              name="Trend"
            />
          </ComposedChart>
        </ResponsiveContainer>

        {/* Legend explanation */}
        <div className="mt-4 text-xs text-gray-600 dark:text-gray-400 flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded"></div>
            <span>Sprint Velocity (Tasks Completed)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-0.5 bg-purple-500"></div>
            <span>Velocity Trend Line</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-0.5 bg-indigo-500 border-t-2 border-dashed"></div>
            <span>Average Velocity</span>
          </div>
        </div>
      </div>
    </div>
  );
}
