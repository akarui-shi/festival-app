package com.festivalapp.backend.service;

import com.festivalapp.backend.dto.PublicationCreateRequest;
import com.festivalapp.backend.dto.PublicationDetailsResponse;
import com.festivalapp.backend.entity.Event;
import com.festivalapp.backend.entity.Organization;
import com.festivalapp.backend.entity.Publication;
import com.festivalapp.backend.entity.User;
import com.festivalapp.backend.exception.BadRequestException;
import com.festivalapp.backend.exception.ResourceNotFoundException;
import com.festivalapp.backend.repository.EventImageRepository;
import com.festivalapp.backend.repository.EventRepository;
import com.festivalapp.backend.repository.ImageRepository;
import com.festivalapp.backend.repository.OrganizationMemberRepository;
import com.festivalapp.backend.repository.PublicationImageRepository;
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
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit-тесты для {@link PublicationService} — сервиса публикаций (новостей/анонсов организаций).
 * Уровень: unit. Мокируются репозитории.
 * Проверяются: создание публикации (только член организации), получение по id (только опубликованные),
 * удаление (только автор или член организации).
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class PublicationServiceTest {

    @Mock private PublicationRepository publicationRepository;
    @Mock private PublicationImageRepository publicationImageRepository;
    @Mock private ImageRepository imageRepository;
    @Mock private EventImageRepository eventImageRepository;
    @Mock private EventRepository eventRepository;
    @Mock private UserRepository userRepository;
    @Mock private OrganizationMemberRepository organizationMemberRepository;

    @InjectMocks
    private PublicationService publicationService;

    private User actor;
    private Organization organization;
    private Event event;

    // Создаём пользователя «alice», организацию и опубликованное мероприятие.
    // publicationImageRepository и eventImageRepository возвращают empty — сервис запрашивает
    // изображения при маппинге DTO, но для логических тестов они не нужны.
    @BeforeEach
    void setUp() {
        actor = User.builder().id(1L).login("alice").email("alice@example.com")
            .firstName("Alice").lastName("Smith")
            .active(true).build();

        organization = Organization.builder().id(10L).name("Test Org").build();

        event = Event.builder()
            .id(100L)
            .title("Test Event")
            .organization(organization)
            .status("опубликовано")
            .free(true)
            .startsAt(OffsetDateTime.now().plusDays(7))
            .createdAt(OffsetDateTime.now())
            .updatedAt(OffsetDateTime.now())
            .build();

        when(userRepository.findByLoginOrEmailWithRoles("alice")).thenReturn(Optional.of(actor));
        when(eventRepository.findByIdAndDeletedAtIsNull(100L)).thenReturn(Optional.of(event));
        when(publicationImageRepository.findAllByPublicationIdOrderBySortOrderAscIdAsc(anyLong()))
            .thenReturn(List.of());
        when(eventImageRepository.findFirstByEventIdAndPrimaryIsTrueOrderBySortOrderAscIdAsc(anyLong()))
            .thenReturn(Optional.empty());
    }

    // ─── create ───────────────────────────────────────────────────────────────

    // Пользователь не является членом организации, к которой относится событие →
    // BadRequestException «Недостаточно прав для публикации»: только свои организации.
    @Test
    void create_nonMemberThrowsBadRequest() {
        when(organizationMemberRepository.existsByUserIdAndOrganizationIdAndLeftAtIsNull(1L, 10L))
            .thenReturn(false);

        PublicationCreateRequest req = new PublicationCreateRequest();
        req.setTitle("Test Title");
        req.setContent("Test Content");
        req.setEventId(100L);

        assertThatThrownBy(() -> publicationService.create(req, "alice"))
            .isInstanceOf(BadRequestException.class)
            .hasMessageContaining("Недостаточно прав для публикации");
    }

    // Happy-path: член организации создаёт публикацию → статус PENDING (на модерацию),
    // publicationRepository.save() вызывается, ответ содержит title.
    @Test
    void create_memberCreatesPublication() {
        when(organizationMemberRepository.existsByUserIdAndOrganizationIdAndLeftAtIsNull(1L, 10L))
            .thenReturn(true);
        when(publicationRepository.save(any(Publication.class))).thenAnswer(inv -> {
            Publication pub = inv.getArgument(0);
            pub.setId(50L);
            return pub;
        });
        when(publicationRepository.findById(50L)).thenReturn(Optional.of(
            Publication.builder()
                .id(50L)
                .event(event)
                .organization(organization)
                .createdByUser(actor)
                .title("Test Title")
                .content("Test Content")
                .status("PENDING")
                .moderationStatus("на_рассмотрении")
                .createdAt(OffsetDateTime.now())
                .updatedAt(OffsetDateTime.now())
                .build()
        ));

        PublicationCreateRequest req = new PublicationCreateRequest();
        req.setTitle("Test Title");
        req.setContent("Test Content");
        req.setEventId(100L);

        PublicationDetailsResponse resp = publicationService.create(req, "alice");

        assertThat(resp).isNotNull();
        assertThat(resp.getTitle()).isEqualTo("Test Title");
        verify(publicationRepository).save(any(Publication.class));
    }

    // ─── getPublicById ────────────────────────────────────────────────────────

    // Публикация в статусе PENDING (ещё не одобрена) недоступна публично →
    // ResourceNotFoundException (404), чтобы не раскрывать непромодерированный контент.
    @Test
    void getPublicById_nonPublishedThrowsNotFound() {
        Publication pending = Publication.builder()
            .id(200L)
            .event(event)
            .organization(organization)
            .createdByUser(actor)
            .title("Pending Pub")
            .content("Content")
            .status("PENDING")
            .moderationStatus("на_рассмотрении")
            .createdAt(OffsetDateTime.now())
            .updatedAt(OffsetDateTime.now())
            .build();
        when(publicationRepository.findById(200L)).thenReturn(Optional.of(pending));

        assertThatThrownBy(() -> publicationService.getPublicById(200L))
            .isInstanceOf(ResourceNotFoundException.class);
    }

    // Одобренная публикация (status=PUBLISHED) доступна публично → возвращается DTO с title.
    @Test
    void getPublicById_publishedReturnsResponse() {
        Publication published = Publication.builder()
            .id(201L)
            .event(event)
            .organization(organization)
            .createdByUser(actor)
            .title("Published Pub")
            .content("Content")
            .status("PUBLISHED")
            .moderationStatus("одобрено")
            .publishedAt(OffsetDateTime.now())
            .createdAt(OffsetDateTime.now())
            .updatedAt(OffsetDateTime.now())
            .build();
        when(publicationRepository.findById(201L)).thenReturn(Optional.of(published));

        PublicationDetailsResponse resp = publicationService.getPublicById(201L);

        assertThat(resp).isNotNull();
        assertThat(resp.getTitle()).isEqualTo("Published Pub");
    }

    // ─── delete ───────────────────────────────────────────────────────────────

    // Автор публикации может её удалить: success=true, save() вызывается (мягкое удаление через поле).
    @Test
    void delete_ownerCanDelete() {
        Publication pub = Publication.builder()
            .id(300L)
            .event(event)
            .organization(organization)
            .createdByUser(actor)
            .title("To Delete")
            .content("Content")
            .status("PUBLISHED")
            .moderationStatus("одобрено")
            .createdAt(OffsetDateTime.now())
            .updatedAt(OffsetDateTime.now())
            .build();
        when(publicationRepository.findById(300L)).thenReturn(Optional.of(pub));
        when(publicationRepository.save(any(Publication.class))).thenAnswer(inv -> inv.getArgument(0));

        var result = publicationService.delete(300L, "alice");

        assertThat(result).containsEntry("success", true);
        verify(publicationRepository).save(pub);
    }

    // Чужая публикация: alice не автор и не является членом организации →
    // BadRequestException (нельзя удалять чужие публикации).
    @Test
    void delete_nonOwnerNonMemberThrowsBadRequest() {
        User otherUser = User.builder().id(99L).login("bob").email("bob@example.com").build();
        Publication pub = Publication.builder()
            .id(301L)
            .event(event)
            .organization(organization)
            .createdByUser(otherUser)
            .title("Other's Publication")
            .content("Content")
            .status("PUBLISHED")
            .moderationStatus("одобрено")
            .createdAt(OffsetDateTime.now())
            .updatedAt(OffsetDateTime.now())
            .build();
        when(publicationRepository.findById(301L)).thenReturn(Optional.of(pub));
        when(organizationMemberRepository.existsByUserIdAndOrganizationIdAndLeftAtIsNull(1L, 10L))
            .thenReturn(false);

        assertThatThrownBy(() -> publicationService.delete(301L, "alice"))
            .isInstanceOf(BadRequestException.class);
    }
}
