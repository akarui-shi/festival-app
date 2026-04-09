import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { publicationService } from '@/services/publication-service';
import { LoadingState, EmptyState } from '@/components/StateDisplays';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { Publication } from '@/types';
import { Plus, Edit, Trash2, Send } from 'lucide-react';
import { toast } from 'sonner';

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
    publicationService.getAllPublications().then(p => {
      setPubs(p);
      setLoading(false);
    });
  }, [user]);

  const create = async () => {
    if (!form.title || !form.content) { toast.error('Заполните название и содержание'); return; }
    setSaving(true);
    try {
      const pub = await publicationService.createPublication({
        ...form, authorId: user!.id, tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
      });
      setPubs(prev => [pub, ...prev]);
      setShowForm(false);
      setForm({ title: '', excerpt: '', content: '', tags: '' });
      toast.success('Публикация создана');
    } catch { toast.error('Ошибка'); }
    setSaving(false);
  };

  const sendToModeration = async (id: string) => {
    await publicationService.updateStatus(id, 'PENDING');
    setPubs(prev => prev.map(p => p.id === id ? { ...p, status: 'PENDING' as const } : p));
    toast.success('Отправлено на модерацию');
  };

  const del = async (id: string) => {
    await publicationService.deletePublication(id);
    setPubs(prev => prev.filter(p => p.id !== id));
    toast.success('Удалено');
  };

  if (loading) return <LoadingState />;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading text-2xl font-bold">Мои публикации</h1>
        <Button onClick={() => setShowForm(!showForm)}><Plus className="h-4 w-4 mr-1" />Создать</Button>
      </div>

      {showForm && (
        <div className="p-5 rounded-xl border border-border bg-card mb-6 space-y-4">
          <input className="w-full text-lg font-heading font-bold bg-transparent outline-none placeholder:text-muted-foreground" placeholder="Заголовок" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
          <input className="w-full text-sm bg-transparent outline-none placeholder:text-muted-foreground" placeholder="Краткое описание" value={form.excerpt} onChange={e => setForm(p => ({ ...p, excerpt: e.target.value }))} />
          <textarea className="w-full h-32 text-sm bg-transparent outline-none placeholder:text-muted-foreground resize-none" placeholder="Содержание..." value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))} />
          <input className="w-full text-xs bg-transparent outline-none placeholder:text-muted-foreground" placeholder="Теги через запятую" value={form.tags} onChange={e => setForm(p => ({ ...p, tags: e.target.value }))} />
          <div className="flex gap-2">
            <Button size="sm" onClick={create} disabled={saving}>{saving ? 'Сохранение...' : 'Создать'}</Button>
            <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>Отмена</Button>
          </div>
        </div>
      )}

      {pubs.length === 0 ? (
        <EmptyState icon="📝" title="Нет публикаций" description="Создайте свою первую публикацию" />
      ) : (
        <div className="space-y-3">
          {pubs.map(pub => {
            const st = statusMap[pub.status];
            return (
              <div key={pub.id} className="p-4 rounded-xl border border-border bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">{pub.title}</span>
                    <Badge className={`${st.cls} border-0 text-xs`}>{st.label}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{pub.excerpt}</p>
                </div>
                <div className="flex items-center gap-1">
                  {pub.status === 'DRAFT' && (
                    <Button variant="ghost" size="sm" onClick={() => sendToModeration(pub.id)}><Send className="h-3.5 w-3.5 mr-1" />На модерацию</Button>
                  )}
                  <Button variant="ghost" size="icon" onClick={() => del(pub.id)} className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
