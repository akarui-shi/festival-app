import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PublicLayout } from '@/layouts/PublicLayout';
import { LoadingState, EmptyState } from '@/components/StateDisplays';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { registrationService } from '@/services/registration-service';
import type { Registration } from '@/types';
import { Calendar, Clock, MapPin, X } from 'lucide-react';
import { toast } from 'sonner';

const statusLabels: Record<string, { label: string; className: string }> = {
  CONFIRMED: { label: 'Подтверждено', className: 'bg-success/10 text-success border-success/20' },
  ATTENDED: { label: 'Посещено', className: 'bg-info/10 text-info border-info/20' },
  CANCELLED: { label: 'Отменено', className: 'bg-destructive/10 text-destructive border-destructive/20' },
};

export default function RegistrationsPage() {
  const { user } = useAuth();
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    registrationService.getMyRegistrations(user.id).then(r => { setRegistrations(r); setLoading(false); });
  }, [user]);

  const cancel = async (id: string) => {
    await registrationService.cancelRegistration(id);
    setRegistrations(prev => prev.filter(r => r.id !== id));
    toast.success('Запись отменена');
  };

  if (loading) return <PublicLayout><LoadingState /></PublicLayout>;

  return (
    <PublicLayout>
      <div className="container py-8">
        <h1 className="font-heading text-3xl font-bold mb-2">Мои записи</h1>
        <p className="text-muted-foreground mb-8">Ваши записи на мероприятия</p>

        {registrations.length === 0 ? (
          <EmptyState icon={<Calendar className="h-12 w-12 text-muted-foreground" />} title="Нет записей" description="Запишитесь на мероприятие, чтобы оно появилось здесь"
            action={<Button asChild><Link to="/events">Смотреть афишу</Link></Button>} />
        ) : (
          <div className="space-y-4">
            {registrations.map(reg => {
              const st = statusLabels[reg.status];
              return (
                <div key={reg.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl border border-border bg-card">
                  <div className="flex-1">
                    <Link to={`/events/${reg.eventId}`} className="font-heading font-semibold hover:text-primary transition-colors">
                      {reg.event?.title}
                    </Link>
                    <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{reg.session?.date}</span>
                      <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{reg.session?.startTime} — {reg.session?.endTime}</span>
                      {reg.event?.venue && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{reg.event.venue.name}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className={st.className}>{st.label}</Badge>
                    {reg.status === 'CONFIRMED' && (
                      <Button variant="ghost" size="sm" onClick={() => cancel(reg.id)} className="text-destructive hover:text-destructive">
                        <X className="h-4 w-4 mr-1" />Отменить
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </PublicLayout>
  );
}
