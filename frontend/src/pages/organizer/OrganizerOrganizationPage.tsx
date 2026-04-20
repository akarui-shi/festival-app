import { useEffect, useMemo, useState } from 'react';
import { Loader2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingState } from '@/components/StateDisplays';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { organizationService, type OrganizationJoinRequest, type OrganizationMember } from '@/services/organization-service';
import { fileUploadService } from '@/services/file-upload-service';
import type { Organization } from '@/types';

function toDateTimeLabel(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('ru-RU', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export default function OrganizerOrganizationPage() {
  const { user } = useAuth();
  const ownerOrganizationId = user?.organization?.id;

  const [organization, setOrganization] = useState<Organization | null>(null);
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [joinRequests, setJoinRequests] = useState<OrganizationJoinRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [requestActionId, setRequestActionId] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: '',
    description: '',
    contacts: '',
    contactEmail: '',
    contactPhone: '',
    website: '',
    socialLinks: '',
    logoUrl: '',
  });

  const loadPage = async () => {
    if (!ownerOrganizationId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [org, orgMembers, orgJoinRequests] = await Promise.all([
        organizationService.getOrganizationById(ownerOrganizationId),
        organizationService.getOrganizationMembers(ownerOrganizationId),
        organizationService.getOrganizationJoinRequests(ownerOrganizationId),
      ]);
      setOrganization(org);
      setMembers(orgMembers);
      setJoinRequests(orgJoinRequests);
      setForm({
        name: org.name || '',
        description: org.description || '',
        contacts: org.contacts || '',
        contactEmail: org.contactEmail || '',
        contactPhone: org.contactPhone || '',
        website: org.website || '',
        socialLinks: org.socialLinks || '',
        logoUrl: org.logoUrl || '',
      });
    } catch (error: any) {
      toast.error(error?.message || 'Не удалось загрузить данные организации');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownerOrganizationId]);

  const pendingRequests = useMemo(
    () => joinRequests.filter((request) => (request.status || '').toLowerCase() === 'pending'),
    [joinRequests],
  );

  const processedRequests = useMemo(
    () => joinRequests.filter((request) => (request.status || '').toLowerCase() !== 'pending'),
    [joinRequests],
  );

  const saveOrganization = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!ownerOrganizationId) return;
    if (!form.name.trim()) {
      toast.error('Введите название организации');
      return;
    }

    setSaving(true);
    try {
      const updated = await organizationService.updateOrganization(ownerOrganizationId, {
        name: form.name.trim(),
        description: form.description || null,
        contacts: form.contacts || null,
        contactEmail: form.contactEmail || null,
        contactPhone: form.contactPhone || null,
        website: form.website || null,
        socialLinks: form.socialLinks || null,
        logoUrl: form.logoUrl || null,
      });
      setOrganization(updated);
      toast.success('Данные организации обновлены');
    } catch (error: any) {
      toast.error(error?.message || 'Не удалось сохранить изменения');
    } finally {
      setSaving(false);
    }
  };

  const decideRequest = async (requestId: string | number, decision: 'approve' | 'reject') => {
    setRequestActionId(String(requestId));
    try {
      await organizationService.decideJoinRequest(requestId, decision);
      await loadPage();
      toast.success(decision === 'approve' ? 'Заявка одобрена' : 'Заявка отклонена');
    } catch (error: any) {
      toast.error(error?.message || 'Не удалось обработать заявку');
    } finally {
      setRequestActionId(null);
    }
  };

  const onUploadLogo: React.ChangeEventHandler<HTMLInputElement> = async (event) => {
    const file = event.target.files?.[0];
    event.currentTarget.value = '';
    if (!file) return;

    setUploadingLogo(true);
    try {
      const uploaded = await fileUploadService.uploadImage(file);
      setForm((prev) => ({ ...prev, logoUrl: uploaded.url }));
      toast.success('Логотип загружен');
    } catch (error: any) {
      toast.error(error?.message || 'Не удалось загрузить логотип');
    } finally {
      setUploadingLogo(false);
    }
  };

  if (loading) {
    return <LoadingState />;
  }

  if (!ownerOrganizationId) {
    return (
      <div className="space-y-3 rounded-xl border border-border bg-card p-6">
        <h1 className="font-heading text-2xl text-foreground">Организация</h1>
        <p className="text-sm text-muted-foreground">
          Этот раздел доступен владельцу организации. После одобрения вступления вы сможете создавать мероприятия,
          а управление организацией остаётся у владельца.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section>
        <h1 className="page-title">Организация</h1>
        <p className="mt-1 text-muted-foreground">
          Управляйте профилем организации, участниками и заявками на вступление.
        </p>
      </section>

      <section className="surface-panel">
        <h2 className="font-heading text-xl text-foreground">Профиль организации</h2>
        <form className="mt-4 grid gap-4 md:grid-cols-2" onSubmit={saveOrganization}>
          <div className="space-y-2">
            <Label htmlFor="org-name">Название</Label>
            <Input
              id="org-name"
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              placeholder="Название организации"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="org-contacts">Контакты (кратко)</Label>
            <Input
              id="org-contacts"
              value={form.contacts}
              onChange={(event) => setForm((prev) => ({ ...prev, contacts: event.target.value }))}
              placeholder="+7..., Telegram, сайт"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="org-email">Email</Label>
            <Input
              id="org-email"
              value={form.contactEmail}
              onChange={(event) => setForm((prev) => ({ ...prev, contactEmail: event.target.value }))}
              placeholder="org@example.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="org-phone">Телефон</Label>
            <Input
              id="org-phone"
              value={form.contactPhone}
              onChange={(event) => setForm((prev) => ({ ...prev, contactPhone: event.target.value }))}
              placeholder="+7..."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="org-website">Сайт</Label>
            <Input
              id="org-website"
              value={form.website}
              onChange={(event) => setForm((prev) => ({ ...prev, website: event.target.value }))}
              placeholder="https://..."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="org-socials">Соцсети</Label>
            <Input
              id="org-socials"
              value={form.socialLinks}
              onChange={(event) => setForm((prev) => ({ ...prev, socialLinks: event.target.value }))}
              placeholder="VK / Telegram / YouTube"
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Логотип организации</Label>
            <div className="flex flex-wrap items-center gap-3">
              <Button type="button" variant="outline" disabled={uploadingLogo} asChild>
                <label className="cursor-pointer">
                  {uploadingLogo ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                  {uploadingLogo ? 'Загрузка…' : 'Загрузить с компьютера'}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={onUploadLogo}
                    disabled={uploadingLogo}
                  />
                </label>
              </Button>
              {form.logoUrl && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setForm((prev) => ({ ...prev, logoUrl: '' }))}
                >
                  Удалить логотип
                </Button>
              )}
            </div>
            {form.logoUrl && (
              <div className="mt-2 overflow-hidden rounded-md border border-border bg-muted/20 p-2">
                <img src={form.logoUrl} alt="Логотип организации" className="h-24 w-24 rounded object-cover" />
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Поддерживаются изображения JPG/PNG/WebP. Логотип загружается только локальным файлом.
            </p>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="org-description">Описание</Label>
            <Textarea
              id="org-description"
              value={form.description}
              onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
              rows={4}
              placeholder="Расскажите об организации"
            />
          </div>
          <div className="md:col-span-2">
            <Button type="submit" disabled={saving}>
              {saving ? 'Сохранение…' : 'Сохранить изменения'}
            </Button>
          </div>
        </form>
      </section>

      <section className="surface-panel">
        <h2 className="font-heading text-xl text-foreground">Заявки на вступление</h2>
        {pendingRequests.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">Новых заявок нет.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {pendingRequests.map((request) => (
              <div key={String(request.requestId)} className="rounded-lg border border-border bg-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-foreground">{request.userName || 'Пользователь'}</p>
                    <p className="text-xs text-muted-foreground">{request.userEmail || 'Email не указан'}</p>
                    <p className="mt-2 text-sm text-muted-foreground">{request.message || 'Комментарий не указан'}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Отправлено: {toDateTimeLabel(request.requestedAt)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      disabled={requestActionId === String(request.requestId)}
                      onClick={() => void decideRequest(request.requestId, 'approve')}
                    >
                      Одобрить
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={requestActionId === String(request.requestId)}
                      onClick={() => void decideRequest(request.requestId, 'reject')}
                    >
                      Отклонить
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="surface-panel">
        <h2 className="font-heading text-xl text-foreground">Участники ({members.length})</h2>
        {members.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">В организации пока нет участников.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-2 py-2 font-medium">Участник</th>
                  <th className="px-2 py-2 font-medium">Роль</th>
                  <th className="px-2 py-2 font-medium">Email</th>
                  <th className="px-2 py-2 font-medium">Дата вступления</th>
                </tr>
              </thead>
              <tbody>
                {members.map((member) => (
                  <tr key={String(member.memberId)} className="border-b border-border/70">
                    <td className="px-2 py-2 text-foreground">{member.fullName || 'Без имени'}</td>
                    <td className="px-2 py-2 text-muted-foreground">{member.organizationStatus || 'участник'}</td>
                    <td className="px-2 py-2 text-muted-foreground">{member.email || '—'}</td>
                    <td className="px-2 py-2 text-muted-foreground">{toDateTimeLabel(member.joinedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {processedRequests.length > 0 && (
        <section className="surface-panel">
          <h2 className="font-heading text-xl text-foreground">История заявок</h2>
          <div className="mt-4 space-y-2">
            {processedRequests.slice(0, 12).map((request) => (
              <div key={String(request.requestId)} className="rounded-lg border border-border bg-card px-3 py-2 text-sm">
                <p className="text-foreground">
                  {request.userName || 'Пользователь'} - {request.status === 'approved' ? 'одобрена' : 'отклонена'}
                </p>
                <p className="text-xs text-muted-foreground">Решение: {toDateTimeLabel(request.reviewedAt)}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
