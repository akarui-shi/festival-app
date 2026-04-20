import { useMemo, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Building2,
  Calendar,
  ChevronLeft,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  PlusCircle,
  X,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';

const navItems = [
  { to: '/organizer', label: 'Обзор', icon: LayoutDashboard, end: true },
  { to: '/organizer/events', label: 'Мероприятия', icon: Calendar },
  { to: '/organizer/events/create', label: 'Создать', icon: PlusCircle },
  { to: '/organizer/organization', label: 'Организация', icon: Building2 },
  { to: '/organizer/analytics', label: 'Аналитика', icon: BarChart3 },
  { to: '/organizer/publications', label: 'Публикации', icon: FileText },
];

export function OrganizerLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isActive = (path: string, end?: boolean) =>
    end ? location.pathname === path : location.pathname.startsWith(path);

  const activeLabel = useMemo(
    () => navItems.find((item) => isActive(item.to, item.end))?.label ?? 'Панель организатора',
    [location.pathname],
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-warm-cream/40 via-background to-background">
      <div className="mx-auto flex min-h-screen w-full">
        <aside
          className={`fixed inset-y-0 left-0 z-40 w-72 border-r border-border bg-card/95 backdrop-blur-sm transition-transform md:sticky md:top-0 md:h-screen md:translate-x-0 ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="flex h-full flex-col">
            <div className="border-b border-border px-5 py-5">
              <Link to="/organizer" className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
                  <span className="font-heading text-lg text-primary-foreground">К</span>
                </div>
                <div>
                  <p className="font-heading text-lg text-foreground">Организатор</p>
                  <p className="text-xs text-muted-foreground">Управление событиями</p>
                </div>
              </Link>
            </div>

            <nav className="flex-1 space-y-1.5 p-4">
              {navItems.map((item) => {
                const active = isActive(item.to, item.end);
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm transition-all ${
                      active
                        ? 'bg-primary/10 font-semibold text-primary shadow-soft'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="border-t border-border p-4">
              <div className="mb-3 rounded-xl bg-muted/70 px-3 py-2">
                <p className="text-sm font-semibold text-foreground">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 justify-start gap-1.5"
                  onClick={() => navigate('/')}
                >
                  <ChevronLeft className="h-4 w-4" />
                  На сайт
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Выйти из аккаунта"
                  onClick={() => {
                    logout();
                    navigate('/');
                  }}
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </aside>

        {sidebarOpen && (
          <button
            type="button"
            aria-label="Закрыть меню"
            className="fixed inset-0 z-30 bg-foreground/20 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 border-b border-border bg-background/90 px-4 py-3 backdrop-blur-md md:px-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setSidebarOpen((prev) => !prev)}
                  aria-label={sidebarOpen ? 'Закрыть меню' : 'Открыть меню'}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card md:hidden"
                >
                  {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
                </button>
                <div>
                  <p className="font-heading text-xl text-foreground">{activeLabel}</p>
                  <p className="text-xs text-muted-foreground">Рабочая зона организатора</p>
                </div>
              </div>

              <Button variant="outline" size="sm" className="hidden md:inline-flex" asChild>
                <Link to="/">Открыть сайт</Link>
              </Button>
            </div>
          </header>

          <main className="flex-1 p-4 md:p-8">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
