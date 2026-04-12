import { useEffect, useState } from 'react';
import { FileText } from 'lucide-react';
import { toast } from 'sonner';
import { publicationService } from '@/services/publication-service';
import { LoadingState } from '@/components/StateDisplays';
import { EmptyState } from '@/components/EmptyState';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { Publication, PublicationStatus } from '@/types';

const statusMap: Record<string, { label: string; cls: string }> = {
  DRAFT: { label: 'Черновик', cls: 'bg-muted text-muted-foreground' },
  PENDING: { label: 'На модерации', cls: 'bg-warning/10 text-warning' },
  PUBLISHED: { label: 'Опубликовано', cls: 'bg-success/10 text-success' },
  REJECTED: { label: 'Отклонено', cls: 'bg-destructive/10 text-destructive' },
};

export default function AdminPublications() {
  const [pubs, setPubs] = useState<Publication[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    publicationService.getAllPublications().then((response) => {
      setPubs(response);
      setLoading(false);
    });
  }, []);

  const changeStatus = async (id: string, status: PublicationStatus) => {
    await publicationService.updateStatus(id, status);
    setPubs((prev) => prev.map((publication) => (publication.id === id ? { ...publication, status } : publication)));
    toast.success('Статус обновлён');
  };

  if (loading) return <LoadingState />;

  if (pubs.length === 0) {
    return <EmptyState icon={FileText} title="Нет публикаций" description="Проверять пока нечего" />;
  }

  return (
    <div className="space-y-6">
      <section>
        <h1 className="font-heading text-3xl text-foreground sm:text-4xl">Публикации</h1>
        <p className="mt-1 text-muted-foreground">Модерация текстов и новостей организаторов</p>
      </section>

      <div className="space-y-3">
        {pubs.map((pub) => {
          const status = statusMap[pub.status];
          return (
            <div
              key={pub.id}
              className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 shadow-soft sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <div className="mb-1 flex items-center gap-2">
                  <span className="font-medium text-foreground">{pub.title}</span>
                  <Badge className={`${status.cls} border-0 text-xs`}>{status.label}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {pub.author?.firstName} {pub.author?.lastName}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {pub.status === 'PENDING' && (
                  <>
                    <Button size="sm" onClick={() => changeStatus(pub.id, 'PUBLISHED')}>
                      Опубликовать
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => changeStatus(pub.id, 'REJECTED')}>
                      Отклонить
                    </Button>
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
