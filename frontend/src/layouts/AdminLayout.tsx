import { useMemo, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  BookOpen,
  Calendar,
  ChevronLeft,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Mic2,
  Shield,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';

const navItems = [
  { to: '/admin', label: 'Обзор', icon: LayoutDashboard, end: true },
  { to: '/admin/users', label: 'Пользователи', icon: Users },
  { to: '/admin/events', label: 'Мероприятия', icon: Calendar },
  { to: '/admin/artists', label: 'Артисты', icon: Mic2 },
  { to: '/admin/publications', label: 'Публикации', icon: FileText },
  { to: '/admin/comments', label: 'Комментарии', icon: MessageSquare },
  { to: '/admin/directories', label: 'Справочники', icon: BookOpen },
];

export function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isActive = (path: string, end?: boolean) =>
    end ? location.pathname === path : location.pathname.startsWith(path);

  const activeLabel = useMemo(
    () => navItems.find((item) => isActive(item.to, item.end))?.label ?? 'Администрирование',
    [location.pathname],
  );

  const initials = [user?.firstName, user?.lastName]
    .filter(Boolean)
    .map((n) => n![0].toUpperCase())
    .join('') || '?';

  return (
    <div className="min-h-screen bg-[hsl(var(--warm-sand)/0.4)]">
      <div className="mx-auto flex min-h-screen w-full">
        <aside
          className={`fixed inset-y-0 left-0 z-40 w-64 border-r border-border bg-card shadow-card transition-transform md:sticky md:top-0 md:h-screen md:translate-x-0 ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="flex h-full flex-col">
            {/* Logo */}
            <div className="border-b border-border px-5 py-5">
              <Link to="/admin" className="group flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-[hsl(var(--terracotta-dark))] shadow-sm transition-transform duration-200 group-hover:scale-105">
                  <Shield className="h-4.5 w-4.5 text-primary-foreground" style={{ width: 18, height: 18 }} />
                </div>
                <div>
                  <p className="font-heading text-base font-bold text-foreground leading-tight">Администратор</p>
                  <p className="text-[11px] text-muted-foreground">Модерация и управление</p>
                </div>
              </Link>
            </div>

            {/* Nav */}
            <nav className="flex-1 space-y-0.5 p-3">
              {navItems.map((item) => {
                const active = isActive(item.to, item.end);
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setSidebarOpen(false)}
                    className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-150 ${
                      active
                        ? 'bg-primary/10 font-semibold text-primary'
                        : 'font-medium text-muted-foreground hover:bg-muted/70 hover:text-foreground'
                    }`}
                  >
                    {active && (
                      <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-primary" />
                    )}
                    <item.icon className={`h-4 w-4 shrink-0 transition-transform duration-150 group-hover:scale-110 ${active ? 'text-primary' : ''}`} />
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            {/* User footer */}
            <div className="border-t border-border p-3">
              <div className="mb-2 flex items-center gap-3 rounded-xl bg-muted/60 px-3 py-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/80 to-[hsl(var(--terracotta-dark)/0.7)] text-xs font-bold text-white">
                  {initials}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground leading-tight">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="truncate text-[11px] text-muted-foreground">{user?.email}</p>
                </div>
              </div>

              <div className="flex gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 justify-start gap-1.5 text-xs"
                  onClick={() => navigate('/')}
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  На сайт
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
                  aria-label="Выйти"
                  onClick={() => { logout(); navigate('/'); }}
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
            className="fixed inset-0 z-30 bg-foreground/20 backdrop-blur-sm md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 border-b border-border bg-background/95 px-4 py-3 backdrop-blur-md md:px-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setSidebarOpen((prev) => !prev)}
                  aria-label={sidebarOpen ? 'Закрыть меню' : 'Открыть меню'}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card shadow-soft md:hidden"
                >
                  {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
                </button>
                <div>
                  <p className="font-heading text-lg font-bold text-foreground leading-tight">{activeLabel}</p>
                  <p className="hidden text-xs text-muted-foreground sm:block">Раздел администрирования</p>
                </div>
              </div>

              <Button variant="outline" size="sm" className="hidden gap-1.5 md:inline-flex" asChild>
                <Link to="/">
                  <ChevronLeft className="h-3.5 w-3.5" />
                  На сайт
                </Link>
              </Button>
            </div>
          </header>

          <main className="flex-1 p-4 md:p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
