package com.festivalapp.backend.service;

import com.festivalapp.backend.dto.CommentCreateRequest;
import com.festivalapp.backend.dto.CommentResponse;
import com.festivalapp.backend.dto.CommentUpdateRequest;
import com.festivalapp.backend.entity.Comment;
import com.festivalapp.backend.entity.Event;
import com.festivalapp.backend.entity.Role;
import com.festivalapp.backend.entity.RoleName;
import com.festivalapp.backend.entity.User;
import com.festivalapp.backend.entity.UserRole;
import com.festivalapp.backend.exception.BadRequestException;
import com.festivalapp.backend.exception.ResourceNotFoundException;
import com.festivalapp.backend.repository.CommentRepository;
import com.festivalapp.backend.repository.EventRepository;
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
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit-тесты для {@link CommentService} — сервиса управления комментариями к мероприятиям.
 * Уровень: unit. Мокируются репозитории. Проверяются: создание, обновление, удаление комментариев,
 * права доступа (владелец/администратор vs чужой пользователь), валидация текста.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class CommentServiceTest {

    @Mock private CommentRepository commentRepository;
    @Mock private UserRepository userRepository;
    @Mock private EventRepository eventRepository;

    @InjectMocks
    private CommentService commentService;

    private User resident;
    private User admin;
    private Event event;

    // Создаём двух пользователей с разными ролями (Житель и Администратор)
    // и мероприятие в статусе «опубликовано». Стабы позволяют их находить по логину.
    @BeforeEach
    void setUp() {
        Role residentRole = Role.builder().id(1L).name("Житель").build();
        Role adminRole = Role.builder().id(3L).name("Администратор").build();

        resident = User.builder().id(1L).login("resident").email("r@example.com")
            .firstName("Иван").lastName("Иванов").active(true).build();
        UserRole residentUR = UserRole.builder().id(10L).user(resident).role(residentRole)
            .assignedAt(OffsetDateTime.now()).build();
        resident.setUserRoles(Set.of(residentUR));

        admin = User.builder().id(2L).login("admin").email("a@example.com")
            .firstName("Администратор").lastName("Системы").active(true).build();
        UserRole adminUR = UserRole.builder().id(20L).user(admin).role(adminRole)
            .assignedAt(OffsetDateTime.now()).build();
        admin.setUserRoles(Set.of(adminUR));

        event = Event.builder().id(10L).title("Фестиваль").status("опубликовано")
            .free(true).startsAt(OffsetDateTime.now()).createdAt(OffsetDateTime.now())
            .updatedAt(OffsetDateTime.now()).build();

        when(userRepository.findByLoginOrEmailWithRoles("resident")).thenReturn(Optional.of(resident));
        when(userRepository.findByLoginOrEmailWithRoles("admin")).thenReturn(Optional.of(admin));
        when(eventRepository.findByIdAndDeletedAtIsNull(10L)).thenReturn(Optional.of(event));
    }

    // Создание комментария: текст обрезается, сохраняется, ответ содержит текст, рейтинг и userId.
    // Пробелы вокруг текста должны быть удалены сервисом.
    @Test
    void create_savesCommentAndReturnsResponse() {
        when(commentRepository.save(any(Comment.class))).thenAnswer(inv -> {
            Comment c = inv.getArgument(0);
            c.setId(99L);
            return c;
        });

        CommentCreateRequest req = new CommentCreateRequest();
        req.setEventId(10L);
        req.setText("  Отличный фестиваль!  ");
        req.setRating(5);

        CommentResponse resp = commentService.create(req, "resident");

        assertThat(resp.getText()).isEqualTo("Отличный фестиваль!");
        assertThat(resp.getRating()).isEqualTo(5);
        assertThat(resp.getUserId()).isEqualTo(1L);
        verify(commentRepository).save(any(Comment.class));
    }

    // Пустой текст (только пробелы) недопустим — сервис должен выбросить BadRequestException
    // с сообщением «обязателен».
    @Test
    void create_emptyTextThrows() {
        CommentCreateRequest req = new CommentCreateRequest();
        req.setEventId(10L);
        req.setText("   ");

        assertThatThrownBy(() -> commentService.create(req, "resident"))
            .isInstanceOf(BadRequestException.class)
            .hasMessageContaining("обязателен");
    }

    // Если мероприятие не найдено — ResourceNotFoundException (404, а не 500).
    @Test
    void create_eventNotFoundThrows() {
        when(eventRepository.findByIdAndDeletedAtIsNull(99L)).thenReturn(Optional.empty());

        CommentCreateRequest req = new CommentCreateRequest();
        req.setEventId(99L);
        req.setText("Текст");

        assertThatThrownBy(() -> commentService.create(req, "resident"))
            .isInstanceOf(ResourceNotFoundException.class);
    }

    // Список комментариев к событию: возвращаются все в порядке убывания даты (DESC).
    // Проверяем размер и текст первого элемента.
    @Test
    void getByEvent_returnsAllComments() {
        Comment c1 = buildComment(1L, resident, event, "Первый комментарий");
        Comment c2 = buildComment(2L, resident, event, "Второй комментарий");
        when(commentRepository.findAllByEventIdOrderByCreatedAtDesc(10L)).thenReturn(List.of(c1, c2));

        List<CommentResponse> result = commentService.getByEvent(10L, false);

        assertThat(result).hasSize(2);
        assertThat(result.get(0).getText()).isEqualTo("Первый комментарий");
    }

    // Владелец комментария может изменить текст и рейтинг.
    @Test
    void update_ownerCanUpdateComment() {
        Comment comment = buildComment(5L, resident, event, "Старый текст");
        when(commentRepository.findById(5L)).thenReturn(Optional.of(comment));
        when(commentRepository.save(any(Comment.class))).thenAnswer(inv -> inv.getArgument(0));

        CommentUpdateRequest req = new CommentUpdateRequest();
        req.setText("Новый текст");
        req.setRating(4);

        CommentResponse resp = commentService.update(5L, req, "resident");

        assertThat(resp.getText()).isEqualTo("Новый текст");
        assertThat(resp.getRating()).isEqualTo(4);
    }

    // Администратор может редактировать чужой комментарий (права модератора).
    @Test
    void update_adminCanUpdateAnyComment() {
        Comment comment = buildComment(6L, resident, event, "Чужой комментарий");
        when(commentRepository.findById(6L)).thenReturn(Optional.of(comment));
        when(commentRepository.save(any(Comment.class))).thenAnswer(inv -> inv.getArgument(0));

        CommentUpdateRequest req = new CommentUpdateRequest();
        req.setText("Отредактировано администратором");

        CommentResponse resp = commentService.update(6L, req, "admin");

        assertThat(resp.getText()).isEqualTo("Отредактировано администратором");
    }

    // Сторонний пользователь (не владелец, не admin) не может редактировать чужой комментарий.
    // Ожидаем BadRequestException с сообщением о недостатке «прав».
    @Test
    void update_foreignUserThrows() {
        User other = User.builder().id(99L).login("other").email("o@x.com").active(true).build();
        Role r = Role.builder().id(1L).name("Житель").build();
        UserRole ur = UserRole.builder().id(99L).user(other).role(r).assignedAt(OffsetDateTime.now()).build();
        other.setUserRoles(Set.of(ur));
        when(userRepository.findByLoginOrEmailWithRoles("other")).thenReturn(Optional.of(other));

        Comment comment = buildComment(7L, resident, event, "Комментарий");
        when(commentRepository.findById(7L)).thenReturn(Optional.of(comment));

        CommentUpdateRequest req = new CommentUpdateRequest();
        req.setText("Попытка изменить чужой");

        assertThatThrownBy(() -> commentService.update(7L, req, "other"))
            .isInstanceOf(BadRequestException.class)
            .hasMessageContaining("прав");
    }

    // Удаление собственного комментария: success=true + verify, что физически вызван delete().
    @Test
    void delete_ownerCanDeleteComment() {
        Comment comment = buildComment(8L, resident, event, "Свой комментарий");
        when(commentRepository.findById(8L)).thenReturn(Optional.of(comment));

        Map<String, Object> result = commentService.delete(8L, "resident");

        assertThat(result).containsEntry("success", true);
        verify(commentRepository).delete(comment);
    }

    // Администратор может удалить любой комментарий (модерация нарушений).
    @Test
    void delete_adminCanDeleteAnyComment() {
        Comment comment = buildComment(9L, resident, event, "Плохой комментарий");
        when(commentRepository.findById(9L)).thenReturn(Optional.of(comment));

        Map<String, Object> result = commentService.delete(9L, "admin");

        assertThat(result).containsEntry("success", true);
        verify(commentRepository).delete(comment);
    }

    // Чужой пользователь не может удалить комментарий → BadRequestException «прав».
    @Test
    void delete_foreignUserThrows() {
        User other = User.builder().id(77L).login("other2").email("o2@x.com").active(true).build();
        Role r = Role.builder().id(1L).name("Житель").build();
        UserRole ur = UserRole.builder().id(77L).user(other).role(r).assignedAt(OffsetDateTime.now()).build();
        other.setUserRoles(Set.of(ur));
        when(userRepository.findByLoginOrEmailWithRoles("other2")).thenReturn(Optional.of(other));

        Comment comment = buildComment(10L, resident, event, "Ещё комментарий");
        when(commentRepository.findById(10L)).thenReturn(Optional.of(comment));

        assertThatThrownBy(() -> commentService.delete(10L, "other2"))
            .isInstanceOf(BadRequestException.class)
            .hasMessageContaining("прав");
    }

    // Удаление несуществующего комментария → ResourceNotFoundException (404).
    @Test
    void delete_commentNotFoundThrows() {
        when(commentRepository.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> commentService.delete(999L, "resident"))
            .isInstanceOf(ResourceNotFoundException.class);
    }

    // Метод для администраторов возвращает все комментарии (не фильтруя по событию или статусу).
    @Test
    void getAllForAdmin_returnsAllComments() {
        Comment c = buildComment(1L, resident, event, "Все комментарии");
        when(commentRepository.findAllByOrderByCreatedAtDesc()).thenReturn(List.of(c));

        List<CommentResponse> result = commentService.getAllForAdmin();

        assertThat(result).hasSize(1);
    }

    // ─── helpers ──────────────────────────────────────────────────────────────

    // Строит тестовый Comment с рейтингом 5 и статусом «одобрено».
    // Используется во всех тестах update/delete, чтобы не дублировать код.
    private Comment buildComment(Long id, User user, Event event, String text) {
        return Comment.builder()
            .id(id)
            .user(user)
            .event(event)
            .content(text)
            .rating(5)
            .moderationStatus("одобрено")
            .createdAt(OffsetDateTime.now())
            .updatedAt(OffsetDateTime.now())
            .build();
    }
}
