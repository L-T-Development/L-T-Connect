'use client';

import { useState } from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import { useMonthlyAttendance } from '@/hooks/use-attendance';
import {
  getCalendarMonth,
  isWeekend,
  isWorkingDay,
  getAttendanceStatusColor,
  getAttendanceStatusIcon,
  isSaturdayWorking,
  getWeekOfMonth,
  getCurrentDate,
  ATTENDANCE_STATUS,
} from '@/lib/attendance-utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Loader2, Info } from 'lucide-react';

interface AttendanceRecord {
  $id: string;
  date: string;
  status: string;
  checkInTime?: string;
  checkOutTime?: string;
  workHours?: number;
}

export function AttendanceCalendar() {
  const { user } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  const { data: attendanceData, isLoading } = useMonthlyAttendance(
    user?.$id || '',
    user?.workspaceId || '',
    currentYear,
    currentMonth
  );

  const calendarDates = getCalendarMonth(currentYear, currentMonth);
  const monthName = new Date(currentYear, currentMonth).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  const handlePreviousMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const getAttendanceForDate = (date: Date): AttendanceRecord | undefined => {
    const dateString = date.toISOString().split('T')[0];
    return attendanceData?.find((record) => record.date === dateString);
  };

  const getDayStatus = (date: Date): string => {
    const dateString = date.toISOString().split('T')[0];
    const attendance = getAttendanceForDate(date);
    
    if (attendance) {
      return attendance.status;
    }
    
    if (isWeekend(dateString)) {
      return 'WEEKEND';
    }
    
    // If date is in the past and no attendance record, mark as absent
    if (new Date(dateString) < new Date(getCurrentDate()) && isWorkingDay(dateString)) {
      return 'ABSENT';
    }
    
    return '';
  };

  const getDayCellClass = (date: Date): string => {
    const dateString = date.toISOString().split('T')[0];
    const status = getDayStatus(date);
    const isToday = dateString === getCurrentDate();
    const isPast = new Date(dateString) < new Date(getCurrentDate());
    const isSaturday = date.getDay() === 6;
    const saturdayWorking = isSaturday && isSaturdayWorking(dateString);
    
    let classes = 'relative min-h-[80px] p-2 border rounded-lg transition-colors ';
    
    if (isToday) {
      classes += 'ring-2 ring-primary ring-offset-2 ';
    }
    
    if (status) {
      const colorClass = getAttendanceStatusColor(status);
      classes += colorClass + ' ';
    } else if (!isPast) {
      classes += 'bg-white hover:bg-gray-50 ';
    } else {
      classes += 'bg-gray-50 ';
    }
    
    // Add special styling for working Saturdays
    if (saturdayWorking && !status) {
      classes += 'ring-1 ring-blue-300 ';
    }
    
    return classes;
  };

  // Get the first day of the month to calculate padding
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Attendance Calendar</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Attendance Calendar</CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={handlePreviousMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="min-w-[180px] text-center font-semibold">{monthName}</span>
            <Button variant="outline" size="icon" onClick={handleNextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Working Saturday Info */}
        <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-800">
            <p className="font-medium">Working Schedule</p>
            <p className="text-blue-700">
              Saturdays on Week 1 and Week 3 are working days. Week 2 and Week 4 Saturdays are off.
            </p>
          </div>
        </div>

        {/* Calendar Legend */}
        <div className="flex flex-wrap gap-2 text-xs">
          <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
            <span className="mr-1">✓</span> Present
          </Badge>
          <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-200">
            <span className="mr-1">⏰</span> Late
          </Badge>
          <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200">
            <span className="mr-1">✗</span> Absent
          </Badge>
          <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200">
            <span className="mr-1">½</span> Half Day
          </Badge>
          <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">
            <span className="mr-1">🏖️</span> On Leave
          </Badge>
          <Badge variant="outline" className="bg-gray-100 text-gray-800 border-gray-200">
            <span className="mr-1">📅</span> Weekend
          </Badge>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-2">
          {/* Day headers */}
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div key={day} className="text-center font-semibold text-sm py-2">
              {day}
            </div>
          ))}

          {/* Empty cells for padding */}
          {Array.from({ length: firstDayOfMonth }).map((_, index) => (
            <div key={`empty-${index}`} />
          ))}

          {/* Date cells */}
          {calendarDates.map((date) => {
            const dateString = date.toISOString().split('T')[0];
            const status = getDayStatus(date);
            const attendance = getAttendanceForDate(date);
            const isSaturday = date.getDay() === 6;
            const saturdayWorking = isSaturday && isSaturdayWorking(dateString);
            const weekNum = getWeekOfMonth(dateString);

            return (
              <div key={dateString} className={getDayCellClass(date)}>
                <div className="flex flex-col h-full">
                  <div className="flex items-start justify-between mb-1">
                    <span className="font-semibold text-sm">{date.getDate()}</span>
                    {status && (
                      <span className="text-lg">
                        {getAttendanceStatusIcon(status)}
                      </span>
                    )}
                  </div>
                  
                  {/* Working Saturday Badge */}
                  {saturdayWorking && (
                    <Badge variant="outline" className="text-[10px] px-1 py-0 mb-1 bg-blue-50 border-blue-300">
                      W{weekNum}
                    </Badge>
                  )}
                  
                  {attendance && attendance.workHours !== undefined && attendance.workHours !== null && (
                    <div className="text-xs text-muted-foreground mt-auto">
                      {attendance.workHours.toFixed(1)}h
                    </div>
                  )}
                  
                  {status && (
                    <div className="text-[10px] font-medium mt-auto">
                      {ATTENDANCE_STATUS[status as keyof typeof ATTENDANCE_STATUS] || status}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Monthly Summary */}
        {attendanceData && attendanceData.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">
                {attendanceData.filter((r) => r.status === 'PRESENT').length}
              </p>
              <p className="text-xs text-muted-foreground">Present Days</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-orange-600">
                {attendanceData.filter((r) => r.status === 'LATE').length}
              </p>
              <p className="text-xs text-muted-foreground">Late Days</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-red-600">
                {attendanceData.filter((r) => r.status === 'ABSENT').length}
              </p>
              <p className="text-xs text-muted-foreground">Absent Days</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">
                {attendanceData.filter((r) => r.workHours).reduce((sum, r) => sum + (r.workHours || 0), 0).toFixed(1)}h
              </p>
              <p className="text-xs text-muted-foreground">Total Hours</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
