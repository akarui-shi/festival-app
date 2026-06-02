package com.festivalapp.backend.service;

import com.festivalapp.backend.dto.PromoCodeCreateRequest;
import com.festivalapp.backend.dto.PromoCodeResponse;
import com.festivalapp.backend.dto.PromoCodeValidateResponse;
import com.festivalapp.backend.entity.Organization;
import com.festivalapp.backend.entity.OrganizationMember;
import com.festivalapp.backend.entity.PromoCode;
import com.festivalapp.backend.entity.User;
import com.festivalapp.backend.exception.BadRequestException;
import com.festivalapp.backend.exception.ResourceNotFoundException;
import com.festivalapp.backend.repository.OrganizationMemberRepository;
import com.festivalapp.backend.repository.OrganizationRepository;
import com.festivalapp.backend.repository.PromoCodeRepository;
import com.festivalapp.backend.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit-тесты для {@link PromoCodeService} — сервиса промокодов.
 * Уровень: unit. Мокируются репозитории.
 * Проверяются: создание кода (нормализация, дубликаты), валидация (активность,
 * срок, лимит использований), применение скидки (PERCENT/FIXED/FREE), мягкое
 * удаление (deactivate, не DELETE), получение кодов организатора.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class PromoCodeServiceTest {

    @Mock private PromoCodeRepository promoCodeRepository;
    @Mock private OrganizationRepository organizationRepository;
    @Mock private OrganizationMemberRepository organizationMemberRepository;
    @Mock private UserRepository userRepository;

    @InjectMocks
    private PromoCodeService promoCodeService;

    private User user;
    private Organization org;
    private OrganizationMember membership;

    // Создаём пользователя-организатора, организацию и членство с ролью «владелец».
    // Стаб findAllByUserIdAndLeftAtIsNull возвращает активное членство — сервис его
    // использует для разрешения операций с промокодами конкретной организации.
    @BeforeEach
    void setUp() {
        user = User.builder().id(1L).login("organizer").email("org@example.com").build();
        org = Organization.builder().id(10L).name("Test Org").build();
        membership = OrganizationMember.builder().id(1L).user(user).organization(org)
            .organizationStatus("владелец").joinedAt(OffsetDateTime.now()).build();

        when(userRepository.findByLoginOrEmailWithRoles("organizer")).thenReturn(Optional.of(user));
        when(organizationMemberRepository.findAllByUserIdAndLeftAtIsNull(1L)).thenReturn(List.of(membership));
    }

    // ─── create ───────────────────────────────────────────────────────────────

    // Создание промокода со скидкой типа PERCENT: ответ содержит code, discountType, discountValue,
    // а active=true — новые промокоды всегда активны сразу после создания.
    @Test
    void create_percentDiscountPromoCode() {
        when(promoCodeRepository.findByCodeIgnoreCase("SUMMER10")).thenReturn(Optional.empty());
        when(promoCodeRepository.save(any(PromoCode.class))).thenAnswer(inv -> {
            PromoCode p = inv.getArgument(0);
            p.setId(1L);
            return p;
        });

        PromoCodeCreateRequest req = new PromoCodeCreateRequest();
        req.setCode("SUMMER10");
        req.setDiscountType("PERCENT");
        req.setDiscountValue(new BigDecimal("10"));
        req.setMaxUsages(100);

        PromoCodeResponse resp = promoCodeService.create(req, "organizer");

        assertThat(resp.getCode()).isEqualTo("SUMMER10");
        assertThat(resp.getDiscountType()).isEqualTo("PERCENT");
        assertThat(resp.getDiscountValue()).isEqualByComparingTo("10");
        assertThat(resp.isActive()).isTrue();
    }

    // Код нормализуется: пробелы обрезаются, буквы переводятся в верхний регистр.
    // Это важно, чтобы «save20» и «SAVE20» считались одним и тем же кодом при поиске.
    @Test
    void create_normalizesCodeToUpperCase() {
        when(promoCodeRepository.findByCodeIgnoreCase("save20")).thenReturn(Optional.empty());
        when(promoCodeRepository.save(any(PromoCode.class))).thenAnswer(inv -> {
            PromoCode p = inv.getArgument(0);
            p.setId(2L);
            return p;
        });

        PromoCodeCreateRequest req = new PromoCodeCreateRequest();
        req.setCode("  save20  ");
        req.setDiscountType("FIXED");
        req.setDiscountValue(new BigDecimal("200"));

        PromoCodeResponse resp = promoCodeService.create(req, "organizer");

        assertThat(resp.getCode()).isEqualTo("SAVE20");
    }

    // Дублирующийся код → BadRequestException «уже существует»: коды должны быть уникальны
    // (регистр-независимо), чтобы избежать путаницы при применении.
    @Test
    void create_duplicateCodeThrows() {
        PromoCode existing = buildPromoCode("EXISTS", "PERCENT", new BigDecimal("5"), true);
        when(promoCodeRepository.findByCodeIgnoreCase("EXISTS")).thenReturn(Optional.of(existing));

        PromoCodeCreateRequest req = new PromoCodeCreateRequest();
        req.setCode("EXISTS");
        req.setDiscountType("PERCENT");
        req.setDiscountValue(BigDecimal.TEN);

        assertThatThrownBy(() -> promoCodeService.create(req, "organizer"))
            .isInstanceOf(BadRequestException.class)
            .hasMessageContaining("уже существует");
    }

    // Пользователь без организации не может создать промокод — промокод всегда
    // привязан к конкретной организации. BadRequestException с «организации».
    @Test
    void create_noOrganizationThrows() {
        when(organizationMemberRepository.findAllByUserIdAndLeftAtIsNull(1L)).thenReturn(List.of());

        PromoCodeCreateRequest req = new PromoCodeCreateRequest();
        req.setCode("TEST");
        req.setDiscountType("FREE");

        assertThatThrownBy(() -> promoCodeService.create(req, "organizer"))
            .isInstanceOf(BadRequestException.class)
            .hasMessageContaining("организации");
    }

    // ─── validate ─────────────────────────────────────────────────────────────

    // Активный код с неисчерпанным лимитом → valid=true, discountType и описание с процентом.
    // Описание формируется сервисом и нужно фронту для отображения баннера скидки.
    @Test
    void validate_activeValidCodeReturnsValid() {
        PromoCode promo = buildPromoCode("VALID", "PERCENT", new BigDecimal("15"), true);
        promo.setMaxUsages(100);
        promo.setUsageCount(5);
        when(promoCodeRepository.findByCodeIgnoreCase("VALID")).thenReturn(Optional.of(promo));

        PromoCodeValidateResponse resp = promoCodeService.validate("VALID");

        assertThat(resp.isValid()).isTrue();
        assertThat(resp.getDiscountType()).isEqualTo("PERCENT");
        assertThat(resp.getDescription()).contains("15");
    }

    // Несуществующий код → valid=false (не исключение — фронт ожидает ответ, а не 404).
    @Test
    void validate_unknownCodeReturnsInvalid() {
        when(promoCodeRepository.findByCodeIgnoreCase("UNKNOWN")).thenReturn(Optional.empty());

        assertThat(promoCodeService.validate("UNKNOWN").isValid()).isFalse();
    }

    // Деактивированный (удалённый) код → valid=false.
    // Промокоды мягко удаляются через active=false, физически остаются в БД.
    @Test
    void validate_inactiveCodeReturnsInvalid() {
        PromoCode promo = buildPromoCode("INACTIVE", "PERCENT", BigDecimal.TEN, false);
        when(promoCodeRepository.findByCodeIgnoreCase("INACTIVE")).thenReturn(Optional.of(promo));

        assertThat(promoCodeService.validate("INACTIVE").isValid()).isFalse();
    }

    // Истёкший срок (expiresAt в прошлом) → valid=false.
    // Временное ограничение акции — важный бизнес-кейс для сезонных промокодов.
    @Test
    void validate_expiredCodeReturnsInvalid() {
        PromoCode promo = buildPromoCode("EXPIRED", "PERCENT", BigDecimal.TEN, true);
        promo.setExpiresAt(OffsetDateTime.now().minusDays(1));
        when(promoCodeRepository.findByCodeIgnoreCase("EXPIRED")).thenReturn(Optional.of(promo));

        assertThat(promoCodeService.validate("EXPIRED").isValid()).isFalse();
    }

    // Исчерпан лимит (usageCount == maxUsages) → valid=false.
    // Защита от использования кода сверх заложенного бюджета скидок.
    @Test
    void validate_exhaustedUsagesReturnsInvalid() {
        PromoCode promo = buildPromoCode("EXHAUSTED", "PERCENT", BigDecimal.TEN, true);
        promo.setMaxUsages(10);
        promo.setUsageCount(10);
        when(promoCodeRepository.findByCodeIgnoreCase("EXHAUSTED")).thenReturn(Optional.of(promo));

        assertThat(promoCodeService.validate("EXHAUSTED").isValid()).isFalse();
    }

    // FREE-тип: описание должно быть «Бесплатно», а не «0%» или «0 руб.».
    @Test
    void validate_freeDiscountDescriptionSaysFree() {
        PromoCode promo = buildPromoCode("FREE100", "FREE", BigDecimal.ZERO, true);
        when(promoCodeRepository.findByCodeIgnoreCase("FREE100")).thenReturn(Optional.of(promo));

        PromoCodeValidateResponse resp = promoCodeService.validate("FREE100");

        assertThat(resp.isValid()).isTrue();
        assertThat(resp.getDescription()).isEqualTo("Бесплатно");
    }

    // FIXED-тип: описание должно содержать сумму скидки в рублях.
    @Test
    void validate_fixedDiscountDescriptionShowsAmount() {
        PromoCode promo = buildPromoCode("FIXED500", "FIXED", new BigDecimal("500"), true);
        when(promoCodeRepository.findByCodeIgnoreCase("FIXED500")).thenReturn(Optional.of(promo));

        PromoCodeValidateResponse resp = promoCodeService.validate("FIXED500");

        assertThat(resp.isValid()).isTrue();
        assertThat(resp.getDescription()).contains("500");
    }

    // ─── applyDiscount ────────────────────────────────────────────────────────

    // PERCENT-скидка 10% от 1000 = 900.00 (проверяем точное числовое значение).
    @Test
    void applyDiscount_percentReducesTotal() {
        PromoCode promo = buildPromoCode("SAVE10", "PERCENT", new BigDecimal("10"), true);
        when(promoCodeRepository.findByCodeIgnoreCase("SAVE10")).thenReturn(Optional.of(promo));
        when(promoCodeRepository.save(any(PromoCode.class))).thenAnswer(inv -> inv.getArgument(0));

        BigDecimal result = promoCodeService.applyDiscount("SAVE10", new BigDecimal("1000"));

        assertThat(result).isEqualByComparingTo("900.00");
    }

    // FIXED-скидка: вычитается фиксированная сумма — 500 - 200 = 300.
    @Test
    void applyDiscount_fixedReducesTotal() {
        PromoCode promo = buildPromoCode("MINUS200", "FIXED", new BigDecimal("200"), true);
        when(promoCodeRepository.findByCodeIgnoreCase("MINUS200")).thenReturn(Optional.of(promo));
        when(promoCodeRepository.save(any(PromoCode.class))).thenAnswer(inv -> inv.getArgument(0));

        BigDecimal result = promoCodeService.applyDiscount("MINUS200", new BigDecimal("500"));

        assertThat(result).isEqualByComparingTo("300");
    }

    // FIXED-скидка больше суммы заказа → результат обрезается до 0, не уходит в минус.
    @Test
    void applyDiscount_fixedClampsToZero() {
        PromoCode promo = buildPromoCode("BIG", "FIXED", new BigDecimal("1000"), true);
        when(promoCodeRepository.findByCodeIgnoreCase("BIG")).thenReturn(Optional.of(promo));
        when(promoCodeRepository.save(any(PromoCode.class))).thenAnswer(inv -> inv.getArgument(0));

        BigDecimal result = promoCodeService.applyDiscount("BIG", new BigDecimal("300"));

        assertThat(result).isEqualByComparingTo("0");
    }

    // FREE-тип: итоговая сумма всегда 0 независимо от стоимости билета.
    @Test
    void applyDiscount_freeReturnsZero() {
        PromoCode promo = buildPromoCode("FREEE", "FREE", BigDecimal.ZERO, true);
        when(promoCodeRepository.findByCodeIgnoreCase("FREEE")).thenReturn(Optional.of(promo));
        when(promoCodeRepository.save(any(PromoCode.class))).thenAnswer(inv -> inv.getArgument(0));

        BigDecimal result = promoCodeService.applyDiscount("FREEE", new BigDecimal("9999"));

        assertThat(result).isEqualByComparingTo("0");
    }

    // При каждом применении usageCount должен инкрементироваться, а save() быть вызван —
    // именно так отслеживается исчерпание лимита промокода.
    @Test
    void applyDiscount_incrementsUsageCount() {
        PromoCode promo = buildPromoCode("COUNT", "PERCENT", new BigDecimal("5"), true);
        promo.setUsageCount(3);
        when(promoCodeRepository.findByCodeIgnoreCase("COUNT")).thenReturn(Optional.of(promo));
        when(promoCodeRepository.save(any(PromoCode.class))).thenAnswer(inv -> inv.getArgument(0));

        promoCodeService.applyDiscount("COUNT", BigDecimal.TEN);

        verify(promoCodeRepository).save(promo);
        assertThat(promo.getUsageCount()).isEqualTo(4);
    }

    // null-код → исходная сумма без изменений (не исключение): заказ без промокода — штатный сценарий.
    @Test
    void applyDiscount_nullCodeReturnsTotalUnchanged() {
        BigDecimal result = promoCodeService.applyDiscount(null, new BigDecimal("500"));
        assertThat(result).isEqualByComparingTo("500");
    }

    // Пустая строка → исходная сумма без изменений (аналогично null).
    @Test
    void applyDiscount_blankCodeReturnsTotalUnchanged() {
        BigDecimal result = promoCodeService.applyDiscount("   ", new BigDecimal("500"));
        assertThat(result).isEqualByComparingTo("500");
    }

    // ─── delete ───────────────────────────────────────────────────────────────

    // Мягкое удаление: активный промокод деактивируется (active → false), но не удаляется
    // из БД физически — история использования должна сохраняться для аналитики.
    @Test
    void delete_deactivatesPromoCode() {
        PromoCode promo = buildPromoCode("TO_DELETE", "PERCENT", BigDecimal.TEN, true);
        promo.setId(5L);
        promo.setOrganization(org);
        when(promoCodeRepository.findById(5L)).thenReturn(Optional.of(promo));
        when(organizationMemberRepository.existsByUserIdAndOrganizationIdAndLeftAtIsNull(1L, 10L)).thenReturn(true);
        when(promoCodeRepository.save(any(PromoCode.class))).thenAnswer(inv -> inv.getArgument(0));

        promoCodeService.delete(5L, "organizer");

        assertThat(promo.isActive()).isFalse();
        verify(promoCodeRepository).save(promo);
    }

    // Несуществующий промокод → ResourceNotFoundException (404).
    @Test
    void delete_promoNotFoundThrows() {
        when(promoCodeRepository.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> promoCodeService.delete(999L, "organizer"))
            .isInstanceOf(ResourceNotFoundException.class);
    }

    // Пользователь не является членом организации промокода → BadRequestException «прав».
    // Нельзя деактивировать промокоды чужих организаций.
    @Test
    void delete_notOwnerThrows() {
        PromoCode promo = buildPromoCode("OTHER_ORG", "PERCENT", BigDecimal.TEN, true);
        promo.setId(6L);
        promo.setOrganization(org);
        when(promoCodeRepository.findById(6L)).thenReturn(Optional.of(promo));
        when(organizationMemberRepository.existsByUserIdAndOrganizationIdAndLeftAtIsNull(1L, 10L)).thenReturn(false);

        assertThatThrownBy(() -> promoCodeService.delete(6L, "organizer"))
            .isInstanceOf(BadRequestException.class)
            .hasMessageContaining("прав");
    }

    // ─── getByOrganizer ───────────────────────────────────────────────────────

    // Список промокодов организатора: сервис берёт id первой организации пользователя
    // и возвращает коды, отсортированные по createdAt DESC.
    @Test
    void getByOrganizer_returnsOrgPromoCodes() {
        PromoCode promo = buildPromoCode("PROMO1", "PERCENT", BigDecimal.TEN, true);
        promo.setId(1L);
        promo.setCreatedAt(OffsetDateTime.now());
        when(promoCodeRepository.findAllByOrganizationIdOrderByCreatedAtDesc(10L)).thenReturn(List.of(promo));

        List<PromoCodeResponse> result = promoCodeService.getByOrganizer("organizer");

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getCode()).isEqualTo("PROMO1");
    }

    // Если у пользователя нет организации → пустой список (не исключение).
    @Test
    void getByOrganizer_emptyWhenNoMembership() {
        when(organizationMemberRepository.findAllByUserIdAndLeftAtIsNull(1L)).thenReturn(List.of());

        List<PromoCodeResponse> result = promoCodeService.getByOrganizer("organizer");

        assertThat(result).isEmpty();
    }

    // ─── helpers ──────────────────────────────────────────────────────────────

    // Строит тестовый PromoCode с нулевым счётчиком использований.
    // organization не задаётся здесь — при необходимости устанавливается в тесте.
    private PromoCode buildPromoCode(String code, String type, BigDecimal value, boolean active) {
        return PromoCode.builder()
            .code(code)
            .discountType(type)
            .discountValue(value)
            .usageCount(0)
            .active(active)
            .createdAt(OffsetDateTime.now())
            .build();
    }
}
