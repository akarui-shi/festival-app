package com.festivalapp.backend.service;

import com.festivalapp.backend.dto.NotificationResponse;
import com.festivalapp.backend.entity.Notification;
import com.festivalapp.backend.entity.User;
import com.festivalapp.backend.repository.NotificationRepository;
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
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit-тесты для {@link InAppNotificationService} — сервиса внутренних уведомлений.
 * Уровень: unit. Мокируются NotificationRepository и UserRepository.
 * Проверяются: создание уведомлений (по userId и по логину), получение списка,
 * счётчик непрочитанных, отметка прочитанным (только владелец), массовая отметка.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class InAppNotificationServiceTest {

    @Mock private NotificationRepository notificationRepository;
    @Mock private UserRepository userRepository;

    @InjectMocks
    private InAppNotificationService notificationService;

    private User user;

    // Регистрируем пользователя «alice» и настраиваем два стаба — поиск по id и по логину,
    // т.к. разные методы сервиса используют разные способы разрешения пользователя.
    @BeforeEach
    void setUp() {
        user = User.builder().id(1L).login("alice").email("alice@example.com").active(true).build();
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(userRepository.findByLoginOrEmailWithRoles("alice")).thenReturn(Optional.of(user));
    }

    // ─── create ───────────────────────────────────────────────────────────────

    // Создание уведомления по userId: все поля (тип, заголовок, тело, ссылка) должны
    // попасть в сохранённый объект. Поле read=false — уведомление создаётся непрочитанным.
    // ArgumentCaptor позволяет проверить содержимое объекта, переданного в save().
    @Test
    void create_savesNotification() {
        when(notificationRepository.save(any(Notification.class))).thenAnswer(inv -> {
            Notification n = inv.getArgument(0);
            n.setId(10L);
            return n;
        });

        notificationService.create(1L, "EVENT_PUBLISHED", "Новое событие", "Описание", "/events/5");

        ArgumentCaptor<Notification> captor = ArgumentCaptor.forClass(Notification.class);
        verify(notificationRepository).save(captor.capture());
        Notification saved = captor.getValue();

        assertThat(saved.getUser()).isEqualTo(user);
        assertThat(saved.getType()).isEqualTo("EVENT_PUBLISHED");
        assertThat(saved.getTitle()).isEqualTo("Новое событие");
        assertThat(saved.getBody()).isEqualTo("Описание");
        assertThat(saved.getLink()).isEqualTo("/events/5");
        assertThat(saved.isRead()).isFalse();
        assertThat(saved.getCreatedAt()).isNotNull();
    }

    // Если пользователь с таким userId не найден — уведомление не создаётся,
    // never() подтверждает, что save() не вызывался (тихий игнор, не исключение).
    @Test
    void create_unknownUserIdDoesNothing() {
        when(userRepository.findById(999L)).thenReturn(Optional.empty());

        notificationService.create(999L, "TYPE", "Title", "Body", null);

        verify(notificationRepository, never()).save(any());
    }

    // ─── createByIdentifier ───────────────────────────────────────────────────

    // Создание по логину/email — используется, когда известен только идентификатор пользователя,
    // а не его id (например, из JWT). Проверяем, что save() вызван хотя бы один раз.
    @Test
    void createByIdentifier_savesNotificationForFoundUser() {
        when(notificationRepository.save(any(Notification.class))).thenAnswer(inv -> inv.getArgument(0));

        notificationService.createByIdentifier("alice", "REMINDER", "Напоминание", "Завтра мероприятие", "/events/1");

        verify(notificationRepository).save(any(Notification.class));
    }

    // Неизвестный идентификатор → save() не вызывается, сервис молча пропускает создание.
    @Test
    void createByIdentifier_unknownUserDoesNothing() {
        when(userRepository.findByLoginOrEmailWithRoles("ghost")).thenReturn(Optional.empty());

        notificationService.createByIdentifier("ghost", "TYPE", "Title", "Body", null);

        verify(notificationRepository, never()).save(any());
    }

    // ─── getForUser ───────────────────────────────────────────────────────────

    // Список уведомлений: возвращается в порядке DESC по createdAt (репозиторий).
    // Проверяем и размер, и что поле read корректно маппится в DTO.
    @Test
    void getForUser_returnsSortedNotifications() {
        Notification n1 = buildNotification(1L, user, "TYPE1", "Первое", false);
        Notification n2 = buildNotification(2L, user, "TYPE2", "Второе", true);
        when(notificationRepository.findAllByUserIdOrderByCreatedAtDesc(1L)).thenReturn(List.of(n1, n2));

        List<NotificationResponse> result = notificationService.getForUser("alice");

        assertThat(result).hasSize(2);
        assertThat(result.get(0).getTitle()).isEqualTo("Первое");
        assertThat(result.get(1).isRead()).isTrue();
    }

    // Неизвестный пользователь → IllegalArgumentException (сервис не знает, чьи уведомления отдавать).
    @Test
    void getForUser_userNotFoundThrows() {
        when(userRepository.findByLoginOrEmailWithRoles("ghost")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> notificationService.getForUser("ghost"))
            .isInstanceOf(IllegalArgumentException.class);
    }

    // ─── getUnreadCount ───────────────────────────────────────────────────────

    // Счётчик непрочитанных: репозиторий возвращает 5 → ответ {count: 5}.
    // Фронтенд использует это значение для отображения бейджа на колокольчике.
    @Test
    void getUnreadCount_returnsCount() {
        when(notificationRepository.countByUserIdAndReadFalse(1L)).thenReturn(5L);

        Map<String, Long> result = notificationService.getUnreadCount("alice");

        assertThat(result).containsEntry("count", 5L);
    }

    // ─── markRead ─────────────────────────────────────────────────────────────

    // Отметить прочитанным своё уведомление: поле read должно стать true,
    // save() должен быть вызван для сохранения изменения.
    @Test
    void markRead_marksNotificationAsRead() {
        Notification n = buildNotification(10L, user, "TYPE", "Уведомление", false);
        when(notificationRepository.findById(10L)).thenReturn(Optional.of(n));
        when(notificationRepository.save(any(Notification.class))).thenAnswer(inv -> inv.getArgument(0));

        notificationService.markRead(10L, "alice");

        assertThat(n.isRead()).isTrue();
        verify(notificationRepository).save(n);
    }

    // Пользователь пытается пометить чужое уведомление: сервис молча игнорирует запрос —
    // не выбрасывает исключение (не 403, а просто no-op), и save() не вызывается.
    @Test
    void markRead_doesNotMarkOtherUsersNotification() {
        User other = User.builder().id(99L).login("other").email("other@example.com").build();
        Notification n = buildNotification(10L, other, "TYPE", "Чужое", false);
        when(notificationRepository.findById(10L)).thenReturn(Optional.of(n));

        notificationService.markRead(10L, "alice");

        assertThat(n.isRead()).isFalse();
        verify(notificationRepository, never()).save(any());
    }

    // Несуществующее уведомление → no-op, save() не вызывается (не NPE, не исключение).
    @Test
    void markRead_notificationNotFoundDoesNothing() {
        when(notificationRepository.findById(999L)).thenReturn(Optional.empty());

        notificationService.markRead(999L, "alice");

        verify(notificationRepository, never()).save(any());
    }

    // ─── markAllRead ──────────────────────────────────────────────────────────

    // Массовая отметка: сервис делегирует в репозиторий через markAllReadByUserId().
    // verify() проверяет, что делегирование произошло с правильным userId.
    @Test
    void markAllRead_callsRepositoryMethod() {
        notificationService.markAllRead("alice");

        verify(notificationRepository).markAllReadByUserId(1L);
    }

    // Неизвестный пользователь → IllegalArgumentException (нельзя отметить прочитанным для unknown user).
    @Test
    void markAllRead_userNotFoundThrows() {
        when(userRepository.findByLoginOrEmailWithRoles("ghost")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> notificationService.markAllRead("ghost"))
            .isInstanceOf(IllegalArgumentException.class);
    }

    // ─── helpers ──────────────────────────────────────────────────────────────

    // Строит тестовый Notification с заданным флагом read. Используется во всех
    // тестах markRead, чтобы не дублировать создание объекта.
    private Notification buildNotification(Long id, User user, String type, String title, boolean read) {
        return Notification.builder()
            .id(id)
            .user(user)
            .type(type)
            .title(title)
            .body("Тело уведомления")
            .link("/link")
            .read(read)
            .createdAt(OffsetDateTime.now())
            .build();
    }
}
