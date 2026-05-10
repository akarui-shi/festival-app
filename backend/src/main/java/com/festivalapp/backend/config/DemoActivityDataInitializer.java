package com.festivalapp.backend.config;

import com.festivalapp.backend.config.support.DemoDataSupport;
import com.festivalapp.backend.entity.City;
import com.festivalapp.backend.entity.Comment;
import com.festivalapp.backend.entity.Event;
import com.festivalapp.backend.entity.Favorite;
import com.festivalapp.backend.entity.Order;
import com.festivalapp.backend.entity.OrderItem;
import com.festivalapp.backend.entity.Payment;
import com.festivalapp.backend.entity.Role;
import com.festivalapp.backend.entity.RoleName;
import com.festivalapp.backend.entity.Session;
import com.festivalapp.backend.entity.SessionWaitlist;
import com.festivalapp.backend.entity.Ticket;
import com.festivalapp.backend.entity.TicketType;
import com.festivalapp.backend.entity.User;
import com.festivalapp.backend.repository.CityRepository;
import com.festivalapp.backend.repository.CommentRepository;
import com.festivalapp.backend.repository.EventRepository;
import com.festivalapp.backend.repository.FavoriteRepository;
import com.festivalapp.backend.repository.OrderItemRepository;
import com.festivalapp.backend.repository.OrderRepository;
import com.festivalapp.backend.repository.PaymentRepository;
import com.festivalapp.backend.repository.SessionRepository;
import com.festivalapp.backend.repository.SessionWaitlistRepository;
import com.festivalapp.backend.repository.TicketRepository;
import com.festivalapp.backend.repository.TicketTypeRepository;
import com.festivalapp.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

@Slf4j
@Component
@org.springframework.core.annotation.Order(100)
@RequiredArgsConstructor
public class DemoActivityDataInitializer implements ApplicationRunner {

    private static final String PAYMENT_PREFIX = "demo-activity-";
    private static final String PASSWORD = "123456";

    private final UserRepository userRepository;
    private final CityRepository cityRepository;
    private final EventRepository eventRepository;
    private final SessionRepository sessionRepository;
    private final TicketTypeRepository ticketTypeRepository;
    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final TicketRepository ticketRepository;
    private final PaymentRepository paymentRepository;
    private final FavoriteRepository favoriteRepository;
    private final CommentRepository commentRepository;
    private final SessionWaitlistRepository waitlistRepository;
    private final PasswordEncoder passwordEncoder;
    private final DemoDataSupport support;

    @Value("${app.demo.activity-seed-enabled:true}")
    private boolean enabled;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (!enabled) {
            log.info("Demo activity seeding is disabled");
            return;
        }

        OffsetDateTime now = OffsetDateTime.now();
        Role residentRole = support.ensureRole(RoleName.ROLE_RESIDENT, "Обычный житель");
        List<User> residents = ensureResidents(now, residentRole);
        List<Event> events = eventRepository.findAllByDeletedAtIsNullOrderByCreatedAtDesc().stream()
            .filter(event -> event.getTitle() != null && event.getCity() != null)
            .sorted(Comparator.comparing(Event::getId))
            .toList();

        if (events.isEmpty() || residents.isEmpty()) {
            log.info("Demo activity seeding skipped: events={}, residents={}", events.size(), residents.size());
            return;
        }

        int orders = 0;
        int favorites = 0;
        int comments = 0;
        int waitlist = 0;

