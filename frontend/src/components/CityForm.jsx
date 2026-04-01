import { useEffect, useMemo, useState } from 'react';
import ErrorMessage from './ErrorMessage';

const CityForm = ({ initialValues, isSubmitting = false, errorMessage = '', submitLabel, onCancel, onSubmit }) => {
  const normalizedInitial = useMemo(
    () => ({
      name: initialValues?.name || '',
      region: initialValues?.region || '',
      country: initialValues?.country || ''
    }),
    [initialValues]
  );

  const [formData, setFormData] = useState(normalizedInitial);

  useEffect(() => {
    setFormData(normalizedInitial);
  }, [normalizedInitial]);

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit({
      name: formData.name.trim(),
      region: formData.region.trim() || null,
      country: formData.country.trim() || null
    });
  };

  return (
    <form className="panel form" onSubmit={handleSubmit}>
      <label>
        Город
        <input
          name="name"
          value={formData.name}
          onChange={(event) => setFormData((prev) => ({ ...prev, name: event.target.value }))}
          required
        />
      </label>

      <label>
        Регион
        <input
          name="region"
          value={formData.region}
          onChange={(event) => setFormData((prev) => ({ ...prev, region: event.target.value }))}
        />
      </label>

      <label>
        Страна
        <input
          name="country"
          value={formData.country}
          onChange={(event) => setFormData((prev) => ({ ...prev, country: event.target.value }))}
        />
      </label>

      {errorMessage && <ErrorMessage message={errorMessage} />}

      <div className="inline-actions">
        {onCancel && (
          <button className="btn btn--ghost" type="button" onClick={onCancel} disabled={isSubmitting}>
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

export default CityForm;

