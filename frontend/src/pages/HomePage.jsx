import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import EventCard from '../components/EventCard';
import Loader from '../components/Loader';
import AlertMessage from '../components/AlertMessage';
import EmptyState from '../components/EmptyState';
import RecommendedEventsSection from '../components/RecommendedEventsSection';
import { useAuth } from '../context/AuthContext';
import { useCity } from '../context/CityContext';
import { ROLE } from '../utils/roles';
import { eventService } from '../services/eventService';
import { cityService } from '../services/cityService';
import { venueService } from '../services/venueService';
import { userService } from '../services/userService';
import { toUserErrorMessage } from '../utils/errorMessages';
import AppIcon from '../components/AppIcon';

const FALLBACK_USER_COUNT = 1200;

const BENEFITS = [
  {
    icon: 'search',
    title: 'Удобный поиск мероприятий',
    description: 'Смотрите афишу по городу, категориям и площадкам в одном месте.'
  },
  {
    icon: 'calendar',
    title: 'Регистрация на сеансы',
    description: 'Бронируйте места онлайн за пару кликов без звонков и очередей.'
  },
  {
    icon: 'spark',
    title: 'QR-код для посещения',
    description: 'После записи вы получаете персональный QR-токен для быстрого входа.'
  },
  {
    icon: 'heart',
    title: 'Избранное и отзывы',
    description: 'Сохраняйте интересные события и делитесь впечатлениями после посещения.'
  }
];

