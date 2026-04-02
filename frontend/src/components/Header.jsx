import { useEffect, useMemo, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCity } from '../context/CityContext';
import { ROLE } from '../utils/roles';
import SearchableCitySelect from './SearchableCitySelect';
import CitySelector from './CitySelector';

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
  const [searchQuery, setSearchQuery] = useState('');

  const displayName = [currentUser?.firstName, currentUser?.lastName].filter(Boolean).join(' ') || currentUser?.login;
  const showOrganizer = hasRole([ROLE.ORGANIZER]);
  const showAdmin = hasRole([ROLE.ADMIN]);
  const suggestedCityMeta = [suggestedCity?.region, suggestedCity?.country]
    .filter(Boolean)
    .join(', ');

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
                  Найти
                </button>
              </form>

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
