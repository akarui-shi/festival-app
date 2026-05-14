import { useEffect, useMemo, useState } from 'react';
import {Check, ChevronDown, ExternalLink, ImagePlus, Mic2, Plus, Save, Search, Trash2, Upload} from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { participantService } from '@/services/participant-service';
import { fileUploadService } from '@/services/file-upload-service';
import { imageSrc } from '@/lib/image';
import { LoadingState } from '@/components/StateDisplays';
import { EmptyState } from '@/components/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Participant, ParticipantKind } from '@/types';

const KIND_OPTIONS: ParticipantKind[] = ['Исполнитель', 'Лектор', 'Экскурсовод', 'Ансамбль', 'Спикер', 'Другое'];
const DEFAULT_KIND: ParticipantKind = 'Исполнитель';
const MUSICAL_KINDS = ['Исполнитель', 'Ансамбль'];

type ParticipantDraft = {
  id?: string | number;
  name: string;
  stageName: string;
  genre: string;
  kind: string;
  description: string;
  imageIds: number[];
  primaryImageId: number | null;
};

function uniqueImageIds(ids: Array<number | null | undefined>): number[] {
  const unique = ids
    .filter((value): value is number => Number.isFinite(Number(value)))
    .map((value) => Number(value))
    .filter((value, index, array) => array.indexOf(value) === index);
  return unique;
}

function toDraft(participant: Participant): ParticipantDraft {
  const imageIds = uniqueImageIds(participant.imageIds && participant.imageIds.length > 0 ? participant.imageIds : [participant.imageId]);
  const primaryImageId = participant.primaryImageId ?? imageIds[0] ?? null;
  return {
    id: participant.id,
    name: participant.name || '',
    stageName: participant.stageName || '',
    genre: participant.genre || '',
    kind: (participant.kind as string) || DEFAULT_KIND,
    description: participant.description || '',
    imageIds,
    primaryImageId,
  };
}

function normalizeDraftImages(draft: ParticipantDraft): ParticipantDraft {
  const imageIds = uniqueImageIds(draft.imageIds);
  const primaryImageId = draft.primaryImageId != null && imageIds.includes(draft.primaryImageId)
    ? draft.primaryImageId
    : imageIds[0] ?? null;
  return {
    ...draft,
    imageIds,
    primaryImageId,
  };
}

