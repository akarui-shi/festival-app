import { useCallback, useEffect, useMemo, useState } from 'react';
import AdminTabs from '../components/AdminTabs';
import AdminEmptyState from '../components/AdminEmptyState';
import Loader from '../components/Loader';
import ErrorMessage from '../components/ErrorMessage';
import ReviewModerationCard from '../components/ReviewModerationCard';
import PublicationModerationCard from '../components/PublicationModerationCard';
import UserManagementTable from '../components/UserManagementTable';
import CategoryForm from '../components/CategoryForm';
import CityForm from '../components/CityForm';
import VenueForm from '../components/VenueForm';
import { reviewService } from '../services/reviewService';
import { publicationService } from '../services/publicationService';
import { userService } from '../services/userService';
import { categoryService } from '../services/categoryService';
import { cityService } from '../services/cityService';
import { venueService } from '../services/venueService';

const TABS = [
  { key: 'reviews', label: 'Отзывы' },
  { key: 'publications', label: 'Публикации' },
  { key: 'users', label: 'Пользователи' },
  { key: 'categories', label: 'Категории' },
  { key: 'cities', label: 'Города' },
  { key: 'venues', label: 'Площадки' }
];

const REVIEW_STATUSES = ['', 'PENDING', 'APPROVED', 'REJECTED', 'DELETED'];
const PUBLICATION_STATUSES = ['', 'PENDING', 'PUBLISHED', 'REJECTED', 'DELETED'];

const normalizeRoles = (roles) => (Array.isArray(roles) ? [...new Set(roles)].sort() : []);

const sameRoleSet = (left, right) => {
  const a = normalizeRoles(left);
  const b = normalizeRoles(right);
  if (a.length !== b.length) {
    return false;
  }
  return a.every((item, index) => item === b[index]);
};

