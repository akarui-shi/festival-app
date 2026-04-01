import { useEffect, useMemo, useState } from 'react';
import ErrorMessage from './ErrorMessage';
import { uploadService } from '../services/uploadService';
import { toUserErrorMessage } from '../utils/errorMessages';

const DEFAULT_VALUES = {
  title: '',
  shortDescription: '',
  fullDescription: '',
  ageRating: 0,
  coverUrl: '',
  venueId: '',
  categoryIds: [],
  eventImages: []
};

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

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

const EventForm = ({
  initialValues,
  categories = [],
  venues = [],
  isSubmitting = false,
  submitLabel = 'Сохранить',
  errorMessage = '',
  onSubmit
}) => {
  const mergedInitialValues = useMemo(
    () => ({
      ...DEFAULT_VALUES,
      ...initialValues,
      categoryIds: Array.isArray(initialValues?.categoryIds) ? initialValues.categoryIds : [],
      eventImages: withLegacyCover(initialValues)
    }),
    [initialValues]
  );

  const [formData, setFormData] = useState(mergedInitialValues);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadMessage, setUploadMessage] = useState('');

  useEffect(() => {
    setFormData(mergedInitialValues);
    setUploadError('');
    setUploadMessage('');
  }, [mergedInitialValues]);

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

  const handleSubmit = (event) => {
    event.preventDefault();
    if (isUploadingImage) {
      return;
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
      venueId: Number(formData.venueId),
      categoryIds: formData.categoryIds
    });
  };

  const handleFileUpload = async (event) => {
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

      <label>
        Площадка проведения
        <select name="venueId" value={formData.venueId} onChange={handleChange} required>
          <option value="">Выберите площадку</option>
          {venues.map((venue) => (
            <option key={venue.id} value={venue.id}>
              {venue.name} {venue.cityName ? `(${venue.cityName})` : ''}
            </option>
          ))}
        </select>
      </label>

      <div className="event-cover-upload">
        <label>
          Фотографии мероприятия
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileUpload}
            disabled={isSubmitting || isUploadingImage}
          />
        </label>
        <p className="muted">Можно загрузить несколько фото. Поддерживаются JPG, PNG, WEBP, GIF до 5 МБ каждое.</p>

        {isUploadingImage && <p className="page-note">Загружаем изображения...</p>}
        {uploadError && <ErrorMessage message={uploadError} />}
        {uploadMessage && <p className="page-note page-note--success">{uploadMessage}</p>}

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

      {errorMessage && <ErrorMessage message={errorMessage} />}

      <button className="btn btn--primary" type="submit" disabled={isSubmitting || isUploadingImage}>
        {isSubmitting ? 'Сохраняем...' : submitLabel}
      </button>
    </form>
  );
};

export default EventForm;
