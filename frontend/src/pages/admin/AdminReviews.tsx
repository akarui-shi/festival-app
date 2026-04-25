import { useEffect, useState } from 'react';
import { MessageSquare, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { reviewService } from '@/services/review-service';
import { LoadingState } from '@/components/StateDisplays';
import { EmptyState } from '@/components/EmptyState';
import { Button } from '@/components/ui/button';
import { StarRating } from '@/components/StarRating';
import { imageSrc } from '@/lib/image';
import type { Review } from '@/types';

export default function AdminReviews() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    reviewService.getAllReviews().then((response) => { setReviews(response); setLoading(false); });
  }, []);

  const del = async (id: string) => {
    await reviewService.deleteReview(id);
    setReviews((prev) => prev.filter((review) => String(review.commentId) !== String(id)));
    toast.success('Комментарий удалён');
  };

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
          Всего: {reviews.length}
        </span>
      </section>

      <div className="space-y-2.5">
        {reviews.map((review) => {
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
    </div>
  );
}