const HomePage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, hasRole } = useAuth();
  const { selectedCityId, selectedCity } = useCity();
  const isAdmin = useMemo(() => hasRole([ROLE.ADMIN]), [hasRole]);

  const [events, setEvents] = useState([]);
  const [recommendedEvents, setRecommendedEvents] = useState([]);
  const [stats, setStats] = useState({
    eventsCount: 0,
    citiesCount: 0,
    venuesCount: 0,
    usersCount: FALLBACK_USER_COUNT
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [recommendationsError, setRecommendationsError] = useState('');

  const [subscriptionEmail, setSubscriptionEmail] = useState('');
  const [subscriptionMessage, setSubscriptionMessage] = useState('');
  const [subscriptionError, setSubscriptionError] = useState('');
  const [homeSearch, setHomeSearch] = useState('');

  useEffect(() => {
    const loadHomeData = async () => {
      try {
        setIsLoading(true);
        setError('');
        setRecommendationsError('');

        const [eventsResult, recommendationsResult, citiesResult, venuesResult, usersResult] = await Promise.allSettled([
          eventService.getEvents({ cityId: selectedCityId || undefined }),
          eventService.getRecommendations({ cityId: selectedCityId || undefined, limit: 3 }),
          cityService.getCities(),
          venueService.getVenues(),
          isAuthenticated && isAdmin ? userService.getAdminUsers() : Promise.resolve(null)
        ]);

        const loadedEvents = eventsResult.status === 'fulfilled' && Array.isArray(eventsResult.value) ? eventsResult.value : [];
        const loadedRecommendations =
          recommendationsResult.status === 'fulfilled' && Array.isArray(recommendationsResult.value)
            ? recommendationsResult.value
            : [];
        const loadedCities = citiesResult.status === 'fulfilled' && Array.isArray(citiesResult.value) ? citiesResult.value : [];
        const loadedVenues = venuesResult.status === 'fulfilled' && Array.isArray(venuesResult.value) ? venuesResult.value : [];
        if (eventsResult.status === 'rejected') {
          setError(toUserErrorMessage(eventsResult.reason, 'Не удалось загрузить список мероприятий.'));
        }
        if (recommendationsResult.status === 'rejected') {
          setRecommendationsError(toUserErrorMessage(recommendationsResult.reason, 'Не удалось загрузить рекомендации.'));
        } else {
          setRecommendationsError('');
        }

        let usersCount = FALLBACK_USER_COUNT;
        if (usersResult.status === 'fulfilled' && Array.isArray(usersResult.value)) {
          usersCount = usersResult.value.length;
        }

        setEvents(loadedEvents);
        setRecommendedEvents(loadedRecommendations);
        setStats({
          eventsCount: loadedEvents.length,
          citiesCount: loadedCities.length,
          venuesCount: loadedVenues.length,
          usersCount
        });
      } catch (err) {
        setError(toUserErrorMessage(err, 'Не удалось загрузить данные главной страницы.'));
      } finally {
        setIsLoading(false);
      }
    };

    loadHomeData();
  }, [isAuthenticated, isAdmin, selectedCityId]);

  const upcomingEvents = useMemo(() => events.slice(0, 4), [events]);
  const featuredEvents = useMemo(() => events.slice(0, 3), [events]);

  const handleSubscribe = (event) => {
    event.preventDefault();
    setSubscriptionMessage('');
    setSubscriptionError('');

    const email = subscriptionEmail.trim();
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
      setSubscriptionError('Введите корректный email.');
      return;
    }

    setSubscriptionMessage('Функция подписки будет подключена.');
    setSubscriptionEmail('');
  };

  const handleHomeSearch = (event) => {
    event.preventDefault();
    const query = homeSearch.trim();
    navigate(query ? `/events?title=${encodeURIComponent(query)}` : '/events');
  };

  return (
    <div className="home-page">
      <section className="home-hero">
        <div className="container home-hero__inner">
          <div className="home-hero__content">
            <p className="home-hero__eyebrow">Культурная афиша малого города</p>
            <h1>Фестивали, спектакли и городские события рядом с вами</h1>
            <p>
              Объединяем жителей, организаторов и площадки в одной платформе, чтобы культурная жизнь города
              была насыщенной, доступной и современной.
            </p>
            {selectedCity && (
              <p className="home-hero__city-note">
                Сейчас показываем афишу города: <strong>{selectedCity.name}</strong>
              </p>
            )}

            <form className="home-quick-search" onSubmit={handleHomeSearch}>
              <input
                type="search"
                value={homeSearch}
                onChange={(event) => setHomeSearch(event.target.value)}
                placeholder="Найти мероприятие по названию"
              />
              <button type="submit" className="btn btn--primary">
                <AppIcon name="search" size={15} />
                Найти
              </button>
            </form>

            <div className="home-actions">
              {!isAuthenticated ? (
                <>
                  <Link to="/register" className="btn btn--primary">
                    <AppIcon name="user" size={15} />
                    Зарегистрироваться
                  </Link>
                  <Link to="/login" className="btn btn--ghost">
                    <AppIcon name="profile" size={15} />
                    Войти
                  </Link>
                </>
              ) : (
                <>
                  <Link to="/events" className="btn btn--primary">
                    <AppIcon name="calendar" size={15} />
                    Мероприятия
                  </Link>
                  <Link to="/my-registrations" className="btn btn--ghost">
                    <AppIcon name="clock" size={15} />
                    Мои регистрации
                  </Link>
                  <Link to="/profile" className="btn btn--ghost">
                    <AppIcon name="profile" size={15} />
                    Личный кабинет
                  </Link>
                </>
              )}
            </div>
          </div>

          <div className="home-hero__visual" aria-hidden="true">
            <div className="hero-orbit hero-orbit--big" />
            <div className="hero-orbit hero-orbit--small" />
            <div className="hero-card">
              <p className="hero-card__label">Ближайший фестиваль</p>
              <p className="hero-card__title">{upcomingEvents[0]?.title || 'Музыкальный вечер в центре города'}</p>
              <p className="hero-card__meta">Смотрите полную программу в разделе мероприятий</p>
            </div>
          </div>
        </div>
      </section>

      <section className="container home-section">
        <h2>Город в цифрах</h2>
        {isLoading && <Loader text="Загружаем статистику..." />}
        {error && <AlertMessage type="error" message={error} onClose={() => setError('')} />}
        {!isLoading && (
          <div className="home-stats">
            <article className="home-stat-card">
              <p className="home-stat-card__value">{stats.eventsCount}</p>
              <p className="home-stat-card__label">Мероприятий</p>
            </article>
            <article className="home-stat-card">
              <p className="home-stat-card__value">{stats.citiesCount}</p>
              <p className="home-stat-card__label">Городов</p>
            </article>
            <article className="home-stat-card">
              <p className="home-stat-card__value">{stats.venuesCount}</p>
              <p className="home-stat-card__label">Площадок</p>
            </article>
            <article className="home-stat-card">
              <p className="home-stat-card__value">{stats.usersCount}</p>
              <p className="home-stat-card__label">Пользователей</p>
            </article>
          </div>
        )}
      </section>

      <section className="container home-section">
        <h2>Почему это удобно</h2>
        <div className="home-benefits">
          {BENEFITS.map((benefit) => (
            <article key={benefit.title} className="home-benefit-item">
              <span className="home-benefit-item__icon">
                <AppIcon name={benefit.icon} size={18} />
              </span>
              <h3>{benefit.title}</h3>
              <p>{benefit.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="container home-section">
        <RecommendedEventsSection
          title="Рекомендуем вам"
          events={recommendedEvents}
          isLoading={isLoading}
          error={recommendationsError}
          onCloseError={() => setRecommendationsError('')}
          emptyMessage="Пока нет рекомендаций для вашего города."
        />
      </section>

      <section className="container home-section">
        <div className="page-header-row">
          <h2>Ближайшие мероприятия</h2>
          <Link to="/events" className="btn btn--ghost">
            Вся афиша
          </Link>
        </div>

        {isLoading && <Loader text="Загружаем мероприятия..." />}
        {!isLoading && featuredEvents.length === 0 && <EmptyState message="Пока нет мероприятий для показа." />}
        {!isLoading && featuredEvents.length > 0 && (
          <div className="event-list">
            {featuredEvents.map((event) => (
              <EventCard key={event.id} event={event} layout="list" />
            ))}
          </div>
        )}
      </section>

      <section className="container home-section">
        <div className="home-subscribe">
          <div>
            <h2>Подписка на новости</h2>
            <p>Оставьте email и первыми узнавайте о новых фестивалях, премьерах и городских праздниках.</p>
          </div>

          <form className="home-subscribe__form" onSubmit={handleSubscribe}>
            <input
              type="email"
              placeholder="Введите ваш email"
              value={subscriptionEmail}
              onChange={(event) => setSubscriptionEmail(event.target.value)}
              required
            />
            <button className="btn btn--primary" type="submit">
              Подписаться
            </button>
          </form>

          {subscriptionError && (
            <AlertMessage type="error" message={subscriptionError} onClose={() => setSubscriptionError('')} />
          )}
          {subscriptionMessage && (
            <AlertMessage
              type="success"
              message={subscriptionMessage}
              autoHideMs={3000}
              onClose={() => setSubscriptionMessage('')}
            />
          )}
        </div>
      </section>
    </div>
  );
};

export default HomePage;
