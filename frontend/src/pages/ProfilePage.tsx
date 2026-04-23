import { useEffect, useState } from 'react';
import { Building2, ChevronDown, ChevronUp, KeyRound, Loader2, Upload, User } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { PublicLayout } from '@/layouts/PublicLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { authService } from '@/services/auth-service';
import { fileUploadService } from '@/services/file-upload-service';
import { imageSrc } from '@/lib/image';

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

function normalizeProfileForm(form: {
  login: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  avatarImageId: number | null;
  newEventsNotificationsEnabled: boolean;
}) {
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
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const updateField = (field: Exclude<keyof typeof form, 'avatarImageId' | 'newEventsNotificationsEnabled'>, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };
  const updateBooleanField = (field: 'newEventsNotificationsEnabled', value: boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };
  const updatePasswordField = (field: keyof typeof passwordForm, value: string) => {
    setPasswordForm((prev) => ({ ...prev, [field]: value }));
  };

  useEffect(() => {
    if (!user) return;
    setForm(buildProfileForm(user));
  }, [user?.id]);

  const normalizedForm = normalizeProfileForm(form);
  const currentUserForm = normalizeProfileForm(buildProfileForm(user));
  const hasProfileChanges = JSON.stringify(normalizedForm) !== JSON.stringify(currentUserForm);
  const hasPendingEmail = !!user?.pendingEmail && user.pendingEmail !== user.email;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!normalizedForm.login || !normalizedForm.email || !normalizedForm.firstName || !normalizedForm.lastName) {
      toast.error('Заполните обязательные поля');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedForm.email)) {
      toast.error('Введите корректный email');
      return;
    }

    setLoading(true);
    try {
      const updatedUser = await updateUser({
        login: normalizedForm.login,
        email: normalizedForm.email,
        firstName: normalizedForm.firstName,
        lastName: normalizedForm.lastName,
        phone: normalizedForm.phone,
        newEventsNotificationsEnabled: normalizedForm.newEventsNotificationsEnabled,
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
    if (form.avatarImageId == null) {
      return;
    }

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

  const resetProfileForm = () => {
    setForm(buildProfileForm(user));
  };

  const handlePasswordSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      toast.error('Заполните все поля для смены пароля');
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      toast.error('Новый пароль должен содержать минимум 6 символов');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('Подтверждение пароля не совпадает');
      return;
    }
    if (passwordForm.currentPassword === passwordForm.newPassword) {
      toast.error('Новый пароль должен отличаться от текущего');
      return;
    }

    setChangingPassword(true);
    try {
      await authService.changeCurrentPassword(passwordForm.currentPassword, passwordForm.newPassword);
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      toast.success('Пароль успешно изменён');
    } catch (error: any) {
      toast.error(error?.message || 'Не удалось изменить пароль');
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <PublicLayout>
      <div className="w-full px-4 py-8 md:px-8 xl:px-12">
        <h1 className="font-heading text-3xl text-foreground sm:text-4xl">Профиль</h1>
        <p className="mt-1 text-muted-foreground">Управляйте персональными данными</p>

        <div className="mt-8 rounded-2xl border border-border bg-card p-5 shadow-card sm:p-8">
          <div className="grid items-start gap-6 lg:grid-cols-[260px_1fr]">
            <aside className="self-start rounded-2xl border border-border p-5">
              <div className="mx-auto w-fit">
                {form.avatarImageId != null ? (
                  <img
                    src={imageSrc(form.avatarImageId)}
                    alt="Аватар пользователя"
                    className="h-32 w-32 rounded-full object-cover shadow-[0_16px_28px_-18px_rgba(0,0,0,0.55)] sm:h-36 sm:w-36"
                  />
                ) : (
                  <div className="flex h-32 w-32 items-center justify-center rounded-full bg-primary/10 shadow-[0_16px_28px_-18px_rgba(0,0,0,0.55)] sm:h-36 sm:w-36">
                    <User className="h-14 w-14 text-primary" />
                  </div>
                )}
              </div>
              <p className="mt-4 text-center font-heading text-base text-foreground">Фото профиля</p>
              <p className="mt-1 text-center text-xs text-muted-foreground">Показывается в вашем аккаунте</p>
              <div className="mt-4 text-center">
                <p className="font-heading text-xl text-foreground">{form.firstName || 'Имя'} {form.lastName || 'Фамилия'}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">{form.email || 'email не указан'}</p>
                <p className="text-xs text-muted-foreground">@{form.login || 'login'}</p>
              </div>

              <div className="mt-4 space-y-2">
                <Button type="button" variant="outline" className="w-full" size="sm" asChild disabled={uploadingAvatar}>
                  <label className="cursor-pointer">
                    {uploadingAvatar ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Upload className="mr-1.5 h-4 w-4" />}
                    {uploadingAvatar ? 'Загрузка…' : 'Загрузить аватар'}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={uploadAvatar}
                      disabled={uploadingAvatar}
                    />
                  </label>
                </Button>
                {form.avatarImageId != null && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="w-full"
                    onClick={() => void removeAvatar()}
                    disabled={uploadingAvatar}
                  >
                    Убрать аватар
                  </Button>
                )}
              </div>
            </aside>

            <div>
              <form onSubmit={handleSubmit} className="space-y-5">
                {user?.organization && (
                  <div className="rounded-xl border border-border bg-muted/40 p-4">
                    <p className="mb-2 inline-flex items-center gap-1.5 text-sm font-semibold text-foreground">
                      <Building2 className="h-4 w-4 text-primary" />
                      Организация
                    </p>
                    <p className="text-sm text-foreground">{user.organization.name}</p>
                    {user.organization.contacts && (
                      <p className="mt-1 text-xs text-muted-foreground">{user.organization.contacts}</p>
                    )}
                    <Link
                      to={`/organizations/${user.organization.id}`}
                      className="mt-2 inline-flex text-xs font-medium text-primary hover:underline"
                    >
                      Перейти на страницу организации
                    </Link>
                  </div>
                )}

                <section className="rounded-xl border border-border p-4">
                  <p className="font-heading text-lg text-foreground">Аккаунт</p>
                  <p className="mb-4 mt-1 text-xs text-muted-foreground">Логин и email используются для входа и должны быть уникальными.</p>
                  {user && (
                    <p className="mb-4 rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                      Статус email: {user.emailVerified ? 'подтвержден' : 'не подтвержден'}
                    </p>
                  )}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="login">Логин *</Label>
                      <div className="relative">
                        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                          @
                        </span>
                        <Input
                          id="login"
                          value={form.login}
                          onChange={(event) => updateField('login', event.target.value)}
                          className="pl-7"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={form.email}
                        onChange={(event) => updateField('email', event.target.value)}
                      />
                    </div>
                  </div>
                  {hasPendingEmail && (
                    <p className="mt-3 rounded-lg border border-amber-300/60 bg-amber-100/50 px-3 py-2 text-xs text-amber-900">
                      Новый email ожидает подтверждения: {user?.pendingEmail}. Пока для входа используется текущий адрес.
                    </p>
                  )}
                </section>

                <section className="rounded-xl border border-border p-4">
                  <p className="font-heading text-lg text-foreground">Личные данные</p>
                  <p className="mb-4 mt-1 text-xs text-muted-foreground">Эти данные видны только вам и используются для связи.</p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">Имя *</Label>
                      <Input
                        id="firstName"
                        value={form.firstName}
                        onChange={(event) => updateField('firstName', event.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Фамилия *</Label>
                      <Input
                        id="lastName"
                        value={form.lastName}
                        onChange={(event) => updateField('lastName', event.target.value)}
                      />
                    </div>
                  </div>
                  <div className="mt-4 space-y-2">
                    <Label htmlFor="phone">Телефон</Label>
                    <Input
                      id="phone"
                      value={form.phone}
                      onChange={(event) => updateField('phone', event.target.value)}
                      placeholder="+7 900 123-45-67"
                    />
                  </div>
                </section>

                <section className="rounded-xl border border-border p-4">
                  <p className="font-heading text-lg text-foreground">Уведомления</p>
                  <p className="mb-4 mt-1 text-xs text-muted-foreground">Настройте получение анонсов о новых мероприятиях на email.</p>
                  <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 px-3 py-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">Новые мероприятия</p>
                      <p className="text-xs text-muted-foreground">Письма будут приходить на {form.email || 'ваш email'}</p>
                    </div>
                    <Switch
                      checked={form.newEventsNotificationsEnabled}
                      onCheckedChange={(checked) => updateBooleanField('newEventsNotificationsEnabled', checked)}
                      aria-label="Подписка на новые мероприятия"
                    />
                  </div>
                </section>

                <div className="flex flex-wrap items-center gap-2">
                  <Button type="submit" disabled={loading || uploadingAvatar || !hasProfileChanges}>
                    {loading ? 'Сохранение…' : 'Сохранить изменения'}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={loading || !hasProfileChanges}
                    onClick={resetProfileForm}
                  >
                    Отменить изменения
                  </Button>
                </div>
              </form>

              <div className="mt-5 flex border-t border-border pt-4">
                <Button
                  type="button"
                  variant="outline"
                  className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => {
                    logout();
                    toast.success('Вы вышли из аккаунта');
                  }}
                >
                  Выйти
                </Button>
              </div>

              <div className="mt-8 border-t border-border pt-6">
                <Button
                  type="button"
                  variant="ghost"
                  className="mb-2 flex w-full items-center justify-between px-0 text-left hover:bg-transparent"
                  onClick={() => setPasswordSectionOpen((prev) => !prev)}
                >
                  <span className="inline-flex items-center gap-2 font-heading text-lg text-foreground">
                    <KeyRound className="h-5 w-5 text-primary" />
                    Смена пароля
                  </span>
                  {passwordSectionOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </Button>
                {passwordSectionOpen && (
                  <form onSubmit={handlePasswordSubmit} className="space-y-4 rounded-xl border border-border bg-muted/20 p-4">
                    <div className="space-y-2">
                      <Label htmlFor="currentPassword">Текущий пароль</Label>
                      <Input
                        id="currentPassword"
                        type="password"
                        value={passwordForm.currentPassword}
                        onChange={(event) => updatePasswordField('currentPassword', event.target.value)}
                        autoComplete="current-password"
                      />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="newPassword">Новый пароль</Label>
                        <Input
                          id="newPassword"
                          type="password"
                          value={passwordForm.newPassword}
                          onChange={(event) => updatePasswordField('newPassword', event.target.value)}
                          autoComplete="new-password"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="confirmPassword">Подтверждение</Label>
                        <Input
                          id="confirmPassword"
                          type="password"
                          value={passwordForm.confirmPassword}
                          onChange={(event) => updatePasswordField('confirmPassword', event.target.value)}
                          autoComplete="new-password"
                        />
                      </div>
                    </div>
                    <Button type="submit" variant="outline" disabled={changingPassword}>
                      {changingPassword ? 'Обновляем пароль…' : 'Изменить пароль'}
                    </Button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
