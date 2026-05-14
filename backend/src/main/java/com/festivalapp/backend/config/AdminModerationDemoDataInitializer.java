package com.festivalapp.backend.config;

import com.festivalapp.backend.config.support.DemoDataSupport;
import com.festivalapp.backend.config.support.DemoDataSupport.EventHolder;
import com.festivalapp.backend.config.support.DemoDataSupport.EventSeedSpec;
import com.festivalapp.backend.config.support.DemoDataSupport.SessionSeedSpec;
import com.festivalapp.backend.entity.Category;
import com.festivalapp.backend.entity.City;
import com.festivalapp.backend.entity.Comment;
import com.festivalapp.backend.entity.Event;
import com.festivalapp.backend.entity.Image;
import com.festivalapp.backend.entity.Organization;
import com.festivalapp.backend.entity.Publication;
import com.festivalapp.backend.entity.PublicationImage;
import com.festivalapp.backend.entity.User;
import com.festivalapp.backend.repository.CityRepository;
import com.festivalapp.backend.repository.CommentRepository;
import com.festivalapp.backend.repository.EventRepository;
import com.festivalapp.backend.repository.OrganizationRepository;
import com.festivalapp.backend.repository.PublicationImageRepository;
import com.festivalapp.backend.repository.PublicationRepository;
import com.festivalapp.backend.repository.SessionRepository;
import com.festivalapp.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Slf4j
@Component
@Order(110)
@RequiredArgsConstructor
public class AdminModerationDemoDataInitializer implements ApplicationRunner {

    private static final String DEMO_KEY = "admin-demo";

    private static final String EV_COURTYARD_THEATRE = "images/admin-demo/festival-crowd.jpg";
    private static final String EV_COMMUNITY_LECTURE = "images/admin-demo/community-lecture.jpg";
    private static final String EV_ART_WORKSHOP = "images/admin-demo/art-workshop.jpg";
    private static final String PUB_BOOKS = "images/admin-demo/books-publication.jpg";
    private static final String PUB_MUSIC = "images/admin-demo/music-publication.jpg";
    private static final String PUB_CRAFT = "images/admin-demo/craft-publication.jpg";

    private final CityRepository cityRepository;
    private final UserRepository userRepository;
    private final OrganizationRepository organizationRepository;
    private final EventRepository eventRepository;
    private final SessionRepository sessionRepository;
    private final PublicationRepository publicationRepository;
    private final PublicationImageRepository publicationImageRepository;
    private final CommentRepository commentRepository;
    private final DemoDataSupport support;

    @Value("${app.demo.admin-moderation-seed-enabled:true}")
    private boolean enabled;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (!enabled) {
            log.info("Admin moderation demo seeding is disabled");
            return;
        }

        OffsetDateTime now = OffsetDateTime.now();
        Map<String, Category> categories = support.ensureBaseCategories();

        int pendingEvents = seedPendingEvents(now, categories);
        int pendingPublications = seedPendingPublications(now);
        int pendingComments = seedPendingComments(now);

