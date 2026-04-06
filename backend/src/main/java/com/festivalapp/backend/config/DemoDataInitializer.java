package com.festivalapp.backend.config;

import com.festivalapp.backend.entity.Category;
import com.festivalapp.backend.entity.City;
import com.festivalapp.backend.entity.Event;
import com.festivalapp.backend.entity.EventStatus;
import com.festivalapp.backend.entity.Favorite;
import com.festivalapp.backend.entity.Organization;
import com.festivalapp.backend.entity.Organizer;
import com.festivalapp.backend.entity.Publication;
import com.festivalapp.backend.entity.PublicationStatus;
import com.festivalapp.backend.entity.Review;
import com.festivalapp.backend.entity.Role;
import com.festivalapp.backend.entity.RoleName;
import com.festivalapp.backend.entity.Session;
import com.festivalapp.backend.entity.User;
import com.festivalapp.backend.entity.UserRole;
import com.festivalapp.backend.entity.UserRoleId;
import com.festivalapp.backend.entity.UserStatus;
import com.festivalapp.backend.entity.Venue;
import com.festivalapp.backend.repository.CategoryRepository;
import com.festivalapp.backend.repository.CityRepository;
import com.festivalapp.backend.repository.EventRepository;
import com.festivalapp.backend.repository.FavoriteRepository;
import com.festivalapp.backend.repository.OrganizationRepository;
import com.festivalapp.backend.repository.OrganizerRepository;
import com.festivalapp.backend.repository.PublicationRepository;
import com.festivalapp.backend.repository.ReviewRepository;
import com.festivalapp.backend.repository.RoleRepository;
import com.festivalapp.backend.repository.SessionRepository;
import com.festivalapp.backend.repository.UserRepository;
import com.festivalapp.backend.repository.UserRoleRepository;
import com.festivalapp.backend.repository.VenueRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

@Component
@Order(3)
@RequiredArgsConstructor
public class DemoDataInitializer implements CommandLineRunner {

    private static final String DEMO_PASSWORD = "Passw0rd123";

    private static final String ADMIN_LOGIN = "admin1";
    private static final String ADMIN_EMAIL = "admin1@mail.com";

    private static final String RESIDENT1_LOGIN = "resident1";
    private static final String RESIDENT1_EMAIL = "resident1@mail.com";
    private static final String RESIDENT2_LOGIN = "resident2";
    private static final String RESIDENT2_EMAIL = "resident2@mail.com";
    private static final String RESIDENT3_LOGIN = "resident3";
    private static final String RESIDENT3_EMAIL = "resident3@mail.com";
    private static final String RESIDENT4_LOGIN = "resident4";
    private static final String RESIDENT4_EMAIL = "resident4@mail.com";

