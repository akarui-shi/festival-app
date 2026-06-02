/**
 * Тесты детальной страницы мероприятия /events/:id
 *
 * Проверяем поведение для двух ролей:
 * — гость (не авторизован): видит кнопку "Войти для записи", НЕ видит "В избранное"
 * — авторизованный: видит кнопку "В избранное", может читать описание и отзывы
 *
 * Многие тесты зависят от наличия мероприятий в БД.
 * Если БД пустая — тесты пропускаются через test.skip(), а не падают.
 */
import { test, expect } from '@playwright/test';
import { STORAGE_STATE } from '../auth-state.js';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('festival.selectedCityId', '1');
  });
});

/**
 * Вспомогательная функция: заходит на /events и возвращает href первой карточки.
 * Возвращает null, если в каталоге нет ни одного мероприятия.
 * Используется в каждом тесте, чтобы не хардкодить конкретный ID.
 */
async function getFirstEventHref(page: import('@playwright/test').Page): Promise<string | null> {
  await page.goto('/events');
  await page.waitForLoadState('networkidle');
  const links = page.locator('a[href^="/events/"]');
  const count = await links.count();
  if (count === 0) return null;
  return links.first().getAttribute('href');
}

// ─── Гость (без авторизации) ───────────────────────────────────────────────

test.describe('Страница мероприятия — без авторизации', () => {

  test('открывается без редиректа на логин', async ({ page }) => {
    // Детальная страница мероприятия публичная — гость должен её видеть.
    const href = await getFirstEventHref(page);
    if (!href) { test.skip(true, 'Нет мероприятий в БД'); return; }

    await page.goto(href);
    await expect(page).not.toHaveURL('/login');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('показывает название мероприятия в заголовке', async ({ page }) => {
    // h1 с непустым текстом — минимальный признак того, что страница загрузилась корректно.
    const href = await getFirstEventHref(page);
    if (!href) { test.skip(true, 'Нет мероприятий в БД'); return; }

    await page.goto(href);
    await page.waitForLoadState('networkidle');
    const h1 = page.locator('h1').first();
    await expect(h1).toBeVisible();
    const text = await h1.textContent();
    expect(text?.trim().length).toBeGreaterThan(0);
  });

  test('кнопка "Войти для записи" показывается для гостя', async ({ page }) => {
    // Гость не может записаться, поэтому вместо кнопки "Записаться" рендерится
    // ссылка-кнопка "Войти для записи" → /login.
    // Проверяем, что CTA для неавторизованных пользователей присутствует.
    const href = await getFirstEventHref(page);
    if (!href) { test.skip(true, 'Нет мероприятий в БД'); return; }

    await page.goto(href);
    await page.waitForLoadState('networkidle');
    const loginBtn = page.getByRole('link', { name: /войти для записи/i });
    await expect(loginBtn).toBeVisible();
  });

  test('кнопка "В избранное" не показывается для гостя', async ({ page }) => {
    // Функция избранного доступна только авторизованным — гостю кнопку не показываем,
    // чтобы не вводить в заблуждение. Убеждаемся, что кнопки нет (not.toBeVisible).
    const href = await getFirstEventHref(page);
    if (!href) { test.skip(true, 'Нет мероприятий в БД'); return; }

    await page.goto(href);
    await page.waitForLoadState('networkidle');
    const favBtn = page.getByRole('button', { name: /в избранное/i });
    await expect(favBtn).not.toBeVisible();
  });

  test('ссылка "Все мероприятия" ведёт на каталог', async ({ page }) => {
    // На детальной странице есть breadcrumb-ссылка "← Все мероприятия".
    // Кликаем и убеждаемся, что попали на /events.
    const href = await getFirstEventHref(page);
    if (!href) { test.skip(true, 'Нет мероприятий в БД'); return; }

    await page.goto(href);
    await page.waitForLoadState('networkidle');
    const backLink = page.getByRole('link', { name: /все мероприятия/i });
    await expect(backLink).toBeVisible();
    await backLink.click();
    await expect(page).toHaveURL('/events');
  });

  test('секция отзывов присутствует на странице', async ({ page }) => {
    // Блок отзывов рендерится всегда — даже если отзывов пока нет, показывается
    // заглушка "Пока нет отзывов". Проверяем, что заголовок "Отзывы" есть.
    const href = await getFirstEventHref(page);
    if (!href) { test.skip(true, 'Нет мероприятий в БД'); return; }

    await page.goto(href);
    await page.waitForLoadState('networkidle');
    const reviewsHeading = page.getByRole('heading', { name: /отзывы/i });
    await expect(reviewsHeading).toBeVisible();
  });

  test('несуществующее мероприятие показывает сообщение об ошибке', async ({ page }) => {
    // ID 999999999 заведомо не существует — API вернёт 404.
    // Приложение должно поймать ошибку и показать сообщение, а не белый экран.
    await page.goto('/events/999999999');
    await page.waitForLoadState('networkidle');
    const text = (await page.locator('body').textContent()) ?? '';
    const hasError = /404|не найден|not found|ошибка|мероприятие не найдено/i.test(text);
    expect(hasError).toBeTruthy();
  });

});

// ─── Авторизованный пользователь ───────────────────────────────────────────

test.describe('Страница мероприятия — авторизованный пользователь', () => {

  // storageState — заранее сохранённый localStorage с токеном admin_local.
  // Это быстрее, чем логиниться через UI в каждом тесте.
  test.use({ storageState: STORAGE_STATE.admin });

  test('кнопка "В избранное" доступна авторизованному пользователю', async ({ page }) => {
    // Авторизованный пользователь видит кнопку "В избранное".
    // Это обратная проверка к тесту выше (для гостя кнопки не было).
    const href = await getFirstEventHref(page);
    if (!href) { test.skip(true, 'Нет мероприятий в БД'); return; }

    await page.goto(href);
    await page.waitForLoadState('networkidle');
    const favBtn = page.getByRole('button', { name: /в избранное/i });
    await expect(favBtn).toBeVisible();
  });

  test('секция "Описание" присутствует', async ({ page }) => {
    // Блок описания мероприятия должен быть виден любому пользователю.
    const href = await getFirstEventHref(page);
    if (!href) { test.skip(true, 'Нет мероприятий в БД'); return; }

    await page.goto(href);
    await page.waitForLoadState('networkidle');
    const descHeading = page.getByRole('heading', { name: /описание/i });
    await expect(descHeading).toBeVisible();
  });

});
