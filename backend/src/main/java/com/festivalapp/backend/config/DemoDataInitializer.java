package com.festivalapp.backend.config;

import com.festivalapp.backend.entity.Category;
import com.festivalapp.backend.entity.City;
import com.festivalapp.backend.entity.Event;
import com.festivalapp.backend.entity.EventStatus;
import com.festivalapp.backend.entity.Favorite;
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

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;

@Component
@Order(3)
@RequiredArgsConstructor
public class DemoDataInitializer implements CommandLineRunner {

    private static final String DEMO_PASSWORD = "Passw0rd123";
    private static final String ORGANIZER_LOGIN = "organizer1";
    private static final String ORGANIZER_EMAIL = "organizer1@mail.com";
    private static final String ADMIN_LOGIN = "admin1";
    private static final String ADMIN_EMAIL = "admin1@mail.com";
    private static final String RESIDENT1_LOGIN = "resident1";
    private static final String RESIDENT1_EMAIL = "resident1@mail.com";
    private static final String RESIDENT2_LOGIN = "resident2";
    private static final String RESIDENT2_EMAIL = "resident2@mail.com";
    private static final String RESIDENT3_LOGIN = "resident3";
    private static final String RESIDENT3_EMAIL = "resident3@mail.com";
    private static final long MIN_PUBLISHED_PUBLICATIONS = 8L;
    private static final long MIN_REVIEWS = 12L;