    private static final String EVENT_JAZZ = "Летний джаз в Коломне";
    private static final String EVENT_THEATRE = "Коломенский театральный вечер";
    private static final String EVENT_HISTORY = "Выставка История Коломны";
    private static final String EVENT_CITY_DAY = "День города Коломны";
    private static final String EVENT_BOOK_FAIR = "Книжная ярмарка у кремля";
    private static final String EVENT_SCIENCE_FEST = "Научный фестиваль для школьников";
    private static final String EVENT_FAMILY_WEEKEND = "Семейные выходные в парке";
    private static final String EVENT_FILM_NIGHT = "Ночь короткометражного кино";
    private static final String EVENT_FOOD_MARKET = "Фестиваль локальной кухни";
    private static final String EVENT_STREET_SPORT = "Уличный спортивный день";
    private static final String EVENT_MUSEUM_FORUM = "Форум музейных практик";
    private static final String EVENT_RIVER_LIGHTS = "Световой фестиваль на набережной";
    private static final String EVENT_OPEN_AIR_OPERA = "Опера под открытым небом";
    private static final String EVENT_CREATIVE_LABS = "Лаборатории креативных индустрий";
    private static final String EVENT_LOCAL_GUIDES = "Форум городских экскурсоводов";

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final UserRoleRepository userRoleRepository;
    private final OrganizationRepository organizationRepository;
    private final OrganizerRepository organizerRepository;
    private final CategoryRepository categoryRepository;
    private final CityRepository cityRepository;
    private final VenueRepository venueRepository;
    private final EventRepository eventRepository;
    private final SessionRepository sessionRepository;
    private final PublicationRepository publicationRepository;
    private final ReviewRepository reviewRepository;
    private final FavoriteRepository favoriteRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public void run(String... args) {
        ensureAdminUser();

        List<Organizer> organizers = ensureOrganizerProfiles();
        List<User> residents = ensureResidentUsers();

        Category music = ensureCategory("Музыка", "Музыкальные мероприятия");
        Category theatre = ensureCategory("Театр", "Театральные постановки");
        Category exhibition = ensureCategory("Выставка", "Художественные и тематические выставки");
        Category cityHoliday = ensureCategory("Городской праздник", "Праздничные мероприятия для жителей города");
        Category education = ensureCategory("Образование", "Лекции, мастер-классы и просветительские события");
        Category children = ensureCategory("Детям", "Семейные и детские программы");
        Category gastronomy = ensureCategory("Гастрономия", "Фестивали еды и фермерские маркеты");
        Category cinema = ensureCategory("Кино", "Показы, кинодискуссии и фестивали кино");
        Category sport = ensureCategory("Спорт", "Спортивные и активные городские события");
        Category literature = ensureCategory("Литература", "Книжные ярмарки, встречи с авторами и чтения");

        City kolomna = ensureCity("Коломна", "Московская область", "Россия");
        City moscow = ensureCity("Москва", "Москва", "Россия");
        City ryazan = ensureCity("Рязань", "Рязанская область", "Россия");
        City tula = ensureCity("Тула", "Тульская область", "Россия");

        Venue park = ensureVenue(kolomna, "Городской парк", "ул. Левшина, 15", 2500,
            new BigDecimal("55.103200"), new BigDecimal("38.754800"));
        Venue cultureHouse = ensureVenue(kolomna, "Дом культуры", "ул. Октябрьской Революции, 324", 900,
            new BigDecimal("55.100700"), new BigDecimal("38.766300"));
        Venue centralSquare = ensureVenue(kolomna, "Центральная площадь", "пл. Советская, 1", 5000,
            new BigDecimal("55.099900"), new BigDecimal("38.769500"));
        Venue artCenter = ensureVenue(moscow, "Арт-кластер Восток", "ул. Электрозаводская, 21", 1400,
            new BigDecimal("55.790550"), new BigDecimal("37.704620"));
        Venue riverEmbankment = ensureVenue(ryazan, "Набережная Трубежа", "Набережная улица, 2", 3000,
            new BigDecimal("54.625530"), new BigDecimal("39.742020"));
        Venue museumHall = ensureVenue(tula, "Музейный квартал", "ул. Металлистов, 12", 1100,
            new BigDecimal("54.196070"), new BigDecimal("37.615830"));

        List<Event> events = seedEvents(
            organizers,
            park,
            cultureHouse,
            centralSquare,
            artCenter,
            riverEmbankment,
            museumHall,
            music,
            theatre,
            exhibition,
            cityHoliday,
            education,
            children,
            gastronomy,
            cinema,
            sport,
            literature
        );

        Map<Long, User> publicationAuthorsByOrganization = buildPublicationAuthorsByOrganization(organizers);

        seedSessions(events);
        seedPublications(publicationAuthorsByOrganization, events);
        seedReviews(residents, events);
        seedFavorites(residents, events);
    }

    private void ensureAdminUser() {
        User adminUser = userRepository.findByLogin(ADMIN_LOGIN)
            .or(() -> userRepository.findByEmail(ADMIN_EMAIL))
            .orElseGet(() -> userRepository.save(User.builder()
                .login(ADMIN_LOGIN)
                .email(ADMIN_EMAIL)
                .passwordHash(passwordEncoder.encode(DEMO_PASSWORD))
                .firstName("System")
                .lastName("Admin")
                .phone("+79990000012")
                .createdAt(LocalDateTime.now())
                .status(UserStatus.ACTIVE)
                .build()));

        ensureRoleAssignment(adminUser, RoleName.ROLE_ADMIN);
    }

