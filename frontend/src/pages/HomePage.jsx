import { Link } from 'react-router-dom';

const HomePage = () => {
  return (
    <section className="container page">
      <h1>Платформа городских мероприятий</h1>
      <p className="page-subtitle">Находите события, сохраняйте избранное и управляйте своим профилем.</p>

      <div className="home-actions">
        <Link to="/events" className="btn btn--primary">
          Смотреть мероприятия
        </Link>
        <Link to="/register" className="btn btn--ghost">
          Создать аккаунт
        </Link>
      </div>
    </section>
  );
};

export default HomePage;
