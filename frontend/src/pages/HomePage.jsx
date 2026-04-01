import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import EventCard from '../components/EventCard';
import Loader from '../components/Loader';
import ErrorMessage from '../components/ErrorMessage';
import EmptyState from '../components/EmptyState';
import { useAuth } from '../context/AuthContext';
import { ROLE } from '../utils/roles';
import { eventService } from '../services/eventService';
import { cityService } from '../services/cityService';
import { venueService } from '../services/venueService';
import { userService } from '../services/userService';

const FALLBACK_USER_COUNT = 1200;

const BENEFITS = [
  {
    title: 'Удобный поиск мероприятий',
    description: 'Смотрите афишу по городу, категориям и площадкам в одном месте.'
  },
  {
    title: 'Регистрация на сеансы',
    description: 'Бронируйте места онлайн за пару кликов без звонков и очередей.'
  },
  {
    title: 'QR-код для посещения',
    description: 'После записи вы получаете персональный QR-токен для быстрого входа.'
  },
  {
    title: 'Избранное и отзывы',
    description: 'Сохраняйте интересные события и делитесь впечатлениями после посещения.'
  }
];

const HomePage = () => {
  const { isAuthenticated, hasRole } = useAuth();
  const isAdmin = useMemo(() => hasRole([ROLE.ADMIN]), [hasRole]);

  const [events, setEvents] = useState([]);
  const [stats, setStats] = useState({
    eventsCount: 0,
    citiesCount: 0,
    venuesCount: 0,
    usersCount: FALLBACK_USER_COUNT
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [subscriptionEmail, setSubscriptionEmail] = useState('');
  const [subscriptionMessage, setSubscriptionMessage] = useState('');
  const [subscriptionError, setSubscriptionError] = useState('');

  useEffect(() => {
    const loadHomeData = async () => {
      try {
        setIsLoading(true);
        setError('');

        const [eventsResult, citiesResult, venuesResult, usersResult] = await Promise.allSettled([
          eventService.getEvents(),
          cityService.getCities(),
          venueService.getVenues(),
          isAuthenticated && isAdmin ? userService.getAdminUsers() : Promise.resolve(null)
        ]);

        const loadedEvents = eventsResult.status === 'fulfilled' && Array.isArray(eventsResult.value) ? eventsResult.value : [];
        const loadedCities = citiesResult.status === 'fulfilled' && Array.isArray(citiesResult.value) ? citiesResult.value : [];
        const loadedVenues = venuesResult.status === 'fulfilled' && Array.isArray(venuesResult.value) ? venuesResult.value : [];
        if (eventsResult.status === 'rejected') {
          setError(eventsResult.reason?.message || 'Не удалось загрузить список мероприятий.');
        }

        let usersCount = FALLBACK_USER_COUNT;
        if (usersResult.status === 'fulfilled' && Array.isArray(usersResult.value)) {
          usersCount = usersResult.value.length;
        }

        setEvents(loadedEvents);
        setStats({
          eventsCount: loadedEvents.length,
          citiesCount: loadedCities.length,
          venuesCount: loadedVenues.length,
          usersCount
        });
      } catch (err) {
        setError(err.message || 'Не удалось загрузить данные главной страницы.');
      } finally {
        setIsLoading(false);
      }
    };

    loadHomeData();
  }, [isAuthenticated, isAdmin]);

  const upcomingEvents = useMemo(() => events.slice(0, 4), [events]);

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

            <div className="home-actions">
              <Link to="/events" className="btn btn--primary">
                Смотреть мероприятия
              </Link>
              <Link to="/register" className="btn btn--ghost">
                Зарегистрироваться
              </Link>
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
        {error && <ErrorMessage message={error} />}
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
              <h3>{benefit.title}</h3>
              <p>{benefit.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="container home-section">
        <div className="page-header-row">
          <h2>Ближайшие мероприятия</h2>
          <Link to="/events" className="btn btn--ghost">
            Вся афиша
          </Link>
        </div>

        {isLoading && <Loader text="Загружаем мероприятия..." />}
        {!isLoading && upcomingEvents.length === 0 && <EmptyState message="Пока нет мероприятий для показа." />}
        {!isLoading && upcomingEvents.length > 0 && (
          <div className="event-grid">
            {upcomingEvents.map((event) => (
              <EventCard key={event.id} event={event} />
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

          {subscriptionError && <ErrorMessage message={subscriptionError} />}
          {subscriptionMessage && <p className="page-note page-note--success">{subscriptionMessage}</p>}
        </div>
      </section>
    </div>
  );
};

export default HomePage;
