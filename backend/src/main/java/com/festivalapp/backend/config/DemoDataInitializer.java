package com.festivalapp.backend.config;

import com.festivalapp.backend.entity.Category;
import com.festivalapp.backend.entity.City;
import com.festivalapp.backend.entity.Event;
import com.festivalapp.backend.entity.EventStatus;
import com.festivalapp.backend.entity.Organizer;
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
import com.festivalapp.backend.repository.OrganizerRepository;
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
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;

@Component
@Order(3)
@RequiredArgsConstructor
public class DemoDataInitializer implements CommandLineRunner {

    private static final String ORGANIZER_LOGIN = "organizer1";
    private static final String ORGANIZER_EMAIL = "organizer1@mail.com";
    private static final String ORGANIZER_PASSWORD = "Passw0rd123";

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final UserRoleRepository userRoleRepository;
    private final OrganizerRepository organizerRepository;
    private final CategoryRepository categoryRepository;
    private final CityRepository cityRepository;
    private final VenueRepository venueRepository;
    private final EventRepository eventRepository;
    private final SessionRepository sessionRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        Organizer organizer = ensureOrganizerUserAndProfile();

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

        seedEventsAndSessions(organizer, music, theatre, exhibition, cityHoliday, park, cultureHouse, centralSquare);
    }

    private Organizer ensureOrganizerUserAndProfile() {
        User organizerUser = userRepository.findByLogin(ORGANIZER_LOGIN)
            .or(() -> userRepository.findByEmail(ORGANIZER_EMAIL))
            .orElseGet(() -> userRepository.save(User.builder()
                .login(ORGANIZER_LOGIN)
                .email(ORGANIZER_EMAIL)
                .passwordHash(passwordEncoder.encode(ORGANIZER_PASSWORD))
                .firstName("Ivan")
                .lastName("Organizer")
                .phone("+79990000011")
                .createdAt(LocalDateTime.now())
                .status(UserStatus.ACTIVE)
                .build()));

        Role organizerRole = roleRepository.findByName(RoleName.ROLE_ORGANIZER)
            .orElseGet(() -> roleRepository.save(Role.builder().name(RoleName.ROLE_ORGANIZER).build()));

        UserRoleId userRoleId = UserRoleId.builder()
            .userId(organizerUser.getId())
            .roleId(organizerRole.getId())
            .build();
        if (userRoleRepository.findById(userRoleId).isEmpty()) {
            userRoleRepository.save(UserRole.builder()
                .id(userRoleId)
                .user(organizerUser)
                .role(organizerRole)
                .build());
        }

        return organizerRepository.findByUserId(organizerUser.getId())
            .orElseGet(() -> organizerRepository.save(Organizer.builder()
                .user(organizerUser)
                .name("Ivan Organizer")
                .description("Организатор культурных и городских мероприятий в Коломне")
                .contacts("organizer1@mail.com, +79990000011")
                .build()));
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

    private void seedEventsAndSessions(Organizer organizer,
                                       Category music,
                                       Category theatre,
                                       Category exhibition,
                                       Category cityHoliday,
                                       Venue park,
                                       Venue cultureHouse,
                                       Venue centralSquare) {
        if (eventRepository.count() > 0) {
            return;
        }

        List<Event> eventsToSave = List.of(
            Event.builder()
                .title("Летний джаз в парке")
                .shortDescription("Вечер живой музыки под открытым небом.")
                .fullDescription("Концертная программа с участием городских и приглашенных джазовых коллективов.")
                .ageRating(12)
                .coverUrl("https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4")
                .createdAt(LocalDateTime.now().minusDays(12))
                .status(EventStatus.PUBLISHED)
                .organizer(organizer)
                .categories(new HashSet<>(List.of(music, cityHoliday)))
                .build(),
            Event.builder()
                .title("Коломенский театральный вечер")
                .shortDescription("Премьера камерного спектакля местной труппы.")
                .fullDescription("Театральный вечер в Доме культуры с обсуждением постановки после показа.")
                .ageRating(16)
                .coverUrl("https://images.unsplash.com/photo-1460723237483-7a6dc9d0b212")
                .createdAt(LocalDateTime.now().minusDays(10))
                .status(EventStatus.PUBLISHED)
                .organizer(organizer)
                .categories(new HashSet<>(List.of(theatre)))
                .build(),
            Event.builder()
                .title("Выставка \"История Коломны\"")
                .shortDescription("Фотографии и архивные материалы о городе.")
                .fullDescription("Историческая выставка с тематическими стендами и экскурсионными мини-лекциями.")
                .ageRating(6)
                .coverUrl("https://images.unsplash.com/photo-1497366754035-f200968a6e72")
                .createdAt(LocalDateTime.now().minusDays(8))
                .status(EventStatus.PUBLISHED)
                .organizer(organizer)
                .categories(new HashSet<>(List.of(exhibition)))
                .build(),
            Event.builder()
                .title("Фестиваль уличного искусства")
                .shortDescription("Музыканты, перформансы и мастер-классы на площади.")
                .fullDescription("Городской фестиваль с дневной и вечерней программой, интерактивными зонами и фудкортом.")
                .ageRating(0)
                .coverUrl("https://images.unsplash.com/photo-1521334884684-d80222895322")
                .createdAt(LocalDateTime.now().minusDays(6))
                .status(EventStatus.PUBLISHED)
                .organizer(organizer)
                .categories(new HashSet<>(List.of(music, cityHoliday)))
                .build(),
            Event.builder()
                .title("День города Коломны")
                .shortDescription("Праздничный концерт и вечерняя программа.")
                .fullDescription("Большая праздничная программа с выступлениями творческих коллективов и салютом.")
                .ageRating(0)
                .coverUrl("https://images.unsplash.com/photo-1472653431158-6364773b2a56")
                .createdAt(LocalDateTime.now().minusDays(4))
                .status(EventStatus.PUBLISHED)
                .organizer(organizer)
                .categories(new HashSet<>(List.of(cityHoliday)))
                .build()
        );

        List<Event> savedEvents = eventRepository.saveAll(eventsToSave);
        seedSessions(savedEvents, park, cultureHouse, centralSquare);
    }

    private void seedSessions(List<Event> events, Venue park, Venue cultureHouse, Venue centralSquare) {
        if (sessionRepository.count() > 0) {
            return;
        }

        Map<String, Event> eventsByTitle = new HashMap<>();
        for (Event event : events) {
            eventsByTitle.put(event.getTitle(), event);
        }

        LocalDateTime baseDate = LocalDateTime.now().plusDays(2).withHour(18).withMinute(0).withSecond(0).withNano(0);
        List<Session> sessions = new ArrayList<>();

        addSession(sessions, eventsByTitle.get("Летний джаз в парке"), park,
            "Джазовый вечер: открытие", "Открытие фестивальной музыкальной программы.", baseDate.plusHours(1), 2);
        addSession(sessions, eventsByTitle.get("Летний джаз в парке"), park,
            "Джазовый вечер: финал", "Финальный сет с приглашенными музыкантами.", baseDate.plusDays(3).plusHours(2), 2);

        addSession(sessions, eventsByTitle.get("Коломенский театральный вечер"), cultureHouse,
            "Премьера спектакля", "Основной показ спектакля для жителей и гостей города.", baseDate.plusDays(1), 2);
        addSession(sessions, eventsByTitle.get("Коломенский театральный вечер"), cultureHouse,
            "Дополнительный показ", "Повторный показ по многочисленным просьбам.", baseDate.plusDays(4), 2);

        addSession(sessions, eventsByTitle.get("Выставка \"История Коломны\""), centralSquare,
            "Открытие выставки", "Торжественное открытие и первая экскурсия.", baseDate.plusDays(2).minusHours(5), 3);

        addSession(sessions, eventsByTitle.get("Фестиваль уличного искусства"), centralSquare,
            "Дневная программа фестиваля", "Уличные выступления, мастер-классы и интерактивы.", baseDate.plusDays(5).minusHours(4), 4);
        addSession(sessions, eventsByTitle.get("Фестиваль уличного искусства"), park,
            "Вечерняя концертная программа", "Хедлайнеры и вечерний open-air концерт.", baseDate.plusDays(5).plusHours(1), 3);

        addSession(sessions, eventsByTitle.get("День города Коломны"), centralSquare,
            "Праздничный концерт", "Главная сценическая программа Дня города.", baseDate.plusDays(8).minusHours(2), 4);

        sessionRepository.saveAll(sessions);
    }

    private void addSession(List<Session> sessions,
                            Event event,
                            Venue venue,
                            String title,
                            String description,
                            LocalDateTime start,
                            int durationHours) {
        if (event == null || venue == null) {
            return;
        }

        sessions.add(Session.builder()
            .event(event)
            .venue(venue)
            .title(title)
            .description(description)
            .startTime(start)
            .endTime(start.plusHours(durationHours))
            .build());
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
