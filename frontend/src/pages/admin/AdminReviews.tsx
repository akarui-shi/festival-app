import { useEffect, useMemo, useState } from 'react';
import { MessageSquare, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { reviewService } from '@/services/review-service';
import { LoadingState } from '@/components/StateDisplays';
import { EmptyState } from '@/components/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StarRating } from '@/components/StarRating';
import { imageSrc } from '@/lib/image';
import type { Review } from '@/types';

export default function AdminReviews() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  useEffect(() => {
    reviewService.getAllReviews().then((response) => { setReviews(response); setLoading(false); });
  }, []);

  const del = async (id: string) => {
    await reviewService.deleteReview(id);
    setReviews((prev) => prev.filter((review) => String(review.commentId) !== String(id)));
    toast.success('Комментарий удалён');
  };

  const filteredReviews = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return reviews;
    return reviews.filter((review) => {
      const searchable = [
        review.userDisplayName,
        review.text,
        review.comment,
        review.eventId ? `мероприятие ${review.eventId}` : null,
        review.userId ? `пользователь ${review.userId}` : null,
        review.rating != null ? String(review.rating) : null,
        review.moderationStatus,
        review.status,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return searchable.includes(q);
    });
  }, [query, reviews]);

  if (loading) return <LoadingState />;
  if (reviews.length === 0) return <EmptyState icon={MessageSquare} title="Нет комментариев" description="Список комментариев пока пуст" />;

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="page-title">Комментарии</h1>
          <p className="mt-1 text-muted-foreground">Комментарии публикуются сразу. Админ может удалить неподходящий контент.</p>
        </div>
        <span className="rounded-full bg-muted px-3 py-1 text-sm font-medium text-muted-foreground">
          {query.trim() ? `Найдено: ${filteredReviews.length} из ${reviews.length}` : `Всего: ${reviews.length}`}
        </span>
      </section>

      <section className="surface-soft">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Поиск по тексту, автору, оценке..."
            className="pl-9"
          />
        </div>
      </section>

      {filteredReviews.length === 0 ? (
        <EmptyState icon={MessageSquare} title="Ничего не найдено" description="Измените строку поиска" />
      ) : (
      <div className="space-y-2.5">
        {filteredReviews.map((review) => {
          const initials = (review.userDisplayName || '?').split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
          const avatarImageId = review.userAvatarImageId ?? review.user?.avatarImageId ?? null;

          return (
            <div
              key={review.commentId}
              className="flex gap-4 rounded-2xl border border-border bg-card p-4 shadow-soft transition-colors hover:border-primary/15"
            >
              {/* Avatar */}
              {avatarImageId != null ? (
                <img
                  src={imageSrc(avatarImageId)}
                  alt={review.userDisplayName || 'Аватар пользователя'}
                  className="h-9 w-9 shrink-0 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/60 to-[hsl(var(--terracotta-dark)/0.5)] text-xs font-bold text-white">
                  {initials}
                </div>
              )}

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-foreground">{review.userDisplayName || 'Пользователь'}</span>
                  <StarRating rating={review.rating || 0} size="sm" />
                </div>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{review.text}</p>
              </div>

              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => del(String(review.commentId))}
                title="Удалить комментарий"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          );
        })}
      </div>
      )}
    </div>
  );
}
