import { useEffect, useState } from 'react';

const ROLE_OPTIONS = ['RESIDENT', 'ORGANIZER', 'ADMIN'];

const normalizeRoles = (roles) => {
  if (!Array.isArray(roles)) {
    return [];
  }
  return [...new Set(roles)];
};

const UserManagementTable = ({ users = [], savingUserId = null, onSave }) => {
  const [drafts, setDrafts] = useState({});

  useEffect(() => {
    const mapped = {};
    users.forEach((user) => {
      mapped[user.id] = {
        roles: normalizeRoles(user.roles),
        active: Boolean(user.active)
      };
    });
    setDrafts(mapped);
  }, [users]);

  const toggleRole = (userId, role) => {
    setDrafts((prev) => {
      const current = prev[userId] || { roles: [], active: true };
      const hasRole = current.roles.includes(role);
      const nextRoles = hasRole ? current.roles.filter((item) => item !== role) : [...current.roles, role];
      return {
        ...prev,
        [userId]: {
          ...current,
          roles: normalizeRoles(nextRoles)
        }
      };
    });
  };

  const setActive = (userId, active) => {
    setDrafts((prev) => ({
      ...prev,
      [userId]: {
        ...(prev[userId] || { roles: [], active: true }),
        active
      }
    }));
  };

  return (
    <div className="admin-table-wrap">
      <table className="admin-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Логин</th>
            <th>Email</th>
            <th>Имя</th>
            <th>Фамилия</th>
            <th>Телефон</th>
            <th>Роли</th>
            <th>Активен</th>
            <th>Действие</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => {
            const draft = drafts[user.id] || { roles: [], active: false };
            const isSaving = savingUserId === user.id;

            return (
              <tr key={user.id}>
                <td>{user.id}</td>
                <td>{user.login}</td>
                <td>{user.email}</td>
                <td>{user.firstName || '-'}</td>
                <td>{user.lastName || '-'}</td>
                <td>{user.phone || '-'}</td>
                <td>
                  <div className="roles-cell">
                    {ROLE_OPTIONS.map((role) => (
                      <label key={role} className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={draft.roles.includes(role)}
                          onChange={() => toggleRole(user.id, role)}
                        />
                        <span>{role}</span>
                      </label>
                    ))}
                  </div>
                </td>
                <td>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={draft.active}
                      onChange={(event) => setActive(user.id, event.target.checked)}
                    />
                    <span>{draft.active ? 'Да' : 'Нет'}</span>
                  </label>
                </td>
                <td>
                  <button
                    type="button"
                    className="btn btn--primary"
                    disabled={isSaving}
                    onClick={() => onSave(user.id, draft)}
                  >
                    {isSaving ? 'Сохраняем...' : 'Сохранить'}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default UserManagementTable;

