import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CalendarDays, Clock, Heart, MapPin } from 'lucide-react';
import { imageSrc } from '@/lib/image';
import type { Event, Id } from '@/types';

interface EventCardProps {
  event: Event;
  onFavoriteToggle?: (eventId: Id) => void;
  isFavorite?: boolean;
  variant?: 'default' | 'compact' | 'featured';
}

function formatDate(value?: string): string {
  if (!value) return 'Дата уточняется';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Дата уточняется';
  return new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
}

function resolveTime(event: Event): string {
  const date = new Date(event.nextSessionAt || event.startDate || event.createdAt || '');
  if (Number.isNaN(date.getTime())) return '';
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return hh === '00' && mm === '00' ? '' : `${hh}:${mm}`;
}

function resolvePrice(event: Event): string {
  if (event.free || event.isFree) return 'Бесплатно';
  if (typeof event.minPrice === 'number' && typeof event.maxPrice === 'number') {
    if (event.minPrice === event.maxPrice) return `${event.minPrice.toLocaleString('ru-RU')} ₽`;
    return `от ${event.minPrice.toLocaleString('ru-RU')} ₽`;
  }
  if (typeof event.price === 'number') return `${event.price.toLocaleString('ru-RU')} ₽`;
  return 'Цена уточняется';
}

function toShortAddress(address?: string): string {
  if (!address) return '';
  const parts = address.split(',').map((p) => p.trim()).filter(Boolean);
  if (parts.length <= 2) return parts.join(', ');
  const streetIndex = parts.findIndex((p) =>
    /^(ул\.?|улица|пр-?кт|проспект|пер\.?|переулок|бул\.?|бульвар|наб\.?|набережная|ш\.?|шоссе|пл\.?|площадь|проезд|аллея|д\.)/i.test(p),
  );
  return streetIndex >= 0 ? parts.slice(streetIndex).join(', ') : parts.slice(-2).join(', ');
}

export function EventCard({ event, onFavoriteToggle, isFavorite }: EventCardProps) {
  const fallbackImage = '/placeholder-event.svg';
  const preferredImage = imageSrc(event.coverImageId == null ? null : Number(event.coverImageId), fallbackImage);
  const [image, setImage] = useState(preferredImage);

  useEffect(() => { setImage(preferredImage); }, [preferredImage, event.id]);

  const categoryNames = (event.categories || [])
    .map((c) => c?.name)
    .filter((n): n is string => Boolean(n?.trim()));
  if (!categoryNames.length && event.category?.name) categoryNames.push(event.category.name);

  const ageLabel = event.ageRating != null ? `${event.ageRating}+` : null;
  const eventDate = event.nextSessionAt || event.startDate || event.createdAt || '';
  const timeLabel = resolveTime(event);
  const isFree = event.free || event.isFree;
  const priceLabel = resolvePrice(event);

  const venue = event.venue?.name || event.venueName;
  const address = toShortAddress(event.venue?.address || event.venueAddress || '');
  const locationLabel = venue || address || null;

  return (
    <Link
      to={`/events/${event.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-soft transition-all duration-300 hover:-translate-y-1.5 hover:border-primary/20 hover:shadow-hover"
    >
      {/* Image */}
      <div className="relative aspect-[3/2] overflow-hidden bg-muted">
        <img
          src={image}
          alt={event.title}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          loading="lazy"
          onError={() => { if (image !== fallbackImage) setImage(fallbackImage); }}
        />

        {/* Gradient scrim */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-black/5 to-transparent" />

        {/* Category badges — top left */}
        {(categoryNames.length > 0 || ageLabel) && (
          <div className="absolute left-3 top-3 flex max-w-[calc(100%-4.5rem)] flex-wrap gap-1">
            {categoryNames.slice(0, 2).map((name, i) => (
              <span
                key={`${name}-${i}`}
                className="rounded-full bg-black/40 px-2.5 py-0.5 text-[11px] font-semibold text-white backdrop-blur-md"
              >
                {name}
              </span>
            ))}
            {ageLabel && (
              <span className="rounded-full border border-white/20 bg-black/30 px-2.5 py-0.5 text-[11px] text-white/80 backdrop-blur-md">
                {ageLabel}
              </span>
            )}
          </div>
        )}

        {/* Free badge — top right */}
        {isFree && (
          <span className="absolute right-3 top-3 rounded-full bg-[hsl(var(--success))] px-2.5 py-0.5 text-[11px] font-bold text-white shadow-sm">
            Бесплатно
          </span>
        )}

        {/* Favorite button */}
        {onFavoriteToggle && (
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onFavoriteToggle(event.id); }}
            className={`absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-full border bg-white/90 backdrop-blur-sm transition-all duration-200 hover:scale-110 active:scale-95 ${
              isFavorite ? 'border-primary/20 shadow-md' : 'border-white/30 hover:border-primary/20 hover:shadow-md'
            }`}
            aria-label={isFavorite ? 'Удалить из избранного' : 'Добавить в избранное'}
          >
            <Heart
              className={`h-4 w-4 transition-all duration-200 ${
                isFavorite ? 'fill-primary text-primary' : 'text-muted-foreground hover:text-primary'
              }`}
            />
          </button>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col p-4">
        <h3 className="line-clamp-2 font-heading text-base leading-snug text-card-foreground transition-colors duration-200 group-hover:text-primary">
          {event.title}
        </h3>

        {event.shortDescription && (
          <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
            {event.shortDescription}
          </p>
        )}

        <div className="mt-auto pt-3.5">
          {/* Meta info */}
          <div className="space-y-1.5 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5 shrink-0 text-primary/60" />
              <span>{formatDate(eventDate)}</span>
              {timeLabel && (
                <>
                  <span className="text-border">·</span>
                  <Clock className="h-3.5 w-3.5 shrink-0 text-primary/60" />
                  <span>{timeLabel}</span>
                </>
              )}
            </div>
            {locationLabel && (
              <div className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 shrink-0 text-primary/60" />
                <span className="truncate">{locationLabel}</span>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
            <span
              className={`text-sm font-bold ${
                isFree ? 'text-[hsl(var(--success))]' : 'text-foreground'
              }`}
            >
              {priceLabel}
            </span>
            <span className="flex translate-x-1 items-center gap-0.5 text-xs font-semibold text-primary opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100">
              Подробнее <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
