import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, CreditCard, X } from 'lucide-react';
import QRCode from 'react-qr-code';
import { toast } from 'sonner';
import { PublicLayout } from '@/layouts/PublicLayout';
import { EmptyState } from '@/components/EmptyState';
import { LoadingState } from '@/components/StateDisplays';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { registrationService } from '@/services/registration-service';
import { getRegistrationStatusBadge, isRegistrationActive } from '@/lib/statuses';
import type { Id, Ticket } from '@/types';

function normalizeTicketStatus(status?: string | null): string {
  return String(status || '')
    .trim()
    .replace(/\s+/g, '_')
    .toUpperCase();
}

interface TicketTheme {
  overlay: string;
  border: string;
  mainPanel: string;
  stubBg: string;
  qrBorder: string;
  qrText: string;
  actionButton: string;
  payButton: string;
}

function getTicketTheme(ticket: Ticket): TicketTheme {
  const status = normalizeTicketStatus(ticket.status);

  if (ticket.requiresPayment) {
    return {
      overlay: 'bg-gradient-to-r from-[#0d1b30]/90 via-[#29466f]/84 to-[#0d1b30]/92',
      border: 'border-[#7fa0d0]/60',
      mainPanel: 'bg-[#0c1d34]/44',
      stubBg: 'bg-[#091628]/58',
      qrBorder: 'border-[#dce7ff]/50',
      qrText: 'text-[#dce7ff]',
      actionButton: 'border-[#c9daff]/60 bg-[#dce7ff]/22 text-[#f2f6ff] hover:bg-[#dce7ff]/32',
      payButton: 'bg-[#dce7ff] text-[#1f2e4f] hover:bg-[#f1f5ff]',
    };
  }

  if (['RETURNED', 'ВОЗВРАЩЁН', 'ВОЗВРАЩЕН', 'CANCELLED', 'CANCELED', 'ОТМЕНЕНО'].includes(status)) {
    return {
      overlay: 'bg-gradient-to-r from-[#261813]/88 via-[#5c3829]/82 to-[#1e1512]/90',
      border: 'border-[#b08368]/58',
      mainPanel: 'bg-[#211612]/45',
      stubBg: 'bg-[#16100d]/60',
      qrBorder: 'border-[#f2d1a8]/45',
      qrText: 'text-[#f2d1a8]',
      actionButton: 'border-[#f2d1a8]/55 bg-[#f8ede3]/20 text-[#fff1e4] hover:bg-[#f8ede3]/30',
      payButton: 'bg-[#f2d1a8] text-[#4a2f20] hover:bg-[#f6e3cf]',
    };
  }

  if (['USED', 'ИСПОЛЬЗОВАН', 'ATTENDED', 'ПОСЕЩЕНО'].includes(status)) {
    return {
      overlay: 'bg-gradient-to-r from-[#0d261d]/88 via-[#1c4938]/82 to-[#0d2119]/90',
      border: 'border-[#5f9d83]/58',
      mainPanel: 'bg-[#0d241c]/45',
      stubBg: 'bg-[#081c15]/60',
      qrBorder: 'border-[#d6f3e5]/44',
      qrText: 'text-[#d6f3e5]',
      actionButton: 'border-[#d6f3e5]/52 bg-[#d6f3e5]/18 text-[#e8fff3] hover:bg-[#d6f3e5]/28',
      payButton: 'bg-[#d6f3e5] text-[#123e30] hover:bg-[#edfbf4]',
    };
  }

  return {
    overlay: 'bg-gradient-to-r from-[#0f2a20]/88 via-[#2b614b]/82 to-[#0f261d]/90',
    border: 'border-[#74b396]/58',
    mainPanel: 'bg-[#0d261d]/45',
    stubBg: 'bg-[#081b15]/60',
    qrBorder: 'border-[#d6f3e5]/50',
    qrText: 'text-[#d6f3e5]',
    actionButton: 'border-[#d6f3e5]/56 bg-[#d6f3e5]/20 text-[#ecfff5] hover:bg-[#d6f3e5]/30',
    payButton: 'bg-[#d6f3e5] text-[#114536] hover:bg-[#edfbf4]',
  };
}

