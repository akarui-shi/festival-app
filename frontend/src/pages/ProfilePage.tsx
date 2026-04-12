import { useState } from 'react';
import { User } from 'lucide-react';
import { toast } from 'sonner';
import { PublicLayout } from '@/layouts/PublicLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    phone: user?.phone || '',
  });

  const updateField = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!form.firstName || !form.lastName) {
      toast.error('Заполните обязательные поля');
      return;
    }

    setLoading(true);
    try {
      await updateUser(form);
      toast.success('Профиль обновлён');
    } catch {
      toast.error('Не удалось сохранить изменения');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PublicLayout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="font-heading text-3xl text-foreground sm:text-4xl">Профиль</h1>
        <p className="mt-1 text-muted-foreground">Управляйте персональными данными</p>

        <div className="mt-8 max-w-2xl rounded-2xl border border-border bg-card p-6 shadow-card sm:p-8">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              <User className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="font-heading text-xl text-foreground">{user?.firstName} {user?.lastName}</p>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="firstName">Имя</Label>
                <Input
                  id="firstName"
                  value={form.firstName}
                  onChange={(event) => updateField('firstName', event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Фамилия</Label>
                <Input
                  id="lastName"
                  value={form.lastName}
                  onChange={(event) => updateField('lastName', event.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Телефон</Label>
              <Input
                id="phone"
                value={form.phone}
                onChange={(event) => updateField('phone', event.target.value)}
                placeholder="+7 900 123-45-67"
              />
            </div>

            <Button type="submit" disabled={loading}>
              {loading ? 'Сохранение…' : 'Сохранить'}
            </Button>
          </form>
        </div>
      </div>
    </PublicLayout>
  );
}
