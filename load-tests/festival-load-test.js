/**
 * Нагрузочный тест festival-app
 *
 * Требование: время отклика REST API — не более 2 с при 1000 одновременных пользователях.
 *
 * Смешанный профиль запросов (соотношение 70 / 20 / 10):
 *   70% — публичные GET-запросы к каталогу мероприятий и сеансов
 *   20% — операции аутентификации и просмотра личного кабинета
 *   10% — оформление заказов и записей
 *
 * Запуск (500 VU — для локальной проверки на слабом железе):
 *   k6 run festival-load-test.js
 *
 * Запуск на полных 1000 VU (нефункциональное требование: время отклика ≤ 2 с):
 *   k6 run --env VU_SCALE=2 festival-load-test.js
 *
 * Установка k6: brew install k6
 */
import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// ─── Настройки ────────────────────────────────────────────────────────────────

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';

// VU_SCALE=1 → 500 VU (локальное тестирование)
// VU_SCALE=2 → 1000 VU (полная нагрузка по требованию)
const SCALE = Number(__ENV.VU_SCALE) || 1;

// Соотношение 70 / 20 / 10 при базе 500 VU
const VU_PUBLIC   = Math.round(350 * SCALE);  // 70%
const VU_AUTH     = Math.round(100 * SCALE);  // 20%
const VU_ORDERS   = Math.round( 50 * SCALE);  // 10%

// ─── Кастомные метрики ────────────────────────────────────────────────────────

// Отслеживаем ошибки отдельно по каждой группе запросов
const publicErrors  = new Rate('public_errors');
const authErrors    = new Rate('auth_errors');
const orderErrors   = new Rate('order_errors');

// Отслеживаем задержку для каждого типа запросов
const catalogLatency = new Trend('catalog_latency', true);
const profileLatency = new Trend('profile_latency', true);
const orderLatency   = new Trend('order_latency', true);

// ─── Конфигурация сценариев ───────────────────────────────────────────────────

export const options = {
  scenarios: {

    // 70% — каталог мероприятий и сеансов (публичные GET)
    public_catalog: {
      executor: 'ramping-vus',
      exec: 'catalogScenario',
      stages: [
        { duration: '30s', target: VU_PUBLIC },   // разогрев
        { duration: '3m',  target: VU_PUBLIC },   // основная нагрузка
        { duration: '30s', target: 0 },           // остывание
      ],
      startTime: '0s',
    },

    // 20% — аутентификация и личный кабинет
    auth_profile: {
      executor: 'ramping-vus',
      exec: 'authScenario',
      stages: [
        { duration: '30s', target: VU_AUTH },
        { duration: '3m',  target: VU_AUTH },
        { duration: '30s', target: 0 },
      ],
      startTime: '0s',
    },

    // 10% — оформление заказов и записей
    orders: {
      executor: 'ramping-vus',
      exec: 'orderScenario',
      stages: [
        { duration: '30s', target: VU_ORDERS },
        { duration: '3m',  target: VU_ORDERS },
        { duration: '30s', target: 0 },
      ],
      startTime: '0s',
    },
  },

  // ─── Пороги из требования ────────────────────────────────────────────────────
  thresholds: {
    // Требование: время отклика не более 2 с (p95 — 95% запросов укладываются)
    'http_req_duration':  ['p(95)<2000'],
    'catalog_latency':    ['p(95)<2000'],
    'profile_latency':    ['p(95)<2000'],
    'order_latency':      ['p(95)<2000'],

    // Дополнительные пороги качества
    'http_req_failed':    ['rate<0.01'],   // ошибок меньше 1%
    'public_errors':      ['rate<0.01'],
    'auth_errors':        ['rate<0.05'],   // для auth допускаем чуть больше (неверные токены и т.п.)
    'order_errors':       ['rate<0.05'],
  },
};

// ─── Вспомогательные функции ──────────────────────────────────────────────────

/**
 * Получить токен администратора для авторизованных сценариев.
 * В реальном тесте лучше вынести в setup() и передавать через __ENV.
 */
function getAdminToken() {
  const res = http.post(`${BASE_URL}/api/auth/login`,
    JSON.stringify({ loginOrEmail: 'admin_local', password: '123456' }),
    { headers: { 'Content-Type': 'application/json' } }
  );
  if (res.status === 200) {
    return res.json('token');
  }
  return null;
}

/** Заголовки с авторизацией */
function authHeaders(token) {
  return {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  };
}

// ─── Сценарий 1: Каталог мероприятий (70%) ────────────────────────────────────
// Имитирует обычного посетителя: просмотр списка, поиск, детальная страница, сеансы.

