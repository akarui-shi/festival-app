import { useEffect, useState } from 'react';
import { FileText, Plus, Send, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { publicationService } from '@/services/publication-service';
import { LoadingState } from '@/components/StateDisplays';
import { EmptyState } from '@/components/EmptyState';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { Publication } from '@/types';

const statusMap: Record<string, { label: string; cls: string }> = {
  DRAFT: { label: 'Черновик', cls: 'bg-muted text-muted-foreground' },
  PENDING: { label: 'На модерации', cls: 'bg-warning/10 text-warning' },
  PUBLISHED: { label: 'Опубликовано', cls: 'bg-success/10 text-success' },
  REJECTED: { label: 'Отклонено', cls: 'bg-destructive/10 text-destructive' },
};

export default function OrganizerPublications() {
  const { user } = useAuth();
  const [pubs, setPubs] = useState<Publication[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', excerpt: '', content: '', tags: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    publicationService.getAllPublications().then((response) => {
      setPubs(response);
      setLoading(false);
    });
  }, [user]);

  const create = async () => {
    if (!form.title || !form.content) { toast.error('Заполните название и содержание'); return; }
    setSaving(true);
    try {
      const pub = await publicationService.createPublication({
        ...form,
        authorId: user!.id,
        tags: form.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
      });
      setPubs((prev) => [pub, ...prev]);
      setShowForm(false);
      setForm({ title: '', excerpt: '', content: '', tags: '' });
      toast.success('Публикация создана');
    } catch { toast.error('Ошибка'); }
    setSaving(false);
  };

  const sendToModeration = async (id: string) => {
    await publicationService.updateStatus(id, 'PENDING');
    setPubs((prev) => prev.map((publication) => (publication.id === id ? { ...publication, status: 'PENDING' as const } : publication)));
    toast.success('Отправлено на модерацию');
  };

  const del = async (id: string) => {
    await publicationService.deletePublication(id);
    setPubs((prev) => prev.filter((publication) => publication.id !== id));
    toast.success('Удалено');
  };

  if (loading) return <LoadingState />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl text-foreground sm:text-4xl">Мои публикации</h1>
          <p className="mt-1 text-muted-foreground">Публикуйте новости и материалы для аудитории</p>
        </div>
        <Button onClick={() => setShowForm((prev) => !prev)} className="gap-1.5">
          <Plus className="h-4 w-4" />
          Создать
        </Button>
      </div>

      {showForm && (
        <div className="space-y-4 rounded-xl border border-border bg-card p-5 shadow-soft">
          <Input
            className="text-lg"
            placeholder="Заголовок"
            value={form.title}
            onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
          />
          <Input
            placeholder="Краткое описание"
            value={form.excerpt}
            onChange={(event) => setForm((prev) => ({ ...prev, excerpt: event.target.value }))}
          />
          <Textarea
            className="min-h-32"
            placeholder="Содержание..."
            value={form.content}
            onChange={(event) => setForm((prev) => ({ ...prev, content: event.target.value }))}
          />
          <Input
            placeholder="Теги через запятую"
            value={form.tags}
            onChange={(event) => setForm((prev) => ({ ...prev, tags: event.target.value }))}
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={create} disabled={saving}>
              {saving ? 'Сохранение...' : 'Создать'}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>
              Отмена
            </Button>
          </div>
        </div>
      )}

      {pubs.length === 0 ? (
        <EmptyState icon={FileText} title="Нет публикаций" description="Создайте свою первую публикацию" />
      ) : (
        <div className="space-y-3">
          {pubs.map((pub) => {
            const status = statusMap[pub.status];
            return (
              <div
                key={pub.id}
                className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-soft sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <div className="mb-1 flex items-center gap-2">
                    <span className="font-medium text-foreground">{pub.title}</span>
                    <Badge className={`${status.cls} border-0 text-xs`}>{status.label}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{pub.excerpt}</p>
                </div>
                <div className="flex items-center gap-1">
                  {pub.status === 'DRAFT' && (
                    <Button variant="ghost" size="sm" onClick={() => sendToModeration(pub.id)} className="gap-1.5">
                      <Send className="h-3.5 w-3.5" />
                      На модерацию
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" onClick={() => del(pub.id)} className="text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
