import { useEffect, useMemo, useState } from 'react';
import ErrorMessage from './ErrorMessage';

const VenueForm = ({
  initialValues,
  cities = [],
  isSubmitting = false,
  errorMessage = '',
  submitLabel,
  onCancel,
  onSubmit
}) => {
  const normalizedInitial = useMemo(
    () => ({
      name: initialValues?.name || '',
      address: initialValues?.address || '',
      capacity: initialValues?.capacity ?? '',
      cityId: initialValues?.cityId ? String(initialValues.cityId) : '',
      latitude: initialValues?.latitude ?? '',
      longitude: initialValues?.longitude ?? ''
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
      address: formData.address.trim(),
      capacity: formData.capacity === '' ? null : Number(formData.capacity),
      cityId: Number(formData.cityId),
      latitude: formData.latitude === '' ? null : Number(formData.latitude),
      longitude: formData.longitude === '' ? null : Number(formData.longitude)
    });
  };

  return (
    <form className="panel form" onSubmit={handleSubmit}>
      <label>
        Название площадки
        <input
          name="name"
          value={formData.name}
          onChange={(event) => setFormData((prev) => ({ ...prev, name: event.target.value }))}
          required
        />
      </label>

      <label>
        Адрес
        <input
          name="address"
          value={formData.address}
          onChange={(event) => setFormData((prev) => ({ ...prev, address: event.target.value }))}
          required
        />
      </label>

      <label>
        Вместимость
        <input
          type="number"
          min="0"
          name="capacity"
          value={formData.capacity}
          onChange={(event) => setFormData((prev) => ({ ...prev, capacity: event.target.value }))}
        />
      </label>

      <label>
        Город
        <select
          name="cityId"
          value={formData.cityId}
          onChange={(event) => setFormData((prev) => ({ ...prev, cityId: event.target.value }))}
          required
        >
          <option value="">Выберите город</option>
          {cities.map((city) => (
            <option key={city.id} value={city.id}>
              {city.name}
            </option>
          ))}
        </select>
      </label>

      <label>
        Широта
        <input
          type="number"
          step="0.000001"
          name="latitude"
          value={formData.latitude}
          onChange={(event) => setFormData((prev) => ({ ...prev, latitude: event.target.value }))}
        />
      </label>

      <label>
        Долгота
        <input
          type="number"
          step="0.000001"
          name="longitude"
          value={formData.longitude}
          onChange={(event) => setFormData((prev) => ({ ...prev, longitude: event.target.value }))}
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

export default VenueForm;

