package com.festivalapp.backend.entity;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Unit-тесты для перечисления {@link RoleName}.
 * Уровень: unit. Проверяет логику парсинга и форматирования ролей:
 * - {@code fromAny} — универсальный парсер из любых строковых вариантов,
 * - {@code fromDbName} — парсинг из русских названий, хранимых в БД,
 * - {@code toDbName} / {@code toApiName} — форматирование для хранения и API.
 */
class RoleNameTest {

    // ─── fromAny ──────────────────────────────────────────────────────────────

    // fromAny должен распознавать «RESIDENT», «resident», «ROLE_RESIDENT» и русские варианты —
    // всё это означает роль жителя. Регистронезависимость критична, так как значения могут
    // приходить из БД или API в разном виде.
    @ParameterizedTest
    @ValueSource(strings = {"RESIDENT", "resident", "ROLE_RESIDENT", "role_resident", "ROLE_ЖИТЕЛЬ"})
    void fromAny_parsesResidentVariants(String input) {
        assertThat(RoleName.fromAny(input)).isEqualTo(RoleName.ROLE_RESIDENT);
    }

    // Аналогично для организатора: принимаются британский вариант «ORGANISER» и русский «ОРГАНИЗАТОР».
    @ParameterizedTest
    @ValueSource(strings = {"ORGANIZER", "organizer", "ORGANISER", "ROLE_ORGANIZER", "ROLE_ОРГАНИЗАТОР"})
    void fromAny_parsesOrganizerVariants(String input) {
        assertThat(RoleName.fromAny(input)).isEqualTo(RoleName.ROLE_ORGANIZER);
    }

    // Для администратора принимается полный вариант «ADMINISTRATOR» и русские форматы.
    @ParameterizedTest
    @ValueSource(strings = {"ADMIN", "admin", "ADMINISTRATOR", "ROLE_ADMIN", "ROLE_АДМИНИСТРАТОР"})
    void fromAny_parsesAdminVariants(String input) {
        assertThat(RoleName.fromAny(input)).isEqualTo(RoleName.ROLE_ADMIN);
    }

    // null — безопасное значение по умолчанию: вместо NPE возвращается ROLE_RESIDENT.
    @Test
    void fromAny_nullReturnsResident() {
        assertThat(RoleName.fromAny(null)).isEqualTo(RoleName.ROLE_RESIDENT);
    }

    // Пустая/пробельная строка также трактуется как «нет роли» → ROLE_RESIDENT.
    @Test
    void fromAny_blankReturnsResident() {
        assertThat(RoleName.fromAny("   ")).isEqualTo(RoleName.ROLE_RESIDENT);
    }

    // Неизвестное значение должно бросать исключение с сообщением, содержащим проблемное значение,
    // чтобы разработчик сразу понял, что именно нельзя распознать.
    @Test
    void fromAny_unknownValueThrows() {
        assertThatThrownBy(() -> RoleName.fromAny("SUPERUSER"))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("SUPERUSER");
    }

    // ─── fromDbName ───────────────────────────────────────────────────────────

    // В БД роли хранятся по-русски («Житель», «Организатор», «Администратор»).
    // fromDbName должен уметь распознать все три варианта без дополнительной обработки.
    @ParameterizedTest
    @CsvSource({
        "Житель,ROLE_RESIDENT",
        "Организатор,ROLE_ORGANIZER",
        "Администратор,ROLE_ADMIN"
    })
    void fromDbName_parsesRussianDbNames(String dbName, RoleName expected) {
        assertThat(RoleName.fromDbName(dbName)).isEqualTo(expected);
    }

    // null из БД → безопасный дефолт ROLE_RESIDENT (защита от NULL-колонок при миграции).
    @Test
    void fromDbName_nullReturnsResident() {
        assertThat(RoleName.fromDbName(null)).isEqualTo(RoleName.ROLE_RESIDENT);
    }

    // Пробельная строка из БД → ROLE_RESIDENT (защита от случайно пустых строк).
    @Test
    void fromDbName_blankReturnsResident() {
        assertThat(RoleName.fromDbName("  ")).isEqualTo(RoleName.ROLE_RESIDENT);
    }

    // ─── toDbName ─────────────────────────────────────────────────────────────

    // toDbName должен возвращать именно тот русский текст, который ожидается в БД.
    // Это критично: неверное значение сломает INSERT/UPDATE и нарушит ограничения колонки.
    @ParameterizedTest
    @CsvSource({
        "ROLE_RESIDENT,Житель",
        "ROLE_ORGANIZER,Организатор",
        "ROLE_ADMIN,Администратор"
    })
    void toDbName_returnsRussianName(RoleName role, String expected) {
        assertThat(role.toDbName()).isEqualTo(expected);
    }

    // ─── toApiName ────────────────────────────────────────────────────────────

    // API использует имена без префикса «ROLE_», чтобы не раскрывать внутренние детали Spring Security.
    @ParameterizedTest
    @CsvSource({
        "ROLE_RESIDENT,RESIDENT",
        "ROLE_ORGANIZER,ORGANIZER",
        "ROLE_ADMIN,ADMIN"
    })
    void toApiName_stripsRolePrefix(RoleName role, String expected) {
        assertThat(role.toApiName()).isEqualTo(expected);
    }

    // ─── round-trip ───────────────────────────────────────────────────────────

    // Полный round-trip: каждая роль должна корректно сохраняться в БД и обратно загружаться.
    // Тест защищает от ситуации, когда новый вариант enum добавлен, но toDbName/fromDbName не обновлены.
    @Test
    void roundTrip_dbNameToEnum() {
        for (RoleName role : RoleName.values()) {
            String dbName = role.toDbName();
            assertThat(RoleName.fromDbName(dbName)).isEqualTo(role);
        }
    }
}
