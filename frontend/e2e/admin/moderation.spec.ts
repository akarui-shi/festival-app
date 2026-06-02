/**
 * Тесты основных страниц админ-панели
 *
 * Проверяем: защиту всего раздела /admin (редирект без авторизации),
 * доступность ключевых страниц для пользователя с ролью ADMIN.
 *
 * Дополнительные страницы (пользователи, справочники, участники) — в admin-pages.spec.ts.
 */
import { test, expect } from '@playwright/test';
import { STORAGE_STATE } from '../auth-state.js';

// Город задаём, чтобы не появлялось модальное окно выбора города.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('festival.selectedCityId', '1');
  });
});

test.describe('Админ-панель — без авторизации', () => {

  test('перенаправляет на логин', async ({ page }) => {
    // /admin/* защищён ProtectedRoute с roles=['ADMIN'].
    // Без авторизации — редирект на /login.
    await page.goto('/admin/dashboard');
    await expect(page).toHaveURL('/login', { timeout: 8_000 });
  });

});

test.describe('Админ-панель — авторизован как admin', () => {

  // admin_local имеет роль ADMIN — у него должен быть доступ ко всем /admin/* страницам.
  test.use({ storageState: STORAGE_STATE.admin });

  test('дашборд доступен', async ({ page }) => {
    // Главная страница админки — сводная статистика.
    await page.goto('/admin/dashboard');
    await expect(page).not.toHaveURL('/login');
    await page.waitForLoadState('networkidle');
  });

  test('страница мероприятий загружается', async ({ page }) => {
    // /admin/events — список мероприятий для модерации.
    await page.goto('/admin/events');
    await expect(page).not.toHaveURL('/login');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('страница публикаций загружается', async ({ page }) => {
    // /admin/publications — список публикаций для модерации.
    await page.goto('/admin/publications');
    await expect(page).not.toHaveURL('/login');
    await page.waitForLoadState('networkidle');
  });

  test('страница отзывов загружается', async ({ page }) => {
    // /admin/comments — список отзывов/комментариев для модерации.
    await page.goto('/admin/comments');
    await expect(page).not.toHaveURL('/login');
    await page.waitForLoadState('networkidle');
  });

});
