import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, FileText, ImagePlus, Loader2, Pencil, Plus, Send, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { ConfirmActionDialog } from '@/components/ConfirmActionDialog';
import { useAuth } from '@/contexts/AuthContext';
import { eventService } from '@/services/event-service';
import { fileUploadService } from '@/services/file-upload-service';
import { publicationService } from '@/services/publication-service';
import { LoadingState } from '@/components/StateDisplays';
import { EmptyState } from '@/components/EmptyState';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { imageSrc } from '@/lib/image';
import { getPublicationStatusBadge } from '@/lib/statuses';
import type { Event, Id, Publication } from '@/types';

export default function OrganizerPublications() {
  const { user } = useAuth();
  const [pubs, setPubs] = useState<Publication[]>([]);
  const [organizerEvents, setOrganizerEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: '',
    excerpt: '',
    content: '',
    tags: '',
    eventId: '',
    imageIds: [] as number[],
  });
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [publicationToDelete, setPublicationToDelete] = useState<Publication | null>(null);
  const [editingPublicationId, setEditingPublicationId] = useState<Id | null>(null);
  const [previewPublication, setPreviewPublication] = useState<Publication | null>(null);
  const [previewLoadingId, setPreviewLoadingId] = useState<Id | null>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      publicationService.getAllPublications(),
      eventService.getOrganizerEvents(user?.id || ''),
    ])
      .then(([publications, events]) => {
        setPubs(publications);
        setOrganizerEvents(events);
        setForm((prev) => ({
          ...prev,
          eventId: prev.eventId || (events[0]?.id != null ? String(events[0].id) : ''),
        }));
      })
      .finally(() => setLoading(false));
  }, [user]);

  const resetForm = (eventId = form.eventId) => {
    setForm({ title: '', excerpt: '', content: '', tags: '', eventId, imageIds: [] });
    setEditingPublicationId(null);
  };

  const startCreate = () => {
    resetForm();
    setShowForm(true);
  };

  const startEdit = async (publication: Publication) => {
    const publicationId = publication.publicationId ?? publication.id;
    if (publicationId == null) return;

    setSaving(true);
    try {
      const details = await publicationService.getOwnPublicationById(publicationId);
      setEditingPublicationId(publicationId);
      setForm({
        title: details.title || '',
        excerpt: details.excerpt || details.preview || '',
        content: details.content || details.preview || '',
        tags: (details.tags || []).join(', '),
        eventId: details.eventId != null ? String(details.eventId) : '',
        imageIds: details.imageIds || (details.imageId ? [details.imageId] : []),
      });
      setShowForm(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error: any) {
      toast.error(error?.message || 'Не удалось открыть публикацию для редактирования');
    } finally {
      setSaving(false);
    }
  };

  const openPreview = async (publication: Publication) => {
    const publicationId = publication.publicationId ?? publication.id;
    if (publicationId == null) return;

    setPreviewLoadingId(publicationId);
    try {
      const details = await publicationService.getOwnPublicationById(publicationId);
      setPreviewPublication(details);
    } catch (error: any) {
      toast.error(error?.message || 'Не удалось открыть публикацию');
    } finally {
      setPreviewLoadingId(null);
    }
  };

  const savePublication = async () => {
    if (!form.title || !form.content || !form.eventId) {
      toast.error('Заполните название, содержание и выберите мероприятие');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...form,
        authorId: user!.id,
        eventId: Number(form.eventId),
        imageId: form.imageIds[0] ?? undefined,
        imageIds: form.imageIds,
        tags: form.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
      };
      const pub = editingPublicationId == null
        ? await publicationService.createPublication(payload)
        : await publicationService.updatePublication(editingPublicationId, payload);
      setPubs((prev) => {
        const exists = prev.some((publication) => String(publication.publicationId ?? publication.id) === String(pub.publicationId ?? pub.id));
        return exists
          ? prev.map((publication) => (
            String(publication.publicationId ?? publication.id) === String(pub.publicationId ?? pub.id) ? pub : publication
          ))
          : [pub, ...prev];
      });
      setShowForm(false);
      resetForm(form.eventId);
      toast.success(editingPublicationId == null ? 'Публикация создана' : 'Публикация обновлена и отправлена на модерацию');
    } catch { toast.error('Ошибка'); }
    setSaving(false);
  };

  const onUploadPublicationImage: React.ChangeEventHandler<HTMLInputElement> = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const uploaded = await fileUploadService.uploadPublicationImage(file);
      setForm((prev) => ({ ...prev, imageIds: [...prev.imageIds, uploaded.imageId] }));
      toast.success('Фотография публикации загружена');
    } catch (error: any) {
      toast.error(error?.message || 'Не удалось загрузить изображение');
    } finally {
      setUploadingImage(false);
      event.target.value = '';
    }
  };

  const sendToModeration = async (id: Id) => {
    const updated = await publicationService.submitForModeration(id);
    setPubs((prev) => prev.map((publication) => (
      String(publication.publicationId ?? publication.id) === String(id) ? updated : publication
    )));
    toast.success('Отправлено на модерацию');
  };

  const del = async (id: Id) => {
    await publicationService.deletePublication(id);
    setPubs((prev) => prev.filter((publication) => String(publication.publicationId ?? publication.id) !== String(id)));
    toast.success('Удалено');
    setPublicationToDelete(null);
  };

  if (loading) return <LoadingState />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="page-title">Публикации организации</h1>
          <p className="mt-1 text-muted-foreground">Публикуйте новости и материалы по мероприятиям вашей организации</p>
        </div>
        <Button onClick={startCreate} className="gap-1.5" disabled={organizerEvents.length === 0}>
          <Plus className="h-4 w-4" />
          Создать
        </Button>
      </div>
      {organizerEvents.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Чтобы создать публикацию, сначала создайте хотя бы одно мероприятие.
        </p>
      )}

      <ConfirmActionDialog
        open={Boolean(publicationToDelete)}
        onOpenChange={(open) => {
          if (!open) setPublicationToDelete(null);
        }}
        title="Удалить публикацию?"
        description={publicationToDelete
          ? `Публикация «${publicationToDelete.title}» будет удалена без возможности восстановления.`
          : ''}
        confirmLabel="Удалить"
        onConfirm={() => {
          if (publicationToDelete) {
            const publicationId = publicationToDelete.publicationId ?? publicationToDelete.id;
            if (publicationId != null) {
              return del(publicationId);
            }
          }
        }}
      />

      {showForm && (
        <div className="surface-panel space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-heading text-xl text-foreground">
              {editingPublicationId == null ? 'Новая публикация' : 'Редактирование публикации'}
            </h2>
            <Button type="button" variant="ghost" size="icon" onClick={() => { setShowForm(false); resetForm(); }} aria-label="Закрыть форму">
              <X className="h-4 w-4" />
            </Button>
          </div>
          <Select value={form.eventId} onValueChange={(value) => setForm((prev) => ({ ...prev, eventId: value }))}>
            <SelectTrigger className="bg-background">
              <SelectValue placeholder="Выберите мероприятие" />
            </SelectTrigger>
            <SelectContent>
              {organizerEvents.map((eventItem) => (
                <SelectItem key={eventItem.id} value={String(eventItem.id)}>
                  {eventItem.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            className="text-lg"
            placeholder="Заголовок"
            value={form.title}
            onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
          />
          <Input
            placeholder="Краткое описание"
            value={form.excerpt}
            onChange={(event) => setForm((prev) => ({ ...prev, excerpt: event.target.value }))}
          />
          <Textarea
            className="min-h-32"
            placeholder="Содержание…"
            value={form.content}
            onChange={(event) => setForm((prev) => ({ ...prev, content: event.target.value }))}
          />
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" className="gap-1.5" asChild>
                <label>
                  {uploadingImage ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                  {uploadingImage ? 'Загрузка…' : 'Добавить фото'}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={onUploadPublicationImage}
                    disabled={uploadingImage}
                  />
                </label>
              </Button>
            </div>
            {form.imageIds.length > 0 && (
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {form.imageIds.map((imageId) => (
                  <div key={imageId} className="overflow-hidden rounded-lg border border-border bg-muted">
                    <img src={imageSrc(imageId)} alt="Фото публикации" className="h-36 w-full object-cover" />
                    <div className="flex justify-end p-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setForm((prev) => ({ ...prev, imageIds: prev.imageIds.filter((id) => id !== imageId) }))}
                      >
                        Убрать
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Можно добавить несколько фотографий. Если фото нет, в карточке публикации будет обложка мероприятия.
            </p>
          </div>
          <Input
            placeholder="Теги через запятую"
            value={form.tags}
            onChange={(event) => setForm((prev) => ({ ...prev, tags: event.target.value }))}
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={savePublication} disabled={saving}>
              {saving ? 'Сохранение…' : editingPublicationId == null ? 'Создать' : 'Сохранить'}
            </Button>
            <Button size="sm" variant="outline" onClick={() => { setShowForm(false); resetForm(); }}>
              Отмена
            </Button>
          </div>
        </div>
      )}

      {previewPublication && (
        <div className="surface-panel space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-heading text-xl text-foreground">{previewPublication.title}</h2>
              <p className="text-sm text-muted-foreground">{previewPublication.eventTitle || previewPublication.organizationName}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setPreviewPublication(null)} aria-label="Закрыть предпросмотр">
              <X className="h-4 w-4" />
            </Button>
          </div>
          {(previewPublication.imageIds || []).length > 0 && (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {(previewPublication.imageIds || []).map((imageId) => (
                <img key={imageId} src={imageSrc(imageId)} alt="Фото публикации" className="h-40 w-full rounded-md object-cover" />
              ))}
            </div>
          )}
          <div className="whitespace-pre-wrap text-sm leading-6 text-foreground">{previewPublication.content || previewPublication.preview}</div>
        </div>
      )}

      {pubs.length === 0 ? (
        <EmptyState icon={FileText} title="Нет публикаций" description="Создайте свою первую публикацию" />
      ) : (
        <div className="space-y-3">
          {pubs.map((pub) => {
            const publicationId = pub.publicationId ?? pub.id;
            const status = getPublicationStatusBadge(pub.status);
            return (
              <div
                key={publicationId}
                className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-soft transition-colors hover:border-primary/15 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <div className="mb-1 flex items-center gap-2">
                    <span className="font-medium text-foreground">{pub.title}</span>
                    <Badge className={`${status.className} border-0 text-xs`}>{status.label}</Badge>
                  </div>
                  {pub.eventId && pub.eventTitle && (
                    <p className="mb-1 text-xs text-muted-foreground">
                      Мероприятие:{' '}
                      <Link to={`/events/${pub.eventId}`} className="text-primary hover:underline">
                        {pub.eventTitle}
                      </Link>
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">{pub.excerpt}</p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openPreview(pub)}
                    className="gap-1.5"
                    disabled={previewLoadingId === publicationId}
                  >
                    {previewLoadingId === publicationId ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Eye className="h-3.5 w-3.5" />}
                    Просмотр
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => startEdit(pub)} className="gap-1.5" disabled={saving}>
                    <Pencil className="h-3.5 w-3.5" />
                    Редактировать
                  </Button>
                  {pub.status === 'DRAFT' && publicationId != null && (
                    <Button variant="ghost" size="sm" onClick={() => sendToModeration(publicationId)} className="gap-1.5">
                      <Send className="h-3.5 w-3.5" />
                      На модерацию
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setPublicationToDelete(pub)}
                    className="text-destructive"
                    aria-label="Удалить публикацию"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
