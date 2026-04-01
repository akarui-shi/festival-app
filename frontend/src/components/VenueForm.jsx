import { useEffect, useMemo, useState } from 'react';
import ErrorMessage from './ErrorMessage';
import SearchableCitySelect from './SearchableCitySelect';
import VenueMap from './VenueMap';

const VenueForm = ({
  initialValues,
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
      contacts: initialValues?.contacts || '',
      capacity: initialValues?.capacity ?? '',
      latitude: initialValues?.latitude ?? '',
      longitude: initialValues?.longitude ?? ''
    }),
    [initialValues]
  );

  const [formData, setFormData] = useState(normalizedInitial);
  const [selectedCity, setSelectedCity] = useState(
    initialValues?.cityId
      ? {
          id: initialValues.cityId,
          name: initialValues.cityName || '',
          region: initialValues.cityRegion || '',
          country: initialValues.cityCountry || ''
        }
      : null
  );
  const [localError, setLocalError] = useState('');

  useEffect(() => {
    setFormData(normalizedInitial);
  }, [normalizedInitial]);

  const latitude = formData.latitude === '' ? NaN : Number(formData.latitude);
  const longitude = formData.longitude === '' ? NaN : Number(formData.longitude);
  const hasCoordinates = Number.isFinite(latitude) && Number.isFinite(longitude);

  const handleSubmit = (event) => {
    event.preventDefault();
    setLocalError('');

    if (!selectedCity?.id) {
      setLocalError('Выберите город площадки.');
      return;
    }

    onSubmit({
      name: formData.name.trim(),
      address: formData.address.trim(),
      contacts: formData.contacts.trim() || null,
      capacity: formData.capacity === '' ? null : Number(formData.capacity),
      cityId: Number(selectedCity.id),
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
          placeholder="Например: ул. Ленина, 12"
          required
        />
      </label>

      <SearchableCitySelect
        label="Город"
        selectedCity={selectedCity}
        onSelect={(city) => {
          setSelectedCity(city);
          setLocalError('');
        }}
        onClear={() => setSelectedCity(null)}
      />

      <label>
        Контакты площадки
        <input
          name="contacts"
          value={formData.contacts}
          onChange={(event) => setFormData((prev) => ({ ...prev, contacts: event.target.value }))}
          placeholder="+7 999 000-00-00, info@venue.ru"
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
        Широта
        <input
          type="number"
          step="0.000001"
          name="latitude"
          value={formData.latitude}
          onChange={(event) => setFormData((prev) => ({ ...prev, latitude: event.target.value }))}
          placeholder="55.751244"
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
          placeholder="37.618423"
        />
      </label>

      {hasCoordinates ? (
        <div className="venue-form-map">
          <p className="muted">Предпросмотр точки на карте</p>
          <VenueMap
            venueName={formData.name.trim() || 'Новая площадка'}
            address={formData.address.trim() || 'Адрес не указан'}
            latitude={latitude}
            longitude={longitude}
          />
        </div>
      ) : (
        <p className="muted">Укажите широту и долготу, чтобы увидеть точку на карте.</p>
      )}

      {(localError || errorMessage) && <ErrorMessage message={localError || errorMessage} />}

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
