import { useEffect, useState } from 'react';
import { ArrowLeft, Building2, Calendar, Link2, User } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { PublicLayout } from '@/layouts/PublicLayout';
import { LoadingState, ErrorState } from '@/components/StateDisplays';
import { Badge } from '@/components/ui/badge';
import { publicationService } from '@/services/publication-service';
import type { Publication } from '@/types';

function formatPublishedDate(value?: string): string {
  if (!value) return 'Дата публикации уточняется';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Дата публикации уточняется';
  }

  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

export default function PublicationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [pub, setPub] = useState<Publication | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    publicationService.getPublicationById(id)
      .then((publication) => {
        setPub(publication);
        setLoading(false);
      })
      .catch(() => {
        setError('Публикация не найдена');
        setLoading(false);
      });
  }, [id]);

  if (loading) return <PublicLayout><LoadingState /></PublicLayout>;
  if (error || !pub) return <PublicLayout><ErrorState message={error || 'Не найдено'} /></PublicLayout>;
  const organizationLink = pub.organizationId ? `/organizations/${pub.organizationId}` : null;
  const eventLink = pub.eventId ? `/events/${pub.eventId}` : null;
  const eventImage = pub.eventImageUrl || pub.imageUrl || '/placeholder.svg';

  return (
    <PublicLayout>
      <article className="page-shell-narrow">
        <Link
          to="/publications"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Все публикации
        </Link>

        <div className="surface-panel">
          <div className="overflow-hidden rounded-xl border border-border bg-muted">
            <img
              src={eventImage}
              alt={pub.eventTitle || pub.title}
              className="aspect-[16/9] w-full object-cover"
            />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {pub.tags.map((tag) => (
              <Badge key={tag} variant="secondary">
                {tag}
              </Badge>
            ))}
          </div>

          <header className="mt-5 border-b border-border pb-6">
            <h1 className="font-heading text-3xl text-foreground sm:text-4xl">{pub.title}</h1>
            {pub.excerpt && (
              <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">{pub.excerpt}</p>
            )}

            <div className="mt-5 flex flex-wrap gap-4 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-primary" />
                {formatPublishedDate(pub.publishedAt)}
              </span>
              {pub.organization && (
                <span className="inline-flex items-center gap-1.5">
                  <Building2 className="h-4 w-4 text-primary" />
                  {organizationLink ? (
                    <Link to={organizationLink} className="hover:text-primary hover:underline">
                      {pub.organization.name}
                    </Link>
                  ) : (
                    <span>{pub.organization.name}</span>
                  )}
                </span>
              )}
              {(pub.eventTitle || pub.eventId) && (
                <span className="inline-flex items-center gap-1.5">
                  <Link2 className="h-4 w-4 text-primary" />
                  {eventLink ? (
                    <Link to={eventLink} className="hover:text-primary hover:underline">
                      {pub.eventTitle || 'Перейти к мероприятию'}
                    </Link>
                  ) : (
                    <span>{pub.eventTitle}</span>
                  )}
                </span>
              )}
            </div>
          </header>

          <div className="mt-8 whitespace-pre-line text-[15px] leading-8 text-foreground/90">
            {pub.content}
          </div>
        </div>
      </article>
    </PublicLayout>
  );
}
