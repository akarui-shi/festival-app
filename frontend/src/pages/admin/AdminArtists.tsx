import { useEffect, useMemo, useState } from 'react';
import { Mic2, Plus, Save, Search, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { artistService } from '@/services/artist-service';
import { fileUploadService } from '@/services/file-upload-service';
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
  imageUrl?: string | null;
  imageId?: number | null;
};

function toDraft(artist: Artist): ArtistDraft {
  return {
    id: artist.id,
    name: artist.name || '',
    stageName: artist.stageName || '',
    genre: artist.genre || '',
    description: artist.description || '',
    imageUrl: artist.imageUrl || null,
    imageId: undefined,
  };
}

export default function AdminArtists() {
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [newArtist, setNewArtist] = useState<ArtistDraft>({
    name: '',
    stageName: '',
    genre: '',
    description: '',
    imageUrl: null,
    imageId: null,
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

  const uploadArtistImage = async (file: File): Promise<{ imageId: number; url: string }> => {
    const uploaded = await fileUploadService.uploadImage(file);
    return { imageId: uploaded.imageId, url: uploaded.url };
  };

  const onCreate = async () => {
    if (!newArtist.name.trim()) {
      toast.error('Укажите имя артиста');
      return;
    }

    setSaving(true);
    try {
      const created = await artistService.createArtist({
        name: newArtist.name.trim(),
        stageName: newArtist.stageName.trim() || undefined,
        genre: newArtist.genre.trim() || undefined,
        description: newArtist.description.trim() || undefined,
        imageId: newArtist.imageId || undefined,
        imageUrl: newArtist.imageUrl || undefined,
      });

      setArtists((prev) => [created, ...prev]);
      setEditDrafts((prev) => ({ ...prev, [String(created.id)]: toDraft(created) }));
      setNewArtist({ name: '', stageName: '', genre: '', description: '', imageUrl: null, imageId: null });
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
      const updated = await artistService.updateArtist(artistId, {
        name: draft.name.trim(),
        stageName: draft.stageName.trim() || undefined,
        genre: draft.genre.trim() || undefined,
        description: draft.description.trim() || undefined,
        imageId: draft.imageId || undefined,
        imageUrl: draft.imageUrl || undefined,
      });

      setArtists((prev) => prev.map((artist) => (String(artist.id) === String(artistId) ? updated : artist)));
      setEditDrafts((prev) => ({ ...prev, [String(artistId)]: toDraft(updated) }));
      toast.success('Артист обновлён');
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
        <p className="mt-1 text-muted-foreground">Добавление и редактирование карточек артистов</p>
      </section>

      <section className="rounded-xl border border-border bg-card p-4 shadow-soft">
        <h2 className="font-medium text-foreground">Добавить артиста</h2>
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
          <div>
            <Label>Фото</Label>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm">
              <Upload className="h-4 w-4" />
              Загрузить
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  try {
                    const uploaded = await uploadArtistImage(file);
                    setNewArtist((prev) => ({ ...prev, imageId: uploaded.imageId, imageUrl: uploaded.url }));
                    toast.success('Фото загружено');
                  } catch {
                    toast.error('Не удалось загрузить фото');
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
            const draft = editDrafts[String(artist.id)] || toDraft(artist);
            return (
              <div key={artist.id} className="rounded-xl border border-border bg-card p-4 shadow-soft">
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <Label>Имя *</Label>
                    <Input
                      value={draft.name}
                      onChange={(e) => setEditDrafts((prev) => ({ ...prev, [String(artist.id)]: { ...draft, name: e.target.value } }))}
                    />
                  </div>
                  <div>
                    <Label>Сценическое имя</Label>
                    <Input
                      value={draft.stageName}
                      onChange={(e) => setEditDrafts((prev) => ({ ...prev, [String(artist.id)]: { ...draft, stageName: e.target.value } }))}
                    />
                  </div>
                  <div>
                    <Label>Жанр</Label>
                    <Input
                      value={draft.genre}
                      onChange={(e) => setEditDrafts((prev) => ({ ...prev, [String(artist.id)]: { ...draft, genre: e.target.value } }))}
                    />
                  </div>
                  <div>
                    <Label>Фото</Label>
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm">
                      <Upload className="h-4 w-4" />
                      Обновить фото
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async (event) => {
                          const file = event.target.files?.[0];
                          if (!file) return;
                          try {
                            const uploaded = await uploadArtistImage(file);
                            setEditDrafts((prev) => ({
                              ...prev,
                              [String(artist.id)]: {
                                ...draft,
                                imageId: uploaded.imageId,
                                imageUrl: uploaded.url,
                              },
                            }));
                            toast.success('Фото обновлено');
                          } catch {
                            toast.error('Не удалось загрузить фото');
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
                      onChange={(e) => setEditDrafts((prev) => ({ ...prev, [String(artist.id)]: { ...draft, description: e.target.value } }))}
                    />
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">ID: {artist.id}</span>
                  <Button size="sm" onClick={() => onSaveArtist(artist.id)} disabled={saving} className="gap-1.5">
                    <Save className="h-4 w-4" />
                    Сохранить изменения
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
