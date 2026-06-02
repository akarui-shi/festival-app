package com.festivalapp.backend.service;

import com.festivalapp.backend.dto.FavoriteCreateRequest;
import com.festivalapp.backend.dto.FavoriteResponse;
import com.festivalapp.backend.entity.Event;
import com.festivalapp.backend.entity.Favorite;
import com.festivalapp.backend.entity.User;
import com.festivalapp.backend.exception.BadRequestException;
import com.festivalapp.backend.exception.ResourceNotFoundException;
import com.festivalapp.backend.repository.EventImageRepository;
import com.festivalapp.backend.repository.EventRepository;
import com.festivalapp.backend.repository.FavoriteRepository;
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
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit-тесты для {@link FavoriteService} — сервиса управления избранными мероприятиями.
 * Уровень: unit. Мокируются репозитории. Проверяются: добавление в избранное,
 * защита от дублирования, получение списка и удаление. EventImageRepository мокируется,
 * чтобы сервис мог строить FavoriteResponse без обращения к S3/БД за изображением.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class FavoriteServiceTest {

    @Mock private FavoriteRepository favoriteRepository;
    @Mock private UserRepository userRepository;
    @Mock private EventRepository eventRepository;
    @Mock private EventImageRepository eventImageRepository;

    @InjectMocks
    private FavoriteService favoriteService;

    private User user;
    private Event event;

    // Создаём пользователя «alice» и опубликованное мероприятие.
    // eventImageRepository возвращает empty(), чтобы поле imageUrl в ответе было null
    // (не влияет на логику избранного, но сервис его запрашивает при маппинге).
    @BeforeEach
    void setUp() {
        user = User.builder().id(1L).login("alice").email("alice@example.com").build();
        event = Event.builder()
            .id(10L)
            .title("Джазовый фестиваль")
            .status("опубликовано")
            .free(false)
            .startsAt(OffsetDateTime.now().plusDays(5))
            .createdAt(OffsetDateTime.now())
            .updatedAt(OffsetDateTime.now())
            .build();

        when(userRepository.findByLoginOrEmailWithRoles("alice")).thenReturn(Optional.of(user));
        when(eventRepository.findByIdAndDeletedAtIsNull(10L)).thenReturn(Optional.of(event));
        when(eventImageRepository.findFirstByEventIdAndPrimaryIsTrueOrderBySortOrderAscIdAsc(any()))
            .thenReturn(Optional.empty());
    }

    // Happy-path: мероприятие не было в избранном → сохраняется, ответ содержит eventId и title.
    // verify() подтверждает, что save() был вызван (а не только проверены данные ответа).
    @Test
    void create_addsToFavorites() {
        when(favoriteRepository.existsByUserIdAndEventId(1L, 10L)).thenReturn(false);
        when(favoriteRepository.save(any(Favorite.class))).thenAnswer(inv -> {
            Favorite f = inv.getArgument(0);
            f.setId(99L);
            return f;
        });

        FavoriteCreateRequest req = new FavoriteCreateRequest();
        req.setEventId(10L);

        FavoriteResponse resp = favoriteService.create(req, "alice");

        assertThat(resp.getEventId()).isEqualTo(10L);
        assertThat(resp.getTitle()).isEqualTo("Джазовый фестиваль");
        verify(favoriteRepository).save(any(Favorite.class));
    }

    // Повторное добавление одного и того же мероприятия должно быть отклонено —
    // избранное не должно содержать дублей. BadRequestException с «уже в избранном».
    @Test
    void create_alreadyInFavoritesThrows() {
        when(favoriteRepository.existsByUserIdAndEventId(1L, 10L)).thenReturn(true);

        FavoriteCreateRequest req = new FavoriteCreateRequest();
        req.setEventId(10L);

        assertThatThrownBy(() -> favoriteService.create(req, "alice"))
            .isInstanceOf(BadRequestException.class)
            .hasMessageContaining("уже в избранном");
    }

    // Несуществующее мероприятие → ResourceNotFoundException (404), а не NPE.
    @Test
    void create_eventNotFoundThrows() {
        when(eventRepository.findByIdAndDeletedAtIsNull(99L)).thenReturn(Optional.empty());

        FavoriteCreateRequest req = new FavoriteCreateRequest();
        req.setEventId(99L);

        assertThatThrownBy(() -> favoriteService.create(req, "alice"))
            .isInstanceOf(ResourceNotFoundException.class);
    }

    // Неизвестный пользователь → ResourceNotFoundException (не аутентификационная ошибка,
    // а бизнес-проверка: юзер должен существовать в БД).
    @Test
    void create_userNotFoundThrows() {
        when(userRepository.findByLoginOrEmailWithRoles("ghost")).thenReturn(Optional.empty());

        FavoriteCreateRequest req = new FavoriteCreateRequest();
        req.setEventId(10L);

        assertThatThrownBy(() -> favoriteService.create(req, "ghost"))
            .isInstanceOf(ResourceNotFoundException.class);
    }

    // Список избранного: репозиторий возвращает один объект → DTO содержит eventId.
    // Порядок DESC по createdAt обеспечивает репозиторий, сервис только маппирует.
    @Test
    void getMyFavorites_returnsList() {
        Favorite fav = Favorite.builder().id(1L).user(user).event(event).createdAt(OffsetDateTime.now()).build();
        when(favoriteRepository.findAllByUserIdOrderByCreatedAtDesc(1L)).thenReturn(List.of(fav));

        List<FavoriteResponse> result = favoriteService.getMyFavorites("alice");

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getEventId()).isEqualTo(10L);
    }

    // Пустое избранное → пустой список (не null, не исключение).
    @Test
    void getMyFavorites_emptyListWhenNoFavorites() {
        when(favoriteRepository.findAllByUserIdOrderByCreatedAtDesc(1L)).thenReturn(List.of());

        assertThat(favoriteService.getMyFavorites("alice")).isEmpty();
    }

    // Удаление из избранного: мероприятие было добавлено → success=true,
    // verify() проверяет, что deleteByUserIdAndEventId действительно был вызван.
    @Test
    void delete_removesFavoriteSuccessfully() {
        when(favoriteRepository.existsByUserIdAndEventId(1L, 10L)).thenReturn(true);

        Map<String, Object> result = favoriteService.delete(10L, "alice");

        assertThat(result).containsEntry("success", true);
        verify(favoriteRepository).deleteByUserIdAndEventId(1L, 10L);
    }

    // Попытка удалить мероприятие, которого нет в избранном → ResourceNotFoundException.
    // Не молчаливый игнор, а явная ошибка — клиент должен знать о несоответствии состояния.
    @Test
    void delete_notInFavoritesThrows() {
        when(favoriteRepository.existsByUserIdAndEventId(1L, 10L)).thenReturn(false);

        assertThatThrownBy(() -> favoriteService.delete(10L, "alice"))
            .isInstanceOf(ResourceNotFoundException.class);
    }
}
