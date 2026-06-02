package com.festivalapp.backend.service;

import com.festivalapp.backend.entity.EventStatus;
import com.festivalapp.backend.entity.PublicationStatus;
import com.festivalapp.backend.entity.RegistrationStatus;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.NullSource;
import org.junit.jupiter.params.provider.ValueSource;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Unit-тесты для {@link DomainStatusMapper} — утилитного класса, переводящего
 * русскоязычные строки из БД в Java-enum и обратно.
 * Уровень: unit. Зависимостей нет — тестируются чисто статические методы.
 * Покрываются три домена: EventStatus, PublicationStatus, RegistrationStatus.
 * Проверяются: маппинг всех известных значений, дефолты для null/blank/unknown.
 */
class DomainStatusMapperTest {

    // ─── EventStatus round-trips ─────────────────────────────────────────────

    // Каждый enum-вариант EventStatus должен однозначно отображаться в конкретную
    // русскоязычную строку БД. @CsvSource задаёт пары «вход → ожидаемый результат».
    @ParameterizedTest
    @CsvSource({
        "DRAFT,черновик",
        "PENDING_APPROVAL,на_рассмотрении",
        "PUBLISHED,опубликовано",
        "ARCHIVED,завершено",
        "REJECTED,отклонено",
        "CANCELLED,отменено"
    })
    void toEventDbStatus_mapsEveryKnownStatus(EventStatus status, String expected) {
        assertThat(DomainStatusMapper.toEventDbStatus(status)).isEqualTo(expected);
    }

    // null означает «статус неизвестен» — безопаснее всего вернуть «черновик»,
    // чтобы запись не попала в публичную выдачу до явного подтверждения.
    @Test
    void toEventDbStatus_nullReturnsDraft() {
        assertThat(DomainStatusMapper.toEventDbStatus(null)).isEqualTo("черновик");
    }

    // Обратный маппинг: строка из БД → enum. Покрываем все значения, чтобы
    // убедиться, что ни одна строка не «теряется» при чтении.
    @ParameterizedTest
    @CsvSource({
        "черновик,DRAFT",
        "на_рассмотрении,PENDING_APPROVAL",
        "опубликовано,PUBLISHED",
        "завершено,ARCHIVED",
        "отклонено,REJECTED",
        "отменено,CANCELLED"
    })
    void toEventStatus_mapsEveryKnownDbValue(String dbStatus, EventStatus expected) {
        assertThat(DomainStatusMapper.toEventStatus(dbStatus)).isEqualTo(expected);
    }

    // null в колонке БД (например, legacy-запись) → DRAFT как безопасный дефолт.
    @Test
    void toEventStatus_nullReturnsDraft() {
        assertThat(DomainStatusMapper.toEventStatus(null)).isEqualTo(EventStatus.DRAFT);
    }

    // Неизвестная строка (опечатка, новый статус без миграции) → DRAFT,
    // чтобы не пробросить неконсистентное состояние дальше в бизнес-логику.
    @Test
    void toEventStatus_unknownValueReturnsDraft() {
        assertThat(DomainStatusMapper.toEventStatus("неизвестно")).isEqualTo(EventStatus.DRAFT);
    }

    // Полный round-trip: для каждого значения enum проверяем, что
    // toEventDbStatus → toEventStatus возвращает исходный enum без потерь.
    // Это защита от рассинхронизации двух половин маппера.
    @Test
    void eventStatus_fullRoundTrip() {
        for (EventStatus status : EventStatus.values()) {
            String db = DomainStatusMapper.toEventDbStatus(status);
            assertThat(DomainStatusMapper.toEventStatus(db)).isEqualTo(status);
        }
    }

    // ─── PublicationStatus ────────────────────────────────────────────────────

    // Для публикаций дефолтный статус — PENDING (на рассмотрении),
    // чтобы новая заявка автоматически попала в очередь модерации.
    @Test
    void toPublicationDbStatus_nullReturnsPending() {
        assertThat(DomainStatusMapper.toPublicationDbStatus(null)).isEqualTo("PENDING");
    }

