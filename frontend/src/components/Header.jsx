import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ROLE } from '../utils/roles';

const Header = () => {
  const { isAuthenticated, user, logout, hasRole } = useAuth();
  const navigate = useNavigate();

  const onLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="app-header">
      <div className="container app-header__inner">
        <Link to="/" className="logo">
          Фестиваль
        </Link>

        <nav className="nav-links">
          <NavLink to="/">Главная</NavLink>
          <NavLink to="/events">Мероприятия</NavLink>
          <NavLink to="/favorites">Избранное</NavLink>
          <NavLink to="/profile">Профиль</NavLink>
          {hasRole([ROLE.ORGANIZER, ROLE.ADMIN]) && <NavLink to="/organizer">Организатор</NavLink>}
          {hasRole([ROLE.ADMIN]) && <NavLink to="/admin">Админ</NavLink>}
        </nav>

        <div className="auth-actions">
          {isAuthenticated ? (
            <>
              <span className="auth-user">{user?.login}</span>
              <button onClick={onLogout} className="btn btn--ghost" type="button">
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
