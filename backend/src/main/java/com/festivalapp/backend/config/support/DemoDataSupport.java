package com.festivalapp.backend.config.support;

import com.festivalapp.backend.entity.Participant;
import com.festivalapp.backend.entity.ParticipantImage;
import com.festivalapp.backend.entity.Category;
import com.festivalapp.backend.entity.City;
import com.festivalapp.backend.entity.Event;
import com.festivalapp.backend.entity.EventParticipant;
import com.festivalapp.backend.entity.EventCategory;
import com.festivalapp.backend.entity.EventImage;
import com.festivalapp.backend.entity.Image;
import com.festivalapp.backend.entity.Organization;
import com.festivalapp.backend.entity.OrganizationMember;
import com.festivalapp.backend.entity.Publication;
import com.festivalapp.backend.entity.PublicationImage;
import com.festivalapp.backend.entity.Role;
import com.festivalapp.backend.entity.RoleName;
import com.festivalapp.backend.entity.Session;
import com.festivalapp.backend.entity.TicketType;
import com.festivalapp.backend.entity.User;
import com.festivalapp.backend.entity.UserRole;
import com.festivalapp.backend.entity.Venue;
import com.festivalapp.backend.repository.ParticipantRepository;
import com.festivalapp.backend.repository.ParticipantImageRepository;
import com.festivalapp.backend.repository.CategoryRepository;
import com.festivalapp.backend.repository.EventParticipantRepository;
import com.festivalapp.backend.repository.EventCategoryRepository;
import com.festivalapp.backend.repository.EventImageRepository;
import com.festivalapp.backend.repository.EventRepository;
import com.festivalapp.backend.repository.ImageRepository;
import com.festivalapp.backend.repository.OrganizationMemberRepository;
import com.festivalapp.backend.repository.PublicationImageRepository;
import com.festivalapp.backend.repository.PublicationRepository;
import com.festivalapp.backend.repository.RoleRepository;
import com.festivalapp.backend.repository.SessionRepository;
import com.festivalapp.backend.repository.TicketTypeRepository;
import com.festivalapp.backend.repository.UserRoleRepository;
import com.festivalapp.backend.repository.VenueRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.OffsetDateTime;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