    // PublicationStatus хранится в БД как имя enum (латиница), а не русский текст.
    // Проверяем, что toPublicationDbStatus просто возвращает .name() без преобразований.
    @ParameterizedTest
    @CsvSource({
        "PENDING,PENDING",
        "PUBLISHED,PUBLISHED",
        "REJECTED,REJECTED",
        "ARCHIVED,ARCHIVED"
    })
    void toPublicationDbStatus_returnsEnumName(PublicationStatus status, String expected) {
        assertThat(DomainStatusMapper.toPublicationDbStatus(status)).isEqualTo(expected);
    }

    // null → PENDING: новая публикация без явного статуса считается «на рассмотрении».
    @Test
    void toPublicationStatus_nullReturnsPending() {
        assertThat(DomainStatusMapper.toPublicationStatus(null)).isEqualTo(PublicationStatus.PENDING);
    }

    // Пустая строка / только пробелы → PENDING: защита от некорректного ввода из БД.
    @Test
    void toPublicationStatus_blankReturnsPending() {
        assertThat(DomainStatusMapper.toPublicationStatus("  ")).isEqualTo(PublicationStatus.PENDING);
    }

    // Парсинг enum-имён (латиница): строка «PUBLISHED» → PublicationStatus.PUBLISHED и т.д.
    @ParameterizedTest
    @CsvSource({
        "PUBLISHED,PUBLISHED",
        "REJECTED,REJECTED",
        "ARCHIVED,ARCHIVED",
        "PENDING,PENDING"
    })
    void toPublicationStatus_parsesEnumName(String dbStatus, PublicationStatus expected) {
        assertThat(DomainStatusMapper.toPublicationStatus(dbStatus)).isEqualTo(expected);
    }

    // Альтернативные русскоязычные строки («опубликовано», «архив», «архивировано», «в_архиве»)
    // должны корректно маппиться — историческая совместимость с legacy-данными в БД.
    @ParameterizedTest
    @CsvSource({
        "опубликовано,PUBLISHED",
        "отклонено,REJECTED",
        "архив,ARCHIVED",
        "архивировано,ARCHIVED",
        "в_архиве,ARCHIVED"
    })
    void toPublicationStatus_parsesRussianValues(String dbStatus, PublicationStatus expected) {
        assertThat(DomainStatusMapper.toPublicationStatus(dbStatus)).isEqualTo(expected);
    }

    // Неизвестная строка → PENDING: безопасный дефолт, не блокирует работу приложения.
    @Test
    void toPublicationStatus_unknownValueReturnsPending() {
        assertThat(DomainStatusMapper.toPublicationStatus("что-то_другое")).isEqualTo(PublicationStatus.PENDING);
    }

    // ─── RegistrationStatus ───────────────────────────────────────────────────

    // null в статусе регистрации → CREATED: это начальное состояние, безопаснее
    // считать запись «новой», чем случайно пометить её отменённой.
    @Test
    void toRegistrationStatus_nullReturnsCreated() {
        assertThat(DomainStatusMapper.toRegistrationStatus(null)).isEqualTo(RegistrationStatus.CREATED);
    }

    // Несколько вариантов строк для «отменено» (русский, верхний регистр, английский CANCELLED) —
    // маппер должен нормализовывать регистр и поддерживать оба языка.
    @ParameterizedTest
    @ValueSource(strings = {"возвращён", "ВОЗВРАЩЁН", "cancelled", "CANCELLED"})
    void toRegistrationStatus_cancelledVariants(String value) {
        assertThat(DomainStatusMapper.toRegistrationStatus(value)).isEqualTo(RegistrationStatus.CANCELLED);
    }

    // Любое другое значение (не отменено) → CREATED: все статусы кроме отмены
    // трактуются как «активная» регистрация.
    @Test
    void toRegistrationStatus_anyOtherValueReturnsCreated() {
        assertThat(DomainStatusMapper.toRegistrationStatus("активен")).isEqualTo(RegistrationStatus.CREATED);
    }
}
