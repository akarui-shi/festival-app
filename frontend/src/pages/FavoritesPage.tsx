import { useEffect, useState } from 'react';
import { Heart } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { PublicLayout } from '@/layouts/PublicLayout';
import { EventCard } from '@/components/EventCard';
import { LoadingState } from '@/components/StateDisplays';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { favoriteService } from '@/services/favorite-service';
import { eventService } from '@/services/event-service';
import type { Event, Favorite } from '@/types';

function favoriteToEvent(favorite: Favorite): Event {
  return {
    id: favorite.eventId,
    title: favorite.title,
    shortDescription: favorite.shortDescription || null,
    coverImageId: favorite.coverImageId || null,
    ageRating: favorite.ageRating || null,
    status: favorite.status ? String(favorite.status) : null,
  };
}

export default function FavoritesPage() {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [eventsById, setEventsById] = useState<Record<string, Event>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setFavorites([]); setLoading(false); return; }

    favoriteService.getMyFavorites(user.id)
      .then(async (response) => {
        if (!response.length) { setFavorites([]); setEventsById({}); return; }
        setFavorites(response);
        const uniqueEventIds = [...new Set(response.map((item) => String(item.eventId)))];
        const eventResults = await Promise.allSettled(uniqueEventIds.map((eventId) => eventService.getEventById(eventId)));
        const nextMap: Record<string, Event> = {};
        eventResults.forEach((result, index) => {
          if (result.status !== 'fulfilled') return;
          nextMap[uniqueEventIds[index]] = result.value;
        });
        setEventsById(nextMap);
      })
      .catch((error: any) => { toast.error(error?.message || 'Не удалось загрузить избранное'); })
      .finally(() => setLoading(false));
  }, [user]);

  const removeFavorite = async (eventId: string | number) => {
    if (!user) return;
    await favoriteService.removeFavorite(user.id, eventId);
    setFavorites((prev) => prev.filter((favorite) => String(favorite.eventId) !== String(eventId)));
    setEventsById((prev) => { const next = { ...prev }; delete next[String(eventId)]; return next; });
    toast.success('Удалено из избранного');
  };

  if (loading) return <PublicLayout><LoadingState /></PublicLayout>;

  return (
    <PublicLayout>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-gradient-to-br from-[hsl(var(--warm-cream))] via-background to-[hsl(var(--golden-light)/0.2)]" />
        <div className="container relative mx-auto px-4 py-12">
          <div className="section-label">
            <Heart className="h-3.5 w-3.5 fill-current" />
            Сохранённые мероприятия
          </div>
          <h1 className="mt-1 font-heading text-4xl tracking-tight text-foreground sm:text-5xl">
            Избранное
          </h1>
          <p className="mt-3 text-lg text-muted-foreground">
            {favorites.length > 0
              ? `${favorites.length} мероприяти${favorites.length === 1 ? 'е' : favorites.length < 5 ? 'я' : 'й'}`
              : 'Мероприятия, которые вы сохранили'}
          </p>
        </div>
      </section>

      <section className="container mx-auto px-4 py-10">
        {favorites.length > 0 ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {favorites.map((favorite) => (
              <EventCard
                key={String(favorite.eventId)}
                event={eventsById[String(favorite.eventId)] || favorite.event || favoriteToEvent(favorite)}
                isFavorite
                onFavoriteToggle={removeFavorite}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-5 rounded-2xl border border-dashed border-border bg-card/60 py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5">
              <Heart className="h-8 w-8 text-primary/60" />
            </div>
            <div>
              <p className="font-heading text-xl text-foreground">Нет избранного</p>
              <p className="mt-1.5 max-w-xs text-sm text-muted-foreground">
                Нажимайте на сердечко на карточке мероприятия, чтобы сохранить его здесь
              </p>
            </div>
            <Button asChild className="gap-2 shadow-sm shadow-primary/20">
              <Link to="/events">Смотреть афишу</Link>
            </Button>
          </div>
        )}
      </section>
    </PublicLayout>
  );
}
