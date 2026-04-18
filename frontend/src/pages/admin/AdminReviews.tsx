import { useEffect, useState } from 'react';
import { MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { reviewService } from '@/services/review-service';
import { LoadingState } from '@/components/StateDisplays';
import { EmptyState } from '@/components/EmptyState';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StarRating } from '@/components/StarRating';
import type { Review } from '@/types';

export default function AdminReviews() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    reviewService.getAllReviews().then((response) => {
      setReviews(response);
      setLoading(false);
    });
  }, []);

  const del = async (id: string) => {
    await reviewService.deleteReview(id);
    setReviews((prev) => prev.filter((review) => String(review.commentId) !== String(id)));
    toast.success('Удалено');
  };

  if (loading) return <LoadingState />;

  if (reviews.length === 0) {
    return <EmptyState icon={MessageSquare} title="Нет комментариев" description="Список комментариев пока пуст" />;
  }

  return (
    <div className="space-y-6">
      <section>
        <h1 className="font-heading text-3xl text-foreground sm:text-4xl">Комментарии пользователей</h1>
        <p className="mt-1 text-muted-foreground">Контроль качества и модерация пользовательского контента</p>
      </section>

      <div className="space-y-3">
        {reviews.map((review) => (
          <div key={review.commentId} className="rounded-xl border border-border bg-card p-4 shadow-soft">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
              <div className="flex-1">
                <div className="mb-2 flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">
                    {review.userDisplayName || 'Пользователь'}
                  </span>
                  <StarRating rating={review.rating || 0} size="sm" />
                  <Badge
                    className={`border-0 text-xs ${
                      review.moderationStatus === 'одобрено'
                        ? 'bg-success/10 text-success'
                        : review.moderationStatus === 'на_рассмотрении'
                          ? 'bg-warning/10 text-warning'
                          : 'bg-destructive/10 text-destructive'
                    }`}
                  >
                    {review.moderationStatus === 'одобрено' ? 'Одобрен' : review.moderationStatus === 'на_рассмотрении' ? 'На модерации' : 'Отклонён'}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{review.text}</p>
              </div>

              <Button variant="ghost" size="sm" onClick={() => del(String(review.commentId))} className="text-destructive">
                Удалить
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
