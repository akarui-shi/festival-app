import { Loader2 } from 'lucide-react';

export function LoadingState({ text = 'Загрузка...' }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 animate-fade-in">
      <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
      <p className="text-sm text-muted-foreground">{text}</p>
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
    <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-in">
      <div className="text-4xl mb-4">😔</div>
      <h3 className="font-heading text-lg font-semibold mb-1">Произошла ошибка</h3>
      <p className="text-sm text-muted-foreground max-w-md mb-4">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="text-sm text-primary hover:underline">Попробовать снова</button>
      )}
    </div>
  );
}
