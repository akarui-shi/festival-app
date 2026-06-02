package com.festivalapp.backend.config;

import com.festivalapp.backend.entity.*;
import com.festivalapp.backend.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.festivalapp.backend.entity.RoleName;
import com.festivalapp.backend.entity.SessionWaitlist;
import com.festivalapp.backend.entity.UserRole;
import com.festivalapp.backend.repository.SessionWaitlistRepository;
import com.festivalapp.backend.repository.CityRepository;
import com.festivalapp.backend.repository.RoleRepository;
import com.festivalapp.backend.repository.UserRoleRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;

/**
 * Инициализатор аналитических демо-данных для «Лекторий: Космос над Коломной».
 *
 * <p>Добавляет 310 билетов по четырём сеансам с нарастающими кривыми продаж,
 * 12 одобренных отзывов и 20 избранных — для наглядной страницы аналитики на защите.
 *
 * <ul>
 *   <li>Показ 1 (апрель 2026, прошедший): 130 билетов, 87% заполненность.</li>
 *   <li>Показ 2 (май 2026, прошедший):    105 билетов, 70% заполненность.</li>
 *   <li>Показ 3 (июнь 2026, предстоящий): 55 билетов куплено заранее, 37%.</li>
 *   <li>Показ 4 (июль 2026, предстоящий): 20 билетов куплено заранее, 20%.</li>
 * </ul>
 */
@Slf4j
@Component
@org.springframework.core.annotation.Order(200)
@RequiredArgsConstructor
public class KolomnaJazzFestivalAnalyticsInitializer implements ApplicationRunner {

    private static final String TARGET_TITLE = "Лекторий: Космос над Коломной";

    // --- Распределение по дням для каждого сеанса ---

    // Итого 44 билета: каждый 7-й отменяется → ~4 отменённых, ~40 активных.
    // S3 и S4 попадают в зону «последних 14 дней» (от 02.06.2026) —
    // поэтому линейный график продаж на странице аналитики будет заполнен.

    // Показ 1: 12 дней (16–27 марта), Σ = 15 → ~14 активен, 14/18 ≈ 78%
    private static final LocalDate S1_SALES_START = LocalDate.of(2026, 3, 16);
    private static final int[] S1_DAILY = {
        1, 1, 2, 2, 1,  1, 1, 2, 1, 1,
        1, 1
    }; // Σ = 15

    // Показ 2: 10 дней (11–20 апреля), Σ = 11 → ~10 активен, 10/15 ≈ 67%
    private static final LocalDate S2_SALES_START = LocalDate.of(2026, 4, 11);
    private static final int[] S2_DAILY = {
        1, 1, 1, 1, 1,  1, 1, 1, 1, 2
    }; // Σ = 11

    // Показ 3: 9 дней (20–28 мая) — попадает в «последние 14 дней»!, Σ = 9 → ~8 активен, 8/12 ≈ 67%
    private static final LocalDate S3_SALES_START = LocalDate.of(2026, 5, 20);
    private static final int[] S3_DAILY = {
        1, 1, 1, 1, 1,  1, 1, 1, 1
    }; // Σ = 9

    // Показ 4: 2 дня (1–2 июня) — в «последних 14 днях»!, Σ = 9 → ~8 активен, 8/10 = 80%
    private static final LocalDate S4_SALES_START = LocalDate.of(2026, 6, 1);
    private static final int[] S4_DAILY = { 5, 4 }; // Σ = 9

