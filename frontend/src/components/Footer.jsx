import { Link } from 'react-router-dom';
import AppIcon from './AppIcon';

const Footer = () => {
  return (
    <footer className="app-footer">
      <div className="container app-footer__inner">
        <div>
          <p className="app-footer__title">
            <AppIcon name="spark" size={15} />
            Фестиваль
          </p>
          <p className="app-footer__text">Платформа культурных мероприятий малого города.</p>
        </div>

        <div>
          <p className="app-footer__title">
            <AppIcon name="home" size={15} />
            Навигация
          </p>
          <nav className="app-footer__nav">
            <Link to="/">Главная</Link>
            <Link to="/events">Мероприятия</Link>
            <Link to="/publications">Публикации</Link>
            <Link to="/favorites">Избранное</Link>
            <Link to="/profile">Профиль</Link>
          </nav>
        </div>

        <div>
          <p className="app-footer__title">
            <AppIcon name="mapPin" size={15} />
            Контакты
          </p>
          <p className="app-footer__text">
            Email: <a href="mailto:info@festival.local">info@festival.local</a>
          </p>
          <p className="app-footer__text">
            Телефон: <a href="tel:+74951234567">+7 (495) 123-45-67</a>
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
