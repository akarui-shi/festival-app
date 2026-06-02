package com.festivalapp.backend.service;

import com.festivalapp.backend.entity.Organization;
import com.festivalapp.backend.entity.OrganizationFollow;
import com.festivalapp.backend.entity.User;
import com.festivalapp.backend.exception.BadRequestException;
import com.festivalapp.backend.exception.ResourceNotFoundException;
import com.festivalapp.backend.repository.OrganizationFollowRepository;
import com.festivalapp.backend.repository.OrganizationRepository;
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
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit-тесты для {@link OrganizationFollowService} — сервиса подписок на организации.
 * Уровень: unit. Мокируются репозитории.
 * Проверяются: подписка (follow), отписка (unfollow), статус подписки, счётчик подписчиков.
 * Ключевые инварианты: нельзя подписаться дважды, ответ всегда включает актуальный счётчик.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class OrganizationFollowServiceTest {

    @Mock private OrganizationFollowRepository followRepository;
    @Mock private OrganizationRepository organizationRepository;
    @Mock private UserRepository userRepository;

    @InjectMocks
    private OrganizationFollowService followService;

    private User user;
    private Organization org;

    // Создаём пользователя «alice» и организацию с id=10. Стабы настроены один раз
    // для всего класса, что устраняет дублирование в каждом тесте.
    @BeforeEach
    void setUp() {
        user = User.builder().id(1L).login("alice").email("alice@example.com").build();
        org = Organization.builder().id(10L).name("Festival Org").build();

        when(userRepository.findByLoginOrEmailWithRoles("alice")).thenReturn(Optional.of(user));
        when(organizationRepository.findById(10L)).thenReturn(Optional.of(org));
    }

    // ─── follow ───────────────────────────────────────────────────────────────

    // Happy-path подписки: запись сохраняется, ответ содержит following=true и актуальный счётчик.
    // verify() подтверждает, что save() был вызван (а не только проверены поля ответа).
    @Test
    void follow_savesFollowAndReturnsCount() {
        when(followRepository.existsByUserIdAndOrganizationId(1L, 10L)).thenReturn(false);
        when(followRepository.save(any(OrganizationFollow.class))).thenAnswer(inv -> inv.getArgument(0));
        when(followRepository.countByOrganizationId(10L)).thenReturn(5L);

        Map<String, Object> result = followService.follow(10L, "alice");

        assertThat(result).containsEntry("following", true);
        assertThat(result).containsEntry("followersCount", 5L);
        verify(followRepository).save(any(OrganizationFollow.class));
    }

    // Повторная подписка → BadRequestException с «подписаны»: дублирование записей недопустимо.
    @Test
    void follow_alreadyFollowingThrows() {
        when(followRepository.existsByUserIdAndOrganizationId(1L, 10L)).thenReturn(true);

        assertThatThrownBy(() -> followService.follow(10L, "alice"))
            .isInstanceOf(BadRequestException.class)
            .hasMessageContaining("подписаны");
    }

    // Несуществующая организация → ResourceNotFoundException (404, не NPE).
    @Test
    void follow_organizationNotFoundThrows() {
        when(organizationRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> followService.follow(99L, "alice"))
            .isInstanceOf(ResourceNotFoundException.class);
    }

    // Неизвестный пользователь → ResourceNotFoundException: нельзя создать запись с null userId.
    @Test
    void follow_userNotFoundThrows() {
        when(userRepository.findByLoginOrEmailWithRoles("ghost")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> followService.follow(10L, "ghost"))
            .isInstanceOf(ResourceNotFoundException.class);
    }

    // ─── unfollow ─────────────────────────────────────────────────────────────

    // Отписка: deleteByUserIdAndOrganizationId вызывается, ответ содержит following=false и счётчик.
    @Test
    void unfollow_deletesFollowAndReturnsCount() {
        when(followRepository.countByOrganizationId(10L)).thenReturn(3L);

        Map<String, Object> result = followService.unfollow(10L, "alice");

        assertThat(result).containsEntry("following", false);
        assertThat(result).containsEntry("followersCount", 3L);
        verify(followRepository).deleteByUserIdAndOrganizationId(1L, 10L);
    }

    // Неизвестный пользователь при отписке → ResourceNotFoundException.
    @Test
    void unfollow_userNotFoundThrows() {
        when(userRepository.findByLoginOrEmailWithRoles("ghost")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> followService.unfollow(10L, "ghost"))
            .isInstanceOf(ResourceNotFoundException.class);
    }

    // ─── getStatus ────────────────────────────────────────────────────────────

    // Статус подписки для пользователя, который подписан: following=true + счётчик.
    // Этот метод используется для инициализации состояния кнопки «Подписаться» на фронте.
    @Test
    void getStatus_returnsFollowingTrueWhenSubscribed() {
        when(followRepository.existsByUserIdAndOrganizationId(1L, 10L)).thenReturn(true);
        when(followRepository.countByOrganizationId(10L)).thenReturn(7L);

        Map<String, Object> result = followService.getStatus(10L, "alice");

        assertThat(result).containsEntry("following", true);
        assertThat(result).containsEntry("followersCount", 7L);
    }

    // Статус для пользователя без подписки: following=false.
    @Test
    void getStatus_returnsFollowingFalseWhenNotSubscribed() {
        when(followRepository.existsByUserIdAndOrganizationId(1L, 10L)).thenReturn(false);
        when(followRepository.countByOrganizationId(10L)).thenReturn(2L);

        Map<String, Object> result = followService.getStatus(10L, "alice");

        assertThat(result).containsEntry("following", false);
    }

    // ─── getFollowersCount ────────────────────────────────────────────────────

    // Публичный счётчик подписчиков: доступен без авторизации, только по id организации.
    @Test
    void getFollowersCount_returnsCount() {
        when(followRepository.countByOrganizationId(10L)).thenReturn(42L);

        assertThat(followService.getFollowersCount(10L)).isEqualTo(42L);
    }
}
