import { FileText } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";

export default function Publications() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="font-heading text-3xl text-foreground sm:text-4xl">Публикации</h1>
      <p className="mt-1 text-muted-foreground">Статьи и новости о культурной жизни</p>
      <EmptyState
        icon={FileText}
        title="Нет публикаций"
        description="Публикации появятся здесь, когда организаторы начнут делиться новостями"
      />
    </div>
  );
}
