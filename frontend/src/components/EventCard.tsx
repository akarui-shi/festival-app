import { Link } from 'react-router-dom';
import { ArrowRight, CalendarDays, Clock, Heart, MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { Event } from '@/types';

interface EventCardProps {
  event: Event;
  onFavoriteToggle?: (eventId: string) => void;
  isFavorite?: boolean;
  variant?: 'default' | 'compact' | 'featured';
}

function formatDate(value?: string): string {
  if (!value) return 'Дата уточняется';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Дата уточняется';
  }

  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

function resolveTime(event: Event): string {
  const date = new Date(event.startDate);

  if (Number.isNaN(date.getTime())) {
    return 'Время уточняется';
  }

  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');

  if (hh === '00' && mm === '00') {
    return 'Время уточняется';
  }

  return `${hh}:${mm}`;
}

function resolvePrice(event: Event): string {
  if (event.isFree) {
    return 'Бесплатно';
  }

  if (typeof event.price === 'number') {
    return `${event.price.toLocaleString('ru-RU')} ₽`;
  }

  return 'Цена уточняется';
}

export function EventCard({ event, onFavoriteToggle, isFavorite }: EventCardProps) {
  const image = event.imageUrl || '/placeholder.svg';
  const categoryName = event.category?.name || 'Событие';
  const ageRestriction = '6+';

  return (
    <Link
      to={`/events/${event.id}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-hover"
    >
      <div className="relative aspect-[3/2] overflow-hidden">
        <img
          src={image}
          alt={event.title}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />

        <div className="absolute left-3 top-3 flex gap-1.5">
          <Badge variant="secondary" className="bg-card/90 text-xs font-semibold backdrop-blur-sm">
            {categoryName}
          </Badge>
          <Badge variant="outline" className="border-card/60 bg-card/90 text-xs backdrop-blur-sm">
            {ageRestriction}
          </Badge>
        </div>

        {event.isFree && (
          <Badge className="absolute right-3 top-3 bg-primary text-primary-foreground">
            Бесплатно
          </Badge>
        )}

        {onFavoriteToggle && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onFavoriteToggle(event.id);
            }}
            className="absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card/90 backdrop-blur-sm"
            aria-label={isFavorite ? 'Удалить из избранного' : 'Добавить в избранное'}
          >
            <Heart className={`h-4 w-4 ${isFavorite ? 'fill-primary text-primary' : 'text-muted-foreground'}`} />
          </button>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="font-heading text-lg leading-snug text-card-foreground group-hover:text-primary">
          {event.title}
        </h3>

        <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">
          {event.shortDescription || 'Описание появится позже'}
        </p>

        <div className="mt-auto pt-4">
          <div className="flex flex-col gap-1.5 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5 text-primary/70" />
              <span>{formatDate(event.startDate)}</span>
              <Clock className="ml-2 h-3.5 w-3.5 text-primary/70" />
              <span>{resolveTime(event)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-primary/70" />
              <span className="truncate">{event.venue?.address || event.venue?.name || 'Площадка уточняется'}, {event.city?.name || 'город уточняется'}</span>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
            <span className="text-sm font-semibold text-foreground">{resolvePrice(event)}</span>
            <span className="flex items-center gap-1 text-xs font-semibold text-primary opacity-0 transition-opacity group-hover:opacity-100">
              Подробнее <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
