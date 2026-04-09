import { useState } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EventCard } from "@/components/EventCard";
import { EmptyState } from "@/components/EmptyState";
import { events, categories, cities } from "@/data/mock";

export default function Events() {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Все");
  const [selectedCity, setSelectedCity] = useState("Все");
  const [showFilters, setShowFilters] = useState(false);

  const filtered = events.filter((e) => {
    const matchSearch = e.title.toLowerCase().includes(search.toLowerCase());
    const matchCategory = selectedCategory === "Все" || e.category === selectedCategory;
    const matchCity = selectedCity === "Все" || e.city === selectedCity;
    return matchSearch && matchCategory && matchCity;
  });

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="font-heading text-3xl text-foreground sm:text-4xl">Мероприятия</h1>
        <p className="mt-1 text-muted-foreground">
          Найдите интересные культурные события рядом с вами
        </p>
      </div>

      {/* Search & filter bar */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск мероприятий..."
            className="pl-9"
          />
        </div>
        <Button
          variant="outline"
          className="gap-2 sm:hidden"
          onClick={() => setShowFilters(!showFilters)}
        >
          <SlidersHorizontal className="h-4 w-4" />
          Фильтры
        </Button>
      </div>

      {/* Filters */}
      <div className={`mb-8 space-y-4 ${showFilters ? "block" : "hidden sm:block"}`}>
        {/* Categories */}
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`rounded-full border px-3.5 py-1.5 text-sm transition-all ${
                selectedCategory === cat
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Cities */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCity("Все")}
            className={`rounded-full border px-3.5 py-1.5 text-sm transition-all ${
              selectedCity === "Все"
                ? "border-primary bg-primary/10 font-semibold text-primary"
                : "border-border bg-card text-muted-foreground hover:border-primary/40"
            }`}
          >
            Все города
          </button>
          {cities.map((city) => (
            <button
              key={city}
              onClick={() => setSelectedCity(city)}
              className={`rounded-full border px-3.5 py-1.5 text-sm transition-all ${
                selectedCity === city
                  ? "border-primary bg-primary/10 font-semibold text-primary"
                  : "border-border bg-card text-muted-foreground hover:border-primary/40"
              }`}
            >
              {city}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      {filtered.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Search}
          title="Нет мероприятий"
          description="Попробуйте изменить параметры поиска или выбрать другой город"
        />
      )}
    </div>
  );
}