    // --- Отзывы ---
    private static final String[] COMMENT_TEXTS = {
        "Лекция превзошла все ожидания. Нечаев объясняет сложное просто — заслушался на два часа.",
        "Видеоряд с телескопа Уэбба просто фантастика. Давно не видел такого восхищения в зале.",
        "Астрономическая сессия во дворе после лекции — отдельный восторг. Луна в телескоп живьём!",
        "Очень доступно и глубоко одновременно. Привёл школьника — теперь хочет быть астрофизиком.",
        "Зал был полный, но никакой давки. Организация на высоте, звук хороший.",
        "Блок про марсоходы особенно понравился. Много нового узнал, хотя слежу за темой.",
        "Единственное пожелание — больше времени на вопросы. Но лекция отличная.",
        "Спасибо за бесплатный формат — такие события нужны городу. Буду на всех показах.",
        "Нечаев держит аудиторию полтора часа без единой зевоты. Редкое умение.",
        "Прекрасное место — зал в «Лиге» уютный, акустика хорошая. Слежу за анонсами.",
        "Раздаточные материалы с картой звёздного неба — приятный бонус, повесил дома.",
        "Ходили с супругой, оба в восторге. Уже порекомендовали друзьям второй показ."
    };
    private static final int[] COMMENT_RATINGS = { 5, 5, 5, 5, 4, 5, 4, 5, 5, 4, 5, 5 };

    @Value("${app.demo.kolomna-seed-enabled:true}")
    private boolean enabled;

    private final EventRepository      eventRepository;
    private final SessionRepository    sessionRepository;
    private final TicketTypeRepository ticketTypeRepository;
    private final OrderRepository      orderRepository;
    private final OrderItemRepository  orderItemRepository;
    private final TicketRepository     ticketRepository;
    private final FavoriteRepository   favoriteRepository;
    private final CommentRepository    commentRepository;
    private final UserRepository       userRepository;
    private final CityRepository            cityRepository;
    private final RoleRepository            roleRepository;
    private final UserRoleRepository        userRoleRepository;
    private final SessionWaitlistRepository waitlistRepository;
    private final PasswordEncoder           passwordEncoder;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (!enabled) return;

        Event lecture = eventRepository.findAllByDeletedAtIsNullOrderByCreatedAtDesc().stream()
            .filter(e -> TARGET_TITLE.equals(e.getTitle()))
            .findFirst()
            .orElse(null);
        if (lecture == null) { log.warn("[LectureAnalytics] Event not found"); return; }

        // Идемпотентность: проверяем наличие наших билетов по QR-префиксу,
        // а не по общему счётчику заказов (который уже > 0 от базового сидинга).
        boolean alreadySeeded = ticketRepository.findAll().stream()
            .anyMatch(t -> t.getQrToken() != null && t.getQrToken().startsWith("cosmos26-"));
        if (alreadySeeded) {
            log.info("[LectureAnalytics] Already seeded, skipping");
            return;
        }

        // Базовые 36 demo-жителей + 5 дополнительных → итого 41 уникальный участник ≈ 40
        List<User> residents = new ArrayList<>(userRepository.findAll().stream()
            .filter(u -> u.getEmail() != null && u.getEmail().endsWith("@demo.local"))
            .sorted(Comparator.comparing(User::getId))
            .limit(36)
            .toList());
        OffsetDateTime now = OffsetDateTime.now();
        residents.addAll(ensureExtraResidents(now));
        if (residents.isEmpty()) { log.warn("[LectureAnalytics] No demo residents found"); return; }

        List<Session> sessions = sessionRepository.findAllByEventIdOrderByStartsAtAsc(lecture.getId());
        if (sessions.size() < 4) { log.warn("[LectureAnalytics] Expected 4 sessions, found {}", sessions.size()); return; }

        ZoneOffset offset = sessions.get(0).getStartsAt().getOffset();

        int[] userCounter = { 0 };

        // isPast=false для всех → статус «активен», тогда activeParticipants
        // считает покупателей всех 4 сеансов и показывает ~40 «Купили билет».
        seedSessionTickets(lecture, sessions.get(0), residents, S1_SALES_START, S1_DAILY, false, offset, userCounter);
        seedSessionTickets(lecture, sessions.get(1), residents, S2_SALES_START, S2_DAILY, false, offset, userCounter);
        seedSessionTickets(lecture, sessions.get(2), residents, S3_SALES_START, S3_DAILY, false, offset, userCounter);
        seedSessionTickets(lecture, sessions.get(3), residents, S4_SALES_START, S4_DAILY, false, offset, userCounter);

