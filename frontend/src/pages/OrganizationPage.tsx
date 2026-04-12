import { useEffect, useState } from 'react';
import { ArrowLeft, Building2, Mail, Phone } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { PublicLayout } from '@/layouts/PublicLayout';
import { EventCard } from '@/components/EventCard';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState, LoadingState } from '@/components/StateDisplays';
import { eventService } from '@/services/event-service';
import type { Event, Organization } from '@/types';

export default function OrganizationPage() {
  const { id } = useParams<{ id: string }>();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;

    setLoading(true);
    Promise.all([
      eventService.getOrganizationById(id),
      eventService.getOrganizationEvents(id),
    ])
      .then(([organizationResponse, eventsResponse]) => {
        setOrganization(organizationResponse);
        setEvents(eventsResponse);
      })
      .catch(() => setError('Не удалось загрузить страницу организации'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <PublicLayout>
        <LoadingState />
      </PublicLayout>
    );
  }

  if (error || !organization) {
    return (
      <PublicLayout>
        <ErrorState message={error || 'Организация не найдена'} />
      </PublicLayout>
    );
  }

  const contacts = organization.contacts || '';
  const contactsParts = contacts
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  const emailContact = contactsParts.find((part) => part.includes('@'));
  const phoneContact = contactsParts.find((part) => /\+?\d/.test(part));

  return (
    <PublicLayout>
      <div className="container mx-auto px-4 py-8">
        <Link
          to="/events"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          К мероприятиям
        </Link>

        <section className="rounded-2xl border border-border bg-card p-6 shadow-card sm:p-8">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <div className="min-w-0">
              <h1 className="font-heading text-3xl text-foreground sm:text-4xl">{organization.name}</h1>
              <p className="mt-3 whitespace-pre-line text-muted-foreground">
                {organization.description || 'Описание организации пока не заполнено.'}
              </p>

              {(emailContact || phoneContact || contacts) && (
                <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
                  {emailContact && (
                    <span className="inline-flex items-center gap-1.5">
                      <Mail className="h-4 w-4 text-primary" />
                      {emailContact}
                    </span>
                  )}
                  {phoneContact && (
                    <span className="inline-flex items-center gap-1.5">
                      <Phone className="h-4 w-4 text-primary" />
                      {phoneContact}
                    </span>
                  )}
                  {!emailContact && !phoneContact && contacts && <span>{contacts}</span>}
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="mt-8">
          <h2 className="font-heading text-2xl text-foreground">Мероприятия организации</h2>
          <p className="mt-1 text-muted-foreground">Все опубликованные события этого организатора</p>

          {events.length > 0 ? (
            <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {events.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Building2}
              title="Пока нет мероприятий"
              description="У этой организации пока нет опубликованных мероприятий"
            />
          )}
        </section>
      </div>
    </PublicLayout>
  );
}
