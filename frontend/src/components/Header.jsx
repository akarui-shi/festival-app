import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ROLE } from '../utils/roles';

const Header = () => {
  const { isAuthenticated, currentUser, logout, hasRole } = useAuth();
  const displayName = [currentUser?.firstName, currentUser?.lastName].filter(Boolean).join(' ') || currentUser?.login;

  return (
    <header className="app-header">
      <div className="container app-header__inner">
        <Link to="/" className="logo">
          Фестиваль
        </Link>

        <nav className="nav-links">
          <NavLink to="/">Главная</NavLink>
          <NavLink to="/events">Мероприятия</NavLink>
          {isAuthenticated && <NavLink to="/favorites">Избранное</NavLink>}
          {isAuthenticated && <NavLink to="/my-registrations">Мои регистрации</NavLink>}
          {hasRole([ROLE.ORGANIZER, ROLE.ADMIN]) && <NavLink to="/organizer">Кабинет организатора</NavLink>}
          {hasRole([ROLE.ADMIN]) && <NavLink to="/admin">Админ-панель</NavLink>}
        </nav>

        <div className="auth-actions">
          {isAuthenticated ? (
            <>
              <span className="auth-user">{displayName}</span>
              <Link to="/profile" className="btn btn--ghost">
                Профиль
              </Link>
              <button onClick={logout} className="btn btn--ghost" type="button">
                Выйти
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn--ghost">
                Вход
              </Link>
              <Link to="/register" className="btn btn--primary">
                Регистрация
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
