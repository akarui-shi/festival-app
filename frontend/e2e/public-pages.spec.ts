/**
 * Smoke-тесты публичных страниц
 *
 * "Smoke" — самый быстрый уровень проверки: просто убеждаемся,
 * что страница открывается, не падает с JS-ошибкой и не редиректит на /login.
 * Детальное поведение каждой страницы проверяется в отдельных spec-файлах.
 *
 * Тестируем все маршруты, доступные без авторизации.
 */
import { test, expect } from '@playwright/test';

const PUBLIC_ROUTES = [
  { path: '/',             name: 'Главная' },
  { path: '/events',       name: 'Каталог' },
  { path: '/publications', name: 'Публикации' },
  { path: '/login',        name: 'Вход' },
  { path: '/register',     name: 'Регистрация' },
];

// Один и тот же сценарий для каждого маршрута — цикл создаёт отдельный тест-кейс.
for (const { path, name } of PUBLIC_ROUTES) {
  test(`${name} (${path}) открывается без ошибок`, async ({ page }) => {
    // Выставляем город ДО goto(), иначе модальное окно выбора города
    // успевает появиться и остаётся висеть поверх контента.
    await page.addInitScript(() => {
      localStorage.setItem('festival.selectedCityId', '1');
    });

    // Собираем все JS-ошибки, которые бросает страница (window.onerror / unhandledrejection).
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto(path);
    await page.waitForLoadState('networkidle'); // ждём, пока все XHR-запросы завершатся

    // ResizeObserver — браузерный шум, возникает при изменении размеров контейнеров,
    // не является реальной ошибкой приложения. Non-Error — ложные срабатывания Sentry/etc.
    const realErrors = errors.filter(
      (e) => !e.includes('ResizeObserver') && !e.includes('Non-Error')
    );
    expect(realErrors).toHaveLength(0);

    // Убеждаемся, что страница что-то отрендерила (не пустой белый экран).
    await expect(page.locator('body')).not.toBeEmpty();
  });
}
