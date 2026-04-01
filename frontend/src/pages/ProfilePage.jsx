import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { formatRole } from '../utils/formatters';
import Loader from '../components/Loader';
import ErrorMessage from '../components/ErrorMessage';

const ProfilePage = () => {
  const { currentUser, refreshCurrentUser } = useAuth();
  const [profile, setProfile] = useState(currentUser);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    const loadProfile = async () => {
      try {
        setIsLoading(true);
        setError('');
        const response = await refreshCurrentUser();
        if (isMounted) {
          setProfile(response);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Не удалось загрузить профиль.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, [refreshCurrentUser]);

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
        <ErrorMessage message={error} />
      </section>
    );
  }

  return (
    <section className="container page">
      <h1>Профиль</h1>
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
