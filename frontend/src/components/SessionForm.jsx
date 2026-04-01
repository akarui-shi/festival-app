import { useEffect, useMemo, useState } from 'react';
import ErrorMessage from './ErrorMessage';

const DEFAULT_VALUES = {
  title: '',
  description: '',
  startAt: '',
  endAt: ''
};

const toDateTimeLocalValue = (value) => {
  if (!value) {
    return '';
  }
  return value.length >= 16 ? value.slice(0, 16) : value;
};

const toApiDateTimeValue = (value) => {
  if (!value) {
    return value;
  }
  return value.length === 16 ? `${value}:00` : value;
};

const SessionForm = ({
  initialValues,
  isSubmitting = false,
  submitLabel = 'Сохранить',
  errorMessage = '',
  onCancel,
  onSubmit
}) => {
  const mergedInitialValues = useMemo(
    () => ({
      ...DEFAULT_VALUES,
      ...initialValues,
      startAt: toDateTimeLocalValue(initialValues?.startAt || ''),
      endAt: toDateTimeLocalValue(initialValues?.endAt || '')
    }),
    [initialValues]
  );

  const [formData, setFormData] = useState(mergedInitialValues);

  useEffect(() => {
    setFormData(mergedInitialValues);
  }, [mergedInitialValues]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit({
      title: formData.title.trim(),
      description: formData.description.trim(),
      startAt: toApiDateTimeValue(formData.startAt),
      endAt: toApiDateTimeValue(formData.endAt)
    });
  };

  return (
    <form className="panel form" onSubmit={handleSubmit}>
      <label>
        Название сеанса
        <input name="title" value={formData.title} onChange={handleChange} required />
      </label>

      <label>
        Описание
        <textarea name="description" value={formData.description} onChange={handleChange} rows={3} />
      </label>

      <label>
        Начало
        <input type="datetime-local" name="startAt" value={formData.startAt} onChange={handleChange} required />
      </label>

      <label>
        Окончание
        <input type="datetime-local" name="endAt" value={formData.endAt} onChange={handleChange} required />
      </label>

      {errorMessage && <ErrorMessage message={errorMessage} />}

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