    private List<Organizer> ensureOrganizerProfiles() {
        List<Organizer> organizers = new ArrayList<>();

        organizers.add(ensureOrganizerProfile(
            "organizer1",
            "organizer1@mail.com",
            "Ivan",
            "Organizer",
            "+79990000011",
            "МБУК Центр культурных инициатив Коломны",
            "Официальный организатор городских культурных мероприятий Коломны"
        ));
        organizers.add(ensureOrganizerProfile(
            "organizer2",
            "organizer2@mail.com",
            "Olga",
            "Mirova",
            "+79990000031",
            "АНО Арт-Коломна",
            "Некоммерческая организация, развивающая творческие проекты и локальные фестивали"
        ));
        organizers.add(ensureOrganizerProfile(
            "organizer3",
            "organizer3@mail.com",
            "Sergey",
            "Pankov",
            "+79990000032",
            "Фонд Городские маршруты",
            "Фонд поддержки городских культурных, образовательных и туристических инициатив"
        ));
        organizers.add(ensureOrganizerProfile(
            "organizer4",
            "organizer4@mail.com",
            "Marina",
            "Egorova",
            "+79990000033",
            "Центр молодежных инициатив Подмосковья",
            "Региональный центр молодежных программ, городских форумов и креативных лабораторий"
        ));
        organizers.add(ensureOrganizerProfile(
            "organizer5",
            "organizer5@mail.com",
            "Dmitry",
            "Tarasov",
            "+79990000034",
            "Ассоциация событийного туризма Центрального региона",
            "Ассоциация, продвигающая событийный туризм и межрегиональные культурные проекты"
        ));

        return organizers;
    }

    private Organizer ensureOrganizerProfile(String login,
                                            String email,
                                            String firstName,
                                            String lastName,
                                            String phone,
                                            String organizationName,
                                            String organizationDescription) {
        User organizerUser = userRepository.findByLogin(login)
            .or(() -> userRepository.findByEmail(email))
            .orElseGet(() -> userRepository.save(User.builder()
                .login(login)
                .email(email)
                .passwordHash(passwordEncoder.encode(DEMO_PASSWORD))
                .firstName(firstName)
                .lastName(lastName)
                .phone(phone)
                .createdAt(LocalDateTime.now())
                .status(UserStatus.ACTIVE)
                .build()));

        ensureRoleAssignment(organizerUser, RoleName.ROLE_ORGANIZER);

        String contacts = organizerUser.getPhone() == null
            ? organizerUser.getEmail()
            : organizerUser.getEmail() + ", " + organizerUser.getPhone();

        Organization organization = organizationRepository.findByNameIgnoreCase(organizationName)
            .orElseGet(() -> organizationRepository.save(Organization.builder()
                .name(organizationName)
                .description(organizationDescription)
                .contacts(contacts)
                .build()));

        Organizer organizer = organizerRepository.findByUserId(organizerUser.getId())
            .orElseGet(() -> Organizer.builder().user(organizerUser).build());
        organizer.setOrganization(organization);
        organizer.setUser(organizerUser);
        return organizerRepository.save(organizer);
    }

    private List<User> ensureResidentUsers() {
        List<User> residents = new ArrayList<>();
        residents.add(ensureResidentUser(RESIDENT1_LOGIN, RESIDENT1_EMAIL, "Anna", "Smirnova", "+79990000021"));
        residents.add(ensureResidentUser(RESIDENT2_LOGIN, RESIDENT2_EMAIL, "Petr", "Volkov", "+79990000022"));
        residents.add(ensureResidentUser(RESIDENT3_LOGIN, RESIDENT3_EMAIL, "Maria", "Sokolova", "+79990000023"));
        residents.add(ensureResidentUser(RESIDENT4_LOGIN, RESIDENT4_EMAIL, "Nikita", "Morozov", "+79990000024"));
        return residents;
    }

    private User ensureResidentUser(String login, String email, String firstName, String lastName, String phone) {
        User resident = userRepository.findByLogin(login)
            .or(() -> userRepository.findByEmail(email))
            .orElseGet(() -> userRepository.save(User.builder()
                .login(login)
                .email(email)
                .passwordHash(passwordEncoder.encode(DEMO_PASSWORD))
                .firstName(firstName)
                .lastName(lastName)
                .phone(phone)
                .createdAt(LocalDateTime.now())
                .status(UserStatus.ACTIVE)
                .build()));

        ensureRoleAssignment(resident, RoleName.ROLE_RESIDENT);
        return resident;
    }

