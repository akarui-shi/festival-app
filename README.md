# Festival City App

Веб-приложение для организации культурных мероприятий и фестивалей в малом городе. Жители просматривают афишу и покупают билеты, организаторы управляют событиями и смотрят аналитику, администраторы модерируют контент.

## Стек

| Слой | Технологии |
|------|-----------|
| Backend | Java 17, Spring Boot 3.3, Spring Security, Spring Data JPA, Flyway |
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, TanStack Query |
| База данных | PostgreSQL 16 |
| Аутентификация | JWT (httpOnly cookie), OAuth2 (Google, Яндекс), email-подтверждение |
| Карты | Яндекс Карты JS API |
| Оплата | ЮКасса |
| Аналитика | Яндекс Метрика (опционально) |
| Инфраструктура | Docker Compose, nginx |

## Возможности

**Жители**
- Афиша с фильтрацией (категория, дата, цена, город) и картой
- Покупка билетов с оплатой через ЮКасса и QR-кодами
- Промокоды и скидки
- Избранное, история регистраций
- Отзывы и рейтинги

**Организаторы**
- Создание и редактирование мероприятий, управление сеансами и вместимостью
- Кабинет аналитики: посещаемость, выручка, конверсия (внутренняя + Яндекс Метрика)
- Управление промокодами и новостными публикациями
- Список участников с фильтрами

**Администраторы**
- Модерация мероприятий (статусная машина: черновик → на модерации → опубликовано)
- Управление пользователями и ролями
- Модерация отзывов и публикаций
- Редактирование справочников (категории, теги, города)

## Быстрый старт (Docker Compose)

Требования: Docker ≥ 24, Docker Compose ≥ 2.

```bash
git clone <repo-url>
cd festival-app
cp .env.example .env
# Заполните .env — минимально нужны DB_PASSWORD и JWT_SECRET
docker compose up -d
```

Приложение будет доступно на `http://localhost`.

Чтобы сгенерировать безопасный `JWT_SECRET`:
```bash
openssl rand -base64 64
```

## Локальная разработка

### Backend

```bash
cd backend
cp .env.example .env   # укажите реальные значения
./mvnw spring-boot:run
# API: http://localhost:8080
# Swagger UI: http://localhost:8080/swagger-ui.html
```

Требования: Java 17+, PostgreSQL 16 (или запустите только БД через Docker).

```bash
docker compose up db -d   # только база данных
```

### Frontend

```bash
cd frontend
cp .env.example .env      # укажите VITE_BACKEND_BASE_URL=http://localhost:8080
npm install
npm run dev
# http://localhost:5173
```

## Переменные окружения

Полный список с описаниями — в [.env.example](.env.example) (корень, для Docker Compose).

| Переменная | Описание |
|-----------|---------|
| `DB_PASSWORD` | Пароль PostgreSQL |
| `JWT_SECRET` | Base64-строка ≥ 32 символов |
| `APP_BASE_URL` | Публичный URL приложения (без слэша) |
| `GOOGLE_OAUTH_CLIENT_ID/SECRET` | Google OAuth2 |
| `YANDEX_OAUTH_CLIENT_ID/SECRET` | Яндекс OAuth2 |
| `MAIL_*` | SMTP (Яндекс Почта, Gmail и др.) |
| `YOOKASSA_SHOP_ID/SECRET_KEY` | ЮКасса (можно не заполнять для разработки) |

Фронтенд-переменные — в [frontend/.env.example](frontend/.env.example):

| Переменная | Описание |
|-----------|---------|
| `VITE_BACKEND_BASE_URL` | URL бэкенда |
| `VITE_YANDEX_MAPS_API_KEY` | Ключ Яндекс Карт |
| `VITE_YANDEX_METRIKA_COUNTER_ID` | Счётчик Метрики (опционально) |
| `VITE_METRIKA_DEMO` | `true` — демо-данные Метрики вместо реальных |

### Яндекс Метрика (кабинет организатора)

Если нужны реальные данные из Метрики, добавьте в `.env`:

```
YANDEX_METRIKA_ENABLED=true
YANDEX_METRIKA_TOKEN=<oauth_token>
YANDEX_METRIKA_COUNTER_ID=<counter_id>
VITE_METRIKA_DEMO=false
```

Без этих переменных кабинет работает на внутренней аналитике.

## Тестирование

```bash
# Frontend unit-тесты (Vitest)
cd frontend && npm test

# E2E тесты (Playwright)
cd frontend && npm run test:e2e

# Backend интеграционные тесты (Testcontainers — нужен Docker)
cd backend && ./mvnw test
```

## Структура проекта

```
festival-app/
├── backend/          # Spring Boot приложение
│   └── src/main/
│       ├── java/     # Контроллеры, сервисы, репозитории, сущности
│       └── resources/
│           └── db/migration/  # Flyway-миграции
├── frontend/         # React + Vite
│   └── src/
│       ├── pages/    # Страницы (public / organizer / admin)
│       ├── components/
│       ├── services/ # API-клиенты
│       └── contexts/ # Auth, City
├── docs/diagrams/    # C4, ER, BPMN, диаграммы последовательностей
└── docker-compose.yml
```
