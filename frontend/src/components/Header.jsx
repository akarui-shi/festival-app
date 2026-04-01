import { useEffect, useMemo, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ROLE } from '../utils/roles';

const Header = () => {
  const location = useLocation();
  const { isAuthenticated, currentUser, logout, hasRole } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const displayName = [currentUser?.firstName, currentUser?.lastName].filter(Boolean).join(' ') || currentUser?.login;
  const showOrganizer = hasRole([ROLE.ORGANIZER]);
  const showAdmin = hasRole([ROLE.ADMIN]);

  const navLinks = useMemo(
    () => [
      { to: '/', label: 'Главная' },
      { to: '/events', label: 'Мероприятия' },
      { to: '/publications', label: 'Публикации' },
      ...(isAuthenticated ? [{ to: '/favorites', label: 'Избранное' }] : []),
      ...(isAuthenticated ? [{ to: '/my-registrations', label: 'Мои регистрации' }] : []),
      ...(showOrganizer ? [{ to: '/organizer', label: 'Кабинет организатора' }] : []),
      ...(showAdmin ? [{ to: '/admin', label: 'Админ-панель' }] : [])
    ],
    [isAuthenticated, showOrganizer, showAdmin]
  );

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  return (
    <header className="app-header">
      <div className="container app-header__inner">
        <Link to="/" className="logo">
          Фестиваль
        </Link>

        <button
          className="header-burger"
          type="button"
          aria-label={isMobileMenuOpen ? 'Закрыть меню' : 'Открыть меню'}
          aria-expanded={isMobileMenuOpen}
          onClick={() => setIsMobileMenuOpen((prev) => !prev)}
        >
          <span />
          <span />
          <span />
        </button>

        <div className={`header-menu ${isMobileMenuOpen ? 'header-menu--open' : ''}`}>
          <nav className="nav-links">
            {navLinks.map((link) => (
              <NavLink key={link.to} to={link.to}>
                {link.label}
              </NavLink>
            ))}
          </nav>

          <div className="auth-actions">
            {isAuthenticated ? (
              <>
                <span className="auth-user">{displayName}</span>
                <Link to="/profile" className="btn btn--ghost">
                  Профиль
                </Link>
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    logout();
                  }}
                  className="btn btn--ghost"
                  type="button"
                >
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
      </div>
    </header>
  );
};

export default Header;
