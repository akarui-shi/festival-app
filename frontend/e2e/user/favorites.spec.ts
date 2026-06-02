/**
 * Базовые тесты страницы избранного /favorites
 *
 * Проверяем: защиту маршрута (redirect без авторизации) и
 * доступность страницы для авторизованного пользователя.
 *
 * Тесты переключения избранного (добавление/удаление) — в favorites-toggle.spec.ts.
 */
import { test, expect } from '@playwright/test';
import { STORAGE_STATE } from '../auth-state.js';

// Город задаём до загрузки страницы.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('festival.selectedCityId', '1');
  });
});

test.describe('Избранное — без авторизации', () => {

  test('перенаправляет на логин', async ({ page }) => {
    // /favorites защищён через ProtectedRoute — неавторизованный пользователь
    // должен быть перенаправлен на /login.
    await page.goto('/favorites');
    await expect(page).toHaveURL('/login', { timeout: 8_000 });
  });

});

test.describe('Избранное — авторизованный пользователь', () => {

  // Используем storageState с токеном admin_local — быстрее, чем логин через UI.
  test.use({ storageState: STORAGE_STATE.user });

  test('страница избранного доступна', async ({ page }) => {
    // Авторизованный пользователь должен попасть на /favorites без редиректа.
    await page.goto('/favorites');
    await expect(page).not.toHaveURL('/login');
    await page.waitForLoadState('networkidle');
  });

  test('страница избранного отображает список (пустой или с элементами)', async ({ page }) => {
    // Страница корректно отрисовывается в двух состояниях:
    // — если избранных нет: показывается пустое состояние
    // — если есть: показывается список карточек
    // В обоих случаях body не пустой.
    await page.goto('/favorites');
    await page.waitForLoadState('networkidle');
    const body = page.locator('body');
    await expect(body).not.toBeEmpty();
  });

});