        support.patchMissingSessionCoordinates();
        log.info("Admin moderation demo data seeded/verified: {} pending events, {} pending publications, {} comments for review",
            pendingEvents, pendingPublications, pendingComments);
    }

    private int seedPendingEvents(OffsetDateTime now, Map<String, Category> categories) {
        int seeded = 0;
        seeded += seedPendingEvent(
            "Коломенская сцена и двор",
            "organizer.stage.kolomna@festival.local",
            "Коломна",
            categories,
            new EventSeedSpec(
                "Заявка: фестиваль дворовых театров",
                "Новая заявка организатора: уличные мини-спектакли во дворах исторического центра.",
                "Организатор предлагает провести камерный фестиваль дворовых театров: несколько коротких спектаклей " +
                    "во внутренних дворах, встреча с актёрами и вечерний показ эскизов молодых режиссёров.\n\n" +
                    "Для модерации важно проверить корректность возрастного ограничения, описание площадок и готовность " +
                    "организатора соблюдать требования по шуму после 21:00. Формат хорошо подходит для демонстрации " +
                    "админского сценария: заявку можно открыть, изучить описание и принять решение.",
                "12+",
                List.of("Фестиваль", "Концерт"),
                List.of(EV_COURTYARD_THEATRE),
                List.of(new SessionSeedSpec(
                    "Показ эскизов",
                    now.plusDays(42).withHour(18).withMinute(30).withSecond(0).withNano(0),
                    now.plusDays(42).withHour(21).withMinute(0).withSecond(0).withNano(0),
                    null,
                    "Московская область, Коломна, Красногвардейская улица, 2",
                    120,
                    BigDecimal.ZERO
                )),
                List.of(),
                "на_рассмотрении"
            )
        );
        seeded += seedPendingEvent(
            "Рязанский городской центр экскурсий",
            "organizer.walks.ryazan@festival.local",
            "Рязань",
            categories,
            new EventSeedSpec(
                "Заявка: лекторий городских сообществ",
                "Публичная встреча о соседских проектах, волонтёрах и локальных инициативах.",
                "Лекторий собирает представителей городских инициатив: озеленение дворов, книжные обмены, соседские " +
                    "праздники и волонтёрские маршруты. В программе три коротких доклада, дискуссия и сбор заявок " +
                    "от жителей, которые хотят запустить собственный проект.\n\n" +
                    "Заявка отправлена на модерацию с полным описанием, адресом и расписанием. Администратор может " +
                    "проверить, не содержит ли текст рекламных обещаний и достаточно ли точно указан формат участия.",
                "6+",
                List.of("Лекция"),
                List.of(EV_COMMUNITY_LECTURE),
                List.of(new SessionSeedSpec(
                    "Открытая встреча",
                    now.plusDays(39).withHour(18).withMinute(0).withSecond(0).withNano(0),
                    now.plusDays(39).withHour(20).withMinute(0).withSecond(0).withNano(0),
                    null,
                    "Рязанская область, Рязань, Соборная площадь, 13",
                    160,
                    BigDecimal.ZERO
                )),
                List.of(),
                "на_рассмотрении"
            )
        );
        seeded += seedPendingEvent(
            "Коломенский центр ремёсел",
            "organizer.craft.kolomna@festival.local",
            "Коломна",
            categories,
            new EventSeedSpec(
                "Заявка: арт-мастерская для подростков",
                "Практическое занятие по плакату, цвету и визуальной культуре городских событий.",
                "Подростковая арт-мастерская рассчитана на небольшую группу. Участники разбирают реальные афиши " +
                    "городских мероприятий, учатся собирать композицию и делают собственный плакат для локального события.\n\n" +
                    "Событие находится в очереди модерации: нужно проверить возрастное ограничение, корректность описания " +
                    "материалов и отсутствие спорного визуального контента в анонсе.",
                "12+",
                List.of("Мастер-класс"),
                List.of(EV_ART_WORKSHOP),
                List.of(new SessionSeedSpec(
                    "Группа подростков",
                    now.plusDays(37).withHour(15).withMinute(0).withSecond(0).withNano(0),
                    now.plusDays(37).withHour(17).withMinute(30).withSecond(0).withNano(0),
                    null,
                    "Московская область, Коломна, улица Зайцева, 14",
                    24,
                    new BigDecimal("450.00")
                )),
                List.of(),
                "на_рассмотрении"
            )
        );
        return seeded;
    }

    private int seedPendingEvent(String organizationName,
                                 String organizerEmail,
                                 String cityName,
                                 Map<String, Category> categories,
                                 EventSeedSpec spec) {
        Optional<Organization> organization = organizationRepository.findByNameIgnoreCase(organizationName);
        Optional<User> organizer = userRepository.findByEmail(organizerEmail);
        Optional<City> city = cityRepository.findFirstByNameIgnoreCase(cityName);
        if (organization.isEmpty() || organizer.isEmpty() || city.isEmpty()) {
            log.warn("Skipped pending demo event '{}': organization/user/city not found", spec.title());
            return 0;
        }

        EventHolder holder = support.ensureEventBase(spec, organization.get(), organizer.get(), city.get(), OffsetDateTime.now());
        support.ensureEventCategories(holder.event(), spec.categoryNames(), categories);
        support.ensureEventImages(holder.event(), spec.classpathImagePaths(), organizer.get(), OffsetDateTime.now(), DEMO_KEY);
        if (holder.created() || sessionRepository.findAllByEventIdOrderByStartsAtAsc(holder.event().getId()).isEmpty()) {
            support.createSessionsAndTickets(holder.event(), spec, city.get());
        }
        support.normalizePrimaryImage(holder.event().getId());
        return 1;
    }

    private int seedPendingPublications(OffsetDateTime now) {
        int seeded = 0;
        seeded += ensurePendingPublication(
            "День города в Коломне",
            "План перекрытий и удобные маршруты на День города",
            "Организатор подготовил публикацию с навигацией: где будут перекрытия, как пройти к сценам, " +
                "какие парковки лучше использовать и где расположены тихие зоны для семей с детьми. Материал " +
                "ожидает проверки администратором перед публикацией.",
            PUB_BOOKS,
            now.minusHours(8)
        );
        seeded += ensurePendingPublication(
            "Ночь музыки на Почтовой",
            "Как устроена вечерняя музыкальная программа",
            "Публикация рассказывает о порядке выступлений, правилах входа, работе звука и рекомендациях " +
                "для гостей. Перед публикацией нужно проверить формулировки про партнёров и возрастное ограничение.",
            PUB_MUSIC,
            now.minusHours(6)
        );
        seeded += ensurePendingPublication(
            "Ярмарка ремёсел на Посаде",
            "Список мастерских и точек ярмарки",
            "Короткий материал организатора с перечнем ремесленных зон, детских активностей и гастрономических " +
                "точек. Публикация находится на модерации, чтобы администратор мог проверить полноту информации.",
            PUB_CRAFT,
            now.minusHours(4)
        );
        return seeded;
    }

    private int ensurePendingPublication(String eventTitle,
                                         String title,
                                         String content,
                                         String imagePath,
                                         OffsetDateTime createdAt) {
        Optional<Event> event = findEventByTitle(eventTitle);
        if (event.isEmpty() || event.get().getOrganization() == null || event.get().getCreatedByUser() == null) {
            log.warn("Skipped pending demo publication '{}': event not found", title);
            return 0;
        }

        boolean exists = publicationRepository.findAllByEventIdOrderByCreatedAtDesc(event.get().getId()).stream()
            .anyMatch(publication -> publication.getTitle() != null && publication.getTitle().equalsIgnoreCase(title));
        if (exists) {
            return 1;
        }

        Publication publication = publicationRepository.save(Publication.builder()
            .event(event.get())
            .organization(event.get().getOrganization())
            .createdByUser(event.get().getCreatedByUser())
            .title(title)
            .content(content)
            .status("PENDING")
            .moderationStatus("на_рассмотрении")
            .createdAt(createdAt)
            .publishedAt(null)
            .updatedAt(createdAt)
            .build());

        Image image = support.ensureImage(DEMO_KEY, imagePath, "pending-publication-" + publication.getId(), event.get().getCreatedByUser(), createdAt);
        publicationImageRepository.save(PublicationImage.builder()
            .publication(publication)
            .image(image)
            .sortOrder(0)
            .build());
        return 1;
    }

    private int seedPendingComments(OffsetDateTime now) {
        int seeded = 0;
        seeded += ensureCommentForReview(
            "Семейный фестиваль выходного дня",
            "anna.smirnova@demo.local",
            "Прошу администратора проверить комментарий: в тексте есть жалоба на навигацию и просьба удалить устаревшую информацию о входе.",
            3,
            now.minusHours(5)
        );
        seeded += ensureCommentForReview(
            "Опен-эйр на Лыбедском бульваре",
            "sergey.vasiliev@demo.local",
            "Комментарий отмечен для удаления: автор пишет, что программа изменилась, и просит убрать неверное сообщение из обсуждения.",
            2,
            now.minusHours(3)
        );
        seeded += ensureCommentForReview(
            "Детская мастерская: рисуем город",
            "ksenia.mikhailova@demo.local",
            "Нужно проверить перед показом: отзыв содержит спорную формулировку про организацию очереди и может запутать родителей.",
            3,
            now.minusHours(2)
        );
        return seeded;
    }

    private int ensureCommentForReview(String eventTitle,
                                       String userEmail,
                                       String content,
                                       int rating,
                                       OffsetDateTime createdAt) {
        Optional<Event> event = findEventByTitle(eventTitle);
        Optional<User> user = userRepository.findByEmail(userEmail);
        if (event.isEmpty() || user.isEmpty()) {
            log.warn("Skipped demo comment for review: event='{}', user='{}'", eventTitle, userEmail);
            return 0;
        }

        boolean exists = commentRepository.findAllByEventIdOrderByCreatedAtDesc(event.get().getId()).stream()
            .anyMatch(comment -> comment.getUser() != null
                && comment.getUser().getId().equals(user.get().getId())
                && comment.getContent() != null
                && comment.getContent().equals(content));
        if (exists) {
            return 1;
        }

        commentRepository.save(Comment.builder()
            .event(event.get())
            .user(user.get())
            .content(content)
            .rating(rating)
            .moderationStatus("на_рассмотрении")
            .createdAt(createdAt)
            .updatedAt(createdAt)
            .build());
        return 1;
    }

    private Optional<Event> findEventByTitle(String title) {
        return eventRepository.findAllByDeletedAtIsNullOrderByCreatedAtDesc().stream()
            .filter(event -> event.getTitle() != null && event.getTitle().equalsIgnoreCase(title))
            .findFirst();
    }
}
