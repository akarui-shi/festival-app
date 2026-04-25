import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Building2, CalendarDays, FileText, Sparkles } from 'lucide-react';
import { PublicLayout } from '@/layouts/PublicLayout';
import { LoadingState } from '@/components/StateDisplays';
import { EmptyState } from '@/components/EmptyState';
import { imageSrc } from '@/lib/image';
import { publicationService } from '@/services/publication-service';
import type { Publication } from '@/types';

function formatDate(value?: string): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' }).format(date);
}

export default function PublicationsPage() {
  const [publications, setPublications] = useState<Publication[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    publicationService.getPublications().then(setPublications).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <PublicLayout><LoadingState /></PublicLayout>;
  }

  return (
    <PublicLayout>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-gradient-to-br from-[hsl(var(--warm-cream))] via-background to-[hsl(var(--golden-light)/0.2)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_70%_-10%,hsl(var(--terracotta)/0.07),transparent)]" />
        <div className="container relative mx-auto px-4 py-14">
          <div className="section-label">
            <Sparkles className="h-3.5 w-3.5" />
            Новости и репортажи
          </div>
          <h1 className="mt-1 font-heading text-4xl tracking-tight text-foreground sm:text-5xl">
            Публикации
          </h1>
          <p className="mt-3 max-w-lg text-lg text-muted-foreground">
            Статьи, анонсы и репортажи о культурной жизни малых городов
          </p>
        </div>
      </section>

      <section className="container mx-auto px-4 py-12">
        {publications.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="Нет публикаций"
            description="Публикации появятся здесь, когда организаторы начнут делиться новостями"
          />
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {publications.map((publication) => {
              const primaryImageId = publication.imageIds && publication.imageIds.length > 0
                ? publication.imageIds[0]
                : publication.imageId ?? publication.eventImageId ?? null;
              const dateLabel = formatDate(publication.publishedAt);
              const orgName = publication.organization?.name || publication.organizationName;

              return (
                <Link
                  key={publication.publicationId ?? publication.id}
                  to={`/publications/${publication.publicationId ?? publication.id}`}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-soft transition-all duration-300 hover:-translate-y-1.5 hover:border-primary/20 hover:shadow-hover"
                >
                  {/* Image */}
                  <div className="relative aspect-[3/2] overflow-hidden bg-muted">
                    <img
                      src={imageSrc(primaryImageId == null ? null : Number(primaryImageId), '/placeholder-event.svg')}
                      alt={publication.eventTitle || publication.title}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                      loading="lazy"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/placeholder-event.svg'; }}
                    />
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-black/5 to-transparent" />
                  </div>

                  {/* Body */}
                  <div className="flex flex-1 flex-col p-4">
                    {dateLabel && (
                      <div className="mb-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <CalendarDays className="h-3.5 w-3.5 text-primary/60" />
                        {dateLabel}
                      </div>
                    )}

                    <h2 className="line-clamp-2 font-heading text-base leading-snug text-card-foreground transition-colors group-hover:text-primary">
                      {publication.title}
                    </h2>

                    {(publication.excerpt || publication.preview) && (
                      <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                        {publication.excerpt || publication.preview}
                      </p>
                    )}

                    <div className="mt-auto pt-3.5">
                      {orgName && (
                        <div className="mb-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Building2 className="h-3.5 w-3.5 shrink-0 text-primary/60" />
                          <span className="truncate">{orgName}</span>
                        </div>
                      )}
                      <div className="border-t border-border pt-3">
                        <span className="flex translate-x-0.5 items-center gap-1 text-xs font-semibold text-primary opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100">
                          Читать <ArrowRight className="h-3.5 w-3.5" />
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </PublicLayout>
  );
}