function getStatusPillClass(status?: string | null): string {
  const key = normalizeTicketStatus(status);
  if (['RETURNED', 'ВОЗВРАЩЁН', 'ВОЗВРАЩЕН', 'CANCELLED', 'CANCELED', 'ОТМЕНЕНО'].includes(key)) {
    return 'border-red-200 bg-red-50 text-red-900';
  }
  if (['PENDING_PAYMENT', 'ОЖИДАЕТ_ОПЛАТЫ', 'PENDING'].includes(key)) {
    return 'border-amber-200 bg-amber-50 text-amber-900';
  }
  if (['USED', 'ИСПОЛЬЗОВАН', 'ATTENDED', 'ПОСЕЩЕНО'].includes(key)) {
    return 'border-emerald-200 bg-emerald-50 text-emerald-900';
  }
  return 'border-sky-200 bg-sky-50 text-sky-900';
}

const KOLOMNA_TICKET_BACKGROUNDS = [
  '/ticket-scene-festival.svg',
  '/ticket-scene-jazz.svg',
  '/ticket-scene-lecture.svg',
  '/ticket-scene-riverwalk.svg',
  '/ticket-scene-theatre.svg',
  '/ticket-scene-techno.svg',
  '/ticket-scene-art.svg',
];

function pickKolomnaBackground(ticket: Ticket): string {
  const seed = Number(ticket.eventId ?? ticket.ticketId ?? ticket.orderId ?? 0);
  if (Number.isFinite(seed)) {
    return KOLOMNA_TICKET_BACKGROUNDS[Math.abs(seed) % KOLOMNA_TICKET_BACKGROUNDS.length];
  }
  return KOLOMNA_TICKET_BACKGROUNDS[0];
}

function formatTicketDateParts(value?: string | null): { day: string; month: string; time: string } {
  if (!value) {
    return { day: '--', month: 'DATE', time: '--:--' };
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return { day: '--', month: 'DATE', time: '--:--' };
  }

  const day = new Intl.DateTimeFormat('ru-RU', { day: '2-digit' }).format(date);
  const month = new Intl.DateTimeFormat('ru-RU', { month: 'long' }).format(date).toUpperCase();
  const time = new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' }).format(date);
  return { day, month, time };
}

