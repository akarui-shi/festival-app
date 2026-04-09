import { useEffect, useState } from 'react';
import { publicationService } from '@/services/publication-service';
import { LoadingState } from '@/components/StateDisplays';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { Publication, PublicationStatus } from '@/types';
import { toast } from 'sonner';

const statusMap: Record<string, { label: string; cls: string }> = {
  DRAFT: { label: 'Черновик', cls: 'bg-muted text-muted-foreground' },
  PENDING: { label: 'На модерации', cls: 'bg-warning/10 text-warning' },
  PUBLISHED: { label: 'Опубликовано', cls: 'bg-success/10 text-success' },
  REJECTED: { label: 'Отклонено', cls: 'bg-destructive/10 text-destructive' },
};

export default function AdminPublications() {
  const [pubs, setPubs] = useState<Publication[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { publicationService.getAllPublications().then(p => { setPubs(p); setLoading(false); }); }, []);

  const changeStatus = async (id: string, status: PublicationStatus) => {
    await publicationService.updateStatus(id, status);
    setPubs(prev => prev.map(p => p.id === id ? { ...p, status } : p));
    toast.success('Статус обновлён');
  };

  if (loading) return <LoadingState />;

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold mb-6">Модерация публикаций</h1>
      <div className="space-y-3">
        {pubs.map(pub => {
          const st = statusMap[pub.status];
          return (
            <div key={pub.id} className="p-4 rounded-xl border border-border bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium">{pub.title}</span>
                  <Badge className={`${st.cls} border-0 text-xs`}>{st.label}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{pub.author?.firstName} {pub.author?.lastName}</p>
              </div>
              <div className="flex items-center gap-2">
                {pub.status === 'PENDING' && (
                  <>
                    <Button size="sm" onClick={() => changeStatus(pub.id, 'PUBLISHED')}>Опубликовать</Button>
                    <Button size="sm" variant="destructive" onClick={() => changeStatus(pub.id, 'REJECTED')}>Отклонить</Button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