        for (int eventIndex = 0; eventIndex < events.size(); eventIndex += 1) {
            Event event = events.get(eventIndex);
            List<Session> sessions = sessionRepository.findAllByEventIdOrderByStartsAtAsc(event.getId());
            if (sessions.isEmpty()) {
                continue;
            }

            int registrationCount = 4 + (eventIndex % 5) * 3;
            if (eventIndex < 6) {
                registrationCount += 8;
            }
            for (int registrationIndex = 0; registrationIndex < registrationCount; registrationIndex += 1) {
                User user = residents.get((eventIndex * 7 + registrationIndex * 3) % residents.size());
                Session session = sessions.get(registrationIndex % sessions.size());
                orders += ensureOrderWithTickets(event, session, user, eventIndex, registrationIndex, now) ? 1 : 0;
            }

            int favoriteCount = Math.min(residents.size(), registrationCount + 6);
            for (int favoriteIndex = 0; favoriteIndex < favoriteCount; favoriteIndex += 1) {
                User user = residents.get((eventIndex * 5 + favoriteIndex * 2) % residents.size());
                favorites += ensureFavorite(event, user, now.minusDays((favoriteIndex % 12) + 1)) ? 1 : 0;
            }

            int commentCount = Math.min(6, Math.max(2, registrationCount / 4));
            for (int commentIndex = 0; commentIndex < commentCount; commentIndex += 1) {
                User user = residents.get((eventIndex * 11 + commentIndex * 4) % residents.size());
                comments += ensureComment(event, user, eventIndex, commentIndex, now.minusDays(commentIndex + 1)) ? 1 : 0;
            }

            if (eventIndex % 3 == 0) {
                Session session = sessions.get(sessions.size() - 1);
                for (int waitlistIndex = 0; waitlistIndex < 4; waitlistIndex += 1) {
                    User user = residents.get((eventIndex * 13 + waitlistIndex * 5) % residents.size());
                    waitlist += ensureWaitlist(session, user, now.minusDays(waitlistIndex + 1)) ? 1 : 0;
                }
            }
        }