    private void ensureRoleAssignment(User user, RoleName roleName) {
        Role role = roleRepository.findByName(roleName)
            .orElseGet(() -> roleRepository.save(Role.builder().name(roleName).build()));

        UserRoleId userRoleId = UserRoleId.builder()
            .userId(user.getId())
            .roleId(role.getId())
            .build();

        if (userRoleRepository.findById(userRoleId).isPresent()) {
            return;
        }

        userRoleRepository.save(UserRole.builder()
            .id(userRoleId)
            .user(user)
            .role(role)
            .build());
    }

    private Category ensureCategory(String name, String description) {
        return categoryRepository.findByNameIgnoreCase(name)
            .orElseGet(() -> categoryRepository.save(Category.builder()
                .name(name)
                .description(description)
                .build()));
    }

    private City ensureCity(String name, String region, String country) {
        return cityRepository.findFirstByNameIgnoreCaseAndRegionIgnoreCaseAndCountryIgnoreCase(name, region, country)
            .orElseGet(() -> cityRepository.save(City.builder()
                .name(name)
                .region(region)
                .country(country)
                .build()));
    }

    private Venue ensureVenue(City city,
                              String name,
                              String address,
                              Integer capacity,
                              BigDecimal latitude,
                              BigDecimal longitude) {
        Venue venue = venueRepository.findFirstByAddressIgnoreCaseAndCityId(address, city.getId())
            .orElseGet(() -> Venue.builder().city(city).build());

        venue.setName(name);
        venue.setAddress(address);
        venue.setCapacity(capacity);
        venue.setLatitude(latitude);
        venue.setLongitude(longitude);
        venue.setCity(city);
        return venueRepository.save(venue);
    }

