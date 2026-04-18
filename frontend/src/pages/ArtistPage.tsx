import { useEffect, useState } from 'react';
import { ArrowLeft, Mic2 } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { PublicLayout } from '@/layouts/PublicLayout';
import { EventCard } from '@/components/EventCard';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState, LoadingState } from '@/components/StateDisplays';
import { artistService } from '@/services/artist-service';
import type { Artist, Event } from '@/types';

export default function ArtistPage() {
  const { id } = useParams<{ id: string }>();
  const [artist, setArtist] = useState<Artist | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;

    setLoading(true);
    artistService
      .getArtistById(id)
      .then((response) => {
        setArtist(response);
        setEvents(response.events || []);
      })
      .catch(() => setError('Не удалось загрузить страницу артиста'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <PublicLayout>
        <LoadingState />
      </PublicLayout>
    );
  }

  if (error || !artist) {
    return (
      <PublicLayout>
        <ErrorState message={error || 'Артист не найден'} />
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="container mx-auto px-4 py-8">
        <Link
          to="/events"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          К мероприятиям
        </Link>

        <section className="rounded-2xl border border-border bg-card p-6 shadow-card sm:p-8">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              <Mic2 className="h-6 w-6 text-primary" />
            </div>
            <div className="min-w-0">
              <h1 className="font-heading text-3xl text-foreground sm:text-4xl">{artist.stageName || artist.name}</h1>
              <p className="mt-1 text-sm text-muted-foreground">{artist.genre || 'Жанр не указан'}</p>
              <p className="mt-3 whitespace-pre-line text-muted-foreground">
                {artist.description || 'Описание артиста пока не заполнено.'}
              </p>
            </div>
          </div>
        </section>

        <section className="mt-8">
          <h2 className="font-heading text-2xl text-foreground">Мероприятия с участием артиста</h2>

          {events.length > 0 ? (
            <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {events.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          ) : (
            <EmptyState icon={Mic2} title="Пока нет мероприятий" description="Скоро здесь появятся события с участием артиста" />
          )}
        </section>
      </div>
    </PublicLayout>
  );
}
