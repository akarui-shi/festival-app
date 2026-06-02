/**
 * Тесты страницы входа /login
 *
 * Проверяем: отображение формы, валидацию ошибок, успешный вход и навигацию.
 * Тестовый пользователь admin_local / 123456 создаётся Flyway-миграцией V2
 * и всегда присутствует в базе.
 */
import { test, expect } from '@playwright/test';

// addInitScript выполняется ДО загрузки страницы — это важно:
// если записать в localStorage после goto(), модальное окно выбора города
// уже успеет появиться и заблокирует клики по форме.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('festival.selectedCityId', '1');
  });
  await page.goto('/login');
});

test.describe('Страница входа', () => {

  test('отображает форму входа', async ({ page }) => {
    // Проверяем, что все три ключевых элемента формы отрендерились.
    // Используем id-селекторы (#loginOrEmail, #password) — они уникальны на странице.
    // Для кнопки берём button[type="submit"], а не getByText("Войти"),
    // потому что на странице есть ещё кнопки OAuth "Войти через Google/Яндекс" —
    // Playwright в strict-mode упал бы на неоднозначном матчере.
    await expect(page.locator('#loginOrEmail')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('неверный пароль показывает ошибку', async ({ page }) => {
    // Вводим правильный логин, но неверный пароль.
    // После клика бэкенд вернёт 401, фронт покажет toast/banner с классом "destructive".
    // Убеждаемся, что: 1) остались на /login (не было редиректа),
    // 2) на странице есть элемент с классом destructive (красный баннер ошибки).
    await page.locator('#loginOrEmail').fill('admin_local');
    await page.locator('#password').fill('wrongpassword');
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL('/login');
    await expect(page.locator('[class*="destructive"]').first()).toBeVisible();
  });

  test('несуществующий пользователь показывает ошибку', async ({ page }) => {
    // Логин no_such_user_xyz_e2e заведомо не существует в БД.
    // Ожидаем, что после отправки формы мы остаёмся на /login.
    // Отдельно не проверяем текст ошибки — достаточно, что редиректа нет.
    await page.locator('#loginOrEmail').fill('no_such_user_xyz_e2e');
    await page.locator('#password').fill('Pass1234');
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL('/login');
  });

  test('успешный вход перенаправляет с /login', async ({ page }) => {
    // Вводим верные credentials и проверяем, что приложение ушло с /login.
    // Не проверяем, на какой именно URL попали — это зависит от настроек
    // редиректа после входа и может меняться. Главное — не /login.
    await page.locator('#loginOrEmail').fill('admin_local');
    await page.locator('#password').fill('123456');
    await page.locator('button[type="submit"]').click();
    await expect(page).not.toHaveURL('/login', { timeout: 10_000 });
  });

  test('есть ссылка на регистрацию', async ({ page }) => {
    // На странице входа должна быть ссылка на /register.
    // Ищем по точному тексту "Зарегистрироваться" через роль link.
    await expect(page.getByRole('link', { name: 'Зарегистрироваться' })).toBeVisible();
  });

});
