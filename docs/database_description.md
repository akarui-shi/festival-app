# Описание базы данных (v2)

Проект переведён на явные миграции Flyway. Финальная схема БД реализована в файле:

- `backend/src/main/resources/db/migration/V1__new_er_schema.sql`

Схема полностью повторяет финальную ER-модель и включает:

- `users`, `roles`, `user_roles`
- `cities`
- `organizations`, `organization_members`
- `events`, `categories`, `event_categories`
- `artists`, `event_artists`
- `venues`, `sessions`
- `ticket_types`, `orders`, `order_items`, `tickets`, `payments`, `refunds`
- `favorites`, `comments`
- `publications`
- `images`, `event_images`, `publication_images`, `organization_images`, `artist_images`
- `moderations`

## Принципы схемы

- Все связи между сущностями заданы внешними ключами.
- Для статусов добавлены `CHECK`-ограничения (модерация, публикации, заказы, билеты и т.д.).
- Для бизнес-критичных уникальностей добавлены `UNIQUE`-ограничения (логин/email, избранное, связи many-to-many).
- Для производительности добавлены индексы по FK, статусам и типовым фильтрам.
- Для ряда сущностей предусмотрено soft-delete поле `deleted_at`.

## Инициализация данных

В миграции добавлены базовые сиды:

- роли: Житель, Организатор, Администратор
- категории: Музыка, Театр, Выставка, Городской праздник
- города: Коломна, Москва, Рязань, Тула

## Важное замечание

Миграция `V1__new_er_schema.sql` носит **destructive**-характер: она удаляет legacy-таблицы и пересоздаёт схему под новую архитектуру.
