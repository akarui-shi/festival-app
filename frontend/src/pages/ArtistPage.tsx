import { useEffect, useState } from 'react';
import { ArrowLeft, Mic2 } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { PublicLayout } from '@/layouts/PublicLayout';
import { EventCard } from '@/components/EventCard';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState, LoadingState } from '@/components/StateDisplays';
import { artistService } from '@/services/artist-service';
import { imageSrc } from '@/lib/image';
import type { Artist, Event } from '@/types';

export default function ArtistPage() {
  const { id } = useParams<{ id: string }>();
  const [artist, setArtist] = useState<Artist | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedImageId, setSelectedImageId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    artistService.getArtistById(id)
      .then((response) => {
        setArtist(response);
        setEvents(response.events || []);
        setSelectedImageId(response.primaryImageId ?? response.imageIds?.[0] ?? response.imageId ?? null);
      })
      .catch(() => setError('Не удалось загрузить страницу артиста'))
      .finally(() => setLoading(false));
  }, [id]);

  const artistImageIds = artist
    ? (() => {
        const ids = artist.imageIds && artist.imageIds.length > 0 ? artist.imageIds : artist.imageId != null ? [Number(artist.imageId)] : [];
        return ids.filter((v, i, arr) => arr.indexOf(v) === i);
      })()
    : [];
  const activeImageId = artist ? (selectedImageId ?? artist.primaryImageId ?? artistImageIds[0] ?? null) : null;

  if (loading) return <PublicLayout><LoadingState /></PublicLayout>;
  if (error || !artist) return <PublicLayout><ErrorState message={error || 'Артист не найден'} /></PublicLayout>;

  return (
    <PublicLayout>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        {/* Background: use first photo as blurred backdrop or gradient */}
        {activeImageId ? (
          <>
            <div
              className="absolute inset-0 bg-cover bg-center opacity-20 blur-xl scale-105"
              style={{ backgroundImage: `url(${imageSrc(activeImageId)})` }}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/80 to-background" />
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[hsl(var(--warm-cream))] via-background to-[hsl(var(--golden-light)/0.2)]" />
        )}

        <div className="container relative mx-auto px-4 py-12">
          <Link to="/events" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-primary">
            <ArrowLeft className="h-4 w-4" />К мероприятиям
          </Link>

          <div className="flex flex-col gap-6 sm:flex-row sm:items-end">
            {/* Photo */}
            <div className="relative h-32 w-32 shrink-0 overflow-hidden rounded-2xl border-4 border-card shadow-card sm:h-40 sm:w-40">
              {activeImageId ? (
                <img src={imageSrc(activeImageId)} alt={artist.stageName || artist.name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/15 to-primary/5">
                  <Mic2 className="h-12 w-12 text-primary/60" />
                </div>
              )}
            </div>

            <div className="min-w-0">
              {artist.genre && (
                <div className="section-label mb-2">
                  <Mic2 className="h-3.5 w-3.5" />
                  {artist.genre}
                </div>
              )}
              <h1 className="font-heading text-4xl tracking-tight text-foreground sm:text-5xl">
                {artist.stageName || artist.name}
              </h1>
              {artist.stageName && artist.name !== artist.stageName && (
                <p className="mt-1 text-sm text-muted-foreground">{artist.name}</p>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-10 space-y-10">
        {/* Bio */}
        {artist.description && (
          <section className="surface-panel">
            <p className="whitespace-pre-line text-[15px] leading-7 text-foreground/90">{artist.description}</p>
          </section>
        )}

        {/* Gallery */}
        {artistImageIds.length > 1 && (
          <section>
            <h2 className="mb-4 font-heading text-xl text-foreground">Фотографии</h2>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
              {artistImageIds.map((imageId) => (
                <button
                  key={imageId}
                  type="button"
                  onClick={() => setSelectedImageId(imageId)}
                  className={`overflow-hidden rounded-xl border-2 transition-all ${activeImageId === imageId ? 'border-primary shadow-soft' : 'border-border hover:border-primary/40'}`}
                >
                  <img src={imageSrc(imageId)} alt="" className="aspect-square w-full object-cover" />
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Events */}
        <section>
          <h2 className="mb-1 font-heading text-2xl text-foreground">Мероприятия с участием артиста</h2>
          <p className="mb-6 text-muted-foreground">Ближайшие и прошедшие события</p>
          {events.length > 0 ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {events.map((event) => <EventCard key={event.id} event={event} />)}
            </div>
          ) : (
            <EmptyState icon={Mic2} title="Пока нет мероприятий" description="Скоро здесь появятся события с участием артиста" />
          )}
        </section>
      </div>
    </PublicLayout>
  );
}
