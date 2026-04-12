import { useEffect, useState } from 'react';
import { Heart } from 'lucide-react';
import { toast } from 'sonner';
import { PublicLayout } from '@/layouts/PublicLayout';
import { EventCard } from '@/components/EventCard';
import { EmptyState } from '@/components/EmptyState';
import { LoadingState } from '@/components/StateDisplays';
import { useAuth } from '@/contexts/AuthContext';
import { favoriteService } from '@/services/favorite-service';
import type { Favorite } from '@/types';

export default function FavoritesPage() {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    favoriteService
      .getMyFavorites(user.id)
      .then((response) => setFavorites(response))
      .finally(() => setLoading(false));
  }, [user]);

  const removeFavorite = async (eventId: string) => {
    if (!user) return;

    await favoriteService.removeFavorite(user.id, eventId);
    setFavorites((prev) => prev.filter((favorite) => favorite.eventId !== eventId));
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
            {favorites.map((favorite) =>
              favorite.event ? (
                <EventCard
                  key={favorite.id}
                  event={favorite.event}
                  isFavorite
                  onFavoriteToggle={removeFavorite}
                />
              ) : null,
            )}
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