    private List<Event> seedEvents(List<Organizer> organizers,
                                   Venue park,
                                   Venue cultureHouse,
                                   Venue centralSquare,
                                   Venue artCenter,
                                   Venue riverEmbankment,
                                   Venue museumHall,
                                   Category music,
                                   Category theatre,
                                   Category exhibition,
                                   Category cityHoliday,
                                   Category education,
                                   Category children,
                                   Category gastronomy,
                                   Category cinema,
                                   Category sport,
                                   Category literature) {
        Map<String, Event> existingByTitle = new HashMap<>();
        for (Event event : eventRepository.findAll()) {
            existingByTitle.putIfAbsent(normalizeKey(event.getTitle()), event);
        }

        Map<String, Organizer> organizerByLogin = new HashMap<>();
        for (Organizer organizer : organizers) {
            if (organizer != null && organizer.getUser() != null) {
                organizerByLogin.put(organizer.getUser().getLogin(), organizer);
            }
        }

        LocalDateTime now = LocalDateTime.now();
        List<Event> events = new ArrayList<>();

        Organizer org1 = organizerByLogin.get("organizer1");
        Organizer org2 = organizerByLogin.get("organizer2");
        Organizer org3 = organizerByLogin.get("organizer3");
        Organizer org4 = organizerByLogin.get("organizer4");
        Organizer org5 = organizerByLogin.get("organizer5");

        if (org1 != null) {
            events.add(saveOrUpdateEvent(existingByTitle, org1.getOrganization(), park,
                Set.of(music, cityHoliday), EVENT_JAZZ,
                "Большой летний концерт на открытой сцене.",
                "Летний джаз в Коломне объединяет местные и приглашенные коллективы на открытой сцене городского парка.",
                12, "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4", EventStatus.PUBLISHED, now.minusDays(12)));
            events.add(saveOrUpdateEvent(existingByTitle, org1.getOrganization(), cultureHouse,
                Set.of(theatre, exhibition), EVENT_THEATRE,
                "Камерный спектакль и встреча с режиссером.",
                "Коломенский театральный вечер включает премьерный показ и открытое обсуждение после спектакля.",
                16, "https://images.unsplash.com/photo-1460723237483-7a6dc9d0b212", EventStatus.PENDING_APPROVAL, now.minusDays(10)));
            events.add(saveOrUpdateEvent(existingByTitle, org1.getOrganization(), cultureHouse,
                Set.of(exhibition, education), EVENT_HISTORY,
                "Историческая экспозиция о ключевых этапах развития города.",
                "Выставка об истории Коломны собрана из архивных фотографий, документов и предметов городского быта.",
                6, "https://images.unsplash.com/photo-1497366754035-f200968a6e72", EventStatus.PUBLISHED, now.minusDays(8)));
            events.add(saveOrUpdateEvent(existingByTitle, org1.getOrganization(), centralSquare,
                Set.of(cityHoliday, music), EVENT_CITY_DAY,
                "Главное городское событие сезона с концертной программой.",
                "День города Коломны включает семейный дневной блок, вечерний концерт и праздничную программу на центральной площади.",
                0, "https://images.unsplash.com/photo-1472653431158-6364773b2a56", EventStatus.REJECTED, now.minusDays(7)));
        }

        if (org2 != null) {
            events.add(saveOrUpdateEvent(existingByTitle, org2.getOrganization(), centralSquare,
                Set.of(literature, cityHoliday), EVENT_BOOK_FAIR,
                "Городская книжная программа с издательствами и авторами.",
                "Книжная ярмарка у кремля объединяет издательства, независимые книжные проекты, публичные чтения и автограф-сессии.",
                0, "https://images.unsplash.com/photo-1507842217343-583bb7270b66", EventStatus.PUBLISHED, now.minusDays(6)));
            events.add(saveOrUpdateEvent(existingByTitle, org2.getOrganization(), artCenter,
                Set.of(cinema, education), EVENT_FILM_NIGHT,
                "Ночной фестиваль короткого метра и обсуждений.",
                "Ночь короткометражного кино включает показы фестивальных работ, сессии вопросов и обсуждений.",
                16, "https://images.unsplash.com/photo-1485846234645-a62644f84728", EventStatus.PUBLISHED, now.minusDays(5)));
            events.add(saveOrUpdateEvent(existingByTitle, org2.getOrganization(), riverEmbankment,
                Set.of(cityHoliday, exhibition), EVENT_RIVER_LIGHTS,
                "Световые инсталляции и вечерняя музыкальная программа.",
                "Световой фестиваль на набережной объединяет медиахудожников, инсталляции под открытым небом и музыкальные перформансы.",
                0, "https://images.unsplash.com/photo-1514525253161-7a46d19cd819", EventStatus.PENDING_APPROVAL, now.minusDays(4)));
        }

        if (org3 != null) {
            events.add(saveOrUpdateEvent(existingByTitle, org3.getOrganization(), park,
                Set.of(education, children), EVENT_SCIENCE_FEST,
                "Интерактивная наука для школьников и родителей.",
                "Научный фестиваль для школьников включает лаборатории, инженерные шоу и открытые лекции популяризаторов науки.",
                6, "https://images.unsplash.com/photo-1532094349884-543bc11b234d", EventStatus.PUBLISHED, now.minusDays(9)));
            events.add(saveOrUpdateEvent(existingByTitle, org3.getOrganization(), park,
                Set.of(children, cityHoliday), EVENT_FAMILY_WEEKEND,
                "Большая семейная программа выходного дня.",
                "Семейные выходные в парке включают игровые маршруты, мастер-классы для детей и родительские практикумы.",
                0, "https://images.unsplash.com/photo-1511895426328-dc8714191300", EventStatus.PUBLISHED, now.minusDays(3)));
            events.add(saveOrUpdateEvent(existingByTitle, org3.getOrganization(), riverEmbankment,
                Set.of(gastronomy, cityHoliday), EVENT_FOOD_MARKET,
                "Маркет локальных производителей и гастрономических проектов.",
                "Фестиваль локальной кухни объединяет фермеров, гастро-стартапы и кулинарные мастер-классы под открытым небом.",
                0, "https://images.unsplash.com/photo-1504754524776-8f4f37790ca0", EventStatus.PUBLISHED, now.minusDays(2)));
        }

        if (org4 != null) {
            events.add(saveOrUpdateEvent(existingByTitle, org4.getOrganization(), centralSquare,
                Set.of(sport, cityHoliday), EVENT_STREET_SPORT,
                "Турниры и открытые тренировки в городском формате.",
                "Уличный спортивный день объединяет любительские турниры, показательные выступления и бесплатные тренировки с тренерами.",
                0, "https://images.unsplash.com/photo-1461896836934-ffe607ba8211", EventStatus.PUBLISHED, now.minusDays(5)));
            events.add(saveOrUpdateEvent(existingByTitle, org4.getOrganization(), artCenter,
                Set.of(education, exhibition), EVENT_CREATIVE_LABS,
                "Практические лаборатории в сфере креативных индустрий.",
                "Лаборатории креативных индустрий включают интенсивы по дизайну, фото, видео и городским медиа-проектам.",
                12, "https://images.unsplash.com/photo-1498050108023-c5249f4df085", EventStatus.PENDING_APPROVAL, now.minusDays(1)));
        }

        if (org5 != null) {
            events.add(saveOrUpdateEvent(existingByTitle, org5.getOrganization(), museumHall,
                Set.of(exhibition, education), EVENT_MUSEUM_FORUM,
                "Профессиональная встреча музейных команд региона.",
                "Форум музейных практик посвящен цифровым форматам экспозиций, работе с аудиторией и межмузейным партнерствам.",
                12, "https://images.unsplash.com/photo-1518998053901-5348d3961a04", EventStatus.PUBLISHED, now.minusDays(4)));
            events.add(saveOrUpdateEvent(existingByTitle, org5.getOrganization(), centralSquare,
                Set.of(music, theatre), EVENT_OPEN_AIR_OPERA,
                "Музыкально-театральная постановка на открытой сцене.",
                "Опера под открытым небом объединяет симфонический оркестр, солистов и визуальное сценическое оформление.",
                12, "https://images.unsplash.com/photo-1501386761578-eac5c94b800a", EventStatus.PUBLISHED, now.minusDays(2)));
            events.add(saveOrUpdateEvent(existingByTitle, org5.getOrganization(), museumHall,
                Set.of(literature, education), EVENT_LOCAL_GUIDES,
                "Профессиональный форум для экскурсоводов и краеведов.",
                "Форум городских экскурсоводов включает секции по методике экскурсий, сторителлингу и туристическим маршрутам.",
                0, "https://images.unsplash.com/photo-1469474968028-56623f02e42e", EventStatus.ARCHIVED, now.minusDays(20)));
        }

        events.removeIf(event -> event == null || event.getId() == null);
        events.sort(Comparator.comparing(Event::getCreatedAt));
        return events;
    }

