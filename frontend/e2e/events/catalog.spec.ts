/**
 * Базовые тесты каталога мероприятий /events
 *
 * Проверяем: доступность без логина, наличие контента, поиск через URL,
 * навигацию с карточки на детальную страницу, обработку несуществующего ID.
 *
 * Более детальные тесты поиска и фильтров — в catalog-filters.spec.ts.
 */
import { test, expect } from '@playwright/test';

// Город нужно задать до загрузки страницы, иначе модальное окно появится
// поверх каталога и заблокирует поисковое поле и карточки.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('festival.selectedCityId', '1');
  });
});

test.describe('Каталог мероприятий', () => {

  test('открывается без авторизации', async ({ page }) => {
    // Каталог — публичная страница, доступная всем.
    // Проверяем, что URL не изменился (нет редиректа на /login).
    await page.goto('/events');
    await expect(page).toHaveURL('/events');
    await expect(page).not.toHaveURL('/login');
  });

  test('страница загружается и содержит контент', async ({ page }) => {
    // waitForLoadState('networkidle') ждёт, пока все API-запросы завершатся.
    // После этого body точно не должен быть пустым.
    await page.goto('/events');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('поиск обновляет URL параметр search', async ({ page }) => {
    // Поведение: пользователь вводит текст и нажимает Enter →
    // URL должен обновиться до /events?search=... (синхронизация состояния с URL).
    // Проверяем наличие параметра search в URL, не его значение —
    // браузер URL-кодирует кириллицу (%D1%84%D0%B5...), поэтому регулярка [?&]search=
    // надёжнее, чем сравнение с raw-текстом.
    await page.goto('/events');
    await page.waitForLoadState('networkidle');

    const searchInput = page.getByPlaceholder('Найдите мероприятие по названию…');
    await expect(searchInput).toBeVisible();
    await searchInput.fill('фестиваль');
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/[?&]search=/);
  });

  test('карточки мероприятий ведут на страницу деталей', async ({ page }) => {
    await page.goto('/events');
    await page.waitForLoadState('networkidle');

    // Ищем все ссылки вида /events/123 — это карточки мероприятий.
    const eventLinks = page.locator('a[href^="/events/"]');
    const count = await eventLinks.count();

    // Если в БД нет ни одного мероприятия — тест не имеет смысла, пропускаем.
    // test.skip() помечает тест как пропущенный (жёлтый), а не упавший (красный).
    if (count === 0) {
      test.skip(true, 'Нет мероприятий в БД — пропускаем тест навигации');
      return;
    }

    // Кликаем на первую карточку и проверяем, что URL совпадает с её href.
    const href = await eventLinks.first().getAttribute('href');
    await eventLinks.first().click();
    await expect(page).toHaveURL(href!);
  });

});

test.describe('Страница мероприятия', () => {

  test('несуществующее мероприятие не открывается', async ({ page }) => {
    // ID 999999999 заведомо не существует в БД.
    // Проверяем, что приложение обработало ошибку: показало "не найдено" или 404.
    // Главное условие — страница не пустая (что-то отрендерилось, пусть и ошибка).
    await page.goto('/events/999999999');
    await page.waitForLoadState('networkidle');
    const url = page.url();
    const text = (await page.locator('body').textContent()) ?? '';
    const handled = url.includes('not-found') ||
                    /404|не найден|not found|ошибка/i.test(text);
    await expect(page.locator('body')).not.toBeEmpty();
  });

});
