import { useCallback, useEffect, useMemo, useState } from 'react';
import AdminTabs from '../components/AdminTabs';
import AdminEmptyState from '../components/AdminEmptyState';
import Loader from '../components/Loader';
import AlertMessage from '../components/AlertMessage';
import AdminEventModerationCard from '../components/AdminEventModerationCard';
import PublicationModerationCard from '../components/PublicationModerationCard';
import UserManagementTable from '../components/UserManagementTable';
import CategoryForm from '../components/CategoryForm';
import { adminService } from '../services/adminService';
import { publicationService } from '../services/publicationService';
import { userService } from '../services/userService';
import { categoryService } from '../services/categoryService';
import { formatStatus } from '../utils/formatters';
import { toUserErrorMessage } from '../utils/errorMessages';

const TABS = [
  { key: 'events', label: 'Мероприятия' },
  { key: 'publications', label: 'Публикации' },
  { key: 'users', label: 'Пользователи' },
  { key: 'categories', label: 'Категории' }
];

const EVENT_STATUSES = ['', 'PENDING_APPROVAL', 'PUBLISHED', 'REJECTED', 'ARCHIVED'];
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
  const [activeTab, setActiveTab] = useState('events');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const [eventStatusFilter, setEventStatusFilter] = useState('PENDING_APPROVAL');
  const [publicationStatusFilter, setPublicationStatusFilter] = useState('');
  const [events, setEvents] = useState([]);
  const [publications, setPublications] = useState([]);
  const [users, setUsers] = useState([]);
  const [categories, setCategories] = useState([]);

  const [eventAction, setEventAction] = useState({ id: null, status: '' });
  const [publicationAction, setPublicationAction] = useState({ id: null, status: '' });
  const [savingUserId, setSavingUserId] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);
  const [dictionarySubmitting, setDictionarySubmitting] = useState(false);
  const [deletingCategoryId, setDeletingCategoryId] = useState(null);

  const loadEvents = useCallback(async () => {
    const data = await adminService.getAdminEvents(eventStatusFilter || undefined);
    setEvents(Array.isArray(data) ? data : []);
  }, [eventStatusFilter]);

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

  useEffect(() => {
    const load = async () => {
      try {
        setIsLoading(true);
        setError('');

        if (activeTab === 'events') {
          await loadEvents();
        } else if (activeTab === 'publications') {
          await loadPublications();
        } else if (activeTab === 'users') {
          await loadUsers();
        } else if (activeTab === 'categories') {
          await loadCategories();
        }
      } catch (err) {
        setError(toUserErrorMessage(err, 'Не удалось загрузить данные админ-панели.'));
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [activeTab, loadEvents, loadPublications, loadUsers, loadCategories]);

  const currentTabLabel = useMemo(() => TABS.find((tab) => tab.key === activeTab)?.label || '', [activeTab]);

  const handleEventStatusChange = async (eventId, status) => {
    try {
      setError('');
      setMessage('');
      setEventAction({ id: eventId, status });
      await adminService.updateEventStatus(eventId, status);
      await loadEvents();
      setMessage('Статус мероприятия обновлен.');
    } catch (err) {
      setError(toUserErrorMessage(err, 'Не удалось обновить статус мероприятия.'));
    } finally {
      setEventAction({ id: null, status: '' });
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
      setError(toUserErrorMessage(err, 'Не удалось обновить статус публикации.'));
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
      setError(toUserErrorMessage(err, 'Не удалось сохранить изменения пользователя.'));
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
      setError(toUserErrorMessage(err, 'Не удалось сохранить категорию.'));
    } finally {
      setDictionarySubmitting(false);
    }
  };

  const handleDeleteCategory = async (id) => {
    const confirmed = window.confirm('Удалить категорию?');
    if (!confirmed) {
      return;
    }

    try {
      setDeletingCategoryId(id);
      setError('');
      setMessage('');
      await categoryService.deleteCategory(id);
      await loadCategories();
      setMessage('Категория удалена.');
    } catch (err) {
      setError(toUserErrorMessage(err, 'Не удалось удалить категорию.'));
    } finally {
      setDeletingCategoryId(null);
    }
  };

  return (
    <section className="container page">
      <h1>Админ-панель</h1>
      <p className="page-subtitle">Раздел: {currentTabLabel}</p>
      <p className="muted">Управление городами и площадками перенесено в кабинет организатора.</p>

      <AdminTabs
        tabs={TABS}
        activeTab={activeTab}
        onChange={(tab) => {
          setActiveTab(tab);
          setError('');
          setMessage('');
        }}
      />

      {isLoading && <Loader text="Загружаем данные..." />}
      {error && <AlertMessage type="error" message={error} onClose={() => setError('')} />}
      {message && (
        <AlertMessage
          type="success"
          message={message}
          autoHideMs={2800}
          onClose={() => setMessage('')}
        />
      )}

      {!isLoading && activeTab === 'events' && (
        <div className="admin-section">
          <label className="admin-filter">
            Фильтр по статусу
            <select value={eventStatusFilter} onChange={(event) => setEventStatusFilter(event.target.value)}>
              <option value="">Все</option>
              {EVENT_STATUSES.filter(Boolean).map((status) => (
                <option key={status} value={status}>
                  {formatStatus(status)}
                </option>
              ))}
            </select>
          </label>

          {events.length === 0 ? (
            <AdminEmptyState message="Нет мероприятий для модерации." />
          ) : (
            <div className="admin-list">
              {events.map((event) => (
                <AdminEventModerationCard
                  key={event.id}
                  event={event}
                  processingAction={eventAction.id === event.id ? eventAction.status : ''}
                  onUpdateStatus={handleEventStatusChange}
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
                  {formatStatus(status)}
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
                      onClick={() => handleDeleteCategory(category.id)}
                      disabled={deletingCategoryId === category.id}
                    >
                      {deletingCategoryId === category.id ? 'Удаляем...' : 'Удалить'}
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
