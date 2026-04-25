package com.festivalapp.backend.config;

import com.festivalapp.backend.entity.Artist;
import com.festivalapp.backend.entity.Category;
import com.festivalapp.backend.entity.City;
import com.festivalapp.backend.entity.Event;
import com.festivalapp.backend.entity.EventArtist;
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
import com.festivalapp.backend.repository.PublicationImageRepository;
import com.festivalapp.backend.repository.PublicationRepository;
import com.festivalapp.backend.repository.RoleRepository;
import com.festivalapp.backend.repository.SessionRepository;
import com.festivalapp.backend.repository.TicketTypeRepository;
import com.festivalapp.backend.repository.UserRepository;
import com.festivalapp.backend.repository.UserRoleRepository;
import com.festivalapp.backend.repository.VenueRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.io.ClassPathResource;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;

@Slf4j
@Component
@RequiredArgsConstructor
public class KolomnaDemoDataInitializer implements ApplicationRunner {

    private static final String KOLOMNA_RESOURCES_PREFIX = "data/seed-images/kolomna/";
    private static final String RYAZAN_RESOURCES_PREFIX = "data/seed-images/ryazan/";
    private static final String KOLOMNA_NAME = "Коломна";
    private static final String KOLOMNA_REGION = "Московская область";
    private static final String RYAZAN_NAME = "Рязань";
    private static final String RYAZAN_REGION = "Рязанская область";

