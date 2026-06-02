/**
 * Тесты раздела публикаций
 *
 * Список /publications — публичная страница со статьями и анонсами.
 * Детальная /publications/:id — страница конкретной публикации.
 *
 * Тесты навигации по карточкам пропускаются, если в БД нет публикаций.
 */
import { test, expect } from '@playwright/test';

// Город задаём до загрузки — убираем модальное окно выбора города.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('festival.selectedCityId', '1');
  });
});

test.describe('Список публикаций', () => {

  test('страница открывается без авторизации', async ({ page }) => {
    // Публикации — публичный раздел, доступный без логина.
    // Проверяем отсутствие редиректа на /login.
    await page.goto('/publications');
    await expect(page).not.toHaveURL('/login');
    await page.waitForLoadState('networkidle');
  });

  test('содержит заголовок "Публикации"', async ({ page }) => {
    // На странице должен быть h1/h2 с текстом "Публикации" — признак корректного рендера.
    await page.goto('/publications');
    await page.waitForLoadState('networkidle');
    const heading = page.getByRole('heading', { name: /публикации/i }).first();
    await expect(heading).toBeVisible();
  });

  test('страница не пустая', async ({ page }) => {
    // Минимальный smoke: страница не является белым экраном.
    await page.goto('/publications');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('карточки публикаций ведут на страницу деталей', async ({ page }) => {
    // Если в БД есть публикации, кликаем на первую карточку и
    // проверяем, что URL сменился на /publications/:id.
    await page.goto('/publications');
    await page.waitForLoadState('networkidle');

    const pubLinks = page.locator('a[href^="/publications/"]');
    const count = await pubLinks.count();

    if (count === 0) {
      // Пустая БД — тест не может проверить навигацию, пропускаем.
      test.skip(true, 'Нет публикаций в БД — пропускаем тест навигации');
      return;
    }

    const href = await pubLinks.first().getAttribute('href');
    await pubLinks.first().click();
    await expect(page).toHaveURL(href!);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).not.toBeEmpty();
  });

});

test.describe('Детальная страница публикации', () => {

  test('несуществующая публикация не вызывает JS-ошибок', async ({ page }) => {
    // ID 999999999 заведомо не существует.
    // Приложение должно корректно обработать 404 от API — без краша всей страницы.
    // Слушаем pageerror (необработанные исключения), а не только консоль.
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/publications/999999999');
    await page.waitForLoadState('networkidle');

    const realErrors = errors.filter(
      (e) => !e.includes('ResizeObserver') && !e.includes('Non-Error'),
    );
    expect(realErrors).toHaveLength(0);
  });

  test('детальная страница открывается если публикация существует', async ({ page }) => {
    // Динамически находим ссылку через список, чтобы не зависеть от конкретного ID в БД.
    await page.goto('/publications');
    await page.waitForLoadState('networkidle');

    const pubLinks = page.locator('a[href^="/publications/"]');
    const count = await pubLinks.count();
    if (count === 0) {
      test.skip(true, 'Нет публикаций в БД');
      return;
    }

    const href = await pubLinks.first().getAttribute('href');
    await page.goto(href!);
    await page.waitForLoadState('networkidle');
    // Страница публикации публичная — редиректа на /login быть не должно.
    await expect(page).not.toHaveURL('/login');
    await expect(page.locator('body')).not.toBeEmpty();
  });

});
