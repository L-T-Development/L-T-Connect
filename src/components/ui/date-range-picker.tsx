'use client';

import * as React from 'react';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface DatePickerWithRangeProps {
  from?: Date;
  to?: Date;
  onSelect?: (range: { from: Date; to: Date } | undefined) => void;
  className?: string;
}

export function DatePickerWithRange({
  from,
  to,
  onSelect,
  className,
}: DatePickerWithRangeProps) {
  const [date, setDate] = React.useState<{ from: Date; to: Date } | undefined>(
    from && to ? { from, to } : undefined
  );
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    if (from && to) {
      setDate({ from, to });
    }
  }, [from, to]);

  const handleSelect = (selected: any) => {
    setDate(selected);
    if (onSelect) {
      onSelect(selected);
    }

    // Auto-close when both dates are selected (complete range)
    if (selected?.from && selected?.to) {
      setOpen(false);
    }
  };

  return (
    <div className={cn('grid gap-2', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant="outline"
            className={cn(
              'w-full justify-start text-left font-normal',
              !date && 'text-muted-foreground'
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, 'LLL dd, y')} -{' '}
                  {format(date.to, 'LLL dd, y')}
                </>
              ) : (
                format(date.from, 'LLL dd, y')
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
            defaultMonth={date?.from}
            selected={date}
            onSelect={handleSelect}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
