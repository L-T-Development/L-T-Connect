'use client';

import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';
import { format, eachDayOfInterval, startOfDay } from 'date-fns';

interface Task {
  $id: string;
  status: string;
  $createdAt: string;
  $updatedAt: string;
}

interface CFDChartProps {
  tasks: Task[];
  columns: Array<{ id: string; title: string; color: string }>;
  startDate: Date;
  endDate: Date;
}

export function CFDChart({ tasks, columns, startDate, endDate }: CFDChartProps) {
  // Generate daily data
  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const chartData = days.map(day => {
    const dayEnd = startOfDay(new Date(day.getTime() + 24 * 60 * 60 * 1000));

    // Count tasks in each status up to this day
    const dataPoint: any = {
      date: format(day, 'MMM d'),
      fullDate: day,
    };

    columns.forEach(column => {
      // Count tasks that were in this status on this day
      const count = tasks.filter(task => {
        const createdDate = new Date(task.$createdAt);
        const updatedDate = new Date(task.$updatedAt);

        // Task was created before or on this day
        if (createdDate > dayEnd) return false;

        // Task is currently in this status or was moved through it
        return task.status === column.id && updatedDate <= dayEnd;
      }).length;

      dataPoint[column.id] = count;
    });

    return dataPoint;
  });

  // Calculate colors for areas
  const getColorValue = (color: string) => {
    const colorMap: Record<string, string> = {
      'border-t-gray-500': '#6b7280',
      'border-t-red-500': '#ef4444',
      'border-t-orange-500': '#f97316',
      'border-t-yellow-500': '#eab308',
      'border-t-green-500': '#22c55e',
      'border-t-blue-500': '#3b82f6',
      'border-t-indigo-500': '#6366f1',
      'border-t-purple-500': '#a855f7',
      'border-t-pink-500': '#ec4899',
    };
    return colorMap[color] || '#6b7280';
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const total = payload.reduce((sum: number, entry: any) => sum + (entry.value || 0), 0);

      return (
        <div className="bg-white dark:bg-gray-800 p-4 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
          <p className="font-semibold text-sm text-gray-900 dark:text-gray-100 mb-2">
            {label}
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
            Total: {total} tasks
          </p>
          <div className="space-y-1">
            {payload.reverse().map((entry: any, index: number) => {
              const column = columns.find(c => c.id === entry.dataKey);
              return (
                <div key={index} className="flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded"
                      style={{ backgroundColor: entry.color }}
                    />
                    <span className="text-gray-700 dark:text-gray-300">
                      {column?.title || entry.dataKey}
                    </span>
                  </div>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">
                    {entry.value}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-6">
        <TrendingUp className="h-5 w-5 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Cumulative Flow Diagram
        </h3>
      </div>

      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        Visualize work in progress and identify bottlenecks in your workflow
      </p>

      <ResponsiveContainer width="100%" height={400}>
        <AreaChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 12 }}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis
            label={{ value: 'Number of Tasks', angle: -90, position: 'insideLeft' }}
            tick={{ fontSize: 12 }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />

          {/* Render areas in reverse order (bottom to top) */}
          {[...columns].reverse().map((column) => (
            <Area
              key={column.id}
              type="monotone"
              dataKey={column.id}
              stackId="1"
              stroke={getColorValue(column.color)}
              fill={getColorValue(column.color)}
              fillOpacity={0.6}
              name={column.title}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>

      {/* Insights */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-4">
          <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">📈 Insight</p>
          <p className="text-xs text-blue-800 dark:text-blue-200 mt-1">
            Horizontal bands indicate stable flow
          </p>
        </div>
        <div className="bg-amber-50 dark:bg-amber-950 rounded-lg p-4">
          <p className="text-sm text-amber-600 dark:text-amber-400 font-medium">⚠️ Bottleneck</p>
          <p className="text-xs text-amber-800 dark:text-amber-200 mt-1">
            Widening bands show accumulating work
          </p>
        </div>
        <div className="bg-green-50 dark:bg-green-950 rounded-lg p-4">
          <p className="text-sm text-green-600 dark:text-green-400 font-medium">✓ Throughput</p>
          <p className="text-xs text-green-800 dark:text-green-200 mt-1">
            Rising "Done" indicates healthy delivery
          </p>
        </div>
      </div>
    </Card>
  );
}
