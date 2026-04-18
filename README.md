# Festival City App

Веб-приложение для организации и продвижения фестивалей и культурных мероприятий в малом городе.

## Технологии
- Backend: Java 17, Spring Boot, Spring Security, Spring Data JPA
- Frontend: React, Vite, React Router
- Database: PostgreSQL, Flyway

## Роли
- Житель
- Организатор
- Администратор

## Основной функционал
- Регистрация и авторизация
- Просмотр афиши мероприятий
- Фильтрация мероприятий
- Запись на сеансы
- Избранное
- Отзывы
- Управление мероприятиями организатором
- Модерация публикаций и отзывов администратором

## Интеграция Яндекс Метрики (кабинет организатора)
Для подключения внешней аналитики укажите переменные окружения backend:

- `YANDEX_METRIKA_ENABLED=true`
- `YANDEX_METRIKA_TOKEN=<oauth_token>`
- `YANDEX_METRIKA_COUNTER_ID=<counter_id>`

Конфигурация в `application.yml`:

```yaml
yandex:
  metrika:
    enabled: ${YANDEX_METRIKA_ENABLED:false}
    token: ${YANDEX_METRIKA_TOKEN:}
    counter-id: ${YANDEX_METRIKA_COUNTER_ID:}
```

Если Метрика не настроена, кабинет организатора продолжает работать на внутренней аналитике и показывает понятный статус внешних метрик.

## Схема БД v2
- Бэкенд переведён на миграции Flyway.
- Финальная схема по новой ER-модели: `backend/src/main/resources/db/migration/V1__new_er_schema.sql`.
- Слой `entity/repository/service` полностью переведён на новую модель данных (legacy-классы удалены).
