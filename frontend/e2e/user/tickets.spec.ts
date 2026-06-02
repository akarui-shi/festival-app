/**
 * Тесты страницы «Мои билеты» /tickets
 *
 * /tickets — защищённый маршрут со списком регистраций пользователя.
 * Старый путь /registrations редиректит на /tickets (алиас).
 *
 * Проверяем: защиту маршрута, доступность для авторизованного и редиректы.
 */
import { test, expect } from '@playwright/test';
import { STORAGE_STATE } from '../auth-state.js';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('festival.selectedCityId', '1');
  });
});

test.describe('Билеты — без авторизации', () => {

  test('перенаправляет на логин', async ({ page }) => {
    // /tickets защищён ProtectedRoute — неавторизованный пользователь
    // должен быть перенаправлен на /login.
    await page.goto('/tickets');
    await expect(page).toHaveURL('/login', { timeout: 8_000 });
  });

  test('/registrations редиректит на /tickets (который редиректит на логин)', async ({ page }) => {
    // В App.tsx: <Route path="/registrations" element={<Navigate to="/tickets" replace />} />
    // Сначала редирект на /tickets, затем ProtectedRoute перебрасывает на /login.
    // Итоговый URL — /login.
    await page.goto('/registrations');
    await expect(page).toHaveURL('/login', { timeout: 8_000 });
  });

});

test.describe('Билеты — авторизованный пользователь', () => {

  test.use({ storageState: STORAGE_STATE.admin });

  test('страница билетов доступна', async ({ page }) => {
    // Авторизованный пользователь должен попасть на /tickets.
    await page.goto('/tickets');
    await expect(page).not.toHaveURL('/login');
    await page.waitForLoadState('networkidle');
  });

  test('страница содержит контент (список или пустое состояние)', async ({ page }) => {
    // Страница корректна в двух вариантах:
    // — у пользователя нет регистраций → пустое состояние
    // — есть регистрации → список билетов
    // В любом случае body не должен быть пустым.
    await page.goto('/tickets');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('/registrations редиректит на /tickets', async ({ page }) => {
    // Для авторизованного пользователя: /registrations → /tickets (и остаёмся там).
    await page.goto('/registrations');
    await expect(page).toHaveURL('/tickets', { timeout: 5_000 });
  });

});
