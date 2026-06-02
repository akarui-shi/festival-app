/**
 * Тесты дополнительных страниц админ-панели
 *
 * Покрываем страницы, которые не вошли в основной moderation.spec.ts:
 * — /admin/users — управление пользователями
 * — /admin/directories — справочники (города, категории и т.д.)
 * — /admin/participants — управление участниками/артистами
 *
 * Для каждой страницы проверяем: доступность для ADMIN и отсутствие JS-ошибок.
 * Отдельно проверяем защиту маршрутов от неавторизованного доступа.
 */
import { test, expect } from '@playwright/test';
import { STORAGE_STATE } from '../auth-state.js';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('festival.selectedCityId', '1');
  });
});

test.describe('Админ — управление пользователями', () => {

  test.use({ storageState: STORAGE_STATE.admin });

  test('/admin/users открывается и содержит контент', async ({ page }) => {
    // Страница со списком всех пользователей приложения.
    await page.goto('/admin/users');
    await expect(page).not.toHaveURL('/login');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('/admin/users не вызывает JS-ошибок', async ({ page }) => {
    // Слушаем pageerror — это необработанные исключения в контексте страницы.
    // Страница с таблицей пользователей не должна бросать JS-ошибок.
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/admin/users');
    await page.waitForLoadState('networkidle');

    // Фильтруем браузерный шум — ResizeObserver и ошибки сторонних скриптов.
    const realErrors = errors.filter(
      (e) => !e.includes('ResizeObserver') && !e.includes('Non-Error'),
    );
    expect(realErrors).toHaveLength(0);
  });

});

test.describe('Админ — справочники', () => {

  test.use({ storageState: STORAGE_STATE.admin });

  test('/admin/directories открывается', async ({ page }) => {
    // Справочники — города, категории мероприятий, типы участников и т.д.
    await page.goto('/admin/directories');
    await expect(page).not.toHaveURL('/login');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('/admin/directories не вызывает JS-ошибок', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/admin/directories');
    await page.waitForLoadState('networkidle');

    const realErrors = errors.filter(
      (e) => !e.includes('ResizeObserver') && !e.includes('Non-Error'),
    );
    expect(realErrors).toHaveLength(0);
  });

});

test.describe('Админ — участники', () => {

  test.use({ storageState: STORAGE_STATE.admin });

  test('/admin/participants открывается', async ({ page }) => {
    // Страница со списком участников/артистов мероприятий.
    await page.goto('/admin/participants');
    await expect(page).not.toHaveURL('/login');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('/admin/artists редиректит на /admin/participants', async ({ page }) => {
    // В App.tsx есть алиас: /admin/artists → <Navigate to="/admin/participants" replace />
    // Проверяем, что редирект работает (старые закладки не ломаются).
    await page.goto('/admin/artists');
    await expect(page).toHaveURL('/admin/participants', { timeout: 5_000 });
  });

});

test.describe('Админ — доступ запрещён без авторизации', () => {

  // Этот блок намеренно НЕ использует storageState — тесты от неавторизованного пользователя.

  test('/admin/users перенаправляет на логин', async ({ page }) => {
    // Без авторизации все /admin/* маршруты должны перенаправлять на /login.
    await page.goto('/admin/users');
    await expect(page).toHaveURL('/login', { timeout: 8_000 });
  });

  test('/admin/directories перенаправляет на логин', async ({ page }) => {
    await page.goto('/admin/directories');
    await expect(page).toHaveURL('/login', { timeout: 8_000 });
  });

});
