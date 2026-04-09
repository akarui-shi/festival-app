import { Heart } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";

export default function Favorites() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="font-heading text-3xl text-foreground sm:text-4xl">Избранное</h1>
      <p className="mt-1 text-muted-foreground">Мероприятия, которые вы сохранили</p>
      <EmptyState
        icon={Heart}
        title="Нет избранного"
        description="Добавляйте мероприятия в избранное, чтобы не потерять их"
      />
    </div>
  );
}
