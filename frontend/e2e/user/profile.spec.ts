/**
 * Базовые тесты страницы профиля /profile
 *
 * Проверяем: защиту маршрута (redirect без авторизации),
 * доступность для авторизованного пользователя и отображение его данных.
 *
 * Детальные тесты формы редактирования — в profile-edit.spec.ts.
 */
import { test, expect } from '@playwright/test';
import { STORAGE_STATE } from '../auth-state.js';

// Город задаём до загрузки, иначе модальное окно заблокирует страницу профиля.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('festival.selectedCityId', '1');
  });
});

test.describe('Профиль пользователя', () => {

  // Все тесты в этом блоке используют сохранённый storageState admin_local.
  // storageState — это файл с содержимым localStorage (токен авторизации),
  // который был создан в global.setup.ts. Браузер его подгружает до goto().
  test.use({ storageState: STORAGE_STATE.admin });

  test('страница профиля доступна авторизованному пользователю', async ({ page }) => {
    // Переходим на /profile и убеждаемся, что нас не выкинуло на /login.
    // waitForLoadState('networkidle') дожидается загрузки данных пользователя с API.
    await page.goto('/profile');
    await expect(page).not.toHaveURL('/login');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('отображает данные текущего пользователя', async ({ page }) => {
    // На странице профиля должны быть видны данные текущего пользователя.
    // Проверяем, что в тексте страницы есть логин или имя admin_local.
    await page.goto('/profile');
    await page.waitForLoadState('networkidle');
    const text = await page.locator('body').textContent();
    expect(text).toMatch(/admin_local|admin/i);
  });

});

test.describe('Профиль — без авторизации', () => {

  test('перенаправляет на логин', async ({ page }) => {
    // /profile — защищённый маршрут. Без авторизации ProtectedRoute
    // делает <Navigate to="/login">, поэтому мы должны оказаться на /login.
    // Даём 8 секунд — редирект может быть не мгновенным, если AuthContext
    // делает запрос к API перед принятием решения.
    await page.goto('/profile');
    await expect(page).toHaveURL('/login', { timeout: 8_000 });
  });

});
