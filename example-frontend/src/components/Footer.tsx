import { Link } from "react-router-dom";

export function Footer() {
  return (
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
              <Link to="/" className="text-sm text-muted-foreground hover:text-primary">Главная</Link>
              <Link to="/events" className="text-sm text-muted-foreground hover:text-primary">Мероприятия</Link>
              <Link to="/publications" className="text-sm text-muted-foreground hover:text-primary">Публикации</Link>
            </div>
          </div>
          <div>
            <h4 className="mb-3 font-heading text-sm text-foreground">Организаторам</h4>
            <div className="flex flex-col gap-2">
              <Link to="/login" className="text-sm text-muted-foreground hover:text-primary">Создать мероприятие</Link>
              <Link to="/login" className="text-sm text-muted-foreground hover:text-primary">Личный кабинет</Link>
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
  );
}
