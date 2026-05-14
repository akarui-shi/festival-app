import { useState } from 'react';
import { format, parse, isValid } from 'date-fns';
import { ru } from 'date-fns/locale';
import { CalendarIcon, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';

interface DateTimePickerProps {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

function splitDateTime(value?: string): { date: string; time: string } {
  if (!value) return { date: '', time: '' };
  const [date = '', time = ''] = value.split('T');
  return { date, time: time.slice(0, 5) };
}

export function DateTimePicker({ value, onChange, placeholder = 'Выберите дату и время', disabled, className }: DateTimePickerProps) {
  const [open, setOpen] = useState(false);
  const { date: dateStr, time: timeStr } = splitDateTime(value);

  const parsed = dateStr ? parse(dateStr, 'yyyy-MM-dd', new Date()) : undefined;
  const selected = parsed && isValid(parsed) ? parsed : undefined;

  const emit = (newDate: string, newTime: string) => {
    if (!newDate) { onChange(''); return; }
    onChange(`${newDate}T${newTime || '00:00'}`);
  };

  const handleSelectDay = (day: Date | undefined) => {
    if (day) {
      const formatted = format(day, 'yyyy-MM-dd');
      emit(formatted, timeStr);
    } else {
      onChange('');
    }
    setOpen(false);
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    emit(dateStr, e.target.value);
  };

  const label = selected
    ? `${format(selected, 'd MMMM yyyy', { locale: ru })}${timeStr ? `, ${timeStr}` : ''}`
    : null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            'h-10 w-full justify-start gap-2 text-left font-normal',
            !label && 'text-muted-foreground',
            className,
          )}
        >
          <CalendarIcon className="h-4 w-4 shrink-0 opacity-60" />
          {label ?? placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={handleSelectDay}
          locale={ru}
          initialFocus
        />
        <div className="border-t border-border px-3 py-2.5">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
            <Input
              type="time"
              value={timeStr}
              onChange={handleTimeChange}
              className="h-8 w-full"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
