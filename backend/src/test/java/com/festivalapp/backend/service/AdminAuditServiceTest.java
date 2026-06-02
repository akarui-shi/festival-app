package com.festivalapp.backend.service;

import com.festivalapp.backend.dto.AdminActionResponse;
import com.festivalapp.backend.entity.AdministrativeAction;
import com.festivalapp.backend.entity.User;
import com.festivalapp.backend.repository.AdministrativeActionRepository;
import com.festivalapp.backend.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit-тесты для {@link AdminAuditService} — сервиса аудита административных действий.
 * Уровень: unit. Мокируются репозитории; проверяется корректность сохранения записей аудита
 * и форматирования ответа (имя администратора, поля сущности).
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class AdminAuditServiceTest {

    @Mock private AdministrativeActionRepository administrativeActionRepository;
    @Mock private UserRepository userRepository;

    @InjectMocks
    private AdminAuditService adminAuditService;

    private User admin;

    // Настраиваем администратора и стабы: userRepository возвращает admin по логину,
    // save() симулирует присвоение ID (как делает JPA при persist).
    @BeforeEach
    void setUp() {
        admin = User.builder().id(1L).login("admin").email("admin@example.com")
            .firstName("Иван").lastName("Администраторов").active(true).build();
        when(userRepository.findByLoginOrEmailWithRoles("admin")).thenReturn(Optional.of(admin));
        when(administrativeActionRepository.save(any(AdministrativeAction.class)))
            .thenAnswer(inv -> {
                AdministrativeAction a = inv.getArgument(0);
                a.setId(99L);
                return a;
            });
    }

    // Базовый сценарий логирования: все переданные поля должны попасть в сохранённую запись.
    // ArgumentCaptor позволяет заглянуть в объект, переданный в save(), без изменения логики сервиса.
    @Test
    void log_savesActionWithAllFields() {
        adminAuditService.log("admin", "MODERATION_DECISION", "Event", 42L, "одобрено");

        ArgumentCaptor<AdministrativeAction> captor = ArgumentCaptor.forClass(AdministrativeAction.class);
        verify(administrativeActionRepository).save(captor.capture());
        AdministrativeAction saved = captor.getValue();

        assertThat(saved.getAdmin()).isEqualTo(admin);
        assertThat(saved.getActionType()).isEqualTo("MODERATION_DECISION");
        assertThat(saved.getEntityType()).isEqualTo("Event");
        assertThat(saved.getEntityId()).isEqualTo(42L);
        assertThat(saved.getDetails()).isEqualTo("одобрено");
        assertThat(saved.getCreatedAt()).isNotNull();
    }

    // null в качестве adminIdentifier — системное действие без конкретного администратора.
    // Запись должна быть сохранена, admin=null (не должно быть NPE).
    @Test
    void log_withNullAdminIdentifier_stillSavesAction() {
        adminAuditService.log(null, "SYSTEM_ACTION", "User", 1L, "auto");

        ArgumentCaptor<AdministrativeAction> captor = ArgumentCaptor.forClass(AdministrativeAction.class);
        verify(administrativeActionRepository).save(captor.capture());
        assertThat(captor.getValue().getAdmin()).isNull();
    }

    // Если администратор не найден в БД (неизвестный логин), поле admin остаётся null,
    // но запись аудита всё равно сохраняется — не теряем информацию о действии.
    @Test
    void log_withUnknownAdminIdentifier_savesWithNullAdmin() {
        when(userRepository.findByLoginOrEmailWithRoles("ghost")).thenReturn(Optional.empty());

        adminAuditService.log("ghost", "ACTION", "Entity", 1L, "detail");

        ArgumentCaptor<AdministrativeAction> captor = ArgumentCaptor.forClass(AdministrativeAction.class);
        verify(administrativeActionRepository).save(captor.capture());
        assertThat(captor.getValue().getAdmin()).isNull();
    }

    // getRecentActions должен корректно формировать DTO: сконкатенировать firstName + lastName
    // в adminName и передать все поля action (id, actionType, entityType, entityId, details, createdAt).
    @Test
    void getRecentActions_returnsFormattedList() {
        AdministrativeAction action = AdministrativeAction.builder()
            .id(1L)
            .admin(admin)
            .actionType("BLOCK_USER")
            .entityType("User")
            .entityId(55L)
            .details("spammer")
            .createdAt(OffsetDateTime.now())
            .build();
        when(administrativeActionRepository.findTop200ByOrderByCreatedAtDesc()).thenReturn(List.of(action));

        List<AdminActionResponse> result = adminAuditService.getRecentActions();

        assertThat(result).hasSize(1);
        AdminActionResponse resp = result.get(0);
        assertThat(resp.getId()).isEqualTo(1L);
        assertThat(resp.getAdminId()).isEqualTo(1L);
        assertThat(resp.getAdminName()).isEqualTo("Иван Администраторов");
        assertThat(resp.getActionType()).isEqualTo("BLOCK_USER");
        assertThat(resp.getEntityType()).isEqualTo("User");
        assertThat(resp.getEntityId()).isEqualTo(55L);
        assertThat(resp.getDetails()).isEqualTo("spammer");
        assertThat(resp.getCreatedAt()).isNotNull();
    }

    // Если действие выполнено системой (admin=null), DTO должен отдать null в adminId и adminName,
    // а не бросить NPE при обращении к полям admin.
    @Test
    void getRecentActions_actionWithNullAdminShowsNullAdminFields() {
        AdministrativeAction action = AdministrativeAction.builder()
            .id(2L)
            .admin(null)
            .actionType("AUTO_ARCHIVE")
            .entityType("Event")
            .entityId(10L)
            .createdAt(OffsetDateTime.now())
            .build();
        when(administrativeActionRepository.findTop200ByOrderByCreatedAtDesc()).thenReturn(List.of(action));

        AdminActionResponse resp = adminAuditService.getRecentActions().get(0);

        assertThat(resp.getAdminId()).isNull();
        assertThat(resp.getAdminName()).isNull();
    }

    // Пустой журнал → пустой список DTO (не null, не исключение).
    @Test
    void getRecentActions_emptyList() {
        when(administrativeActionRepository.findTop200ByOrderByCreatedAtDesc()).thenReturn(List.of());

        assertThat(adminAuditService.getRecentActions()).isEmpty();
    }
}
