import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { PublicLayout } from '@/layouts/PublicLayout';
import { EventCard } from '@/components/EventCard';
import { EmptyState } from '@/components/EmptyState';
import { LoadingState } from '@/components/StateDisplays';
import { Button } from '@/components/ui/button';
import { eventService } from '@/services/event-service';
import { directoryService } from '@/services/directory-service';
import { favoriteService } from '@/services/favorite-service';
import { useCity } from '@/contexts/CityContext';
import { useAuth } from '@/contexts/AuthContext';
import type { Category, Event, Id } from '@/types';

export default function RecommendationsPage() {
  const { selectedCity } = useCity();
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    directoryService.getCategories().then(setCategories).catch(() => {});
  }, []);

  useEffect(() => {
    if (!user) return;
    favoriteService.getMyFavorites(user.id)
      .then((favs) => setFavoriteIds(new Set(favs.map((f) => String(f.eventId)))))
      .catch(() => {});
  }, [user]);

  useEffect(() => {
    setLoading(true);
    eventService
      .getRecommendations(selectedCity?.id)
      .then((data) => setEvents(data))
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, [selectedCity?.id]);

  const toggleFavorite = async (eventId: Id) => {
    if (!user) return;
    const key = String(eventId);
    if (favoriteIds.has(key)) {
      await favoriteService.removeFavorite(user.id, eventId);
      setFavoriteIds((prev) => { const next = new Set(prev); next.delete(key); return next; });
    } else {
      await favoriteService.addFavorite(user.id, eventId);
      setFavoriteIds((prev) => new Set(prev).add(key));
    }
  };

  const filtered = selectedCategoryId
    ? events.filter((e) =>
        e.categories?.some((c) => Number(c.id) === selectedCategoryId),
      )
    : events;

  return (
    <PublicLayout>
      <div className="container mx-auto px-4 py-10">
        <div className="mb-8">
          <div className="section-label mb-3">
            <Sparkles className="h-3.5 w-3.5" />
            Для вас
          </div>
          <h1 className="font-heading text-4xl text-foreground">Рекомендации</h1>
          <p className="mt-2 text-muted-foreground">
            Мероприятия, подобранные на основе ваших интересов и местоположения
          </p>
        </div>

        {categories.length > 0 && (
          <div className="mb-6 flex flex-wrap gap-2">
            <Button
              variant={selectedCategoryId === null ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategoryId(null)}
            >
              Все
            </Button>
            {categories.map((cat) => (
              <Button
                key={cat.id}
                variant={selectedCategoryId === Number(cat.id) ? 'default' : 'outline'}
                size="sm"
                onClick={() =>
                  setSelectedCategoryId(
                    selectedCategoryId === Number(cat.id) ? null : Number(cat.id),
                  )
                }
              >
                {cat.name}
              </Button>
            ))}
          </div>
        )}

        {loading ? (
          <LoadingState />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Sparkles}
            title="Пока нет рекомендаций"
            description="Посещайте мероприятия и добавляйте их в избранное — мы подберём похожие события"
          />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                isFavorite={favoriteIds.has(String(event.id))}
                onFavoriteToggle={user ? toggleFavorite : undefined}
              />
            ))}
          </div>
        )}
      </div>
    </PublicLayout>
  );
}
