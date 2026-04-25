import { useEffect, useState } from 'react';
import { ArrowLeft, Building2, Calendar, ExternalLink } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { PublicLayout } from '@/layouts/PublicLayout';
import { LoadingState, ErrorState } from '@/components/StateDisplays';
import { Badge } from '@/components/ui/badge';
import { imageSrc } from '@/lib/image';
import { publicationService } from '@/services/publication-service';
import type { Publication } from '@/types';

function formatPublishedDate(value?: string): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }).format(date);
}

export default function PublicationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [pub, setPub] = useState<Publication | null>(null);
  const [selectedImageId, setSelectedImageId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    publicationService.getPublicationById(id)
      .then((publication) => {
        setPub(publication);
        const firstImageId = publication.imageIds && publication.imageIds.length > 0
          ? Number(publication.imageIds[0])
          : publication.imageId != null ? Number(publication.imageId) : null;
        setSelectedImageId(firstImageId);
        setLoading(false);
      })
      .catch(() => { setError('Публикация не найдена'); setLoading(false); });
  }, [id]);

  if (loading) return <PublicLayout><LoadingState /></PublicLayout>;
  if (error || !pub) return <PublicLayout><ErrorState message={error || 'Не найдено'} /></PublicLayout>;

  const organizationLink = pub.organizationId ? `/organizations/${pub.organizationId}` : null;
  const eventLink = pub.eventId ? `/events/${pub.eventId}` : null;
  const publicationImageIds = pub.imageIds && pub.imageIds.length > 0
    ? pub.imageIds.map((v) => Number(v)).filter((v) => Number.isFinite(v))
    : pub.imageId != null ? [Number(pub.imageId)] : [];
  const mainImageId = publicationImageIds.find((imgId) => imgId === selectedImageId) ?? publicationImageIds[0] ?? (pub.eventImageId == null ? null : Number(pub.eventImageId));
  const dateLabel = formatPublishedDate(pub.publishedAt);

  return (
    <PublicLayout>
      <article className="container mx-auto max-w-3xl px-4 py-10">
        {/* Back */}
        <Link
          to="/publications"
          className="mb-8 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Все публикации
        </Link>

        {/* Main image */}
        <div className="overflow-hidden rounded-2xl border border-border bg-muted shadow-card">
          <img
            src={imageSrc(mainImageId, '/placeholder-event.svg')}
            alt={pub.eventTitle || pub.title}
            className="aspect-[16/9] w-full object-cover"
          />
        </div>

        {/* Gallery thumbnails */}
        {publicationImageIds.length > 1 && (
          <div className="mt-3 grid grid-cols-5 gap-2">
            {publicationImageIds.map((imageId) => (
              <button
                key={imageId}
                type="button"
                onClick={() => setSelectedImageId(imageId)}
                className={`overflow-hidden rounded-xl border-2 transition-all ${mainImageId === imageId ? 'border-primary shadow-soft' : 'border-border hover:border-primary/40'}`}
              >
                <img src={imageSrc(imageId)} alt="" className="aspect-[4/3] w-full object-cover" />
              </button>
            ))}
          </div>
        )}

        {/* Tags */}
        {(pub.tags || []).length > 0 && (
          <div className="mt-5 flex flex-wrap gap-2">
            {(pub.tags || []).map((tag) => (
              <Badge key={tag} variant="secondary">{tag}</Badge>
            ))}
          </div>
        )}

        {/* Title + meta */}
        <header className="mt-6 border-b border-border pb-6">
          <h1 className="font-heading text-3xl leading-tight text-foreground sm:text-4xl">{pub.title}</h1>

          {pub.excerpt && (
            <p className="mt-4 text-base leading-7 text-muted-foreground">{pub.excerpt}</p>
          )}

          <div className="mt-5 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            {dateLabel && (
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-primary/70" />
                {dateLabel}
              </span>
            )}
            {pub.organization && (
              <span className="inline-flex items-center gap-1.5">
                <Building2 className="h-4 w-4 text-primary/70" />
                {organizationLink ? (
                  <Link to={organizationLink} className="hover:text-primary hover:underline">
                    {pub.organization.name}
                  </Link>
                ) : pub.organization.name}
              </span>
            )}
            {(pub.eventTitle || pub.eventId) && (
              <span className="inline-flex items-center gap-1.5">
                <ExternalLink className="h-4 w-4 text-primary/70" />
                {eventLink ? (
                  <Link to={eventLink} className="hover:text-primary hover:underline">
                    {pub.eventTitle || 'Перейти к мероприятию'}
                  </Link>
                ) : pub.eventTitle}
              </span>
            )}
          </div>
        </header>

        {/* Body */}
        <div className="mt-8 whitespace-pre-line text-[15.5px] leading-8 text-foreground/90">
          {pub.content}
        </div>

        {/* Footer nav */}
        <div className="mt-12 border-t border-border pt-6">
          <Link
            to="/publications"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary transition-colors hover:text-primary/80"
          >
            <ArrowLeft className="h-4 w-4" />
            Все публикации
          </Link>
        </div>
      </article>
    </PublicLayout>
  );
}
