import { AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function LoadingState({ text = 'Загрузка…' }: { text?: string }) {
  return (
    <div className="flex animate-fade-in justify-center py-16">
      <div className="surface-soft flex min-w-[220px] flex-col items-center text-center">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
        <p className="text-sm text-muted-foreground">{text}</p>
      </div>
    </div>
  );
}

export function EmptyState({ icon, title, description, action }: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-in">
      {icon && <div className="text-4xl mb-4">{icon}</div>}
      <h3 className="font-heading text-lg font-semibold mb-1">{title}</h3>
      {description && <p className="text-sm text-muted-foreground max-w-md mb-4">{description}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex animate-fade-in justify-center py-16">
      <div className="surface-soft flex max-w-lg flex-col items-center text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10">
          <AlertCircle className="h-7 w-7 text-destructive" />
        </div>
        <h3 className="font-heading text-lg font-semibold text-foreground">Произошла ошибка</h3>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">{message}</p>
        {onRetry && (
          <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}>
            Попробовать снова
          </Button>
        )}
      </div>
    </div>
  );
}