        log.info("Demo activity seeded/verified: {} residents, {} new orders, {} new favorites, {} new comments, {} new waitlist rows",
            residents.size(), orders, favorites, comments, waitlist);
    }

    private List<User> ensureResidents(OffsetDateTime now, Role residentRole) {
        List<UserSeed> seeds = List.of(
            new UserSeed("anna.smirnova", "Анна", "Смирнова", "Коломна"),
            new UserSeed("ivan.petrov", "Иван", "Петров", "Коломна"),
            new UserSeed("maria.volkova", "Мария", "Волкова", "Коломна"),
            new UserSeed("pavel.sokolov", "Павел", "Соколов", "Коломна"),
            new UserSeed("elena.kuznetsova", "Елена", "Кузнецова", "Коломна"),
            new UserSeed("dmitry.orlov", "Дмитрий", "Орлов", "Коломна"),
            new UserSeed("sofia.lebedeva", "Софья", "Лебедева", "Коломна"),
            new UserSeed("maxim.fedorov", "Максим", "Фёдоров", "Коломна"),
            new UserSeed("alina.morozova", "Алина", "Морозова", "Коломна"),
            new UserSeed("nikita.novikov", "Никита", "Новиков", "Коломна"),
            new UserSeed("viktoria.romanova", "Виктория", "Романова", "Коломна"),
            new UserSeed("artem.egorov", "Артём", "Егоров", "Коломна"),
            new UserSeed("olga.pavlova", "Ольга", "Павлова", "Рязань"),
            new UserSeed("sergey.vasiliev", "Сергей", "Васильев", "Рязань"),
            new UserSeed("ksenia.mikhailova", "Ксения", "Михайлова", "Рязань"),
            new UserSeed("alexey.nikolaev", "Алексей", "Николаев", "Рязань"),
            new UserSeed("daria.stepanova", "Дарья", "Степанова", "Рязань"),
            new UserSeed("kirill.zaitsev", "Кирилл", "Зайцев", "Рязань"),
            new UserSeed("irina.popova", "Ирина", "Попова", "Рязань"),
            new UserSeed("egor.timofeev", "Егор", "Тимофеев", "Рязань"),
            new UserSeed("polina.andreeva", "Полина", "Андреева", "Рязань"),
            new UserSeed("roman.kiselev", "Роман", "Киселёв", "Рязань"),
            new UserSeed("ulia.belova", "Юлия", "Белова", "Рязань"),
            new UserSeed("matvey.gromov", "Матвей", "Громов", "Рязань"),
            new UserSeed("vera.antonova", "Вера", "Антонова", "Москва"),
            new UserSeed("mihail.karpov", "Михаил", "Карпов", "Москва"),
            new UserSeed("natalia.guseva", "Наталья", "Гусева", "Москва"),
            new UserSeed("denis.borisov", "Денис", "Борисов", "Москва"),
            new UserSeed("tatyana.markova", "Татьяна", "Маркова", "Нижний Новгород"),
            new UserSeed("ilya.vinogradov", "Илья", "Виноградов", "Нижний Новгород"),
            new UserSeed("arina.frolova", "Арина", "Фролова", "Казань"),
            new UserSeed("vadim.melnikov", "Вадим", "Мельников", "Казань"),
            new UserSeed("lidia.zhukova", "Лидия", "Жукова", "Самара"),
            new UserSeed("gleb.tarasov", "Глеб", "Тарасов", "Самара"),
            new UserSeed("nina.larina", "Нина", "Ларина", "Санкт-Петербург"),
            new UserSeed("stepan.osipov", "Степан", "Осипов", "Санкт-Петербург")
        );

        List<User> result = new ArrayList<>();
        for (int index = 0; index < seeds.size(); index += 1) {
            UserSeed seed = seeds.get(index);
            City city = resolveCity(seed.cityName());
            String email = seed.login() + "@demo.local";
            int seedIndex = index;
            User user = userRepository.findByEmail(email)
                .orElseGet(() -> userRepository.save(User.builder()
                    .login("demo_" + seed.login().replace('.', '_'))
                    .email(email)
                    .phone("+7900777" + String.format("%04d", seedIndex + 1))
                    .passwordHash(passwordEncoder.encode(PASSWORD))
                    .firstName(seed.firstName())
                    .lastName(seed.lastName())
                    .emailVerified(true)
                    .newEventsNotificationsEnabled(seedIndex % 3 == 0)
                    .registeredAt(now.minusDays(55 - (seedIndex % 20)))
                    .lastLoginAt(now.minusHours(seedIndex + 2))
                    .active(true)
                    .city(city)
                    .createdAt(now.minusDays(55 - (seedIndex % 20)))
                    .updatedAt(now.minusHours(seedIndex + 1))
                    .build()));
            support.ensureUserRole(user, residentRole, now);
            result.add(user);
        }
        return result;
    }

    private City resolveCity(String name) {
        return cityRepository.findFirstByNameIgnoreCase(name)
            .orElseGet(() -> cityRepository.findAll().stream().findFirst().orElse(null));
    }

    private boolean ensureOrderWithTickets(Event event,
                                           Session session,
                                           User user,
                                           int eventIndex,
                                           int registrationIndex,
                                           OffsetDateTime now) {
        String externalPaymentId = PAYMENT_PREFIX + event.getId() + "-" + user.getId() + "-" + registrationIndex;
        if (paymentRepository.findByExternalPaymentId(externalPaymentId).isPresent()) {
            return false;
        }

        TicketType ticketType = ticketTypeRepository.findFirstBySessionIdAndActiveIsTrueOrderByIdAsc(session.getId()).orElse(null);
        if (ticketType == null) {
            return false;
        }

        int quantity = (registrationIndex % 9 == 0) ? 3 : (registrationIndex % 4 == 0 ? 2 : 1);
        BigDecimal unitPrice = ticketType.getPrice() == null ? BigDecimal.ZERO : ticketType.getPrice();
        BigDecimal lineTotal = unitPrice.multiply(BigDecimal.valueOf(quantity));
        OffsetDateTime createdAt = now.minusDays((eventIndex * 2L + registrationIndex) % 29).minusHours(registrationIndex % 7);

        Order order = orderRepository.save(Order.builder()
            .user(user)
            .event(event)
            .status(registrationIndex % 13 == 0 ? "отменён" : "оплачен")
            .totalAmount(lineTotal)
            .currency(ticketType.getCurrency() == null ? "RUB" : ticketType.getCurrency())
            .createdAt(createdAt)
            .updatedAt(createdAt.plusMinutes(12))
            .build());

        OrderItem item = orderItemRepository.save(OrderItem.builder()
            .order(order)
            .ticketType(ticketType)
            .quantity(quantity)
            .unitPrice(unitPrice)
            .lineTotal(lineTotal)
            .build());

        String ticketStatus = registrationIndex % 13 == 0 ? "возвращён" : (registrationIndex % 5 == 0 ? "использован" : "активен");
        for (int ticketIndex = 0; ticketIndex < quantity; ticketIndex += 1) {
            ticketRepository.save(Ticket.builder()
                .orderItem(item)
                .user(user)
                .session(session)
                .status(ticketStatus)
                .qrToken("DEMO-" + event.getId() + "-" + user.getId() + "-" + registrationIndex + "-" + ticketIndex)
                .issuedAt(createdAt.plusMinutes(ticketIndex))
                .usedAt("использован".equals(ticketStatus) ? session.getStartsAt().plusMinutes(25 + ticketIndex) : null)
                .build());
        }

        paymentRepository.save(Payment.builder()
            .order(order)
            .externalPaymentId(externalPaymentId)
            .provider(registrationIndex % 2 == 0 ? "yookassa" : "sbp")
            .status("отменён".equals(order.getStatus()) ? "canceled" : "succeeded")
            .amount(lineTotal)
            .currency(order.getCurrency())
            .createdAt(createdAt.plusMinutes(10))
            .payloadJson(null)
            .build());
        return true;
    }

    private boolean ensureFavorite(Event event, User user, OffsetDateTime createdAt) {
        if (favoriteRepository.existsByUserIdAndEventId(user.getId(), event.getId())) {
            return false;
        }
        favoriteRepository.save(Favorite.builder()
            .event(event)
            .user(user)
            .createdAt(createdAt)
            .build());
        return true;
    }

    private boolean ensureComment(Event event, User user, int eventIndex, int commentIndex, OffsetDateTime createdAt) {
        boolean exists = commentRepository.findAllByEventIdOrderByCreatedAtDesc(event.getId()).stream()
            .anyMatch(comment -> comment.getUser() != null
                && comment.getUser().getId().equals(user.getId())
                && comment.getContent() != null
                && comment.getContent().startsWith("Демо-отзыв:"));
        if (exists) {
            return false;
        }

        String[] phrases = {
            "отличная организация, всё было понятно с билетами и входом.",
            "понравилась атмосфера и подбор площадки, хочется прийти ещё.",
            "событие получилось живым, ведущие хорошо держали внимание.",
            "удобное расписание, но хотелось бы больше навигации на месте.",
            "очень тёплая команда и хороший звук, рекомендую друзьям.",
            "интересная программа, после события подписались на организацию."
        };
        int rating = Math.max(3, 5 - ((eventIndex + commentIndex) % 3 == 0 ? 1 : 0));
        commentRepository.save(Comment.builder()
            .event(event)
            .user(user)
            .content("Демо-отзыв: " + phrases[(eventIndex + commentIndex) % phrases.length])
            .rating(rating)
            .moderationStatus(commentIndex % 7 == 0 ? "на_рассмотрении" : "одобрено")
            .createdAt(createdAt)
            .updatedAt(createdAt.plusMinutes(3))
            .build());
        return true;
    }

    private boolean ensureWaitlist(Session session, User user, OffsetDateTime createdAt) {
        if (waitlistRepository.existsBySessionIdAndUserId(session.getId(), user.getId())) {
            return false;
        }
        waitlistRepository.save(SessionWaitlist.builder()
            .sessionId(session.getId())
            .userId(user.getId())
            .status("WAITING")
            .createdAt(createdAt)
            .notifiedAt(null)
            .build());
        return true;
    }

    private record UserSeed(String login, String firstName, String lastName, String cityName) {
    }
}
