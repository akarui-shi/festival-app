import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Compass, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PublicLayout } from '@/layouts/PublicLayout';

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error('404 Error: User attempted to access non-existent route:', location.pathname);
  }, [location.pathname]);

  return (
    <PublicLayout>
      <section className="relative overflow-hidden bg-gradient-to-br from-warm-cream via-background to-golden-light/20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,hsl(var(--terracotta)/0.08),transparent_55%)]" />
        <div className="page-shell relative flex min-h-[70vh] items-center justify-center">
          <div className="surface-panel max-w-2xl text-center">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
              <Compass className="h-8 w-8 text-primary" />
            </div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Ошибка 404</p>
            <h1 className="mt-3 font-heading text-4xl text-foreground sm:text-5xl">
              Такой страницы здесь нет
            </h1>
            <p className="mx-auto mt-4 max-w-lg text-muted-foreground">
              Возможно, ссылка устарела или адрес был введён с ошибкой. Вернёмся к афише и продолжим поиск событий.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Button asChild size="lg" className="gap-2">
                <Link to="/">
                  <Home className="h-4 w-4" />
                  На главную
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link to="/events">Смотреть мероприятия</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
};

export default NotFound;
