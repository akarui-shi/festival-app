import { useEffect, useState } from 'react';
import { adminService } from '@/services/admin-service';
import { LoadingState } from '@/components/StateDisplays';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { User, UserRole } from '@/types';
import { toast } from 'sonner';

const roleLabels: Record<UserRole, string> = { RESIDENT: 'Житель', ORGANIZER: 'Организатор', ADMIN: 'Администратор' };

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { adminService.getUsers().then(u => { setUsers(u); setLoading(false); }); }, []);

  const changeRole = async (userId: string, role: UserRole) => {
    const updated = await adminService.updateUserRole(userId, role);
    setUsers(prev => prev.map(u => u.id === userId ? updated : u));
    toast.success('Роль обновлена');
  };

  const toggleActive = async (userId: string) => {
    const updated = await adminService.toggleUserActive(userId);
    setUsers(prev => prev.map(u => u.id === userId ? updated : u));
    toast.success(updated.active ? 'Аккаунт активирован' : 'Аккаунт деактивирован');
  };

  if (loading) return <LoadingState />;

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold mb-6">Управление пользователями</h1>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="py-3 pr-4 font-medium text-muted-foreground">Пользователь</th>
              <th className="py-3 pr-4 font-medium text-muted-foreground">Email</th>
              <th className="py-3 pr-4 font-medium text-muted-foreground">Роль</th>
              <th className="py-3 pr-4 font-medium text-muted-foreground">Статус</th>
              <th className="py-3 font-medium text-muted-foreground">Действия</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id} className="border-b border-border/50">
                <td className="py-3 pr-4 font-medium">{user.firstName} {user.lastName}</td>
                <td className="py-3 pr-4 text-muted-foreground">{user.email}</td>
                <td className="py-3 pr-4">
                  <Select value={user.role} onValueChange={v => changeRole(user.id, v as UserRole)}>
                    <SelectTrigger className="w-40 h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="RESIDENT">Житель</SelectItem>
                      <SelectItem value="ORGANIZER">Организатор</SelectItem>
                      <SelectItem value="ADMIN">Администратор</SelectItem>
                    </SelectContent>
                  </Select>
                </td>
                <td className="py-3 pr-4">
                  <Badge className={user.active ? 'bg-success/10 text-success border-0' : 'bg-destructive/10 text-destructive border-0'}>
                    {user.active ? 'Активен' : 'Заблокирован'}
                  </Badge>
                </td>
                <td className="py-3">
                  <Button variant="ghost" size="sm" onClick={() => toggleActive(user.id)}>
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
