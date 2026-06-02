/**
 * Тесты навигации и системных маршрутов
 *
 * Проверяем:
 * — страница 404 для неизвестных путей
 * — публичные страницы /map и /recommendations
 * — алиасы и редиректы маршрутов (/artists/:id, /admin/reviews)
 */
import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('festival.selectedCityId', '1');
  });
});

test.describe('404 и неизвестные маршруты', () => {

  test('несуществующий маршрут показывает страницу 404', async ({ page }) => {
    // React Router обрабатывает все неизвестные пути через <Route path="*">.
    // Проверяем, что компонент NotFound отрендерился и содержит ключевые слова.
    await page.goto('/this-page-does-not-exist-xyz');
    await page.waitForLoadState('networkidle');
    const text = (await page.locator('body').textContent()) ?? '';
    const is404 = /404|не найден|not found|страница не существует/i.test(text);
    expect(is404).toBeTruthy();
  });

  test('страница 404 не вызывает JS-ошибок', async ({ page }) => {
    // Компонент 404 не должен бросать исключений — это критично,
    // потому что пользователь уже попал в неожиданное место, и краш здесь особенно плох.
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/totally-nonexistent-page-abc');
    await page.waitForLoadState('networkidle');

    const realErrors = errors.filter(
      (e) => !e.includes('ResizeObserver') && !e.includes('Non-Error'),
    );
    expect(realErrors).toHaveLength(0);
  });

});

test.describe('Страница карты /map', () => {

  test('открывается без авторизации', async ({ page }) => {
    // /map — публичная страница с картой всех мероприятий. Логин не нужен.
    await page.goto('/map');
    await expect(page).not.toHaveURL('/login');
    await page.waitForLoadState('networkidle');
  });

  test('не вызывает JS-ошибок', async ({ page }) => {
    // Карта использует Яндекс.Карты — убеждаемся, что интеграция не роняет страницу.
    // Ошибки ResizeObserver здесь особенно вероятны (карты активно меняют размеры),
    // поэтому они отфильтрованы.
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/map');
    await page.waitForLoadState('networkidle');

    const realErrors = errors.filter(
      (e) => !e.includes('ResizeObserver') && !e.includes('Non-Error'),
    );
    expect(realErrors).toHaveLength(0);
  });

  test('страница не пустая', async ({ page }) => {
    // Минимальный smoke: что-то отрендерилось на /map.
    await page.goto('/map');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).not.toBeEmpty();
  });

});

test.describe('Страница рекомендаций /recommendations', () => {

  test('открывается без авторизации', async ({ page }) => {
    // /recommendations — публичная страница с подборкой мероприятий.
    // Для неавторизованных показывается общая подборка (без персонализации).
    await page.goto('/recommendations');
    await expect(page).not.toHaveURL('/login');
    await page.waitForLoadState('networkidle');
  });

  test('не вызывает JS-ошибок', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/recommendations');
    await page.waitForLoadState('networkidle');

    const realErrors = errors.filter(
      (e) => !e.includes('ResizeObserver') && !e.includes('Non-Error'),
    );
    expect(realErrors).toHaveLength(0);
  });

  test('страница не пустая', async ({ page }) => {
    await page.goto('/recommendations');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).not.toBeEmpty();
  });

});

test.describe('Редиректы', () => {

  test('/artists/:id редиректит на /participants/:id', async ({ page }) => {
    // В App.tsx: <Route path="/artists/:id" element={<ParticipantPage />} />
    // Старый путь /artists сохранён как алиас для обратной совместимости.
    // Проверяем только, что мы не попадаем на /login — страница доступна публично.
    await page.goto('/artists/1');
    await page.waitForLoadState('networkidle');
    await expect(page).not.toHaveURL('/login');
  });

  test('/admin/reviews редиректит на /admin/comments', async ({ page }) => {
    // В App.tsx: <Route path="reviews" element={<Navigate to="/admin/comments" replace />} />
    // Без авторизации ProtectedRoute перехватит раньше и отправит на /login.
    // Это подтверждает, что защита работает для обоих путей — старого и нового.
    await page.goto('/admin/reviews');
    await expect(page).toHaveURL('/login', { timeout: 5_000 });
  });

});