export function catalogScenario() {
  group('public: catalog', () => {

    // GET /api/events — главный список мероприятий
    let res = http.get(`${BASE_URL}/api/events`);
    const catalogOk = check(res, {
      'events list status 200': (r) => r.status === 200,
      'events list is array':   (r) => Array.isArray(r.json()),
    });
    catalogLatency.add(res.timings.duration);
    publicErrors.add(!catalogOk);

    sleep(0.5);

    // GET /api/events?search=... — поиск по названию (кириллица требует URL-кодирования)
    res = http.get(`${BASE_URL}/api/events?search=${encodeURIComponent('фестиваль')}`);
    check(res, { 'search status 200': (r) => r.status === 200 });
    catalogLatency.add(res.timings.duration);
    sleep(0.5);

    // GET /api/events/{id} — детальная страница (используем ID=1, предполагая что он существует)
    res = http.get(`${BASE_URL}/api/events/1`);
    check(res, { 'event detail 200 or 404': (r) => r.status === 200 || r.status === 404 });
    catalogLatency.add(res.timings.duration);
    sleep(0.3);

    // GET /api/events/1/sessions — сеансы мероприятия
    res = http.get(`${BASE_URL}/api/sessions?eventId=1`);
    check(res, { 'sessions status 200 or 404': (r) => r.status === 200 || r.status === 404 });
    catalogLatency.add(res.timings.duration);
    sleep(0.3);

    // GET /api/events/platform-stats — статистика платформы
    res = http.get(`${BASE_URL}/api/events/platform-stats`);
    check(res, { 'platform stats 200': (r) => r.status === 200 });
    catalogLatency.add(res.timings.duration);

  });

  // Пауза между итерациями — имитирует время чтения/просмотра страницы
  sleep(1 + Math.random() * 2);
}

// ─── Сценарий 2: Аутентификация и личный кабинет (20%) ────────────────────────
// Имитирует зарегистрированного пользователя: вход, просмотр профиля, избранное.

export function authScenario() {
  group('auth: login + profile', () => {

    // POST /api/auth/login — вход в систему
    const loginRes = http.post(`${BASE_URL}/api/auth/login`,
      JSON.stringify({ loginOrEmail: 'admin_local', password: '123456' }),
      { headers: { 'Content-Type': 'application/json' } }
    );
    const loginOk = check(loginRes, {
      'login status 200':    (r) => r.status === 200,
      'login returns token': (r) => !!r.json('token'),
    });
    profileLatency.add(loginRes.timings.duration);
    authErrors.add(!loginOk);

    if (!loginOk) {
      sleep(1);
      return;
    }

    const token = loginRes.json('token');
    const headers = authHeaders(token);

    sleep(0.5);

    // GET /api/users/me — данные текущего пользователя
    let res = http.get(`${BASE_URL}/api/users/me`, headers);
    check(res, { 'profile status 200': (r) => r.status === 200 });
    profileLatency.add(res.timings.duration);
    sleep(0.5);

    // GET /api/favorites/my — список избранного текущего пользователя
    res = http.get(`${BASE_URL}/api/favorites/my`, headers);
    check(res, { 'favorites status 200': (r) => r.status === 200 });
    profileLatency.add(res.timings.duration);
    sleep(0.3);

    // GET /api/notifications — уведомления
    res = http.get(`${BASE_URL}/api/notifications`, headers);
    check(res, { 'notifications 200 or 403': (r) => r.status === 200 || r.status === 403 });
    profileLatency.add(res.timings.duration);

  });

  sleep(1 + Math.random() * 3);
}

// ─── Сценарий 3: Оформление заказов и записей (10%) ───────────────────────────
// Имитирует пользователя, который записывается на мероприятие — самые тяжёлые операции.

export function orderScenario() {
  group('orders: registration flow', () => {

    // Сначала входим
    const loginRes = http.post(`${BASE_URL}/api/auth/login`,
      JSON.stringify({ loginOrEmail: 'admin_local', password: '123456' }),
      { headers: { 'Content-Type': 'application/json' } }
    );

    if (loginRes.status !== 200) {
      orderErrors.add(1);
      sleep(2);
      return;
    }

    const token = loginRes.json('token');
    const headers = authHeaders(token);

    sleep(0.5);

    // GET /api/events — смотрим список для выбора
    let res = http.get(`${BASE_URL}/api/events`, headers);
    check(res, { 'order flow: events 200': (r) => r.status === 200 });
    orderLatency.add(res.timings.duration);
    sleep(1); // пользователь выбирает мероприятие

    // GET /api/events/38 — смотрим детальную страницу тестового мероприятия
    res = http.get(`${BASE_URL}/api/events/38`, headers);
    check(res, { 'order flow: event detail': (r) => r.status === 200 || r.status === 404 });
    orderLatency.add(res.timings.duration);
    sleep(0.8);

    // GET /api/sessions?eventId=38 — проверяем доступные сеансы
    res = http.get(`${BASE_URL}/api/sessions?eventId=38`, headers);
    const sessionsOk = check(res, {
      'order flow: sessions': (r) => r.status === 200 || r.status === 404,
    });
    orderLatency.add(res.timings.duration);
    orderErrors.add(!sessionsOk);

    // Запись на сеанс 53 с билетом 66 (безлимитный тестовый сеанс, quota=10000)
    {
      const LOAD_TEST_SESSION_ID = 53;
      const LOAD_TEST_TICKET_TYPE_ID = 66;

      res = http.post(
        `${BASE_URL}/api/orders`,
        JSON.stringify({
          sessionId: LOAD_TEST_SESSION_ID,
          items: [{ ticketTypeId: LOAD_TEST_TICKET_TYPE_ID, quantity: 1 }],
          paymentProvider: 'yookassa',
        }),
        headers
      );
      const regOk = check(res, {
        'order created 200/201': (r) => r.status === 200 || r.status === 201,
        'order not 500': (r) => r.status !== 500,
      });
      orderLatency.add(res.timings.duration);
      orderErrors.add(!regOk);
      sleep(0.5);
    }

    // GET /api/orders/my — список своих заказов
    res = http.get(`${BASE_URL}/api/orders/my`, headers);
    check(res, { 'my orders 200': (r) => r.status === 200 || r.status === 403 });
    orderLatency.add(res.timings.duration);

  });

  sleep(2 + Math.random() * 3);
}
