import { Link } from 'react-router-dom';
import type { Event } from '@/types';
import { Heart, MapPin, Calendar, Star, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface EventCardProps {
  event: Event;
  onFavoriteToggle?: (eventId: string) => void;
  isFavorite?: boolean;
  variant?: 'default' | 'compact' | 'featured';
}

export function EventCard({ event, onFavoriteToggle, isFavorite, variant = 'default' }: EventCardProps) {
  const formatDate = (date: string) => {
    try { return format(new Date(date), 'd MMM', { locale: ru }); } catch { return ''; }
  };

  const isFeatured = variant === 'featured';

  return (
    <Link to={`/events/${event.id}`}
      className={`group block rounded-xl border border-border bg-card overflow-hidden transition-all hover:shadow-lg hover:-translate-y-1 ${isFeatured ? 'md:flex' : ''}`}>
      <div className={`relative overflow-hidden ${isFeatured ? 'md:w-2/5' : ''}`}>
        <div className={`bg-gradient-to-br from-primary/20 via-accent/10 to-primary/5 ${isFeatured ? 'h-48 md:h-full' : variant === 'compact' ? 'h-36' : 'h-48'}`}>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-5xl opacity-40">{event.category?.icon || '🎉'}</span>
          </div>
        </div>
        {event.isFree && (
          <Badge className="absolute top-3 left-3 bg-success text-success-foreground border-0">Бесплатно</Badge>
        )}
        {!event.isFree && event.price && (
          <Badge className="absolute top-3 left-3 bg-card text-foreground border-0 shadow">{event.price} ₽</Badge>
        )}
        {onFavoriteToggle && (
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onFavoriteToggle(event.id); }}
            className="absolute top-3 right-3 p-2 rounded-full bg-card/80 backdrop-blur hover:bg-card transition-colors shadow-sm"
          >
            <Heart className={`h-4 w-4 ${isFavorite ? 'fill-accent text-accent' : 'text-muted-foreground'}`} />
          </button>
        )}
        <div className="absolute bottom-3 left-3">
          <Badge variant="secondary" className="text-xs">{event.category?.name}</Badge>
        </div>
      </div>

      <div className={`p-4 ${isFeatured ? 'md:flex-1 md:p-6' : ''}`}>
        <h3 className={`font-heading font-semibold line-clamp-2 group-hover:text-primary transition-colors ${isFeatured ? 'text-xl mb-3' : 'text-base mb-2'}`}>
          {event.title}
        </h3>

        {(variant !== 'compact') && (
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{event.shortDescription}</p>
        )}

        <div className="flex flex-col gap-1.5 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            <span>{formatDate(event.startDate)} — {formatDate(event.endDate)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5" />
            <span className="truncate">{event.venue?.name}, {event.city?.name}</span>
          </div>
          {event.averageRating && event.averageRating > 0 && (
            <div className="flex items-center gap-1.5">
              <Star className="h-3.5 w-3.5 fill-warning text-warning" />
              <span>{event.averageRating.toFixed(1)} ({event.reviewsCount})</span>
              {event.registrationsCount && event.registrationsCount > 0 && (
                <>
                  <span className="mx-1">·</span>
                  <Users className="h-3.5 w-3.5" />
                  <span>{event.registrationsCount} записей</span>
                </>
              )}
            </div>
          )}
        </div>

        {event.format !== 'OFFLINE' && (
          <Badge variant="outline" className="mt-3 text-xs">
            {event.format === 'ONLINE' ? 'Онлайн' : 'Гибрид'}
          </Badge>
        )}
      </div>
    </Link>
  );
}
