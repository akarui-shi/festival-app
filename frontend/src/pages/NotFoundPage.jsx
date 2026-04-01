import { Link } from 'react-router-dom';

const NotFoundPage = () => {
  return (
    <section className="container page">
      <h1>Страница не найдена</h1>
      <p className="page-subtitle">Запрошенная страница не существует.</p>
      <Link to="/" className="btn btn--primary">На главную</Link>
    </section>
  );
};

export default NotFoundPage;
