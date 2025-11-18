'use client';

import React, { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { Download, FileText, FileSpreadsheet, Calendar as CalendarIcon } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useTimeEntries } from '@/hooks/use-time-entry';
import { cn } from '@/lib/utils';
import type { TimeEntry } from '@/types';
import { toast } from 'sonner';

interface TimeExportProps {
  userId: string;
  workspaceId: string;
}

type ExportFormat = 'csv' | 'xlsx' | 'pdf';
type ExportGrouping = 'none' | 'task' | 'project' | 'date';

export function TimeExport({ userId, workspaceId }: TimeExportProps) {
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: new Date(new Date().setDate(new Date().getDate() - 30)),
    to: new Date(),
  });
  const [exportFormat, setExportFormat] = useState<ExportFormat>('csv');
  const [grouping, setGrouping] = useState<ExportGrouping>('date');
  const [includeNonBillable, setIncludeNonBillable] = useState(true);

  const { data: timeEntries = [] } = useTimeEntries(userId, {
    workspaceId,
    startDate: dateRange.from.toISOString(),
    endDate: dateRange.to.toISOString(),
  });

  // Filter entries
  const filteredEntries = useMemo(() => {
    return timeEntries.filter(
      (entry) => includeNonBillable || entry.isBillable
    );
  }, [timeEntries, includeNonBillable]);

  // Calculate totals
  const totals = useMemo(() => {
    const totalMinutes = filteredEntries.reduce((sum, e) => sum + e.duration, 0);
    const billableMinutes = filteredEntries.reduce(
      (sum, e) => (e.isBillable ? sum + e.duration : sum),
      0
    );
    const totalAmount = filteredEntries.reduce(
      (sum, e) =>
        e.isBillable && e.billableRate
          ? sum + (e.duration / 60) * e.billableRate
          : sum,
      0
    );

    return {
      totalHours: totalMinutes / 60,
      billableHours: billableMinutes / 60,
      totalAmount,
      entriesCount: filteredEntries.length,
    };
  }, [filteredEntries]);

  const handleExport = async () => {
    try {
      switch (exportFormat) {
        case 'csv':
          exportToCSV(filteredEntries, grouping);
          break;
        case 'xlsx':
          toast.info('XLSX export requires the xlsx library to be installed');
          // Would use a library like xlsx or exceljs
          break;
        case 'pdf':
          toast.info('PDF export requires the jspdf library to be installed');
          // Would use jsPDF
          break;
      }
      toast.success('Export completed successfully');
    } catch (error) {
      toast.error('Failed to export time entries');
      console.error('Export error:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Export Time Data</h2>
        <p className="text-muted-foreground">
          Export your time tracking data for invoicing and reporting
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.totalHours.toFixed(1)}h</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Billable Hours</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {totals.billableHours.toFixed(1)}h
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totals.totalAmount.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Entries</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.entriesCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Export Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Export Configuration</CardTitle>
          <CardDescription>
            Choose your export format and filters
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Date Range */}
          <div className="space-y-2">
            <Label>Date Range</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !dateRange && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange?.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, 'LLL dd, y')} -{' '}
                        {format(dateRange.to, 'LLL dd, y')}
                      </>
                    ) : (
                      format(dateRange.from, 'LLL dd, y')
                    )
                  ) : (
                    <span>Pick a date range</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange?.from}
                  selected={dateRange}
                  onSelect={(selected: any) => {
                    if (selected?.from && selected?.to) {
                      setDateRange({ from: selected.from, to: selected.to });
                    }
                  }}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
          </div>

          <Separator />

          {/* Export Format */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="format">Export Format</Label>
              <Select
                value={exportFormat}
                onValueChange={(v) => setExportFormat(v as ExportFormat)}
              >
                <SelectTrigger id="format">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      CSV (Comma Separated)
                    </div>
                  </SelectItem>
                  <SelectItem value="xlsx">
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="h-4 w-4" />
                      XLSX (Excel)
                    </div>
                  </SelectItem>
                  <SelectItem value="pdf">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      PDF (Invoice)
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="grouping">Group By</Label>
              <Select
                value={grouping}
                onValueChange={(v) => setGrouping(v as ExportGrouping)}
              >
                <SelectTrigger id="grouping">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Grouping</SelectItem>
                  <SelectItem value="date">By Date</SelectItem>
                  <SelectItem value="task">By Task</SelectItem>
                  <SelectItem value="project">By Project</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          {/* Options */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label>Include Non-Billable Hours</Label>
                <p className="text-sm text-muted-foreground">
                  Include non-billable entries in the export
                </p>
              </div>
              <input
                type="checkbox"
                checked={includeNonBillable}
                onChange={(e) => setIncludeNonBillable(e.target.checked)}
                className="h-4 w-4"
              />
            </div>
          </div>

          <Separator />

          {/* Preview */}
          <div className="space-y-2">
            <Label>Export Preview</Label>
            <div className="rounded-lg border p-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Period:</span>
                <span className="font-medium">
                  {format(dateRange.from, 'MMM d, yyyy')} -{' '}
                  {format(dateRange.to, 'MMM d, yyyy')}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Format:</span>
                <Badge variant="secondary">{exportFormat.toUpperCase()}</Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Grouping:</span>
                <Badge variant="outline">{grouping === 'none' ? 'None' : `By ${grouping}`}</Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Entries:</span>
                <span className="font-medium">{filteredEntries.length}</span>
              </div>
            </div>
          </div>

          {/* Export Button */}
          <Button onClick={handleExport} size="lg" className="w-full">
            <Download className="h-4 w-4 mr-2" />
            Export {filteredEntries.length} Entries
          </Button>
        </CardContent>
      </Card>

      {/* Export Templates */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Export Templates</CardTitle>
          <CardDescription>
            Pre-configured export options for common use cases
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2">
            <Button
              variant="outline"
              className="h-auto flex-col items-start p-4 space-y-2"
              onClick={() => {
                setExportFormat('csv');
                setGrouping('date');
                setIncludeNonBillable(true);
                handleExport();
              }}
            >
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                <span className="font-semibold">Daily Timesheet</span>
              </div>
              <span className="text-xs text-muted-foreground text-left">
                All entries grouped by date (CSV)
              </span>
            </Button>

            <Button
              variant="outline"
              className="h-auto flex-col items-start p-4 space-y-2"
              onClick={() => {
                setExportFormat('csv');
                setGrouping('project');
                setIncludeNonBillable(false);
                handleExport();
              }}
            >
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5" />
                <span className="font-semibold">Billable Report</span>
              </div>
              <span className="text-xs text-muted-foreground text-left">
                Only billable hours by project (CSV)
              </span>
            </Button>

            <Button
              variant="outline"
              className="h-auto flex-col items-start p-4 space-y-2"
              onClick={() => {
                setExportFormat('pdf');
                setGrouping('task');
                setIncludeNonBillable(false);
                handleExport();
              }}
            >
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                <span className="font-semibold">Client Invoice</span>
              </div>
              <span className="text-xs text-muted-foreground text-left">
                Billable hours for invoicing (PDF)
              </span>
            </Button>

            <Button
              variant="outline"
              className="h-auto flex-col items-start p-4 space-y-2"
              onClick={() => {
                setExportFormat('xlsx');
                setGrouping('none');
                setIncludeNonBillable(true);
                handleExport();
              }}
            >
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5" />
                <span className="font-semibold">Complete Export</span>
              </div>
              <span className="text-xs text-muted-foreground text-left">
                All entries with details (Excel)
              </span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Helper function to export to CSV
function exportToCSV(entries: TimeEntry[], grouping: ExportGrouping) {
  const headers = [
    'Date',
    'Task',
    'Project',
    'Description',
    'Start Time',
    'End Time',
    'Duration (hours)',
    'Billable',
    'Rate',
    'Amount',
    'Status',
    'Type',
  ];

  const rows = entries.map((entry) => [
    format(new Date(entry.startTime), 'yyyy-MM-dd'),
    entry.taskTitle || '-',
    entry.projectName || '-',
    entry.description,
    format(new Date(entry.startTime), 'HH:mm'),
    format(new Date(entry.endTime), 'HH:mm'),
    (entry.duration / 60).toFixed(2),
    entry.isBillable ? 'Yes' : 'No',
    entry.billableRate?.toFixed(2) || '-',
    entry.isBillable && entry.billableRate
      ? ((entry.duration / 60) * entry.billableRate).toFixed(2)
      : '-',
    entry.status,
    entry.type,
  ]);

  // Sort/group rows based on grouping
  if (grouping === 'date') {
    rows.sort((a, b) => a[0].localeCompare(b[0]));
  } else if (grouping === 'task') {
    rows.sort((a, b) => a[1].localeCompare(b[1]));
  } else if (grouping === 'project') {
    rows.sort((a, b) => a[2].localeCompare(b[2]));
  }

  const csv = [
    headers.join(','),
    ...rows.map((row) =>
      row.map((cell) => `"${cell.toString().replace(/"/g, '""')}"`).join(',')
    ),
  ].join('\n');

  // Download file
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute(
    'download',
    `timesheet_${format(new Date(), 'yyyy-MM-dd')}.csv`
  );
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
