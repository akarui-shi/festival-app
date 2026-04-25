import { useEffect, useMemo, useState } from 'react';
import { Search, Users } from 'lucide-react';
import { toast } from 'sonner';
import { adminService } from '@/services/admin-service';
import { LoadingState } from '@/components/StateDisplays';
import { EmptyState } from '@/components/EmptyState';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { User, UserRole } from '@/types';

function primaryRole(user: User): UserRole {
  const roles = (user.roles || []).map((role) => role.toUpperCase());
  if (roles.includes('ADMIN') || roles.includes('ROLE_ADMIN')) return 'ADMIN';
  if (roles.includes('ORGANIZER') || roles.includes('ROLE_ORGANIZER')) return 'ORGANIZER';
  return 'RESIDENT';
}

function initials(user: User): string {
  return [user.firstName, user.lastName].filter(Boolean).map((n) => n![0].toUpperCase()).join('') || '?';
}

const ROLE_LABELS: Record<UserRole, string> = { RESIDENT: 'Житель', ORGANIZER: 'Организатор', ADMIN: 'Администратор' };

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  useEffect(() => {
    adminService.getUsers().then((response) => { setUsers(response); setLoading(false); });
  }, []);

  const filteredUsers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((user) =>
      [user.firstName, user.lastName, user.email, user.login]
        .filter(Boolean).join(' ').toLowerCase().includes(q),
    );
  }, [users, query]);

  const changeRole = async (userId: string, role: UserRole) => {
    const updated = await adminService.updateUserRole(userId, role);
    setUsers((prev) => prev.map((user) => (String(user.id) === String(userId) ? updated : user)));
    toast.success('Роль обновлена');
  };

  const toggleActive = async (userId: string) => {
    const updated = await adminService.toggleUserActive(userId);
    setUsers((prev) => prev.map((user) => (String(user.id) === String(userId) ? updated : user)));
    toast.success(updated.active ? 'Аккаунт активирован' : 'Аккаунт деактивирован');
  };

  if (loading) return <LoadingState />;

  if (users.length === 0) {
    return <EmptyState icon={Users} title="Пользователи не найдены" description="Список появится после регистрации" />;
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="page-title">Пользователи</h1>
          <p className="mt-1 text-muted-foreground">Управление ролями и доступом к платформе</p>
        </div>
        <span className="rounded-full bg-muted px-3 py-1 text-sm font-medium text-muted-foreground">
          Всего: {users.length}
        </span>
      </section>

      <div className="surface-soft">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск по имени, email, логину..."
            className="pl-9"
          />
        </div>
      </div>

      {filteredUsers.length === 0 ? (
        <EmptyState icon={Users} title="Никого не найдено" description="Смените поисковый запрос" />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-left">
                <th className="px-4 py-3 font-medium text-muted-foreground">Пользователь</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Email</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Роль</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Статус</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Действия</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.id} className="border-t border-border/60 transition-colors hover:bg-muted/20">
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/70 to-[hsl(var(--terracotta-dark)/0.6)] text-xs font-bold text-white">
                        {initials(user)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-foreground">{user.firstName} {user.lastName}</p>
                        {user.login && <p className="text-xs text-muted-foreground">@{user.login}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-muted-foreground">{user.email}</td>
                  <td className="px-4 py-3.5">
                    <Select value={primaryRole(user)} onValueChange={(value) => changeRole(String(user.id), value as UserRole)}>
                      <SelectTrigger className="h-8 w-44 bg-background text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(ROLE_LABELS) as UserRole[]).map((role) => (
                          <SelectItem key={role} value={role}>{ROLE_LABELS[role]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-4 py-3.5">
                    <Badge className={`border-0 text-xs ${user.active ? 'bg-[hsl(var(--success)/0.1)] text-[hsl(var(--success))]' : 'bg-destructive/10 text-destructive'}`}>
                      {user.active ? 'Активен' : 'Заблокирован'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3.5">
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`h-7 text-xs ${user.active ? 'text-destructive hover:text-destructive' : 'text-[hsl(var(--success))]'}`}
                      onClick={() => toggleActive(String(user.id))}
                    >
                      {user.active ? 'Заблокировать' : 'Активировать'}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
