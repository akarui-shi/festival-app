import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Map, Placemark, YMaps, useYMaps } from '@pbe/react-yandex-maps';
import AlertMessage from './AlertMessage';
import { uploadService } from '../services/uploadService';
import { cityService } from '../services/cityService';
import { buildYandexMapsQuery, YANDEX_MAPS_API_KEY } from '../utils/config';
import { toUserErrorMessage } from '../utils/errorMessages';

const DEFAULT_MAP_CENTER = [55.751244, 37.618423];

const DEFAULT_VALUES = {
  title: '',
  shortDescription: '',
  fullDescription: '',
  ageRating: 0,
  coverUrl: '',
  categoryIds: [],
  eventImages: [],
  venueId: null,
  venueAddress: '',
  venueLatitude: null,
  venueLongitude: null,
  venueCityId: null,
  venueCityName: '',
  venueRegion: '',
  venueCountry: ''
};

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

const toNumberOrNull = (value) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

const normalizeImages = (images = []) => {
  const normalized = (Array.isArray(images) ? images : [])
    .filter((image) => image && typeof image.imageUrl === 'string' && image.imageUrl.trim())
    .map((image, index) => ({
      imageUrl: image.imageUrl.trim(),
      isCover: Boolean(image.isCover),
      sortOrder: Number.isFinite(Number(image.sortOrder)) ? Number(image.sortOrder) : index
    }))
    .sort((left, right) => left.sortOrder - right.sortOrder);

  if (normalized.length === 0) {
    return [];
  }

  const coverIndex = normalized.findIndex((image) => image.isCover);
  const resolvedCoverIndex = coverIndex >= 0 ? coverIndex : 0;
  return normalized.map((image, index) => ({
    ...image,
    isCover: index === resolvedCoverIndex,
    sortOrder: index
  }));
};

const withLegacyCover = (initialValues) => {
  const normalized = normalizeImages(initialValues?.eventImages || []);
  if (normalized.length > 0) {
    return normalized;
  }

  if (typeof initialValues?.coverUrl === 'string' && initialValues.coverUrl.trim()) {
    return [{ imageUrl: initialValues.coverUrl.trim(), isCover: true, sortOrder: 0 }];
  }

  return [];
};

const extractAddressMetadata = (geoObject) => {
  const components = geoObject?.properties?.get?.('metaDataProperty.GeocoderMetaData.Address.Components') || [];
  const pick = (kinds) => components.find((component) => kinds.includes(component.kind))?.name || '';

  const cityName = pick(['locality', 'province', 'area']);
  const region = pick(['province', 'area']);
  const country = pick(['country']);

  return { cityName, region, country };
};

