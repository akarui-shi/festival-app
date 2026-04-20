package com.festivalapp.backend.service;

import com.festivalapp.backend.dto.CategoryResponse;
import com.festivalapp.backend.dto.OrganizerEventArtistsRequest;
import com.festivalapp.backend.dto.OrganizerEventBasicInfoRequest;
import com.festivalapp.backend.dto.OrganizerEventCategoriesRequest;
import com.festivalapp.backend.dto.OrganizerEventImagesRequest;
import com.festivalapp.backend.dto.OrganizerEventSessionsRequest;
import com.festivalapp.backend.dto.OrganizerEventTicketsRequest;
import com.festivalapp.backend.dto.OrganizerEventWizardCreateRequest;
import com.festivalapp.backend.dto.OrganizerEventWizardResponse;
import com.festivalapp.backend.dto.OrganizerEventWizardValidationIssue;
import com.festivalapp.backend.dto.OrganizerOrganizationOptionResponse;
import com.festivalapp.backend.entity.Artist;
import com.festivalapp.backend.entity.ArtistImage;
import com.festivalapp.backend.entity.Category;
import com.festivalapp.backend.entity.City;
import com.festivalapp.backend.entity.Event;
import com.festivalapp.backend.entity.EventArtist;
import com.festivalapp.backend.entity.EventCategory;
import com.festivalapp.backend.entity.EventImage;
import com.festivalapp.backend.entity.Image;
import com.festivalapp.backend.entity.Organization;
import com.festivalapp.backend.entity.OrganizationMember;
import com.festivalapp.backend.entity.RoleName;
import com.festivalapp.backend.entity.Session;
import com.festivalapp.backend.entity.TicketType;
import com.festivalapp.backend.entity.User;
import com.festivalapp.backend.entity.Venue;
import com.festivalapp.backend.exception.BadRequestException;
import com.festivalapp.backend.exception.ResourceNotFoundException;
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
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class OrganizerEventWizardService {

    private final EventRepository eventRepository;
    private final EventCategoryRepository eventCategoryRepository;
    private final EventImageRepository eventImageRepository;
    private final EventArtistRepository eventArtistRepository;
    private final SessionRepository sessionRepository;
    private final TicketTypeRepository ticketTypeRepository;

    private final OrganizationRepository organizationRepository;
    private final OrganizationMemberRepository organizationMemberRepository;
    private final UserRepository userRepository;
    private final CityRepository cityRepository;
    private final CategoryRepository categoryRepository;
    private final ArtistRepository artistRepository;
    private final ArtistImageRepository artistImageRepository;
    private final VenueRepository venueRepository;
    private final ImageRepository imageRepository;

    private final AdminAuditService adminAuditService;

    @Transactional(readOnly = true)
    public List<OrganizerOrganizationOptionResponse> getAvailableOrganizations(String actorIdentifier) {
        User actor = resolveOrganizer(actorIdentifier);
        return organizationMemberRepository.findAllByUserIdAndLeftAtIsNull(actor.getId()).stream()
            .filter(member -> member.getOrganization() != null && member.getOrganization().getDeletedAt() == null)
            .sorted(Comparator.comparing(member -> member.getOrganization().getName(), String.CASE_INSENSITIVE_ORDER))
            .map(member -> OrganizerOrganizationOptionResponse.builder()
                .id(member.getOrganization().getId())
                .name(member.getOrganization().getName())
                .membershipStatus(member.getOrganizationStatus())
                .cityId(member.getOrganization().getCity() == null ? null : member.getOrganization().getCity().getId())
                .cityName(member.getOrganization().getCity() == null ? null : member.getOrganization().getCity().getName())
                .build())
            .toList();
    }

    @Transactional
    public OrganizerEventWizardResponse createDraft(OrganizerEventWizardCreateRequest request, String actorIdentifier) {
        User actor = resolveOrganizer(actorIdentifier);
        Organization organization = resolveManagedOrganization(actor);

        City city = organization.getCity();
        if (city == null) {
            throw new BadRequestException("У организации организатора не указан город");
        }
        String title = request == null ? null : request.getTitle();
        OffsetDateTime now = OffsetDateTime.now();

        Event event = eventRepository.save(Event.builder()
            .organization(organization)
            .createdByUser(actor)
            .city(city)
            .title(StringUtils.hasText(title) ? title.trim() : "Черновик мероприятия")
            .shortDescription(null)
            .fullDescription(null)
            .ageRestriction(null)
            .free(true)
            .startsAt(now.plusDays(7))
            .endsAt(now.plusDays(7).plusHours(2))
            .status("черновик")
            .moderationStatus("на_рассмотрении")
            .createdAt(now)
            .updatedAt(now)
            .build());

        adminAuditService.log(actorIdentifier, "EVENT_DRAFT_CREATED", "Event", event.getId(), "organizationId=" + organization.getId());
        return buildWizardState(event);
    }

    @Transactional(readOnly = true)
    public OrganizerEventWizardResponse getWizardState(Long eventId, String actorIdentifier) {
        User actor = resolveOrganizer(actorIdentifier);
        Event event = loadManagedEvent(eventId, actor);
        return buildWizardState(event);
    }

    @Transactional
    public OrganizerEventWizardResponse updateBasicInfo(Long eventId,
                                                        OrganizerEventBasicInfoRequest request,
                                                        String actorIdentifier) {
        User actor = resolveOrganizer(actorIdentifier);
        Event event = loadManagedEventForUpdate(eventId, actor);

        if (request.getTitle() != null) {
            event.setTitle(normalizeRequired(request.getTitle(), "Название мероприятия обязательно"));
        }
        if (request.getShortDescription() != null) {
            event.setShortDescription(normalizeOptional(request.getShortDescription()));
        }
        if (request.getFullDescription() != null) {
            event.setFullDescription(normalizeOptional(request.getFullDescription()));
        }
        if (request.getAgeRestriction() != null) {
            event.setAgeRestriction(normalizeOptional(request.getAgeRestriction()));
        }

        event.setUpdatedAt(OffsetDateTime.now());
        Event saved = eventRepository.save(event);
        adminAuditService.log(actorIdentifier, "EVENT_BASIC_INFO_UPDATED", "Event", saved.getId(), "updated step 1");
        return buildWizardState(saved);
    }

    @Transactional
    public OrganizerEventWizardResponse updateCategories(Long eventId,
                                                         OrganizerEventCategoriesRequest request,
                                                         String actorIdentifier) {
        User actor = resolveOrganizer(actorIdentifier);
        Event event = loadManagedEventForUpdate(eventId, actor);

        Set<Long> categoryIds = request == null || request.getCategoryIds() == null
            ? Set.of()
            : new LinkedHashSet<>(request.getCategoryIds());

        List<Category> categories = categoryIds.isEmpty() ? List.of() : categoryRepository.findAllById(categoryIds);
        if (categories.size() != categoryIds.size()) {
            throw new BadRequestException("Некоторые категории не найдены");
        }

        eventCategoryRepository.deleteByEventId(event.getId());
        for (Category category : categories) {
            eventCategoryRepository.save(EventCategory.builder()
                .event(event)
                .category(category)
                .build());
        }

        event.setUpdatedAt(OffsetDateTime.now());
        eventRepository.save(event);
        adminAuditService.log(actorIdentifier, "EVENT_CATEGORIES_UPDATED", "Event", event.getId(), "count=" + categories.size());
        return buildWizardState(event);
    }

    @Transactional
    public OrganizerEventWizardResponse updateImages(Long eventId,
                                                     OrganizerEventImagesRequest request,
                                                     String actorIdentifier) {
        User actor = resolveOrganizer(actorIdentifier);
        Event event = loadManagedEventForUpdate(eventId, actor);

        List<OrganizerEventImagesRequest.ImageItem> items = request == null || request.getImages() == null
            ? List.of()
            : request.getImages();

        Set<Long> duplicateProtection = new HashSet<>();
        long primaryCount = items.stream().filter(item -> Boolean.TRUE.equals(item.getPrimary())).count();
        if (primaryCount > 1) {
            throw new BadRequestException("У мероприятия может быть только одно главное изображение");
        }

        eventImageRepository.deleteByEventId(event.getId());

        boolean primaryAssigned = false;
        int sortOrder = 0;
        for (OrganizerEventImagesRequest.ImageItem item : items) {
            Image image = resolveImage(item.getImageId());
            if (image == null) {
                continue;
            }

            if (duplicateProtection.contains(image.getId())) {
                throw new BadRequestException("Изображение не может быть добавлено дважды");
            }
            duplicateProtection.add(image.getId());

            boolean primary = Boolean.TRUE.equals(item.getPrimary());
            if (primary && primaryAssigned) {
                primary = false;
            }
            if (!primaryAssigned && !primary && items.size() == 1) {
                primary = true;
            }
            if (primary) {
                primaryAssigned = true;
            }

            eventImageRepository.save(EventImage.builder()
                .event(event)
                .image(image)
                .primary(primary)
                .sortOrder(sortOrder)
                .build());
            sortOrder++;
        }

        if (!primaryAssigned && !items.isEmpty()) {
            eventImageRepository.findAllByEventIdOrderBySortOrderAscIdAsc(event.getId()).stream().findFirst().ifPresent(image -> {
                image.setPrimary(true);
                eventImageRepository.save(image);
            });
        }

        event.setUpdatedAt(OffsetDateTime.now());
        eventRepository.save(event);
        adminAuditService.log(actorIdentifier, "EVENT_IMAGES_UPDATED", "Event", event.getId(), "count=" + items.size());
        return buildWizardState(event);
    }

    @Transactional
    public OrganizerEventWizardResponse updateArtists(Long eventId,
                                                      OrganizerEventArtistsRequest request,
                                                      String actorIdentifier) {
        User actor = resolveOrganizer(actorIdentifier);
        Event event = loadManagedEventForUpdate(eventId, actor);

        List<OrganizerEventArtistsRequest.ExistingArtistItem> existingItems = request == null || request.getArtists() == null
            ? List.of()
            : request.getArtists();

        List<Long> artistIds = new ArrayList<>();
        Set<Long> uniqueArtistIds = new HashSet<>();
        for (OrganizerEventArtistsRequest.ExistingArtistItem item : existingItems) {
            if (item.getArtistId() == null) {
                throw new BadRequestException("artistId обязателен для существующего артиста");
            }
            if (!uniqueArtistIds.add(item.getArtistId())) {
                throw new BadRequestException("Один и тот же артист не может быть добавлен дважды");
            }
            artistIds.add(item.getArtistId());
        }

        Map<Long, Artist> artistsById = artistRepository.findAllById(artistIds).stream()
            .filter(artist -> artist.getDeletedAt() == null)
            .collect(Collectors.toMap(Artist::getId, Function.identity()));
        if (artistsById.size() != artistIds.size()) {
            throw new ResourceNotFoundException("Artist not found");
        }

        List<EventArtist> currentLinks = eventArtistRepository.findAllByEventIdOrderByDisplayOrderAscIdAsc(event.getId());
        Map<Long, EventArtist> currentByArtistId = currentLinks.stream()
            .filter(link -> link.getArtist() != null && link.getArtist().getId() != null)
            .collect(Collectors.toMap(link -> link.getArtist().getId(), Function.identity(), (left, right) -> left, LinkedHashMap::new));

        Set<Long> requestedSet = new HashSet<>(artistIds);
        List<EventArtist> toDelete = currentLinks.stream()
            .filter(link -> link.getArtist() == null || link.getArtist().getId() == null || !requestedSet.contains(link.getArtist().getId()))
            .toList();
        if (!toDelete.isEmpty()) {
            eventArtistRepository.deleteAllInBatch(toDelete);
            eventArtistRepository.flush();
        }

        List<EventArtist> toSave = new ArrayList<>();
        for (int index = 0; index < artistIds.size(); index++) {
            Long artistId = artistIds.get(index);
            EventArtist link = currentByArtistId.get(artistId);
            if (link == null) {
                link = EventArtist.builder()
                    .event(event)
                    .artist(artistsById.get(artistId))
                    .eventRole("artist")
                    .displayOrder(index)
                    .build();
            } else {
                link.setArtist(artistsById.get(artistId));
                link.setDisplayOrder(index);
                if (!StringUtils.hasText(link.getEventRole())) {
                    link.setEventRole("artist");
                }
            }
            toSave.add(link);
        }
        if (!toSave.isEmpty()) {
            eventArtistRepository.saveAll(toSave);
        }

        event.setUpdatedAt(OffsetDateTime.now());
        eventRepository.save(event);
        adminAuditService.log(actorIdentifier, "EVENT_ARTISTS_UPDATED", "Event", event.getId(), "count=" + toSave.size());
        return buildWizardState(event);
    }

    @Transactional
    public OrganizerEventWizardResponse updateSessions(Long eventId,
                                                       OrganizerEventSessionsRequest request,
                                                       String actorIdentifier) {
        User actor = resolveOrganizer(actorIdentifier);
        Event event = loadManagedEventForUpdate(eventId, actor);

        List<OrganizerEventSessionsRequest.SessionItem> items = request == null || request.getSessions() == null
            ? List.of()
            : request.getSessions();

        Map<Long, Session> existing = sessionRepository.findAllByEventIdOrderByStartsAtAsc(event.getId()).stream()
            .collect(LinkedHashMap::new, (map, session) -> map.put(session.getId(), session), Map::putAll);

        Set<Long> keepIds = new HashSet<>();
        City derivedEventCity = null;

        for (OrganizerEventSessionsRequest.SessionItem item : items) {
            validateSessionItem(item);

            Session session;
            if (item.getId() != null) {
                session = existing.get(item.getId());
                if (session == null) {
                    throw new BadRequestException("Сеанс не принадлежит мероприятию");
                }
            } else {
                session = Session.builder()
                    .event(event)
                    .createdAt(OffsetDateTime.now())
                    .build();
            }

            Venue venue = null;
            if (item.getVenueId() != null) {
                venue = venueRepository.findById(item.getVenueId())
                    .orElseThrow(() -> new ResourceNotFoundException("Venue not found"));
                if (!venue.isActive()) {
                    throw new BadRequestException("Выбранная площадка неактивна");
                }
            }

            City sessionCity = resolveSessionCity(item, venue);
            if (sessionCity != null) {
                if (derivedEventCity == null) {
                    derivedEventCity = sessionCity;
                } else if (!Objects.equals(derivedEventCity.getId(), sessionCity.getId())) {
                    throw new BadRequestException("Все сеансы мероприятия должны быть в одном городе");
                }
            }

            session.setSessionTitle(normalizeOptional(item.getSessionTitle()));
            session.setStartsAt(toSystemOffset(item.getStartsAt()));
            session.setEndsAt(item.getEndsAt() == null ? null : toSystemOffset(item.getEndsAt()));
            session.setVenue(venue);
            session.setManualAddress(venue == null ? normalizeOptional(item.getManualAddress()) : null);
            session.setLatitude(venue == null ? item.getLatitude() : null);
            session.setLongitude(venue == null ? item.getLongitude() : null);
            session.setSeatLimit(item.getSeatLimit());
            if (!StringUtils.hasText(session.getStatus())) {
                session.setStatus("запланирован");
            }
            session.setUpdatedAt(OffsetDateTime.now());

            Session saved = sessionRepository.save(session);
            keepIds.add(saved.getId());
        }

        for (Session old : existing.values()) {
            if (!keepIds.contains(old.getId())) {
                sessionRepository.delete(old);
            }
        }

        if (derivedEventCity != null) {
            event.setCity(derivedEventCity);
        }

        refreshEventTimelineAndPrice(event);
        adminAuditService.log(actorIdentifier, "EVENT_SESSIONS_UPDATED", "Event", event.getId(), "count=" + keepIds.size());
        return buildWizardState(event);
    }

    @Transactional
    public OrganizerEventWizardResponse updateTickets(Long eventId,
                                                      OrganizerEventTicketsRequest request,
                                                      String actorIdentifier) {
        User actor = resolveOrganizer(actorIdentifier);
        Event event = loadManagedEventForUpdate(eventId, actor);

        Map<Long, Session> sessions = sessionRepository.findAllByEventIdOrderByStartsAtAsc(event.getId()).stream()
            .collect(LinkedHashMap::new, (map, session) -> map.put(session.getId(), session), Map::putAll);

        List<OrganizerEventTicketsRequest.SessionTicketsItem> sessionTickets = request == null || request.getSessionTickets() == null
            ? List.of()
            : request.getSessionTickets();
        OffsetDateTime nowUtc = OffsetDateTime.now();

        boolean freeEvent = request != null && Boolean.TRUE.equals(request.getFreeEvent());
        if (freeEvent) {
            for (Session session : sessions.values()) {
                List<TicketType> existingTypes = ticketTypeRepository.findAllBySessionIdOrderByIdAsc(session.getId());
                TicketType freeType = existingTypes.stream()
                    .findFirst()
                    .orElseGet(() -> TicketType.builder().session(session).build());

                Integer quota = session.getSeatLimit() != null && session.getSeatLimit() > 0
                    ? session.getSeatLimit()
                    : 1000;
                OffsetDateTime salesEndAt = session.getStartsAt() == null ? nowUtc : session.getStartsAt();
                if (salesEndAt.isBefore(nowUtc)) {
                    salesEndAt = nowUtc;
                }

                freeType.setName("Стандарт");
                freeType.setPrice(BigDecimal.ZERO);
                freeType.setCurrency("RUB");
                freeType.setQuota(quota);
                freeType.setActive(true);
                freeType.setSalesStartAt(nowUtc);
                freeType.setSalesEndAt(salesEndAt);
                TicketType saved = ticketTypeRepository.save(freeType);

                for (TicketType existingType : existingTypes) {
                    if (!Objects.equals(existingType.getId(), saved.getId())) {
                        ticketTypeRepository.delete(existingType);
                    }
                }
            }
            refreshEventTimelineAndPrice(event);
            adminAuditService.log(actorIdentifier, "EVENT_TICKETS_UPDATED", "Event", event.getId(), "mode=free");
            return buildWizardState(event);
        }

        Map<Long, OrganizerEventTicketsRequest.SessionTicketsItem> requestedBySession = new HashMap<>();
        for (OrganizerEventTicketsRequest.SessionTicketsItem sessionItem : sessionTickets) {
            if (sessionItem.getSessionId() == null) {
                throw new BadRequestException("sessionId обязателен");
            }
            Session session = sessions.get(sessionItem.getSessionId());
            if (session == null) {
                throw new BadRequestException("Сеанс не принадлежит мероприятию");
            }
            if (requestedBySession.put(sessionItem.getSessionId(), sessionItem) != null) {
                throw new BadRequestException("Дублирование sessionId в шаге билетов");
            }
        }

        for (Session session : sessions.values()) {
            OrganizerEventTicketsRequest.SessionTicketsItem sessionItem = requestedBySession.get(session.getId());

            List<OrganizerEventTicketsRequest.TicketTypeItem> requestedTypes = sessionItem == null || sessionItem.getTicketTypes() == null
                ? List.of()
                : sessionItem.getTicketTypes();

            Map<Long, TicketType> existingTypes = ticketTypeRepository.findAllBySessionIdOrderByIdAsc(session.getId()).stream()
                .collect(LinkedHashMap::new, (map, type) -> map.put(type.getId(), type), Map::putAll);
            Set<Long> keepIds = new HashSet<>();

            for (OrganizerEventTicketsRequest.TicketTypeItem item : requestedTypes) {
                validateTicketTypeItem(item, true);

                TicketType type;
                if (item.getId() != null) {
                    type = existingTypes.get(item.getId());
                    if (type == null) {
                        throw new BadRequestException("Тип билета не принадлежит указанному сеансу");
                    }
                } else {
                    type = TicketType.builder().session(session).build();
                }

                BigDecimal price = item.getPrice() == null ? BigDecimal.ZERO : item.getPrice();
                type.setName(normalizeRequired(item.getName(), "Название типа билета обязательно"));
                type.setPrice(price);
                type.setCurrency("RUB");
                type.setQuota(item.getQuota());
                type.setActive(true);

                OffsetDateTime salesStartAt = item.getSalesStartAt() == null
                    ? nowUtc
                    : toSystemOffset(item.getSalesStartAt());
                OffsetDateTime salesEndAt = item.getSalesEndAt() == null
                    ? session.getStartsAt()
                    : toSystemOffset(item.getSalesEndAt());
                if (salesEndAt == null) {
                    salesEndAt = salesStartAt;
                }
                if (salesEndAt.isBefore(salesStartAt)) {
                    throw new BadRequestException("Дата окончания регистрации не может быть раньше даты начала");
                }
                type.setSalesStartAt(salesStartAt);
                type.setSalesEndAt(salesEndAt);

                TicketType saved = ticketTypeRepository.save(type);
                keepIds.add(saved.getId());
            }

            for (TicketType existingType : existingTypes.values()) {
                if (!keepIds.contains(existingType.getId())) {
                    ticketTypeRepository.delete(existingType);
                }
            }
        }

        refreshEventTimelineAndPrice(event);
        event.setFree(false);
        event.setUpdatedAt(OffsetDateTime.now());
        eventRepository.save(event);
        adminAuditService.log(actorIdentifier, "EVENT_TICKETS_UPDATED", "Event", event.getId(), "mode=paid");
        return buildWizardState(event);
    }

    @Transactional
    public OrganizerEventWizardResponse saveAsDraft(Long eventId, String actorIdentifier) {
        User actor = resolveOrganizer(actorIdentifier);
        Event event = loadManagedEventForUpdate(eventId, actor);

        event.setStatus("черновик");
        event.setUpdatedAt(OffsetDateTime.now());
        eventRepository.save(event);

        adminAuditService.log(actorIdentifier, "EVENT_DRAFT_SAVED", "Event", event.getId(), "saved as draft");
        return buildWizardState(event);
    }

    @Transactional(readOnly = true)
    public OrganizerEventWizardResponse getPreview(Long eventId, String actorIdentifier) {
        User actor = resolveOrganizer(actorIdentifier);
        Event event = loadManagedEvent(eventId, actor);
        return buildWizardState(event);
    }

    @Transactional
    public OrganizerEventWizardResponse submitForModeration(Long eventId, String actorIdentifier) {
        User actor = resolveOrganizer(actorIdentifier);
        Event event = loadManagedEventForUpdate(eventId, actor);

        List<OrganizerEventWizardValidationIssue> issues = collectValidationIssues(event);
        if (!issues.isEmpty()) {
            throw new BadRequestException("Мероприятие не готово к модерации: " + issues.get(0).getMessage());
        }

        event.setStatus("черновик");
        event.setModerationStatus("на_рассмотрении");
        event.setUpdatedAt(OffsetDateTime.now());
        eventRepository.save(event);

        adminAuditService.log(actorIdentifier, "EVENT_SUBMITTED_FOR_MODERATION", "Event", event.getId(), "ready=true");
        return buildWizardState(event);
    }

    private OrganizerEventWizardResponse buildWizardState(Event event) {
        List<EventCategory> eventCategories = eventCategoryRepository.findAllByEventId(event.getId());
        List<EventImage> eventImages = eventImageRepository.findAllByEventIdOrderBySortOrderAscIdAsc(event.getId());
        List<EventArtist> eventArtists = eventArtistRepository.findAllByEventIdOrderByDisplayOrderAscIdAsc(event.getId());
        List<Session> sessions = sessionRepository.findAllByEventIdOrderByStartsAtAsc(event.getId());

        Map<Long, List<TicketType>> ticketTypesBySession = new HashMap<>();
        for (Session session : sessions) {
            ticketTypesBySession.put(session.getId(), ticketTypeRepository.findAllBySessionIdOrderByIdAsc(session.getId()));
        }

        List<OrganizerEventWizardValidationIssue> issues = collectValidationIssues(event, eventCategories, eventImages, sessions, ticketTypesBySession);

        List<OrganizerEventWizardResponse.SessionItem> sessionItems = sessions.stream()
            .map(session -> OrganizerEventWizardResponse.SessionItem.builder()
                .sessionId(session.getId())
                .sessionTitle(session.getSessionTitle())
                .startsAt(session.getStartsAt() == null ? null : session.getStartsAt().toLocalDateTime())
                .endsAt(session.getEndsAt() == null ? null : session.getEndsAt().toLocalDateTime())
                .venueId(session.getVenue() == null ? null : session.getVenue().getId())
                .venueName(session.getVenue() == null ? null : session.getVenue().getName())
                .manualAddress(session.getVenue() == null ? session.getManualAddress() : session.getVenue().getAddress())
                .cityId(session.getVenue() != null && session.getVenue().getCity() != null
                    ? session.getVenue().getCity().getId()
                    : event.getCity() == null ? null : event.getCity().getId())
                .cityName(session.getVenue() != null && session.getVenue().getCity() != null
                    ? session.getVenue().getCity().getName()
                    : event.getCity() == null ? null : event.getCity().getName())
                .cityRegion(session.getVenue() != null && session.getVenue().getCity() != null
                    ? session.getVenue().getCity().getRegion()
                    : event.getCity() == null ? null : event.getCity().getRegion())
                .latitude(session.getVenue() == null ? session.getLatitude() : session.getVenue().getLatitude())
                .longitude(session.getVenue() == null ? session.getLongitude() : session.getVenue().getLongitude())
                .seatLimit(session.getSeatLimit())
                .status(session.getStatus())
                .ticketTypes(ticketTypesBySession.getOrDefault(session.getId(), List.of()).stream()
                    .map(type -> OrganizerEventWizardResponse.TicketTypeItem.builder()
                        .id(type.getId())
                        .name(type.getName())
                        .price(type.getPrice())
                        .currency(type.getCurrency())
                        .quota(type.getQuota())
                        .salesStartAt(type.getSalesStartAt() == null ? null : type.getSalesStartAt().toLocalDateTime())
                        .salesEndAt(type.getSalesEndAt() == null ? null : type.getSalesEndAt().toLocalDateTime())
                        .build())
                    .toList())
                .build())
            .toList();

        List<OrganizerEventWizardResponse.ArtistItem> artistItems = eventArtists.stream()
            .map(link -> {
                Artist artist = link.getArtist();
                if (artist == null) {
                    return null;
                }
                Long imageId = artistImageRepository.findFirstByArtistIdAndPrimaryIsTrueOrderByIdAsc(artist.getId())
                    .map(ArtistImage::getImage)
                    .map(Image::getId)
                    .orElse(null);

                return OrganizerEventWizardResponse.ArtistItem.builder()
                    .artistId(artist.getId())
                    .name(artist.getName())
                    .stageName(artist.getStageName())
                    .description(artist.getDescription())
                    .genre(artist.getGenre())
                    .imageId(imageId)
                    .eventRole(link.getEventRole())
                    .displayOrder(link.getDisplayOrder())
                    .build();
            })
            .filter(Objects::nonNull)
            .toList();

        return OrganizerEventWizardResponse.builder()
            .eventId(event.getId())
            .status(event.getStatus())
            .moderationStatus(event.getModerationStatus())
            .free(event.isFree())
            .organizationId(event.getOrganization() == null ? null : event.getOrganization().getId())
            .organizationName(event.getOrganization() == null ? null : event.getOrganization().getName())
            .cityId(event.getCity() == null ? null : event.getCity().getId())
            .cityName(event.getCity() == null ? null : event.getCity().getName())
            .title(event.getTitle())
            .shortDescription(event.getShortDescription())
            .fullDescription(event.getFullDescription())
            .ageRestriction(event.getAgeRestriction())
            .categoryIds(eventCategories.stream()
                .map(EventCategory::getCategory)
                .filter(Objects::nonNull)
                .map(Category::getId)
                .toList())
            .categories(eventCategories.stream()
                .map(EventCategory::getCategory)
                .filter(Objects::nonNull)
                .map(this::toCategoryResponse)
                .toList())
            .images(eventImages.stream()
                .map(item -> OrganizerEventWizardResponse.ImageItem.builder()
                    .eventImageId(item.getId())
                    .imageId(item.getImage() == null ? null : item.getImage().getId())
                    .primary(item.isPrimary())
                    .sortOrder(item.getSortOrder())
                    .build())
                .toList())
            .artists(artistItems)
            .sessions(sessionItems)
            .validationIssues(issues)
            .readyForModeration(issues.isEmpty())
            .build();
    }

    private List<OrganizerEventWizardValidationIssue> collectValidationIssues(Event event) {
        List<EventCategory> eventCategories = eventCategoryRepository.findAllByEventId(event.getId());
        List<EventImage> eventImages = eventImageRepository.findAllByEventIdOrderBySortOrderAscIdAsc(event.getId());
        List<Session> sessions = sessionRepository.findAllByEventIdOrderByStartsAtAsc(event.getId());

        Map<Long, List<TicketType>> ticketTypesBySession = new HashMap<>();
        for (Session session : sessions) {
            ticketTypesBySession.put(session.getId(), ticketTypeRepository.findAllBySessionIdOrderByIdAsc(session.getId()));
        }

        return collectValidationIssues(event, eventCategories, eventImages, sessions, ticketTypesBySession);
    }

    private List<OrganizerEventWizardValidationIssue> collectValidationIssues(Event event,
                                                                               List<EventCategory> categories,
                                                                               List<EventImage> images,
                                                                               List<Session> sessions,
                                                                               Map<Long, List<TicketType>> ticketTypesBySession) {
        List<OrganizerEventWizardValidationIssue> issues = new ArrayList<>();

        if (!StringUtils.hasText(event.getTitle())) {
            issues.add(issue("missing_title", "Не указано название мероприятия", "step_1"));
        }
        if (event.getCity() == null) {
            issues.add(issue("missing_city", "Город мероприятия будет определен после заполнения сеансов", "step_4"));
        }
        if (event.getOrganization() == null) {
            issues.add(issue("missing_organization", "Не выбрана организация", "step_1"));
        }

        if (categories.isEmpty()) {
            issues.add(issue("missing_categories", "Добавьте минимум одну категорию", "step_1"));
        }

        if (images.isEmpty()) {
            issues.add(issue("missing_images", "Добавьте хотя бы одно изображение", "step_2"));
        } else {
            long primaryCount = images.stream().filter(EventImage::isPrimary).count();
            if (primaryCount != 1) {
                issues.add(issue("invalid_primary_image", "Укажите ровно одно главное изображение", "step_2"));
            }
        }

        Set<Long> uniqueArtistIds = new HashSet<>();
        for (EventArtist eventArtist : eventArtistRepository.findAllByEventIdOrderByDisplayOrderAscIdAsc(event.getId())) {
            if (eventArtist.getArtist() != null && !uniqueArtistIds.add(eventArtist.getArtist().getId())) {
                issues.add(issue("duplicate_artists", "Артисты в событии не должны дублироваться", "step_3"));
                break;
            }
        }

        if (sessions.isEmpty()) {
            issues.add(issue("missing_sessions", "Добавьте хотя бы один сеанс", "step_4"));
        }

        for (Session session : sessions) {
            if (session.getStartsAt() == null) {
                issues.add(issue("session_starts_at_required", "У каждого сеанса должно быть время начала", "step_4"));
            }
            if (session.getStartsAt() != null && session.getEndsAt() != null && session.getEndsAt().isBefore(session.getStartsAt())) {
                issues.add(issue("session_invalid_dates", "Время окончания сеанса не может быть раньше начала", "step_4"));
            }
            if (session.getVenue() == null && !StringUtils.hasText(session.getManualAddress())) {
                issues.add(issue("session_location_required", "Если площадка не выбрана, укажите адрес вручную", "step_4"));
            }

            List<TicketType> types = ticketTypesBySession.getOrDefault(session.getId(), List.of());
            if (event.isFree()) {
                if (types.isEmpty()) {
                    issues.add(issue("session_tickets_required", "Для регистрации нужен хотя бы один билет на каждый сеанс", "step_5"));
                    continue;
                }
                for (TicketType ticketType : types) {
                    if (ticketType.getPrice() == null || ticketType.getPrice().compareTo(BigDecimal.ZERO) != 0) {
                        issues.add(issue("free_event_has_paid_ticket", "У бесплатного мероприятия все билеты должны быть с ценой 0", "step_5"));
                    }
                    if (ticketType.getQuota() == null || ticketType.getQuota() <= 0) {
                        issues.add(issue("ticket_quota_invalid", "Квота билета должна быть > 0", "step_5"));
                    }
                    if (ticketType.getSalesStartAt() != null
                        && ticketType.getSalesEndAt() != null
                        && ticketType.getSalesEndAt().isBefore(ticketType.getSalesStartAt())) {
                        issues.add(issue("ticket_sales_window_invalid", "Дата окончания продаж не может быть раньше даты начала", "step_5"));
                    }
                }
            } else {
                if (types.isEmpty()) {
                    issues.add(issue("session_tickets_required", "У каждого сеанса должен быть хотя бы один тип билета", "step_5"));
                    continue;
                }

                for (TicketType ticketType : types) {
                    if (ticketType.getPrice() == null || ticketType.getPrice().compareTo(BigDecimal.ZERO) <= 0) {
                        issues.add(issue("ticket_price_invalid", "Для платного мероприятия цена билета должна быть > 0", "step_5"));
                    }
                    if (ticketType.getQuota() == null || ticketType.getQuota() <= 0) {
                        issues.add(issue("ticket_quota_invalid", "Квота билета должна быть > 0", "step_5"));
                    }
                    if (ticketType.getSalesStartAt() != null
                        && ticketType.getSalesEndAt() != null
                        && ticketType.getSalesEndAt().isBefore(ticketType.getSalesStartAt())) {
                        issues.add(issue("ticket_sales_window_invalid", "Дата окончания продаж не может быть раньше даты начала", "step_5"));
                    }
                }
            }
        }

        return issues;
    }

    private OrganizerEventWizardValidationIssue issue(String code, String message, String step) {
        return OrganizerEventWizardValidationIssue.builder()
            .code(code)
            .message(message)
            .step(step)
            .build();
    }

    private void validateSessionItem(OrganizerEventSessionsRequest.SessionItem item) {
        if (item.getStartsAt() == null) {
            throw new BadRequestException("Для сеанса обязательно startsAt");
        }
        if (item.getEndsAt() != null && item.getEndsAt().isBefore(item.getStartsAt())) {
            throw new BadRequestException("endsAt не может быть раньше startsAt");
        }
        if (item.getVenueId() == null && !StringUtils.hasText(item.getManualAddress())) {
            throw new BadRequestException("Если площадка не выбрана, необходимо указать manualAddress");
        }
        if (item.getSeatLimit() != null && item.getSeatLimit() <= 0) {
            throw new BadRequestException("seatLimit должен быть больше 0");
        }
    }

    private void validateTicketTypeItem(OrganizerEventTicketsRequest.TicketTypeItem item, boolean requirePaidPrice) {
        if (!StringUtils.hasText(item.getName())) {
            throw new BadRequestException("Название типа билета обязательно");
        }

        BigDecimal price = item.getPrice() == null ? BigDecimal.ZERO : item.getPrice();
        if (requirePaidPrice && price.compareTo(BigDecimal.ZERO) <= 0) {
            throw new BadRequestException("Для платного мероприятия цена билета должна быть > 0");
        }
        if (!requirePaidPrice && price.compareTo(BigDecimal.ZERO) < 0) {
            throw new BadRequestException("Цена билета не может быть отрицательной");
        }
        if (item.getQuota() == null || item.getQuota() <= 0) {
            throw new BadRequestException("Квота билета должна быть > 0");
        }
        if (item.getSalesStartAt() != null && item.getSalesEndAt() != null && item.getSalesEndAt().isBefore(item.getSalesStartAt())) {
            throw new BadRequestException("salesEndAt не может быть раньше salesStartAt");
        }
    }

    private void refreshEventTimelineAndPrice(Event event) {
        List<Session> sessions = sessionRepository.findAllByEventIdOrderByStartsAtAsc(event.getId());

        OffsetDateTime start = sessions.stream()
            .map(Session::getStartsAt)
            .filter(Objects::nonNull)
            .min(Comparator.naturalOrder())
            .orElse(event.getStartsAt() == null ? OffsetDateTime.now().plusDays(7) : event.getStartsAt());

        OffsetDateTime end = sessions.stream()
            .map(Session::getEndsAt)
            .filter(Objects::nonNull)
            .max(Comparator.naturalOrder())
            .orElse(start.plusHours(2));

        boolean hasPaid = false;
        for (Session session : sessions) {
            for (TicketType type : ticketTypeRepository.findAllBySessionIdOrderByIdAsc(session.getId())) {
                if (type.getPrice() != null && type.getPrice().compareTo(BigDecimal.ZERO) > 0) {
                    hasPaid = true;
                    break;
                }
            }
            if (hasPaid) {
                break;
            }
        }

        event.setStartsAt(start);
        event.setEndsAt(end);
        event.setFree(!hasPaid);
        event.setUpdatedAt(OffsetDateTime.now());
        eventRepository.save(event);
    }

    private Event loadManagedEvent(Long eventId, User actor) {
        Event event = eventRepository.findByIdAndDeletedAtIsNull(eventId)
            .orElseThrow(() -> new ResourceNotFoundException("Event not found"));
        assertCanManageEvent(actor, event);
        return event;
    }

    private Event loadManagedEventForUpdate(Long eventId, User actor) {
        Event event = eventRepository.findByIdForUpdate(eventId)
            .orElseThrow(() -> new ResourceNotFoundException("Event not found"));
        assertCanManageEvent(actor, event);
        return event;
    }

    private void assertCanManageEvent(User actor, Event event) {
        if (event.getOrganization() == null) {
            throw new BadRequestException("Мероприятие не привязано к организации");
        }

        boolean member = organizationMemberRepository.existsByUserIdAndOrganizationIdAndLeftAtIsNull(
            actor.getId(),
            event.getOrganization().getId()
        );
        if (!member) {
            throw new BadRequestException("Недостаточно прав для управления этим мероприятием");
        }
    }

    private User resolveOrganizer(String actorIdentifier) {
        User actor = userRepository.findByLoginOrEmailWithRoles(actorIdentifier)
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        boolean allowed = actor.getUserRoles().stream()
            .map(userRole -> userRole.getRole().toRoleName())
            .anyMatch(roleName -> roleName == RoleName.ROLE_ORGANIZER || roleName == RoleName.ROLE_ADMIN);

        if (!allowed) {
            throw new BadRequestException("Только организатор может создавать мероприятия");
        }
        return actor;
    }

    private Organization resolveManagedOrganization(User actor) {
        List<OrganizationMember> memberships = organizationMemberRepository.findAllByUserIdAndLeftAtIsNull(actor.getId()).stream()
            .filter(member -> member.getOrganization() != null && member.getOrganization().getDeletedAt() == null)
            .toList();

        if (memberships.isEmpty()) {
            throw new BadRequestException("Пользователь не состоит ни в одной организации");
        }

        if (memberships.size() != 1) {
            throw new BadRequestException("Организатор должен состоять ровно в одной организации");
        }

        return memberships.get(0).getOrganization();
    }

    private City resolveSessionCity(OrganizerEventSessionsRequest.SessionItem item, Venue venue) {
        if (venue != null) {
            return venue.getCity();
        }

        if (item.getCityId() != null) {
            return cityRepository.findById(item.getCityId())
                .orElseThrow(() -> new BadRequestException("Город сеанса не найден"));
        }

        if (StringUtils.hasText(item.getCityName())) {
            City byName = resolveCityByLooseName(item.getCityName());
            if (byName != null) {
                return byName;
            }
        }

        if (StringUtils.hasText(item.getManualAddress())) {
            City inferredCity = inferCityFromManualAddress(item.getManualAddress());
            if (inferredCity != null) {
                return inferredCity;
            }
            throw new BadRequestException("Не удалось определить город по ручному адресу сеанса. Укажите город в адресе или выберите подсказку");
        }

        return null;
    }

    private City inferCityFromManualAddress(String manualAddress) {
        if (!StringUtils.hasText(manualAddress)) {
            return null;
        }

        String normalizedAddress = normalizeCityLabel(manualAddress);
        return cityRepository.findAllByOrderByNameAsc().stream()
            .filter(city -> StringUtils.hasText(city.getName()))
            .filter(city -> normalizedAddress.contains(normalizeCityLabel(city.getName())))
            .max(Comparator.comparingInt(city -> city.getName().length()))
            .orElse(null);
    }

    private City resolveCityByLooseName(String rawCityName) {
        if (!StringUtils.hasText(rawCityName)) {
            return null;
        }

        String normalizedInput = normalizeCityLabel(rawCityName);
        if (!StringUtils.hasText(normalizedInput)) {
            return null;
        }

        return cityRepository.findAllByOrderByNameAsc().stream()
            .filter(city -> StringUtils.hasText(city.getName()))
            .filter(city -> {
                String normalizedCity = normalizeCityLabel(city.getName());
                return normalizedCity.equals(normalizedInput)
                    || normalizedCity.contains(normalizedInput)
                    || normalizedInput.contains(normalizedCity);
            })
            .max(Comparator.comparingInt(city -> city.getName().length()))
            .orElse(null);
    }

    private String normalizeCityLabel(String value) {
        if (!StringUtils.hasText(value)) {
            return "";
        }

        String normalized = value.toLowerCase()
            .replace('ё', 'е')
            .replaceAll("[.,]", " ")
            .replaceAll("\\b(городской\\s+округ|город\\s+округ|г\\.?\\s*о\\.?|г\\.?|город|р\\.?п\\.?|поселок|посёлок|село|деревня)\\b", " ")
            .replaceAll("\\s+", " ")
            .trim();

        return normalized;
    }

    private OffsetDateTime toSystemOffset(LocalDateTime value) {
        return value.atZone(ZoneId.systemDefault()).toOffsetDateTime();
    }

    private Image resolveImage(Long imageId) {
        if (imageId != null) {
            return imageRepository.findById(imageId)
                .orElseThrow(() -> new ResourceNotFoundException("Image not found"));
        }
        return null;
    }

    private CategoryResponse toCategoryResponse(Category category) {
        return CategoryResponse.builder()
            .id(category.getId())
            .name(category.getName())
            .description(category.getDescription())
            .build();
    }

    private String normalizeRequired(String value, String message) {
        if (!StringUtils.hasText(value)) {
            throw new BadRequestException(message);
        }
        return value.trim();
    }

    private String normalizeOptional(String value) {
        if (!StringUtils.hasText(value)) {
            return null;
        }
        return value.trim();
    }
}
