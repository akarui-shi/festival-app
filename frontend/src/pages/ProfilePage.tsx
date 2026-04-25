import { useEffect, useState } from 'react';
import { Building2, ChevronDown, ChevronUp, Heart, KeyRound, Loader2, Upload, User } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { PublicLayout } from '@/layouts/PublicLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { authService } from '@/services/auth-service';
import { directoryService } from '@/services/directory-service';
import { fileUploadService } from '@/services/file-upload-service';
import { imageSrc } from '@/lib/image';
import type { Category } from '@/types';

function buildProfileForm(user: {
  login?: string | null;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  avatarImageId?: number | null;
  newEventsNotificationsEnabled?: boolean;
} | null | undefined) {
  return {
    login: user?.login || '',
    email: user?.email || '',
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    phone: user?.phone || '',
    avatarImageId: user?.avatarImageId || null,
    newEventsNotificationsEnabled: Boolean(user?.newEventsNotificationsEnabled),
  };
}

function normalizeProfileForm(form: ReturnType<typeof buildProfileForm>) {
  return {
    login: form.login.trim(),
    email: form.email.trim(),
    firstName: form.firstName.trim(),
    lastName: form.lastName.trim(),
    phone: form.phone.trim(),
    avatarImageId: form.avatarImageId,
    newEventsNotificationsEnabled: form.newEventsNotificationsEnabled,
  };
}

