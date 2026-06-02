/**
 * Global setup — запускается ОДИН РАЗ перед всеми тестами.
 *
 * Что делает:
 * 1. Запрашивает JWT-токен у бэкенда (POST /api/auth/login)
 * 2. Записывает токен в localStorage браузера
 * 3. Сохраняет состояние localStorage в JSON-файл (storageState)
 *
 * Зачем это нужно:
 * Тесты, которым нужна авторизация, загружают сохранённый storageState
 * вместо того, чтобы каждый раз проходить через UI формы логина.
 * Это в 5-10 раз быстрее и устраняет зависимость от формы входа.
 *
 * Файлы сохраняются в e2e/.auth/ (папка в .gitignore — токены не коммитятся).
 *
 * Требует: запущенный бэкенд на localhost:8080,
 * пользователь admin_local / 123456 засеян миграцией Flyway V2.
 */
import { test as setup, expect } from '@playwright/test';
import { STORAGE_STATE } from './auth-state.js';

export { STORAGE_STATE };

const BACKEND = 'http://localhost:8080';

/**
 * Запрашивает JWT-токен у бэкенда.
 * Если логин не удался (не 200) — тест упадёт с понятным сообщением.
 */
async function getToken(loginOrEmail: string, password: string): Promise<string> {
  const res = await fetch(`${BACKEND}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ loginOrEmail, password }),
  });
  expect(res.status, `Login failed for ${loginOrEmail}`).toBe(200);
  const data = await res.json();
  return data.token;
}

/**
 * Открывает главную страницу и записывает токен в localStorage.
 * Нужно сначала открыть хоть какую-то страницу домена, иначе
 * localStorage будет недоступен (Same-Origin Policy).
 */
async function injectToken(page: Parameters<typeof setup.use>[0] extends never ? never : any, token: string) {
  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');
  await page.evaluate((t: string) => localStorage.setItem('auth_token', t), token);
}

// ─── Сохраняем состояние авторизации admin ────────────────────────────────
// Используется в тестах с test.use({ storageState: STORAGE_STATE.admin })
setup('save admin auth state', async ({ page }) => {
  const token = await getToken('admin_local', '123456');
  await injectToken(page, token);
  // storageState() сохраняет весь localStorage (и cookies) в JSON-файл.
  // При следующем запуске Playwright загрузит этот файл в браузер до первого goto().
  await page.context().storageState({ path: STORAGE_STATE.admin });
});

// ─── Сохраняем состояние авторизации обычного пользователя ───────────────
// Сейчас используем того же admin_local — для тестов, которым нужен
// "любой авторизованный пользователь" (избранное, профиль и т.д.).
// Если понадобится отдельный пользователь с ролью USER/RESIDENT —
// добавь его в Flyway V2 и укажи credentials здесь.
setup('save user auth state', async ({ page }) => {
  const token = await getToken('admin_local', '123456');
  await injectToken(page, token);
  await page.context().storageState({ path: STORAGE_STATE.user });
});
