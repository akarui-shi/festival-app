import { useEffect, useState } from 'react';
import { Plus, Tag, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { promoService, type PromoCodeCreateInput } from '@/services/promo-service';
import type { PromoCode } from '@/types';

const DISCOUNT_TYPE_LABELS: Record<string, string> = {
  PERCENT: 'Процент',
  FIXED: 'Фиксированная сумма',
  FREE: 'Бесплатно',
};

function formatDiscount(code: PromoCode): string {
  if (code.discountType === 'FREE') return 'Бесплатно';
  if (code.discountType === 'PERCENT') return `${code.discountValue ?? 0}%`;
  return `${(code.discountValue ?? 0).toLocaleString('ru-RU')} ₽`;
}

export default function OrganizerPromoCodes() {
  const [codes, setCodes] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState<PromoCodeCreateInput>({
    code: '',
    discountType: 'PERCENT',
    discountValue: 10,
    maxUsages: undefined,
    expiresAt: undefined,
  });

  useEffect(() => {
    promoService
      .getAll()
      .then(setCodes)
      .catch(() => toast.error('Не удалось загрузить промокоды'))
      .finally(() => setLoading(false));
  }, []);

  const handleCreate = async () => {
    if (!form.code.trim()) {
      toast.error('Введите код');
      return;
    }
    setSubmitting(true);
    try {
      const created = await promoService.create({
        ...form,
        discountValue: form.discountType === 'FREE' ? undefined : Number(form.discountValue),
        maxUsages: form.maxUsages ? Number(form.maxUsages) : undefined,
        expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : undefined,
      });
      setCodes((prev) => [created, ...prev]);
      setDialogOpen(false);
      setForm({ code: '', discountType: 'PERCENT', discountValue: 10 });
      toast.success('Промокод создан');
    } catch (e: any) {
      toast.error(e?.message || 'Не удалось создать промокод');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number | string) => {
    try {
      await promoService.remove(id);
      setCodes((prev) => prev.filter((c) => String(c.id) !== String(id)));
      toast.success('Промокод удалён');
    } catch {
      toast.error('Не удалось удалить промокод');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl text-foreground">Промокоды</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Управление скидками для участников</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-1.5">
              <Plus className="h-4 w-4" />
              Создать промокод
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Новый промокод</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Код</Label>
                <Input
                  value={form.code}
                  onChange={(e) => setForm((p) => ({ ...p, code: e.target.value.toUpperCase() }))}
                  placeholder="SUMMER2026"
                />
              </div>

              <div className="space-y-1.5">
                <Label>Тип скидки</Label>
                <Select
                  value={form.discountType}
                  onValueChange={(v) =>
                    setForm((p) => ({ ...p, discountType: v as PromoCodeCreateInput['discountType'] }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PERCENT">Процент (%)</SelectItem>
                    <SelectItem value="FIXED">Сумма (₽)</SelectItem>
                    <SelectItem value="FREE">Бесплатно</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {form.discountType !== 'FREE' && (
                <div className="space-y-1.5">
                  <Label>{form.discountType === 'PERCENT' ? 'Размер скидки (%)' : 'Сумма скидки (₽)'}</Label>
                  <Input
                    type="number"
                    min={1}
                    max={form.discountType === 'PERCENT' ? 100 : undefined}
                    value={form.discountValue ?? ''}
                    onChange={(e) => setForm((p) => ({ ...p, discountValue: Number(e.target.value) }))}
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <Label>Макс. использований (необязательно)</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.maxUsages ?? ''}
                  placeholder="Без ограничений"
                  onChange={(e) =>
                    setForm((p) => ({ ...p, maxUsages: e.target.value ? Number(e.target.value) : undefined }))
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label>Срок действия (необязательно)</Label>
                <Input
                  type="datetime-local"
                  value={form.expiresAt ?? ''}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, expiresAt: e.target.value || undefined }))
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Отмена</Button>
              <Button onClick={handleCreate} disabled={submitting}>
                {submitting ? 'Создание...' : 'Создать'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="py-12 text-center text-sm text-muted-foreground animate-pulse">Загрузка...</div>
      ) : codes.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border py-16 text-center">
          <Tag className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
          <p className="font-medium text-foreground">Промокодов пока нет</p>
          <p className="mt-1 text-sm text-muted-foreground">Создайте первый промокод для ваших мероприятий</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Код</th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Скидка</th>
                <th className="hidden px-4 py-3 text-left font-semibold text-muted-foreground sm:table-cell">Использований</th>
                <th className="hidden px-4 py-3 text-left font-semibold text-muted-foreground md:table-cell">Срок</th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Статус</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {codes.map((code) => {
                const expired = code.expiresAt ? new Date(code.expiresAt) < new Date() : false;
                const exhausted = code.maxUsages != null && (code.usageCount ?? 0) >= code.maxUsages;
                const active = code.active && !expired && !exhausted;
                return (
                  <tr key={code.id} className="border-b border-border/50 last:border-0 hover:bg-muted/20">
                    <td className="px-4 py-3">
                      <span className="font-mono font-semibold text-foreground">{code.code}</span>
                    </td>
                    <td className="px-4 py-3 text-foreground">{formatDiscount(code)}</td>
                    <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">
                      {code.usageCount ?? 0}
                      {code.maxUsages != null ? ` / ${code.maxUsages}` : ''}
                    </td>
                    <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                      {code.expiresAt
                        ? new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(code.expiresAt))
                        : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={active ? 'default' : 'secondary'}>
                        {active ? 'Активен' : expired ? 'Истёк' : exhausted ? 'Исчерпан' : 'Неактивен'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDelete(code.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
