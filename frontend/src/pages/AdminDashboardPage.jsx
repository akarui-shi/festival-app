import { useCallback, useEffect, useMemo, useState } from 'react';
import AdminTabs from '../components/AdminTabs';
import AdminEmptyState from '../components/AdminEmptyState';
import Loader from '../components/Loader';
import ErrorMessage from '../components/ErrorMessage';
import PublicationModerationCard from '../components/PublicationModerationCard';
import UserManagementTable from '../components/UserManagementTable';
import CategoryForm from '../components/CategoryForm';
import { publicationService } from '../services/publicationService';
import { userService } from '../services/userService';
import { categoryService } from '../services/categoryService';

const TABS = [
  { key: 'publications', label: 'Публикации' },
  { key: 'users', label: 'Пользователи' },
  { key: 'categories', label: 'Категории' }
];

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
  const [activeTab, setActiveTab] = useState('publications');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const [publicationStatusFilter, setPublicationStatusFilter] = useState('');
  const [publications, setPublications] = useState([]);
  const [users, setUsers] = useState([]);
  const [categories, setCategories] = useState([]);

  const [publicationAction, setPublicationAction] = useState({ id: null, status: '' });
  const [savingUserId, setSavingUserId] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);
  const [dictionarySubmitting, setDictionarySubmitting] = useState(false);
  const [deletingCategoryId, setDeletingCategoryId] = useState(null);

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

        if (activeTab === 'publications') {
          await loadPublications();
        } else if (activeTab === 'users') {
          await loadUsers();
        } else if (activeTab === 'categories') {
          await loadCategories();
        }
      } catch (err) {
        setError(err.message || 'Не удалось загрузить данные админ-панели.');
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [activeTab, loadPublications, loadUsers, loadCategories]);

  const currentTabLabel = useMemo(() => TABS.find((tab) => tab.key === activeTab)?.label || '', [activeTab]);

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
      setError(err.message || 'Не удалось удалить категорию.');
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
      {error && <ErrorMessage message={error} />}
      {message && <p className="page-note page-note--success">{message}</p>}

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
