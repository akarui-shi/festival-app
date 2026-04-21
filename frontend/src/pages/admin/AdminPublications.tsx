import { useEffect, useMemo, useState } from 'react';
import { ExternalLink, FileText, Filter, Search } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { publicationService } from '@/services/publication-service';
import { LoadingState } from '@/components/StateDisplays';
import { EmptyState } from '@/components/EmptyState';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getPublicationStatusBadge } from '@/lib/statuses';
import type { Publication, PublicationStatus } from '@/types';

type PublicationFilterKey = 'ALL' | 'PENDING' | 'PUBLISHED' | 'REJECTED' | 'DELETED';

const FILTER_LABELS: Record<PublicationFilterKey, string> = {
  ALL: 'Все',
  PENDING: 'На модерации',
  PUBLISHED: 'Опубликованные',
  REJECTED: 'Отклонённые',
  DELETED: 'Удалённые',
};

function normalizePublicationStatus(value?: string | null): PublicationFilterKey | 'OTHER' {
  const key = String(value || '').trim().toUpperCase();
  if (key === 'PENDING' || key === 'DRAFT') return 'PENDING';
  if (key === 'PUBLISHED') return 'PUBLISHED';
  if (key === 'REJECTED') return 'REJECTED';
  if (key === 'DELETED') return 'DELETED';
  return 'OTHER';
}

export default function AdminPublications() {
  const [pubs, setPubs] = useState<Publication[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<PublicationFilterKey>('PENDING');

  useEffect(() => {
    publicationService.getAllPublications({ includeDeleted: true }).then((response) => {
      setPubs(response);
      setLoading(false);
    });
  }, []);

  const counts = useMemo(() => {
    return pubs.reduce<Record<PublicationFilterKey, number>>((acc, pub) => {
      const status = normalizePublicationStatus(pub.status);
      acc.ALL += 1;
      if (status === 'PENDING') acc.PENDING += 1;
      if (status === 'PUBLISHED') acc.PUBLISHED += 1;
      if (status === 'REJECTED') acc.REJECTED += 1;
      if (status === 'DELETED') acc.DELETED += 1;
      return acc;
    }, { ALL: 0, PENDING: 0, PUBLISHED: 0, REJECTED: 0, DELETED: 0 });
  }, [pubs]);

  const filteredPublications = useMemo(() => {
    const q = query.trim().toLowerCase();
    return pubs
      .filter((pub) => {
        if (filter === 'ALL') return true;
        return normalizePublicationStatus(pub.status) === filter;
      })
      .filter((pub) => {
        if (!q) return true;
        const haystack = [
          pub.title,
          pub.preview,
          pub.authorName,
          pub.eventTitle,
          pub.organizationName,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.includes(q);
      })
      .sort((a, b) => {
        const statusA = normalizePublicationStatus(a.status);
        const statusB = normalizePublicationStatus(b.status);
        if (statusA === 'PENDING' && statusB !== 'PENDING') return -1;
        if (statusA !== 'PENDING' && statusB === 'PENDING') return 1;
        const aDate = a.createdAt ? Date.parse(a.createdAt) : 0;
        const bDate = b.createdAt ? Date.parse(b.createdAt) : 0;
        return bDate - aDate;
      });
  }, [filter, pubs, query]);

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
        <p className="mt-1 text-muted-foreground">Удобная модерация новостей с фильтрами и быстрыми действиями</p>
      </section>

      <section className="rounded-xl border border-border bg-card p-4 shadow-soft">
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm text-muted-foreground">
            <Filter className="h-4 w-4" />
            Статус:
          </div>
          {(Object.keys(FILTER_LABELS) as PublicationFilterKey[]).map((key) => (
            <Button
              key={key}
              type="button"
              size="sm"
              variant={filter === key ? 'default' : 'outline'}
              onClick={() => setFilter(key)}
            >
              {FILTER_LABELS[key]} ({counts[key]})
            </Button>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Поиск по заголовку, автору, мероприятию, организации"
          />
        </div>
      </section>

      {filteredPublications.length === 0 ? (
        <EmptyState icon={FileText} title="Ничего не найдено" description="Смените фильтр или строку поиска" />
      ) : (
        <div className="space-y-3">
          {filteredPublications.map((pub) => {
            const status = getPublicationStatusBadge(pub.status);
            const createdAtLabel = pub.createdAt
              ? new Date(pub.createdAt).toLocaleString('ru-RU', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })
              : 'Дата не указана';

            return (
              <div
                key={pub.publicationId}
                className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 shadow-soft sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <span className="font-medium text-foreground">{pub.title}</span>
                    <Badge className={`${status.className} border-0 text-xs`}>{status.label}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{pub.preview || pub.excerpt || 'Без анонса'}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Автор: {pub.authorName || 'Не указан'} · Мероприятие: {pub.eventTitle || 'Не выбрано'} · Организация: {pub.organizationName || 'Не указана'}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">Создано: {createdAtLabel}</p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button size="sm" variant="outline" asChild>
                    <Link to={`/publications/${pub.publicationId ?? pub.id}`} target="_blank" rel="noreferrer" className="gap-1.5">
                      Открыть
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
      )}
    </div>
  );
}
