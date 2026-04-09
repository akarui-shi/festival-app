import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PublicLayout } from '@/layouts/PublicLayout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.firstName || !form.lastName || !form.email || !form.password) { setError('Заполните все поля'); return; }
    if (form.password.length < 6) { setError('Пароль должен быть не менее 6 символов'); return; }
    if (form.password !== form.confirmPassword) { setError('Пароли не совпадают'); return; }
    setLoading(true); setError('');
    try {
      await register(form.email, form.password, form.firstName, form.lastName);
      toast.success('Регистрация прошла успешно!');
      navigate('/');
    } catch (err: any) { setError(err.message); }
    setLoading(false);
  };

  const upd = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(p => ({ ...p, [field]: e.target.value }));

  return (
    <PublicLayout>
      <div className="container max-w-md py-16">
        <div className="text-center mb-8">
          <h1 className="font-heading text-3xl font-bold mb-2">Регистрация</h1>
          <p className="text-muted-foreground">Создайте аккаунт на КультурАфише</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Имя</Label><Input value={form.firstName} onChange={upd('firstName')} placeholder="Иван" /></div>
            <div><Label>Фамилия</Label><Input value={form.lastName} onChange={upd('lastName')} placeholder="Петров" /></div>
          </div>
          <div><Label>Email</Label><Input type="email" value={form.email} onChange={upd('email')} placeholder="email@example.com" /></div>
          <div><Label>Пароль</Label><Input type="password" value={form.password} onChange={upd('password')} placeholder="Минимум 6 символов" /></div>
          <div><Label>Подтверждение пароля</Label><Input type="password" value={form.confirmPassword} onChange={upd('confirmPassword')} placeholder="Повторите пароль" /></div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>{loading ? 'Регистрация...' : 'Зарегистрироваться'}</Button>
        </form>
        <p className="text-center text-sm text-muted-foreground mt-6">
          Уже есть аккаунт? <Link to="/login" className="text-primary hover:underline">Войти</Link>
        </p>
      </div>
    </PublicLayout>
  );
}
