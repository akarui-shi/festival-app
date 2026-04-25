import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Building2, Mail, Phone } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { PublicLayout } from '@/layouts/PublicLayout';
import { EventCard } from '@/components/EventCard';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState, LoadingState } from '@/components/StateDisplays';
import { imageSrc } from '@/lib/image';
import { eventService } from '@/services/event-service';
import { publicationService } from '@/services/publication-service';
import type { Event, Organization, Publication } from '@/types';

export default function OrganizationPage() {
  const { id } = useParams<{ id: string }>();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [publications, setPublications] = useState<Publication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      eventService.getOrganizationById(id),
      eventService.getOrganizationEvents(id),
      publicationService.getPublications({ organizationId: id }),
    ])
      .then(([org, ev, pub]) => { setOrganization(org); setEvents(ev); setPublications(pub); })
      .catch(() => setError('Не удалось загрузить страницу организации'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <PublicLayout><LoadingState /></PublicLayout>;
  if (error || !organization) return <PublicLayout><ErrorState message={error || 'Организация не найдена'} /></PublicLayout>;

  const contacts = organization.contacts || '';
  const contactsParts = contacts.split(',').map((p) => p.trim()).filter(Boolean);
  const emailContact = contactsParts.find((p) => p.includes('@'));
  const phoneContact = contactsParts.find((p) => /\+?\d/.test(p));

  return (
    <PublicLayout>
      {/* Hero banner */}
      <section className="relative overflow-hidden border-b border-border">
        {organization.coverImageId != null ? (
          <>
            <div className="absolute inset-0">
              <img
                src={imageSrc(Number(organization.coverImageId))}
                alt=""
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/50 to-background" />
            </div>
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[hsl(var(--warm-cream))] via-background to-[hsl(var(--golden-light)/0.2)]" />
        )}

        <div className="container relative mx-auto px-4 pb-10 pt-8">
          <Link to="/events" className="mb-8 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-primary">
            <ArrowLeft className="h-4 w-4" />К мероприятиям
          </Link>

          <div className="flex flex-col gap-5 sm:flex-row sm:items-end">
            {/* Logo */}
            <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl border-4 border-card shadow-card sm:h-24 sm:w-24">
              {organization.logoImageId != null ? (
                <img src={imageSrc(Number(organization.logoImageId))} alt={organization.name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/15 to-primary/5">
                  <Building2 className="h-10 w-10 text-primary/60" />
                </div>
              )}
            </div>

            <div className="min-w-0">
              <div className="section-label mb-2">
                <Building2 className="h-3.5 w-3.5" />
                Организация
              </div>
              <h1 className={`font-heading text-4xl tracking-tight sm:text-5xl ${organization.coverImageId != null ? 'text-white drop-shadow' : 'text-foreground'}`}>
                {organization.name}
              </h1>
            </div>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-10 space-y-10">
        {/* About */}
        <section className="surface-panel">
          <p className="whitespace-pre-line leading-7 text-muted-foreground">
            {organization.description || 'Описание организации пока не заполнено.'}
          </p>

          {(emailContact || phoneContact || (!emailContact && !phoneContact && contacts)) && (
            <div className="mt-5 flex flex-wrap gap-5 border-t border-border pt-5 text-sm">
              {emailContact && (
                <a href={`mailto:${emailContact}`} className="inline-flex items-center gap-2 text-muted-foreground transition-colors hover:text-primary">
                  <Mail className="h-4 w-4 text-primary/70" />
                  {emailContact}
                </a>
              )}
              {phoneContact && (
                <a href={`tel:${phoneContact}`} className="inline-flex items-center gap-2 text-muted-foreground transition-colors hover:text-primary">
                  <Phone className="h-4 w-4 text-primary/70" />
                  {phoneContact}
                </a>
              )}
              {!emailContact && !phoneContact && contacts && (
                <span className="text-muted-foreground">{contacts}</span>
              )}
            </div>
          )}
        </section>

        {/* Events */}
        <section>
          <div className="mb-6 flex items-end justify-between">
            <div>
              <h2 className="font-heading text-2xl text-foreground">Мероприятия организации</h2>
              <p className="mt-1 text-muted-foreground">Все опубликованные события этого организатора</p>
            </div>
          </div>

          {events.length > 0 ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {events.map((event) => <EventCard key={event.id} event={event} />)}
            </div>
          ) : (
            <EmptyState icon={Building2} title="Пока нет мероприятий" description="У этой организации пока нет опубликованных мероприятий" />
          )}
        </section>

        {/* Publications */}
        {publications.length > 0 && (
          <section>
            <h2 className="mb-5 font-heading text-2xl text-foreground">Публикации организации</h2>
            <div className="space-y-2.5">
              {publications.map((publication) => (
                <Link
                  key={publication.publicationId}
                  to={`/publications/${publication.publicationId}`}
                  className="group flex items-center justify-between gap-4 rounded-2xl border border-border bg-card p-4 shadow-soft transition-all duration-200 hover:border-primary/20 hover:shadow-card"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-foreground transition-colors group-hover:text-primary">{publication.title}</p>
                    {(publication.preview || publication.excerpt) && (
                      <p className="mt-0.5 line-clamp-1 text-sm text-muted-foreground">{publication.preview || publication.excerpt}</p>
                    )}
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </PublicLayout>
  );
}