    private Map<Long, User> buildPublicationAuthorsByOrganization(List<Organizer> organizers) {
        Map<Long, User> authors = new HashMap<>();
        for (Organizer organizer : organizers) {
            if (organizer == null || organizer.getOrganization() == null || organizer.getUser() == null) {
                continue;
            }
            authors.putIfAbsent(organizer.getOrganization().getId(), organizer.getUser());
        }
        return authors;
    }

    private Event saveOrUpdateEvent(Map<String, Event> existingByTitle,
                                    Organization organization,
                                    Venue venue,
                                    Set<Category> categories,
                                    String title,
                                    String shortDescription,
                                    String fullDescription,
                                    Integer ageRating,
                                    String coverUrl,
                                    EventStatus status,
                                    LocalDateTime createdAt) {
        if (organization == null || venue == null) {
            return null;
        }

        Event event = existingByTitle.get(normalizeKey(title));
        if (event == null) {
            event = Event.builder().createdAt(createdAt).build();
        } else if (event.getCreatedAt() == null) {
            event.setCreatedAt(createdAt);
        }

        event.setTitle(title);
        event.setShortDescription(shortDescription);
        event.setFullDescription(fullDescription);
        event.setAgeRating(ageRating);
        event.setCoverUrl(coverUrl);
        event.setStatus(status);
        event.setOrganization(organization);
        event.setVenue(venue);
        event.setCategories(new HashSet<>(categories));

        Event saved = eventRepository.save(event);
        existingByTitle.put(normalizeKey(title), saved);
        return saved;
    }

