import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Menu, X, Heart, User, Calendar, LogOut, LayoutDashboard, Shield } from 'lucide-react';
import { useState } from 'react';

export function PublicLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, logout, isOrganizer, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const navLinks = [
    { to: '/', label: 'Афиша' },
    { to: '/events', label: 'Мероприятия' },
    { to: '/publications', label: 'Новости' },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-2xl">🎭</span>
            <span className="font-heading text-xl font-bold text-foreground">КультурАфиша</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map(l => (
              <Link key={l.to} to={l.to}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive(l.to) ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}>
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-2">
            {isAuthenticated ? (
              <>
                {isOrganizer && (
                  <Button variant="ghost" size="sm" onClick={() => navigate('/organizer')}>
                    <LayoutDashboard className="h-4 w-4 mr-1" />Панель
                  </Button>
                )}
                {isAdmin && (
                  <Button variant="ghost" size="sm" onClick={() => navigate('/admin')}>
                    <Shield className="h-4 w-4 mr-1" />Админ
                  </Button>
                )}
                <Button variant="ghost" size="icon" onClick={() => navigate('/favorites')}>
                  <Heart className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => navigate('/registrations')}>
                  <Calendar className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => navigate('/profile')}>
                  <User className="h-4 w-4 mr-1" />{user?.firstName}
                </Button>
                <Button variant="ghost" size="icon" onClick={() => { logout(); navigate('/'); }}>
                  <LogOut className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" onClick={() => navigate('/login')}>Войти</Button>
                <Button size="sm" onClick={() => navigate('/register')}>Регистрация</Button>
              </>
            )}
          </div>

          <button className="md:hidden p-2" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {menuOpen && (
          <div className="md:hidden border-t border-border bg-card p-4 animate-fade-in">
            <nav className="flex flex-col gap-2">
              {navLinks.map(l => (
                <Link key={l.to} to={l.to} onClick={() => setMenuOpen(false)}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${isActive(l.to) ? 'bg-primary/10 text-primary' : 'text-muted-foreground'}`}>
                  {l.label}
                </Link>
              ))}
              {isAuthenticated ? (
                <>
                  <Link to="/profile" onClick={() => setMenuOpen(false)} className="px-3 py-2 rounded-md text-sm font-medium text-muted-foreground">Профиль</Link>
                  <Link to="/favorites" onClick={() => setMenuOpen(false)} className="px-3 py-2 rounded-md text-sm font-medium text-muted-foreground">Избранное</Link>
                  <Link to="/registrations" onClick={() => setMenuOpen(false)} className="px-3 py-2 rounded-md text-sm font-medium text-muted-foreground">Мои записи</Link>
                  {isOrganizer && <Link to="/organizer" onClick={() => setMenuOpen(false)} className="px-3 py-2 rounded-md text-sm font-medium text-muted-foreground">Панель организатора</Link>}
                  {isAdmin && <Link to="/admin" onClick={() => setMenuOpen(false)} className="px-3 py-2 rounded-md text-sm font-medium text-muted-foreground">Админ-панель</Link>}
                  <button onClick={() => { logout(); navigate('/'); setMenuOpen(false); }} className="px-3 py-2 rounded-md text-sm font-medium text-destructive text-left">Выйти</button>
                </>
              ) : (
                <div className="flex gap-2 pt-2">
                  <Button variant="ghost" size="sm" className="flex-1" onClick={() => { navigate('/login'); setMenuOpen(false); }}>Войти</Button>
                  <Button size="sm" className="flex-1" onClick={() => { navigate('/register'); setMenuOpen(false); }}>Регистрация</Button>
                </div>
              )}
            </nav>
          </div>
        )}
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-border bg-card mt-auto">
        <div className="container py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">🎭</span>
                <span className="font-heading text-lg font-bold">КультурАфиша</span>
              </div>
              <p className="text-sm text-muted-foreground">Афиша городских фестивалей и культурных мероприятий вашего города</p>
            </div>
            <div>
              <h4 className="font-heading font-semibold mb-3">Навигация</h4>
              <div className="flex flex-col gap-1">
                {navLinks.map(l => (
                  <Link key={l.to} to={l.to} className="text-sm text-muted-foreground hover:text-foreground">{l.label}</Link>
                ))}
              </div>
            </div>
            <div>
              <h4 className="font-heading font-semibold mb-3">Контакты</h4>
              <p className="text-sm text-muted-foreground">info@kulturafisha.ru</p>
              <p className="text-sm text-muted-foreground">+7 (4852) 00-00-00</p>
            </div>
          </div>
          <div className="border-t border-border mt-6 pt-4 text-center text-xs text-muted-foreground">
            © 2026 КультурАфиша. Все права защищены.
          </div>
        </div>
      </footer>
    </div>
  );
}
