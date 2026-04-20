import { useEffect, useState } from 'react';
import { Heart } from 'lucide-react';
import { toast } from 'sonner';
import { PublicLayout } from '@/layouts/PublicLayout';
import { EventCard } from '@/components/EventCard';
import { EmptyState } from '@/components/EmptyState';
import { LoadingState } from '@/components/StateDisplays';
import { useAuth } from '@/contexts/AuthContext';
import { favoriteService } from '@/services/favorite-service';
import { eventService } from '@/services/event-service';
import type { Event, Favorite } from '@/types';

function favoriteToEvent(favorite: Favorite): Event {
  return {
    id: favorite.eventId,
    title: favorite.title,
    shortDescription: favorite.shortDescription || null,
    coverUrl: favorite.coverUrl || null,
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
    if (!user) {
      setFavorites([]);
      setLoading(false);
      return;
    }

    favoriteService
      .getMyFavorites(user.id)
      .then(async (response) => {
        if (!response.length) {
          setFavorites([]);
          setEventsById({});
          return;
        }

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
      .catch((error: any) => {
        toast.error(error?.message || 'Не удалось загрузить избранное');
      })
      .finally(() => setLoading(false));
  }, [user]);

  const removeFavorite = async (eventId: string | number) => {
    if (!user) return;

    await favoriteService.removeFavorite(user.id, eventId);
    setFavorites((prev) => prev.filter((favorite) => String(favorite.eventId) !== String(eventId)));
    setEventsById((prev) => {
      const next = { ...prev };
      delete next[String(eventId)];
      return next;
    });
    toast.success('Удалено из избранного');
  };

  if (loading) {
    return (
      <PublicLayout>
        <LoadingState />
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="font-heading text-3xl text-foreground sm:text-4xl">Избранное</h1>
        <p className="mt-1 text-muted-foreground">Мероприятия, которые вы сохранили</p>

        {favorites.length > 0 ? (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
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
          <EmptyState
            icon={Heart}
            title="Нет избранного"
            description="Добавляйте мероприятия в избранное, чтобы не потерять их"
          />
        )}
      </div>
    </PublicLayout>
  );
}
