import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { formatRole } from '../utils/formatters';
import Loader from '../components/Loader';
import AlertMessage from '../components/AlertMessage';
import { toUserErrorMessage } from '../utils/errorMessages';
import { useNotification } from '../context/NotificationContext';
import { userService } from '../services/userService';
import { uploadService } from '../services/uploadService';
import { resolveMediaUrl } from '../utils/media';

const MAX_AVATAR_SIZE_BYTES = 5 * 1024 * 1024;

const extractUserPayload = (response) => ({
  user: response?.user || response || null,
  token: response?.token || null
});

const ProfilePage = () => {
  const { currentUser, refreshCurrentUser, applyAuthUpdate } = useAuth();
  const { notifySuccess, notifyError } = useNotification();
  const [profile, setProfile] = useState(currentUser);
  const [formData, setFormData] = useState({
    login: '',
    email: '',
    firstName: '',
    lastName: '',
    phone: '',
    avatarUrl: ''
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const displayName = useMemo(
    () => [formData.firstName, formData.lastName].filter(Boolean).join(' ').trim() || formData.login || 'Пользователь',
    [formData.firstName, formData.lastName, formData.login]
  );
  const avatarFallbackLetter = (displayName[0] || 'U').toUpperCase();
  const resolvedAvatarUrl = resolveMediaUrl(formData.avatarUrl);

  const fillFormFromProfile = useCallback((userData) => {
    setFormData({
      login: userData?.login || '',
      email: userData?.email || '',
      firstName: userData?.firstName || '',
      lastName: userData?.lastName || '',
      phone: userData?.phone || '',
      avatarUrl: userData?.avatarUrl || ''
    });
  }, []);

  const buildProfilePayload = useCallback((source, avatarUrlOverride) => ({
    login: (source?.login || '').trim(),
    email: (source?.email || '').trim(),
    firstName: source?.firstName?.trim() || null,
    lastName: source?.lastName?.trim() || null,
    phone: source?.phone?.trim() || null,
    avatarUrl: avatarUrlOverride !== undefined
      ? avatarUrlOverride
      : (source?.avatarUrl?.trim() || null)
  }), []);

  const loadProfile = useCallback(
    async () => {
      try {
        setIsLoading(true);
        setError('');
        const response = await refreshCurrentUser();
        setProfile(response);
        fillFormFromProfile(response);
      } catch (err) {
        const message = toUserErrorMessage(err, 'Не удалось загрузить профиль.');
        setError(message);
        notifyError(message);
      } finally {
        setIsLoading(false);
      }
    },
    [fillFormFromProfile, notifyError, refreshCurrentUser]
  );

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const handleUploadAvatar = async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      notifyError('Можно загружать только изображения.');
      event.target.value = '';
      return;
    }

    if (file.size > MAX_AVATAR_SIZE_BYTES) {
      notifyError('Размер аватарки не должен превышать 5 МБ.');
      event.target.value = '';
      return;
    }

    try {
      setIsUploadingAvatar(true);
      const uploaded = await uploadService.uploadAvatar(file);
      const uploadedUrl = uploaded?.url || uploaded?.relativePath || '';
      if (!uploadedUrl) {
        throw new Error('Не удалось получить адрес загруженного изображения.');
      }
      const persistedSource = profile || currentUser || formData;
      const response = await userService.updateMyProfile(
        buildProfilePayload(persistedSource, uploadedUrl)
      );
      const { user, token } = extractUserPayload(response);
      setProfile(user);
      fillFormFromProfile(user);
      applyAuthUpdate(user, token);
      notifySuccess('Аватарка успешно загружена.');
    } catch (err) {
      notifyError(toUserErrorMessage(err, 'Не удалось загрузить аватарку.'));
    } finally {
      setIsUploadingAvatar(false);
      event.target.value = '';
    }
  };

  const handleRemoveAvatar = async () => {
    try {
      setIsUploadingAvatar(true);
      setError('');

      const persistedSource = profile || currentUser || formData;
      const response = await userService.updateMyProfile(
        buildProfilePayload(persistedSource, null)
      );
      const { user, token } = extractUserPayload(response);
      setProfile(user);
      fillFormFromProfile(user);
      applyAuthUpdate(user, token);
      notifySuccess('Аватарка удалена.');
    } catch (err) {
      const message = toUserErrorMessage(err, 'Не удалось удалить аватарку.');
      setError(message);
      notifyError(message);
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleSaveProfile = async (event) => {
    event.preventDefault();

    try {
      setIsSaving(true);
      setError('');

      const payload = {
        login: formData.login.trim(),
        email: formData.email.trim(),
        firstName: formData.firstName.trim() || null,
        lastName: formData.lastName.trim() || null,
        phone: formData.phone.trim() || null,
        avatarUrl: formData.avatarUrl.trim() || null
      };

      const response = await userService.updateMyProfile(payload);
      const { user, token } = extractUserPayload(response);
      setProfile(user);
      fillFormFromProfile(user);
      applyAuthUpdate(user, token);
      notifySuccess('Профиль сохранён.');
    } catch (err) {
      const message = toUserErrorMessage(err, 'Не удалось сохранить профиль.');
      setError(message);
      notifyError(message);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <section className="container page">
        <Loader text="Загружаем профиль..." />
      </section>
    );
  }

  if (error) {
    return (
      <section className="container page">
        <AlertMessage type="error" message={error} onClose={() => setError('')} />
      </section>
    );
  }

  return (
    <section className="container page">
      <div className="profile-top">
        <div>
          <h1>Профиль</h1>
          <p className="page-subtitle">Управляйте личными данными и аватаркой аккаунта.</p>
        </div>
      </div>

      <div className="profile-layout">
        <div className="panel profile-avatar-card">
          <h2 className="profile-section-title profile-section-title--center">Аватар</h2>
          <div className="profile-avatar-main">
            <div className="profile-avatar-preview">
              {resolvedAvatarUrl ? (
                <img src={resolvedAvatarUrl} alt={displayName} />
              ) : (
                <span>{avatarFallbackLetter}</span>
              )}
            </div>
            <p className="profile-avatar-name">{displayName}</p>
            <p className="muted profile-avatar-login">@{formData.login || '-'}</p>
          </div>
          <label className="btn btn--ghost">
            {isUploadingAvatar ? 'Загружаем...' : 'Загрузить аватарку'}
            <input
              type="file"
              accept="image/*"
              onChange={handleUploadAvatar}
              disabled={isUploadingAvatar || isSaving}
              style={{ display: 'none' }}
            />
          </label>
          {formData.avatarUrl && (
            <button
              type="button"
              className="btn btn--ghost"
              onClick={handleRemoveAvatar}
              disabled={isSaving || isUploadingAvatar}
            >
              {isUploadingAvatar ? 'Удаляем...' : 'Удалить аватарку'}
            </button>
          )}
          <p className="muted">Поддерживаются JPG, PNG, WEBP, GIF до 5 МБ.</p>
        </div>

        <form className="panel form profile-form-card" onSubmit={handleSaveProfile}>
          <h2 className="profile-section-title">Личные данные</h2>
          <div className="profile-form-grid">
            <label className="profile-field--full">
              Логин
              <input
                type="text"
                value={formData.login}
                onChange={(event) => setFormData((prev) => ({ ...prev, login: event.target.value }))}
                required
              />
            </label>

            <label className="profile-field--full">
              Электронная почта
              <input
                type="email"
                value={formData.email}
                onChange={(event) => setFormData((prev) => ({ ...prev, email: event.target.value }))}
                required
              />
            </label>

            <label>
              Имя
              <input
                type="text"
                value={formData.firstName}
                onChange={(event) => setFormData((prev) => ({ ...prev, firstName: event.target.value }))}
              />
            </label>

            <label>
              Фамилия
              <input
                type="text"
                value={formData.lastName}
                onChange={(event) => setFormData((prev) => ({ ...prev, lastName: event.target.value }))}
              />
            </label>

            <label className="profile-field--full">
              Телефон
              <input
                type="text"
                value={formData.phone}
                onChange={(event) => setFormData((prev) => ({ ...prev, phone: event.target.value }))}
              />
            </label>
          </div>

          <div className="profile-roles">
            {(profile?.roles || []).map((role) => (
              <span key={role} className="chip">
                {formatRole(role)}
              </span>
            ))}
            {(profile?.roles || []).length === 0 && <span>-</span>}
          </div>

          <div className="inline-actions">
            <button type="submit" className="btn btn--primary" disabled={isSaving || isUploadingAvatar}>
              {isSaving ? 'Сохраняем...' : 'Сохранить профиль'}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
};

export default ProfilePage;