export default function AdminParticipants() {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingParticipantId, setDeletingParticipantId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [editingParticipantId, setEditingParticipantId] = useState<string | null>(null);
  const [newParticipant, setNewParticipant] = useState<ParticipantDraft>({
    name: '',
    stageName: '',
    genre: '',
    kind: DEFAULT_KIND,
    description: '',
    imageIds: [],
    primaryImageId: null,
  });
  const [editDrafts, setEditDrafts] = useState<Record<string, ParticipantDraft>>({});

  useEffect(() => {
    participantService.getParticipants()
      .then((response) => {
        setParticipants(response);
        setEditDrafts(Object.fromEntries(response.map((participant) => [String(participant.id), toDraft(participant)])));
      })
      .finally(() => setLoading(false));
  }, []);

  const filteredParticipants = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return participants;
    return participants.filter((participant) => `${participant.name} ${participant.stageName || ''} ${participant.genre || ''} ${participant.kind || ''}`.toLowerCase().includes(q));
  }, [participants, search]);

  const uploadParticipantImages = async (files: FileList | null): Promise<number[]> => {
    const list = Array.from(files || []);
    if (list.length === 0) return [];
    const uploads = await Promise.all(list.map((file) => fileUploadService.uploadImage(file)));
    return uploads.map((item) => item.imageId);
  };

  const appendNewParticipantImages = (imageIds: number[]) => {
    setNewParticipant((prev) => normalizeDraftImages({
      ...prev,
      imageIds: [...prev.imageIds, ...imageIds],
    }));
  };

  const appendEditParticipantImages = (participantId: string | number, imageIds: number[]) => {
    setEditDrafts((prev) => {
      const key = String(participantId);
      const draft = prev[key];
      if (!draft) return prev;
      return {
        ...prev,
        [key]: normalizeDraftImages({
          ...draft,
          imageIds: [...draft.imageIds, ...imageIds],
        }),
      };
    });
  };

  const removeNewParticipantImage = (imageId: number) => {
    setNewParticipant((prev) => normalizeDraftImages({
      ...prev,
      imageIds: prev.imageIds.filter((id) => id !== imageId),
    }));
  };

  const removeEditParticipantImage = (participantId: string | number, imageId: number) => {
    const key = String(participantId);
    setEditDrafts((prev) => {
      const draft = prev[key];
      if (!draft) return prev;
      return {
        ...prev,
        [key]: normalizeDraftImages({
          ...draft,
          imageIds: draft.imageIds.filter((id) => id !== imageId),
        }),
      };
    });
  };

  const setNewParticipantPrimaryImage = (imageId: number) => {
    setNewParticipant((prev) => ({ ...prev, primaryImageId: imageId }));
  };

  const setEditParticipantPrimaryImage = (participantId: string | number, imageId: number) => {
    setEditDrafts((prev) => {
      const key = String(participantId);
      const draft = prev[key];
      if (!draft) return prev;
      return {
        ...prev,
        [key]: {
          ...draft,
          primaryImageId: imageId,
        },
      };
    });
  };

  const onCreate = async () => {
    if (!newParticipant.name.trim()) {
      toast.error('Укажите имя участника');
      return;
    }

    setSaving(true);
    try {
      const normalized = normalizeDraftImages(newParticipant);
      const created = await participantService.createParticipant({
        name: normalized.name.trim(),
        stageName: normalized.stageName.trim() || undefined,
        genre: normalized.genre.trim() || undefined,
        kind: normalized.kind || DEFAULT_KIND,
        description: normalized.description.trim() || undefined,
        imageIds: normalized.imageIds,
        primaryImageId: normalized.primaryImageId ?? undefined,
        imageId: normalized.primaryImageId ?? undefined,
      });

      setParticipants((prev) => [created, ...prev]);
      setEditDrafts((prev) => ({ ...prev, [String(created.id)]: toDraft(created) }));
      setNewParticipant({
        name: '',
        stageName: '',
        genre: '',
        kind: DEFAULT_KIND,
        description: '',
        imageIds: [],
        primaryImageId: null,
      });
      toast.success('Участник добавлен');
    } catch {
      toast.error('Не удалось добавить участника');
    } finally {
      setSaving(false);
    }
  };

  const onSaveParticipant = async (participantId: string | number) => {
    const draft = editDrafts[String(participantId)];
    if (!draft || !draft.name.trim()) {
      toast.error('Имя участника обязательно');
      return;
    }

    setSaving(true);
    try {
      const normalized = normalizeDraftImages(draft);
      const updated = await participantService.updateParticipant(participantId, {
        name: normalized.name.trim(),
        stageName: normalized.stageName.trim() || undefined,
        genre: normalized.genre.trim() || undefined,
        kind: normalized.kind || DEFAULT_KIND,
        description: normalized.description.trim() || undefined,
        imageIds: normalized.imageIds,
        primaryImageId: normalized.primaryImageId ?? undefined,
        imageId: normalized.primaryImageId ?? undefined,
      });

      setParticipants((prev) => prev.map((participant) => (String(participant.id) === String(participantId) ? updated : participant)));
      setEditDrafts((prev) => ({ ...prev, [String(participantId)]: toDraft(updated) }));
      toast.success('Карточка участника обновлена');
    } catch {
      toast.error('Не удалось обновить участника');
    } finally {
      setSaving(false);
    }
  };

  const onDeleteParticipant = async (participantId: string | number, participantName: string) => {
    const confirmed = window.confirm(`Удалить участника «${participantName}»? Это действие нельзя отменить.`);
    if (!confirmed) return;

    const key = String(participantId);
    setDeletingParticipantId(key);
    try {
      await participantService.deleteParticipant(participantId);
      setParticipants((prev) => prev.filter((participant) => String(participant.id) !== key));
      setEditDrafts((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      setEditingParticipantId((prev) => (prev === key ? null : prev));
      toast.success('Участник удален');
    } catch {
      toast.error('Не удалось удалить участника');
    } finally {
      setDeletingParticipantId(null);
    }
  };

  if (loading) return <LoadingState />;

  return (
    <div className="space-y-6">
      <section>
        <h1 className="page-title">Участники</h1>
        <p className="mt-1 text-muted-foreground">Управление карточками участников (исполнители, лекторы, экскурсоводы и т.д.)</p>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5 shadow-soft">
        <h2 className="font-medium text-foreground">Новый участник</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <div>
            <Label>Имя *</Label>
            <Input value={newParticipant.name} onChange={(e) => setNewParticipant((prev) => ({ ...prev, name: e.target.value }))} placeholder="Иван Петров" />
          </div>
          <div>
            <Label>Сценическое имя</Label>
            <Input value={newParticipant.stageName} onChange={(e) => setNewParticipant((prev) => ({ ...prev, stageName: e.target.value }))} placeholder="IVAN PETROV" />
          </div>
          <div>
            <Label>Тип *</Label>
            <Select
              value={newParticipant.kind}
              onValueChange={(value) => setNewParticipant((prev) => ({ ...prev, kind: value as ParticipantKind }))}
            >
              <SelectTrigger className="h-10 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {KIND_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>{option}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {MUSICAL_KINDS.includes(newParticipant.kind) && (
            <div>
              <Label>Жанр</Label>
              <Input value={newParticipant.genre} onChange={(e) => setNewParticipant((prev) => ({ ...prev, genre: e.target.value }))} placeholder="Джаз" />
            </div>
          )}
          <div className="space-y-2">
            <Label className="block">Фотографии</Label>
            <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-md border border-border bg-background px-3 text-sm">
              <ImagePlus className="h-4 w-4" />
              Добавить фото
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={async (event) => {
                  try {
                    const ids = await uploadParticipantImages(event.target.files);
                    appendNewParticipantImages(ids);
                    if (ids.length > 0) toast.success(`Загружено фото: ${ids.length}`);
                  } catch {
                    toast.error('Не удалось загрузить изображения');
                  }
                }}
              />
            </label>
          </div>
          <div className="md:col-span-2">
            <Label>Описание</Label>
            <Textarea rows={3} value={newParticipant.description} onChange={(e) => setNewParticipant((prev) => ({ ...prev, description: e.target.value }))} />
          </div>
        </div>

        {newParticipant.imageIds.length > 0 && (
          <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5 md:grid-cols-6">
            {newParticipant.imageIds.map((imageId) => {
              const isPrimary = newParticipant.primaryImageId === imageId;
              return (
                <div key={imageId} className="relative overflow-hidden rounded-lg border border-border">
                  <img src={imageSrc(imageId)} alt="Фото участника" className="h-20 w-full object-cover" />
                  <div className="absolute inset-x-1 bottom-1 flex items-center justify-between gap-1">
                    <button
                      type="button"
                      onClick={() => setNewParticipantPrimaryImage(imageId)}
                      className={`rounded px-1.5 py-0.5 text-[10px] ${isPrimary ? 'bg-primary text-primary-foreground' : 'bg-background/90 text-foreground'}`}
                    >
                      {isPrimary ? 'Главное' : 'Сделать главным'}
                    </button>
                    <button
                      type="button"
                      onClick={() => removeNewParticipantImage(imageId)}
                      className="rounded bg-background/90 p-1 text-destructive"
                      title="Удалить фото"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <Button onClick={onCreate} className="mt-3 gap-1.5" disabled={saving}>
          <Plus className="h-4 w-4" />
          Добавить участника
        </Button>
      </section>

      <section className="surface-soft">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Поиск по имени, сценическому имени, типу или жанру" className="pl-9" />
        </div>
      </section>

      {filteredParticipants.length === 0 ? (
        <EmptyState icon={Mic2} title="Участники не найдены" description="Измените параметры поиска или добавьте нового участника" />
      ) : (
        <div className="space-y-3">
          {filteredParticipants.map((participant) => {
            const key = String(participant.id);
            const draft = editDrafts[key] || toDraft(participant);
            const expanded = editingParticipantId === key;
            const previewImageId = draft.primaryImageId ?? draft.imageIds[0] ?? null;

            return (
              <div key={participant.id} className="rounded-2xl border border-border bg-card p-4 shadow-soft transition-colors hover:border-primary/15">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-border bg-muted/30">
                      {previewImageId ? (
                        <img src={imageSrc(previewImageId)} alt={draft.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/15 to-primary/5">
                          <Mic2 className="h-5 w-5 text-primary/60" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate font-semibold text-foreground">{draft.name}</p>
                        {draft.kind && (
                          <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                            {draft.kind}
                          </span>
                        )}
                      </div>
                      <p className="truncate text-xs text-muted-foreground">
                        {draft.stageName || 'Без сценического имени'} · {draft.genre || 'Без жанра'} · Фото: {draft.imageIds.length}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" asChild>
                      <Link to={`/participants/${participant.id}`} target="_blank" rel="noreferrer" className="gap-1.5">
                        Открыть
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      onClick={() => setEditingParticipantId((prev) => (prev === key ? null : key))}
                    >
                      <ChevronDown className={`h-4 w-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
                      {expanded ? 'Свернуть' : 'Редактировать'}
                    </Button>
                    <Button type="button" size="sm" className="gap-1.5" onClick={() => onSaveParticipant(participant.id)} disabled={saving}>
                      <Save className="h-4 w-4" />
                      Сохранить
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="gap-1.5"
                      onClick={() => onDeleteParticipant(participant.id, draft.name || 'без имени')}
                      disabled={deletingParticipantId === key}
                    >
                      <Trash2 className="h-4 w-4" />
                      Удалить
                    </Button>
                  </div>
                </div>

                {expanded && (
                  <div className="mt-4 grid gap-3 border-t border-border pt-4 md:grid-cols-2">
                    <div>
                      <Label>Имя *</Label>
                      <Input
                        value={draft.name}
                        onChange={(e) => setEditDrafts((prev) => ({ ...prev, [key]: { ...draft, name: e.target.value } }))}
                      />
                    </div>
                    <div>
                      <Label>Сценическое имя</Label>
                      <Input
                        value={draft.stageName}
                        onChange={(e) => setEditDrafts((prev) => ({ ...prev, [key]: { ...draft, stageName: e.target.value } }))}
                      />
                    </div>
                    <div>
                      <Label>Тип</Label>
                      <Select
                        value={draft.kind}
                        onValueChange={(value) => setEditDrafts((prev) => ({ ...prev, [key]: { ...draft, kind: value as ParticipantKind } }))}
                      >
                        <SelectTrigger className="h-10 w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {KIND_OPTIONS.map((option) => (
                            <SelectItem key={option} value={option}>{option}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {MUSICAL_KINDS.includes(draft.kind) && (
                      <div>
                        <Label>Жанр</Label>
                        <Input
                          value={draft.genre}
                          onChange={(e) => setEditDrafts((prev) => ({ ...prev, [key]: { ...draft, genre: e.target.value } }))}
                        />
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label className="block">Фотографии</Label>
                      <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-md border border-border bg-background px-3 text-sm">
                        <Upload className="h-4 w-4" />
                        Добавить фото
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          onChange={async (event) => {
                            try {
                              const ids = await uploadParticipantImages(event.target.files);
                              appendEditParticipantImages(participant.id, ids);
                              if (ids.length > 0) toast.success(`Загружено фото: ${ids.length}`);
                            } catch {
                              toast.error('Не удалось загрузить изображения');
                            }
                          }}
                        />
                      </label>
                    </div>
                    <div className="md:col-span-2">
                      <Label>Описание</Label>
                      <Textarea
                        rows={3}
                        value={draft.description}
                        onChange={(e) => setEditDrafts((prev) => ({ ...prev, [key]: { ...draft, description: e.target.value } }))}
                      />
                    </div>

                    {draft.imageIds.length > 0 && (
                      <div className="grid grid-cols-3 gap-2 md:col-span-2 sm:grid-cols-5 lg:grid-cols-6">
                        {draft.imageIds.map((imageId) => {
                          const isPrimary = draft.primaryImageId === imageId;
                          return (
                            <div key={`${key}-image-${imageId}`} className="relative overflow-hidden rounded-lg border border-border">
                              <img src={imageSrc(imageId)} alt="Фото участника" className="h-24 w-full object-cover" />
                              <div className="absolute inset-x-1 bottom-1 flex items-center justify-between gap-1">
                                <button
                                  type="button"
                                  onClick={() => setEditParticipantPrimaryImage(participant.id, imageId)}
                                  className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] ${isPrimary ? 'bg-primary text-primary-foreground' : 'bg-background/90 text-foreground'}`}
                                >
                                  {isPrimary && <Check className="h-3 w-3" />}
                                  {isPrimary ? 'Главное' : 'Сделать главным'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => removeEditParticipantImage(participant.id, imageId)}
                                  className="rounded bg-background/90 p-1 text-destructive"
                                  title="Удалить фото"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
