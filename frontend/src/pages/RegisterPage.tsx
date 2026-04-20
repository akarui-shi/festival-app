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
  const [showOrganizationSuggestions, setShowOrganizationSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const updateField = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  useEffect(() => {
    if (form.role !== 'ORGANIZER' || form.organizationMode !== 'join') {
      setShowOrganizationSuggestions(false);
      setOrganizations([]);
      return;
    }

    const query = form.organizationSearch.trim();
    if (query.length < 2) {
      setOrganizations([]);
      return;
    }

    organizationService.getOrganizations(query)
      .then((response) => setOrganizations(response))
      .catch(() => setOrganizations([]));
  }, [form.organizationMode, form.organizationSearch, form.role]);

  useEffect(() => {
    if (form.role !== 'ORGANIZER') {
      setForm((prev) => ({
        ...prev,
        organizationMode: 'create',
        organizationSearch: '',
        organizationId: '',
        joinRequestMessage: '',
      }));
    }
  }, [form.role]);

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
      toast.success(
        form.organizationMode === 'join'
          ? 'Регистрация выполнена. Заявка отправлена владельцу организации на подтверждение.'
          : 'Регистрация прошла успешно',
      );
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
                  <div className="relative space-y-2">
                    <Label htmlFor="organizationSearch">Поиск организации</Label>
                    <Input
                      id="organizationSearch"
                      value={form.organizationSearch}
                      onFocus={() => setShowOrganizationSuggestions(true)}
                      onChange={(event) => {
                        updateField('organizationSearch', event.target.value);
                        updateField('organizationId', '');
                        setShowOrganizationSuggestions(true);
                      }}
                      placeholder="Введите название"
                    />
                    {showOrganizationSuggestions && organizations.length > 0 && (
                      <div className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-md border border-border bg-card shadow-lg">
                        {organizations.map((organization) => (
                          <button
                            key={organization.id}
                            type="button"
                            className="block w-full px-3 py-2 text-left text-sm hover:bg-muted"
                            onClick={() => {
                              updateField('organizationSearch', organization.name);
                              updateField('organizationId', String(organization.id));
                              setShowOrganizationSuggestions(false);
                            }}
                          >
                            <p className="font-medium text-foreground">{organization.name}</p>
                            {organization.description && (
                              <p className="line-clamp-1 text-xs text-muted-foreground">{organization.description}</p>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                    {form.organizationSearch.trim().length >= 2 && organizations.length === 0 && (
                      <p className="text-xs text-muted-foreground">По вашему запросу организации не найдены</p>
                    )}
                  </div>
                  {form.organizationId && (
                    <p className="rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-xs text-primary">
                      Выбрана организация: {form.organizationSearch}
                    </p>
                  )}
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
