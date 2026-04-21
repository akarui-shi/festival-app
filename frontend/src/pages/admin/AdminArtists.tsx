import { useEffect, useMemo, useState } from 'react';
import { Check, ChevronDown, ImagePlus, Mic2, Plus, Save, Search, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { artistService } from '@/services/artist-service';
import { fileUploadService } from '@/services/file-upload-service';
import { imageSrc } from '@/lib/image';
import { LoadingState } from '@/components/StateDisplays';
import { EmptyState } from '@/components/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { Artist } from '@/types';

type ArtistDraft = {
  id?: string | number;
  name: string;
  stageName: string;
  genre: string;
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

function toDraft(artist: Artist): ArtistDraft {
  const imageIds = uniqueImageIds(artist.imageIds && artist.imageIds.length > 0 ? artist.imageIds : [artist.imageId]);
  const primaryImageId = artist.primaryImageId ?? imageIds[0] ?? null;
  return {
    id: artist.id,
    name: artist.name || '',
    stageName: artist.stageName || '',
    genre: artist.genre || '',
    description: artist.description || '',
    imageIds,
    primaryImageId,
  };
}

function normalizeDraftImages(draft: ArtistDraft): ArtistDraft {
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

export default function AdminArtists() {
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [editingArtistId, setEditingArtistId] = useState<string | null>(null);
  const [newArtist, setNewArtist] = useState<ArtistDraft>({
    name: '',
    stageName: '',
    genre: '',
    description: '',
    imageIds: [],
    primaryImageId: null,
  });
  const [editDrafts, setEditDrafts] = useState<Record<string, ArtistDraft>>({});

  useEffect(() => {
    artistService.getArtists()
      .then((response) => {
        setArtists(response);
        setEditDrafts(Object.fromEntries(response.map((artist) => [String(artist.id), toDraft(artist)])));
      })
      .finally(() => setLoading(false));
  }, []);

  const filteredArtists = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return artists;
    return artists.filter((artist) => `${artist.name} ${artist.stageName || ''} ${artist.genre || ''}`.toLowerCase().includes(q));
  }, [artists, search]);

  const uploadArtistImages = async (files: FileList | null): Promise<number[]> => {
    const list = Array.from(files || []);
    if (list.length === 0) return [];
    const uploads = await Promise.all(list.map((file) => fileUploadService.uploadImage(file)));
    return uploads.map((item) => item.imageId);
  };

  const appendNewArtistImages = (imageIds: number[]) => {
    setNewArtist((prev) => {
      const merged = normalizeDraftImages({
        ...prev,
        imageIds: [...prev.imageIds, ...imageIds],
      });
      return merged;
    });
  };

  const appendEditArtistImages = (artistId: string | number, imageIds: number[]) => {
    setEditDrafts((prev) => {
      const key = String(artistId);
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

  const removeNewArtistImage = (imageId: number) => {
    setNewArtist((prev) => normalizeDraftImages({
      ...prev,
      imageIds: prev.imageIds.filter((id) => id !== imageId),
    }));
  };

  const removeEditArtistImage = (artistId: string | number, imageId: number) => {
    const key = String(artistId);
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

  const setNewArtistPrimaryImage = (imageId: number) => {
    setNewArtist((prev) => ({ ...prev, primaryImageId: imageId }));
  };

  const setEditArtistPrimaryImage = (artistId: string | number, imageId: number) => {
    setEditDrafts((prev) => {
      const key = String(artistId);
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
    if (!newArtist.name.trim()) {
      toast.error('Укажите имя артиста');
      return;
    }

    setSaving(true);
    try {
      const normalized = normalizeDraftImages(newArtist);
      const created = await artistService.createArtist({
        name: normalized.name.trim(),
        stageName: normalized.stageName.trim() || undefined,
        genre: normalized.genre.trim() || undefined,
        description: normalized.description.trim() || undefined,
        imageIds: normalized.imageIds,
        primaryImageId: normalized.primaryImageId ?? undefined,
        imageId: normalized.primaryImageId ?? undefined,
      });

      setArtists((prev) => [created, ...prev]);
      setEditDrafts((prev) => ({ ...prev, [String(created.id)]: toDraft(created) }));
      setNewArtist({
        name: '',
        stageName: '',
        genre: '',
        description: '',
        imageIds: [],
        primaryImageId: null,
      });
      toast.success('Артист добавлен');
    } catch {
      toast.error('Не удалось добавить артиста');
    } finally {
      setSaving(false);
    }
  };

  const onSaveArtist = async (artistId: string | number) => {
    const draft = editDrafts[String(artistId)];
    if (!draft || !draft.name.trim()) {
      toast.error('Имя артиста обязательно');
      return;
    }

    setSaving(true);
    try {
      const normalized = normalizeDraftImages(draft);
      const updated = await artistService.updateArtist(artistId, {
        name: normalized.name.trim(),
        stageName: normalized.stageName.trim() || undefined,
        genre: normalized.genre.trim() || undefined,
        description: normalized.description.trim() || undefined,
        imageIds: normalized.imageIds,
        primaryImageId: normalized.primaryImageId ?? undefined,
        imageId: normalized.primaryImageId ?? undefined,
      });

      setArtists((prev) => prev.map((artist) => (String(artist.id) === String(artistId) ? updated : artist)));
      setEditDrafts((prev) => ({ ...prev, [String(artistId)]: toDraft(updated) }));
      toast.success('Карточка артиста обновлена');
    } catch {
      toast.error('Не удалось обновить артиста');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingState />;

  return (
    <div className="space-y-6">
      <section>
        <h1 className="font-heading text-3xl text-foreground sm:text-4xl">Артисты</h1>
        <p className="mt-1 text-muted-foreground">Удобное управление карточками артистов и их фотогалереями</p>
      </section>

      <section className="rounded-xl border border-border bg-card p-4 shadow-soft">
        <h2 className="font-medium text-foreground">Новый артист</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <div>
            <Label>Имя *</Label>
            <Input value={newArtist.name} onChange={(e) => setNewArtist((prev) => ({ ...prev, name: e.target.value }))} placeholder="Иван Петров" />
          </div>
          <div>
            <Label>Сценическое имя</Label>
            <Input value={newArtist.stageName} onChange={(e) => setNewArtist((prev) => ({ ...prev, stageName: e.target.value }))} placeholder="IVAN PETROV" />
          </div>
          <div>
            <Label>Жанр</Label>
            <Input value={newArtist.genre} onChange={(e) => setNewArtist((prev) => ({ ...prev, genre: e.target.value }))} placeholder="Джаз" />
          </div>
          <div className="space-y-2">
            <Label>Фотографии</Label>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm">
              <ImagePlus className="h-4 w-4" />
              Добавить фото
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={async (event) => {
                  try {
                    const ids = await uploadArtistImages(event.target.files);
                    appendNewArtistImages(ids);
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
            <Textarea rows={3} value={newArtist.description} onChange={(e) => setNewArtist((prev) => ({ ...prev, description: e.target.value }))} />
          </div>
        </div>

        {newArtist.imageIds.length > 0 && (
          <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5 md:grid-cols-6">
            {newArtist.imageIds.map((imageId) => {
              const isPrimary = newArtist.primaryImageId === imageId;
              return (
                <div key={imageId} className="relative overflow-hidden rounded-lg border border-border">
                  <img src={imageSrc(imageId)} alt="Фото артиста" className="h-20 w-full object-cover" />
                  <div className="absolute inset-x-1 bottom-1 flex items-center justify-between gap-1">
                    <button
                      type="button"
                      onClick={() => setNewArtistPrimaryImage(imageId)}
                      className={`rounded px-1.5 py-0.5 text-[10px] ${isPrimary ? 'bg-primary text-primary-foreground' : 'bg-background/90 text-foreground'}`}
                    >
                      {isPrimary ? 'Главное' : 'Сделать главным'}
                    </button>
                    <button
                      type="button"
                      onClick={() => removeNewArtistImage(imageId)}
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
          Добавить артиста
        </Button>
      </section>

      <section className="rounded-xl border border-border bg-card p-4 shadow-soft">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Поиск по имени, сценическому имени или жанру" />
        </div>
      </section>

      {filteredArtists.length === 0 ? (
        <EmptyState icon={Mic2} title="Артисты не найдены" description="Измените параметры поиска или добавьте нового артиста" />
      ) : (
        <div className="space-y-3">
          {filteredArtists.map((artist) => {
            const key = String(artist.id);
            const draft = editDrafts[key] || toDraft(artist);
            const expanded = editingArtistId === key;
            const previewImageId = draft.primaryImageId ?? draft.imageIds[0] ?? null;

            return (
              <div key={artist.id} className="rounded-xl border border-border bg-card p-4 shadow-soft">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="h-12 w-12 overflow-hidden rounded-lg border border-border bg-muted/30">
                      {previewImageId ? (
                        <img src={imageSrc(previewImageId)} alt={draft.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                          <Mic2 className="h-5 w-5" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-foreground">{draft.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {draft.stageName || 'Без сценического имени'} · {draft.genre || 'Без жанра'} · Фото: {draft.imageIds.length}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      onClick={() => setEditingArtistId((prev) => (prev === key ? null : key))}
                    >
                      <ChevronDown className={`h-4 w-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
                      {expanded ? 'Свернуть' : 'Редактировать'}
                    </Button>
                    <Button type="button" size="sm" className="gap-1.5" onClick={() => onSaveArtist(artist.id)} disabled={saving}>
                      <Save className="h-4 w-4" />
                      Сохранить
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
                      <Label>Жанр</Label>
                      <Input
                        value={draft.genre}
                        onChange={(e) => setEditDrafts((prev) => ({ ...prev, [key]: { ...draft, genre: e.target.value } }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Фотографии</Label>
                      <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm">
                        <Upload className="h-4 w-4" />
                        Добавить фото
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          onChange={async (event) => {
                            try {
                              const ids = await uploadArtistImages(event.target.files);
                              appendEditArtistImages(artist.id, ids);
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
                              <img src={imageSrc(imageId)} alt="Фото артиста" className="h-24 w-full object-cover" />
                              <div className="absolute inset-x-1 bottom-1 flex items-center justify-between gap-1">
                                <button
                                  type="button"
                                  onClick={() => setEditArtistPrimaryImage(artist.id, imageId)}
                                  className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] ${isPrimary ? 'bg-primary text-primary-foreground' : 'bg-background/90 text-foreground'}`}
                                >
                                  {isPrimary && <Check className="h-3 w-3" />}
                                  {isPrimary ? 'Главное' : 'Сделать главным'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => removeEditArtistImage(artist.id, imageId)}
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
