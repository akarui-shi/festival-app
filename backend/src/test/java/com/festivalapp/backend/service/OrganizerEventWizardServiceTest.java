package com.festivalapp.backend.service;

import com.festivalapp.backend.dto.OrganizerEventSessionsRequest;
import com.festivalapp.backend.dto.OrganizerEventTicketsRequest;
import com.festivalapp.backend.dto.OrganizerEventWizardCreateRequest;
import com.festivalapp.backend.dto.OrganizerEventWizardResponse;
import com.festivalapp.backend.entity.Category;
import com.festivalapp.backend.entity.City;
import com.festivalapp.backend.entity.Event;
import com.festivalapp.backend.entity.EventCategory;
import com.festivalapp.backend.entity.EventImage;
import com.festivalapp.backend.entity.Image;
import com.festivalapp.backend.entity.Organization;
import com.festivalapp.backend.entity.OrganizationMember;
import com.festivalapp.backend.entity.Role;
import com.festivalapp.backend.entity.Session;
import com.festivalapp.backend.entity.TicketType;
import com.festivalapp.backend.entity.User;
import com.festivalapp.backend.entity.UserRole;
import com.festivalapp.backend.exception.BadRequestException;
import com.festivalapp.backend.repository.ArtistImageRepository;
import com.festivalapp.backend.repository.ArtistRepository;
import com.festivalapp.backend.repository.CategoryRepository;
import com.festivalapp.backend.repository.CityRepository;
import com.festivalapp.backend.repository.EventArtistRepository;
import com.festivalapp.backend.repository.EventCategoryRepository;
import com.festivalapp.backend.repository.EventImageRepository;
import com.festivalapp.backend.repository.EventRepository;
import com.festivalapp.backend.repository.ImageRepository;
import com.festivalapp.backend.repository.OrganizationMemberRepository;
import com.festivalapp.backend.repository.OrganizationRepository;
import com.festivalapp.backend.repository.SessionRepository;
import com.festivalapp.backend.repository.TicketTypeRepository;
import com.festivalapp.backend.repository.UserRepository;
import com.festivalapp.backend.repository.VenueRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class OrganizerEventWizardServiceTest {

    @Mock private EventRepository eventRepository;
    @Mock private EventCategoryRepository eventCategoryRepository;
    @Mock private EventImageRepository eventImageRepository;
    @Mock private EventArtistRepository eventArtistRepository;
    @Mock private SessionRepository sessionRepository;
    @Mock private TicketTypeRepository ticketTypeRepository;

    @Mock private OrganizationRepository organizationRepository;
    @Mock private OrganizationMemberRepository organizationMemberRepository;
    @Mock private UserRepository userRepository;
    @Mock private CityRepository cityRepository;
    @Mock private CategoryRepository categoryRepository;
    @Mock private ArtistRepository artistRepository;
    @Mock private ArtistImageRepository artistImageRepository;
    @Mock private VenueRepository venueRepository;
    @Mock private ImageRepository imageRepository;

    @Mock private AdminAuditService adminAuditService;

    @InjectMocks
    private OrganizerEventWizardService wizardService;

    private User actor;
    private City city;
    private Organization ownedOrganization;

    @BeforeEach
    void setUp() {
        actor = organizerUser(10L);
        city = City.builder().id(1L).name("Москва").active(true).build();
        ownedOrganization = Organization.builder().id(100L).name("Орг 1").city(city).build();

        when(userRepository.findByLoginOrEmailWithRoles(eq("organizer"))).thenReturn(Optional.of(actor));
        when(cityRepository.findById(city.getId())).thenReturn(Optional.of(city));

        when(eventCategoryRepository.findAllByEventId(anyLong())).thenReturn(List.of());
        when(eventImageRepository.findAllByEventIdOrderBySortOrderAscIdAsc(anyLong())).thenReturn(List.of());
        when(eventArtistRepository.findAllByEventIdOrderByDisplayOrderAscIdAsc(anyLong())).thenReturn(List.of());
        when(sessionRepository.findAllByEventIdOrderByStartsAtAsc(anyLong())).thenReturn(List.of());
        when(ticketTypeRepository.findAllBySessionIdOrderByIdAsc(anyLong())).thenReturn(List.of());

        AtomicLong ids = new AtomicLong(500);
        when(eventRepository.save(any(Event.class))).thenAnswer(invocation -> {
            Event event = invocation.getArgument(0);
            if (event.getId() == null) {
                event.setId(ids.incrementAndGet());
            }
            return event;
        });
    }

    @Test
    void createDraft_allowsOrganizerInOwnedOrganization() {
        when(organizationMemberRepository.findAllByUserIdAndLeftAtIsNull(actor.getId())).thenReturn(List.of(
            OrganizationMember.builder().organization(ownedOrganization).organizationStatus("владелец").build()
        ));

        OrganizerEventWizardCreateRequest request = new OrganizerEventWizardCreateRequest();
        request.setTitle("Новый ивент");

        OrganizerEventWizardResponse response = wizardService.createDraft(request, "organizer");

        assertThat(response.getEventId()).isNotNull();
        assertThat(response.getOrganizationId()).isEqualTo(ownedOrganization.getId());
        assertThat(response.getTitle()).isEqualTo("Новый ивент");
        verify(adminAuditService).log(eq("organizer"), eq("EVENT_DRAFT_CREATED"), eq("Event"), anyLong(), eq("organizationId=100"));
    }

    @Test
    void createDraft_rejectsWhenOrganizerHasMultipleOrganizations() {
        Organization secondOrganization = Organization.builder().id(101L).name("Орг 2").city(city).build();
        when(organizationMemberRepository.findAllByUserIdAndLeftAtIsNull(actor.getId())).thenReturn(List.of(
            OrganizationMember.builder().organization(ownedOrganization).organizationStatus("владелец").build(),
            OrganizationMember.builder().organization(secondOrganization).organizationStatus("администратор").build()
        ));

        OrganizerEventWizardCreateRequest request = new OrganizerEventWizardCreateRequest();

        assertThatThrownBy(() -> wizardService.createDraft(request, "organizer"))
            .isInstanceOf(BadRequestException.class)
            .hasMessageContaining("ровно в одной");
    }

    @Test
    void updateSessions_createsSessionForManagedEvent() {
        Event event = managedEvent(700L, ownedOrganization, city);
        when(eventRepository.findByIdForUpdate(event.getId())).thenReturn(Optional.of(event));
        when(organizationMemberRepository.existsByUserIdAndOrganizationIdAndLeftAtIsNull(actor.getId(), ownedOrganization.getId())).thenReturn(true);
        when(sessionRepository.findAllByEventIdOrderByStartsAtAsc(event.getId()))
            .thenReturn(List.of())
            .thenReturn(List.of(Session.builder().id(900L).event(event).startsAt(OffsetDateTime.now()).build()))
            .thenReturn(List.of(Session.builder().id(900L).event(event).startsAt(OffsetDateTime.now()).build()));

        when(sessionRepository.save(any(Session.class))).thenAnswer(invocation -> {
            Session session = invocation.getArgument(0);
            if (session.getId() == null) {
                session.setId(900L);
            }
            return session;
        });

        OrganizerEventSessionsRequest request = new OrganizerEventSessionsRequest();
        OrganizerEventSessionsRequest.SessionItem item = new OrganizerEventSessionsRequest.SessionItem();
        item.setSessionTitle("Утренний сеанс");
        item.setStartsAt(LocalDateTime.of(2026, 5, 20, 10, 0));
        item.setEndsAt(LocalDateTime.of(2026, 5, 20, 12, 0));
        item.setManualAddress("Москва, Тверская, 1");
        item.setCityId(city.getId());
        item.setCityName(city.getName());
        item.setCityRegion(city.getRegion());
        item.setLatitude(new BigDecimal("55.751244"));
        item.setLongitude(new BigDecimal("37.618423"));
        item.setSeatLimit(120);
        request.setSessions(List.of(item));

        OrganizerEventWizardResponse response = wizardService.updateSessions(event.getId(), request, "organizer");

        assertThat(response.getSessions()).isNotEmpty();
        verify(sessionRepository).save(any(Session.class));
    }

    @Test
    void updateTickets_createsTicketTypeInSession() {
        Event event = managedEvent(701L, ownedOrganization, city);
        Session session = Session.builder()
            .id(1000L)
            .event(event)
            .startsAt(LocalDateTime.of(2026, 5, 30, 18, 0).atOffset(ZoneOffset.UTC))
            .endsAt(LocalDateTime.of(2026, 5, 30, 20, 0).atOffset(ZoneOffset.UTC))
            .seatLimit(100)
            .status("запланирован")
            .build();

        when(eventRepository.findByIdForUpdate(event.getId())).thenReturn(Optional.of(event));
        when(organizationMemberRepository.existsByUserIdAndOrganizationIdAndLeftAtIsNull(actor.getId(), ownedOrganization.getId())).thenReturn(true);
        when(sessionRepository.findAllByEventIdOrderByStartsAtAsc(event.getId())).thenReturn(List.of(session));

        AtomicReference<TicketType> savedTypeRef = new AtomicReference<>();
        when(ticketTypeRepository.findAllBySessionIdOrderByIdAsc(session.getId())).thenAnswer(invocation -> {
            TicketType saved = savedTypeRef.get();
            return saved == null ? List.of() : List.of(saved);
        });

        when(ticketTypeRepository.save(any(TicketType.class))).thenAnswer(invocation -> {
            TicketType ticketType = invocation.getArgument(0);
            if (ticketType.getId() == null) {
                ticketType.setId(2000L);
            }
            savedTypeRef.set(ticketType);
            return ticketType;
        });

        OrganizerEventTicketsRequest request = new OrganizerEventTicketsRequest();
        OrganizerEventTicketsRequest.TicketTypeItem type = new OrganizerEventTicketsRequest.TicketTypeItem();
        type.setName("Стандарт");
        type.setPrice(new BigDecimal("900"));
        type.setCurrency("RUB");
        type.setQuota(80);

        OrganizerEventTicketsRequest.SessionTicketsItem sessionTicketsItem = new OrganizerEventTicketsRequest.SessionTicketsItem();
        sessionTicketsItem.setSessionId(session.getId());
        sessionTicketsItem.setTicketTypes(List.of(type));
        request.setSessionTickets(List.of(sessionTicketsItem));

        OrganizerEventWizardResponse response = wizardService.updateTickets(event.getId(), request, "organizer");

        assertThat(response.getSessions()).hasSize(1);
        assertThat(response.getSessions().get(0).getTicketTypes()).hasSize(1);
        verify(ticketTypeRepository).save(any(TicketType.class));
    }

    @Test
    void submitForModeration_rejectsWhenRequiredDataMissing() {
        Event event = managedEvent(702L, ownedOrganization, city);
        when(eventRepository.findByIdForUpdate(event.getId())).thenReturn(Optional.of(event));
        when(organizationMemberRepository.existsByUserIdAndOrganizationIdAndLeftAtIsNull(actor.getId(), ownedOrganization.getId())).thenReturn(true);

        assertThatThrownBy(() -> wizardService.submitForModeration(event.getId(), "organizer"))
            .isInstanceOf(BadRequestException.class)
            .hasMessageContaining("не готово");

        verify(eventRepository, never()).save(event);
    }

    @Test
    void submitForModeration_succeedsWithValidData() {
        Event event = managedEvent(703L, ownedOrganization, city);
        when(eventRepository.findByIdForUpdate(event.getId())).thenReturn(Optional.of(event));
        when(organizationMemberRepository.existsByUserIdAndOrganizationIdAndLeftAtIsNull(actor.getId(), ownedOrganization.getId())).thenReturn(true);

        Category category = Category.builder().id(1L).name("Концерты").build();
        when(eventCategoryRepository.findAllByEventId(event.getId())).thenReturn(List.of(
            EventCategory.builder().event(event).category(category).build()
        ));

        Image image = Image.builder().id(11L).fileUrl("/api/files/11").build();
        when(eventImageRepository.findAllByEventIdOrderBySortOrderAscIdAsc(event.getId())).thenReturn(List.of(
            EventImage.builder().event(event).image(image).primary(true).sortOrder(0).build()
        ));

        Session session = Session.builder()
            .id(3000L)
            .event(event)
            .startsAt(LocalDateTime.of(2026, 6, 10, 19, 0).atOffset(ZoneOffset.UTC))
            .endsAt(LocalDateTime.of(2026, 6, 10, 21, 0).atOffset(ZoneOffset.UTC))
            .manualAddress("Москва, Арбат, 12")
            .seatLimit(100)
            .status("запланирован")
            .build();
        when(sessionRepository.findAllByEventIdOrderByStartsAtAsc(event.getId())).thenReturn(List.of(session));

        when(ticketTypeRepository.findAllBySessionIdOrderByIdAsc(session.getId())).thenReturn(List.of(
            TicketType.builder()
                .id(5000L)
                .session(session)
                .name("Стандарт")
                .price(BigDecimal.ZERO)
                .currency("RUB")
                .quota(80)
                .active(true)
                .build()
        ));

        OrganizerEventWizardResponse response = wizardService.submitForModeration(event.getId(), "organizer");

        assertThat(response.isReadyForModeration()).isTrue();
        verify(eventRepository).save(event);
    }

    private static Event managedEvent(Long eventId, Organization organization, City cityValue) {
        return Event.builder()
            .id(eventId)
            .organization(organization)
            .city(cityValue)
            .title("Событие")
            .status("черновик")
            .moderationStatus("на_рассмотрении")
            .free(true)
            .startsAt(OffsetDateTime.now().plusDays(7))
            .endsAt(OffsetDateTime.now().plusDays(7).plusHours(2))
            .createdAt(OffsetDateTime.now())
            .updatedAt(OffsetDateTime.now())
            .build();
    }

    private static User organizerUser(Long userId) {
        Role organizerRole = Role.builder().id(1L).name("Организатор").build();
        User user = User.builder()
            .id(userId)
            .login("organizer")
            .email("organizer@example.com")
            .firstName("Org")
            .lastName("User")
            .active(true)
            .build();

        Set<UserRole> roles = new HashSet<>();
        roles.add(UserRole.builder().id(1L).user(user).role(organizerRole).assignedAt(OffsetDateTime.now()).build());
        user.setUserRoles(roles);
        return user;
    }
}
