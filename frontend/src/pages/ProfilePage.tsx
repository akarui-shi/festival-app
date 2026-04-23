import { useState } from 'react';
import { Building2, KeyRound, Loader2, Upload, User } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { PublicLayout } from '@/layouts/PublicLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { authService } from '@/services/auth-service';
import { fileUploadService } from '@/services/file-upload-service';
import { imageSrc } from '@/lib/image';

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [form, setForm] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    phone: user?.phone || '',
    avatarImageId: user?.avatarImageId || null,
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const updateField = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };
  const updatePasswordField = (field: keyof typeof passwordForm, value: string) => {
    setPasswordForm((prev) => ({ ...prev, [field]: value }));
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

  const uploadAvatar: React.ChangeEventHandler<HTMLInputElement> = async (event) => {
    const file = event.target.files?.[0];
    event.currentTarget.value = '';
    if (!file) return;

    setUploadingAvatar(true);
    try {
      const uploaded = await fileUploadService.uploadAvatar(file);
      setForm((prev) => ({ ...prev, avatarImageId: uploaded.imageId }));
      toast.success('Аватар загружен');
    } catch (error: any) {
      toast.error(error?.message || 'Не удалось загрузить аватар');
    } finally {
      setUploadingAvatar(false);
    }
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
      <div className="container mx-auto px-4 py-8">
        <h1 className="font-heading text-3xl text-foreground sm:text-4xl">Профиль</h1>
        <p className="mt-1 text-muted-foreground">Управляйте персональными данными</p>

        <div className="mt-8 max-w-2xl rounded-2xl border border-border bg-card p-6 shadow-card sm:p-8">
          <div className="mb-6 flex items-center gap-3">
            {form.avatarImageId != null ? (
              <img
                src={imageSrc(form.avatarImageId)}
                alt="Аватар пользователя"
                className="h-12 w-12 rounded-xl object-cover"
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <User className="h-6 w-6 text-primary" />
              </div>
            )}
            <div>
              <p className="font-heading text-xl text-foreground">{user?.firstName} {user?.lastName}</p>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
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

            <div className="space-y-2">
              <Label>Аватар</Label>
              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" variant="outline" size="sm" asChild disabled={uploadingAvatar}>
                  <label className="cursor-pointer">
                    {uploadingAvatar ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Upload className="mr-1.5 h-4 w-4" />}
                    {uploadingAvatar ? 'Загрузка…' : 'Загрузить с компьютера'}
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
                    onClick={() => setForm((prev) => ({ ...prev, avatarImageId: null }))}
                  >
                    Убрать
                  </Button>
                )}
              </div>
            </div>

            <Button type="submit" disabled={loading}>
              {loading ? 'Сохранение…' : 'Сохранить'}
            </Button>
          </form>

          <div className="mt-8 border-t border-border pt-6">
            <p className="mb-3 inline-flex items-center gap-2 font-heading text-lg text-foreground">
              <KeyRound className="h-5 w-5 text-primary" />
              Смена пароля
            </p>
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
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
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
