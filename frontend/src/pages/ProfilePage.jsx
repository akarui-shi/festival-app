import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { formatRole } from '../utils/formatters';
import Loader from '../components/Loader';
import AlertMessage from '../components/AlertMessage';
import { toUserErrorMessage } from '../utils/errorMessages';
import { useNotification } from '../context/NotificationContext';

const ProfilePage = () => {
  const { currentUser, refreshCurrentUser } = useAuth();
  const { notifySuccess, notifyError } = useNotification();
  const [profile, setProfile] = useState(currentUser);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadProfile = useCallback(
    async (withLoader = true, withSuccessNotice = false) => {
      try {
        if (withLoader) {
          setIsLoading(true);
        } else {
          setIsRefreshing(true);
        }
        setError('');
        const response = await refreshCurrentUser();
        setProfile(response);
        if (withSuccessNotice) {
          notifySuccess('Данные профиля успешно обновлены.');
        }
      } catch (err) {
        const message = toUserErrorMessage(err, 'Не удалось загрузить профиль.');
        setError(message);
        notifyError(message);
      } finally {
        if (withLoader) {
          setIsLoading(false);
        } else {
          setIsRefreshing(false);
        }
      }
    },
    [notifyError, notifySuccess, refreshCurrentUser]
  );

  useEffect(() => {
    void loadProfile(true, false);
  }, [loadProfile]);

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
      <div className="page-header-row">
        <h1>Профиль</h1>
        <button
          type="button"
          className="btn btn--ghost"
          onClick={() => loadProfile(false, true)}
          disabled={isRefreshing}
        >
          {isRefreshing ? 'Обновляем...' : 'Обновить данные'}
        </button>
      </div>
      <div className="panel">
        <p><strong>Логин:</strong> {profile?.login || '-'}</p>
        <p><strong>Электронная почта:</strong> {profile?.email || '-'}</p>
        <p><strong>Имя:</strong> {profile?.firstName || '-'}</p>
        <p><strong>Фамилия:</strong> {profile?.lastName || '-'}</p>
        <p><strong>Телефон:</strong> {profile?.phone || '-'}</p>
        <p><strong>Роли:</strong> {(profile?.roles || []).map(formatRole).join(', ') || '-'}</p>
      </div>
    </section>
  );
};

export default ProfilePage;