        // Очередь ожидания — для наиболее популярных сеансов
        seedWaitlist(sessions, residents, offset);

        // Отзывы
        seedComments(lecture, sessions.get(0), sessions.get(1), residents);

        // Избранное
        seedFavorites(lecture, residents);

        log.info("[LectureAnalytics] Seeded ~140 tickets (incl. cancellations), 12 comments, 20 favorites → '{}'", TARGET_TITLE);
    }

    // -------------------------------------------------------------------------

    private List<User> ensureExtraResidents(OffsetDateTime now) {
        record Seed(String login, String first, String last) {}
        List<Seed> seeds = List.of(
            new Seed("cosmos_extra_1", "Кирилл",  "Астахов"),
            new Seed("cosmos_extra_2", "Полина",  "Лунёва"),
            new Seed("cosmos_extra_3", "Артём",   "Звёздный"),
            new Seed("cosmos_extra_4", "Вероника","Небесная"),
            new Seed("cosmos_extra_5", "Максим",  "Галактионов")
        );

        City kolomna = cityRepository.findFirstByNameIgnoreCase("Коломна").orElse(null);
        Role residentRole = roleRepository.findByName(RoleName.ROLE_RESIDENT).orElse(null);

        List<User> result = new ArrayList<>();
        for (Seed s : seeds) {
            String email = s.login() + "@demo.local";
            User user = userRepository.findByEmail(email).orElseGet(() ->
                userRepository.save(User.builder()
                    .login(s.login())
                    .email(email)
                    .passwordHash(passwordEncoder.encode("Test12345!"))
                    .firstName(s.first())
                    .lastName(s.last())
                    .emailVerified(true)
                    .active(true)
                    .city(kolomna)
                    .registeredAt(now.minusDays(30))
                    .createdAt(now.minusDays(30))
                    .updatedAt(now.minusDays(30))
                    .build()));
            if (residentRole != null && !userRoleRepository.existsByUserIdAndRoleId(user.getId(), residentRole.getId())) {
                userRoleRepository.save(UserRole.builder()
                    .user(user).role(residentRole).assignedAt(now).build());
            }
            result.add(user);
        }
        return result;
    }

    // -------------------------------------------------------------------------

    private void seedSessionTickets(Event event,
                                    Session session,
                                    List<User> residents,
                                    LocalDate salesStart,
                                    int[] dailyCounts,
                                    boolean isPast,
                                    ZoneOffset offset,
                                    int[] userCounter) {
        List<TicketType> types = ticketTypeRepository.findAllBySessionIdOrderByIdAsc(session.getId());
        if (types.isEmpty()) return;

        TicketType freeTt = types.get(0);
        TicketType paidTt = types.size() > 1 ? types.get(1) : freeTt;

        String ticketStatus = isPast ? "использован" : "активен";
        int ticketNo = 0;

        for (int day = 0; day < dailyCounts.length; day++) {
            LocalDate date  = salesStart.plusDays(day);
            int       count = dailyCounts[day];

            for (int i = 0; i < count; i++, ticketNo++) {
                // Каждый 3-й билет — платный (≈33%)
                TicketType tt   = (ticketNo % 3 == 2) ? paidTt : freeTt;
                User       buyer= residents.get(userCounter[0] % residents.size());
                userCounter[0]++;

                OffsetDateTime at = date.atTime(10 + (i % 10), (ticketNo * 7) % 60, 0).atOffset(offset);

                // Каждый 7-й заказ — отменён (для статистики отмен)
                boolean cancelled = (ticketNo % 7 == 6);
                String orderStatus  = cancelled ? "отменён"   : "оплачен";
                String tktStatus    = cancelled ? "возвращён" : ticketStatus;

                Order order = orderRepository.save(Order.builder()
                    .user(buyer).event(event)
                    .status(orderStatus)
                    .totalAmount(tt.getPrice())
                    .currency("RUB")
                    .createdAt(at).updatedAt(at.plusMinutes(5))
                    .build());

                OrderItem item = orderItemRepository.save(OrderItem.builder()
                    .order(order).ticketType(tt)
                    .quantity(1).unitPrice(tt.getPrice()).lineTotal(tt.getPrice())
                    .build());

                ticketRepository.save(Ticket.builder()
                    .orderItem(item).user(buyer).session(session)
                    .status(tktStatus)
                    .qrToken("cosmos26-" + UUID.randomUUID().toString().replace("-", "").substring(0, 18))
                    .issuedAt(at)
                    .usedAt(isPast && !cancelled ? session.getStartsAt().plusMinutes(5 + (ticketNo % 40)) : null)
                    .build());
            }
        }
    }

    private void seedWaitlist(List<Session> sessions, List<User> residents, ZoneOffset offset) {
        // Показ 1 (78% заполнен): 4 человека в очереди
        // Показ 4 (80% заполнен): 3 человека в очереди
        record WaitlistEntry(int sessionIdx, int userOffset, int daysAgo) {}
        List<WaitlistEntry> entries = List.of(
            new WaitlistEntry(0, 0, 5),
            new WaitlistEntry(0, 1, 4),
            new WaitlistEntry(0, 2, 3),
            new WaitlistEntry(0, 3, 2),
            new WaitlistEntry(3, 4, 3),
            new WaitlistEntry(3, 5, 2),
            new WaitlistEntry(3, 6, 1)
        );

        OffsetDateTime base = LocalDate.of(2026, 6, 2).atStartOfDay().atOffset(offset);
        for (WaitlistEntry e : entries) {
            Session session = sessions.get(e.sessionIdx());
            User user = residents.get(e.userOffset() % residents.size());
            if (!waitlistRepository.existsBySessionIdAndUserId(session.getId(), user.getId())) {
                waitlistRepository.save(SessionWaitlist.builder()
                    .sessionId(session.getId())
                    .userId(user.getId())
                    .status("WAITING")
                    .createdAt(base.minusDays(e.daysAgo()))
                    .build());
            }
        }
    }

    private void seedComments(Event event, Session s1, Session s2, List<User> residents) {
        for (int i = 0; i < COMMENT_TEXTS.length; i++) {
            User user = residents.get(i % residents.size());
            boolean exists = commentRepository.findAllByEventIdOrderByCreatedAtDesc(event.getId())
                .stream().anyMatch(c -> c.getUser() != null && c.getUser().getId().equals(user.getId()));
            if (exists) continue;
            // Первые 6 отзывов — после показа 1, следующие 6 — после показа 2
            Session base = (i < 6) ? s1 : s2;
            commentRepository.save(Comment.builder()
                .event(event).user(user)
                .content(COMMENT_TEXTS[i])
                .rating(COMMENT_RATINGS[i])
                .moderationStatus("одобрено")
                .createdAt(base.getStartsAt().plusDays(1 + (i % 6)))
                .updatedAt(base.getStartsAt().plusDays(1 + (i % 6)))
                .build());
        }
    }

    private void seedFavorites(Event event, List<User> residents) {
        int count = Math.min(20, residents.size());
        for (int i = 0; i < count; i++) {
            User user = residents.get(i);
            if (!favoriteRepository.existsByUserIdAndEventId(user.getId(), event.getId())) {
                favoriteRepository.save(Favorite.builder()
                    .event(event).user(user)
                    .createdAt(LocalDate.of(2026, 3, 16).plusDays(i).atTime(10, 0).atOffset(ZoneOffset.ofHours(3)))
                    .build());
            }
        }
    }
}
