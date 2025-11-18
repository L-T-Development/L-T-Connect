'use client';

import React, { useState, useMemo } from 'react';
import {
  format,
  subMonths,
  eachDayOfInterval,
} from 'date-fns';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  TrendingUp,
  Clock,
  DollarSign,
  Calendar,
  Download,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTimeEntries } from '@/hooks/use-time-entry';
import { useWorkspaceTasks } from '@/hooks/use-task';
import { useProjects } from '@/hooks/use-project';
import type { TimeEntry } from '@/types';

interface TimeReportsProps {
  userId: string;
  workspaceId: string;
}

type DateRange = '7days' | '30days' | '3months' | 'custom';
type GroupBy = 'day' | 'project' | 'task' | 'type';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export function TimeReports({ userId, workspaceId }: TimeReportsProps) {
  const [dateRange, setDateRange] = useState<DateRange>('30days');
  const [groupBy, setGroupBy] = useState<GroupBy>('day');

  // Calculate date filters
  const { startDate, endDate } = useMemo(() => {
    const end = new Date();
    let start = new Date();

    switch (dateRange) {
      case '7days':
        start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30days':
        start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '3months':
        start = subMonths(end, 3);
        break;
    }

    return {
      startDate: start.toISOString(),
      endDate: end.toISOString(),
    };
  }, [dateRange]);

  const { data: timeEntries = [] } = useTimeEntries(userId, {
    workspaceId,
    startDate,
    endDate,
  });

  const { data: tasks = [] } = useWorkspaceTasks(workspaceId);
  const { data: projects = [] } = useProjects(workspaceId);

  // Calculate summary statistics
  const summary = useMemo(() => {
    const totalMinutes = timeEntries.reduce((sum, e) => sum + e.duration, 0);
    const billableMinutes = timeEntries.reduce(
      (sum, e) => (e.isBillable ? sum + e.duration : sum),
      0
    );
    const totalBillableAmount = timeEntries.reduce(
      (sum, e) => (e.isBillable && e.billableRate ? sum + (e.duration / 60) * e.billableRate : sum),
      0
    );

    return {
      totalHours: totalMinutes / 60,
      billableHours: billableMinutes / 60,
      nonBillableHours: (totalMinutes - billableMinutes) / 60,
      totalBillableAmount,
      entriesCount: timeEntries.length,
      averageHoursPerDay: totalMinutes / 60 / Math.max(1, dateRange === '7days' ? 7 : dateRange === '30days' ? 30 : 90),
    };
  }, [timeEntries, dateRange]);

  // Group data by selected dimension
  const chartData = useMemo(() => {
    switch (groupBy) {
      case 'day':
        return groupByDay(timeEntries, startDate, endDate);
      case 'project':
        return groupByProject(timeEntries, projects);
      case 'task':
        return groupByTask(timeEntries, tasks);
      case 'type':
        return groupByType(timeEntries);
      default:
        return [];
    }
  }, [timeEntries, groupBy, startDate, endDate, tasks, projects]);

  // Billable vs Non-billable pie chart data
  const billableData = [
    { name: 'Billable', value: summary.billableHours, color: COLORS[1] },
    { name: 'Non-Billable', value: summary.nonBillableHours, color: COLORS[3] },
  ];

  // Time entry type distribution
  const typeData = useMemo(() => {
    const types = timeEntries.reduce((acc, entry) => {
      acc[entry.type] = (acc[entry.type] || 0) + entry.duration;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(types).map(([name, value]) => ({
      name,
      value: value / 60,
    }));
  }, [timeEntries]);

  return (
    <div className="space-y-6">
      {/* Header with Filters */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Time Reports</h2>
          <p className="text-muted-foreground">
            Analyze your time tracking data and productivity
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRange)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7days">Last 7 Days</SelectItem>
              <SelectItem value="30days">Last 30 Days</SelectItem>
              <SelectItem value="3months">Last 3 Months</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalHours.toFixed(1)}h</div>
            <p className="text-xs text-muted-foreground">
              {summary.entriesCount} entries
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Billable Hours</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {summary.billableHours.toFixed(1)}h
            </div>
            <p className="text-xs text-muted-foreground">
              ${summary.totalBillableAmount.toFixed(2)} earned
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Non-Billable</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {summary.nonBillableHours.toFixed(1)}h
            </div>
            <p className="text-xs text-muted-foreground">
              {((summary.nonBillableHours / summary.totalHours) * 100).toFixed(0)}% of total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Daily Average</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary.averageHoursPerDay.toFixed(1)}h
            </div>
            <p className="text-xs text-muted-foreground">Per day average</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="timeline" className="space-y-4">
        <TabsList>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="distribution">Distribution</TabsTrigger>
          <TabsTrigger value="breakdown">Breakdown</TabsTrigger>
        </TabsList>

        {/* Timeline Chart */}
        <TabsContent value="timeline" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Time Tracking Timeline</CardTitle>
                <Select value={groupBy} onValueChange={(v) => setGroupBy(v as GroupBy)}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="day">By Day</SelectItem>
                    <SelectItem value="project">By Project</SelectItem>
                    <SelectItem value="task">By Task</SelectItem>
                    <SelectItem value="type">By Type</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip
                    formatter={(value: number) => [`${value.toFixed(1)}h`, 'Hours']}
                  />
                  <Legend />
                  <Bar dataKey="billable" stackId="a" fill={COLORS[1]} name="Billable" />
                  <Bar dataKey="nonBillable" stackId="a" fill={COLORS[3]} name="Non-Billable" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Distribution Chart */}
        <TabsContent value="distribution" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Billable vs Non-Billable</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={billableData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value.toFixed(1)}h`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {billableData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => `${value.toFixed(1)}h`} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Entry Type Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={typeData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value.toFixed(1)}h`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {typeData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => `${value.toFixed(1)}h`} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Breakdown Table */}
        <TabsContent value="breakdown" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Detailed Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {chartData.slice(0, 10).map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <div>
                        <div className="font-medium">{item.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {item.entries} {item.entries === 1 ? 'entry' : 'entries'}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold">{item.total.toFixed(1)}h</div>
                      <div className="text-sm text-muted-foreground">
                        <span className="text-green-600">{item.billable.toFixed(1)}h</span>
                        {' / '}
                        <span className="text-orange-600">{item.nonBillable.toFixed(1)}h</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Helper functions for grouping data
function groupByDay(entries: TimeEntry[], startDate: string, endDate: string) {
  const days = eachDayOfInterval({
    start: new Date(startDate),
    end: new Date(endDate),
  });

  const grouped = new Map<string, { billable: number; nonBillable: number; entries: number }>();

  days.forEach((day) => {
    const key = format(day, 'MMM dd');
    grouped.set(key, { billable: 0, nonBillable: 0, entries: 0 });
  });

  entries.forEach((entry) => {
    const key = format(new Date(entry.startTime), 'MMM dd');
    const data = grouped.get(key);
    if (data) {
      const hours = entry.duration / 60;
      if (entry.isBillable) {
        data.billable += hours;
      } else {
        data.nonBillable += hours;
      }
      data.entries += 1;
    }
  });

  return Array.from(grouped.entries()).map(([name, data]) => ({
    name,
    billable: data.billable,
    nonBillable: data.nonBillable,
    total: data.billable + data.nonBillable,
    entries: data.entries,
  }));
}

function groupByProject(entries: TimeEntry[], _projects: any[]) {
  const grouped = new Map<string, { billable: number; nonBillable: number; entries: number }>();

  entries.forEach((entry) => {
    const projectName = entry.projectName || 'No Project';
    const data = grouped.get(projectName) || { billable: 0, nonBillable: 0, entries: 0 };
    const hours = entry.duration / 60;

    if (entry.isBillable) {
      data.billable += hours;
    } else {
      data.nonBillable += hours;
    }
    data.entries += 1;

    grouped.set(projectName, data);
  });

  return Array.from(grouped.entries())
    .map(([name, data]) => ({
      name,
      billable: data.billable,
      nonBillable: data.nonBillable,
      total: data.billable + data.nonBillable,
      entries: data.entries,
    }))
    .sort((a, b) => b.total - a.total);
}

function groupByTask(entries: TimeEntry[], _tasks: any[]) {
  const grouped = new Map<string, { billable: number; nonBillable: number; entries: number }>();

  entries.forEach((entry) => {
    const taskName = entry.taskTitle || 'No Task';
    const data = grouped.get(taskName) || { billable: 0, nonBillable: 0, entries: 0 };
    const hours = entry.duration / 60;

    if (entry.isBillable) {
      data.billable += hours;
    } else {
      data.nonBillable += hours;
    }
    data.entries += 1;

    grouped.set(taskName, data);
  });

  return Array.from(grouped.entries())
    .map(([name, data]) => ({
      name,
      billable: data.billable,
      nonBillable: data.nonBillable,
      total: data.billable + data.nonBillable,
      entries: data.entries,
    }))
    .sort((a, b) => b.total - a.total);
}

function groupByType(entries: TimeEntry[]) {
  const grouped = new Map<string, { billable: number; nonBillable: number; entries: number }>();

  entries.forEach((entry) => {
    const data = grouped.get(entry.type) || { billable: 0, nonBillable: 0, entries: 0 };
    const hours = entry.duration / 60;

    if (entry.isBillable) {
      data.billable += hours;
    } else {
      data.nonBillable += hours;
    }
    data.entries += 1;

    grouped.set(entry.type, data);
  });

  return Array.from(grouped.entries()).map(([name, data]) => ({
    name,
    billable: data.billable,
    nonBillable: data.nonBillable,
    total: data.billable + data.nonBillable,
    entries: data.entries,
  }));
}
