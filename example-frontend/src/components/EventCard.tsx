import { Link } from "react-router-dom";
import { CalendarDays, MapPin, Clock, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Event } from "@/data/mock";

export function EventCard({ event }: { event: Event }) {
  return (
    <Link
      to={`/events/${event.id}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-hover"
    >
      {/* Image */}
      <div className="relative aspect-[3/2] overflow-hidden">
        <img
          src={event.image}
          alt={event.title}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
        <div className="absolute left-3 top-3 flex gap-1.5">
          <Badge variant="secondary" className="bg-card/90 text-xs font-semibold backdrop-blur-sm">
            {event.category}
          </Badge>
          <Badge variant="outline" className="border-card/60 bg-card/90 text-xs backdrop-blur-sm">
            {event.ageRestriction}
          </Badge>
        </div>
        {event.isFree && (
          <Badge className="absolute right-3 top-3 bg-primary text-primary-foreground">
            Бесплатно
          </Badge>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-4">
        <h3 className="font-heading text-lg leading-snug text-card-foreground group-hover:text-primary">
          {event.title}
        </h3>
        <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">
          {event.shortDescription}
        </p>

        <div className="mt-auto pt-4">
          <div className="flex flex-col gap-1.5 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5 text-primary/70" />
              <span>{event.date}</span>
              <Clock className="ml-2 h-3.5 w-3.5 text-primary/70" />
              <span>{event.time}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-primary/70" />
              <span className="truncate">{event.address}, {event.city}</span>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
            <span className="text-sm font-semibold text-foreground">
              {event.price}
            </span>
            <span className="flex items-center gap-1 text-xs font-semibold text-primary opacity-0 transition-opacity group-hover:opacity-100">
              Подробнее <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
