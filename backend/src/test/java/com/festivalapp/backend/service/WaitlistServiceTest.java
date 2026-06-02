package com.festivalapp.backend.service;

import com.festivalapp.backend.entity.Session;
import com.festivalapp.backend.entity.SessionWaitlist;
import com.festivalapp.backend.entity.User;
import com.festivalapp.backend.repository.SessionRepository;
import com.festivalapp.backend.repository.SessionWaitlistRepository;
import com.festivalapp.backend.repository.TicketRepository;
import com.festivalapp.backend.repository.TicketTypeRepository;
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
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit-тесты для {@link WaitlistService} — сервиса листа ожидания на сеансы мероприятий.
 * Уровень: unit. Мокируются репозитории и NotificationService.
 * Проверяются: постановка в очередь (joinWaitlist), выход из очереди (leaveWaitlist),
 * получение статуса с позицией (getStatus). Ключевые инварианты: позиция вычисляется
 * по порядку createdAt, отменённая запись не считается активной.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class WaitlistServiceTest {

    @Mock private SessionWaitlistRepository waitlistRepository;
    @Mock private SessionRepository sessionRepository;
    @Mock private UserRepository userRepository;
    @Mock private TicketRepository ticketRepository;
    @Mock private TicketTypeRepository ticketTypeRepository;
    @Mock private NotificationService notificationService;

    @InjectMocks
    private WaitlistService waitlistService;

    private User user;
    private Session session;

    // Пользователь «alice» и сеанс в статусе «запланирован» с лимитом 10 мест.
    // NotificationService мокируется, чтобы изолировать логику очереди от отправки уведомлений.
    @BeforeEach
    void setUp() {
        user = User.builder().id(1L).login("alice").email("alice@example.com")
            .firstName("Alice").lastName("Smith").build();
        session = Session.builder().id(100L).seatLimit(10).status("запланирован")
            .startsAt(OffsetDateTime.now().plusDays(3)).build();

        when(userRepository.findByLoginOrEmailWithRoles("alice")).thenReturn(Optional.of(user));
        when(sessionRepository.findById(100L)).thenReturn(Optional.of(session));
    }

    // ─── joinWaitlist ─────────────────────────────────────────────────────────

    // Happy-path: пользователь ещё не в очереди → запись создаётся, ответ содержит
    // position (номер в очереди) и alreadyInQueue=false.
    @Test
    void joinWaitlist_newEntryAddsToQueue() {
        when(waitlistRepository.existsBySessionIdAndUserId(100L, 1L)).thenReturn(false);
        when(waitlistRepository.save(any(SessionWaitlist.class))).thenAnswer(inv -> {
            SessionWaitlist sw = inv.getArgument(0);
            sw.setId(50L);
            return sw;
        });
        when(waitlistRepository.countBySessionIdAndStatus(100L, "WAITING")).thenReturn(3L);

        Map<String, Object> result = waitlistService.joinWaitlist(100L, "alice");

        assertThat(result).containsEntry("position", 3L);
        assertThat(result).containsEntry("alreadyInQueue", false);
        verify(waitlistRepository).save(any(SessionWaitlist.class));
    }

    // Повторный вызов join для уже стоящего в очереди пользователя → alreadyInQueue=true,
    // позиция возвращается, но новая запись не создаётся (сервис не дублирует).
    @Test
    void joinWaitlist_alreadyInQueueReturnsPositionWithFlag() {
        when(waitlistRepository.existsBySessionIdAndUserId(100L, 1L)).thenReturn(true);
        when(waitlistRepository.countBySessionIdAndStatus(100L, "WAITING")).thenReturn(2L);

        Map<String, Object> result = waitlistService.joinWaitlist(100L, "alice");

        assertThat(result).containsEntry("alreadyInQueue", true);
        assertThat(result).containsEntry("position", 2L);
    }

    // Несуществующий сеанс → IllegalArgumentException «Сеанс не найден» (бизнес-исключение,
    // не NPE — сервис явно проверяет наличие сеанса перед постановкой в очередь).
    @Test
    void joinWaitlist_sessionNotFoundThrows() {
        when(sessionRepository.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> waitlistService.joinWaitlist(999L, "alice"))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("Сеанс не найден");
    }

    // Неизвестный пользователь → IllegalArgumentException «Пользователь не найден».
    @Test
    void joinWaitlist_userNotFoundThrows() {
        when(userRepository.findByLoginOrEmailWithRoles("ghost")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> waitlistService.joinWaitlist(100L, "ghost"))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("Пользователь не найден");
    }

    // ─── leaveWaitlist ────────────────────────────────────────────────────────

    // Выход из очереди: статус записи меняется с WAITING на CANCELLED,
    // запись не удаляется физически — история очереди должна сохраняться.
    @Test
    void leaveWaitlist_setsStatusToCancelled() {
        SessionWaitlist entry = SessionWaitlist.builder()
            .id(10L).sessionId(100L).userId(1L).status("WAITING").createdAt(OffsetDateTime.now()).build();
        when(waitlistRepository.findBySessionIdAndUserId(100L, 1L)).thenReturn(Optional.of(entry));
        when(waitlistRepository.save(any(SessionWaitlist.class))).thenAnswer(inv -> inv.getArgument(0));

        waitlistService.leaveWaitlist(100L, "alice");

        assertThat(entry.getStatus()).isEqualTo("CANCELLED");
        verify(waitlistRepository).save(entry);
    }

    // Если записи в очереди нет — no-op, исключение не бросается.
    // Это защита от двойного вызова leave или вызова после автоматической отмены.
    @Test
    void leaveWaitlist_noEntryDoesNothing() {
        when(waitlistRepository.findBySessionIdAndUserId(100L, 1L)).thenReturn(Optional.empty());

        waitlistService.leaveWaitlist(100L, "alice");

        // No exception, no save
    }

    // ─── getStatus ────────────────────────────────────────────────────────────

    // Пользователь не в очереди: inQueue=false, queueSize — текущий размер очереди.
    @Test
    void getStatus_notInQueueReturnsInQueueFalse() {
        when(waitlistRepository.findBySessionIdAndUserId(100L, 1L)).thenReturn(Optional.empty());
        when(waitlistRepository.countBySessionIdAndStatus(100L, "WAITING")).thenReturn(5L);

        Map<String, Object> result = waitlistService.getStatus(100L, "alice");

        assertThat(result).containsEntry("inQueue", false);
        assertThat(result).containsEntry("queueSize", 5L);
    }

    // Запись со статусом CANCELLED — считается «не в очереди».
    // Пользователь вышел ранее, не должен видеть себя в очереди.
    @Test
    void getStatus_cancelledEntryCountsAsNotInQueue() {
        SessionWaitlist entry = SessionWaitlist.builder()
            .id(1L).sessionId(100L).userId(1L).status("CANCELLED").createdAt(OffsetDateTime.now()).build();
        when(waitlistRepository.findBySessionIdAndUserId(100L, 1L)).thenReturn(Optional.of(entry));
        when(waitlistRepository.countBySessionIdAndStatus(100L, "WAITING")).thenReturn(3L);

        Map<String, Object> result = waitlistService.getStatus(100L, "alice");

        assertThat(result).containsEntry("inQueue", false);
    }

    // Позиция определяется порядком в списке, отсортированном по createdAt ASC.
    // alice встал вторым (id=2, другой пользователь id=1 встал первым) → position=2.
    @Test
    void getStatus_activeEntryReturnsCorrectPosition() {
        SessionWaitlist myEntry = buildWaitlistEntry(2L, 1L, "WAITING");
        SessionWaitlist other = buildWaitlistEntry(1L, 99L, "WAITING");

        when(waitlistRepository.findBySessionIdAndUserId(100L, 1L)).thenReturn(Optional.of(myEntry));
        when(waitlistRepository.countBySessionIdAndStatus(100L, "WAITING")).thenReturn(2L);
        when(waitlistRepository.findAllBySessionIdAndStatusOrderByCreatedAtAsc(100L, "WAITING"))
            .thenReturn(List.of(other, myEntry));

        Map<String, Object> result = waitlistService.getStatus(100L, "alice");

        assertThat(result).containsEntry("inQueue", true);
        assertThat(result).containsEntry("position", 2L);
        assertThat(result).containsEntry("queueSize", 2L);
    }

    // Первый в очереди → position=1 (нумерация с 1, не с 0).
    @Test
    void getStatus_firstInQueueHasPositionOne() {
        SessionWaitlist myEntry = buildWaitlistEntry(1L, 1L, "WAITING");

        when(waitlistRepository.findBySessionIdAndUserId(100L, 1L)).thenReturn(Optional.of(myEntry));
        when(waitlistRepository.countBySessionIdAndStatus(100L, "WAITING")).thenReturn(1L);
        when(waitlistRepository.findAllBySessionIdAndStatusOrderByCreatedAtAsc(100L, "WAITING"))
            .thenReturn(List.of(myEntry));

        Map<String, Object> result = waitlistService.getStatus(100L, "alice");

        assertThat(result).containsEntry("position", 1L);
    }

    // ─── helpers ──────────────────────────────────────────────────────────────

    // Строит запись в очереди с заданным статусом для сеанса 100.
    // userId передаётся явно, чтобы легко создавать записи разных пользователей.
    private SessionWaitlist buildWaitlistEntry(Long id, Long userId, String status) {
        return SessionWaitlist.builder()
            .id(id)
            .sessionId(100L)
            .userId(userId)
            .status(status)
            .createdAt(OffsetDateTime.now())
            .build();
    }
}
