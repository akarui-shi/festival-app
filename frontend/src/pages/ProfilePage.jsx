import { useAuth } from '../context/AuthContext';
import { formatRole } from '../utils/formatters';

const ProfilePage = () => {
  const { user } = useAuth();

  return (
    <section className="container page">
      <h1>Профиль</h1>
      <div className="panel">
        <p><strong>Логин:</strong> {user?.login}</p>
        <p><strong>Электронная почта:</strong> {user?.email}</p>
        <p><strong>Имя:</strong> {user?.firstName || '-'}</p>
        <p><strong>Фамилия:</strong> {user?.lastName || '-'}</p>
        <p><strong>Телефон:</strong> {user?.phone || '-'}</p>
        <p><strong>Роли:</strong> {(user?.roles || []).map(formatRole).join(', ') || '-'}</p>
      </div>
    </section>
  );
};

export default ProfilePage;
