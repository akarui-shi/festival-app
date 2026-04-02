import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Loader from '../components/Loader';
import AlertMessage from '../components/AlertMessage';
import { publicationService } from '../services/publicationService';
import { organizerService } from '../services/organizerService';
import { uploadService } from '../services/uploadService';
import { useAuth } from '../context/AuthContext';
import { ROLE } from '../utils/roles';
import { toUserErrorMessage } from '../utils/errorMessages';
import { useNotification } from '../context/NotificationContext';

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result?.toString() || '');
    reader.onerror = () => reject(new Error('Не удалось прочитать файл.'));
    reader.readAsDataURL(file);
  });

const PublicationCreatePage = () => {
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const { notifySuccess, notifyError } = useNotification();

  const isAdmin = hasRole([ROLE.ADMIN]);
  const isOrganizer = hasRole([ROLE.ORGANIZER]);
  const canCreatePublication = isOrganizer && !isAdmin;
  const organizerMustChooseEvent = isOrganizer && !isAdmin;

  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    imageUrl: '',
    eventId: ''
  });
  const [previewUrl, setPreviewUrl] = useState('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadMessage, setUploadMessage] = useState('');

  useEffect(() => {
    if (!canCreatePublication) {
      setIsLoading(false);
      return;
    }

    const loadEvents = async () => {
      try {
        setIsLoading(true);
        setError('');
        const data = await organizerService.getMyEvents();
        setEvents(Array.isArray(data) ? data : []);
      } catch (err) {
        const message = toUserErrorMessage(err, 'Не удалось загрузить мероприятия для выбора.');
        setError(message);
        notifyError(message);
      } finally {
        setIsLoading(false);
      }
    };

    loadEvents();
  }, [canCreatePublication, notifyError]);

  const canSubmit = useMemo(() => {
    if (!formData.title.trim() || !formData.content.trim()) {
      return false;
    }
    if (organizerMustChooseEvent && !formData.eventId) {
      return false;
    }
    return true;
  }, [formData.title, formData.content, formData.eventId, organizerMustChooseEvent]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      setIsSubmitting(true);
      setError('');

      const payload = {
        title: formData.title.trim(),
        content: formData.content.trim(),
        imageUrl: formData.imageUrl || null,
        eventId: formData.eventId ? Number(formData.eventId) : null
      };

      await publicationService.createPublication(payload);
      notifySuccess('Публикация отправлена на модерацию. После одобрения она станет видимой всем пользователям.');
      navigate('/publications');
    } catch (err) {
      const message = toUserErrorMessage(err, 'Не удалось создать публикацию.');
      setError(message);
      notifyError(message);
    } finally {
      setIsSubmitting(false);
    }
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
      // Local preview is optional.
    }

    try {
      setIsUploadingImage(true);
      const uploaded = await uploadService.uploadPublicationImage(file);
      const uploadedUrl = uploaded?.url || uploaded?.relativePath || '';
      if (!uploadedUrl) {
        throw new Error('Не удалось получить адрес загруженного изображения.');
      }

      setFormData((prev) => ({ ...prev, imageUrl: uploadedUrl }));
      setPreviewUrl(uploadedUrl);
      setUploadMessage('Изображение публикации загружено.');
    } catch (err) {
      const message = toUserErrorMessage(err, 'Не удалось загрузить изображение публикации.');
      setUploadError(message);
      notifyError(message);
    } finally {
      setIsUploadingImage(false);
      event.target.value = '';
    }
  };

  const clearImage = () => {
    setFormData((prev) => ({ ...prev, imageUrl: '' }));
    setPreviewUrl('');
    setUploadMessage('');
    setUploadError('');
  };

  if (isLoading) {
    return (
      <section className="container page">
        <Loader text="Загружаем форму публикации..." />
      </section>
    );
  }

  if (!canCreatePublication) {
    return (
      <section className="container page">
        <AlertMessage type="error" message="Администратор не может создавать публикации." />
      </section>
    );
  }

  return (
    <section className="container page">
      <h1>Создать публикацию</h1>
      <p className="page-subtitle">Добавьте новость или статью, связанную с мероприятием.</p>

      {error && <AlertMessage type="error" message={error} onClose={() => setError('')} />}

      <form className="panel form" onSubmit={handleSubmit}>
        <label>
          Заголовок
          <input
            type="text"
            value={formData.title}
            onChange={(event) => setFormData((prev) => ({ ...prev, title: event.target.value }))}
            placeholder="Введите заголовок публикации"
            required
          />
        </label>

        <label>
          Текст публикации
          <textarea
            rows={8}
            value={formData.content}
            onChange={(event) => setFormData((prev) => ({ ...prev, content: event.target.value }))}
            placeholder="Опишите новость, анонс или полезную информацию"
            required
          />
        </label>

        <div className="event-cover-upload">
          <label>
            Изображение публикации
            <input
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              disabled={isSubmitting || isUploadingImage}
            />
          </label>
          <p className="muted">Поддерживаются JPG, PNG, WEBP, GIF до 5 МБ.</p>

          {isUploadingImage && <AlertMessage type="info" message="Загружаем изображение..." />}
          {uploadError && <AlertMessage type="error" message={uploadError} onClose={() => setUploadError('')} />}
          {uploadMessage && <AlertMessage type="success" message={uploadMessage} autoHideMs={2500} onClose={() => setUploadMessage('')} />}

          {previewUrl ? (
            <div className="event-cover-preview-wrap">
              <img src={previewUrl} alt="Превью публикации" className="publication-cover-preview" />
              <div className="inline-actions">
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={clearImage}
                  disabled={isSubmitting || isUploadingImage}
                >
                  Удалить изображение
                </button>
              </div>
            </div>
          ) : (
            <p className="muted">Изображение пока не выбрано.</p>
          )}
        </div>

        <label>
          Мероприятие
          <select
            value={formData.eventId}
            onChange={(event) => setFormData((prev) => ({ ...prev, eventId: event.target.value }))}
            required={organizerMustChooseEvent}
          >
            {!organizerMustChooseEvent && <option value="">Без привязки к мероприятию</option>}
            {events.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title}
              </option>
            ))}
          </select>
        </label>

        {organizerMustChooseEvent && events.length === 0 && (
          <p className="muted">У вас пока нет мероприятий. Сначала создайте мероприятие.</p>
        )}

        <div className="inline-actions">
          <button className="btn btn--primary" type="submit" disabled={!canSubmit || isSubmitting || isUploadingImage}>
            {isSubmitting ? 'Отправляем...' : 'Отправить на модерацию'}
          </button>
          <button type="button" className="btn btn--ghost" onClick={() => navigate('/publications')} disabled={isSubmitting}>
            Отмена
          </button>
        </div>
      </form>
    </section>
  );
};

export default PublicationCreatePage;
