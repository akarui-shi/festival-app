import { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { eventService } from '@/services/event-service';
import { directoryService } from '@/services/directory-service';
import { useAuth } from '@/contexts/AuthContext';
import type { Category, City, Venue, Event } from '@/types';
import { LoadingState } from '@/components/StateDisplays';

export default function EventFormPage() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: '', description: '', shortDescription: '', categoryId: '', cityId: '', venueId: '',
    format: 'OFFLINE' as Event['format'], startDate: '', endDate: '', isFree: true, price: '', tags: '',
  });

  useEffect(() => {
    Promise.all([
      directoryService.getCategories(),
      directoryService.getCities(),
      directoryService.getVenues(),
      isEdit ? eventService.getEventById(id!) : Promise.resolve(null),
    ]).then(([cats, cits, vens, event]) => {
      setCategories(cats);
      setCities(cits);
      setVenues(vens);
      if (event) {
        setForm({
          title: event.title, description: event.description, shortDescription: event.shortDescription,
          categoryId: event.categoryId, cityId: event.cityId, venueId: event.venueId,
          format: event.format, startDate: event.startDate.slice(0, 16), endDate: event.endDate.slice(0, 16),
          isFree: event.isFree, price: event.price?.toString() || '', tags: event.tags.join(', '),
        });
      }
      setLoading(false);
    });
  }, [id, isEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.categoryId || !form.cityId) { toast.error('Заполните обязательные поля'); return; }
    setSaving(true);
    try {
      const data = {
        ...form, organizerId: user!.id,
        price: form.isFree ? undefined : Number(form.price),
        tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
        startDate: new Date(form.startDate).toISOString(),
        endDate: new Date(form.endDate).toISOString(),
      };
      if (isEdit) await eventService.updateEvent(id!, data);
      else await eventService.createEvent(data);
      toast.success(isEdit ? 'Мероприятие обновлено' : 'Мероприятие создано');
      navigate('/organizer/events');
    } catch { toast.error('Ошибка сохранения'); }
    setSaving(false);
  };

  if (loading) return <LoadingState />;

  const upd = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [field]: e.target.value }));

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <section className="space-y-2">
        <Link
          to="/organizer/events"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          К списку мероприятий
        </Link>
        <h1 className="font-heading text-3xl text-foreground sm:text-4xl">
          {isEdit ? 'Редактирование мероприятия' : 'Новое мероприятие'}
        </h1>
        <p className="text-muted-foreground">Заполните основные данные и отправьте событие на модерацию</p>
      </section>

      <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-border bg-card p-6 shadow-card sm:p-8">
        <div>
          <Label>Название *</Label>
          <Input value={form.title} onChange={upd('title')} placeholder="Название мероприятия" />
        </div>
        <div>
          <Label>Краткое описание</Label>
          <Input value={form.shortDescription} onChange={upd('shortDescription')} placeholder="В одно предложение" />
        </div>
        <div>
          <Label>Полное описание</Label>
          <Textarea value={form.description} onChange={upd('description')} rows={5} />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label>Категория *</Label>
            <Select value={form.categoryId} onValueChange={(value) => setForm((prev) => ({ ...prev, categoryId: value }))}>
              <SelectTrigger><SelectValue placeholder="Выберите" /></SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.icon} {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Город *</Label>
            <Select value={form.cityId} onValueChange={(value) => setForm((prev) => ({ ...prev, cityId: value }))}>
              <SelectTrigger><SelectValue placeholder="Выберите" /></SelectTrigger>
              <SelectContent>
                {cities.map((city) => (
                  <SelectItem key={city.id} value={city.id}>
                    {city.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Площадка</Label>
            <Select value={form.venueId} onValueChange={(value) => setForm((prev) => ({ ...prev, venueId: value }))}>
              <SelectTrigger><SelectValue placeholder="Выберите" /></SelectTrigger>
              <SelectContent>
                {venues.map((venue) => (
                  <SelectItem key={venue.id} value={venue.id}>
                    {venue.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Формат</Label>
            <Select value={form.format} onValueChange={(value) => setForm((prev) => ({ ...prev, format: value as Event['format'] }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="OFFLINE">Офлайн</SelectItem>
                <SelectItem value="ONLINE">Онлайн</SelectItem>
                <SelectItem value="HYBRID">Гибрид</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label>Начало</Label>
            <Input type="datetime-local" value={form.startDate} onChange={upd('startDate')} />
          </div>
          <div>
            <Label>Окончание</Label>
            <Input type="datetime-local" value={form.endDate} onChange={upd('endDate')} />
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/50 px-3 py-2">
          <Switch checked={form.isFree} onCheckedChange={(value) => setForm((prev) => ({ ...prev, isFree: value }))} />
          <Label>Бесплатное</Label>
        </div>
        {!form.isFree && (
          <div>
            <Label>Стоимость (₽)</Label>
            <Input type="number" value={form.price} onChange={upd('price')} />
          </div>
        )}

        <div>
          <Label>Теги (через запятую)</Label>
          <Input value={form.tags} onChange={upd('tags')} placeholder="музыка, лето, фестиваль" />
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={saving}>
            {saving ? 'Сохранение...' : isEdit ? 'Сохранить' : 'Создать'}
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate('/organizer/events')}>
            Отмена
          </Button>
        </div>
      </form>
    </div>
  );
}
