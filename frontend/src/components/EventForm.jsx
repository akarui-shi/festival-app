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
  categoryIds: []
};

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result?.toString() || '');
    reader.onerror = () => reject(new Error('Не удалось прочитать файл.'));
    reader.readAsDataURL(file);
  });

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
      categoryIds: Array.isArray(initialValues?.categoryIds) ? initialValues.categoryIds : []
    }),
    [initialValues]
  );

  const [formData, setFormData] = useState(mergedInitialValues);
  const [previewUrl, setPreviewUrl] = useState(mergedInitialValues.coverUrl || '');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadMessage, setUploadMessage] = useState('');

  useEffect(() => {
    setFormData(mergedInitialValues);
    setPreviewUrl(mergedInitialValues.coverUrl || '');
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

  const handleSubmit = (event) => {
    event.preventDefault();
    if (isUploadingImage) {
      return;
    }

    onSubmit({
      title: formData.title.trim(),
      shortDescription: formData.shortDescription.trim(),
      fullDescription: formData.fullDescription.trim(),
      ageRating: Number(formData.ageRating),
      coverUrl: formData.coverUrl.trim(),
      venueId: Number(formData.venueId),
      categoryIds: formData.categoryIds
    });
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setUploadError('');
    setUploadMessage('');

    if (!file.type.startsWith('image/')) {
      setUploadError('Можно загружать только изображения.');
      event.target.value = '';
      return;
    }

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      setUploadError('Размер изображения не должен превышать 5 МБ.');
      event.target.value = '';
      return;
    }

    try {
      const localPreview = await readFileAsDataUrl(file);
      if (localPreview) {
        setPreviewUrl(localPreview);
      }
    } catch {
      // Local preview is optional, continue with upload.
    }

    try {
      setIsUploadingImage(true);
      const uploaded = await uploadService.uploadEventCover(file);
      const uploadedUrl = uploaded?.url || uploaded?.relativePath || '';

      if (!uploadedUrl) {
        throw new Error('Не удалось получить адрес загруженного изображения.');
      }

      setFormData((prev) => ({ ...prev, coverUrl: uploadedUrl }));
      setPreviewUrl(uploadedUrl);
      setUploadMessage('Изображение успешно загружено.');
    } catch (err) {
      setUploadError(toUserErrorMessage(err, 'Не удалось загрузить изображение.'));
    } finally {
      setIsUploadingImage(false);
      event.target.value = '';
    }
  };

  const clearCover = () => {
    setFormData((prev) => ({ ...prev, coverUrl: '' }));
    setPreviewUrl('');
    setUploadMessage('');
    setUploadError('');
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
          Обложка мероприятия
          <input
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            disabled={isSubmitting || isUploadingImage}
          />
        </label>
        <p className="muted">Поддерживаются файлы JPG, PNG, WEBP, GIF до 5 МБ.</p>

        {isUploadingImage && <p className="page-note">Загружаем изображение...</p>}
        {uploadError && <ErrorMessage message={uploadError} />}
        {uploadMessage && <p className="page-note page-note--success">{uploadMessage}</p>}

        {previewUrl ? (
          <div className="event-cover-preview-wrap">
            <img src={previewUrl} alt="Превью обложки" className="event-cover-preview" />
            <div className="inline-actions">
              <button
                type="button"
                className="btn btn--ghost"
                onClick={clearCover}
                disabled={isSubmitting || isUploadingImage}
              >
                Удалить обложку
              </button>
            </div>
          </div>
        ) : (
          <p className="muted">Обложка пока не выбрана.</p>
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