const EventFormContent = ({
  initialValues,
  categories = [],
  isSubmitting = false,
  submitLabel = 'Сохранить',
  errorMessage = '',
  onSubmit
}) => {
  const ymaps = useYMaps(['SuggestView', 'geocode']);
  const addressInputRef = useRef(null);
  const suggestViewRef = useRef(null);

  const mergedInitialValues = useMemo(
    () => ({
      ...DEFAULT_VALUES,
      ...initialValues,
      categoryIds: Array.isArray(initialValues?.categoryIds) ? initialValues.categoryIds : [],
      eventImages: withLegacyCover(initialValues),
      venueLatitude: toNumberOrNull(initialValues?.venueLatitude ?? initialValues?.venue?.latitude),
      venueLongitude: toNumberOrNull(initialValues?.venueLongitude ?? initialValues?.venue?.longitude),
      venueAddress: initialValues?.venueAddress || initialValues?.venue?.address || '',
      venueCityId: toNumberOrNull(initialValues?.venueCityId ?? initialValues?.venue?.cityId),
      venueCityName: initialValues?.venueCityName || initialValues?.venue?.cityName || '',
      venueRegion: initialValues?.venueRegion || '',
      venueCountry: initialValues?.venueCountry || ''
    }),
    [initialValues]
  );

  const [formData, setFormData] = useState(mergedInitialValues);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadMessage, setUploadMessage] = useState('');
  const [locationError, setLocationError] = useState('');
  const [locationMessage, setLocationMessage] = useState('');
  const [isResolvingLocation, setIsResolvingLocation] = useState(false);
  const [mapCenter, setMapCenter] = useState(
    mergedInitialValues.venueLatitude !== null && mergedInitialValues.venueLongitude !== null
      ? [mergedInitialValues.venueLatitude, mergedInitialValues.venueLongitude]
      : DEFAULT_MAP_CENTER
  );

  useEffect(() => {
    setFormData(mergedInitialValues);
    setUploadError('');
    setUploadMessage('');
    setLocationError('');
    setLocationMessage('');
    if (mergedInitialValues.venueLatitude !== null && mergedInitialValues.venueLongitude !== null) {
      setMapCenter([mergedInitialValues.venueLatitude, mergedInitialValues.venueLongitude]);
    } else {
      setMapCenter(DEFAULT_MAP_CENTER);
    }
  }, [mergedInitialValues]);

  const resolveCityId = useCallback(async (cityName, region, country) => {
    if (!cityName) {
      return null;
    }

    try {
      const options = await cityService.searchCities({ q: cityName, limit: 25 });
      if (!Array.isArray(options) || options.length === 0) {
        return null;
      }

      const normalizedCityName = cityName.trim().toLowerCase();
      const normalizedRegion = (region || '').trim().toLowerCase();
      const normalizedCountry = (country || '').trim().toLowerCase();

      const exact = options.find((city) => {
        const cityNameMatch = (city.name || '').trim().toLowerCase() === normalizedCityName;
        if (!cityNameMatch) {
          return false;
        }
        if (normalizedRegion && (city.region || '').trim().toLowerCase() !== normalizedRegion) {
          return false;
        }
        if (normalizedCountry && (city.country || '').trim().toLowerCase() !== normalizedCountry) {
          return false;
        }
        return true;
      });

      if (exact?.id) {
        return Number(exact.id);
      }

      const byName = options.find((city) => (city.name || '').trim().toLowerCase() === normalizedCityName);
      if (byName?.id) {
        return Number(byName.id);
      }

      return options[0]?.id ? Number(options[0].id) : null;
    } catch {
      return null;
    }
  }, []);

  const applyGeoResult = useCallback(async (geoObject, normalizeAddress = true) => {
    const coords = geoObject?.geometry?.getCoordinates?.();
    if (!Array.isArray(coords) || coords.length < 2) {
      return null;
    }

    const [latitude, longitude] = coords;
    const resolvedAddress = geoObject.getAddressLine ? geoObject.getAddressLine() : '';
    const { cityName, region, country } = extractAddressMetadata(geoObject);
    const cityId = await resolveCityId(cityName, region, country);

    setFormData((prev) => ({
      ...prev,
      venueId: null,
      venueAddress: normalizeAddress && resolvedAddress ? resolvedAddress : prev.venueAddress,
      venueLatitude: latitude,
      venueLongitude: longitude,
      venueCityId: cityId,
      venueCityName: cityName || '',
      venueRegion: region || '',
      venueCountry: country || ''
    }));
    setMapCenter([latitude, longitude]);
    setLocationError('');
    setLocationMessage('Место проведения выбрано.');

    return { latitude, longitude, resolvedAddress };
  }, [resolveCityId]);

  const geocodeAddress = useCallback(async (address, normalizeAddress = true) => {
    const normalizedAddress = address?.trim();
    if (!normalizedAddress || !ymaps) {
      return null;
    }

    try {
      setIsResolvingLocation(true);
      const result = await ymaps.geocode(normalizedAddress, { results: 1 });
      const first = result.geoObjects.get(0);
      if (!first) {
        setLocationError('Не удалось определить точку по указанному адресу.');
        return null;
      }
      return await applyGeoResult(first, normalizeAddress);
    } catch {
      setLocationError('Не удалось определить адрес. Попробуйте выбрать вариант из подсказок.');
      return null;
    } finally {
      setIsResolvingLocation(false);
    }
  }, [applyGeoResult, ymaps]);

  const reverseGeocode = useCallback(async (latitude, longitude) => {
    if (!ymaps) {
      return null;
    }

    try {
      setIsResolvingLocation(true);
      const result = await ymaps.geocode([latitude, longitude], { results: 1 });
      const first = result.geoObjects.get(0);
      if (!first) {
        setLocationError('Не удалось определить адрес по выбранной точке.');
        return null;
      }
      return await applyGeoResult(first, true);
    } catch {
      setLocationError('Не удалось определить адрес по выбранной точке.');
      return null;
    } finally {
      setIsResolvingLocation(false);
    }
  }, [applyGeoResult, ymaps]);

  useEffect(() => {
    if (!ymaps || !addressInputRef.current || suggestViewRef.current) {
      return undefined;
    }

    const suggestView = new ymaps.SuggestView(addressInputRef.current, { results: 7 });
    const handleSelect = async (event) => {
      const item = event.get('item');
      const suggestedAddress = item?.value || item?.displayName || '';
      if (!suggestedAddress) {
        return;
      }
      setFormData((prev) => ({ ...prev, venueId: null, venueAddress: suggestedAddress }));
      await geocodeAddress(suggestedAddress, true);
    };

    suggestView.events.add('select', handleSelect);
    suggestViewRef.current = suggestView;

    return () => {
      suggestView.events.remove('select', handleSelect);
      suggestView.destroy();
      suggestViewRef.current = null;
    };
  }, [geocodeAddress, ymaps]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const toggleCategory = (categoryId) => {
    setFormData((prev) => {
      const exists = prev.categoryIds.includes(categoryId);
      return {
        ...prev,
        categoryIds: exists ? prev.categoryIds.filter((id) => id !== categoryId) : [...prev.categoryIds, categoryId]
      };
    });
  };

  const setCoverImage = (targetIndex) => {
    setFormData((prev) => {
      const normalized = prev.eventImages.map((image, index) => ({
        ...image,
        isCover: index === targetIndex
      }));
      return {
        ...prev,
        eventImages: normalized,
        coverUrl: normalized.find((image) => image.isCover)?.imageUrl || ''
      };
    });
  };

  const removeImage = (targetIndex) => {
    setFormData((prev) => {
      const nextImages = prev.eventImages.filter((_, index) => index !== targetIndex);
      const normalized = normalizeImages(nextImages);
      return {
        ...prev,
        eventImages: normalized,
        coverUrl: normalized.find((image) => image.isCover)?.imageUrl || ''
      };
    });
    setUploadMessage('');
    setUploadError('');
  };

  const handleImageUpload = async (event) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) {
      return;
    }

    setUploadError('');
    setUploadMessage('');

    const invalidTypeFile = files.find((file) => !file.type.startsWith('image/'));
    if (invalidTypeFile) {
      setUploadError('Можно загружать только изображения.');
      event.target.value = '';
      return;
    }

    const oversizedFile = files.find((file) => file.size > MAX_IMAGE_SIZE_BYTES);
    if (oversizedFile) {
      setUploadError('Размер каждого изображения не должен превышать 5 МБ.');
      event.target.value = '';
      return;
    }

    try {
      setIsUploadingImage(true);
      const uploadedFiles = await Promise.all(files.map((file) => uploadService.uploadEventImage(file)));
      const uploadedImages = uploadedFiles
        .map((uploaded) => uploaded?.url || uploaded?.relativePath || '')
        .filter(Boolean)
        .map((imageUrl) => ({ imageUrl, isCover: false }));

      if (uploadedImages.length === 0) {
        throw new Error('Не удалось получить ссылки загруженных изображений.');
      }

      setFormData((prev) => {
        const normalized = normalizeImages([...prev.eventImages, ...uploadedImages]);
        return {
          ...prev,
          eventImages: normalized,
          coverUrl: normalized.find((image) => image.isCover)?.imageUrl || ''
        };
      });
      setUploadMessage(`Загружено изображений: ${uploadedImages.length}.`);
    } catch (err) {
      setUploadError(toUserErrorMessage(err, 'Не удалось загрузить изображения.'));
    } finally {
      setIsUploadingImage(false);
      event.target.value = '';
    }
  };

  const handleMapClick = async (coords) => {
    if (!Array.isArray(coords) || coords.length < 2) {
      return;
    }
    const [latitude, longitude] = coords;
    setFormData((prev) => ({
      ...prev,
      venueId: null,
      venueLatitude: latitude,
      venueLongitude: longitude
    }));
    setMapCenter([latitude, longitude]);
    await reverseGeocode(latitude, longitude);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLocationError('');

    const venueAddress = formData.venueAddress.trim();
    if (!venueAddress) {
      setLocationError('Введите адрес мероприятия.');
      return;
    }

    let latitude = toNumberOrNull(formData.venueLatitude);
    let longitude = toNumberOrNull(formData.venueLongitude);
    if (latitude === null || longitude === null) {
      const geocoded = await geocodeAddress(venueAddress, false);
      if (!geocoded) {
        setLocationError('Выберите адрес из подсказок или укажите точку на карте.');
        return;
      }
      latitude = geocoded.latitude;
      longitude = geocoded.longitude;
    }

    const normalizedImages = normalizeImages(formData.eventImages).map((image, index) => ({
      imageUrl: image.imageUrl,
      isCover: image.isCover,
      sortOrder: index
    }));
    const coverImageUrl = normalizedImages.find((image) => image.isCover)?.imageUrl || '';

    onSubmit({
      title: formData.title.trim(),
      shortDescription: formData.shortDescription.trim(),
      fullDescription: formData.fullDescription.trim(),
      ageRating: Number(formData.ageRating),
      coverUrl: coverImageUrl,
      eventImages: normalizedImages,
      venueId: formData.venueId ? Number(formData.venueId) : null,
      venueAddress,
      venueLatitude: latitude,
      venueLongitude: longitude,
      venueCityId: formData.venueCityId ? Number(formData.venueCityId) : null,
      venueCityName: formData.venueCityName || null,
      venueRegion: formData.venueRegion || null,
      venueCountry: formData.venueCountry || null,
      categoryIds: formData.categoryIds
    });
  };

  const markerCoordinates = useMemo(() => {
    const lat = toNumberOrNull(formData.venueLatitude);
    const lon = toNumberOrNull(formData.venueLongitude);
    if (lat === null || lon === null) {
      return null;
    }
    return [lat, lon];
  }, [formData.venueLatitude, formData.venueLongitude]);

  return (
    <form className="panel form" onSubmit={handleSubmit}>
      <label>
        Название
        <input name="title" value={formData.title} onChange={handleChange} required />
      </label>

      <label>
        Краткое описание
        <input name="shortDescription" value={formData.shortDescription} onChange={handleChange} required />
      </label>

      <label>
        Полное описание
        <textarea name="fullDescription" value={formData.fullDescription} onChange={handleChange} rows={5} />
      </label>

      <label>
        Возрастное ограничение
        <input
          type="number"
          name="ageRating"
          min="0"
          max="21"
          value={formData.ageRating}
          onChange={handleChange}
          required
        />
      </label>

      <div className="event-location">
        <label>
          Адрес проведения
          <input
            ref={addressInputRef}
            name="venueAddress"
            value={formData.venueAddress}
            onChange={(event) => {
              const nextValue = event.target.value;
              setFormData((prev) => ({
                ...prev,
                venueId: null,
                venueAddress: nextValue,
                venueLatitude: null,
                venueLongitude: null,
                venueCityId: null,
                venueCityName: '',
                venueRegion: '',
                venueCountry: ''
              }));
              setLocationError('');
              setLocationMessage('');
            }}
            onBlur={() => {
              if (formData.venueAddress.trim() && !markerCoordinates) {
                void geocodeAddress(formData.venueAddress, true);
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

        <p className="muted">Карта активна всегда: выберите адрес из подсказок или кликните на карту.</p>

        <div className="event-location__map-wrap">
          <Map
            state={{
              center: markerCoordinates || mapCenter,
              zoom: markerCoordinates ? 15 : 10,
              controls: ['zoomControl']
            }}
            width="100%"
            height={320}
            className="event-location__map"
            onClick={(event) => {
              const coords = event.get('coords');
              void handleMapClick(coords);
            }}
          >
            {markerCoordinates && (
              <Placemark
                geometry={markerCoordinates}
                properties={{
                  balloonContentHeader: formData.title || 'Мероприятие',
                  balloonContentBody: formData.venueAddress || 'Адрес не указан'
                }}
                options={{
                  preset: 'islands#dotIcon',
                  iconColor: '#111111'
                }}
              />
            )}
          </Map>
        </div>

        {isResolvingLocation && <p className="muted">Определяем адрес и координаты...</p>}
        {locationMessage && (
          <AlertMessage
            type="success"
            message={locationMessage}
            autoHideMs={2400}
            onClose={() => setLocationMessage('')}
          />
        )}
        {locationError && <AlertMessage type="error" message={locationError} onClose={() => setLocationError('')} />}
      </div>

      <div className="event-cover-upload">
        <label>
          Фотографии мероприятия
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageUpload}
            disabled={isSubmitting || isUploadingImage}
          />
        </label>
        <p className="muted">Можно загрузить несколько фото. Поддерживаются JPG, PNG, WEBP, GIF до 5 МБ каждое.</p>

        {isUploadingImage && <AlertMessage type="info" message="Загружаем изображения..." />}
        {uploadError && <AlertMessage type="error" message={uploadError} onClose={() => setUploadError('')} />}
        {uploadMessage && (
          <AlertMessage
            type="success"
            message={uploadMessage}
            autoHideMs={2500}
            onClose={() => setUploadMessage('')}
          />
        )}

        {formData.eventImages.length > 0 ? (
          <div className="event-images-grid">
            {formData.eventImages.map((image, index) => (
              <article key={`${image.imageUrl}-${index}`} className={`event-image-item ${image.isCover ? 'event-image-item--cover' : ''}`}>
                <img src={image.imageUrl} alt={`Изображение ${index + 1}`} className="event-image-item__preview" />
                <div className="event-image-item__actions">
                  <button
                    type="button"
                    className="btn btn--ghost"
                    onClick={() => setCoverImage(index)}
                    disabled={isSubmitting || isUploadingImage || image.isCover}
                  >
                    {image.isCover ? 'Главная обложка' : 'Сделать обложкой'}
                  </button>
                  <button
                    type="button"
                    className="btn btn--danger"
                    onClick={() => removeImage(index)}
                    disabled={isSubmitting || isUploadingImage}
                  >
                    Удалить
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="muted">Фотографии пока не добавлены.</p>
        )}
      </div>

      <div>
        <p className="form-section-title">Категории</p>
        <div className="checkbox-grid">
          {categories.map((category) => (
            <label key={category.id} className="checkbox-label">
              <input
                type="checkbox"
                checked={formData.categoryIds.includes(category.id)}
                onChange={() => toggleCategory(category.id)}
              />
              <span>{category.name}</span>
            </label>
          ))}
        </div>
      </div>

      {errorMessage && <AlertMessage type="error" message={errorMessage} />}

      <button className="btn btn--primary" type="submit" disabled={isSubmitting || isUploadingImage || isResolvingLocation}>
        {isSubmitting ? 'Сохраняем...' : submitLabel}
      </button>
    </form>
  );
};

const EventForm = (props) => (
  <YMaps query={buildYandexMapsQuery()}>
    <EventFormContent {...props} />
  </YMaps>
);

export default EventForm;
