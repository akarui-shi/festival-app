import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { MapPin, Menu, X, User, Heart, LogIn, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cities } from "@/data/mock";

const navLinks = [
  { label: "Главная", path: "/" },
  { label: "Мероприятия", path: "/events" },
  { label: "Публикации", path: "/publications" },
  { label: "Избранное", path: "/favorites" },
  { label: "Профиль", path: "/profile" },
];

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [cityOpen, setCityOpen] = useState(false);
  const [selectedCity, setSelectedCity] = useState("Суздаль");
  const location = useLocation();
  const isAuth = false; // mock

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
            <span className="font-heading text-lg text-primary-foreground">К</span>
          </div>
          <span className="hidden font-heading text-xl text-foreground sm:block">
            Культура
          </span>
        </Link>

        {/* City selector */}
        <div className="relative">
          <button
            onClick={() => setCityOpen(!cityOpen)}
            className="flex items-center gap-1.5 rounded-full border border-border bg-muted px-3 py-1.5 text-sm font-body text-foreground transition-all hover:border-primary/40 hover:shadow-soft"
          >
            <MapPin className="h-3.5 w-3.5 text-primary" />
            <span>{selectedCity}</span>
            <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${cityOpen ? "rotate-180" : ""}`} />
          </button>
          {cityOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setCityOpen(false)} />
              <div className="absolute left-1/2 top-full z-50 mt-2 -translate-x-1/2 rounded-xl border border-border bg-card p-1.5 shadow-card">
                {cities.map((city) => (
                  <button
                    key={city}
                    onClick={() => { setSelectedCity(city); setCityOpen(false); }}
                    className={`block w-full rounded-lg px-4 py-2 text-left text-sm transition-colors hover:bg-muted ${
                      selectedCity === city ? "bg-primary/10 font-semibold text-primary" : "text-foreground"
                    }`}
                  >
                    {city}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => {
            if (!isAuth && (link.path === "/favorites" || link.path === "/profile")) return null;
            const active = location.pathname === link.path;
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`rounded-lg px-3 py-2 text-sm font-body transition-colors ${
                  active
                    ? "bg-primary/10 font-semibold text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {isAuth ? (
            <>
              <Link to="/favorites">
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary">
                  <Heart className="h-5 w-5" />
                </Button>
              </Link>
              <Link to="/profile">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                  <User className="h-4 w-4 text-primary" />
                </div>
              </Link>
            </>
          ) : (
            <Link to="/login" className="hidden md:block">
              <Button variant="default" size="sm" className="gap-1.5">
                <LogIn className="h-4 w-4" />
                Войти
              </Button>
            </Link>
          )}

          {/* Mobile toggle */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-foreground md:hidden"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
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
                      ? "bg-primary/10 font-semibold text-primary"
                      : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
            {!isAuth && (
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
  );
}