const AdminDashboardPage = () => {
  const [activeTab, setActiveTab] = useState('reviews');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const [reviewStatusFilter, setReviewStatusFilter] = useState('');
  const [publicationStatusFilter, setPublicationStatusFilter] = useState('');

  const [reviews, setReviews] = useState([]);
  const [publications, setPublications] = useState([]);
  const [users, setUsers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [cities, setCities] = useState([]);
  const [venues, setVenues] = useState([]);

  const [reviewAction, setReviewAction] = useState({ id: null, status: '' });
  const [publicationAction, setPublicationAction] = useState({ id: null, status: '' });
  const [savingUserId, setSavingUserId] = useState(null);

  const [editingCategory, setEditingCategory] = useState(null);
  const [editingCity, setEditingCity] = useState(null);
  const [editingVenue, setEditingVenue] = useState(null);
  const [dictionarySubmitting, setDictionarySubmitting] = useState(false);
  const [dictionaryDeleting, setDictionaryDeleting] = useState({ type: '', id: null });

  const loadReviews = useCallback(async () => {
    const data = await reviewService.getAdminReviews(reviewStatusFilter || undefined);
    setReviews(Array.isArray(data) ? data : []);
  }, [reviewStatusFilter]);

  const loadPublications = useCallback(async () => {
    const data = await publicationService.getAdminPublications(publicationStatusFilter || undefined);
    setPublications(Array.isArray(data) ? data : []);
  }, [publicationStatusFilter]);

  const loadUsers = useCallback(async () => {
    const data = await userService.getAdminUsers();
    setUsers(Array.isArray(data) ? data : []);
  }, []);

  const loadCategories = useCallback(async () => {
    const data = await categoryService.getCategories();
    setCategories(Array.isArray(data) ? data : []);
  }, []);

  const loadCities = useCallback(async () => {
    const data = await cityService.getCities();
    setCities(Array.isArray(data) ? data : []);
  }, []);

  const loadVenues = useCallback(async () => {
    const data = await venueService.getVenues();
    setVenues(Array.isArray(data) ? data : []);
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        setIsLoading(true);
        setError('');

        if (activeTab === 'reviews') {
          await loadReviews();
        } else if (activeTab === 'publications') {
          await loadPublications();
        } else if (activeTab === 'users') {
          await loadUsers();
        } else if (activeTab === 'categories') {
          await loadCategories();
        } else if (activeTab === 'cities') {
          await loadCities();
        } else if (activeTab === 'venues') {
          await Promise.all([loadVenues(), loadCities()]);
        }
      } catch (err) {
        setError(err.message || 'Не удалось загрузить данные админ-панели.');
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [activeTab, loadReviews, loadPublications, loadUsers, loadCategories, loadCities, loadVenues]);

  const currentTabLabel = useMemo(() => TABS.find((tab) => tab.key === activeTab)?.label || '', [activeTab]);

  const refreshCurrentTab = async () => {
    if (activeTab === 'reviews') {
      await loadReviews();
    } else if (activeTab === 'publications') {
      await loadPublications();
    } else if (activeTab === 'users') {
      await loadUsers();
    } else if (activeTab === 'categories') {
      await loadCategories();
    } else if (activeTab === 'cities') {
      await loadCities();
    } else if (activeTab === 'venues') {
      await Promise.all([loadVenues(), loadCities()]);
    }
  };

  const handleReviewStatusChange = async (reviewId, status) => {
    try {
      setError('');
      setMessage('');
      setReviewAction({ id: reviewId, status });
      await reviewService.updateReviewStatus(reviewId, status);
      await loadReviews();
      setMessage('Статус отзыва обновлен.');
    } catch (err) {
      setError(err.message || 'Не удалось обновить статус отзыва.');
    } finally {
      setReviewAction({ id: null, status: '' });
    }
  };

  const handlePublicationStatusChange = async (publicationId, status) => {
    try {
      setError('');
      setMessage('');
      setPublicationAction({ id: publicationId, status });
      await publicationService.updatePublicationStatus(publicationId, status);
      await loadPublications();
      setMessage('Статус публикации обновлен.');
    } catch (err) {
      setError(err.message || 'Не удалось обновить статус публикации.');
    } finally {
      setPublicationAction({ id: null, status: '' });
    }
  };

  const handleSaveUser = async (userId, draft) => {
    const sourceUser = users.find((user) => user.id === userId);
    if (!sourceUser) {
      return;
    }
    if (!Array.isArray(draft.roles) || draft.roles.length === 0) {
      setError('У пользователя должна быть хотя бы одна роль.');
      return;
    }

    try {
      setSavingUserId(userId);
      setError('');
      setMessage('');

      let updatedUser = sourceUser;
      if (!sameRoleSet(sourceUser.roles, draft.roles)) {
        updatedUser = await userService.updateUserRoles(userId, draft.roles);
      }
      if (Boolean(sourceUser.active) !== Boolean(draft.active)) {
        updatedUser = await userService.updateUserActive(userId, Boolean(draft.active));
      }

      setUsers((prev) => prev.map((user) => (user.id === userId ? updatedUser : user)));
      setMessage('Пользователь обновлен.');
    } catch (err) {
      setError(err.message || 'Не удалось сохранить изменения пользователя.');
    } finally {
      setSavingUserId(null);
    }
  };

  const handleCategorySubmit = async (payload) => {
    try {
      setDictionarySubmitting(true);
      setError('');
      setMessage('');

      if (editingCategory) {
        await categoryService.updateCategory(editingCategory.id, payload);
        setMessage('Категория обновлена.');
      } else {
        await categoryService.createCategory(payload);
        setMessage('Категория создана.');
      }

      setEditingCategory(null);
      await loadCategories();
    } catch (err) {
      setError(err.message || 'Не удалось сохранить категорию.');
    } finally {
      setDictionarySubmitting(false);
    }
  };

  const handleCitySubmit = async (payload) => {
    try {
      setDictionarySubmitting(true);
      setError('');
      setMessage('');

      if (editingCity) {
        await cityService.updateCity(editingCity.id, payload);
        setMessage('Город обновлен.');
      } else {
        await cityService.createCity(payload);
        setMessage('Город создан.');
      }

      setEditingCity(null);
      await loadCities();
    } catch (err) {
      setError(err.message || 'Не удалось сохранить город.');
    } finally {
      setDictionarySubmitting(false);
    }
  };

  const handleVenueSubmit = async (payload) => {
    try {
      setDictionarySubmitting(true);
      setError('');
      setMessage('');

      if (editingVenue) {
        await venueService.updateVenue(editingVenue.id, payload);
        setMessage('Площадка обновлена.');
      } else {
        await venueService.createVenue(payload);
        setMessage('Площадка создана.');
      }

      setEditingVenue(null);
      await loadVenues();
    } catch (err) {
      setError(err.message || 'Не удалось сохранить площадку.');
    } finally {
      setDictionarySubmitting(false);
    }
  };

  const handleDeleteDictionaryItem = async (type, id) => {
    const confirmed = window.confirm('Удалить запись?');
    if (!confirmed) {
      return;
    }

    try {
      setDictionaryDeleting({ type, id });
      setError('');
      setMessage('');

      if (type === 'category') {
        await categoryService.deleteCategory(id);
        setMessage('Категория удалена.');
      } else if (type === 'city') {
        await cityService.deleteCity(id);
        setMessage('Город удален.');
      } else if (type === 'venue') {
        await venueService.deleteVenue(id);
        setMessage('Площадка удалена.');
      }

      await refreshCurrentTab();
    } catch (err) {
      setError(err.message || 'Не удалось удалить запись.');
    } finally {
      setDictionaryDeleting({ type: '', id: null });
    }
  };

  return (
    <section className="container page">
      <h1>Админ-панель</h1>
      <p className="page-subtitle">Раздел: {currentTabLabel}</p>

      <AdminTabs tabs={TABS} activeTab={activeTab} onChange={(tab) => {
        setActiveTab(tab);
        setError('');
        setMessage('');
      }} />

      {isLoading && <Loader text="Загружаем данные..." />}
      {error && <ErrorMessage message={error} />}
      {message && <p className="page-note page-note--success">{message}</p>}

      {!isLoading && activeTab === 'reviews' && (
        <div className="admin-section">
          <label className="admin-filter">
            Фильтр по статусу
            <select value={reviewStatusFilter} onChange={(event) => setReviewStatusFilter(event.target.value)}>
              <option value="">Все</option>
              {REVIEW_STATUSES.filter(Boolean).map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>

          {reviews.length === 0 ? (
            <AdminEmptyState message="Нет отзывов." />
          ) : (
            <div className="admin-list">
              {reviews.map((review) => (
                <ReviewModerationCard
                  key={review.reviewId}
                  review={review}
                  processingAction={reviewAction.id === review.reviewId ? reviewAction.status : ''}
                  onUpdateStatus={handleReviewStatusChange}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {!isLoading && activeTab === 'publications' && (
        <div className="admin-section">
          <label className="admin-filter">
            Фильтр по статусу
            <select value={publicationStatusFilter} onChange={(event) => setPublicationStatusFilter(event.target.value)}>
              <option value="">Все</option>
              {PUBLICATION_STATUSES.filter(Boolean).map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>

          {publications.length === 0 ? (
            <AdminEmptyState message="Нет публикаций." />
          ) : (
            <div className="admin-list">
              {publications.map((publication) => (
                <PublicationModerationCard
                  key={publication.publicationId}
                  publication={publication}
                  processingAction={publicationAction.id === publication.publicationId ? publicationAction.status : ''}
                  onUpdateStatus={handlePublicationStatusChange}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {!isLoading && activeTab === 'users' && (
        <div className="admin-section">
          {users.length === 0 ? (
            <AdminEmptyState message="Нет пользователей." />
          ) : (
            <UserManagementTable users={users} savingUserId={savingUserId} onSave={handleSaveUser} />
          )}
        </div>
      )}

      {!isLoading && activeTab === 'categories' && (
        <div className="admin-section">
          <CategoryForm
            initialValues={editingCategory}
            isSubmitting={dictionarySubmitting}
            errorMessage={error}
            submitLabel={editingCategory ? 'Сохранить категорию' : 'Создать категорию'}
            onCancel={editingCategory ? () => setEditingCategory(null) : null}
            onSubmit={handleCategorySubmit}
          />

          {categories.length === 0 ? (
            <AdminEmptyState message="Нет записей в справочнике." />
          ) : (
            <div className="admin-list">
              {categories.map((category) => (
                <article key={category.id} className="admin-dictionary-item">
                  <div>
                    <strong>{category.name}</strong>
                    <p className="muted">
                      ID: {category.id}
                      {category.description ? ` | ${category.description}` : ''}
                    </p>
                  </div>
                  <div className="inline-actions">
                    <button type="button" className="btn btn--ghost" onClick={() => setEditingCategory(category)}>
                      Редактировать
                    </button>
                    <button
                      type="button"
                      className="btn btn--danger"
                      onClick={() => handleDeleteDictionaryItem('category', category.id)}
                      disabled={dictionaryDeleting.type === 'category' && dictionaryDeleting.id === category.id}
                    >
                      {dictionaryDeleting.type === 'category' && dictionaryDeleting.id === category.id ? 'Удаляем...' : 'Удалить'}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      )}

      {!isLoading && activeTab === 'cities' && (
        <div className="admin-section">
          <CityForm
            initialValues={editingCity}
            isSubmitting={dictionarySubmitting}
            errorMessage={error}
            submitLabel={editingCity ? 'Сохранить город' : 'Создать город'}
            onCancel={editingCity ? () => setEditingCity(null) : null}
            onSubmit={handleCitySubmit}
          />

          {cities.length === 0 ? (
            <AdminEmptyState message="Нет записей в справочнике." />
          ) : (
            <div className="admin-list">
              {cities.map((city) => (
                <article key={city.id} className="admin-dictionary-item">
                  <div>
                    <strong>{city.name}</strong>
                    <p className="muted">Регион: {city.region || '-'} | Страна: {city.country || '-'}</p>
                  </div>
                  <div className="inline-actions">
                    <button type="button" className="btn btn--ghost" onClick={() => setEditingCity(city)}>
                      Редактировать
                    </button>
                    <button
                      type="button"
                      className="btn btn--danger"
                      onClick={() => handleDeleteDictionaryItem('city', city.id)}
                      disabled={dictionaryDeleting.type === 'city' && dictionaryDeleting.id === city.id}
                    >
                      {dictionaryDeleting.type === 'city' && dictionaryDeleting.id === city.id ? 'Удаляем...' : 'Удалить'}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      )}

      {!isLoading && activeTab === 'venues' && (
        <div className="admin-section">
          <VenueForm
            initialValues={editingVenue}
            cities={cities}
            isSubmitting={dictionarySubmitting}
            errorMessage={error}
            submitLabel={editingVenue ? 'Сохранить площадку' : 'Создать площадку'}
            onCancel={editingVenue ? () => setEditingVenue(null) : null}
            onSubmit={handleVenueSubmit}
          />

          {venues.length === 0 ? (
            <AdminEmptyState message="Нет записей в справочнике." />
          ) : (
            <div className="admin-list">
              {venues.map((venue) => (
                <article key={venue.id} className="admin-dictionary-item">
                  <div>
                    <strong>{venue.name}</strong>
                    <p className="muted">
                      {venue.address} | Город: {venue.cityName || '-'} | Вместимость: {venue.capacity ?? '-'}
                    </p>
                  </div>
                  <div className="inline-actions">
                    <button type="button" className="btn btn--ghost" onClick={() => setEditingVenue(venue)}>
                      Редактировать
                    </button>
                    <button
                      type="button"
                      className="btn btn--danger"
                      onClick={() => handleDeleteDictionaryItem('venue', venue.id)}
                      disabled={dictionaryDeleting.type === 'venue' && dictionaryDeleting.id === venue.id}
                    >
                      {dictionaryDeleting.type === 'venue' && dictionaryDeleting.id === venue.id ? 'Удаляем...' : 'Удалить'}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
};

export default AdminDashboardPage;
