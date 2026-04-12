import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { PublicLayout } from '@/layouts/PublicLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const updateField = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!form.firstName || !form.lastName || !form.email || !form.password || !form.confirmPassword) {
      setError('Заполните все поля');
      return;
    }

    if (form.password.length < 6) {
      setError('Пароль должен быть не менее 6 символов');
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError('Пароли не совпадают');
      return;
    }

    setError('');
    setLoading(true);
    try {
      await register(form.email, form.password, form.firstName, form.lastName);
      toast.success('Регистрация прошла успешно');
      navigate('/');
    } catch (registerError: any) {
      setError(registerError?.message || 'Не удалось зарегистрироваться');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PublicLayout>
      <div className="container mx-auto flex min-h-[70vh] items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          <Link to="/" className="mb-8 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary">
            <ArrowLeft className="h-4 w-4" />
            На главную
          </Link>

          <div className="rounded-2xl border border-border bg-card p-8 shadow-card">
            <div className="mb-6 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
                <span className="font-heading text-xl text-primary-foreground">К</span>
              </div>
              <h1 className="font-heading text-2xl text-foreground">Создать аккаунт</h1>
              <p className="mt-1 text-sm text-muted-foreground">Зарегистрируйтесь, чтобы сохранять мероприятия</p>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="firstName">Имя</Label>
                  <Input
                    id="firstName"
                    value={form.firstName}
                    onChange={(event) => updateField('firstName', event.target.value)}
                    placeholder="Иван"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Фамилия</Label>
                  <Input
                    id="lastName"
                    value={form.lastName}
                    onChange={(event) => updateField('lastName', event.target.value)}
                    placeholder="Петров"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(event) => updateField('email', event.target.value)}
                  placeholder="your@email.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Пароль</Label>
                <Input
                  id="password"
                  type="password"
                  value={form.password}
                  onChange={(event) => updateField('password', event.target.value)}
                  placeholder="Минимум 6 символов"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Подтверждение пароля</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={form.confirmPassword}
                  onChange={(event) => updateField('confirmPassword', event.target.value)}
                  placeholder="Повторите пароль"
                />
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <Button className="w-full" type="submit" disabled={loading}>
                {loading ? 'Регистрация…' : 'Зарегистрироваться'}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              Уже есть аккаунт?{' '}
              <Link to="/login" className="font-semibold text-primary hover:underline">
                Войти
              </Link>
            </p>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
