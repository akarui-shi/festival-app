import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import Loader from '../components/Loader';
import ErrorMessage from '../components/ErrorMessage';
import EmptyState from '../components/EmptyState';
import PublicationCard from '../components/PublicationCard';
import { publicationService } from '../services/publicationService';
import { useAuth } from '../context/AuthContext';
import { ROLE } from '../utils/roles';
import { toUserErrorMessage } from '../utils/errorMessages';

const PublicationsPage = () => {
  const location = useLocation();
  const { hasRole } = useAuth();
  const canCreatePublication = hasRole([ROLE.ORGANIZER, ROLE.ADMIN]);

  const [publications, setPublications] = useState([]);
  const [titleFilter, setTitleFilter] = useState('');
  const [appliedTitle, setAppliedTitle] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState(location.state?.message || '');

  useEffect(() => {
    if (!location.state?.message) {
      return;
    }
    window.history.replaceState({}, document.title);
  }, [location.state]);

  useEffect(() => {
    const loadPublications = async () => {
      try {
        setIsLoading(true);
        setError('');
        const data = await publicationService.getPublications({ title: appliedTitle || undefined });
        setPublications(Array.isArray(data) ? data : []);
      } catch (err) {
        setError(toUserErrorMessage(err, 'Не удалось загрузить публикации.'));
      } finally {
        setIsLoading(false);
      }
    };

    loadPublications();
  }, [appliedTitle]);

  return (
    <section className="container page">
      <div className="page-header-row">
        <h1>Статьи и публикации</h1>
        {canCreatePublication && (
          <Link to="/publications/create" className="btn btn--primary">
            Создать публикацию
          </Link>
        )}
      </div>
      <p className="page-subtitle">Читайте новости, анонсы и материалы организаторов.</p>
      {message && <p className="page-note page-note--success">{message}</p>}

      <form
        className="panel publications-filter"
        onSubmit={(event) => {
          event.preventDefault();
          setAppliedTitle(titleFilter.trim());
        }}
      >
        <label>
          Поиск по заголовку
          <input
            type="text"
            value={titleFilter}
            onChange={(event) => setTitleFilter(event.target.value)}
            placeholder="Например, фестиваль"
          />
        </label>
        <div className="inline-actions">
          <button className="btn btn--primary" type="submit">Найти</button>
          <button
            className="btn btn--ghost"
            type="button"
            onClick={() => {
              setTitleFilter('');
              setAppliedTitle('');
            }}
          >
            Сбросить
          </button>
        </div>
      </form>

      {isLoading && <Loader text="Загружаем публикации..." />}
      {error && <ErrorMessage message={error} />}
      {!isLoading && !error && publications.length === 0 && <EmptyState message="Публикации пока не найдены." />}

      {!isLoading && !error && publications.length > 0 && (
        <div className="publication-list">
          {publications.map((publication) => (
            <PublicationCard key={publication.publicationId} publication={publication} />
          ))}
        </div>
      )}
    </section>
  );
};

export default PublicationsPage;