    private void seedSessions(List<Event> events) {
        Set<String> existingKeys = new HashSet<>();
        for (Session session : sessionRepository.findAll()) {
            if (session.getEvent() == null || session.getEvent().getId() == null || session.getStartTime() == null) {
                continue;
            }
            existingKeys.add(session.getEvent().getId() + "|" + session.getStartTime());
        }

        LocalDateTime base = LocalDateTime.now().plusDays(3).withHour(17).withMinute(0).withSecond(0).withNano(0);
        List<Session> sessions = new ArrayList<>();
        List<Event> sortedEvents = events.stream()
            .filter(event -> event.getVenue() != null)
            .sorted(Comparator.comparing(Event::getCreatedAt))
            .toList();

        for (int index = 0; index < sortedEvents.size(); index++) {
            Event event = sortedEvents.get(index);
            LocalDateTime start = base.plusDays(index).plusHours(index % 3);
            int durationHours = index % 2 == 0 ? 2 : 3;
            int capacity = calculateSessionCapacity(event.getVenue(), index);

            addSessionIfMissing(sessions, existingKeys, event, start, durationHours, capacity);
            if (index % 4 == 0) {
                addSessionIfMissing(sessions, existingKeys, event, start.plusDays(2), 2, capacity);
            }
        }

        if (!sessions.isEmpty()) {
            sessionRepository.saveAll(sessions);
        }
    }

    private int calculateSessionCapacity(Venue venue, int index) {
        if (venue == null || venue.getCapacity() == null || venue.getCapacity() <= 0) {
            return 200;
        }
        int venueCapacity = venue.getCapacity();
        int divider = index % 3 == 0 ? 2 : 3;
        int calculated = Math.max(80, venueCapacity / divider);
        return Math.min(calculated, venueCapacity);
    }

    private void addSessionIfMissing(List<Session> sessions,
                                     Set<String> existingKeys,
                                     Event event,
                                     LocalDateTime start,
                                     int durationHours,
                                     int capacity) {
        if (event == null || event.getId() == null || event.getVenue() == null) {
            return;
        }

        String key = event.getId() + "|" + start;
        if (!existingKeys.add(key)) {
            return;
        }

        sessions.add(Session.builder()
            .event(event)
            .startTime(start)
            .endTime(start.plusHours(durationHours))
            .capacity(capacity)
            .build());
    }

    private void seedPublications(Map<Long, User> publicationAuthorsByOrganization, List<Event> events) {
        Map<String, Publication> existingByTitle = new HashMap<>();
        for (Publication publication : publicationRepository.findAll()) {
            existingByTitle.putIfAbsent(normalizeKey(publication.getTitle()), publication);
        }

        List<Event> sortedEvents = events.stream()
            .sorted(Comparator.comparing(Event::getCreatedAt))
            .toList();

        List<Publication> publications = new ArrayList<>();

        for (int index = 0; index < sortedEvents.size(); index++) {
            Event event = sortedEvents.get(index);
            if (event.getOrganization() == null || event.getOrganization().getId() == null) {
                continue;
            }

            User author = publicationAuthorsByOrganization.get(event.getOrganization().getId());
            if (author == null) {
                continue;
            }

            LocalDateTime createdAt = event.getCreatedAt() == null
                ? LocalDateTime.now().minusHours(sortedEvents.size() - index)
                : event.getCreatedAt().plusHours(2);

            addPublicationIfMissing(
                publications,
                existingByTitle,
                author,
                event,
                "Афиша: " + event.getTitle(),
                "Опубликована обновленная информация по событию " + event.getTitle()
                    + " от организации " + event.getOrganization().getName() + ".",
                event.getCoverUrl(),
                resolvePublicationStatus(event.getStatus()),
                createdAt
            );

            if (event.getStatus() == EventStatus.PUBLISHED && index % 3 == 0) {
                addPublicationIfMissing(
                    publications,
                    existingByTitle,
                    author,
                    event,
                    "Изменения в программе: " + event.getTitle(),
                    "Обновили программу, тайминг и дополнительные активности по событию " + event.getTitle() + ".",
                    event.getCoverUrl(),
                    PublicationStatus.PUBLISHED,
                    createdAt.plusHours(6)
                );
            }
        }

        if (!publications.isEmpty()) {
            publicationRepository.saveAll(publications);
        }
    }

