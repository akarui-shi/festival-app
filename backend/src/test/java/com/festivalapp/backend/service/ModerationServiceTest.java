package com.festivalapp.backend.service;

import com.festivalapp.backend.dto.ModerationDecisionRequest;
import com.festivalapp.backend.dto.ModerationResponse;
import com.festivalapp.backend.entity.Event;
import com.festivalapp.backend.entity.Moderation;
import com.festivalapp.backend.entity.Organization;
import com.festivalapp.backend.entity.Publication;
import com.festivalapp.backend.entity.Role;
import com.festivalapp.backend.entity.User;
import com.festivalapp.backend.entity.UserRole;
import com.festivalapp.backend.exception.BadRequestException;
import com.festivalapp.backend.repository.EventRepository;
import com.festivalapp.backend.repository.ModerationRepository;
import com.festivalapp.backend.repository.OrganizationRepository;
import com.festivalapp.backend.repository.ParticipantRepository;
import com.festivalapp.backend.repository.PublicationRepository;
import com.festivalapp.backend.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit-тесты для {@link ModerationService} — сервиса модерации событий и публикаций.
 * Уровень: unit. Мокируются репозитории, AdminAuditService и сервисы уведомлений.
 * Проверяются: проверка прав (только Администратор может принимать решения),
 * смена статуса мероприятия (одобрено → опубликовано, отклонено → отклонено),
 * одобрение публикаций, защита от некорректных типов сущностей.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class ModerationServiceTest {

    @Mock private ModerationRepository moderationRepository;
    @Mock private UserRepository userRepository;
    @Mock private EventRepository eventRepository;
    @Mock private OrganizationRepository organizationRepository;
    @Mock private ParticipantRepository participantRepository;
    @Mock private PublicationRepository publicationRepository;
    @Mock private AdminAuditService adminAuditService;
    @Mock private EventNotificationService eventNotificationService;
    @Mock private InAppNotificationService inAppNotificationService;

    @InjectMocks
    private ModerationService moderationService;

    private User adminUser;
    private User regularUser;
    private Event event;
    private Publication publication;

    // Создаём двух пользователей: adminUser с ролью «Администратор» и regularUser «Житель».
    // Разные роли нужны для тестирования проверки прав доступа.
    // Событие в статусе «на_рассмотрении» и публикация в «PENDING» — типичное
    // состояние перед принятием решения модератором.
    @BeforeEach
    void setUp() {
        Role adminRole = Role.builder().id(3L).name("Администратор").build();
        adminUser = User.builder()
            .id(1L).login("admin").email("admin@example.com")
            .active(true).firstName("Admin").lastName("User")
            .registeredAt(OffsetDateTime.now())
            .createdAt(OffsetDateTime.now()).updatedAt(OffsetDateTime.now())
            .build();
        UserRole adminUserRole = UserRole.builder()
            .id(10L).user(adminUser).role(adminRole)
            .assignedAt(OffsetDateTime.now()).build();
        adminUser.setUserRoles(Set.of(adminUserRole));

        Role residentRole = Role.builder().id(1L).name("Житель").build();
        regularUser = User.builder()
            .id(2L).login("bob").email("bob@example.com")
            .active(true).firstName("Bob").lastName("User")
            .registeredAt(OffsetDateTime.now())
            .createdAt(OffsetDateTime.now()).updatedAt(OffsetDateTime.now())
            .build();
        UserRole residentUserRole = UserRole.builder()
            .id(11L).user(regularUser).role(residentRole)
            .assignedAt(OffsetDateTime.now()).build();
        regularUser.setUserRoles(Set.of(residentUserRole));

        Organization org = Organization.builder().id(10L).name("Test Org").build();

        event = Event.builder()
            .id(100L)
            .organization(org)
            .createdByUser(adminUser)
            .title("Test Event")
            .status("на_рассмотрении")
            .free(true)
            .startsAt(OffsetDateTime.now().plusDays(7))
            .createdAt(OffsetDateTime.now())
            .updatedAt(OffsetDateTime.now())
            .build();

        publication = Publication.builder()
            .id(200L)
            .event(event)
            .organization(org)
            .createdByUser(adminUser)
            .title("Test Publication")
            .content("Content")
            .status("PENDING")
            .moderationStatus("на_рассмотрении")
            .createdAt(OffsetDateTime.now())
            .updatedAt(OffsetDateTime.now())
            .build();

        when(userRepository.findByLoginOrEmailWithRoles("admin")).thenReturn(Optional.of(adminUser));
        when(userRepository.findByLoginOrEmailWithRoles("bob")).thenReturn(Optional.of(regularUser));
        when(eventRepository.findByIdAndDeletedAtIsNull(100L)).thenReturn(Optional.of(event));
        when(publicationRepository.findById(200L)).thenReturn(Optional.of(publication));
        when(moderationRepository.save(any(Moderation.class))).thenAnswer(inv -> {
            Moderation m = inv.getArgument(0);
            m.setId(999L);
            return m;
        });
        when(eventRepository.save(any(Event.class))).thenAnswer(inv -> inv.getArgument(0));
        when(publicationRepository.save(any(Publication.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    // ─── applyDecision ────────────────────────────────────────────────────────

    // Обычный пользователь (Житель) не имеет прав модератора — BadRequestException «Недостаточно прав».
    // Проверка прав выполняется до любой логики, чтобы неавторизованные запросы отсекались быстро.
    @Test
    void applyDecision_nonAdminThrowsBadRequest() {
        ModerationDecisionRequest req = buildRequest("EVENT", 100L, "одобрено");

        assertThatThrownBy(() -> moderationService.applyDecision(req, "bob"))
            .isInstanceOf(BadRequestException.class)
            .hasMessageContaining("Недостаточно прав");
    }

    // Одобрение события: decision=«одобрено» → статус мероприятия должен стать «опубликовано».
    // verify() проверяет, что eventRepository.save() вызван (запись в БД реально сохраняется).
    @Test
    void applyDecision_approveEvent_setsStatusToPublished() {
        ModerationDecisionRequest req = buildRequest("EVENT", 100L, "одобрено");

        ModerationResponse resp = moderationService.applyDecision(req, "admin");

        assertThat(resp).isNotNull();
        assertThat(resp.getDecision()).isEqualTo("одобрено");
        verify(eventRepository).save(any(Event.class));
    }

    // Отклонение события: decision=«отклонено» → статус «отклонено», событие не публикуется.
    @Test
    void applyDecision_rejectEvent_setsStatusToRejected() {
        ModerationDecisionRequest req = buildRequest("EVENT", 100L, "отклонено");

        ModerationResponse resp = moderationService.applyDecision(req, "admin");

        assertThat(resp).isNotNull();
        assertThat(resp.getDecision()).isEqualTo("отклонено");
        verify(eventRepository).save(any(Event.class));
    }

    // Тип «COMMENT» не поддерживается в applyDecision — комментарии модерируются иначе.
    // BadRequestException с «комментарий» объясняет причину отклонения.
    @Test
    void applyDecision_commentEntityThrowsBadRequest() {
        ModerationDecisionRequest req = buildRequest("COMMENT", 1L, "одобрено");

        assertThatThrownBy(() -> moderationService.applyDecision(req, "admin"))
            .isInstanceOf(BadRequestException.class)
            .hasMessageContaining("комментарий");
    }

    // Полностью неизвестный тип сущности → BadRequestException (не NullPointerException).
    @Test
    void applyDecision_unknownEntityTypeThrowsBadRequest() {
        ModerationDecisionRequest req = buildRequest("UNKNOWN_TYPE", 1L, "одобрено");

        assertThatThrownBy(() -> moderationService.applyDecision(req, "admin"))
            .isInstanceOf(BadRequestException.class);
    }

    // Одобрение публикации: публикация (новость/анонс) переходит из PENDING в PUBLISHED.
    // publicationRepository.save() должен быть вызван для сохранения изменённого статуса.
    @Test
    void applyDecision_approvePublication_setsStatusPublished() {
        ModerationDecisionRequest req = buildRequest("PUBLICATION", 200L, "одобрено");

        ModerationResponse resp = moderationService.applyDecision(req, "admin");

        assertThat(resp).isNotNull();
        assertThat(resp.getDecision()).isEqualTo("одобрено");
        verify(publicationRepository).save(any(Publication.class));
    }

    // ─── helpers ──────────────────────────────────────────────────────────────

    // Строит ModerationDecisionRequest с заданными entityType, entityId и decision.
    // Используется во всех тестах для удобного формирования запроса модерации.
    private ModerationDecisionRequest buildRequest(String entityType, Long entityId, String decision) {
        ModerationDecisionRequest req = new ModerationDecisionRequest();
        req.setEntityType(entityType);
        req.setEntityId(entityId);
        req.setDecision(decision);
        return req;
    }
}
