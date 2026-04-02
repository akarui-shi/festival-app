import { useEffect, useMemo, useState } from 'react';
import ErrorMessage from './ErrorMessage';
import DatePickerField from './DatePickerField';
import { formatDateTime, formatTimeRange } from '../utils/formatters';

const DEFAULT_VALUES = {
  sessionDate: '',
  startTime: '',
  endTime: '',
  capacity: ''
};

const pad = (value) => String(value).padStart(2, '0');

const toDateParts = (value) => {
  if (!value) {
    return { date: '', time: '' };
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return { date: '', time: '' };
  }

  const date = `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}`;
  const time = `${pad(parsed.getHours())}:${pad(parsed.getMinutes())}`;
  return { date, time };
};

const composeDateTime = (date, time) => {
  if (!date || !time) {
    return '';
  }
  return `${date}T${time.length === 5 ? `${time}:00` : time}`;
};

const SessionForm = ({
  initialValues,
  isSubmitting = false,
  submitLabel = 'Сохранить',
  errorMessage = '',
  onCancel,
  onSubmit
}) => {
  const mergedInitialValues = useMemo(() => {
    const startParts = toDateParts(initialValues?.startAt || '');
    const endParts = toDateParts(initialValues?.endAt || '');

    return {
      ...DEFAULT_VALUES,
      ...initialValues,
      sessionDate: startParts.date || endParts.date || '',
      startTime: startParts.time,
      endTime: endParts.time,
      capacity: initialValues?.capacity ? String(initialValues.capacity) : ''
    };
  }, [initialValues]);

  const [formData, setFormData] = useState(mergedInitialValues);
  const [localError, setLocalError] = useState('');

  useEffect(() => {
    setFormData(mergedInitialValues);
    setLocalError('');
  }, [mergedInitialValues]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (localError) {
      setLocalError('');
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    const startAt = composeDateTime(formData.sessionDate, formData.startTime);
    const endAt = composeDateTime(formData.sessionDate, formData.endTime);

    if (!startAt || !endAt) {
      setLocalError('Укажите дату, время начала и время окончания.');
      return;
    }

    if (new Date(endAt).getTime() <= new Date(startAt).getTime()) {
      setLocalError('Время окончания должно быть позже времени начала.');
      return;
    }
    const capacity = Number(formData.capacity);
    if (!Number.isFinite(capacity) || capacity < 1) {
      setLocalError('Количество мест должно быть больше 0.');
      return;
    }

    onSubmit({
      startAt,
      endAt,
      capacity
    });
  };

  const previewStart = composeDateTime(formData.sessionDate, formData.startTime);
  const previewEnd = composeDateTime(formData.sessionDate, formData.endTime);
  const hasPreview = Boolean(previewStart && previewEnd);

  return (
    <form className="panel form session-form" onSubmit={handleSubmit}>
      <h3 className="session-form__title">Данные сеанса</h3>

      <div className="session-form__datetime-grid">
        <label>
          Дата
          <DatePickerField
            value={formData.sessionDate}
            onChange={(nextDate) => {
              setFormData((prev) => ({ ...prev, sessionDate: nextDate }));
              if (localError) {
                setLocalError('');
              }
            }}
            placeholder="Выбрать дату"
            disabled={isSubmitting}
          />
        </label>

        <label>
          Начало
          <input
            type="time"
            className="picker-input picker-input--time"
            name="startTime"
            value={formData.startTime}
            onChange={handleChange}
            required
          />
        </label>

        <label>
          Окончание
          <input
            type="time"
            className="picker-input picker-input--time"
            name="endTime"
            value={formData.endTime}
            onChange={handleChange}
            required
          />
        </label>

        <label>
          Количество мест
          <input
            type="number"
            min="1"
            name="capacity"
            value={formData.capacity}
            onChange={handleChange}
            required
          />
        </label>
      </div>

      {hasPreview && (
        <div className="session-form__preview">
          <p>
            <strong>Предпросмотр:</strong> {formatDateTime(previewStart)} ({formatTimeRange(previewStart, previewEnd)})
          </p>
        </div>
      )}

      {(localError || errorMessage) && <ErrorMessage message={localError || errorMessage} />}

      <div className="inline-actions">
        {onCancel && (
          <button type="button" className="btn btn--ghost" onClick={onCancel} disabled={isSubmitting}>
            Отмена
          </button>
        )}
        <button className="btn btn--primary" type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Сохраняем...' : submitLabel}
        </button>
      </div>
    </form>
  );
};

export default SessionForm;
