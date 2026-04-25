import { useEffect, useMemo, useState } from 'react';
import { ExternalLink, FileText, Search } from 'lucide-react';
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
    return pubs.reduce<Record<PublicationFilterKey, number>>(
      (acc, pub) => {
        const status = normalizePublicationStatus(pub.status);
        acc.ALL += 1;
        if (status === 'PENDING') acc.PENDING += 1;
        if (status === 'PUBLISHED') acc.PUBLISHED += 1;
        if (status === 'REJECTED') acc.REJECTED += 1;
        if (status === 'DELETED') acc.DELETED += 1;
        return acc;
      },
      { ALL: 0, PENDING: 0, PUBLISHED: 0, REJECTED: 0, DELETED: 0 },
    );
  }, [pubs]);

  const filteredPublications = useMemo(() => {
    const q = query.trim().toLowerCase();
    return pubs
      .filter((pub) => filter === 'ALL' || normalizePublicationStatus(pub.status) === filter)
      .filter((pub) => {
        if (!q) return true;
        return [pub.title, pub.preview, pub.authorName, pub.eventTitle, pub.organizationName]
          .filter(Boolean).join(' ').toLowerCase().includes(q);
      })
      .sort((a, b) => {
        const sa = normalizePublicationStatus(a.status);
        const sb = normalizePublicationStatus(b.status);
        if (sa === 'PENDING' && sb !== 'PENDING') return -1;
        if (sa !== 'PENDING' && sb === 'PENDING') return 1;
        return (b.createdAt ? Date.parse(b.createdAt) : 0) - (a.createdAt ? Date.parse(a.createdAt) : 0);
      });
  }, [filter, pubs, query]);

  const changeStatus = async (id: string, status: PublicationStatus) => {
    await publicationService.updateStatus(id, status);
    setPubs((prev) => prev.map((pub) => (String(pub.publicationId) === String(id) ? { ...pub, status } : pub)));
    toast.success('Статус обновлён');
  };

  if (loading) return <LoadingState />;
  if (pubs.length === 0) return <EmptyState icon={FileText} title="Нет публикаций" description="Проверять пока нечего" />;

  return (
    <div className="space-y-6">
      <section>
        <h1 className="page-title">Публикации</h1>
        <p className="mt-1 text-muted-foreground">Модерация новостей с фильтрами и быстрыми действиями</p>
      </section>

      <section className="surface-soft space-y-3">
        <div className="flex flex-wrap gap-2">
          {(Object.keys(FILTER_LABELS) as PublicationFilterKey[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-all duration-150 ${
                filter === key
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'border border-border bg-background text-muted-foreground hover:border-primary/30 hover:text-foreground'
              }`}
            >
              {FILTER_LABELS[key]}
              <span className={`rounded-full px-1.5 py-0 text-xs font-bold ${filter === key ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground'}`}>
                {counts[key]}
              </span>
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Поиск по заголовку, автору, мероприятию..." className="pl-9" />
        </div>
      </section>

      {filteredPublications.length === 0 ? (
        <EmptyState icon={FileText} title="Ничего не найдено" description="Смените фильтр или строку поиска" />
      ) : (
        <div className="space-y-2.5">
          {filteredPublications.map((pub) => {
            const status = getPublicationStatusBadge(pub.status);
            const createdAtLabel = pub.createdAt
              ? new Date(pub.createdAt).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
              : null;

            return (
              <div
                key={pub.publicationId}
                className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 shadow-soft transition-all duration-200 hover:border-primary/15 hover:shadow-card md:flex-row md:items-start md:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-foreground">{pub.title}</span>
                    <Badge className={`${status.className} border-0 text-[11px] px-2 py-0`}>{status.label}</Badge>
                  </div>
                  {(pub.preview || pub.excerpt) && (
                    <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">{pub.preview || pub.excerpt}</p>
                  )}
                  <p className="mt-1 text-xs text-muted-foreground">
                    {[pub.authorName ? `Автор: ${pub.authorName}` : null, pub.organizationName || null, pub.eventTitle || null].filter(Boolean).join(' · ')}
                  </p>
                  {createdAtLabel && <p className="mt-0.5 text-xs text-muted-foreground">Создано: {createdAtLabel}</p>}
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <Button size="sm" variant="outline" asChild>
                    <Link to={`/publications/${pub.publicationId ?? pub.id}`} target="_blank" rel="noreferrer" className="gap-1.5">
                      Открыть <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                  {pub.status === 'PENDING' && (
                    <>
                      <Button
                        size="sm"
                        className="bg-[hsl(var(--success))] text-white hover:bg-[hsl(var(--success)/0.85)] shadow-sm"
                        onClick={() => changeStatus(String(pub.publicationId), 'PUBLISHED')}
                      >
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
