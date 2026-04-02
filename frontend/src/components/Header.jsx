import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCity } from '../context/CityContext';
import { ROLE } from '../utils/roles';
import SearchableCitySelect from './SearchableCitySelect';
import CitySelector from './CitySelector';
import AppIcon from './AppIcon';
import appIconUrl from '../assets/app-icon.svg';

const Header = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, currentUser, logout, hasRole } = useAuth();
  const {
    selectedCity,
    suggestedCity,
    isLoading: isCityLoading,
    isModalOpen: isCityModalOpen,
    isInitialChoiceRequired,
    modalMode,
    error: cityError,
    saveCity,
    openCityModal,
    closeCityModal,
    switchToSearchMode,
    confirmSuggestedCity
  } = useCity();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const userMenuRef = useRef(null);

  const displayName = [currentUser?.firstName, currentUser?.lastName].filter(Boolean).join(' ') || currentUser?.login;
  const showOrganizer = hasRole([ROLE.ORGANIZER]);
  const showAdmin = hasRole([ROLE.ADMIN]);
  const showResidentOnly = hasRole([ROLE.RESIDENT]) && !showOrganizer && !showAdmin;
  const userInitial = (displayName?.trim()?.[0] || 'U').toUpperCase();
  const suggestedCityMeta = [suggestedCity?.region, suggestedCity?.country]
    .filter(Boolean)
    .join(', ');

  const navLinks = useMemo(
    () => [
      { to: '/', label: 'Главная', icon: 'home' },
      { to: '/events', label: 'Мероприятия', icon: 'calendar' },
      { to: '/publications', label: 'Публикации', icon: 'article' }
    ],
    []
  );

  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsUserMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (location.pathname !== '/events') {
      return;
    }
    const params = new URLSearchParams(location.search);
    setSearchQuery(params.get('title') || '');
  }, [location.pathname, location.search]);

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    const query = searchQuery.trim();
    navigate(query ? `/events?title=${encodeURIComponent(query)}` : '/events');
    setIsMobileMenuOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!userMenuRef.current) {
        return;
      }
      if (!userMenuRef.current.contains(event.target)) {
        setIsUserMenuOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setIsUserMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  return (
    <>
      <header className="app-header">
        <div className="container app-header__inner">
          <div className="header-brand">
            <CitySelector
              selectedCity={selectedCity}
              suggestedCity={suggestedCity}
              isLoading={isCityLoading}
              onClick={() => openCityModal('search')}
            />
            <Link to="/" className="logo">
              <img src={appIconUrl} alt="" className="logo__icon" />
              Фестиваль
            </Link>
          </div>

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
            <div className="header-nav-wrap">
              <nav className="nav-links">
                {navLinks.map((link) => (
                  <NavLink key={link.to} to={link.to}>
                    <AppIcon name={link.icon} size={15} />
                    {link.label}
                  </NavLink>
                ))}
              </nav>
            </div>

            <div className="header-tools">
              <form className="header-search" onSubmit={handleSearchSubmit}>
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Поиск мероприятий"
                  aria-label="Поиск мероприятий"
                />
                <button className="btn btn--primary" type="submit">
                  <AppIcon name="search" size={15} />
                  Найти
                </button>
              </form>

              <div className="auth-actions">
                {isAuthenticated ? (
                  <div className="header-user-menu" ref={userMenuRef}>
                    <button
                      type="button"
                      className="header-user-trigger"
                      aria-haspopup="menu"
                      aria-expanded={isUserMenuOpen}
                      onClick={() => setIsUserMenuOpen((prev) => !prev)}
                    >
                      <span className="header-user-trigger__avatar">{userInitial}</span>
                      <span className="header-user-trigger__label">{displayName}</span>
                      <span className="header-user-trigger__chevron">{isUserMenuOpen ? '▴' : '▾'}</span>
                    </button>

                    {isUserMenuOpen && (
                      <div className="header-user-dropdown" role="menu">
                        <Link to="/profile" className="header-user-dropdown__item" role="menuitem">
                          <AppIcon name="profile" size={15} />
                          Профиль
                        </Link>
                        <Link to="/favorites" className="header-user-dropdown__item" role="menuitem">
                          <AppIcon name="heart" size={15} />
                          Избранные
                        </Link>
                        {showOrganizer && (
                          <Link to="/organizer" className="header-user-dropdown__item" role="menuitem">
                            <AppIcon name="calendar" size={15} />
                            Мои мероприятия
                          </Link>
                        )}
                        {showResidentOnly && (
                          <Link to="/my-registrations" className="header-user-dropdown__item" role="menuitem">
                            <AppIcon name="clock" size={15} />
                            Мои регистрации
                          </Link>
                        )}
                        {showOrganizer && (
                          <Link to="/publications" className="header-user-dropdown__item" role="menuitem">
                            <AppIcon name="article" size={15} />
                            Мои публикации
                          </Link>
                        )}
                        {showAdmin && (
                          <Link to="/admin" className="header-user-dropdown__item" role="menuitem">
                            <AppIcon name="admin" size={15} />
                            Админ-панель
                          </Link>
                        )}
                        <button
                          className="header-user-dropdown__item header-user-dropdown__item--danger"
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            setIsMobileMenuOpen(false);
                            setIsUserMenuOpen(false);
                            logout();
                          }}
                        >
                          <AppIcon name="logout" size={15} />
                          Выйти
                        </button>
                      </div>
                    )}
                  </div>
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
        </div>
      </header>

      {isCityModalOpen && (
        <div className="modal-backdrop">
          <div className="modal city-modal">
            <h3>Выбор города</h3>

            {modalMode === 'confirm' && suggestedCity && (
              <div className="city-modal__confirm">
                <p>
                  Ваш город — <strong>{suggestedCity.name}</strong>. Верно?
                </p>
                {suggestedCityMeta && <p className="muted">{suggestedCityMeta}</p>}
              </div>
            )}

            {modalMode === 'search' && (
              <div className="city-modal__search">
                <p className="muted">
                  Выберите город. Этот выбор станет основным для всего приложения.
                </p>
                <SearchableCitySelect
                  label="Город"
                  placeholder="Начните вводить название города"
                  selectedCity={null}
                  onSelect={(city) => saveCity(city)}
                  onClear={() => {}}
                />
              </div>
            )}

            {cityError && <p className="error-message">{cityError}</p>}

            <div className="modal__actions">
              {modalMode === 'confirm' && (
                <>
                  <button type="button" className="btn btn--primary" onClick={confirmSuggestedCity}>
                    Да, верно
                  </button>
                  <button type="button" className="btn btn--ghost" onClick={switchToSearchMode}>
                    Выбрать другой
                  </button>
                </>
              )}
              {modalMode === 'search' && !isInitialChoiceRequired && (
                <button type="button" className="btn btn--ghost" onClick={closeCityModal}>
                  Закрыть
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Header;
