import { useEffect, useState } from 'react';
import { reviewService } from '@/services/review-service';
import { LoadingState } from '@/components/StateDisplays';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StarRating } from '@/components/StarRating';
import type { Review } from '@/types';
import { toast } from 'sonner';

export default function AdminReviews() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { reviewService.getAllReviews().then(r => { setReviews(r); setLoading(false); }); }, []);

  const del = async (id: string) => {
    await reviewService.deleteReview(id);
    setReviews(prev => prev.filter(r => r.id !== id));
    toast.success('Удалено');
  };

  if (loading) return <LoadingState />;

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold mb-6">Отзывы пользователей</h1>
      <div className="space-y-3">
        {reviews.map(r => (
          <div key={r.id} className="p-4 rounded-xl border border-border bg-card">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-medium">{r.user?.firstName} {r.user?.lastName}</span>
                  <StarRating rating={r.rating} size="sm" />
                  <Badge className={`text-xs border-0 ${r.status === 'APPROVED' ? 'bg-success/10 text-success' : r.status === 'PENDING' ? 'bg-warning/10 text-warning' : 'bg-destructive/10 text-destructive'}`}>
                    {r.status === 'APPROVED' ? 'Одобрен' : r.status === 'PENDING' ? 'На модерации' : 'Отклонён'}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{r.comment}</p>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={() => del(r.id)} className="text-destructive">Удалить</Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
