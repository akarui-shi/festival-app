import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { PublicLayout } from '@/layouts/PublicLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { organizationService } from '@/services/organization-service';
import type { Organization } from '@/types';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'RESIDENT' as 'RESIDENT' | 'ORGANIZER',
    organizationMode: 'create' as 'create' | 'join',
    companyName: '',
    organizationSearch: '',
    organizationId: '',
    joinRequestMessage: '',
  });
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const updateField = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  useEffect(() => {
    if (form.role !== 'ORGANIZER' || form.organizationMode !== 'join') {
      return;
    }

    organizationService.getOrganizations(form.organizationSearch)
      .then((response) => setOrganizations(response))
      .catch(() => setOrganizations([]));
  }, [form.organizationMode, form.organizationSearch, form.role]);

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

    if (form.role === 'ORGANIZER' && form.organizationMode === 'create' && !form.companyName.trim()) {
      setError('Для организатора укажите название организации');
      return;
    }

    if (form.role === 'ORGANIZER' && form.organizationMode === 'join' && !form.organizationId) {
      setError('Выберите организацию для присоединения');
      return;
    }

    setError('');
    setLoading(true);
    try {
      await register(
        form.email,
        form.password,
        form.firstName,
        form.lastName,
        form.role,
        form.role === 'ORGANIZER' && form.organizationMode === 'create' ? form.companyName : undefined,
        form.role === 'ORGANIZER' && form.organizationMode === 'join' ? Number(form.organizationId) : undefined,
        form.role === 'ORGANIZER' && form.organizationMode === 'join' ? form.joinRequestMessage : undefined,
      );
      toast.success(form.organizationMode === 'join' ? 'Регистрация выполнена, заявка отправлена' : 'Регистрация прошла успешно');
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
              <div className="space-y-2">
                <Label>Тип аккаунта</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => updateField('role', 'RESIDENT')}
                    className={`rounded-lg border px-3 py-2 text-sm transition-colors ${
                      form.role === 'RESIDENT'
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border text-muted-foreground hover:border-primary/40'
                    }`}
                  >
                    Житель
                  </button>
                  <button
                    type="button"
                    onClick={() => updateField('role', 'ORGANIZER')}
                    className={`rounded-lg border px-3 py-2 text-sm transition-colors ${
                      form.role === 'ORGANIZER'
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border text-muted-foreground hover:border-primary/40'
                    }`}
                  >
                    Организатор
                  </button>
                </div>
              </div>

              {form.role === 'ORGANIZER' && (
                <div className="space-y-2">
                  <Label>Организация</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => updateField('organizationMode', 'create')}
                      className={`rounded-lg border px-3 py-2 text-sm transition-colors ${
                        form.organizationMode === 'create'
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border text-muted-foreground hover:border-primary/40'
                      }`}
                    >
                      Создать новую
                    </button>
                    <button
                      type="button"
                      onClick={() => updateField('organizationMode', 'join')}
                      className={`rounded-lg border px-3 py-2 text-sm transition-colors ${
                        form.organizationMode === 'join'
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border text-muted-foreground hover:border-primary/40'
                      }`}
                    >
                      Присоединиться
                    </button>
                  </div>
                </div>
              )}

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

              {form.role === 'ORGANIZER' && form.organizationMode === 'create' && (
                <div className="space-y-2">
                  <Label htmlFor="companyName">Название новой организации</Label>
                  <Input
                    id="companyName"
                    value={form.companyName}
                    onChange={(event) => updateField('companyName', event.target.value)}
                    placeholder="Название организации"
                  />
                </div>
              )}

              {form.role === 'ORGANIZER' && form.organizationMode === 'join' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="organizationSearch">Поиск организации</Label>
                    <Input
                      id="organizationSearch"
                      value={form.organizationSearch}
                      onChange={(event) => updateField('organizationSearch', event.target.value)}
                      placeholder="Введите название"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="organizationId">Выберите организацию</Label>
                    <select
                      id="organizationId"
                      value={form.organizationId}
                      onChange={(event) => updateField('organizationId', event.target.value)}
                      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    >
                      <option value="">Не выбрано</option>
                      {organizations.map((organization) => (
                        <option key={organization.id} value={String(organization.id)}>
                          {organization.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="joinRequestMessage">Комментарий к заявке</Label>
                    <Input
                      id="joinRequestMessage"
                      value={form.joinRequestMessage}
                      onChange={(event) => updateField('joinRequestMessage', event.target.value)}
                      placeholder="Коротко о себе (необязательно)"
                    />
                  </div>
                </>
              )}

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