function formatDateTime(value?: string | null, fallback = 'Не указано'): string {
  if (!value) {
    return fallback;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return fallback;
  }
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function formatTicketPrice(value?: number | null, currency?: string | null): string {
  if (value == null || Number.isNaN(Number(value)) || Number(value) <= 0) {
    return 'Бесплатно';
  }
  return `${Number(value).toLocaleString('ru-RU')} ${currency || 'RUB'}`;
}

function buildQrPayload(ticket: Ticket): string {
  const payload = {
    ticketId: ticket.ticketId,
    orderId: ticket.orderId,
    eventId: ticket.eventId,
    sessionId: ticket.sessionId,
    qrToken: ticket.qrToken,
  };
  return JSON.stringify(payload);
}

export default function RegistrationsPage() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    registrationService
      .getMyRegistrations(user.id)
      .then((response) => setTickets(response))
      .finally(() => setLoading(false));
  }, [user]);

  const refundTicket = async (ticketId: Id) => {
    const updated = await registrationService.refundTicket(ticketId);
    setTickets((prev) => prev.map((ticket) => (String(ticket.ticketId) === String(ticketId) ? updated : ticket)));
    toast.success('Билет возвращён');
  };

  const cancelPendingOrder = async (orderId: Id, ticketId: Id) => {
    await registrationService.cancelRegistration(orderId);
    setTickets((prev) => prev.filter((ticket) => String(ticket.ticketId) !== String(ticketId)));
    toast.success('Заказ отменён');
  };

  if (loading) {
    return (
      <PublicLayout>
        <LoadingState />
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="font-heading text-3xl text-foreground sm:text-4xl">Мои билеты</h1>
        <p className="mt-1 text-muted-foreground">Ваши активные и завершённые заказы</p>

        {tickets.length === 0 ? (
          <>
            <EmptyState
              icon={CalendarDays}
              title="Нет билетов"
              description="Оформите билет на мероприятие, чтобы он появился здесь"
            />
            <div className="text-center">
              <Button asChild>
                <Link to="/events">Смотреть афишу</Link>
              </Button>
            </div>
          </>
        ) : (
          <div className="mx-auto mt-8 max-w-4xl space-y-3">
            {tickets.map((ticket) => {
              const status = getRegistrationStatusBadge(ticket.status);
              const startsAt = ticket.sessionStartsAt || ticket.issuedAt;
              const hasQr = Boolean(ticket.qrToken && !ticket.requiresPayment);
              const canRefund = !ticket.requiresPayment && isRegistrationActive(ticket.status);
              const canCancelPending = Boolean(ticket.requiresPayment && ticket.orderId);
              const qrValue = hasQr ? buildQrPayload(ticket) : '';
              const ticketNumberLabel = ticket.requiresPayment ? `Заказ #${ticket.orderId}` : `Билет #${ticket.ticketId}`;
              const theme = getTicketTheme(ticket);
              const backgroundImage = pickKolomnaBackground(ticket);
              const dateParts = formatTicketDateParts(startsAt);
              const eventLabel = (ticket.eventTitle || 'Мероприятие').trim();
              const sessionLabel = (ticket.sessionTitle || 'Сеанс').trim();
              const shortDescription = (ticket.eventShortDescription || '').trim();
              const startsAtLabel = formatDateTime(startsAt);
              const endsAtLabel = formatDateTime(ticket.sessionEndsAt);
              const ticketTypeLabel = ticket.ticketTypeName || 'Стандартный';
              const ticketPriceLabel = formatTicketPrice(ticket.ticketPrice, ticket.ticketCurrency);
              const venueLabel = [ticket.venueName, ticket.cityName].filter(Boolean).join(', ');
              const usefulInfo = [
                ticket.issuedAt ? `Выдан: ${formatDateTime(ticket.issuedAt)}` : null,
                ticket.usedAt ? `Использован: ${formatDateTime(ticket.usedAt)}` : null,
                ticket.requiresPayment && ticket.paymentStatus ? `Статус оплаты: ${ticket.paymentStatus}` : null,
              ]
                .filter(Boolean)
                .join(' · ');
              const statusPillClass = getStatusPillClass(ticket.status);

              return (
                <div
                  key={ticket.ticketId}
                  className={`relative overflow-hidden rounded-[18px] border ${theme.border} shadow-[0_18px_30px_-22px_rgba(23,16,12,0.75)]`}
                >
                  <div
                    className="absolute inset-0 bg-cover bg-center"
                    style={{ backgroundImage: `url('${backgroundImage}')` }}
                  />
                  <div className={`absolute inset-0 ${theme.overlay}`} />
                  <div className="absolute -left-3 top-[16%] z-20 hidden h-6 w-6 -translate-y-1/2 rounded-full md:block" style={{ backgroundColor: '#ffffff' }} />
                  <div className="absolute -left-3 top-[38%] z-20 hidden h-6 w-6 -translate-y-1/2 rounded-full md:block" style={{ backgroundColor: '#ffffff' }} />
                  <div className="absolute -left-3 top-[60%] z-20 hidden h-6 w-6 -translate-y-1/2 rounded-full md:block" style={{ backgroundColor: '#ffffff' }} />
                  <div className="absolute -left-3 top-[82%] z-20 hidden h-6 w-6 -translate-y-1/2 rounded-full md:block" style={{ backgroundColor: '#ffffff' }} />
                  <div className="absolute -right-3 top-[16%] z-20 hidden h-6 w-6 -translate-y-1/2 rounded-full md:block" style={{ backgroundColor: '#ffffff' }} />
                  <div className="absolute -right-3 top-[38%] z-20 hidden h-6 w-6 -translate-y-1/2 rounded-full md:block" style={{ backgroundColor: '#ffffff' }} />
                  <div className="absolute -right-3 top-[60%] z-20 hidden h-6 w-6 -translate-y-1/2 rounded-full md:block" style={{ backgroundColor: '#ffffff' }} />
                  <div className="absolute -right-3 top-[82%] z-20 hidden h-6 w-6 -translate-y-1/2 rounded-full md:block" style={{ backgroundColor: '#ffffff' }} />
                  <div className="absolute -top-5 right-[164px] z-20 hidden h-10 w-10 rounded-full md:block" style={{ backgroundColor: '#ffffff' }} />
                  <div className="absolute -bottom-5 right-[164px] z-20 hidden h-10 w-10 rounded-full md:block" style={{ backgroundColor: '#ffffff' }} />

                  <div className="relative grid min-h-[172px] md:min-h-[156px] md:grid-cols-[1fr_184px]">
                    <div className={`flex flex-col py-2.5 pl-5 pr-4 text-left text-white md:py-3 md:pl-8 md:pr-6 ${theme.mainPanel}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-heading text-[2.2rem] leading-[0.82] text-white drop-shadow-sm">{dateParts.day}</p>
                          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-white/88">{dateParts.month}</p>
                          <p className="text-[1rem] font-bold text-white/95">{dateParts.time}</p>
                        </div>
                        <div className="mr-4 text-right md:mr-6">
                          <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-[0.06em] shadow-sm ${statusPillClass}`}>
                            {status.label}
                          </span>
                          <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-white/84">
                            {ticketNumberLabel}
                          </p>
                        </div>
                      </div>

                      <Link
                        to={ticket.eventId ? `/events/${ticket.eventId}` : '/events'}
                        className="mt-0.5 block break-words font-heading text-[1.9rem] leading-[0.95] text-white hover:text-white/90"
                      >
                        {eventLabel}
                      </Link>
                      <p className="break-words text-[16px] font-bold tracking-[0.02em] text-white/94">
                        {sessionLabel}
                      </p>
                      {shortDescription && (
                        <p className="mt-0.5 max-h-7 overflow-hidden break-words text-[12px] leading-snug text-white/88">
                          {shortDescription}
                        </p>
                      )}

                      <div className="mt-1 space-y-0.5 text-[13px] text-white/94">
                        <p><span className="font-bold text-white">Начало:</span> {startsAtLabel}</p>
                        <p><span className="font-bold text-white">Окончание:</span> {endsAtLabel}</p>
                        <p><span className="font-bold text-white">Тип:</span> {ticketTypeLabel}</p>
                        {venueLabel && (
                          <p><span className="font-bold text-white">Место:</span> {venueLabel}</p>
                        )}
                      </div>
                      <div className="mt-0.5 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3">
                        <p className="min-w-0 max-h-4 overflow-hidden break-words text-[10px] leading-none text-white/80">
                          {usefulInfo || '\u00A0'}
                        </p>
                        <div className="mr-4 shrink-0 self-end text-right md:mr-6">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/84">Цена</p>
                          <p className="font-heading text-[2.2rem] leading-none text-white">{ticketPriceLabel}</p>
                        </div>
                      </div>

                      <div className="mt-auto flex items-center gap-2 pt-1">
                        <div className="flex min-h-[28px] flex-wrap items-center gap-2">
                          {canRefund && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className={`h-7 border px-2.5 text-[10px] font-semibold uppercase tracking-[0.05em] ${theme.actionButton}`}
                              onClick={() => refundTicket(ticket.ticketId)}
                            >
                              <X className="mr-1 h-4 w-4" />
                              Вернуть
                            </Button>
                          )}
                          {canCancelPending && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className={`h-7 border px-2.5 text-[10px] font-semibold uppercase tracking-[0.05em] ${theme.actionButton}`}
                              onClick={() => cancelPendingOrder(ticket.orderId!, ticket.ticketId)}
                            >
                              <X className="mr-1 h-4 w-4" />
                              Отменить
                            </Button>
                          )}
                          {ticket.requiresPayment && ticket.paymentUrl && (
                            <Button
                              size="sm"
                              className={`h-7 px-2.5 text-[10px] font-semibold uppercase tracking-[0.05em] ${theme.payButton}`}
                              onClick={() => window.location.assign(ticket.paymentUrl!)}
                            >
                              <CreditCard className="mr-1 h-4 w-4" />
                              Оплатить
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className={`relative flex flex-col items-center justify-between p-2 md:border-l ${theme.stubBg}`}>
                      <div className="absolute left-0 top-2 bottom-2 hidden border-l-2 border-dashed border-white/48 md:block" />
                      <span className={`text-[10px] font-semibold uppercase tracking-[0.12em] ${theme.qrText}`}>
                        Stub
                      </span>
                      {hasQr ? (
                        <div className={`rounded-lg border bg-white p-1.5 shadow-sm ${theme.qrBorder}`}>
                          <QRCode value={qrValue} size={114} />
                        </div>
                      ) : (
                        <div className="rounded-lg border border-dashed border-white/40 bg-white/16 px-2 py-4 text-center">
                          <p className={`text-[11px] font-medium ${theme.qrText}`}>PAY</p>
                        </div>
                      )}
                      <p className={`text-center text-[10px] font-bold ${theme.qrText}`}>{formatDateTime(startsAt, '--')}</p>
                      <p className={`max-w-[150px] break-all text-center text-[10px] font-semibold ${theme.qrText}`}>
                        {hasQr ? ticket.qrToken : ticketTypeLabel}
                      </p>
                    </div>
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
