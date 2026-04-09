import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PublicLayout } from '@/layouts/PublicLayout';
import { LoadingState, EmptyState } from '@/components/StateDisplays';
import { publicationService } from '@/services/publication-service';
import type { Publication } from '@/types';
import { Calendar, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

export default function PublicationsPage() {
  const [publications, setPublications] = useState<Publication[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    publicationService.getPublications().then(p => { setPublications(p); setLoading(false); });
  }, []);

  if (loading) return <PublicLayout><LoadingState /></PublicLayout>;

  return (
    <PublicLayout>
      <div className="container py-8">
        <h1 className="font-heading text-3xl md:text-4xl font-bold mb-2">Новости и статьи</h1>
        <p className="text-muted-foreground mb-8">Читайте о культурной жизни города</p>

        {publications.length === 0 ? (
          <EmptyState icon="📰" title="Пока нет публикаций" description="Скоро здесь появятся новости" />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {publications.map(pub => (
              <Link key={pub.id} to={`/publications/${pub.id}`}
                className="group block rounded-xl border border-border bg-card overflow-hidden hover:shadow-lg transition-all hover:-translate-y-1">
                <div className="h-40 bg-gradient-to-br from-accent/10 via-primary/5 to-background flex items-center justify-center">
                  <span className="text-4xl opacity-30">📰</span>
                </div>
                <div className="p-5">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                    <Calendar className="h-3.5 w-3.5" />
                    {pub.publishedAt ? format(new Date(pub.publishedAt), 'd MMMM yyyy', { locale: ru }) : 'Черновик'}
                    {pub.author && <span>· {pub.author.firstName} {pub.author.lastName}</span>}
                  </div>
                  <h3 className="font-heading text-lg font-semibold mb-2 group-hover:text-primary transition-colors">{pub.title}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{pub.excerpt}</p>
                  <span className="text-sm text-primary flex items-center gap-1">Читать далее <ArrowRight className="h-3.5 w-3.5" /></span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </PublicLayout>
  );
}
