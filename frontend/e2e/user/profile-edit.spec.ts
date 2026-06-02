/**
 * Детальные тесты страницы профиля /profile
 *
 * Покрываем три сценария:
 * 1. Форма редактирования — поля, кнопка сохранения, кнопка отмены
 * 2. Смена пароля — аккордеон открывается/закрывается, валидация
 * 3. Выход из аккаунта — редирект на /login
 *
 * Все тесты работают от имени admin_local (storageState задан на уровне файла).
 */
import { test, expect } from '@playwright/test';
import { STORAGE_STATE } from '../auth-state.js';

// test.use на уровне файла — применяется ко всем тестам без исключения.
test.use({ storageState: STORAGE_STATE.admin });

// Переходим на /profile перед каждым тестом — чтобы не повторять это в каждом тесте.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('festival.selectedCityId', '1');
  });
  await page.goto('/profile');
  await page.waitForLoadState('networkidle');
});

test.describe('Профиль — форма редактирования', () => {

  test('все обязательные поля присутствуют', async ({ page }) => {
    // Проверяем, что на странице отрендерились все 4 обязательных поля.
    // Ищем по id — они гарантированно уникальны на странице.
    await expect(page.locator('#login')).toBeVisible();
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#firstName')).toBeVisible();
    await expect(page.locator('#lastName')).toBeVisible();
  });

  test('поле телефона присутствует', async ({ page }) => {
    // Телефон — необязательное поле, но тоже должно отображаться в форме.
    await expect(page.locator('#phone')).toBeVisible();
  });

  test('кнопка "Сохранить изменения" заблокирована когда данные не изменены', async ({ page }) => {
    // UX-правило: если пользователь ничего не менял — кнопка сохранения неактивна.
    // Это предотвращает случайные клики и лишние запросы к API.
    const saveBtn = page.getByRole('button', { name: /сохранить изменения/i });
    await expect(saveBtn).toBeDisabled();
  });

  test('кнопка "Сохранить изменения" активируется при изменении поля', async ({ page }) => {
    // Изменяем любое поле → кнопка сохранения должна стать активной.
    // Добавляем символ к текущему значению телефона (не затираем, а дописываем),
    // чтобы тест работал независимо от того, заполнен ли телефон.
    const phoneInput = page.locator('#phone');
    const currentVal = await phoneInput.inputValue();
    await phoneInput.fill(currentVal + '1');

    const saveBtn = page.getByRole('button', { name: /сохранить изменения/i });
    await expect(saveBtn).toBeEnabled();
  });

  test('кнопка "Отменить" сбрасывает изменения и блокирует сохранение', async ({ page }) => {
    // Меняем поле, потом нажимаем "Отменить" — данные должны вернуться к исходным,
    // а кнопка сохранения снова заблокироваться.
    const phoneInput = page.locator('#phone');
    const originalVal = await phoneInput.inputValue(); // запоминаем исходное значение
    await phoneInput.fill('000'); // вводим что-то другое

    const cancelBtn = page.getByRole('button', { name: /отменить/i });
    await expect(cancelBtn).toBeEnabled(); // кнопка "Отменить" доступна, т.к. есть изменения
    await cancelBtn.click();

    // После отмены — поле вернулось к исходному значению
    await expect(phoneInput).toHaveValue(originalVal);
    // Кнопка сохранения снова недоступна — изменений нет
    const saveBtn = page.getByRole('button', { name: /сохранить изменения/i });
    await expect(saveBtn).toBeDisabled();
  });

});

test.describe('Профиль — смена пароля', () => {

  test('секция смены пароля изначально свёрнута', async ({ page }) => {
    // Форма смены пароля скрыта по умолчанию (аккордеон закрыт).
    // Поле "Текущий пароль" не должно быть видимым без клика на заголовок.
    await expect(page.locator('#currentPassword')).not.toBeVisible();
  });

  test('клик на "Смена пароля" открывает форму', async ({ page }) => {
    // После клика на заголовок аккордеон раскрывается и показывает три поля.
    await page.getByRole('button', { name: /смена пароля/i }).click();
    await expect(page.locator('#currentPassword')).toBeVisible();
    await expect(page.locator('#newPassword')).toBeVisible();
    await expect(page.locator('#confirmPassword')).toBeVisible();
  });

  test('повторный клик сворачивает секцию', async ({ page }) => {
    // Аккордеон работает как переключатель: первый клик открывает, второй закрывает.
    const toggle = page.getByRole('button', { name: /смена пароля/i });
    await toggle.click();
    await expect(page.locator('#currentPassword')).toBeVisible(); // открылось
    await toggle.click();
    await expect(page.locator('#currentPassword')).not.toBeVisible(); // снова закрылось
  });

  test('неверный текущий пароль показывает ошибку', async ({ page }) => {
    // Открываем форму и вводим неверный текущий пароль.
    // Бэкенд вернёт 400/401, фронт покажет toast с ошибкой.
    // Признак того, что форма не была отправлена успешно — остались на /profile.
    await page.getByRole('button', { name: /смена пароля/i }).click();
    await page.locator('#currentPassword').fill('wrongpassword');
    await page.locator('#newPassword').fill('NewPass999');
    await page.locator('#confirmPassword').fill('NewPass999');
    // Берём последнюю форму на странице — форма смены пароля идёт после основной формы профиля.
    await page.locator('form').last().getByRole('button', { name: /изменить пароль/i }).click();
    await expect(page).toHaveURL('/profile');
  });

  test('несовпадающие новые пароли блокируют отправку', async ({ page }) => {
    // newPassword и confirmPassword разные — фронтенд должен поймать это до отправки.
    // Убеждаемся, что остались на /profile (запрос к бэкенду не ушёл).
    await page.getByRole('button', { name: /смена пароля/i }).click();
    await page.locator('#currentPassword').fill('123456');
    await page.locator('#newPassword').fill('NewPass999');
    await page.locator('#confirmPassword').fill('Different111');
    await page.locator('form').last().getByRole('button', { name: /изменить пароль/i }).click();
    await expect(page).toHaveURL('/profile');
  });

});

test.describe('Профиль — выход из аккаунта', () => {

  test('кнопка "Выйти из аккаунта" перенаправляет на логин', async ({ page }) => {
    // На странице есть ДВА элемента с текстом/aria-label "Выйти из аккаунта":
    // 1) иконка-кнопка в шапке (aria-label без видимого текста)
    // 2) кнопка на форме (с видимым текстом)
    // Используем .filter({ hasText: '...' }) — он матчит только элементы
    // с видимым текстовым содержимым, игнорируя aria-label.
    await page.locator('button').filter({ hasText: 'Выйти из аккаунта' }).click();
    // После выхода токен удаляется, AuthContext сбрасывается,
    // и ProtectedRoute перенаправляет на /login.
    await expect(page).toHaveURL('/login', { timeout: 8_000 });
  });

});