export default function ProfilePage() {
  const { user, updateUser, logout } = useAuth();
  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordSectionOpen, setPasswordSectionOpen] = useState(false);
  const [form, setForm] = useState(buildProfileForm(user));
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedInterests, setSelectedInterests] = useState<number[]>([]);
  const [savingInterests, setSavingInterests] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });

  const updateField = (field: Exclude<keyof typeof form, 'avatarImageId' | 'newEventsNotificationsEnabled'>, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };
  const updateBooleanField = (field: 'newEventsNotificationsEnabled', value: boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };
  const updatePasswordField = (field: keyof typeof passwordForm, value: string) => {
    setPasswordForm((prev) => ({ ...prev, [field]: value }));
  };

  useEffect(() => { if (!user) return; setForm(buildProfileForm(user)); }, [user?.id]);

  useEffect(() => {
    directoryService.getCategories().then(setCategories).catch(() => {});
    if (user) authService.getMyInterests().then(setSelectedInterests).catch(() => {});
  }, [user?.id]);

  const toggleInterest = (categoryId: number) => {
    setSelectedInterests((prev) => prev.includes(categoryId) ? prev.filter((id) => id !== categoryId) : [...prev, categoryId]);
  };

  const saveInterests = async () => {
    setSavingInterests(true);
    try { await authService.updateMyInterests(selectedInterests); toast.success('Интересы сохранены'); }
    catch { toast.error('Не удалось сохранить интересы'); }
    finally { setSavingInterests(false); }
  };

  const normalizedForm = normalizeProfileForm(form);
  const currentUserForm = normalizeProfileForm(buildProfileForm(user));
  const hasProfileChanges = JSON.stringify(normalizedForm) !== JSON.stringify(currentUserForm);
  const hasPendingEmail = !!user?.pendingEmail && user.pendingEmail !== user.email;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!normalizedForm.login || !normalizedForm.email || !normalizedForm.firstName || !normalizedForm.lastName) {
      toast.error('Заполните обязательные поля'); return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedForm.email)) {
      toast.error('Введите корректный email'); return;
    }
    setLoading(true);
    try {
      const updatedUser = await updateUser({
        login: normalizedForm.login, email: normalizedForm.email,
        firstName: normalizedForm.firstName, lastName: normalizedForm.lastName,
        phone: normalizedForm.phone, newEventsNotificationsEnabled: normalizedForm.newEventsNotificationsEnabled,
        avatarImageId: normalizedForm.avatarImageId,
      });
      setForm(buildProfileForm(updatedUser));
      if (updatedUser.pendingEmail && updatedUser.pendingEmail !== updatedUser.email && updatedUser.pendingEmail === normalizedForm.email) {
        toast.success('Изменения сохранены. Подтвердите новый email по ссылке из письма.');
      } else {
        toast.success('Профиль обновлён');
      }
    } catch (error: any) {
      toast.error(error?.message || 'Не удалось сохранить изменения');
    } finally {
      setLoading(false);
    }
  };

  const uploadAvatar: React.ChangeEventHandler<HTMLInputElement> = async (event) => {
    const file = event.target.files?.[0];
    event.currentTarget.value = '';
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const uploaded = await fileUploadService.uploadAvatar(file);
      const updatedUser = await updateUser({ avatarImageId: uploaded.imageId });
      setForm(buildProfileForm(updatedUser));
      toast.success('Аватар загружен');
    } catch (error: any) {
      toast.error(error?.message || 'Не удалось загрузить аватар');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const removeAvatar = async () => {
    if (form.avatarImageId == null) return;
    setUploadingAvatar(true);
    try {
      const updatedUser = await updateUser({ avatarImageId: null });
      setForm(buildProfileForm(updatedUser));
      toast.success('Аватар удалён');
    } catch (error: any) {
      toast.error(error?.message || 'Не удалось удалить аватар');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handlePasswordSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      toast.error('Заполните все поля для смены пароля'); return;
    }
    if (passwordForm.newPassword.length < 6) { toast.error('Новый пароль должен содержать минимум 6 символов'); return; }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) { toast.error('Подтверждение пароля не совпадает'); return; }
    if (passwordForm.currentPassword === passwordForm.newPassword) { toast.error('Новый пароль должен отличаться от текущего'); return; }
    setChangingPassword(true);
    try {
      await authService.changeCurrentPassword(passwordForm.currentPassword, passwordForm.newPassword);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      toast.success('Пароль успешно изменён');
    } catch (error: any) {
      toast.error(error?.message || 'Не удалось изменить пароль');
    } finally {
      setChangingPassword(false);
    }
  };

  const initials = [form.firstName, form.lastName].filter(Boolean).map((n) => n[0].toUpperCase()).join('') || '?';

  return (
    <PublicLayout>
      {/* Hero banner */}
      <div className="relative overflow-hidden border-b border-border bg-gradient-to-br from-[hsl(var(--warm-cream))] via-background to-[hsl(var(--golden-light)/0.2)]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_70%_-10%,hsl(var(--terracotta)/0.07),transparent)]" />
        <div className="container relative mx-auto flex flex-wrap items-end gap-6 px-4 py-10">
          {/* Avatar */}
          <div className="relative shrink-0">
            {form.avatarImageId != null ? (
              <img
                src={imageSrc(form.avatarImageId)}
                alt="Аватар"
                className="h-24 w-24 rounded-2xl object-cover shadow-card ring-4 ring-card"
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/80 to-[hsl(var(--terracotta-dark)/0.7)] shadow-card ring-4 ring-card">
                <span className="font-heading text-3xl font-bold text-white">{initials}</span>
              </div>
            )}
            <label className="absolute -bottom-2 -right-2 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-border bg-card shadow-soft transition-shadow hover:shadow-card" title="Загрузить аватар">
              {uploadingAvatar ? <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" /> : <Upload className="h-3.5 w-3.5 text-muted-foreground" />}
              <input type="file" accept="image/*" className="hidden" onChange={uploadAvatar} disabled={uploadingAvatar} />
            </label>
          </div>

          <div className="min-w-0">
            <h1 className="font-heading text-3xl text-foreground">
              {form.firstName || 'Имя'} {form.lastName || 'Фамилия'}
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">@{form.login || 'login'} · {form.email || 'email'}</p>
            {form.avatarImageId != null && (
              <button
                type="button"
                className="mt-2 text-xs text-muted-foreground underline-offset-2 hover:text-destructive hover:underline"
                onClick={() => void removeAvatar()}
                disabled={uploadingAvatar}
              >
                Убрать фото
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-3xl px-4 py-8">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Organization */}
          {user?.organization && (
            <div className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4 shadow-soft">
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <Building2 className="h-4.5 w-4.5 text-primary" style={{ width: 18, height: 18 }} />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-foreground">{user.organization.name}</p>
                {user.organization.contacts && <p className="mt-0.5 text-xs text-muted-foreground">{user.organization.contacts}</p>}
                <Link to={`/organizations/${user.organization.id}`} className="mt-1 inline-flex text-xs font-medium text-primary hover:underline">
                  Перейти на страницу организации
                </Link>
              </div>
            </div>
          )}

          {/* Account section */}
          <section className="surface-panel space-y-4">
            <div>
              <h2 className="font-heading text-lg text-foreground">Аккаунт</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">Логин и email используются для входа и должны быть уникальными.</p>
            </div>

            {user && (
              <p className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
                user.emailVerified ? 'bg-[hsl(var(--success)/0.1)] text-[hsl(var(--success))]' : 'bg-[hsl(var(--warning)/0.1)] text-[hsl(var(--warning))]'
              }`}>
                {user.emailVerified ? 'Email подтверждён' : 'Email не подтверждён'}
              </p>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="login">Логин *</Label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">@</span>
                  <Input id="login" value={form.login} onChange={(e) => updateField('login', e.target.value)} className="pl-7" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email *</Label>
                <Input id="email" type="email" value={form.email} onChange={(e) => updateField('email', e.target.value)} />
              </div>
            </div>

            {hasPendingEmail && (
              <p className="rounded-xl border border-amber-300/50 bg-amber-50/60 px-4 py-2.5 text-sm text-amber-900">
                Новый email <span className="font-semibold">{user?.pendingEmail}</span> ожидает подтверждения. Для входа пока используется текущий адрес.
              </p>
            )}
          </section>

          {/* Personal data */}
          <section className="surface-panel space-y-4">
            <div>
              <h2 className="font-heading text-lg text-foreground">Личные данные</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">Эти данные видны только вам и используются для связи.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="firstName">Имя *</Label>
                <Input id="firstName" value={form.firstName} onChange={(e) => updateField('firstName', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lastName">Фамилия *</Label>
                <Input id="lastName" value={form.lastName} onChange={(e) => updateField('lastName', e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Телефон</Label>
              <Input id="phone" value={form.phone} onChange={(e) => updateField('phone', e.target.value)} placeholder="+7 900 123-45-67" />
            </div>
          </section>

          {/* Interests */}
          {categories.length > 0 && (
            <section className="surface-panel space-y-4">
              <div>
                <h2 className="font-heading text-lg text-foreground">Мои интересы</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">Выберите категории — они улучшат персональные рекомендации.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {categories.map((category) => {
                  const active = selectedInterests.includes(Number(category.id));
                  return (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => toggleInterest(Number(category.id))}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm transition-all duration-150 ${
                        active
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground'
                      }`}
                    >
                      {active && <Heart className="h-3 w-3 fill-current" />}
                      {category.name}
                    </button>
                  );
                })}
              </div>
              <Button type="button" size="sm" onClick={() => void saveInterests()} disabled={savingInterests}>
                {savingInterests ? 'Сохранение…' : 'Сохранить интересы'}
              </Button>
            </section>
          )}

          {/* Notifications */}
          <section className="surface-panel">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="font-heading text-lg text-foreground">Уведомления</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Анонсы событий будут приходить на {form.email || 'ваш email'}
                </p>
              </div>
              <Switch
                checked={form.newEventsNotificationsEnabled}
                onCheckedChange={(checked) => updateBooleanField('newEventsNotificationsEnabled', checked)}
                aria-label="Подписка на новые мероприятия"
              />
            </div>
          </section>

          {/* Action bar */}
          <div className="flex flex-wrap items-center gap-2">
            <Button type="submit" disabled={loading || uploadingAvatar || !hasProfileChanges} className="shadow-sm shadow-primary/20">
              {loading ? 'Сохранение…' : 'Сохранить изменения'}
            </Button>
            <Button type="button" variant="ghost" disabled={loading || !hasProfileChanges} onClick={() => setForm(buildProfileForm(user))}>
              Отменить
            </Button>
            <div className="ml-auto">
              <Button
                type="button"
                variant="outline"
                className="border-destructive/30 text-destructive hover:bg-destructive/8 hover:text-destructive"
                onClick={() => { logout(); toast.success('Вы вышли из аккаунта'); }}
              >
                Выйти из аккаунта
              </Button>
            </div>
          </div>
        </form>

        {/* Password section */}
        <div className="mt-4 surface-panel">
          <button
            type="button"
            className="flex w-full items-center justify-between"
            onClick={() => setPasswordSectionOpen((prev) => !prev)}
          >
            <span className="inline-flex items-center gap-2.5 font-heading text-lg text-foreground">
              <KeyRound className="h-5 w-5 text-primary" />
              Смена пароля
            </span>
            {passwordSectionOpen
              ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
              : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </button>

          {passwordSectionOpen && (
            <form onSubmit={handlePasswordSubmit} className="mt-4 space-y-4 rounded-xl border border-border bg-muted/30 p-4">
              <div className="space-y-1.5">
                <Label htmlFor="currentPassword">Текущий пароль</Label>
                <Input id="currentPassword" type="password" value={passwordForm.currentPassword} onChange={(e) => updatePasswordField('currentPassword', e.target.value)} autoComplete="current-password" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="newPassword">Новый пароль</Label>
                  <Input id="newPassword" type="password" value={passwordForm.newPassword} onChange={(e) => updatePasswordField('newPassword', e.target.value)} autoComplete="new-password" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="confirmPassword">Подтверждение</Label>
                  <Input id="confirmPassword" type="password" value={passwordForm.confirmPassword} onChange={(e) => updatePasswordField('confirmPassword', e.target.value)} autoComplete="new-password" />
                </div>
              </div>
              <Button type="submit" variant="outline" disabled={changingPassword}>
                {changingPassword ? 'Обновляем пароль…' : 'Изменить пароль'}
              </Button>
            </form>
          )}
        </div>
      </div>
    </PublicLayout>
  );
}