/**
 * Общие хелперы для городских демо-инициализаторов (Коломна, Рязань).
 *
 * <p>Здесь собрано всё, что не зависит от конкретного города: создание ролей,
 * категорий, базовая запись Event/Session/TicketType, привязка артистов и категорий,
 * загрузка изображений из classpath и сохранение публикаций.
 *
 * <p>Все методы идемпотентны: повторный запуск приложения не должен создавать
 * дубликатов. Уникальность определяется по понятным человеку ключам
 * (email пользователя, имя организации, имя файла изображения, заголовок события и т. п.).
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class DemoDataSupport {

    private final RoleRepository roleRepository;
    private final UserRoleRepository userRoleRepository;
    private final OrganizationMemberRepository organizationMemberRepository;
    private final CategoryRepository categoryRepository;
    private final ParticipantRepository participantRepository;
    private final ParticipantImageRepository participantImageRepository;
    private final EventRepository eventRepository;
    private final EventCategoryRepository eventCategoryRepository;
    private final EventImageRepository eventImageRepository;
    private final ImageRepository imageRepository;
    private final VenueRepository venueRepository;
    private final SessionRepository sessionRepository;
    private final TicketTypeRepository ticketTypeRepository;
    private final EventParticipantRepository eventParticipantRepository;
    private final PublicationRepository publicationRepository;
    private final PublicationImageRepository publicationImageRepository;

    // Базовые категории, общие для всех городов. Если в БД (через V2 seed)
    // их уже создал Flyway — переиспользуем по имени.
    private static final Map<String, String> BASE_CATEGORIES = Map.of(
        "Концерт", "Музыкальные живые выступления",
        "Лекция", "Образовательные публичные выступления",
        "Фестиваль", "Городские и тематические фестивали",
        "Мастер-класс", "Практические занятия с ведущими"
    );

    /** Возвращает роль по enum-имени, создавая её при необходимости. */
    public Role ensureRole(RoleName roleName, String description) {
        return roleRepository.findByName(roleName)
            .orElseGet(() -> roleRepository.save(Role.builder()
                .name(roleName.toDbName())
                .description(description)
                .build()));
    }

    /** Связывает пользователя с ролью, если такой связки ещё нет. */
    public void ensureUserRole(User user, Role role, OffsetDateTime now) {
        if (userRoleRepository.existsByUserIdAndRoleId(user.getId(), role.getId())) {
            return;
        }
        userRoleRepository.save(UserRole.builder()
            .user(user)
            .role(role)
            .assignedAt(now)
            .build());
    }

    /** Делает пользователя действующим участником организации. */
    public void ensureOrganizationMember(User user, Organization organization, String status, OffsetDateTime now) {
        if (organizationMemberRepository.existsByUserIdAndOrganizationIdAndLeftAtIsNull(user.getId(), organization.getId())) {
            return;
        }
        organizationMemberRepository.save(OrganizationMember.builder()
            .user(user)
            .organization(organization)
            .organizationStatus(status)
            .joinedAt(now)
            .build());
    }

    /** Возвращает карту базовых категорий (Концерт/Лекция/Фестиваль/Мастер-класс). */
    public Map<String, Category> ensureBaseCategories() {
        Map<String, Category> result = new HashMap<>();
        for (Map.Entry<String, String> entry : BASE_CATEGORIES.entrySet()) {
            Category category = categoryRepository.findByNameIgnoreCase(entry.getKey())
                .orElseGet(() -> categoryRepository.save(Category.builder()
                    .name(entry.getKey())
                    .description(entry.getValue())
                    .build()));
            result.put(entry.getKey(), category);
        }
        return result;
    }

    /** Создаёт участников из списка-сидов и возвращает карту по lower-case имени. */
    public Map<String, Participant> ensureParticipants(List<ParticipantSeed> seeds, OffsetDateTime now) {
        List<Participant> existing = participantRepository.findAllByDeletedAtIsNullOrderByNameAsc();
        Map<String, Participant> byName = new HashMap<>();
        existing.forEach(participant -> byName.put(participant.getName().toLowerCase(), participant));

        for (ParticipantSeed seed : seeds) {
            byName.computeIfAbsent(seed.name().toLowerCase(), ignored -> participantRepository.save(Participant.builder()
                .name(seed.name())
                .stageName(seed.stageName())
                .description(seed.description())
                .genre(seed.genre())
                .kind(seed.kind())
                .createdAt(now)
                .updatedAt(now)
                .build()));
        }
        return byName;
    }

    /** Привязывает к участникам актуальные демо-изображения, заменяя прежнюю seed-картинку. */
    public void ensureParticipantImages(Map<String, Participant> participants,
                                        Map<String, String> classpathImagePathsByParticipantName,
                                        User uploader,
                                        OffsetDateTime now,
                                        String demoKey) {
        for (Map.Entry<String, String> entry : classpathImagePathsByParticipantName.entrySet()) {
            Participant participant = participants.get(entry.getKey().toLowerCase());
            if (participant == null) {
                continue;
            }
            Image image = ensureImage(demoKey, entry.getValue(), "participant-" + participant.getId(), uploader, now);
            List<ParticipantImage> existing = participantImageRepository.findAllByParticipantIdOrderByPrimaryDescIdAsc(participant.getId());
            boolean alreadyLinked = existing.stream()
                .anyMatch(link -> link.getImage() != null && image.getId().equals(link.getImage().getId()));
            if (alreadyLinked) {
                continue;
            }
            participantImageRepository.deleteByParticipantId(participant.getId());
            participantImageRepository.flush();
            participantImageRepository.save(ParticipantImage.builder()
                .participant(participant)
                .image(image)
                .primary(true)
                .build());
        }
    }

    /**
     * Создаёт событие с базовыми полями, если такого ещё нет (поиск по title в рамках организации).
     * Возвращает обёртку с флагом, было ли событие только что создано — нужен, чтобы
     * не пересоздавать сессии/билеты.
     */
    public EventHolder ensureEventBase(EventSeedSpec spec,
                                       Organization organization,
                                       User organizer,
                                       City city,
                                       OffsetDateTime now) {
        Optional<Event> existing = eventRepository.findAllByOrganizationIdAndDeletedAtIsNullOrderByCreatedAtDesc(organization.getId())
            .stream()
            .filter(event -> event.getTitle() != null && event.getTitle().equalsIgnoreCase(spec.title()))
            .findFirst();

        if (existing.isPresent()) {
            return new EventHolder(existing.get(), false);
        }

        OffsetDateTime startsAt = spec.sessions().stream().map(SessionSeedSpec::startsAt).min(OffsetDateTime::compareTo).orElse(now.plusDays(3));
        OffsetDateTime endsAt = spec.sessions().stream().map(SessionSeedSpec::endsAt).max(OffsetDateTime::compareTo).orElse(startsAt.plusHours(2));
        boolean isFree = spec.sessions().stream().allMatch(s -> s.price().compareTo(BigDecimal.ZERO) <= 0);

        Event event = eventRepository.save(Event.builder()
            .organization(organization)
            .createdByUser(organizer)
            .city(city)
            .title(spec.title())
            .shortDescription(spec.shortDescription())
            .fullDescription(spec.fullDescription())
            .ageRestriction(spec.ageRestriction())
            .free(isFree)
            .startsAt(startsAt)
            .endsAt(endsAt)
            .status("опубликовано")
            .createdAt(now)
            .updatedAt(now)
            .build());

        return new EventHolder(event, true);
    }

    /** Привязывает к событию категории по имени. Дубликаты игнорируются. */
    public void ensureEventCategories(Event event, List<String> categoryNames, Map<String, Category> categories) {
        Set<Long> existingCategoryIds = new HashSet<>();
        for (EventCategory eventCategory : eventCategoryRepository.findAllByEventId(event.getId())) {
            if (eventCategory.getCategory() != null) {
                existingCategoryIds.add(eventCategory.getCategory().getId());
            }
        }
        for (String categoryName : categoryNames) {
            Category category = categories.get(categoryName);
            if (category == null || existingCategoryIds.contains(category.getId())) {
                continue;
            }
            eventCategoryRepository.save(EventCategory.builder()
                .event(event)
                .category(category)
                .build());
        }
    }

    /**
     * Привязывает к событию изображения. {@code classpathImagePaths} — пути в classpath
     * (например, {@code "images/live music/foo.jpg"}). Дубликаты по сохранённому image_id
     * игнорируются. Первое изображение становится primary, если ещё нет primary.
     */
    public void ensureEventImages(Event event,
                                  List<String> classpathImagePaths,
                                  User uploader,
                                  OffsetDateTime now,
                                  String demoKey) {
        List<EventImage> existing = eventImageRepository.findAllByEventIdOrderBySortOrderAscIdAsc(event.getId());
        Set<Long> existingImageIds = new HashSet<>();
        for (EventImage image : existing) {
            if (image.getImage() != null) {
                existingImageIds.add(image.getImage().getId());
            }
        }
        int sortOrder = existing.size();
        boolean hasPrimary = existing.stream().anyMatch(EventImage::isPrimary);

        for (int i = 0; i < classpathImagePaths.size(); i += 1) {
            String classpathPath = classpathImagePaths.get(i);
            // Уникальный ключ файла привязан к event-id, чтобы повторные запуски находили ту же запись.
            String key = "event-" + event.getId() + "-" + i;
            Image image = ensureImage(demoKey, classpathPath, key, uploader, now);
            if (existingImageIds.contains(image.getId())) {
                continue;
            }
            eventImageRepository.save(EventImage.builder()
                .event(event)
                .image(image)
                .primary(!hasPrimary && i == 0)
                .sortOrder(sortOrder++)
                .build());
        }
    }

    /**
     * Гарантирует ровно одну primary-картинку у события (первая по порядку).
     * Полезно при ручных правках или при добавлении картинок в существующее событие.
     */
    public void normalizePrimaryImage(Long eventId) {
        List<EventImage> images = eventImageRepository.findAllByEventIdOrderBySortOrderAscIdAsc(eventId);
        if (images.isEmpty()) {
            return;
        }
        boolean primaryAssigned = false;
        for (EventImage image : images) {
            boolean shouldBePrimary = !primaryAssigned;
            if (image.isPrimary() != shouldBePrimary) {
                image.setPrimary(shouldBePrimary);
                eventImageRepository.save(image);
            }
            primaryAssigned = primaryAssigned || shouldBePrimary;
        }
    }

    /**
     * Создаёт сессии и тарифные позиции для события. Адрес сначала ищется среди venues
     * города (по точному совпадению), иначе используется как manualAddress.
     */
    public void createSessionsAndTickets(Event event, EventSeedSpec spec, City city) {
        for (SessionSeedSpec sessionSpec : spec.sessions()) {
            Venue venue = null;
            if (sessionSpec.venueAddress() != null && !sessionSpec.venueAddress().isBlank()) {
                venue = venueRepository.findFirstByAddressIgnoreCaseAndCityId(sessionSpec.venueAddress(), city.getId()).orElse(null);
            }
            Venue coordVenue = venue;
            if (coordVenue == null && sessionSpec.manualAddress() != null && !sessionSpec.manualAddress().isBlank()) {
                coordVenue = venueRepository.findFirstByAddressIgnoreCaseAndCityId(sessionSpec.manualAddress(), city.getId()).orElse(null);
            }

            Session session = sessionRepository.save(Session.builder()
                .event(event)
                .venue(venue)
                .sessionTitle(sessionSpec.sessionTitle())
                .startsAt(sessionSpec.startsAt())
                .endsAt(sessionSpec.endsAt())
                .manualAddress(venue == null ? sessionSpec.manualAddress() : null)
                .seatLimit(sessionSpec.seatLimit())
                .status("запланирован")
                .latitude(coordVenue != null ? coordVenue.getLatitude() : null)
                .longitude(coordVenue != null ? coordVenue.getLongitude() : null)
                .createdAt(OffsetDateTime.now())
                .updatedAt(OffsetDateTime.now())
                .build());

            if (ticketTypeRepository.findAllBySessionIdOrderByIdAsc(session.getId()).isEmpty()) {
                for (TicketSeedSpec ticketSpec : sessionSpec.ticketSpecs()) {
                    Integer quota = ticketSpec.quota() == null
                        ? (sessionSpec.seatLimit() == null ? 200 : sessionSpec.seatLimit())
                        : ticketSpec.quota();
                    ticketTypeRepository.save(TicketType.builder()
                        .session(session)
                        .name(ticketSpec.name())
                        .price(ticketSpec.price() == null ? BigDecimal.ZERO : ticketSpec.price())
                        .currency("RUB")
                        .quota(quota)
                        .active(true)
                        .salesStartAt(OffsetDateTime.now().minusDays(1))
                        .salesEndAt(sessionSpec.startsAt())
                        .build());
                }
            }
        }
    }

    /** Привязывает участников к событию по имени (lower-case ключ карты). */
    public void ensureEventParticipants(Event event, List<String> participantNames, Map<String, Participant> participants) {
        List<EventParticipant> existing = eventParticipantRepository.findAllByEventIdOrderByIdAsc(event.getId());
        Set<Long> existingParticipantIds = new HashSet<>();
        for (EventParticipant eventParticipant : existing) {
            if (eventParticipant.getParticipant() != null) {
                existingParticipantIds.add(eventParticipant.getParticipant().getId());
            }
        }
        for (String participantName : participantNames) {
            Participant participant = participants.get(participantName.toLowerCase());
            if (participant == null || existingParticipantIds.contains(participant.getId())) {
                continue;
            }
            eventParticipantRepository.save(EventParticipant.builder()
                .event(event)
                .participant(participant)
                .build());
        }
    }

    /**
     * Создаёт публикации для события и привязывает к ним картинки.
     * Уникальность публикации определяется по нормализованному заголовку.
     */
    public void ensurePublications(Event event,
                                   Organization organization,
                                   User author,
                                   List<PublicationSeedSpec> specs,
                                   OffsetDateTime now,
                                   String demoKey) {
        if (specs == null || specs.isEmpty()) {
            return;
        }

        List<Publication> existingPublications = publicationRepository.findAllByEventIdOrderByCreatedAtDesc(event.getId());
        Map<String, Publication> byTitle = new HashMap<>();
        for (Publication publication : existingPublications) {
            if (publication.getTitle() != null) {
                byTitle.put(publication.getTitle().trim().toLowerCase(), publication);
            }
        }

        int publicationIndex = 0;
        for (PublicationSeedSpec spec : specs) {
            String normalizedTitle = spec.title().trim().toLowerCase();
            Publication publication = byTitle.get(normalizedTitle);
            if (publication == null) {
                publication = publicationRepository.save(Publication.builder()
                    .event(event)
                    .organization(organization)
                    .createdByUser(author)
                    .title(spec.title().trim())
                    .content(spec.content().trim())
                    .status("PUBLISHED")
                    .moderationStatus("одобрено")
                    .createdAt(now)
                    .publishedAt(now)
                    .updatedAt(now)
                    .build());
                byTitle.put(normalizedTitle, publication);
            }

            List<PublicationImage> existingImages = publicationImageRepository.findAllByPublicationIdOrderBySortOrderAscIdAsc(publication.getId());
            Set<Long> existingImageIds = new HashSet<>();
            for (PublicationImage image : existingImages) {
                if (image.getImage() != null) {
                    existingImageIds.add(image.getImage().getId());
                }
            }
            int sortOrder = existingImages.size();
            for (int imageIndex = 0; imageIndex < spec.classpathImagePaths().size(); imageIndex += 1) {
                String classpathPath = spec.classpathImagePaths().get(imageIndex);
                String key = "publication-" + event.getId() + "-" + publicationIndex + "-" + imageIndex;
                Image image = ensureImage(demoKey, classpathPath, key, author, now);
                if (existingImageIds.contains(image.getId())) {
                    continue;
                }
                publicationImageRepository.save(PublicationImage.builder()
                    .publication(publication)
                    .image(image)
                    .sortOrder(sortOrder++)
                    .build());
            }
            publicationIndex += 1;
        }
    }

    /**
     * Загружает картинку из classpath в БД, если её ещё нет (поиск по сгенерированному fileName).
     * {@code demoKey} разделяет картинки разных городов в имени файла, чтобы один и тот же
     * исходный файл (если бы вдруг повторился) не конфликтовал между городами.
     */
    public Image ensureImage(String demoKey,
                             String classpathPath,
                             String key,
                             User uploader,
                             OffsetDateTime now) {
        String originalFileName = classpathPath.substring(classpathPath.lastIndexOf('/') + 1);
        String ext = extensionOf(originalFileName);
        // Имя файла-картинки в БД: префикс seed-<город>-<key>-<исходное имя без расширения>.<ext>
        // Это даёт идемпотентность (повторный запуск находит ту же запись) и читаемость в БД.
        String baseName = originalFileName.substring(0, originalFileName.length() - ext.length()).replaceAll("[^A-Za-z0-9_-]", "_");
        String fileName = "seed-" + demoKey + "-" + key + "-" + baseName + ext;

        Optional<Image> existing = imageRepository.findByFileName(fileName);
        if (existing.isPresent()) {
            return existing.get();
        }

        byte[] bytes = readClasspathBytes(classpathPath, demoKey);
        String mime = mimeTypeForExtension(ext);

        return imageRepository.save(Image.builder()
            .fileName(fileName)
            .mimeType(mime)
            .fileSize((long) bytes.length)
            .fileData(bytes)
            .uploadedAt(now)
            .uploadedByUser(uploader)
            .build());
    }

    /**
     * Дозаполняет координаты в сессиях, у которых они пустые, используя координаты venue.
     * Полезно после миграций или ручных правок данных.
     */
    public void patchMissingSessionCoordinates() {
        List<Session> sessions = sessionRepository.findAllByOrderByStartsAtAsc();
        int patched = 0;
        for (Session session : sessions) {
            if (session.getLatitude() != null && session.getLongitude() != null) continue;

            Venue venue = session.getVenue();
            if (venue == null) {
                String address = session.getManualAddress();
                if (address != null && !address.isBlank() && session.getEvent() != null
                        && session.getEvent().getCity() != null) {
                    venue = venueRepository.findFirstByAddressIgnoreCaseAndCityId(
                        address.trim(), session.getEvent().getCity().getId()).orElse(null);
                }
            }
            if (venue != null && venue.getLatitude() != null && venue.getLongitude() != null) {
                session.setLatitude(venue.getLatitude());
                session.setLongitude(venue.getLongitude());
                sessionRepository.save(session);
                patched++;
            }
        }
        if (patched > 0) {
            log.info("Patched {} sessions with missing coordinates", patched);
        }
    }

    private byte[] readClasspathBytes(String classpathPath, String demoKey) {
        ClassPathResource resource = new ClassPathResource(classpathPath);
        if (!resource.exists()) {
            // Фолбэк-плейсхолдер на случай отсутствия файла, чтобы сидинг не падал
            // (например, при чистом checkout без отдельного шага скачивания изображений).
            String demoLabel = demoKey == null || demoKey.isBlank()
                ? "Demo"
                : Character.toUpperCase(demoKey.charAt(0)) + demoKey.substring(1).toLowerCase();
            String fallback = "<svg xmlns='http://www.w3.org/2000/svg' width='1200' height='800'>"
                + "<rect width='100%' height='100%' fill='#efe5dc'/>"
                + "<text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' "
                + "font-family='Arial' font-size='48' fill='#8f5f45'>" + demoLabel + " Demo</text></svg>";
            log.warn("Demo image missing on classpath: {} — used SVG fallback", classpathPath);
            return fallback.getBytes(StandardCharsets.UTF_8);
        }
        try {
            return resource.getInputStream().readAllBytes();
        } catch (IOException ex) {
            throw new IllegalStateException("Failed to read demo image: " + classpathPath, ex);
        }
    }

    private String extensionOf(String fileName) {
        int dotIndex = fileName.lastIndexOf('.');
        if (dotIndex < 0 || dotIndex == fileName.length() - 1) {
            return ".bin";
        }
        return fileName.substring(dotIndex).toLowerCase();
    }

    private String mimeTypeForExtension(String ext) {
        return switch (ext) {
            case ".jpg", ".jpeg" -> "image/jpeg";
            case ".png" -> "image/png";
            case ".webp" -> "image/webp";
            case ".gif" -> "image/gif";
            case ".svg" -> "image/svg+xml";
            default -> "application/octet-stream";
        };
    }

    // ===== Records (общие DTO для спек городских событий, сессий, артистов и публикаций) =====

    /** Обёртка над событием с пометкой, было ли оно создано в текущей транзакции. */
    public record EventHolder(Event event, boolean created) { }

    /** Сид участника, который привязывается к событиям городов. */
    public record ParticipantSeed(String name, String stageName, String description, String genre, String kind) { }

    /** Сид типа билета внутри сеанса. */
    public record TicketSeedSpec(String name, BigDecimal price, Integer quota) { }

    /** Сид сессии (один сеанс события) с адресом, временем и билетами. */
    public record SessionSeedSpec(String sessionTitle,
                                  OffsetDateTime startsAt,
                                  OffsetDateTime endsAt,
                                  String venueAddress,
                                  String manualAddress,
                                  Integer seatLimit,
                                  BigDecimal price,
                                  List<TicketSeedSpec> ticketSpecs) {

        public SessionSeedSpec(String sessionTitle,
                               OffsetDateTime startsAt,
                               OffsetDateTime endsAt,
                               String venueAddress,
                               String manualAddress,
                               Integer seatLimit,
                               BigDecimal price) {
            this(sessionTitle, startsAt, endsAt, venueAddress, manualAddress, seatLimit, price,
                defaultTicketSpecs(price, seatLimit));
        }

        public SessionSeedSpec {
            ticketSpecs = ticketSpecs == null || ticketSpecs.isEmpty()
                ? defaultTicketSpecs(price, seatLimit)
                : List.copyOf(ticketSpecs);
        }

        private static List<TicketSeedSpec> defaultTicketSpecs(BigDecimal price, Integer seatLimit) {
            BigDecimal safePrice = price == null ? BigDecimal.ZERO : price;
            String name = safePrice.compareTo(BigDecimal.ZERO) <= 0 ? "Бесплатный вход" : "Стандарт";
            return List.of(new TicketSeedSpec(name, safePrice, seatLimit == null ? 200 : seatLimit));
        }
    }

    /**
     * Сид события. {@code classpathImagePaths} — полные пути к картинкам в classpath,
     * например {@code "images/live music/foo.jpg"}.
     */
    public record EventSeedSpec(String title,
                                String shortDescription,
                                String fullDescription,
                                String ageRestriction,
                                List<String> categoryNames,
                                List<String> classpathImagePaths,
                                List<SessionSeedSpec> sessions,
                                List<String> participantNames) { }

    /**
     * Сид публикации (новости/материала вокруг события). Картинки задаются полными
     * classpath-путями.
     */
    public record PublicationSeedSpec(String title,
                                      String content,
                                      List<String> classpathImagePaths) { }
}
