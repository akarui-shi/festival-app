import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Building2, CalendarDays, FileText } from 'lucide-react';
import { PublicLayout } from '@/layouts/PublicLayout';
import { LoadingState } from '@/components/StateDisplays';
import { EmptyState } from '@/components/EmptyState';
import { publicationService } from '@/services/publication-service';
import type { Publication } from '@/types';

function formatDate(value?: string): string {
  if (!value) return 'Черновик';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Черновик';
  }

  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

export default function PublicationsPage() {
  const [publications, setPublications] = useState<Publication[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    publicationService
      .getPublications()
      .then((response) => setPublications(response))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <PublicLayout>
        <LoadingState />
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="font-heading text-3xl text-foreground sm:text-4xl">Публикации</h1>
        <p className="mt-1 text-muted-foreground">Статьи и новости о культурной жизни</p>

        {publications.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="Нет публикаций"
            description="Публикации появятся здесь, когда организаторы начнут делиться новостями"
          />
        ) : (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {publications.map((publication) => (
              <Link
                key={publication.id}
                to={`/publications/${publication.id}`}
                className="group overflow-hidden rounded-xl border border-border bg-card shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-hover"
              >
                <div className="aspect-[3/2] overflow-hidden bg-muted">
                  <img
                    src={publication.eventImageUrl || publication.imageUrl || '/placeholder.svg'}
                    alt={publication.eventTitle || publication.title}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
                <div className="p-4">
                  <div className="mb-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <CalendarDays className="h-3.5 w-3.5 text-primary/70" />
                    <span>{formatDate(publication.publishedAt)}</span>
                  </div>
                  <h2 className="font-heading text-lg text-foreground group-hover:text-primary">
                    {publication.title}
                  </h2>
                  <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">
                    {publication.excerpt || 'Краткое описание публикации появится позже'}
                  </p>
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Building2 className="h-3.5 w-3.5 text-primary/70" />
                    <span className="truncate">{publication.organization?.name || 'Организация не указана'}</span>
                  </div>
                  <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary">
                    Читать <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </PublicLayout>
  );
}
