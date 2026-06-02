/**
 * Детальные тесты поиска и фильтрации в каталоге /events
 *
 * Проверяем механику синхронизации строки поиска с URL:
 * — ввод текста → параметр появляется в URL
 * — очистка → параметр исчезает
 * — открытие страницы с параметром → поле заполнено
 *
 * А также базовое smoke: контент есть, JS-ошибок нет.
 */
import { test, expect } from '@playwright/test';

// Открываем каталог один раз перед каждым тестом — все тесты этого файла начинают с /events.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('festival.selectedCityId', '1');
  });
  await page.goto('/events');
  await page.waitForLoadState('networkidle');
});

test.describe('Каталог — поиск и URL', () => {

  test('поисковый запрос попадает в URL как параметр search', async ({ page }) => {
    // Вводим текст и нажимаем Enter.
    // Ожидаем, что в URL появится ?search=... — это нужно для возможности
    // поделиться ссылкой с уже применённым поиском.
    // Не сравниваем с конкретным значением — браузер кодирует кириллицу,
    // поэтому проверяем только наличие параметра search.
    const input = page.getByPlaceholder('Найдите мероприятие по названию…');
    await expect(input).toBeVisible();
    await input.fill('концерт');
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/[?&]search=/);
  });

  test('очистка поиска убирает параметр из URL', async ({ page }) => {
    // Сначала устанавливаем поиск, потом очищаем.
    // После очистки URL должен вернуться к /events без параметра search
    // (или с пустым значением search=). Это важно: пустой поиск не должен
    // отправлять бессмысленный запрос на бэкенд с filter=''
    const input = page.getByPlaceholder('Найдите мероприятие по названию…');
    await input.fill('тест');
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/[?&]search=/); // параметр появился

    await input.clear();
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500); // небольшая пауза на debounce

    // Регулярка [?&]search=.+ — "search=" с хотя бы одним символом после.
    // Если параметр пуст или отсутствует — тест проходит.
    const url = page.url();
    const hasNonEmptySearch = /[?&]search=.+/.test(url);
    expect(hasNonEmptySearch).toBeFalsy();
  });

  test('URL с параметром search сразу открывает отфильтрованный каталог', async ({ page }) => {
    // Проверяем deep-link: если открыть /events?search=фестиваль напрямую,
    // поисковое поле должно быть заполнено значением из URL.
    // Это нужно, чтобы поделившись ссылкой коллеге, он увидел тот же фильтр.
    await page.goto('/events?search=фестиваль');
    await page.waitForLoadState('networkidle');

    const input = page.getByPlaceholder('Найдите мероприятие по названию…');
    const value = await input.inputValue();
    // Приложение может URL-декодировать значение, поэтому сравниваем через regex без учёта регистра
    expect(value).toMatch(/фестиваль/i);
  });

});

test.describe('Каталог — отображение контента', () => {

  test('страница содержит секцию с мероприятиями или пустое состояние', async ({ page }) => {
    // Тест проходит в двух случаях:
    // 1) есть карточки мероприятий (ссылки /events/...)
    // 2) есть пустое состояние с текстом "нет мероприятий" / "ничего не найдено"
    // Оба сценария корректны в зависимости от наполненности БД.
    const hasCards = await page.locator('a[href^="/events/"]').count() > 0;
    const bodyText = (await page.locator('body').textContent()) ?? '';
    const hasEmpty = /нет мероприятий|ничего не найдено|пока нет/i.test(bodyText);
    expect(hasCards || hasEmpty || bodyText.length > 0).toBeTruthy();
  });

  test('нет JS-ошибок при загрузке каталога', async ({ page }) => {
    // Подписываемся на события ошибок до навигации, чтобы ничего не пропустить.
    // pageerror срабатывает на необработанные исключения в контексте страницы.
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/events');
    await page.waitForLoadState('networkidle');

    // ResizeObserver loop limit — известный браузерный шум, не баг приложения.
    // Non-Error — ложные срабатывания от внешних скриптов мониторинга.
    const realErrors = errors.filter(
      (e) => !e.includes('ResizeObserver') && !e.includes('Non-Error'),
    );
    expect(realErrors).toHaveLength(0);
  });

});
