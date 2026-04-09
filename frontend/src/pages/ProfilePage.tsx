import { useState } from 'react';
import { PublicLayout } from '@/layouts/PublicLayout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { User } from 'lucide-react';

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const [form, setForm] = useState({ firstName: user?.firstName || '', lastName: user?.lastName || '', phone: user?.phone || '' });
  const [loading, setLoading] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.firstName || !form.lastName) { toast.error('Заполните обязательные поля'); return; }
    setLoading(true);
    try { await updateUser(form); toast.success('Профиль обновлён'); } catch { toast.error('Ошибка сохранения'); }
    setLoading(false);
  };

  return (
    <PublicLayout>
      <div className="container max-w-lg py-10">
        <div className="flex items-center gap-3 mb-8">
          <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-bold">Личный кабинет</h1>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
          </div>
        </div>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Имя</Label><Input value={form.firstName} onChange={e => setForm(p => ({ ...p, firstName: e.target.value }))} /></div>
            <div><Label>Фамилия</Label><Input value={form.lastName} onChange={e => setForm(p => ({ ...p, lastName: e.target.value }))} /></div>
          </div>
          <div><Label>Телефон</Label><Input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="+7 900 123-45-67" /></div>
          <Button type="submit" disabled={loading}>{loading ? 'Сохранение...' : 'Сохранить'}</Button>
        </form>
      </div>
    </PublicLayout>
  );
}