    private static final String EVENT_JAZZ = "Летний джаз в Коломне";
    private static final String EVENT_THEATRE = "Коломенский театральный вечер";
    private static final String EVENT_HISTORY = "Выставка \"История Коломны\"";
    private static final String EVENT_STREET_ART = "Фестиваль уличного искусства Коломны";
    private static final String EVENT_CITY_DAY = "День города Коломны";
    private static final String EVENT_MUSEUM_NIGHT = "Ночь музеев в Коломне";
    private static final String EVENT_PASTILA = "Гастрономический фестиваль \"Коломенская пастила\"";
    private static final String EVENT_CRAFT = "Ремесленный двор Коломны";
    private static final String EVENT_CINEMA = "Кинопоказ под открытым небом у Коломенского кремля";
    private static final String EVENT_ECO = "Семейный эко-фестиваль \"Берег Оки\"";

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final UserRoleRepository userRoleRepository;
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
    public void run(String... args) {
        Organizer organizer = ensureOrganizerUserAndProfile();
        ensureAdminUser();
        List<User> residents = ensureResidentUsers();

        Category music = ensureCategory("Музыка", "Музыкальные мероприятия");
        Category theatre = ensureCategory("Театр", "Театральные постановки");
        Category exhibition = ensureCategory("Выставка", "Художественные и тематические выставки");
        Category cityHoliday = ensureCategory("Городской праздник", "Праздничные мероприятия для жителей города");

        City kolomna = ensureCity("Коломна", "Московская область", "Россия");
        Venue park = ensureVenue(kolomna, "Городской парк", "ул. Левшина, 15", 2500,
            new BigDecimal("55.103200"), new BigDecimal("38.754800"));
        Venue cultureHouse = ensureVenue(kolomna, "Дом культуры", "ул. Октябрьской Революции, 324", 900,
            new BigDecimal("55.100700"), new BigDecimal("38.766300"));
        Venue centralSquare = ensureVenue(kolomna, "Центральная площадь", "пл. Советская, 1", 5000,
            new BigDecimal("55.099900"), new BigDecimal("38.769500"));

        migrateEventVenuesFromSessions();
        List<Event> demoEvents = seedEventsAndSessions(
            organizer,
            music,
            theatre,
            exhibition,
            cityHoliday,
            park,
            cultureHouse,
            centralSquare
        );
        seedSocialData(organizer.getUser(), residents, demoEvents);
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

    private Organizer ensureOrganizerUserAndProfile() {
        User organizerUser = userRepository.findByLogin(ORGANIZER_LOGIN)
            .or(() -> userRepository.findByEmail(ORGANIZER_EMAIL))
            .orElseGet(() -> userRepository.save(User.builder()
                .login(ORGANIZER_LOGIN)
                .email(ORGANIZER_EMAIL)
                .passwordHash(passwordEncoder.encode(DEMO_PASSWORD))
                .firstName("Ivan")
                .lastName("Organizer")
                .phone("+79990000011")
                .createdAt(LocalDateTime.now())
                .status(UserStatus.ACTIVE)
                .build()));
        ensureRoleAssignment(organizerUser, RoleName.ROLE_ORGANIZER);

        return organizerRepository.findByUserId(organizerUser.getId())
            .orElseGet(() -> organizerRepository.save(Organizer.builder()
                .user(organizerUser)
                .name("Ivan Organizer")
                .description("Организатор культурных и городских мероприятий в Коломне")
                .contacts("organizer1@mail.com, +79990000011")
                .build()));
    }

    private List<User> ensureResidentUsers() {
        List<User> residents = new ArrayList<>();
        residents.add(ensureResidentUser(
            RESIDENT1_LOGIN,
            RESIDENT1_EMAIL,
            "Anna",
            "Smirnova",
            "+79990000021"
        ));
        residents.add(ensureResidentUser(
            RESIDENT2_LOGIN,
            RESIDENT2_EMAIL,
            "Petr",
            "Volkov",
            "+79990000022"
        ));
        residents.add(ensureResidentUser(
            RESIDENT3_LOGIN,
            RESIDENT3_EMAIL,
            "Maria",
            "Sokolova",
            "+79990000023"
        ));
        return residents;
    }

    private User ensureResidentUser(String login,
                                    String email,
                                    String firstName,
                                    String lastName,
                                    String phone) {
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
        return cityRepository.findAllByOrderByNameAsc().stream()
            .filter(city -> equalsIgnoreCase(city.getName(), name)
                && equalsIgnoreCase(city.getRegion(), region)
                && equalsIgnoreCase(city.getCountry(), country))
            .findFirst()
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
        return venueRepository.findAllByOrderByNameAsc().stream()
            .filter(venue -> equalsIgnoreCase(venue.getName(), name)
                && venue.getCity() != null
                && venue.getCity().getId().equals(city.getId()))
            .findFirst()
            .orElseGet(() -> venueRepository.save(Venue.builder()
                .name(name)
                .address(address)
                .capacity(capacity)
                .latitude(latitude)
                .longitude(longitude)
                .city(city)
                .build()));
    }

    private List<Event> seedEventsAndSessions(Organizer organizer,
                                              Category music,
                                              Category theatre,
                                              Category exhibition,
                                              Category cityHoliday,
                                              Venue park,
                                              Venue cultureHouse,
                                              Venue centralSquare) {
        Map<String, Event> existingByTitle = new HashMap<>();
        for (Event event : eventRepository.findAll()) {
            existingByTitle.putIfAbsent(normalizeKey(event.getTitle()), event);
        }

        LocalDateTime now = LocalDateTime.now();
        List<Event> newEvents = new ArrayList<>();
        List<Event> demoEvents = new ArrayList<>();

        demoEvents.add(ensureDemoEvent(existingByTitle, newEvents, organizer, park,
            new HashSet<>(List.of(music, cityHoliday)),
            EVENT_JAZZ,
            "Большой летний концерт на открытой сцене в Коломне.",
            "Летний джаз в Коломне объединяет городские коллективы, приглашенных музыкантов из соседних регионов и молодых исполнителей музыкальных школ. "
                + "В программе запланированы два полноформатных сета, открытая импровизационная сцена и короткие встречи с артистами после выступлений. "
                + "Для жителей Коломны предусмотрены семейные зоны отдыха, навигация по площадке и отдельные пространства для спокойного просмотра концерта.",
            12,
            "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4",
            now.minusDays(16)
        ));

        demoEvents.add(ensureDemoEvent(existingByTitle, newEvents, organizer, cultureHouse,
            new HashSet<>(List.of(theatre)),
            EVENT_THEATRE,
            "Камерный спектакль и открытое обсуждение в Доме культуры Коломны.",
            "Коломенский театральный вечер включает премьерный показ авторской постановки местной труппы, живую музыкальную партитуру и обсуждение с режиссером. "
                + "Перед началом предусмотрена короткая вводная лекция о контексте пьесы, а после завершения зрители смогут задать вопросы актерам и творческой группе. "
                + "Формат мероприятия рассчитан на внимательный диалог со зрителем и поддержку культурной повестки города Коломны.",
            16,
            "https://images.unsplash.com/photo-1460723237483-7a6dc9d0b212",
            now.minusDays(14)
        ));

        demoEvents.add(ensureDemoEvent(existingByTitle, newEvents, organizer, cultureHouse,
            new HashSet<>(List.of(exhibition)),
            EVENT_HISTORY,
            "Историческая экспозиция о ключевых этапах развития Коломны.",
            "Выставка \"История Коломны\" собрана из архивных фотографий, предметов городского быта и редких документов из локальных коллекций. "
                + "Каждый тематический блок сопровождается аудиокомментарием и маршрутной картой, чтобы посетители могли последовательно пройти путь от старой Коломны до современного города. "
                + "Отдельное пространство посвящено семейным историям жителей и воспоминаниям о знаковых культурных событиях.",
            6,
            "https://images.unsplash.com/photo-1497366754035-f200968a6e72",
            now.minusDays(12)
        ));

        demoEvents.add(ensureDemoEvent(existingByTitle, newEvents, organizer, centralSquare,
            new HashSet<>(List.of(music, cityHoliday)),
            EVENT_STREET_ART,
            "Уличная сцена, перформансы и мастер-классы в центре Коломны.",
            "Фестиваль уличного искусства Коломны собирает музыкантов, танцевальные команды, художников и интерактивные студии на единой городской площадке. "
                + "Гости смогут посетить мастер-классы по графике и сценическому движению, а также увидеть вечернюю программу перформансов с динамической подсветкой. "
                + "Организаторы готовят понятную карту зон, дополнительные места для семей с детьми и расширенную волонтерскую поддержку.",
            0,
            "https://images.unsplash.com/photo-1521334884684-d80222895322",
            now.minusDays(10)
        ));

        demoEvents.add(ensureDemoEvent(existingByTitle, newEvents, organizer, centralSquare,
            new HashSet<>(List.of(cityHoliday)),
            EVENT_CITY_DAY,
            "Главное городское событие сезона с концертной и семейной программой.",
            "День города Коломны включает дневной семейный блок, вечерний концерт и праздничную программу с участием творческих коллективов Подмосковья. "
                + "Для удобства жителей запланированы отдельные входные коридоры, медицинские посты и зоны спокойного отдыха рядом со сценой. "
                + "Финальная часть мероприятия завершается световым шоу и обращением городских сообществ, участвующих в развитии культурной среды.",
            0,
            "https://images.unsplash.com/photo-1472653431158-6364773b2a56",
            now.minusDays(8)
        ));

        demoEvents.add(ensureDemoEvent(existingByTitle, newEvents, organizer, cultureHouse,
            new HashSet<>(List.of(exhibition, theatre)),
            EVENT_MUSEUM_NIGHT,
            "Вечерние экскурсии и театрализованные маршруты по культурным площадкам.",
            "Ночь музеев в Коломне объединяет несколько тематических треков: исторический, семейный и театрализованный маршрут с живыми сценами. "
                + "Участники получают единый билет и карту передвижения между площадками, а кураторы помогают выбрать оптимальный порядок посещения экспозиций. "
                + "Программа ориентирована на вовлечение жителей Коломны в регулярное посещение музеев и локальных культурных инициатив.",
            12,
            "https://images.unsplash.com/photo-1518998053901-5348d3961a04",
            now.minusDays(6)
        ));

        demoEvents.add(ensureDemoEvent(existingByTitle, newEvents, organizer, centralSquare,
            new HashSet<>(List.of(cityHoliday, exhibition)),
            EVENT_PASTILA,
            "Гастрономическая программа с локальными производителями Коломны.",
            "Фестиваль \"Коломенская пастила\" знакомит гостей с традиционными рецептами, ремесленной упаковкой и историей городских кондитерских промыслов. "
                + "На площадке будут работать дегустационные столы, образовательные зоны о технологии производства и сцена для кулинарных демонстраций. "
                + "Событие акцентировано на локальной идентичности Коломны и поддержке малых семейных мастерских.",
            0,
            "https://images.unsplash.com/photo-1504754524776-8f4f37790ca0",
            now.minusDays(5)
        ));

        demoEvents.add(ensureDemoEvent(existingByTitle, newEvents, organizer, park,
            new HashSet<>(List.of(cityHoliday, exhibition)),
            EVENT_CRAFT,
            "Ярмарка ремесел и демонстрация традиционных техник.",
            "Ремесленный двор Коломны объединяет мастеров по керамике, дереву, текстилю и художественной росписи в едином интерактивном формате. "
                + "Посетители смогут не только приобрести изделия, но и поучаствовать в коротких практических сессиях под руководством наставников. "
                + "Организаторы делают акцент на передаче навыков и популяризации исторических ремесел, связанных с культурным наследием Коломны.",
            0,
            "https://images.unsplash.com/photo-1452860606245-08befc0ff44b",
            now.minusDays(4)
        ));

        demoEvents.add(ensureDemoEvent(existingByTitle, newEvents, organizer, centralSquare,
            new HashSet<>(List.of(music, cityHoliday)),
            EVENT_CINEMA,
            "Вечерний кинопоказ на большой уличной площадке у кремля.",
            "Кинопоказ под открытым небом у Коломенского кремля включает показ семейного фильма, короткие лекции о кинолокациях Подмосковья и музыкальное сопровождение до начала сеанса. "
                + "Зрителям доступна расширенная схема рассадки, пункты проката пледов и отдельная зона для посетителей с детьми младшего возраста. "
                + "Проект направлен на формирование регулярного летнего киноформата в Коломне и развитие досуга на открытом воздухе.",
            6,
            "https://images.unsplash.com/photo-1478720568477-152d9b164e26",
            now.minusDays(3)
        ));

        demoEvents.add(ensureDemoEvent(existingByTitle, newEvents, organizer, park,
            new HashSet<>(List.of(cityHoliday, exhibition)),
            EVENT_ECO,
            "Семейный фестиваль экопросвещения на береговой зоне Оки.",
            "Семейный эко-фестиваль \"Берег Оки\" в Коломне сочетает просветительские лекции, практические мастер-классы и игровые станции для детей. "
                + "Программа включает блок о раздельном сборе отходов, экскурсии по природным маршрутам и презентации локальных экологических проектов. "
                + "Цель события — сформировать у жителей устойчивые привычки бережного отношения к городской среде и водным территориям Коломны.",
            0,
            "https://images.unsplash.com/photo-1472396961693-142e6e269027",
            now.minusDays(2)
        ));

        if (!newEvents.isEmpty()) {
            eventRepository.saveAll(newEvents);
        }

        seedSessions(demoEvents, park, cultureHouse, centralSquare);
        return demoEvents;
    }

    private Event ensureDemoEvent(Map<String, Event> existingByTitle,
                                  List<Event> newEvents,
                                  Organizer organizer,
                                  Venue venue,
                                  HashSet<Category> categories,
                                  String title,
                                  String shortDescription,
                                  String fullDescription,
                                  Integer ageRating,
                                  String coverUrl,
                                  LocalDateTime createdAt) {
        Event existing = existingByTitle.get(normalizeKey(title));
        if (existing != null) {
            return existing;
        }

        Event event = Event.builder()
            .title(title)
            .shortDescription(shortDescription)
            .fullDescription(fullDescription)
            .ageRating(ageRating)
            .coverUrl(coverUrl)
            .createdAt(createdAt)
            .status(EventStatus.PUBLISHED)
            .organizer(organizer)
            .venue(venue)
            .categories(categories)
            .build();

        newEvents.add(event);
        existingByTitle.put(normalizeKey(title), event);
        return event;
    }

    private void migrateEventVenuesFromSessions() {
        // No-op: venue is now defined only at event level.
    }

    private void seedSessions(List<Event> events, Venue park, Venue cultureHouse, Venue centralSquare) {
        Map<String, Event> eventsByTitle = new HashMap<>();
        for (Event event : events) {
            eventsByTitle.put(normalizeKey(event.getTitle()), event);
        }

        HashSet<Long> eventIdsWithSessions = new HashSet<>();
        for (Session session : sessionRepository.findAll()) {
            if (session.getEvent() != null && session.getEvent().getId() != null) {
                eventIdsWithSessions.add(session.getEvent().getId());
            }
        }

        LocalDateTime baseDate = LocalDateTime.now().plusDays(2).withHour(18).withMinute(0).withSecond(0).withNano(0);
        List<Session> sessions = new ArrayList<>();

        Event jazz = eventsByTitle.get(normalizeKey(EVENT_JAZZ));
        if (shouldSeedSessionsForEvent(jazz, eventIdsWithSessions)) {
            addSession(sessions, jazz, park, "Открытие джазового вечера",
                "Вступительный сет и приветствие организаторов фестиваля.",
                baseDate.plusHours(1), 2, 1200);
            addSession(sessions, jazz, park, "Ночной джем в Коломне",
                "Импровизационная программа с участием приглашенных музыкантов.",
                baseDate.plusDays(3).plusHours(2), 2, 1500);
        }

        Event theatre = eventsByTitle.get(normalizeKey(EVENT_THEATRE));
        if (shouldSeedSessionsForEvent(theatre, eventIdsWithSessions)) {
            addSession(sessions, theatre, cultureHouse, "Премьерный показ спектакля",
                "Основной показ и встреча с творческой группой после финала.",
                baseDate.plusDays(1), 2, 700);
            addSession(sessions, theatre, cultureHouse, "Дополнительный вечерний показ",
                "Повторный показ по просьбам жителей Коломны.",
                baseDate.plusDays(4), 2, 650);
        }

        Event history = eventsByTitle.get(normalizeKey(EVENT_HISTORY));
        if (shouldSeedSessionsForEvent(history, eventIdsWithSessions)) {
            addSession(sessions, history, cultureHouse, "Экскурсия по экспозиции",
                "Кураторский маршрут с подробным разбором исторических артефактов.",
                baseDate.plusDays(2).minusHours(5), 3, 500);
            addSession(sessions, history, cultureHouse, "Вечерняя лекция об истории города",
                "Лекционный блок о культурной и архитектурной истории Коломны.",
                baseDate.plusDays(6).minusHours(2), 2, 420);
        }

        Event streetArt = eventsByTitle.get(normalizeKey(EVENT_STREET_ART));
        if (shouldSeedSessionsForEvent(streetArt, eventIdsWithSessions)) {
            addSession(sessions, streetArt, centralSquare, "Дневная программа фестиваля",
                "Мастер-классы, перформансы и интерактивные площадки на площади.",
                baseDate.plusDays(5).minusHours(4), 4, 3200);
            addSession(sessions, streetArt, centralSquare, "Вечерняя сцена и лайв-сеты",
                "Музыкальные выступления и финальный коллективный перформанс.",
                baseDate.plusDays(5).plusHours(1), 3, 2800);
        }

        Event cityDay = eventsByTitle.get(normalizeKey(EVENT_CITY_DAY));
        if (shouldSeedSessionsForEvent(cityDay, eventIdsWithSessions)) {
            addSession(sessions, cityDay, centralSquare, "Главный праздничный концерт",
                "Ключевая сцена Дня города с участием городских коллективов.",
                baseDate.plusDays(8).minusHours(2), 4, 4500);
        }

        Event museumNight = eventsByTitle.get(normalizeKey(EVENT_MUSEUM_NIGHT));
        if (shouldSeedSessionsForEvent(museumNight, eventIdsWithSessions)) {
            addSession(sessions, museumNight, cultureHouse, "Маршрут Ночи музеев",
                "Единый старт программы с выдачей карты и сопровождением кураторов.",
                baseDate.plusDays(7).plusHours(1), 3, 900);
        }

        Event pastila = eventsByTitle.get(normalizeKey(EVENT_PASTILA));
        if (shouldSeedSessionsForEvent(pastila, eventIdsWithSessions)) {
            addSession(sessions, pastila, centralSquare, "Дегустационная программа",
                "Презентации производителей и тематические кулинарные зоны.",
                baseDate.plusDays(9).minusHours(1), 4, 2600);
        }

        Event craft = eventsByTitle.get(normalizeKey(EVENT_CRAFT));
        if (shouldSeedSessionsForEvent(craft, eventIdsWithSessions)) {
            addSession(sessions, craft, park, "Ярмарка ремесленных мастерских",
                "Открытая экспозиция изделий и практические мастер-классы.",
                baseDate.plusDays(10).minusHours(3), 5, 1800);
        }

        Event cinema = eventsByTitle.get(normalizeKey(EVENT_CINEMA));
        if (shouldSeedSessionsForEvent(cinema, eventIdsWithSessions)) {
            addSession(sessions, cinema, centralSquare, "Вечерний кинопоказ",
                "Показ фильма на открытом экране и обсуждение после сеанса.",
                baseDate.plusDays(11).plusHours(2), 3, 2200);
        }

        Event eco = eventsByTitle.get(normalizeKey(EVENT_ECO));
        if (shouldSeedSessionsForEvent(eco, eventIdsWithSessions)) {
            addSession(sessions, eco, park, "Эко-маршрут и семейные активности",
                "Просветительская программа о природе Оки и городской экологии.",
                baseDate.plusDays(12).minusHours(2), 4, 1700);
        }

        if (!sessions.isEmpty()) {
            sessionRepository.saveAll(sessions);
        }
    }

    private boolean shouldSeedSessionsForEvent(Event event, HashSet<Long> eventIdsWithSessions) {
        return event != null && event.getId() != null && !eventIdsWithSessions.contains(event.getId());
    }

    private void addSession(List<Session> sessions,
                            Event event,
                            Venue venue,
                            String title,
                            String description,
                            LocalDateTime start,
                            int durationHours,
                            int capacity) {
        if (event == null || event.getVenue() == null) {
            return;
        }
        LocalDateTime end = start.plusHours(durationHours);

        sessions.add(Session.builder()
            .event(event)
            .startTime(start)
            .endTime(end)
            .capacity(capacity)
            .build());
    }

    private void seedSocialData(User organizerUser, List<User> residents, List<Event> demoEvents) {
        List<Event> events = new ArrayList<>(demoEvents);
        events.removeIf(Objects::isNull);
        if (events.isEmpty()) {
            return;
        }
        events.sort(Comparator.comparing(Event::getId));

        if (organizerUser != null && publicationRepository.countByStatus(PublicationStatus.PUBLISHED) < MIN_PUBLISHED_PUBLICATIONS) {
            seedPublications(organizerUser, events);
        }

        if (!residents.isEmpty() && reviewRepository.count() < MIN_REVIEWS) {
            seedReviews(residents, events);
        }

        if (!residents.isEmpty()) {
            seedFavorites(residents, events);
        }
    }

    private void seedPublications(User organizerUser, List<Event> events) {
        Map<String, Event> eventsByTitle = new HashMap<>();
        for (Event event : events) {
            eventsByTitle.put(normalizeKey(event.getTitle()), event);
        }

        Map<String, Publication> existingByTitle = new HashMap<>();
        for (Publication publication : publicationRepository.findAll()) {
            existingByTitle.putIfAbsent(normalizeKey(publication.getTitle()), publication);
        }

        LocalDateTime now = LocalDateTime.now();
        List<Publication> publications = new ArrayList<>();

        addPublicationIfMissing(publications, existingByTitle, organizerUser, eventsByTitle.get(normalizeKey(EVENT_JAZZ)),
            "Коломна открывает музыкальный сезон: расширенная программа джазового фестиваля",
            "Оргкомитет утвердил детальную программу музыкального сезона в Коломне: помимо двух больших джазовых сетов, на площадке появятся образовательные мини-форматы и короткие встречи с артистами. "
                + "Для удобства зрителей мы подготовили схему рассадки, точки навигации и карту доступности для семейных посетителей. "
                + "Просим регистрироваться заранее, чтобы равномерно распределить поток гостей и обеспечить комфортный вход на территорию фестиваля.",
            "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f",
            PublicationStatus.PUBLISHED,
            now.minusDays(7)
        );

        addPublicationIfMissing(publications, existingByTitle, organizerUser, eventsByTitle.get(normalizeKey(EVENT_THEATRE)),
            "Театральная неделя в Коломне: состав труппы и формат обсуждений",
            "Публикуем расширенный план театральной недели: после каждого показа зрителей ждет открытая дискуссия о художественных решениях постановки и работе с текстом. "
                + "Команда Дома культуры подготовила специальный блок для молодежной аудитории с разбором сценической речи и пластики. "
                + "В связи с высоким интересом добавили дополнительный вечерний показ и обновили правила входа в зал.",
            "https://images.unsplash.com/photo-1503095396549-807759245b35",
            PublicationStatus.PUBLISHED,
            now.minusDays(6)
        );

        addPublicationIfMissing(publications, existingByTitle, organizerUser, eventsByTitle.get(normalizeKey(EVENT_HISTORY)),
            "Выставка об истории Коломны: опубликован подробный маршрут по залам",
            "Чтобы посещение выставки было максимально удобным, мы подготовили пошаговый маршрут по тематическим блокам: от ранних городских архивов до современной культурной среды Коломны. "
                + "В карточках экспонатов появились расширенные комментарии кураторов, а для семей доступны короткие сценарии экскурсии на 40 и 60 минут. "
                + "Просим выбирать временные слоты заранее: это позволит сохранить спокойный темп осмотра и качество сопровождения.",
            "https://images.unsplash.com/photo-1489515217757-5fd1be406fef",
            PublicationStatus.PUBLISHED,
            now.minusDays(5)
        );

        addPublicationIfMissing(publications, existingByTitle, organizerUser, eventsByTitle.get(normalizeKey(EVENT_STREET_ART)),
            "Фестиваль уличного искусства Коломны: карта зон и тайминг выступлений",
            "Подготовили полную карту фестиваля: на центральной площади будут работать музыкальная сцена, мастерские по визуальному искусству и семейная интерактивная зона. "
                + "Мы отдельно продумали тихие пространства для отдыха, пункты воды и волонтерские стойки с консультациями по маршруту. "
                + "Финальный лайнап опубликован в афише, рекомендуем приходить заранее к старту дневной программы.",
            "https://images.unsplash.com/photo-1514525253161-7a46d19cd819",
            PublicationStatus.PUBLISHED,
            now.minusDays(4)
        );

        addPublicationIfMissing(publications, existingByTitle, organizerUser, eventsByTitle.get(normalizeKey(EVENT_CITY_DAY)),
            "День города Коломны: опубликованы входные схемы и семейный блок",
            "В этом году праздничная программа построена так, чтобы жителям было удобно провести на площадке весь день: с утра работают детские активности, днем — локальные творческие коллективы, вечером — основной концерт. "
                + "На схеме отмечены безопасные маршруты, медицинские посты и зоны для маломобильных гостей. "
                + "Просим ознакомиться с регламентом входа заранее, чтобы избежать очередей в пиковые часы.",
            "https://images.unsplash.com/photo-1472653431158-6364773b2a56",
            PublicationStatus.PUBLISHED,
            now.minusDays(3)
        );

        addPublicationIfMissing(publications, existingByTitle, organizerUser, eventsByTitle.get(normalizeKey(EVENT_PASTILA)),
            "Фестиваль \"Коломенская пастила\": презентация локальных мастерских",
            "Гастрономическая команда завершила отбор участников: в программе представлены семейные производства, исторические рецептуры и современные авторские интерпретации коломенской пастилы. "
                + "Кроме дегустаций, мы запускаем образовательные сессии о происхождении продукта и его месте в культурной истории города. "
                + "Для посетителей действует единый маршрут с рекомендациями по времени прохождения площадок.",
            "https://images.unsplash.com/photo-1504754524776-8f4f37790ca0",
            PublicationStatus.PUBLISHED,
            now.minusDays(2)
        );

        addPublicationIfMissing(publications, existingByTitle, organizerUser, eventsByTitle.get(normalizeKey(EVENT_CRAFT)),
            "Ремесленный двор Коломны: опубликован список мастер-классов",
            "В программе ремесленного двора предусмотрены демонстрации техник по керамике, дереву, текстилю и художественной росписи с практическим участием гостей. "
                + "Каждая мастерская проведет короткие вводные занятия, после которых можно перейти к самостоятельной работе под сопровождением наставника. "
                + "Мы также добавили расширенный блок про сохранение локальных ремесленных традиций Коломны.",
            "https://images.unsplash.com/photo-1452860606245-08befc0ff44b",
            PublicationStatus.PUBLISHED,
            now.minusDays(1)
        );

        addPublicationIfMissing(publications, existingByTitle, organizerUser, eventsByTitle.get(normalizeKey(EVENT_MUSEUM_NIGHT)),
            "Ночь музеев в Коломне: идет финальная подготовка навигации по маршруту",
            "Кураторская команда завершает согласование вечернего маршрута между площадками, чтобы гости могли пройти программу без длинных ожиданий и очередей. "
                + "После публикации финальной схемы мы откроем предварительное бронирование по временным слотам. "
                + "Сообщение находится на этапе согласования, поэтому статус публикации временно остается в модерации.",
            "https://images.unsplash.com/photo-1518998053901-5348d3961a04",
            PublicationStatus.PENDING,
            now.minusHours(18)
        );

        addPublicationIfMissing(publications, existingByTitle, organizerUser, eventsByTitle.get(normalizeKey(EVENT_CINEMA)),
            "Кинопоказ у кремля: черновая версия регламента удалена для доработки",
            "В черновой версии регламента обнаружились несогласованные пункты по рассадке и времени прохода на вечерний сеанс. "
                + "Мы сняли публикацию с выдачи до завершения проверки и повторно опубликуем обновленный документ после подтверждения всех служб. "
                + "Это техническая мера, направленная на безопасность и удобство посетителей.",
            "https://images.unsplash.com/photo-1478720568477-152d9b164e26",
            PublicationStatus.REJECTED,
            now.minusHours(10)
        );

        if (!publications.isEmpty()) {
            publicationRepository.saveAll(publications);
        }
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
        LocalDateTime now = LocalDateTime.now();
        List<Review> reviews = new ArrayList<>();
        List<String> texts = List.of(
            "Очень понравилось, как в Коломне организовали вход и навигацию: мы быстро нашли нужную площадку и спокойно разместились. Программа была насыщенной, но без хаоса, звук на сцене ровный, а волонтеры действительно помогали ориентироваться. Хочется, чтобы такой уровень организации сохранился и для следующих мероприятий.",
            "Театральный вечер оставил сильное впечатление: постановка получилась цельной, актеры работали точно, а обсуждение после показа помогло лучше понять замысел режиссера. Для Коломны это отличный формат культурного диалога со зрителем, который точно стоит развивать на регулярной основе.",
            "Выставка про историю Коломны сделана очень вдумчиво: материалы подобраны аккуратно, подписи понятные, а маршрут не перегружен. Особенно ценно, что есть блоки с локальными историями жителей, благодаря которым экспозиция ощущается живой, а не формальной.",
            "Фестиваль уличного искусства получился ярким и динамичным: много активностей для детей, интересные выступления и удобные зоны отдыха. Вечером стало чуть плотнее по потоку людей, но в целом организация справилась, и впечатление осталось положительное.",
            "На Дне города понравилось, что программа была рассчитана на разную аудиторию: утром можно было прийти с семьей, а вечером — остаться на концерт. По ощущениям, мероприятие собрало разные городские сообщества и создало действительно праздничную атмосферу.",
            "Ночь музеев в Коломне приятно удивила темпом: можно было пройти несколько площадок без спешки и везде получить содержательные комментарии. Видно, что маршрут собирали с вниманием к деталям, а кураторы хорошо держали логику всей программы.",
            "Фестиваль \"Коломенская пастила\" оказался не только вкусным, но и познавательным: много интересных историй о местных производителях и технологиях. Отличный пример того, как гастрономическая тема может работать как часть культурного бренда Коломны.",
            "На ремесленном дворе понравилась практическая часть: не просто стенды, а возможность попробовать техники под руководством мастеров. Такой формат помогает лучше понять ценность ручной работы и показывает, что локальные ремесла в Коломне действительно живут.",
            "Кинопоказ у кремля получился атмосферным: хорошая картинка, удобная рассадка и спокойная организация потока на входе. Было бы здорово добавить еще один дополнительный сеанс в выходной, потому что интерес к формату явно высокий.",
            "Эко-фестиваль на берегу Оки оказался очень полезным для семейного посещения: дети были вовлечены в игровые зоны, а взрослые получили практические советы по экологичным привычкам. Важно, что тема подана спокойно и без назидания.",
            "Отдельно хочется отметить коммуникацию организаторов: публикации в афише подробные, понятные и выходят заранее. Для жителей Коломны это помогает планировать участие и делает городские мероприятия более доступными.",
            "В целом у фестивального сезона в Коломне заметен единый стандарт качества: хорошие описания событий, внятные маршруты и уважение к посетителю. Если сохранить этот подход, город получит сильную и узнаваемую культурную программу."
        );
        int[] ratings = {5, 5, 5, 4, 5, 5, 5, 5, 4, 5, 5, 5};
        HashSet<String> uniquePairs = new HashSet<>();

        for (int i = 0; i < texts.size(); i++) {
            User resident = residents.get(i % residents.size());
            Event selectedEvent = null;
            for (int shift = 0; shift < events.size(); shift++) {
                Event candidate = events.get((i + shift) % events.size());
                String pairKey = resident.getId() + ":" + candidate.getId();
                if (uniquePairs.contains(pairKey)) {
                    continue;
                }
                if (reviewRepository.existsByUserIdAndEventId(resident.getId(), candidate.getId())) {
                    continue;
                }
                selectedEvent = candidate;
                uniquePairs.add(pairKey);
                break;
            }

            if (selectedEvent == null) {
                continue;
            }

            reviews.add(Review.builder()
                .user(resident)
                .event(selectedEvent)
                .rating(ratings[i])
                .text(texts.get(i))
                .createdAt(now.minusHours(120L - i * 6L))
                .build());
        }

        if (!reviews.isEmpty()) {
            reviewRepository.saveAll(reviews);
        }
    }

    private void seedFavorites(List<User> residents, List<Event> events) {
        List<Favorite> favorites = new ArrayList<>();
        int eventsPerResident = Math.min(events.size(), 5);

        for (int residentIndex = 0; residentIndex < residents.size(); residentIndex++) {
            User resident = residents.get(residentIndex);
            for (int offset = 0; offset < eventsPerResident; offset++) {
                Event event = events.get((residentIndex + offset) % events.size());
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

    private boolean equalsIgnoreCase(String left, String right) {
        if (left == null && right == null) {
            return true;
        }
        if (left == null || right == null) {
            return false;
        }
        return left.trim().equalsIgnoreCase(right.trim());
    }
}
