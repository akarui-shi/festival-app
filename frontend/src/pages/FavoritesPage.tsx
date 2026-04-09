import { useEffect, useState } from 'react';
import { PublicLayout } from '@/layouts/PublicLayout';
import { EventCard } from '@/components/EventCard';
import { LoadingState, EmptyState } from '@/components/StateDisplays';
import { useAuth } from '@/contexts/AuthContext';
import { favoriteService } from '@/services/favorite-service';
import type { Favorite } from '@/types';
import { Heart } from 'lucide-react';
import { toast } from 'sonner';

export default function FavoritesPage() {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    if (!user) return;
    favoriteService.getMyFavorites(user.id).then(f => { setFavorites(f); setLoading(false); });
  };

  useEffect(load, [user]);

  const removeFav = async (eventId: string) => {
    if (!user) return;
    await favoriteService.removeFavorite(user.id, eventId);
    setFavorites(prev => prev.filter(f => f.eventId !== eventId));
    toast.success('Удалено из избранного');
  };

  if (loading) return <PublicLayout><LoadingState /></PublicLayout>;

  return (
    <PublicLayout>
      <div className="container py-8">
        <h1 className="font-heading text-3xl font-bold mb-2">Избранное</h1>
        <p className="text-muted-foreground mb-8">Мероприятия, которые вы сохранили</p>

        {favorites.length === 0 ? (
          <EmptyState icon={<Heart className="h-12 w-12 text-muted-foreground" />} title="Пока пусто" description="Добавляйте мероприятия в избранное, нажимая на сердечко" />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {favorites.map(f => f.event && (
              <EventCard key={f.id} event={f.event} isFavorite onFavoriteToggle={removeFav} />
            ))}
          </div>
        )}
      </div>
    </PublicLayout>
  );
}
