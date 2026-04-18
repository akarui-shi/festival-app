import { useMemo, useState, type ComponentType, type ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Calendar,
  ChevronDown,
  Heart,
  LayoutDashboard,
  LogIn,
  LogOut,
  MapPin,
  Menu,
  Search,
  Shield,
  User,
  X,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useCity } from '@/contexts/CityContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Id } from '@/types';

export function PublicLayout({ children }: { children: ReactNode }) {
  const { user, isAuthenticated, isResident, isOrganizer, isAdmin, logout } = useAuth();
  const { cities, selectedCity, loading: cityLoading, setSelectedCityById } = useCity();
  const location = useLocation();
  const navigate = useNavigate();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [cityOpen, setCityOpen] = useState(false);
  const [citySearch, setCitySearch] = useState('');

  const navLinks = useMemo(() => {
    const baseLinks = [
      { label: 'Главная', path: '/' },
      { label: 'Мероприятия', path: '/events' },
      { label: 'Публикации', path: '/publications' },
    ];

    if (!isAuthenticated) {
      return baseLinks;
    }

    return [
      ...baseLinks,
    ];
  }, [isAuthenticated]);

  const dashboardLinks = useMemo(() => {
    const links: Array<{ to: string; label: string; icon: ComponentType<{ className?: string }> }> = [];

    if (isOrganizer) {
      links.push({ to: '/organizer', label: 'Панель', icon: LayoutDashboard });
    }

    if (isAdmin) {
      links.push({ to: '/admin', label: 'Админ', icon: Shield });
    }

    return links;
  }, [isAdmin, isOrganizer]);

  const getCityRegionLabel = (city: { region?: string | null; country?: string | null; id: Id }) =>
    city.region || city.country || 'Регион не указан';

  const getCityLabel = (city: { id: Id; name: string; region?: string | null; country?: string | null }) => {
    const regionLabel = getCityRegionLabel(city);
    return `${city.name}, ${regionLabel}`;
  };

  const cityLabel = cityLoading
    ? 'Загрузка…'
    : selectedCity ? selectedCity.name : 'Выберите город';
  const requiresCitySelection = !cityLoading && !selectedCity && cities.length > 0;
  const visibleCities = useMemo(() => {
    const normalizedQuery = citySearch.trim().toLowerCase();
    const terms = normalizedQuery.split(/\s+/).filter(Boolean);

    const withScore = cities
      .map((city) => {
        const name = city.name.toLowerCase();
        const region = `${city.region || ''} ${city.country || ''}`.trim().toLowerCase();
        const full = `${name} ${region}`.trim();
        const matchesByName = terms.length === 0 || terms.every((term) => name.includes(term));
        const matchesByRegion = terms.length > 0 && terms.every((term) => region.includes(term));
        const matchesByFull = terms.length > 0 && terms.every((term) => full.includes(term));

        if (!matchesByName && !matchesByRegion && !matchesByFull) {
          return null;
        }

        let score = 0;
        if (normalizedQuery.length > 0) {
          if (name === normalizedQuery) {
            score = 0;
          } else if (name.startsWith(normalizedQuery)) {
            score = 1;
          } else if (terms.every((term) => name.includes(term))) {
            score = 2;
          } else if (full.startsWith(normalizedQuery)) {
            score = 3;
          } else if (full.includes(normalizedQuery) && name.includes(normalizedQuery)) {
            score = 4;
          } else if (region.startsWith(normalizedQuery)) {
            score = 5;
          } else if (terms.every((term) => region.includes(term))) {
            score = 6;
          } else {
            score = 7;
          }
        }

        return { city, score };
      })
      .filter((item): item is { city: typeof cities[number]; score: number } => item !== null);

    withScore.sort((left, right) => {
      if (left.score !== right.score) return left.score - right.score;
      const nameCompare = left.city.name.localeCompare(right.city.name, 'ru');
      if (nameCompare !== 0) return nameCompare;
      return getCityRegionLabel(left.city).localeCompare(getCityRegionLabel(right.city), 'ru');
    });

    return withScore.map((item) => item.city);
  }, [cities, citySearch]);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-md">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
                <span className="font-heading text-lg text-primary-foreground">К</span>
              </div>
              <span className="hidden font-heading text-xl text-foreground sm:block">Культура</span>
            </Link>

            <div className="relative hidden sm:block">
              <button
                type="button"
                onClick={() => {
                  setCityOpen((prev) => !prev);
                  setCitySearch('');
                }}
                disabled={cityLoading || cities.length === 0}
                className="flex items-center gap-1.5 rounded-full border border-border bg-muted px-3 py-1.5 text-sm font-body text-foreground transition-all hover:border-primary/40 hover:shadow-soft"
              >
                <MapPin className="h-3.5 w-3.5 text-primary" />
                <span className="max-w-28 truncate">{cityLabel}</span>
                <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${cityOpen ? 'rotate-180' : ''}`} />
              </button>
              {cityOpen && (
                <>
                  <button
                    type="button"
                    aria-label="Закрыть список городов"
                    className="fixed inset-0 z-40 cursor-default"
                    onClick={() => {
                      if (requiresCitySelection) return;
                      setCityOpen(false);
                      setCitySearch('');
                    }}
                  />
                  <div className="absolute left-1/2 top-full z-50 mt-2 -translate-x-1/2 rounded-xl border border-border bg-card p-1.5 shadow-card">
                    <div className="relative mb-1.5">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        value={citySearch}
                        onChange={(event) => setCitySearch(event.target.value)}
                        placeholder="Поиск города…"
                        className="h-9 w-64 pl-8 text-sm"
                      />
                    </div>

                    <div className="max-h-64 overflow-auto">
                      {visibleCities.length === 0 && (
                        <p className="px-4 py-3 text-sm text-muted-foreground">Ничего не найдено</p>
                      )}

                      {visibleCities.map((city) => (
                        <button
                          type="button"
                          key={city.id}
                          onClick={() => {
                            setSelectedCityById(String(city.id));
                            setCityOpen(false);
                            setCitySearch('');
                          }}
                          className={`block w-full rounded-lg px-4 py-2 text-left text-sm transition-colors hover:bg-muted ${
                            selectedCity?.id === city.id ? 'bg-primary/10 font-semibold text-primary' : 'text-foreground'
                          }`}
                        >
                          {getCityLabel(city)}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          <nav className="hidden items-center gap-1 lg:flex">
            {navLinks.map((link) => {
              const active = location.pathname === link.path;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`rounded-lg px-3 py-2 text-sm font-body transition-colors ${
                    active
                      ? 'bg-primary/10 font-semibold text-primary'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          <div className="hidden items-center gap-2 md:flex">
            {dashboardLinks.map((link) => {
              const Icon = link.icon;

              return (
                <Button key={link.to} variant="ghost" size="sm" className="gap-1.5" asChild>
                  <Link to={link.to}>
                    <Icon className="h-4 w-4" />
                    {link.label}
                  </Link>
                </Button>
              );
            })}

            {isAuthenticated ? (
              <>
                <Link to="/favorites">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-primary"
                    aria-label="Открыть избранное"
                  >
                    <Heart className="h-5 w-5" />
                  </Button>
                </Link>
                {isResident && (
                  <Link to="/tickets">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-primary"
                      aria-label="Открыть мои билеты"
                    >
                      <Calendar className="h-5 w-5" />
                    </Button>
                  </Link>
                )}
                <Link to="/profile" className="flex h-9 items-center gap-2 rounded-full bg-primary/10 px-3">
                  <User className="h-4 w-4 text-primary" />
                  <span className="max-w-28 truncate text-sm font-semibold text-primary">
                    {user?.firstName || 'Профиль'}
                  </span>
                </Link>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-destructive"
                  aria-label="Выйти из аккаунта"
                  onClick={() => {
                    logout();
                    navigate('/');
                  }}
                >
                  <LogOut className="h-5 w-5" />
                </Button>
              </>
            ) : (
              <Link to="/login">
                <Button variant="default" size="sm" className="gap-1.5">
                  <LogIn className="h-4 w-4" />
                  Войти
                </Button>
              </Link>
            )}
          </div>

          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-label={mobileOpen ? 'Закрыть меню' : 'Открыть меню'}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-foreground md:hidden"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {mobileOpen && (
          <div className="border-t border-border bg-card px-4 pb-4 pt-2 md:hidden">
            <nav className="flex flex-col gap-1">
              {navLinks.map((link) => {
                const active = location.pathname === link.path;
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    onClick={() => setMobileOpen(false)}
                    className={`rounded-lg px-3 py-2.5 text-sm font-body transition-colors ${
                      active
                        ? 'bg-primary/10 font-semibold text-primary'
                        : 'text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}

              {isAuthenticated && (
                <>
                  {isResident && (
                    <Link
                      to="/tickets"
                      onClick={() => setMobileOpen(false)}
                      className="rounded-lg px-3 py-2.5 text-sm font-body text-muted-foreground hover:bg-muted"
                    >
                      Мои билеты
                    </Link>
                  )}
                  {dashboardLinks.map((link) => (
                    <Link
                      key={link.to}
                      to={link.to}
                      onClick={() => setMobileOpen(false)}
                      className="rounded-lg px-3 py-2.5 text-sm font-body text-muted-foreground hover:bg-muted"
                    >
                      {link.label}
                    </Link>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      logout();
                      navigate('/');
                      setMobileOpen(false);
                    }}
                    className="rounded-lg px-3 py-2.5 text-left text-sm font-body text-destructive hover:bg-destructive/5"
                  >
                    Выйти
                  </button>
                </>
              )}

              {!isAuthenticated && (
                <Link to="/login" onClick={() => setMobileOpen(false)}>
                  <Button className="mt-2 w-full gap-1.5">
                    <LogIn className="h-4 w-4" />
                    Войти
                  </Button>
                </Link>
              )}
            </nav>
          </div>
        )}
      </header>

      <main className="flex-1">{children}</main>

      {requiresCitySelection && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-foreground/40 px-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-card">
            <h2 className="font-heading text-2xl text-foreground">Выберите ваш город</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Мы покажем мероприятия именно для выбранного города.
            </p>
            <div className="mt-4 max-h-72 space-y-2 overflow-auto">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={citySearch}
                  onChange={(event) => setCitySearch(event.target.value)}
                  placeholder="Поиск города…"
                  className="h-10 pl-8 text-sm"
                />
              </div>

              {visibleCities.length === 0 && (
                <p className="px-1 py-3 text-sm text-muted-foreground">Ничего не найдено</p>
              )}

              {visibleCities.map((city) => (
                <button
                  key={city.id}
                  type="button"
                  className="w-full rounded-xl border border-border px-4 py-2.5 text-left text-sm text-foreground transition-colors hover:bg-muted"
                  onClick={() => {
                    setSelectedCityById(String(city.id));
                    setCitySearch('');
                  }}
                >
                  {getCityLabel(city)}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <footer className="border-t border-border bg-muted/50">
        <div className="container mx-auto px-4 py-10">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                  <span className="font-heading text-sm text-primary-foreground">К</span>
                </div>
                <span className="font-heading text-lg text-foreground">Культура</span>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                Платформа культурных событий для малых городов России
              </p>
            </div>

            <div>
              <h4 className="mb-3 font-heading text-sm text-foreground">Навигация</h4>
              <div className="flex flex-col gap-2">
                <Link to="/" className="text-sm text-muted-foreground hover:text-primary">
                  Главная
                </Link>
                <Link to="/events" className="text-sm text-muted-foreground hover:text-primary">
                  Мероприятия
                </Link>
                <Link to="/publications" className="text-sm text-muted-foreground hover:text-primary">
                  Публикации
                </Link>
              </div>
            </div>

            <div>
              <h4 className="mb-3 font-heading text-sm text-foreground">Организаторам</h4>
              <div className="flex flex-col gap-2">
                <Link to="/login" className="text-sm text-muted-foreground hover:text-primary">
                  Создать мероприятие
                </Link>
                <Link to="/login" className="text-sm text-muted-foreground hover:text-primary">
                  Личный кабинет
                </Link>
              </div>
            </div>

            <div>
              <h4 className="mb-3 font-heading text-sm text-foreground">Контакты</h4>
              <p className="text-sm text-muted-foreground">info@kultura.ru</p>
            </div>
          </div>

          <div className="mt-8 border-t border-border pt-6 text-center text-xs text-muted-foreground">
            © 2026 Культура. Все права защищены.
          </div>
        </div>
      </footer>
    </div>
  );
}