    private PublicationStatus resolvePublicationStatus(EventStatus eventStatus) {
        if (eventStatus == null) {
            return PublicationStatus.PENDING;
        }
        return switch (eventStatus) {
            case PUBLISHED -> PublicationStatus.PUBLISHED;
            case REJECTED -> PublicationStatus.REJECTED;
            case PENDING_APPROVAL -> PublicationStatus.PENDING;
            case ARCHIVED -> PublicationStatus.PENDING;
        };
    }

    private void addPublicationIfMissing(List<Publication> publications,
                                         Map<String, Publication> existingByTitle,
                                         User organizerUser,
                                         Event event,
                                         String title,
                                         String content,
                                         String imageUrl,
                                         PublicationStatus status,
                                         LocalDateTime createdAt) {
        if (organizerUser == null || event == null) {
            return;
        }

        String key = normalizeKey(title);
        if (existingByTitle.containsKey(key)) {
            return;
        }

        Publication publication = Publication.builder()
            .title(title)
            .content(content)
            .imageUrl(imageUrl)
            .status(status)
            .createdAt(createdAt)
            .author(organizerUser)
            .event(event)
            .build();

        publications.add(publication);
        existingByTitle.put(key, publication);
    }

    private void seedReviews(List<User> residents, List<Event> events) {
        if (residents.isEmpty() || events.isEmpty()) {
            return;
        }

        List<Event> publishedEvents = events.stream()
            .filter(event -> event.getStatus() == EventStatus.PUBLISHED)
            .toList();
        List<Event> targetEvents = publishedEvents.isEmpty() ? events : publishedEvents;

        List<String> texts = List.of(
            "Понравилась организация входа и удобная навигация на площадке.",
            "Хорошая программа и комфортная атмосфера, придем еще.",
            "Отдельно отмечу работу волонтеров и качество звука.",
            "Событие оставило положительное впечатление, все прошло четко.",
            "Удобные зоны отдыха и хорошая программа для всей семьи.",
            "Насыщенная культурная программа, рекомендую к посещению.",
            "Отличный уровень организации, понятная навигация и расписание.",
            "Понравилось, что площадка адаптирована для разной аудитории."
        );
        int[] ratings = {5, 5, 4, 5, 5, 4, 5, 5};

        LocalDateTime now = LocalDateTime.now();
        List<Review> reviews = new ArrayList<>();

        for (int i = 0; i < texts.size(); i++) {
            User resident = residents.get(i % residents.size());
            Event event = targetEvents.get(i % targetEvents.size());

            if (reviewRepository.existsByUserIdAndEventId(resident.getId(), event.getId())) {
                continue;
            }

            reviews.add(Review.builder()
                .user(resident)
                .event(event)
                .rating(ratings[i])
                .text(texts.get(i))
                .createdAt(now.minusHours(72L - (long) i * 5L))
                .build());
        }

        if (!reviews.isEmpty()) {
            reviewRepository.saveAll(reviews);
        }
    }

    private void seedFavorites(List<User> residents, List<Event> events) {
        if (residents.isEmpty() || events.isEmpty()) {
            return;
        }

        List<Event> publishedEvents = events.stream()
            .filter(event -> event.getStatus() == EventStatus.PUBLISHED)
            .toList();
        List<Event> targetEvents = publishedEvents.isEmpty() ? events : publishedEvents;
        int eventsPerResident = Math.min(targetEvents.size(), 4);

        List<Favorite> favorites = new ArrayList<>();
        for (int residentIndex = 0; residentIndex < residents.size(); residentIndex++) {
            User resident = residents.get(residentIndex);
            for (int offset = 0; offset < eventsPerResident; offset++) {
                Event event = targetEvents.get((residentIndex + offset) % targetEvents.size());
                addFavoriteIfMissing(favorites, resident, event);
            }
        }

        if (!favorites.isEmpty()) {
            favoriteRepository.saveAll(favorites);
        }
    }

    private void addFavoriteIfMissing(List<Favorite> favorites, User user, Event event) {
        if (user == null || event == null) {
            return;
        }
        if (favoriteRepository.existsByUserIdAndEventId(user.getId(), event.getId())) {
            return;
        }
        favorites.add(Favorite.builder()
            .user(user)
            .event(event)
            .build());
    }

    private String normalizeKey(String value) {
        if (value == null) {
            return "";
        }
        return value.trim().toLowerCase(Locale.ROOT);
    }
}
