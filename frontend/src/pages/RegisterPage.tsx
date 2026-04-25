import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { PublicLayout } from '@/layouts/PublicLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { organizationService } from '@/services/organization-service';
import type { Organization } from '@/types';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const subscribeByDefault = searchParams.get('subscribe') === '1';
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
    newEventsNotificationsEnabled: subscribeByDefault,
  });
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [showOrganizationSuggestions, setShowOrganizationSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const updateField = (field: Exclude<keyof typeof form, 'newEventsNotificationsEnabled'>, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };
  const updateBooleanField = (field: 'newEventsNotificationsEnabled', value: boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  useEffect(() => {
    if (form.role !== 'ORGANIZER' || form.organizationMode !== 'join') {
      setShowOrganizationSuggestions(false);
      setOrganizations([]);
      return;
    }
    const query = form.organizationSearch.trim();
    if (query.length < 2) { setOrganizations([]); return; }
    organizationService.getOrganizations(query)
      .then((response) => setOrganizations(response))
      .catch(() => setOrganizations([]));
  }, [form.organizationMode, form.organizationSearch, form.role]);

  useEffect(() => {
    if (form.role !== 'ORGANIZER') {
      setForm((prev) => ({ ...prev, organizationMode: 'create', organizationSearch: '', organizationId: '', joinRequestMessage: '' }));
    }
  }, [form.role]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.firstName || !form.lastName || !form.email || !form.password || !form.confirmPassword) { setError('Заполните все поля'); return; }
    if (form.password.length < 6) { setError('Пароль должен быть не менее 6 символов'); return; }
    if (form.password !== form.confirmPassword) { setError('Пароли не совпадают'); return; }
    if (form.role === 'ORGANIZER' && form.organizationMode === 'create' && !form.companyName.trim()) { setError('Укажите название организации'); return; }
    if (form.role === 'ORGANIZER' && form.organizationMode === 'join' && !form.organizationId) { setError('Выберите организацию'); return; }

    setError('');
    setLoading(true);
    try {
      const response = await register(
        form.email, form.password, form.firstName, form.lastName, form.newEventsNotificationsEnabled, form.role,
        form.role === 'ORGANIZER' && form.organizationMode === 'create' ? form.companyName : undefined,
        form.role === 'ORGANIZER' && form.organizationMode === 'join' ? Number(form.organizationId) : undefined,
        form.role === 'ORGANIZER' && form.organizationMode === 'join' ? form.joinRequestMessage : undefined,
      );
      toast.success(response.message || 'Регистрация прошла успешно. Проверьте почту для подтверждения.');
      navigate('/login');
    } catch (registerError: any) {
      setError(registerError?.message || 'Не удалось зарегистрироваться');
    } finally {
      setLoading(false);
    }
  };

  const roleTabClass = (active: boolean) =>
    `flex-1 rounded-xl border px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
      active ? 'border-primary bg-primary/10 text-primary shadow-sm' : 'border-border text-muted-foreground hover:border-primary/30 hover:text-foreground'
    }`;

  return (
    <PublicLayout>
      <div className="relative flex min-h-screen items-start justify-center overflow-hidden px-4 py-10">
        {/* Background */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[hsl(var(--warm-cream))] via-background to-[hsl(var(--golden-light)/0.2)]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_-10%,hsl(var(--terracotta)/0.07),transparent)]" />

        <div className="relative w-full max-w-[460px]">
          <Link to="/" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-primary">
            <ArrowLeft className="h-4 w-4" />
            На главную
          </Link>

          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-lifted">
            {/* Header */}
            <div className="border-b border-border bg-gradient-to-br from-[hsl(var(--warm-cream)/0.6)] to-card px-8 py-7 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-[hsl(var(--terracotta-dark))] shadow-md">
                <span className="font-heading text-2xl font-bold text-primary-foreground">К</span>
              </div>
              <h1 className="font-heading text-2xl text-foreground">Создать аккаунт</h1>
              <p className="mt-1.5 text-sm text-muted-foreground">Зарегистрируйтесь, чтобы сохранять мероприятия</p>
            </div>

            <div className="px-8 py-6">
              <form className="space-y-4" onSubmit={handleSubmit}>
                {/* Role selector */}
                <div className="space-y-1.5">
                  <Label>Тип аккаунта</Label>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => updateField('role', 'RESIDENT')} className={roleTabClass(form.role === 'RESIDENT')}>
                      Житель
                    </button>
                    <button type="button" onClick={() => updateField('role', 'ORGANIZER')} className={roleTabClass(form.role === 'ORGANIZER')}>
                      Организатор
                    </button>
                  </div>
                </div>

                {/* Organization mode */}
                {form.role === 'ORGANIZER' && (
                  <div className="space-y-1.5">
                    <Label>Организация</Label>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => updateField('organizationMode', 'create')} className={roleTabClass(form.organizationMode === 'create')}>
                        Создать новую
                      </button>
                      <button type="button" onClick={() => updateField('organizationMode', 'join')} className={roleTabClass(form.organizationMode === 'join')}>
                        Присоединиться
                      </button>
                    </div>
                  </div>
                )}

                {/* Name */}
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="firstName">Имя</Label>
                    <Input id="firstName" value={form.firstName} onChange={(e) => updateField('firstName', e.target.value)} placeholder="Иван" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="lastName">Фамилия</Label>
                    <Input id="lastName" value={form.lastName} onChange={(e) => updateField('lastName', e.target.value)} placeholder="Петров" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={form.email} onChange={(e) => updateField('email', e.target.value)} placeholder="your@email.com" />
                </div>

                {/* New org name */}
                {form.role === 'ORGANIZER' && form.organizationMode === 'create' && (
                  <div className="space-y-1.5">
                    <Label htmlFor="companyName">Название организации</Label>
                    <Input id="companyName" value={form.companyName} onChange={(e) => updateField('companyName', e.target.value)} placeholder="Название организации" />
                  </div>
                )}

                {/* Join org search */}
                {form.role === 'ORGANIZER' && form.organizationMode === 'join' && (
                  <>
                    <div className="relative space-y-1.5">
                      <Label htmlFor="organizationSearch">Поиск организации</Label>
                      <Input
                        id="organizationSearch"
                        value={form.organizationSearch}
                        onFocus={() => setShowOrganizationSuggestions(true)}
                        onChange={(e) => { updateField('organizationSearch', e.target.value); updateField('organizationId', ''); setShowOrganizationSuggestions(true); }}
                        placeholder="Введите название"
                      />
                      {showOrganizationSuggestions && organizations.length > 0 && (
                        <div className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-border bg-card shadow-card">
                          {organizations.map((org) => (
                            <button
                              key={org.id}
                              type="button"
                              className="block w-full px-4 py-2.5 text-left text-sm transition-colors hover:bg-muted"
                              onClick={() => { updateField('organizationSearch', org.name); updateField('organizationId', String(org.id)); setShowOrganizationSuggestions(false); }}
                            >
                              <p className="font-medium text-foreground">{org.name}</p>
                              {org.description && <p className="line-clamp-1 text-xs text-muted-foreground">{org.description}</p>}
                            </button>
                          ))}
                        </div>
                      )}
                      {form.organizationSearch.trim().length >= 2 && organizations.length === 0 && (
                        <p className="text-xs text-muted-foreground">Организации не найдены</p>
                      )}
                    </div>
                    {form.organizationId && (
                      <p className="rounded-xl border border-primary/25 bg-primary/5 px-3.5 py-2 text-sm font-medium text-primary">
                        Выбрано: {form.organizationSearch}
                      </p>
                    )}
                    <div className="space-y-1.5">
                      <Label htmlFor="joinRequestMessage">Комментарий к заявке</Label>
                      <Input id="joinRequestMessage" value={form.joinRequestMessage} onChange={(e) => updateField('joinRequestMessage', e.target.value)} placeholder="Коротко о себе (необязательно)" />
                    </div>
                  </>
                )}

                {/* Passwords */}
                <div className="space-y-1.5">
                  <Label htmlFor="password">Пароль</Label>
                  <Input id="password" type="password" value={form.password} onChange={(e) => updateField('password', e.target.value)} placeholder="Минимум 6 символов" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="confirmPassword">Подтверждение пароля</Label>
                  <Input id="confirmPassword" type="password" value={form.confirmPassword} onChange={(e) => updateField('confirmPassword', e.target.value)} placeholder="Повторите пароль" />
                </div>

                {/* Notifications toggle */}
                <div className="rounded-xl border border-border bg-muted/40 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">Уведомления о мероприятиях</p>
                      <p className="text-xs text-muted-foreground">Анонсы новых событий на email</p>
                    </div>
                    <Switch
                      checked={form.newEventsNotificationsEnabled}
                      onCheckedChange={(checked) => updateBooleanField('newEventsNotificationsEnabled', checked)}
                      aria-label="Подписка на уведомления"
                    />
                  </div>
                </div>

                {error && (
                  <p className="rounded-lg bg-destructive/8 px-3 py-2 text-sm text-destructive">{error}</p>
                )}

                <Button className="w-full shadow-sm shadow-primary/20" type="submit" disabled={loading}>
                  {loading ? 'Регистрация…' : 'Зарегистрироваться'}
                </Button>
              </form>

              <p className="mt-5 text-center text-sm text-muted-foreground">
                Уже есть аккаунт?{' '}
                <Link to="/login" className="font-semibold text-primary hover:underline">
                  Войти
                </Link>
              </p>
            </div>
          </div>

          <p className="mt-5 flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5" />
            Культурные события малых городов России
          </p>
        </div>
      </div>
    </PublicLayout>
  );
}
