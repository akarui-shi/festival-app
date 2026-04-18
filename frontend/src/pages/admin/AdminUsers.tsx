import { useEffect, useState } from 'react';
import { Users } from 'lucide-react';
import { toast } from 'sonner';
import { adminService } from '@/services/admin-service';
import { LoadingState } from '@/components/StateDisplays';
import { EmptyState } from '@/components/EmptyState';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { User, UserRole } from '@/types';

function primaryRole(user: User): UserRole {
  const roles = (user.roles || []).map((role) => role.toUpperCase());
  if (roles.includes('ADMIN') || roles.includes('ROLE_ADMIN')) return 'ADMIN';
  if (roles.includes('ORGANIZER') || roles.includes('ROLE_ORGANIZER')) return 'ORGANIZER';
  return 'RESIDENT';
}

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminService.getUsers().then((response) => {
      setUsers(response);
      setLoading(false);
    });
  }, []);

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
      <section>
        <h1 className="font-heading text-3xl text-foreground sm:text-4xl">Пользователи</h1>
        <p className="mt-1 text-muted-foreground">Управление ролями и доступом к платформе</p>
      </section>

      <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-card">
        <table className="w-full min-w-[860px] text-sm">
          <thead className="bg-muted/50">
            <tr className="text-left">
              <th className="px-4 py-3 font-medium text-muted-foreground">Пользователь</th>
              <th className="px-4 py-3 font-medium text-muted-foreground">Email</th>
              <th className="px-4 py-3 font-medium text-muted-foreground">Роль</th>
              <th className="px-4 py-3 font-medium text-muted-foreground">Статус</th>
              <th className="px-4 py-3 font-medium text-muted-foreground">Действия</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-t border-border/60">
                <td className="px-4 py-3.5 font-medium text-foreground">
                  {user.firstName} {user.lastName}
                </td>
                <td className="px-4 py-3.5 text-muted-foreground">{user.email}</td>
                <td className="px-4 py-3.5">
                  <Select value={primaryRole(user)} onValueChange={(value) => changeRole(String(user.id), value as UserRole)}>
                    <SelectTrigger className="h-9 w-44 bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="RESIDENT">Житель</SelectItem>
                      <SelectItem value="ORGANIZER">Организатор</SelectItem>
                      <SelectItem value="ADMIN">Администратор</SelectItem>
                    </SelectContent>
                  </Select>
                </td>
                <td className="px-4 py-3.5">
                  <Badge className={user.active ? 'border-0 bg-success/10 text-success' : 'border-0 bg-destructive/10 text-destructive'}>
                    {user.active ? 'Активен' : 'Заблокирован'}
                  </Badge>
                </td>
                <td className="px-4 py-3.5">
                  <Button variant="ghost" size="sm" onClick={() => toggleActive(String(user.id))}>
                    {user.active ? 'Заблокировать' : 'Активировать'}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
