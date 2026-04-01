import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { YMaps, useYMaps } from '@pbe/react-yandex-maps';
import AlertMessage from './AlertMessage';
import SearchableCitySelect from './SearchableCitySelect';
import VenueMap from './VenueMap';
import { buildYandexMapsQuery, YANDEX_MAPS_API_KEY } from '../utils/config';

const toNumericCoordinate = (value) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const normalized = Number(value);
  return Number.isFinite(normalized) ? normalized : null;
};

const VenueFormContent = ({
  initialValues,
  isSubmitting = false,
  errorMessage = '',
  submitLabel,
  onCancel,
  onSubmit
}) => {
  const ymaps = useYMaps(['SuggestView', 'geocode']);
  const addressInputRef = useRef(null);
  const suggestViewRef = useRef(null);

  const normalizedInitial = useMemo(
    () => ({
      name: initialValues?.name || '',
      address: initialValues?.address || '',
      contacts: initialValues?.contacts || '',
      capacity: initialValues?.capacity ?? ''
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
  const [coordinates, setCoordinates] = useState(() => {
    const latitude = toNumericCoordinate(initialValues?.latitude);
    const longitude = toNumericCoordinate(initialValues?.longitude);
    if (latitude === null || longitude === null) {
      return null;
    }
    return { latitude, longitude };
  });
  const [localError, setLocalError] = useState('');
  const [isResolvingAddress, setIsResolvingAddress] = useState(false);
  const [geoMessage, setGeoMessage] = useState('');

  useEffect(() => {
    setFormData(normalizedInitial);
    const latitude = toNumericCoordinate(initialValues?.latitude);
    const longitude = toNumericCoordinate(initialValues?.longitude);
    setCoordinates(latitude !== null && longitude !== null ? { latitude, longitude } : null);
    setLocalError('');
    setGeoMessage('');
  }, [initialValues?.latitude, initialValues?.longitude, normalizedInitial]);

  const resolveAddressCoordinates = useCallback(
    async (rawAddress, options = {}) => {
      const { normalizeAddress = true } = options;
      const normalizedAddress = rawAddress?.trim();

      if (!normalizedAddress) {
        setCoordinates(null);
        setGeoMessage('');
        return null;
      }

      if (!ymaps) {
        return null;
      }

      const queryAddress =
        selectedCity?.name && !normalizedAddress.toLowerCase().includes(selectedCity.name.toLowerCase())
          ? `${selectedCity.name}, ${normalizedAddress}`
          : normalizedAddress;

      try {
        setIsResolvingAddress(true);
        const geocodeResult = await ymaps.geocode(queryAddress, { results: 1 });
        const firstGeoObject = geocodeResult.geoObjects.get(0);
        if (!firstGeoObject) {
          setCoordinates(null);
          setGeoMessage('');
          return null;
        }

        const [latitude, longitude] = firstGeoObject.geometry.getCoordinates();
        const detectedAddress = firstGeoObject.getAddressLine
          ? firstGeoObject.getAddressLine()
          : normalizedAddress;

        if (normalizeAddress && detectedAddress) {
          setFormData((prev) => ({ ...prev, address: detectedAddress }));
        }
        setCoordinates({ latitude, longitude });
        setGeoMessage('Координаты определены автоматически.');
        setLocalError('');

        return { latitude, longitude, detectedAddress };
      } catch {
        return null;
      } finally {
        setIsResolvingAddress(false);
      }
    },
    [selectedCity?.name, ymaps]
  );

  useEffect(() => {
    if (!ymaps || !addressInputRef.current || suggestViewRef.current) {
      return undefined;
    }

    const suggestView = new ymaps.SuggestView(addressInputRef.current, {
      results: 6
    });

    const handleSelect = async (event) => {
      const item = event.get('item');
      const suggestedAddress = item?.value || item?.displayName || '';
      if (!suggestedAddress) {
        return;
      }

      setFormData((prev) => ({ ...prev, address: suggestedAddress }));
      await resolveAddressCoordinates(suggestedAddress, { normalizeAddress: true });
    };

    suggestView.events.add('select', handleSelect);
    suggestViewRef.current = suggestView;

    return () => {
      suggestView.events.remove('select', handleSelect);
      suggestView.destroy();
      suggestViewRef.current = null;
    };
  }, [resolveAddressCoordinates, ymaps]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLocalError('');

    if (!selectedCity?.id) {
      setLocalError('Выберите город площадки.');
      return;
    }

    let resolvedCoordinates = coordinates;
    if (!resolvedCoordinates) {
      const geocoded = await resolveAddressCoordinates(formData.address, { normalizeAddress: false });
      if (!geocoded) {
        setLocalError('Выберите адрес из подсказок, чтобы определить координаты площадки.');
        return;
      }
      resolvedCoordinates = {
        latitude: geocoded.latitude,
        longitude: geocoded.longitude
      };
    }

    onSubmit({
      name: formData.name.trim(),
      address: formData.address.trim(),
      contacts: formData.contacts.trim() || null,
      capacity: formData.capacity === '' ? null : Number(formData.capacity),
      cityId: Number(selectedCity.id),
      latitude: resolvedCoordinates.latitude,
      longitude: resolvedCoordinates.longitude
    });
  };

  const handleAddressChange = (value) => {
    setFormData((prev) => ({ ...prev, address: value }));
    setCoordinates(null);
    setGeoMessage('');
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
          ref={addressInputRef}
          name="address"
          value={formData.address}
          onChange={(event) => handleAddressChange(event.target.value)}
          onBlur={() => {
            if (formData.address.trim() && !coordinates) {
              void resolveAddressCoordinates(formData.address, { normalizeAddress: false });
            }
          }}
          placeholder="Начните вводить адрес и выберите вариант из подсказок"
          required
        />
      </label>

      {!YANDEX_MAPS_API_KEY && (
        <p className="muted">
          Для стабильной работы подсказок добавьте `VITE_YANDEX_MAPS_API_KEY` в `.env`.
        </p>
      )}

      <SearchableCitySelect
        label="Город"
        selectedCity={selectedCity}
        onSelect={(city) => {
          setSelectedCity(city);
          setLocalError('');
          setCoordinates(null);
          setGeoMessage('');
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

      {isResolvingAddress && <p className="muted">Определяем координаты по адресу...</p>}
      {geoMessage && (
        <AlertMessage
          type="success"
          message={geoMessage}
          autoHideMs={2400}
          onClose={() => setGeoMessage('')}
        />
      )}

      {coordinates ? (
        <div className="venue-form-map">
          <p className="muted">
            Координаты: {coordinates.latitude.toFixed(6)}, {coordinates.longitude.toFixed(6)}
          </p>
          <VenueMap
            venueName={formData.name.trim() || 'Новая площадка'}
            address={formData.address.trim() || 'Адрес не указан'}
            latitude={coordinates.latitude}
            longitude={coordinates.longitude}
          />
        </div>
      ) : (
        <p className="muted">После выбора адреса из подсказок координаты будут определены автоматически.</p>
      )}

      {(localError || errorMessage) && (
        <AlertMessage
          type="error"
          message={localError || errorMessage}
          onClose={() => setLocalError('')}
        />
      )}

      <div className="inline-actions">
        {onCancel && (
          <button className="btn btn--ghost" type="button" onClick={onCancel} disabled={isSubmitting}>
            Отмена
          </button>
        )}
        <button className="btn btn--primary" type="submit" disabled={isSubmitting || isResolvingAddress}>
          {isSubmitting ? 'Сохраняем...' : submitLabel}
        </button>
      </div>
    </form>
  );
};

const VenueForm = (props) => (
  <YMaps query={buildYandexMapsQuery()}>
    <VenueFormContent {...props} />
  </YMaps>
);

export default VenueForm;
