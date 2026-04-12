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
  Shield,
  User,
  X,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';

const cityOptions = ['Суздаль', 'Ярославль', 'Кострома', 'Переславль-Залесский', 'Ростов'];

export function PublicLayout({ children }: { children: ReactNode }) {
  const { user, isAuthenticated, isOrganizer, isAdmin, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [cityOpen, setCityOpen] = useState(false);
  const [selectedCity, setSelectedCity] = useState(cityOptions[0]);

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
      { label: 'Избранное', path: '/favorites' },
      { label: 'Профиль', path: '/profile' },
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

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-md">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <span className="font-heading text-lg text-primary-foreground">К</span>
            </div>
            <span className="hidden font-heading text-xl text-foreground sm:block">Культура</span>
          </Link>

          <div className="relative hidden md:block">
            <button
              type="button"
              onClick={() => setCityOpen((prev) => !prev)}
              className="flex items-center gap-1.5 rounded-full border border-border bg-muted px-3 py-1.5 text-sm font-body text-foreground transition-all hover:border-primary/40 hover:shadow-soft"
            >
              <MapPin className="h-3.5 w-3.5 text-primary" />
              <span>{selectedCity}</span>
              <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${cityOpen ? 'rotate-180' : ''}`} />
            </button>
            {cityOpen && (
              <>
                <button
                  type="button"
                  aria-label="Закрыть список городов"
                  className="fixed inset-0 z-40 cursor-default"
                  onClick={() => setCityOpen(false)}
                />
                <div className="absolute left-1/2 top-full z-50 mt-2 -translate-x-1/2 rounded-xl border border-border bg-card p-1.5 shadow-card">
                  {cityOptions.map((city) => (
                    <button
                      type="button"
                      key={city}
                      onClick={() => {
                        setSelectedCity(city);
                        setCityOpen(false);
                      }}
                      className={`block w-full rounded-lg px-4 py-2 text-left text-sm transition-colors hover:bg-muted ${
                        selectedCity === city ? 'bg-primary/10 font-semibold text-primary' : 'text-foreground'
                      }`}
                    >
                      {city}
                    </button>
                  ))}
                </div>
              </>
            )}
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
                  <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary">
                    <Heart className="h-5 w-5" />
                  </Button>
                </Link>
                <Link to="/registrations">
                  <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary">
                    <Calendar className="h-5 w-5" />
                  </Button>
                </Link>
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
                  <Link
                    to="/registrations"
                    onClick={() => setMobileOpen(false)}
                    className="rounded-lg px-3 py-2.5 text-sm font-body text-muted-foreground hover:bg-muted"
                  >
                    Мои записи
                  </Link>
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