    private final CityRepository cityRepository;
    private final CategoryRepository categoryRepository;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final UserRoleRepository userRoleRepository;
    private final OrganizationRepository organizationRepository;
    private final OrganizationMemberRepository organizationMemberRepository;
    private final PublicationRepository publicationRepository;
    private final PublicationImageRepository publicationImageRepository;
    private final EventRepository eventRepository;
    private final EventCategoryRepository eventCategoryRepository;
    private final EventImageRepository eventImageRepository;
    private final ImageRepository imageRepository;
    private final VenueRepository venueRepository;
    private final SessionRepository sessionRepository;
    private final TicketTypeRepository ticketTypeRepository;
    private final ArtistRepository artistRepository;
    private final EventArtistRepository eventArtistRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.demo.kolomna-seed-enabled:true}")
    private boolean enabled;

    @Value("${app.demo.ryazan-seed-enabled:true}")
    private boolean ryazanEnabled;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (enabled) {
            seedKolomnaDemoData();
        } else {
            log.info("Kolomna demo seeding is disabled");
        }

        if (ryazanEnabled) {
            seedRyazanDemoData();
        } else {
            log.info("Ryazan demo seeding is disabled");
        }

        patchMissingSessionCoordinates();
    }

    private void patchMissingSessionCoordinates() {
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

    private void seedKolomnaDemoData() {
        OffsetDateTime now = OffsetDateTime.now();

        City kolomna = ensureKolomnaCity(now);
        Role organizerRole = ensureRole(RoleName.ROLE_ORGANIZER, "Организатор мероприятий");
        Role residentRole = ensureRole(RoleName.ROLE_RESIDENT, "Обычный житель");

        User organizer = ensureOrganizerUser(kolomna, now);
        ensureUserRole(organizer, organizerRole, now);
        ensureUserRole(organizer, residentRole, now);

        Organization organization = ensureOrganization(kolomna, now);
        ensureOrganizationMember(organizer, organization, "владелец", now);

        Image organizationLogo = ensureImage("kolomna", KOLOMNA_RESOURCES_PREFIX, "org-logo", "kolomna-logo.svg", organizer, now);
        boolean organizationUpdated = false;
        if (organization.getLogoImage() == null) {
            organization.setLogoImage(organizationLogo);
            organizationUpdated = true;
        }
        if (organization.getCoverImage() == null) {
            organization.setCoverImage(organizationLogo);
            organizationUpdated = true;
        }
        if (organizationUpdated) {
            organization.setUpdatedAt(now);
            organizationRepository.save(organization);
        }

        Map<String, Category> categories = ensureCategories();
        Map<String, Artist> artists = ensureArtists(now);

        List<EventSeedSpec> specs = buildEventSpecs(now);
        for (EventSeedSpec spec : specs) {
            EventHolder holder = ensureEventBase(spec, organization, organizer, kolomna, now);
            Event event = holder.event();

            ensureEventCategories(event, spec.categoryNames(), categories);
            ensureEventImages(event, spec.imageFiles(), organizer, now, "kolomna", KOLOMNA_RESOURCES_PREFIX);

            if (holder.created() || sessionRepository.findAllByEventIdOrderByStartsAtAsc(event.getId()).isEmpty()) {
                createSessionsAndTickets(event, spec, kolomna);
            }

            ensureEventArtists(event, spec.artistNames(), artists);
            normalizePrimaryImage(event.getId());
        }

        log.info("Kolomna demo data has been seeded/verified: {} events", specs.size());
    }

    private void seedRyazanDemoData() {
        OffsetDateTime now = OffsetDateTime.now();

        City ryazan = ensureRyazanCity(now);
        Role organizerRole = ensureRole(RoleName.ROLE_ORGANIZER, "Организатор мероприятий");
        Role residentRole = ensureRole(RoleName.ROLE_RESIDENT, "Обычный житель");

        User organizer = ensureRyazanOrganizerUser(ryazan, now);
        ensureUserRole(organizer, organizerRole, now);
        ensureUserRole(organizer, residentRole, now);

        Organization organization = ensureRyazanOrganization(ryazan, now);
        ensureOrganizationMember(organizer, organization, "владелец", now);

        Image organizationLogo = ensureImage("ryazan", RYAZAN_RESOURCES_PREFIX, "org-logo", "ryazan-logo.svg", organizer, now);
        boolean organizationUpdated = false;
        if (organization.getLogoImage() == null) {
            organization.setLogoImage(organizationLogo);
            organizationUpdated = true;
        }
        if (organization.getCoverImage() == null) {
            organization.setCoverImage(organizationLogo);
            organizationUpdated = true;
        }
        if (organizationUpdated) {
            organization.setUpdatedAt(now);
            organizationRepository.save(organization);
        }

        Map<String, Category> categories = ensureCategories();
        Map<String, Artist> artists = ensureRyazanArtists(now);
        Map<String, List<PublicationSeedSpec>> publicationsByEventTitle = buildRyazanPublicationSpecs();

        List<EventSeedSpec> specs = buildRyazanEventSpecs(now);
        for (EventSeedSpec spec : specs) {
            EventHolder holder = ensureEventBase(spec, organization, organizer, ryazan, now);
            Event event = holder.event();

            ensureEventCategories(event, spec.categoryNames(), categories);
            ensureEventImages(event, spec.imageFiles(), organizer, now, "ryazan", RYAZAN_RESOURCES_PREFIX);

            if (holder.created() || sessionRepository.findAllByEventIdOrderByStartsAtAsc(event.getId()).isEmpty()) {
                createSessionsAndTickets(event, spec, ryazan);
            }

            ensureEventArtists(event, spec.artistNames(), artists);
            ensurePublicationsForEvent(
                event,
                organization,
                organizer,
                publicationsByEventTitle.getOrDefault(spec.title(), List.of()),
                now,
                "ryazan",
                RYAZAN_RESOURCES_PREFIX
            );
            normalizePrimaryImage(event.getId());
        }

        log.info("Ryazan demo data has been seeded/verified: {} events", specs.size());
    }

    private void ensurePublicationsForEvent(Event event,
                                            Organization organization,
                                            User author,
                                            List<PublicationSeedSpec> specs,
                                            OffsetDateTime now,
                                            String demoKey,
                                            String resourcesPrefix) {
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
            for (int imageIndex = 0; imageIndex < spec.imageFiles().size(); imageIndex += 1) {
                String imageFile = spec.imageFiles().get(imageIndex);
                String imageKey = "publication-" + event.getId() + "-" + publicationIndex + "-" + imageIndex + "-" + imageFile.replace('.', '-');
                Image image = ensureImage(demoKey, resourcesPrefix, imageKey, imageFile, author, now);
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

    private Map<String, List<PublicationSeedSpec>> buildRyazanPublicationSpecs() {
        return Map.of(
            "Ночь музыки на Почтовой",
            List.of(
                new PublicationSeedSpec(
                    "Программа вечера: Ночь музыки на Почтовой",
                    "Открываем площадку в 18:30, первый сет стартует в 19:00. В программе электронный лайв, саксофон и финальный джем.",
                    List.of("ryazan-night.svg")
                ),
                new PublicationSeedSpec(
                    "Как добраться и что взять с собой",
                    "Площадка находится в пешеходной зоне. Рекомендуем приходить за 20 минут до начала, взять документ и электронный билет.",
                    List.of("ryazan-festival.svg")
                )
            ),
            "Лекторий: Истории старой Рязани",
            List.of(
                new PublicationSeedSpec(
                    "Темы лектория и расписание вопросов",
                    "Разберем три эпохи города, ключевые архитектурные объекты и редкие исторические факты. В конце — открытая сессия вопросов.",
                    List.of("ryazan-lecture.svg")
                )
            ),
            "Семейный фестиваль у Кремля",
            List.of(
                new PublicationSeedSpec(
                    "Карта активностей фестиваля",
                    "На фестивале будут детская зона, мастер-классы, сцена живой музыки и гастрономический дворик. Для семей с детьми подготовлен отдельный маршрут.",
                    List.of("ryazan-festival.svg")
                ),
                new PublicationSeedSpec(
                    "Вечерняя программа и регистрация на мастер-классы",
                    "Для вечернего блока открыта отдельная регистрация. Количество мест ограничено, просим приходить заранее.",
                    List.of("ryazan-night.svg", "ryazan-lecture.svg")
                )
            )
        );
    }

    private City ensureKolomnaCity(OffsetDateTime now) {
        return cityRepository.findFirstByNameIgnoreCaseAndRegionIgnoreCase(KOLOMNA_NAME, KOLOMNA_REGION)
            .or(() -> cityRepository.findFirstByNameIgnoreCase(KOLOMNA_NAME))
            .orElseGet(() -> cityRepository.save(City.builder()
                .name(KOLOMNA_NAME)
                .region(KOLOMNA_REGION)
                .active(true)
                .createdAt(now)
                .build()));
    }

    private City ensureRyazanCity(OffsetDateTime now) {
        return cityRepository.findFirstByNameIgnoreCaseAndRegionIgnoreCase(RYAZAN_NAME, RYAZAN_REGION)
            .or(() -> cityRepository.findFirstByNameIgnoreCase(RYAZAN_NAME))
            .orElseGet(() -> cityRepository.save(City.builder()
                .name(RYAZAN_NAME)
                .region(RYAZAN_REGION)
                .active(true)
                .createdAt(now)
                .build()));
    }

    private Role ensureRole(RoleName roleName, String description) {
        return roleRepository.findByName(roleName)
            .orElseGet(() -> roleRepository.save(Role.builder()
                .name(roleName.toDbName())
                .description(description)
                .build()));
    }

    private User ensureOrganizerUser(City city, OffsetDateTime now) {
        User user = userRepository.findByEmail("organizer.kolomna@festival.local")
            .orElseGet(() -> userRepository.save(User.builder()
                .login("organizer_kolomna")
                .email("organizer.kolomna@festival.local")
                .phone("+79001230001")
                .passwordHash(passwordEncoder.encode("123456"))
                .firstName("Алексей")
                .lastName("Коломенский")
                .registeredAt(now)
                .active(true)
                .city(city)
                .createdAt(now)
                .updatedAt(now)
                .build()));

        boolean changed = false;
        if (!user.isActive()) {
            user.setActive(true);
            changed = true;
        }
        if (user.getCity() == null) {
            user.setCity(city);
            changed = true;
        }
        if (changed) {
            user.setUpdatedAt(now);
            return userRepository.save(user);
        }
        return user;
    }

    private User ensureRyazanOrganizerUser(City city, OffsetDateTime now) {
        User user = userRepository.findByEmail("organizer.ryazan@festival.local")
            .orElseGet(() -> userRepository.save(User.builder()
                .login("organizer_ryazan")
                .email("organizer.ryazan@festival.local")
                .phone("+79001230012")
                .passwordHash(passwordEncoder.encode("123456"))
                .firstName("Ольга")
                .lastName("Рязанская")
                .registeredAt(now)
                .active(true)
                .city(city)
                .createdAt(now)
                .updatedAt(now)
                .build()));

        boolean changed = false;
        if (!user.isActive()) {
            user.setActive(true);
            changed = true;
        }
        if (user.getCity() == null) {
            user.setCity(city);
            changed = true;
        }
        if (changed) {
            user.setUpdatedAt(now);
            return userRepository.save(user);
        }
        return user;
    }

    private void ensureUserRole(User user, Role role, OffsetDateTime now) {
        if (userRoleRepository.existsByUserIdAndRoleId(user.getId(), role.getId())) {
            return;
        }
        userRoleRepository.save(UserRole.builder()
            .user(user)
            .role(role)
            .assignedAt(now)
            .build());
    }

    private Organization ensureOrganization(City city, OffsetDateTime now) {
        return organizationRepository.findByNameIgnoreCase("Коломенское арт-сообщество")
            .orElseGet(() -> organizationRepository.save(Organization.builder()
                .city(city)
                .name("Коломенское арт-сообщество")
                .description("Локальная организация для культурных и городских событий Коломны.")
                .contactEmail("hello@kolomna-events.local")
                .contactPhone("+74966123456")
                .website("https://kolomna-events.local")
                .socialLinks("vk.com/kolomna_events")
                .moderationStatus("одобрена")
                .createdAt(now)
                .updatedAt(now)
                .build()));
    }

    private Organization ensureRyazanOrganization(City city, OffsetDateTime now) {
        return organizationRepository.findByNameIgnoreCase("Рязанская культурная лаборатория")
            .orElseGet(() -> organizationRepository.save(Organization.builder()
                .city(city)
                .name("Рязанская культурная лаборатория")
                .description("Команда, которая объединяет современные городские форматы и культурные инициативы Рязани.")
                .contactEmail("hello@ryazan-events.local")
                .contactPhone("+74912456789")
                .website("https://ryazan-events.local")
                .socialLinks("vk.com/ryazan_events")
                .moderationStatus("одобрена")
                .createdAt(now)
                .updatedAt(now)
                .build()));
    }

    private void ensureOrganizationMember(User user, Organization organization, String status, OffsetDateTime now) {
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

    private Map<String, Category> ensureCategories() {
        Map<String, String> source = Map.of(
            "Концерт", "Музыкальные живые выступления",
            "Лекция", "Образовательные публичные выступления",
            "Фестиваль", "Городские и тематические фестивали",
            "Мастер-класс", "Практические занятия с ведущими"
        );

        Map<String, Category> result = new HashMap<>();
        for (Map.Entry<String, String> entry : source.entrySet()) {
            Category category = categoryRepository.findByNameIgnoreCase(entry.getKey())
                .orElseGet(() -> categoryRepository.save(Category.builder()
                    .name(entry.getKey())
                    .description(entry.getValue())
                    .build()));
            result.put(entry.getKey(), category);
        }
        return result;
    }

    private Map<String, Artist> ensureArtists(OffsetDateTime now) {
        List<Artist> existing = artistRepository.findAllByDeletedAtIsNullOrderByNameAsc();
        Map<String, Artist> byName = new HashMap<>();
        existing.forEach(artist -> byName.put(artist.getName().toLowerCase(), artist));

        List<ArtistSeed> seeds = List.of(
            new ArtistSeed("Илья Лебедев", "IL LEBED", "Электронный музыкант и лайв-исполнитель из Коломны.", "Электроника"),
            new ArtistSeed("Алексей Руденко", "Rudenko Sax", "Саксофонист с джазовыми и lounge-сетами.", "Джаз"),
            new ArtistSeed("Егор Нечаев", "Егор Нечаев", "Лектор и популяризатор науки, автор цикла о космосе.", "Лектор"),
            new ArtistSeed("Марина Соколова", "Марина Соколова", "Вокалистка с акустической концертной программой.", "Акустика"),
            new ArtistSeed("Павел Громов", "Павел Громов", "Ведущий детских мастер-классов по робототехнике.", "Образование")
        );

        for (ArtistSeed seed : seeds) {
            byName.computeIfAbsent(seed.name().toLowerCase(), ignored -> artistRepository.save(Artist.builder()
                .name(seed.name())
                .stageName(seed.stageName())
                .description(seed.description())
                .genre(seed.genre())
                .createdAt(now)
                .updatedAt(now)
                .build()));
        }
        return byName;
    }

    private Map<String, Artist> ensureRyazanArtists(OffsetDateTime now) {
        List<Artist> existing = artistRepository.findAllByDeletedAtIsNullOrderByNameAsc();
        Map<String, Artist> byName = new HashMap<>();
        existing.forEach(artist -> byName.put(artist.getName().toLowerCase(), artist));

        List<ArtistSeed> seeds = List.of(
            new ArtistSeed("Дарья Белова", "Daria Belova", "Вокалистка с инди-поп программой и камерным составом.", "Инди"),
            new ArtistSeed("Антон Сухов", "Антон Сухов", "Городской историк и лектор о культурном наследии Рязани.", "Лектор"),
            new ArtistSeed("Никита Власов", "NVLS", "Электронный продюсер и лайв-исполнитель с атмосферными сетами.", "Электроника"),
            new ArtistSeed("Елена Гурьева", "Елена Гурьева", "Куратор семейных мастер-классов и интерактивных программ.", "Образование"),
            new ArtistSeed("Сергей Титов", "Sergey Titov Quartet", "Саксофонист и руководитель городского джаз-квартета.", "Джаз")
        );

        for (ArtistSeed seed : seeds) {
            byName.computeIfAbsent(seed.name().toLowerCase(), ignored -> artistRepository.save(Artist.builder()
                .name(seed.name())
                .stageName(seed.stageName())
                .description(seed.description())
                .genre(seed.genre())
                .createdAt(now)
                .updatedAt(now)
                .build()));
        }
        return byName;
    }

    private EventHolder ensureEventBase(EventSeedSpec spec,
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
        boolean isFree = spec.sessions().stream().allMatch(session -> session.price().compareTo(BigDecimal.ZERO) <= 0);

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

    private void ensureEventCategories(Event event, List<String> categoryNames, Map<String, Category> categories) {
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

    private void ensureEventImages(Event event,
                                   List<String> imageFiles,
                                   User uploader,
                                   OffsetDateTime now,
                                   String demoKey,
                                   String resourcesPrefix) {
        List<EventImage> existing = eventImageRepository.findAllByEventIdOrderBySortOrderAscIdAsc(event.getId());
        Set<Long> existingImageIds = new HashSet<>();
        for (EventImage image : existing) {
            if (image.getImage() != null) {
                existingImageIds.add(image.getImage().getId());
            }
        }

        int sortOrder = existing.size();
        boolean hasPrimary = existing.stream().anyMatch(EventImage::isPrimary);

        for (int i = 0; i < imageFiles.size(); i += 1) {
            String imageFile = imageFiles.get(i);
            String key = "event-" + event.getId() + "-" + i + "-" + imageFile.replace('.', '-');
            Image image = ensureImage(demoKey, resourcesPrefix, key, imageFile, uploader, now);
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

    private void normalizePrimaryImage(Long eventId) {
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

    private void createSessionsAndTickets(Event event, EventSeedSpec spec, City city) {
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
                ticketTypeRepository.save(TicketType.builder()
                    .session(session)
                    .name(sessionSpec.price().compareTo(BigDecimal.ZERO) <= 0 ? "Бесплатный вход" : "Стандарт")
                    .price(sessionSpec.price())
                    .currency("RUB")
                    .quota(sessionSpec.seatLimit() == null ? 200 : sessionSpec.seatLimit())
                    .active(true)
                    .salesStartAt(OffsetDateTime.now().minusDays(1))
                    .salesEndAt(sessionSpec.startsAt())
                    .build());
            }
        }
    }

    private void ensureEventArtists(Event event, List<String> artistNames, Map<String, Artist> artists) {
        List<EventArtist> existing = eventArtistRepository.findAllByEventIdOrderByIdAsc(event.getId());
        Set<Long> existingArtistIds = new HashSet<>();
        for (EventArtist eventArtist : existing) {
            if (eventArtist.getArtist() != null) {
                existingArtistIds.add(eventArtist.getArtist().getId());
            }
        }

        for (String artistName : artistNames) {
            Artist artist = artists.get(artistName.toLowerCase());
            if (artist == null || existingArtistIds.contains(artist.getId())) {
                continue;
            }
            eventArtistRepository.save(EventArtist.builder()
                .event(event)
                .artist(artist)
                .build());
        }
    }

    private Image ensureImage(String demoKey,
                              String resourcesPrefix,
                              String key,
                              String imageFile,
                              User uploader,
                              OffsetDateTime now) {
        String ext = extensionOf(imageFile);
        String fileName = "seed-" + demoKey + "-" + key + ext;

        Optional<Image> existing = imageRepository.findByFileName(fileName);
        if (existing.isPresent()) {
            return existing.get();
        }

        byte[] bytes = readClasspathBytes(resourcesPrefix + imageFile, demoKey);
        String mime = mimeTypeForExtension(ext);

        Image saved = imageRepository.save(Image.builder()
            .fileName(fileName)
            .mimeType(mime)
            .fileSize((long) bytes.length)
            .fileData(bytes)
            .uploadedAt(now)
            .uploadedByUser(uploader)
            .build());
        return saved;
    }

    private byte[] readClasspathBytes(String classpathPath, String demoKey) {
        ClassPathResource resource = new ClassPathResource(classpathPath);
        if (!resource.exists()) {
            String demoLabel = demoKey == null || demoKey.isBlank()
                ? "Demo"
                : Character.toUpperCase(demoKey.charAt(0)) + demoKey.substring(1).toLowerCase();
            String fallback = "<svg xmlns='http://www.w3.org/2000/svg' width='1200' height='800'>"
                + "<rect width='100%' height='100%' fill='#efe5dc'/>"
                + "<text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' "
                + "font-family='Arial' font-size='48' fill='#8f5f45'>" + demoLabel + " Demo</text></svg>";
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

    private List<EventSeedSpec> buildEventSpecs(OffsetDateTime now) {
        List<EventSeedSpec> result = new ArrayList<>();

        result.add(new EventSeedSpec(
            "Джазовый вечер у Коломенки",
            "Камерный джазовый концерт на одной из главных площадок Коломны.",
            "Вечер живого джаза с саксофоном, авторскими композициями и уютной атмосферой для жителей и гостей города.",
            "12+",
            List.of("Концерт", "Фестиваль"),
            List.of("kolomna-jazz.svg", "kolomna-festival.svg"),
            List.of(
                new SessionSeedSpec(
                    "Вечерний концерт",
                    now.plusDays(7).withHour(19).withMinute(0).withSecond(0).withNano(0),
                    now.plusDays(7).withHour(21).withMinute(30).withSecond(0).withNano(0),
                    "Московская область, Коломна, Набережная реки Коломенки, 7",
                    null,
                    350,
                    new BigDecimal("900.00")
                )
            ),
            List.of("Илья Лебедев", "Алексей Руденко")
        ));

        result.add(new EventSeedSpec(
            "Лекторий: Космос над Коломной",
            "Открытая лекция о космических миссиях и наблюдениях.",
            "Простым языком о современном космосе: от телескопов до межпланетных миссий. Подойдет всей семье.",
            "6+",
            List.of("Лекция"),
            List.of("kolomna-lecture.svg", "kolomna-jazz.svg"),
            List.of(
                new SessionSeedSpec(
                    "Главная лекция",
                    now.plusDays(10).withHour(18).withMinute(30).withSecond(0).withNano(0),
                    now.plusDays(10).withHour(20).withMinute(0).withSecond(0).withNano(0),
                    null,
                    "Московская область, Коломна, улица Лажечникова, 5",
                    150,
                    BigDecimal.ZERO
                )
            ),
            List.of("Егор Нечаев")
        ));

        result.add(new EventSeedSpec(
            "Семейный фестиваль выходного дня",
            "Музыка, мастер-классы и городские активности для всей семьи.",
            "Дневной фестиваль с двумя сеансами в разных локациях: концертная программа, интерактивы и образовательная зона.",
            "0+",
            List.of("Фестиваль", "Мастер-класс"),
            List.of("kolomna-festival.svg", "kolomna-lecture.svg"),
            List.of(
                new SessionSeedSpec(
                    "Городская программа",
                    now.plusDays(12).withHour(11).withMinute(0).withSecond(0).withNano(0),
                    now.plusDays(12).withHour(15).withMinute(0).withSecond(0).withNano(0),
                    "Московская область, Коломна, Красногвардейская улица, 2",
                    null,
                    220,
                    BigDecimal.ZERO
                ),
                new SessionSeedSpec(
                    "Семейный вечер",
                    now.plusDays(13).withHour(12).withMinute(0).withSecond(0).withNano(0),
                    now.plusDays(13).withHour(16).withMinute(0).withSecond(0).withNano(0),
                    null,
                    "Московская область, Коломна, улица Зайцева, 14",
                    120,
                    new BigDecimal("500.00")
                )
            ),
            List.of("Марина Соколова", "Павел Громов")
        ));

        return result;
    }

    private List<EventSeedSpec> buildRyazanEventSpecs(OffsetDateTime now) {
        List<EventSeedSpec> result = new ArrayList<>();

        result.add(new EventSeedSpec(
            "Ночь музыки на Почтовой",
            "Современный городской концерт в центре Рязани.",
            "Вечерняя программа с лайв-электроникой, вокалом и джазовыми импровизациями на главной пешеходной улице города.",
            "12+",
            List.of("Концерт", "Фестиваль"),
            List.of("ryazan-night.svg", "ryazan-festival.svg"),
            List.of(
                new SessionSeedSpec(
                    "Главный вечерний сет",
                    now.plusDays(8).withHour(19).withMinute(30).withSecond(0).withNano(0),
                    now.plusDays(8).withHour(22).withMinute(0).withSecond(0).withNano(0),
                    null,
                    "Рязанская область, Рязань, улица Почтовая, 54",
                    420,
                    new BigDecimal("1200.00")
                )
            ),
            List.of("Дарья Белова", "Никита Власов", "Сергей Титов")
        ));

        result.add(new EventSeedSpec(
            "Лекторий: Истории старой Рязани",
            "Публичная лекция о ключевых страницах истории города.",
            "Разговор о развитии Рязани, ее культурном коде и архитектурных символах. Формат подойдет и школьникам, и взрослым.",
            "6+",
            List.of("Лекция"),
            List.of("ryazan-lecture.svg", "ryazan-festival.svg"),
            List.of(
                new SessionSeedSpec(
                    "Открытая лекция",
                    now.plusDays(11).withHour(18).withMinute(0).withSecond(0).withNano(0),
                    now.plusDays(11).withHour(19).withMinute(40).withSecond(0).withNano(0),
                    null,
                    "Рязанская область, Рязань, Соборная площадь, 13",
                    180,
                    BigDecimal.ZERO
                )
            ),
            List.of("Антон Сухов")
        ));

        result.add(new EventSeedSpec(
            "Семейный фестиваль у Кремля",
            "Дневная и вечерняя программы для всей семьи рядом с Рязанским кремлем.",
            "Музыка, интерактивные зоны, мастер-классы и образовательные активности. Формат рассчитан на разный возраст и семейный отдых.",
            "0+",
            List.of("Фестиваль", "Мастер-класс"),
            List.of("ryazan-festival.svg", "ryazan-lecture.svg"),
            List.of(
                new SessionSeedSpec(
                    "Дневная семейная программа",
                    now.plusDays(14).withHour(11).withMinute(0).withSecond(0).withNano(0),
                    now.plusDays(14).withHour(15).withMinute(30).withSecond(0).withNano(0),
                    null,
                    "Рязанская область, Рязань, Кремлевский вал, 10",
                    260,
                    BigDecimal.ZERO
                ),
                new SessionSeedSpec(
                    "Вечерние мастер-классы",
                    now.plusDays(14).withHour(17).withMinute(0).withSecond(0).withNano(0),
                    now.plusDays(14).withHour(20).withMinute(0).withSecond(0).withNano(0),
                    null,
                    "Рязанская область, Рязань, Кремлевский вал, 10",
                    140,
                    new BigDecimal("700.00")
                )
            ),
            List.of("Елена Гурьева", "Дарья Белова")
        ));

        return result;
    }

    private record EventHolder(Event event, boolean created) {
    }

    private record ArtistSeed(String name, String stageName, String description, String genre) {
    }

    private record SessionSeedSpec(String sessionTitle,
                                   OffsetDateTime startsAt,
                                   OffsetDateTime endsAt,
                                   String venueAddress,
                                   String manualAddress,
                                   Integer seatLimit,
                                   BigDecimal price) {
    }

    private record EventSeedSpec(String title,
                                 String shortDescription,
                                 String fullDescription,
                                 String ageRestriction,
                                 List<String> categoryNames,
                                 List<String> imageFiles,
                                 List<SessionSeedSpec> sessions,
                                 List<String> artistNames) {
    }

    private record PublicationSeedSpec(String title,
                                       String content,
                                       List<String> imageFiles) {
    }
}
