import { useEffect, useMemo, useRef, useState } from 'react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import AppIcon from './AppIcon';

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const toIsoDate = (date) => {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return '';
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const fromIsoDate = (value) => {
  if (!value || !ISO_DATE_PATTERN.test(value)) {
    return undefined;
  }
  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(year, month - 1, day);
  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }
  return parsed;
};

const DatePickerField = ({
  value = '',
  onChange,
  placeholder = 'Выбрать дату',
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef(null);
  const selectedDate = useMemo(() => fromIsoDate(value), [value]);
  const defaultMonth = selectedDate || new Date();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!rootRef.current) {
        return;
      }
      if (!rootRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const handleSelect = (date) => {
    onChange?.(date ? toIsoDate(date) : '');
    if (date) {
      setIsOpen(false);
    }
  };

  const handleClear = () => {
    onChange?.('');
  };

  const handleToday = () => {
    const today = new Date();
    onChange?.(toIsoDate(today));
    setIsOpen(false);
  };

  const displayValue = selectedDate ? format(selectedDate, 'd MMMM yyyy', { locale: ru }) : placeholder;

  return (
    <div className={`date-picker ${disabled ? 'date-picker--disabled' : ''}`.trim()} ref={rootRef}>
      <button
        type="button"
        className="date-picker__trigger"
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        disabled={disabled}
        aria-expanded={isOpen}
      >
        <AppIcon name="calendar" size={16} />
        <span>{displayValue}</span>
      </button>

      {value && !disabled && (
        <button type="button" className="date-picker__clear" onClick={handleClear}>
          Очистить
        </button>
      )}

      {isOpen && !disabled && (
        <div className="date-picker__popover">
          <DayPicker
            className="date-picker__calendar"
            mode="single"
            locale={ru}
            weekStartsOn={1}
            selected={selectedDate}
            onSelect={handleSelect}
            defaultMonth={defaultMonth}
            showOutsideDays={false}
            fixedWeeks={false}
            captionLayout="label"
            navLayout="after"
          />
          <div className="date-picker__actions">
            <button type="button" className="date-picker__action-btn" onClick={handleToday}>
              Сегодня
            </button>
            <button type="button" className="date-picker__action-btn" onClick={handleClear}>
              Сброс
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DatePickerField;
