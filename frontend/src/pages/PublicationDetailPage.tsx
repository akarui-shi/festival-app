import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { PublicLayout } from '@/layouts/PublicLayout';
import { LoadingState, ErrorState } from '@/components/StateDisplays';
import { Badge } from '@/components/ui/badge';
import { publicationService } from '@/services/publication-service';
import type { Publication } from '@/types';
import { Calendar, User } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

export default function PublicationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [pub, setPub] = useState<Publication | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    publicationService.getPublicationById(id)
      .then(p => { setPub(p); setLoading(false); })
      .catch(() => { setError('Публикация не найдена'); setLoading(false); });
  }, [id]);

  if (loading) return <PublicLayout><LoadingState /></PublicLayout>;
  if (error || !pub) return <PublicLayout><ErrorState message={error || 'Не найдено'} /></PublicLayout>;

  return (
    <PublicLayout>
      <article className="container max-w-3xl py-10">
        <div className="flex flex-wrap gap-2 mb-4">
          {pub.tags.map(t => <Badge key={t} variant="secondary">{t}</Badge>)}
        </div>
        <h1 className="font-heading text-3xl md:text-4xl font-bold mb-4">{pub.title}</h1>
        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-8">
          {pub.publishedAt && <span className="flex items-center gap-1.5"><Calendar className="h-4 w-4" />{format(new Date(pub.publishedAt), 'd MMMM yyyy', { locale: ru })}</span>}
          {pub.author && <span className="flex items-center gap-1.5"><User className="h-4 w-4" />{pub.author.firstName} {pub.author.lastName}</span>}
        </div>
        <div className="prose prose-sm max-w-none text-foreground whitespace-pre-line leading-relaxed">
          {pub.content}
        </div>
      </article>
    </PublicLayout>
  );
}
