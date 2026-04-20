import { useEffect, useState } from 'react';
import { ExternalLink, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
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
    setPubs((prev) => prev.map((publication) => (String(publication.publicationId) === String(id) ? { ...publication, status } : publication)));
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
              key={pub.publicationId}
              className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 shadow-soft sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <div className="mb-1 flex items-center gap-2">
                  <span className="font-medium text-foreground">{pub.title}</span>
                  <Badge className={`${status.cls} border-0 text-xs`}>{status.label}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {pub.preview || pub.excerpt || 'Без анонса'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {pub.authorName || 'Автор'}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" asChild>
                  <Link to={`/publications/${pub.publicationId ?? pub.id}`} target="_blank" rel="noreferrer" className="gap-1.5">
                    Подробнее
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                </Button>
                {pub.status === 'PENDING' && (
                  <>
                    <Button size="sm" onClick={() => changeStatus(String(pub.publicationId), 'PUBLISHED')}>
                      Опубликовать
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => changeStatus(String(pub.publicationId), 'REJECTED')}>
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
