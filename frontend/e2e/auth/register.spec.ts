/**
 * Тесты страницы регистрации /register
 *
 * Проверяем: структуру формы, клиентскую валидацию (короткий пароль,
 * несовпадение паролей), успешную регистрацию и навигацию на /login.
 *
 * При успешной регистрации бэкенд НЕ логинит сразу — сначала нужно
 * подтвердить email, поэтому проверяем появление toast-уведомления о письме.
 */
import { test, expect } from '@playwright/test';

// Город выставляем до загрузки страницы, чтобы модальное окно выбора города
// не появилось поверх формы и не блокировало клики.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('festival.selectedCityId', '1');
  });
  await page.goto('/register');
});

test.describe('Страница регистрации', () => {

  test('отображает форму регистрации', async ({ page }) => {
    // Минимально проверяем, что ключевые поля формы есть на странице.
    // Кнопку ищем по type="submit", а не по тексту — на странице может быть
    // несколько кнопок с похожими надписями.
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('слишком короткий пароль блокирует отправку', async ({ page }) => {
    // Пароль "123" — меньше минимальных 6 символов.
    // Фронтенд должен поймать это сам (без запроса к бэкенду) и показать ошибку.
    // Признак успеха — остались на /register, т.е. форма не была отправлена.
    const suffix = Date.now(); // уникальный email, чтобы не столкнуться с уже существующим
    await page.locator('#firstName').fill('Тест');
    await page.locator('#lastName').fill('Юзер');
    await page.locator('#email').fill(`e2e_${suffix}@test.local`);
    await page.locator('#password').fill('123');
    await page.locator('#confirmPassword').fill('123');
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL('/register');
  });

  test('несовпадающие пароли блокируют отправку', async ({ page }) => {
    // password и confirmPassword разные — фронтенд должен показать ошибку
    // до отправки запроса на сервер. Проверяем, что остались на /register.
    const suffix = Date.now();
    await page.locator('#firstName').fill('Тест');
    await page.locator('#lastName').fill('Юзер');
    await page.locator('#email').fill(`e2e_${suffix}@test.local`);
    await page.locator('#password').fill('Pass1234');
    await page.locator('#confirmPassword').fill('Different9999');
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL('/register');
  });

  test('успешная регистрация показывает уведомление об email', async ({ page }) => {
    // Заполняем все поля корректными данными.
    // После отправки бэкенд создаёт пользователя и отправляет письмо подтверждения.
    // Фронт показывает toast с текстом про "почту" / "письмо" / "подтвердите".
    // Ждём до 10 секунд — сетевой запрос может занять время.
    const suffix = Date.now();
    await page.locator('#firstName').fill('Тест');
    await page.locator('#lastName').fill('Юзер');
    await page.locator('#email').fill(`e2e_${suffix}@test.local`);
    await page.locator('#password').fill('Pass1234');
    await page.locator('#confirmPassword').fill('Pass1234');
    await page.locator('button[type="submit"]').click();
    await expect(
      page.getByText(/почт|письм|подтвердите/i).first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test('есть ссылка на страницу входа', async ({ page }) => {
    // На странице регистрации должна быть ссылка "Войти" для тех, кто уже зарегистрирован.
    // Уточняем локатор через page.locator('main'), потому что слово "Войти" есть
    // и в шапке навбара — без уточнения Playwright нашёл бы 2 элемента и упал.
    await expect(page.locator('main').getByRole('link', { name: /войти/i })).toBeVisible();
  });

});
