import { Link, useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { LayoutDashboard, Users, Calendar, FileText, MessageSquare, BookOpen, LogOut, Menu, ChevronLeft, Shield } from 'lucide-react';
import { useState } from 'react';

const navItems = [
  { to: '/admin', label: 'Обзор', icon: LayoutDashboard, end: true },
  { to: '/admin/users', label: 'Пользователи', icon: Users },
  { to: '/admin/events', label: 'Мероприятия', icon: Calendar },
  { to: '/admin/publications', label: 'Публикации', icon: FileText },
  { to: '/admin/reviews', label: 'Отзывы', icon: MessageSquare },
  { to: '/admin/directories', label: 'Справочники', icon: BookOpen },
];

export function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isActive = (path: string, end?: boolean) =>
    end ? location.pathname === path : location.pathname.startsWith(path);

  return (
    <div className="min-h-screen flex bg-background">
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 border-r border-border bg-card transform transition-transform md:relative md:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full">
          <div className="p-4 border-b border-border">
            <Link to="/" className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <span className="font-heading text-lg font-bold">Админ-панель</span>
            </Link>
          </div>
          <nav className="flex-1 p-3 space-y-1">
            {navItems.map(item => (
              <Link key={item.to} to={item.to} onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive(item.to, item.end) ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="p-3 border-t border-border">
            <div className="px-3 py-2 text-sm text-muted-foreground">{user?.firstName} {user?.lastName}</div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" className="flex-1 justify-start" onClick={() => navigate('/')}>
                <ChevronLeft className="h-4 w-4 mr-1" />На сайт
              </Button>
              <Button variant="ghost" size="icon" onClick={() => { logout(); navigate('/'); }}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </aside>

      {sidebarOpen && <div className="fixed inset-0 z-30 bg-foreground/20 md:hidden" onClick={() => setSidebarOpen(false)} />}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-20 h-14 border-b border-border bg-card/95 backdrop-blur flex items-center px-4 md:hidden">
          <button onClick={() => setSidebarOpen(true)}><Menu className="h-5 w-5" /></button>
          <span className="ml-3 font-heading font-semibold">Администрирование</span>
        </header>
        <main className="flex-1 p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
