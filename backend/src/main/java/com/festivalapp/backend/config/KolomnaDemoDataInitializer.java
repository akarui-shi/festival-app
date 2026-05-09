package com.festivalapp.backend.config;

import com.festivalapp.backend.config.support.DemoDataSupport;
import com.festivalapp.backend.config.support.DemoDataSupport.ParticipantSeed;
import com.festivalapp.backend.config.support.DemoDataSupport.EventHolder;
import com.festivalapp.backend.config.support.DemoDataSupport.EventSeedSpec;
import com.festivalapp.backend.config.support.DemoDataSupport.PublicationSeedSpec;
import com.festivalapp.backend.config.support.DemoDataSupport.SessionSeedSpec;
import com.festivalapp.backend.entity.Participant;
import com.festivalapp.backend.entity.Category;
import com.festivalapp.backend.entity.City;
import com.festivalapp.backend.entity.Event;
import com.festivalapp.backend.entity.Image;
import com.festivalapp.backend.entity.Organization;
import com.festivalapp.backend.entity.Role;
import com.festivalapp.backend.entity.RoleName;
import com.festivalapp.backend.entity.User;
import com.festivalapp.backend.repository.CityRepository;
import com.festivalapp.backend.repository.OrganizationRepository;
import com.festivalapp.backend.repository.SessionRepository;
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
import java.util.List;
import java.util.Map;

/**
 * Инициализатор демо-данных для Коломны.
 *
 * <p>На старте приложения создаёт (если их ещё нет):
 * <ul>
 *   <li>город Коломна (если его нет в seed-миграции);</li>
 *   <li>демо-организатора {@code organizer.kolomna@festival.local} с ролями организатора и резидента;</li>
 *   <li>организацию «Коломенское арт-сообщество» с логотипом из реального фото;</li>
 *   <li>несколько артистов, привязанных к коломенским событиям;</li>
 *   <li>7 событий с реальными адресами площадок Коломны (venue из V2 seed),
 *       у каждого — сессии, тарифы, картинки и подробный текст;</li>
 *   <li>7 публикаций (по одной на событие) с длинным многоабзацным {@code content}.</li>
 * </ul>
 *
 * <p>Все картинки загружаются из {@code resources/images/<категория>/<файл>.jpg}.
 * Каждая картинка прикреплена ровно к одной сущности в Коломне (без повторов
 * между событиями/публикациями); часть картинок используется только в Рязани
 * — см. {@link RyazanDemoDataInitializer}.
 *
 * <p>Сидинг идемпотентен: повторный запуск приложения не дублирует данные.
 * Полностью пересоздать демо-данные можно через {@code DROP SCHEMA public CASCADE; CREATE SCHEMA public;}
 * с последующим перезапуском (Flyway проиграет V1+V2, и инициализатор сидит данные).
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class KolomnaDemoDataInitializer implements ApplicationRunner {

    private static final String CITY_NAME = "Коломна";
    private static final String CITY_REGION = "Московская область";
    private static final String DEMO_KEY = "kolomna";

    // --- Картинки. Каждый файл используется ровно один раз в Коломне (см. javadoc). ---

    // Логотип организации
    private static final String LOGO_IMAGE = "images/art gallery/serg-bataev-pWEFjiRkjDU-unsplash.jpg";

    // Картинки для событий (theatre stage / lecture / workshop / art gallery)
    private static final String EV_JAZZ_1 = "images/theatre stage/hossein-nasr-DeYQxIh-pa4-unsplash.jpg";
    private static final String EV_JAZZ_2 = "images/theatre stage/stefano-stacchini-jhPSJDhiRyQ-unsplash.jpg";

    private static final String EV_LECT_COSMOS_1 = "images/lecture/headway-F2KRf_QfCqw-unsplash.jpg";
    private static final String EV_LECT_COSMOS_2 = "images/lecture/dom-fou-YRMWVcdyhmI-unsplash.jpg";

    private static final String EV_FAMILY_1 = "images/workshop/aurelien-romain-DM3XlP765NU-unsplash.jpg";
    private static final String EV_FAMILY_2 = "images/workshop/egor-myznik-JYiN6LCrsGU-unsplash.jpg";
    private static final String EV_FAMILY_3 = "images/workshop/ksenia-berzoj-DH2Gad8wa_A-unsplash.jpg";

    private static final String EV_THEATRE_1 = "images/theatre stage/cyrus-crossan-JOtuJ-DZjTw-unsplash.jpg";
    private static final String EV_THEATRE_2 = "images/theatre stage/eduardo-pastor-SkEUgyJqJlQ-unsplash.jpg";
    private static final String EV_THEATRE_3 = "images/theatre stage/kyle-head-p6rNTdAPbuk-unsplash.jpg";

    private static final String EV_KALACHI_1 = "images/art gallery/artur-matosyan-4YWUMaftmag-unsplash.jpg";
    private static final String EV_KALACHI_2 = "images/art gallery/dannie-jing-3GZlhROZIQg-unsplash.jpg";

    private static final String EV_LECT_KUPETS_1 = "images/lecture/kevin-gonzalez--NXNaE9lu6w-unsplash.jpg";
    private static final String EV_LECT_KUPETS_2 = "images/lecture/wes-lewis-zt6OxRORM2g-unsplash.jpg";

    private static final String EV_BALLET_1 = "images/theatre stage/rob-laughter-WW1jsInXgwM-unsplash.jpg";
    private static final String EV_BALLET_2 = "images/theatre stage/yiran-ding-TmvSImvV7vA-unsplash.jpg";

    // Картинки для публикаций
    private static final String PUB_JAZZ_1 = "images/art/alina-chernovolova-Q1AUTlf1D60-unsplash.jpg";
    private static final String PUB_JAZZ_2 = "images/live music/frank-rolando-romero-vJ5apSa8r14-unsplash.jpg";
    private static final String PUB_COSMOS = "images/art gallery/darya-tryfanava-UCNaGWn4EfU-unsplash.jpg";
    private static final String PUB_FAMILY_1 = "images/open air/a-j-FLmujG5l7uE-unsplash.jpg";
    private static final String PUB_FAMILY_2 = "images/open air/annie-spratt-WS2anBsrum0-unsplash.jpg";
    private static final String PUB_FAMILY_3 = "images/music stage/danny-howe-bn-D2bCvpik-unsplash.jpg";
    private static final String PUB_THEATRE = "images/theatre stage/hossein-nasr-NcA0pUogtiU-unsplash.jpg";
    private static final String PUB_KALACHI = "images/art/debby-hudson-3q05_K3eJxM-unsplash.jpg";
    private static final String PUB_KUPETS = "images/art gallery/jessica-pamp-JNTSoyb_bbw-unsplash.jpg";
    private static final String PUB_BALLET = "images/art gallery/josh-liu-Tjio9DgtIls-unsplash.jpg";

    // --- Россия-специфичные картинки (Wikimedia Commons, скачаны автоматически). ---
    // Новые события «День города», «Прогулка по Коломенскому кремлю», «Масленица на посаде»
    // используют реальные виды Коломны, фото российских праздников и русской архитектуры.
    private static final String EV_DEN_GORODA_1 = "images/kolomna-views/kolomna-01.jpg";
    private static final String EV_DEN_GORODA_2 = "images/kolomna-views/kolomna-02.jpg";
    private static final String EV_DEN_GORODA_3 = "images/russian-festival/festival-01.jpg";

    private static final String EV_KREMLIN_1 = "images/kolomna-views/kolomna-03.jpg";
    private static final String EV_KREMLIN_2 = "images/kolomna-views/kolomna-04.jpg";
    private static final String EV_KREMLIN_3 = "images/russian-architecture/architecture-01.jpg";

    private static final String EV_MASLENITSA_1 = "images/kolomna-views/kolomna-05.jpg";
    private static final String EV_MASLENITSA_2 = "images/russian-festival/festival-02.jpg";
    private static final String EV_MASLENITSA_3 = "images/russian-architecture/architecture-02.jpg";

    private static final String PUB_DEN_GORODA_1 = "images/kolomna-views/kolomna-06.jpg";
    private static final String PUB_DEN_GORODA_2 = "images/russian-festival/festival-03.jpg";
    private static final String PUB_KREMLIN = "images/russian-architecture/architecture-03.jpg";

    private final CityRepository cityRepository;
    private final UserRepository userRepository;
    private final OrganizationRepository organizationRepository;
    private final SessionRepository sessionRepository;
    private final PasswordEncoder passwordEncoder;
    private final DemoDataSupport support;

    @Value("${app.demo.kolomna-seed-enabled:true}")
    private boolean enabled;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (!enabled) {
            log.info("Kolomna demo seeding is disabled");
            return;
        }
        OffsetDateTime now = OffsetDateTime.now();

        // 1. Базовые сущности города: город, роли, организатор, организация.
        City kolomna = ensureCity(now);
        Role organizerRole = support.ensureRole(RoleName.ROLE_ORGANIZER, "Организатор мероприятий");
        Role residentRole = support.ensureRole(RoleName.ROLE_RESIDENT, "Обычный житель");

        User organizer = ensureOrganizerUser(kolomna, now);
        support.ensureUserRole(organizer, organizerRole, now);
        support.ensureUserRole(organizer, residentRole, now);

        Organization organization = ensureOrganization(kolomna, now);
        support.ensureOrganizationMember(organizer, organization, "владелец", now);

        // 2. Логотип организации — реальное фото из папки art gallery.
        Image organizationLogo = support.ensureImage(DEMO_KEY, LOGO_IMAGE, "org-logo", organizer, now);
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

        // 3. Категории и участники.
        Map<String, Category> categories = support.ensureBaseCategories();
        Map<String, Participant> participants = support.ensureParticipants(buildParticipants(), now);

        // 4. События + публикации.
        List<EventSeedSpec> eventSpecs = buildEventSpecs(now);
        Map<String, List<PublicationSeedSpec>> publicationsByEventTitle = buildPublicationSpecsByEventTitle();

        for (EventSeedSpec spec : eventSpecs) {
            EventHolder holder = support.ensureEventBase(spec, organization, organizer, kolomna, now);
            Event event = holder.event();

            support.ensureEventCategories(event, spec.categoryNames(), categories);
            support.ensureEventImages(event, spec.classpathImagePaths(), organizer, now, DEMO_KEY);

            // Сессии и тарифы создаём только при первом сидинге события.
            if (holder.created() || sessionRepository.findAllByEventIdOrderByStartsAtAsc(event.getId()).isEmpty()) {
                support.createSessionsAndTickets(event, spec, kolomna);
            }

            support.ensureEventParticipants(event, spec.participantNames(), participants);
            support.ensurePublications(
                event,
                organization,
                organizer,
                publicationsByEventTitle.getOrDefault(spec.title(), List.of()),
                now,
                DEMO_KEY
            );
            support.normalizePrimaryImage(event.getId());
        }

        // 5. Подчищаем координаты сессий, у которых их нет (например, после ручных правок).
        support.patchMissingSessionCoordinates();

        log.info("Kolomna demo data has been seeded/verified: {} events", eventSpecs.size());
    }

    // ===== Город / пользователь / организация =====

    private City ensureCity(OffsetDateTime now) {
        return cityRepository.findFirstByNameIgnoreCaseAndRegionIgnoreCase(CITY_NAME, CITY_REGION)
            .or(() -> cityRepository.findFirstByNameIgnoreCase(CITY_NAME))
            .orElseGet(() -> cityRepository.save(City.builder()
                .name(CITY_NAME)
                .region(CITY_REGION)
                .active(true)
                .createdAt(now)
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

    private Organization ensureOrganization(City city, OffsetDateTime now) {
        return organizationRepository.findByNameIgnoreCase("Коломенское арт-сообщество")
            .orElseGet(() -> organizationRepository.save(Organization.builder()
                .city(city)
                .name("Коломенское арт-сообщество")
                .description("Локальная организация для культурных и городских событий Коломны: концерты, лекции, фестивали и мастер-классы.")
                .contactEmail("hello@kolomna-events.local")
                .contactPhone("+74966123456")
                .website("https://kolomna-events.local")
                .socialLinks("vk.com/kolomna_events")
                .moderationStatus("одобрена")
                .createdAt(now)
                .updatedAt(now)
                .build()));
    }

    // ===== Участники, специфичные для Коломны =====

    private List<ParticipantSeed> buildParticipants() {
        return List.of(
            new ParticipantSeed("Илья Лебедев", "IL LEBED", "Электронный музыкант и лайв-исполнитель из Коломны.", "Электроника", "исполнитель"),
            new ParticipantSeed("Алексей Руденко", "Rudenko Sax", "Саксофонист с джазовыми и lounge-сетами.", "Джаз", "исполнитель"),
            new ParticipantSeed("Егор Нечаев", "Егор Нечаев", "Лектор и популяризатор науки, автор цикла о космосе.", "Лектор", "лектор"),
            new ParticipantSeed("Марина Соколова", "Марина Соколова", "Вокалистка с акустической концертной программой.", "Акустика", "исполнитель"),
            new ParticipantSeed("Павел Громов", "Павел Громов", "Ведущий детских мастер-классов по робототехнике.", "Образование", "исполнитель"),
            new ParticipantSeed("Анна Воронина", "Анна Воронина", "Историк и экскурсовод, специалист по купеческой Коломне XIX века.", "Лектор", "лектор"),
            new ParticipantSeed("Театр «Коломенская маска»", "Коломенская маска", "Городская театральная компания, ставит уличные и камерные спектакли.", "Театр", "ансамбль"),
            new ParticipantSeed("Балерина Ольга Степанова", "Ольга Степанова", "Прима городской балетной труппы, ведущая мастер-классов по классическому танцу.", "Балет", "исполнитель"),
            new ParticipantSeed("Мастерская «Калачный двор»", "Калачный двор", "Команда коломенской калачной — ведут мастер-классы по историческим рецептам.", "Гастрономия", "ансамбль"),
            new ParticipantSeed("Дмитрий Бельский", "Дмитрий Бельский", "Аккредитованный экскурсовод по Коломенскому кремлю и историческому посаду.", "Экскурсия", "экскурсовод"),
            new ParticipantSeed("Фольклорный ансамбль «Коломенская слобода»", "Коломенская слобода", "Городской ансамбль народной песни, ведут масленичные и ярмарочные программы.", "Народная музыка", "ансамбль")
        );
    }

    // ===== События =====

    private List<EventSeedSpec> buildEventSpecs(OffsetDateTime now) {
        List<EventSeedSpec> result = new ArrayList<>();

        // Событие 1. Джазовый вечер у Коломенки — концерт на Конькобежном центре.
        // Картинки: 2 из theatre stage (концертный свет/сцена).
        result.add(new EventSeedSpec(
            "Джазовый вечер у Коломенки",
            "Камерный джазовый концерт у набережной реки Коломенки.",
            "Вечер живого джаза с саксофоном, авторскими композициями и атмосферой большого концертного зала. " +
                "Программу формируют Илья Лебедев и Алексей Руденко: первая часть — стандарты Майлза Дэвиса и Джона Колтрейна " +
                "в современных аранжировках, вторая — авторский материал с электронными подкладами.\n\n" +
                "Площадка — Конькобежный центр «Коломна», знакомый горожанам по крупным культурным событиям. " +
                "Зал перестраивается под камерный формат: 350 мест с хорошей видимостью сцены и качественным звуком.\n\n" +
                "Концерт подойдёт и опытным меломанам, и тем, кто впервые приходит на живой джаз. " +
                "Перед началом — короткое выступление куратора программы, в антракте — встреча с музыкантами в фойе.",
            "12+",
            List.of("Концерт", "Фестиваль"),
            List.of(EV_JAZZ_1, EV_JAZZ_2),
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

        // Событие 2. Лекторий: Космос над Коломной — научно-популярная лекция.
        // Картинки: 2 из lecture (лекторий, аудитория).
        result.add(new EventSeedSpec(
            "Лекторий: Космос над Коломной",
            "Открытая лекция о современных космических миссиях и наблюдениях звёздного неба над Коломной.",
            "Простым языком о том, как изменились наши знания о космосе за последние десять лет: телескоп Джеймса Уэбба, " +
                "марсоходы новой генерации, миссии к спутникам Юпитера, частный космос и ближайшие планы Роскосмоса.\n\n" +
                "Лектор — Егор Нечаев, популяризатор науки и автор цикла «Космос рядом». В программе — около часа " +
                "основной лекции с большим визуальным рядом и 30 минут вопросов из зала.\n\n" +
                "После лекции желающие смогут остаться на короткую астрономическую сессию во дворе библиотеки: " +
                "если позволит погода, можно будет посмотреть Луну и планеты в телескоп. Лекторий бесплатный, " +
                "но количество мест ограничено вместимостью зала.",
            "6+",
            List.of("Лекция"),
            List.of(EV_LECT_COSMOS_1, EV_LECT_COSMOS_2),
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

        // Событие 3. Семейный фестиваль выходного дня — две сессии в разные дни на разных площадках.
        // Картинки: 3 из workshop (мастерские, дети).
        result.add(new EventSeedSpec(
            "Семейный фестиваль выходного дня",
            "Музыка, мастер-классы и городские активности для всей семьи.",
            "Фестиваль на двух площадках: дневная городская программа на Красногвардейской и семейный вечер " +
                "у дома мастеров на Зайцева. В программе — концерт акустической вокалистки Марины Соколовой, " +
                "мастер-классы по робототехнике от Павла Громова, зона детских настольных игр и фуд-корт " +
                "с локальными производителями.\n\n" +
                "Дневная программа бесплатная, для семейного вечера действует символическая цена за участие " +
                "в мастер-классе (включает все материалы). Все активности рассчитаны на возраст 0+, " +
                "часть мастер-классов адаптирована для детей с особыми потребностями.\n\n" +
                "Расписание построено так, чтобы родители могли выбрать формат под возраст ребёнка: " +
                "малышам — лёгкие активности и музыка, школьникам — робототехника и научные опыты.",
            "0+",
            List.of("Фестиваль", "Мастер-класс"),
            List.of(EV_FAMILY_1, EV_FAMILY_2, EV_FAMILY_3),
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

        // Событие 4. Театр под открытым небом — городской спектакль.
        // Картинки: 3 из theatre stage.
        result.add(new EventSeedSpec(
            "Театр под открытым небом",
            "Уличный спектакль городского театра «Коломенская маска» в историческом центре.",
            "Городская театральная компания «Коломенская маска» представляет спектакль по мотивам пьес " +
                "Островского, адаптированных под уличный формат. Действие разворачивается прямо на пешеходной " +
                "улице Лажечникова, зрители располагаются на скамейках и временных трибунах вдоль фасадов.\n\n" +
                "Длительность — около 90 минут без антракта. Для удобства зрителей предусмотрены пледы " +
                "и горячий чай в фойе соседнего арт-кластера. В случае дождя спектакль переносится в крытый зал " +
                "на улице Октябрьской Революции, 205 — об изменениях участники получат уведомление за два часа.\n\n" +
                "Постановка идёт без сложной техники, но с продуманным звуком и светом — максимально близко " +
                "к живой импровизации. Спектакль рекомендуется для подростков и взрослых, отдельные сцены " +
                "содержат сатирические сюжеты.",
            "12+",
            List.of("Концерт", "Фестиваль"),
            List.of(EV_THEATRE_1, EV_THEATRE_2, EV_THEATRE_3),
            List.of(
                new SessionSeedSpec(
                    "Премьера",
                    now.plusDays(15).withHour(20).withMinute(0).withSecond(0).withNano(0),
                    now.plusDays(15).withHour(21).withMinute(30).withSecond(0).withNano(0),
                    null,
                    "Московская область, Коломна, улица Октябрьской Революции, 205",
                    180,
                    new BigDecimal("750.00")
                )
            ),
            List.of("Театр «Коломенская маска»")
        ));

        // Событие 5. Калачные традиции — гастрономический мастер-класс на Калачной.
        // Картинки: 2 из art gallery (предметная съёмка/детали).
        result.add(new EventSeedSpec(
            "Калачные традиции: мастер-класс на Калачной",
            "Гастрономический мастер-класс по выпечке коломенских калачей в исторической калачной.",
            "Команда «Калачного двора» проведёт двухчасовой мастер-класс по выпечке коломенских калачей " +
                "на действующей исторической площадке. Участники узнают историю промысла, познакомятся " +
                "с традиционной технологией, замесят тесто и испекут собственный калач, который заберут с собой.\n\n" +
                "Программа включает короткую экскурсию по калачной, рассказ о том, как ремесло возродили " +
                "в начале 2010-х, и дегустацию готовых калачей с чаем. Все материалы и фартуки предоставляются " +
                "организатором, дополнительно ничего покупать не нужно.\n\n" +
                "Формат рассчитан на взрослых и детей от 6 лет в сопровождении взрослого. Группа небольшая " +
                "(до 30 человек), поэтому регистрация обязательна.",
            "6+",
            List.of("Мастер-класс"),
            List.of(EV_KALACHI_1, EV_KALACHI_2),
            List.of(
                new SessionSeedSpec(
                    "Группа выходного дня",
                    now.plusDays(9).withHour(12).withMinute(0).withSecond(0).withNano(0),
                    now.plusDays(9).withHour(14).withMinute(0).withSecond(0).withNano(0),
                    null,
                    "Московская область, Коломна, улица Зайцева, 14",
                    30,
                    new BigDecimal("1500.00")
                )
            ),
            List.of("Мастерская «Калачный двор»")
        ));

        // Событие 6. Лекторий: Купеческая Коломна — историческая лекция.
        // Картинки: 2 из lecture.
        result.add(new EventSeedSpec(
            "Лекторий: Купеческая Коломна",
            "Историческая лекция о купеческом сословии и архитектуре Коломны XIX века.",
            "Анна Воронина расскажет, как устроилась жизнь коломенских купцов в XIX веке: где они селились, " +
                "какие особняки строили, как сложилась торговая инфраструктура города и почему именно купечество " +
                "сформировало архитектурный облик исторического центра.\n\n" +
                "Лекция сопровождается архивными фотографиями, картами и фрагментами семейных документов. " +
                "В конце — короткая дискуссия о том, что сохранилось до наших дней и какие здания требуют " +
                "внимательной реставрации.\n\n" +
                "После лекции желающие могут остаться на 30-минутную пешую мини-прогулку: куратор покажет " +
                "три объекта, упомянутых в лекции, в радиусе 10 минут пешком от площадки.",
            "12+",
            List.of("Лекция"),
            List.of(EV_LECT_KUPETS_1, EV_LECT_KUPETS_2),
            List.of(
                new SessionSeedSpec(
                    "Лекция и мини-прогулка",
                    now.plusDays(16).withHour(19).withMinute(0).withSecond(0).withNano(0),
                    now.plusDays(16).withHour(21).withMinute(0).withSecond(0).withNano(0),
                    null,
                    "Московская область, Коломна, улица Лажечникова, 5",
                    120,
                    new BigDecimal("400.00")
                )
            ),
            List.of("Анна Воронина")
        ));

        // Событие 7. Камерный балет в Конькобежном — балетный вечер.
        // Картинки: 2 из theatre stage.
        result.add(new EventSeedSpec(
            "Камерный балет в Конькобежном центре",
            "Вечер классического балета в адаптированном под концертный формат пространстве.",
            "Городская балетная труппа представляет программу из трёх миниатюр: фрагменты «Лебединого озера», " +
                "сольный номер «Умирающий лебедь» в исполнении Ольги Степановой и современный балетный номер " +
                "под музыку Филипа Гласса.\n\n" +
                "Программа задумана как знакомство с балетом для широкой публики: между номерами хореограф " +
                "комментирует, на что обратить внимание, и рассказывает о технике. Спектакль идёт около 80 минут " +
                "с одним коротким антрактом.\n\n" +
                "Для зрителей с детьми (от 8 лет) предусмотрены билеты в первый ряд: оттуда лучше видны жесты " +
                "и мимика танцоров. Для людей с ограниченной мобильностью — отдельные места у прохода " +
                "по предварительной заявке.",
            "8+",
            List.of("Концерт"),
            List.of(EV_BALLET_1, EV_BALLET_2),
            List.of(
                new SessionSeedSpec(
                    "Балетный вечер",
                    now.plusDays(20).withHour(19).withMinute(30).withSecond(0).withNano(0),
                    now.plusDays(20).withHour(21).withMinute(0).withSecond(0).withNano(0),
                    "Московская область, Коломна, Набережная реки Коломенки, 7",
                    null,
                    300,
                    new BigDecimal("1100.00")
                )
            ),
            List.of("Балерина Ольга Степанова")
        ));

        // Событие 8. День города в Коломне — крупный городской фестиваль.
        // Картинки: 2 реальных вида Коломны + 1 фото российского городского праздника.
        result.add(new EventSeedSpec(
            "День города в Коломне",
            "Главный городской праздник: концерты, ярмарки и народные гуляния от Кремля до Зайцева.",
            "День города проходит на трёх связанных площадках исторического центра. Утром — торжественное " +
                "открытие у Маринкиной башни Коломенского кремля, парад творческих коллективов и " +
                "выступление детских ансамблей. Днём — ярмарка локальных производителей вдоль Лажечникова: " +
                "пастила, калачи, медовуха, керамика, текстиль. Вечером — большой концерт на главной " +
                "сцене у набережной с участием городских коллективов и приглашённых артистов.\n\n" +
                "Праздник идёт с 11:00 до 23:00. Все площадки соединены пешеходным маршрутом, между ними " +
                "10–15 минут ходьбы. По маршруту работают точки питания, фуд-корт у Калачной, площадки " +
                "для детей с аниматорами.\n\n" +
                "Финальный салют — в 22:30 над набережной реки Коломенки. Лучшая точка обзора — " +
                "правый берег у Конькобежного центра. Площадки в пик собирают до нескольких тысяч человек, " +
                "поэтому рекомендуем приходить заранее и оставить машину на дальней парковке.",
            "0+",
            List.of("Фестиваль", "Концерт"),
            List.of(EV_DEN_GORODA_1, EV_DEN_GORODA_2, EV_DEN_GORODA_3),
            List.of(
                new SessionSeedSpec(
                    "Городской фестиваль",
                    now.plusDays(25).withHour(11).withMinute(0).withSecond(0).withNano(0),
                    now.plusDays(25).withHour(23).withMinute(0).withSecond(0).withNano(0),
                    null,
                    "Московская область, Коломна, улица Лажечникова, 5",
                    3000,
                    BigDecimal.ZERO
                )
            ),
            List.of("Марина Соколова", "Фольклорный ансамбль «Коломенская слобода»")
        ));

        // Событие 9. Прогулка по Коломенскому кремлю — обзорная экскурсия.
        // Картинки: 2 реальных вида Коломны + 1 фото русской архитектуры (Кижи/деревянное зодчество).
        result.add(new EventSeedSpec(
            "Прогулка по Коломенскому кремлю",
            "Двухчасовая экскурсия по сохранившимся башням и стенам Коломенского кремля.",
            "Аккредитованный экскурсовод Дмитрий Бельский проведёт двухчасовую прогулку по территории " +
                "Коломенского кремля — одного из крупнейших и хорошо сохранившихся каменных кремлей России. " +
                "Маршрут включает Маринкину башню, Соборную площадь, Успенский собор и фрагменты " +
                "крепостной стены XVI века.\n\n" +
                "В программе — рассказ об истории строительства кремля, легенда о Марине Мнишек, " +
                "связь Коломны с московскими князьями и роль города в обороне южных рубежей. " +
                "Экскурсия идёт пешком, без подъёмов на стены — подходит участникам любого уровня " +
                "физической подготовки.\n\n" +
                "Группа ограничена 25 участниками, чтобы экскурсовода было хорошо слышно без микрофона. " +
                "В дождь экскурсия не отменяется — возьмите зонт. После прогулки желающие могут " +
                "остаться на 30 минут вопросов и неформального общения.",
            "8+",
            List.of("Лекция", "Фестиваль"),
            List.of(EV_KREMLIN_1, EV_KREMLIN_2, EV_KREMLIN_3),
            List.of(
                new SessionSeedSpec(
                    "Обзорная экскурсия",
                    now.plusDays(11).withHour(11).withMinute(0).withSecond(0).withNano(0),
                    now.plusDays(11).withHour(13).withMinute(0).withSecond(0).withNano(0),
                    null,
                    "Московская область, Коломна, улица Лажечникова, 5",
                    25,
                    new BigDecimal("600.00")
                )
            ),
            List.of("Дмитрий Бельский")
        ));

        // Событие 10. Масленица на посаде — народный праздник.
        // Картинки: 1 вид Коломны + 1 фото российского праздника + 1 русская архитектура.
        result.add(new EventSeedSpec(
            "Масленица на посаде",
            "Народный праздник с блинами, играми и фольклорной программой в историческом посаде.",
            "Традиционная масленичная программа на территории исторического посада: фольклорный концерт " +
                "ансамбля «Коломенская слобода», уличные народные игры, мастер-классы по выпечке блинов " +
                "и кулачный бой по щадящим правилам. В финале — сжигание масленичного чучела на " +
                "огороженной площадке под наблюдением МЧС.\n\n" +
                "Программа идёт с 12:00 до 17:00, вход свободный. Бесплатная дегустация блинов с разной " +
                "начинкой — от классической сметаны до варенья из коломенских садов. Гости в " +
                "тематических костюмах получают сувенирные жетоны на угощения.\n\n" +
                "Праздник рассчитан на всю семью, мероприятия безопасны для детей. Для маленьких " +
                "посетителей работает отдельная зона с горкой, тёплые палатки с чаем и пеленальная комната. " +
                "Одевайтесь тепло — большая часть программы проходит на улице.",
            "0+",
            List.of("Фестиваль", "Мастер-класс"),
            List.of(EV_MASLENITSA_1, EV_MASLENITSA_2, EV_MASLENITSA_3),
            List.of(
                new SessionSeedSpec(
                    "Масленичные гуляния",
                    now.plusDays(28).withHour(12).withMinute(0).withSecond(0).withNano(0),
                    now.plusDays(28).withHour(17).withMinute(0).withSecond(0).withNano(0),
                    "Московская область, Коломна, улица Зайцева, 14",
                    null,
                    800,
                    BigDecimal.ZERO
                )
            ),
            List.of("Фольклорный ансамбль «Коломенская слобода»", "Мастерская «Калачный двор»")
        ));

        return result;
    }

    // ===== Публикации (привязаны к событиям по title) =====

    /**
     * Подробные публикации к каждому событию. Тексты намеренно длинные (≥1500 знаков) —
     * это пресс-материалы и гайды, которые увидит зритель на странице события.
     */
    private Map<String, List<PublicationSeedSpec>> buildPublicationSpecsByEventTitle() {
        Map<String, List<PublicationSeedSpec>> result = new java.util.LinkedHashMap<>();

        result.put("Джазовый вечер у Коломенки", List.of(
            new PublicationSeedSpec(
                "Программа джазового вечера: что готовят Илья Лебедев и Алексей Руденко",
                "В этот четверг Конькобежный центр «Коломна» превратится в камерный джазовый зал на 350 мест: " +
                    "уберём ледовое покрытие, установим деревянный подиум для сцены и развесим мягкое заливное " +
                    "освещение. Команда звукорежиссёров провела два дня настройки акустики, чтобы добиться " +
                    "ощущения уютного клуба, а не спортивного объекта.\n\n" +
                    "Первое отделение — стандарты бибопа и кул-джаза в живых аранжировках. Илья Лебедев готовит " +
                    "версию So What Майлза Дэвиса с электронными вкраплениями: drone-подложка из модульного " +
                    "синтезатора, тёплый Rhodes на гармонии, акустический контрабас. Алексей Руденко возьмёт " +
                    "на себя главные соло на тенор-саксофоне — у него за плечами десять лет джазовых джемов " +
                    "в Москве и собственная программа на BeFM.\n\n" +
                    "Во втором отделении — оригинальный материал. Это шесть композиций, написанных дуэтом " +
                    "за последний год специально для коломенских концертов: лиричные баллады, две почти " +
                    "танцевальные темы и одна импровизационная с открытой структурой. К дуэту присоединятся " +
                    "ритм-секция (контрабас + барабаны) и гостевая клавиша.\n\n" +
                    "В антракте — короткая встреча с музыкантами в фойе, можно подойти, задать вопрос " +
                    "и взять автограф на программку. После концерта традиционный «джем-after» в баре фойе: " +
                    "приходите со своим инструментом, если хотите включиться.\n\n" +
                    "Что взять с собой: документ, электронный билет (в приложении или распечатанный QR), " +
                    "удобную одежду — в зале комфортные +20°C. Гардероб работает с 18:00, рекомендуем " +
                    "приходить за 30–40 минут до начала, чтобы спокойно занять места и заказать напиток. " +
                    "Парковка на территории центра ограничена: удобнее оставить машину на улице Окской " +
                    "и пройти 7–10 минут пешком вдоль набережной.",
                List.of(PUB_JAZZ_1, PUB_JAZZ_2)
            )
        ));

        result.put("Лекторий: Космос над Коломной", List.of(
            new PublicationSeedSpec(
                "Карта звёздного неба и материалы для подготовки к лекции",
                "Чтобы лекция «Космос над Коломной» прошла максимально полезно, мы собрали небольшой материал " +
                    "для подготовки. Если у вас 20 свободных минут до прихода на лекцию — этого достаточно, " +
                    "чтобы настроиться на тему и задать на встрече более глубокие вопросы.\n\n" +
                    "Что обсудим. Основной фокус — последние десять лет в космической отрасли: новый телескоп " +
                    "Джеймса Уэбба и почему его снимки качественно отличаются от снимков «Хаббла»; миссии " +
                    "к спутникам Юпитера (JUICE, Europa Clipper) и что мы рассчитываем найти в подлёдных океанах; " +
                    "марсоходы Perseverance и Zhurong, поиск признаков прошлой жизни; коммерческий космос — " +
                    "SpaceX, Rocket Lab, ISRO; ближайшие планы Роскосмоса.\n\n" +
                    "Что почитать заранее (по желанию). Любые материалы Сергея Попова о современной астрофизике " +
                    "хорошо ложатся как фон. Из англоязычного — блог Phil Plait «Bad Astronomy» и YouTube-канал " +
                    "Anton Petrov для тех, кто привык получать новости в видео-формате. Если хочется глубже — " +
                    "книги «Краткая история времени» (Хокинг) и «Космос» (Саган) остаются актуальными.\n\n" +
                    "Что взять на лекцию. Блокнот и ручку, если планируете записывать; смартфон с приложением " +
                    "Stellarium — после лекции, если будет ясное небо, мы выйдем во двор, и оно поможет " +
                    "сориентироваться. Для родителей с детьми: лекция рассчитана на 6+, но самым младшим " +
                    "может быть тяжело удержать внимание полтора часа — рекомендуем тихую игрушку или " +
                    "альбом с раскрасками.\n\n" +
                    "После лекции. Если небо позволит, лектор Егор Нечаев останется на 30–40 минут с телескопом " +
                    "во дворе библиотеки. В мае хорошо видны Луна, Марс и звёздные скопления — будет на что " +
                    "посмотреть. Никакой дополнительной регистрации не требуется, просто оставайтесь после " +
                    "основной части. Если идёт дождь, соберёмся в фойе на чай и неформальные вопросы.\n\n" +
                    "Лекция бесплатная, но количество мест ограничено вместимостью зала (150 человек). " +
                    "Регистрация на странице события обязательна — она помогает нам распечатать раздаточные " +
                    "материалы под точное число гостей.",
                List.of(PUB_COSMOS)
            )
        ));

        result.put("Семейный фестиваль выходного дня", List.of(
            new PublicationSeedSpec(
                "Полный гайд по семейному фестивалю: расписание, площадки, что взять с собой",
                "Семейный фестиваль идёт два дня и проходит на двух площадках. Чтобы вы не запутались, " +
                    "собрали в одном месте всё, что нужно знать перед визитом — от карты до рекомендаций " +
                    "по возрасту детей.\n\n" +
                    "День первый — городская программа на Красногвардейской. Открытая зона, 11:00–15:00, " +
                    "вход свободный. Главная сцена: акустический сет Марины Соколовой (12:00) и музыкальная " +
                    "программа для самых маленьких (13:30). Параллельно работают зона настольных игр " +
                    "(привезли больше 50 настолок — от «Каркассона» до карточных игр для дошкольников) " +
                    "и фуд-корт с локальными производителями: коломенские сыры, выпечка, кофе и лимонады.\n\n" +
                    "День второй — семейный вечер на Зайцева, 12:00–16:00. Платный формат: 500 рублей за " +
                    "участие в одном мастер-классе, включает все материалы. Павел Громов проведёт две группы " +
                    "по робототехнике (12:30 и 14:30, для детей 7–12 лет, по 15 человек), параллельно идёт " +
                    "творческая мастерская для детей 4–6 лет — лепка из натуральной глины. На входе работает " +
                    "стол регистрации: мастер-классы заполняются быстро, лучше прийти заранее.\n\n" +
                    "По возрастам. Дошкольники (0–6) — оба дня подойдут, акцент на день первый: больше музыки " +
                    "и свободной активности. Школьники (7–12) — главный интерес во второй день: робототехника " +
                    "и научные опыты. Подростки и взрослые — приходите на оба дня, отдельная зона на Зайцева " +
                    "оборудована под спокойное время с книгой и чаем.\n\n" +
                    "Что взять. Удобную одежду по погоде, бутылку воды, для детей — сменные носки/футболку " +
                    "(на мастер-классах с глиной всё может стать интересного цвета). Из документов: паспорт " +
                    "и QR-код (если регистрировались на платный мастер-класс). Коляски на обеих площадках " +
                    "поместятся, пеленальная комната работает в фойе на Зайцева.\n\n" +
                    "Доступность. На обе площадки есть пандусы, но участок на Красногвардейской частично " +
                    "вымощен булыжником — родителям с колясками рекомендуем идти со стороны улицы Полянской. " +
                    "Часть мастер-классов адаптирована для детей с РАС: тихая комната с приглушённым светом " +
                    "и наушниками работает все четыре часа во второй день.\n\n" +
                    "Парковка. У обеих площадок небольшие карманы для машин, но в выходные они быстро " +
                    "заполняются. Если едете на машине — лучше припарковаться в районе улицы Лажечникова " +
                    "и пройти 10 минут пешком: это и быстрее, и приятнее, чем искать место в центре.\n\n" +
                    "Если что-то пошло не так — на каждой площадке стоит стол волонтёров с приметным красным " +
                    "флажком. Там можно взять воду, найти потерявшегося ребёнка (всем детям выдают браслеты " +
                    "с номером телефона родителя на входе) и задать любой вопрос организаторам.",
                List.of(PUB_FAMILY_1, PUB_FAMILY_2, PUB_FAMILY_3)
            )
        ));

        result.put("Театр под открытым небом", List.of(
            new PublicationSeedSpec(
                "Спектакль под открытым небом: интервью с режиссёром «Коломенской маски»",
                "За месяц до премьеры мы поговорили с художественным руководителем театра «Коломенская маска» " +
                    "о том, как готовится уличная постановка по мотивам Островского — и почему было важно " +
                    "сделать её именно на улице Лажечникова.\n\n" +
                    "Идея. «Островский — драматург, которого все слышали, но мало кто читал заново после школы. " +
                    "Мы хотели вернуть зрителю вкус к его языку — лёгкому, ироничному, очень узнаваемому. " +
                    "Уличный формат снимает дистанцию: зритель не сидит в полутёмном зале, а оказывается " +
                    "буквально в нескольких метрах от актёров, и текст начинает звучать совсем иначе.»\n\n" +
                    "Адаптация. Из четырёх пьес собрали полуторачасовой коллаж: ключевые сцены, связанные " +
                    "сквозными монологами. «Это не музей и не реконструкция. Часть реплик мы аккуратно " +
                    "осовременили — там, где это помогает зрителю, сохранив ритм и интонацию автора.» " +
                    "Декорации минимальны: пара деревянных конструкций, ширма, костюмы — основная " +
                    "выразительность держится на актёрской игре.\n\n" +
                    "Площадка. Улицу Лажечникова выбрали не случайно: мощёная пешеходная зона, исторические " +
                    "фасады, отличная акустика без гулкости. «У этой улицы есть свой характер — она длинная, " +
                    "немного театральная сама по себе. Мы поставили временные трибуны вдоль одной стороны, " +
                    "сцена — напротив, на пятачке у фонтана. Получилось очень камерно, несмотря на открытое " +
                    "пространство.»\n\n" +
                    "Звук и свет. Микрофоны-петлички на актёрах подключены к динамикам по обе стороны зрителя. " +
                    "Световое решение специально мягкое — без театральных вспышек, чтобы не выбиваться " +
                    "из городской среды. К концу спектакля естественный закат сменяется тёплыми золотыми " +
                    "лампами на фасадах — это часть художественного решения.\n\n" +
                    "Если будет дождь. На крайний случай готов резервный зал на Октябрьской Революции, 205 — " +
                    "там же, где хранятся декорации. Решение принимается за 2 часа до начала, всем " +
                    "зарегистрированным зрителям приходит уведомление по почте и в приложении.\n\n" +
                    "Кому будет интересно. Спектакль рассчитан на подростков и взрослых — отдельные сюжеты " +
                    "сатирические, маленьким детям может быть скучно или непонятно. Зато отлично подходит " +
                    "для тех, кто давно не был в театре или думает, что классика — это скучно. После спектакля " +
                    "актёры остаются на 15 минут общения со зрителями — можно задать любой вопрос, " +
                    "сделать фото и взять автограф на программке.",
                List.of(PUB_THEATRE)
            )
        ));

        result.put("Калачные традиции: мастер-класс на Калачной", List.of(
            new PublicationSeedSpec(
                "История коломенского калача и подробная программа мастер-класса",
                "Коломенский калач — один из самых узнаваемых гастрономических символов города. До революции " +
                    "его пекли в десятках калачных по всей Коломне, потом промысел почти полностью исчез " +
                    "и был восстановлен только в 2010-х на основании архивных документов и дореволюционных " +
                    "поваренных книг. Сегодня действующая калачная на Зайцева — одно из немногих мест, " +
                    "где можно увидеть весь процесс целиком и попробовать испечь калач самому.\n\n" +
                    "Что такое настоящий калач. Это пшеничный хлеб особой формы — с «ручкой», «губой» и « " +
                    "животиком», — на хмелевой закваске, без яиц и молока. Тесто долгое, выдерживается " +
                    "в нескольких подходах; пекут в дровяной печи на поду. Историческая фишка — «лядовое тесто», " +
                    "которое перед выпечкой охлаждают, а потом раскатывают вручную: именно так получается " +
                    "характерная плотная мякоть и тонкая хрустящая корка.\n\n" +
                    "Программа мастер-класса. Сначала — короткая экскурсия по калачной (15 минут): покажем " +
                    "печь, расскажем про восстановление рецепта, дадим попробовать готовый калач с маслом. " +
                    "Затем — основная часть (1 час 15 минут): замес теста, формовка, отдых, выпечка. " +
                    "Параллельно ведущая объясняет, что и зачем мы делаем. Финал — чаепитие со свежим калачом " +
                    "и забор своего калача в фирменной упаковке (около 30 минут).\n\n" +
                    "Что нужно знать заранее. Все материалы и фартуки выдаются на месте, ничего покупать " +
                    "и приносить не нужно. Если у вас аллергия на пшеничную муку — мастер-класс не подойдёт, " +
                    "к сожалению, безглютенового варианта мы не делаем (рецептура исторически жёсткая). " +
                    "Дети с 6 лет участвуют наравне со взрослыми, младше — могут наблюдать вместе с родителем, " +
                    "но без отдельного места за столом.\n\n" +
                    "Группы небольшие — до 30 человек. Мы специально не собираем большие потоки: только так " +
                    "ведущий успевает уделить внимание каждому участнику и помочь, если тесто капризничает. " +
                    "Регистрация обязательна, оплата на сайте — мест физически не хватает на всех желающих, " +
                    "и листы ожидания заполняются быстро.\n\n" +
                    "Как добраться. Площадка — улица Зайцева, 14, в исторической части города. От железнодорожной " +
                    "станции «Коломна» — 15 минут на автобусе или 25 минут пешком приятным маршрутом мимо " +
                    "Коломенского кремля. Парковка ограниченная, рекомендуем общественный транспорт " +
                    "или такси.",
                List.of(PUB_KALACHI)
            )
        ));

        result.put("Лекторий: Купеческая Коломна", List.of(
            new PublicationSeedSpec(
                "Маршрут после лекции: три купеческих особняка в десяти минутах ходьбы",
                "Сразу после лекции «Купеческая Коломна» куратор предложит желающим короткую пешую прогулку " +
                    "к трём купеческим объектам, упомянутым в материале. Прогулка занимает 30–40 минут " +
                    "и заканчивается там же, где началась — у площадки на Лажечникова. Если вы по какой-то " +
                    "причине не сможете остаться, в этой публикации мы собрали маршрут, чтобы вы могли пройти " +
                    "его самостоятельно.\n\n" +
                    "Точка 1. Дом купцов Лажечниковых (улица Октябрьской Революции). Усадьба середины XIX века, " +
                    "из которой выросла судьба известного писателя Ивана Лажечникова. Обратите внимание " +
                    "на лепнину под кровлей и сохранившиеся ставни первого этажа — это редкость для " +
                    "коломенских купеческих домов: большинство было перестроено в советское время.\n\n" +
                    "Точка 2. Бывший торговый ряд (Красногвардейская улица). Длинное одноэтажное здание " +
                    "с характерными арками — типичная коммерческая архитектура второй половины XIX века. " +
                    "Здесь же стоит обратить внимание на фрагмент вымостки под старым булыжником: " +
                    "при реконструкции 2018 года сделали аккуратные «окна», через которые видно " +
                    "историческое мощение.\n\n" +
                    "Точка 3. Доходный дом (улица Полянская). Трёхэтажное кирпичное здание с эркерами и " +
                    "характерной для коломенского купечества декоративной кладкой. Сейчас здесь общественное " +
                    "пространство и кафе — можно зайти внутрь, увидеть оригинальные деревянные лестницы " +
                    "и при желании выпить кофе.\n\n" +
                    "Что почитать дальше. Анна Воронина рекомендует две книги: «Купеческая Коломна XIX века» " +
                    "(издание краеведческого музея, есть в местных книжных магазинах) и сборник архивных " +
                    "документов «Торговые семьи Коломны» — последний доступен бесплатно в электронной " +
                    "библиотеке музея.\n\n" +
                    "Что важно. Маршрут проходит по обычным городским улицам, никакой специальной экипировки " +
                    "не требуется. Удобная обувь — плюс, особенно если планируете обойти все три точки. " +
                    "Часть пути — мощёная мостовая, людям с трудностями передвижения может быть тяжело: " +
                    "по запросу куратор покажет адаптированный маршрут только до первой точки и обратно.\n\n" +
                    "Билет на лекцию — 400 рублей, включает раздаточный материал с картой маршрута и подборкой " +
                    "архивных фотографий. После лекции карта остаётся вам, можно вернуться к маршруту в любой " +
                    "удобный день.",
                List.of(PUB_KUPETS)
            )
        ));

        result.put("Камерный балет в Конькобежном центре", List.of(
            new PublicationSeedSpec(
                "Программа балетного вечера: что увидите и на что обратить внимание",
                "Балетный вечер задуман как дружелюбное знакомство с классикой для всех — от тех, кто на балете " +
                    "впервые, до постоянных зрителей. Программа — три миниатюры разной эпохи и настроения, " +
                    "общая длительность около 80 минут с одним коротким антрактом. В этой публикации — " +
                    "подробный разбор номеров и небольшие подсказки, на что смотреть.\n\n" +
                    "Номер 1. Фрагменты «Лебединого озера» Чайковского. Возьмём две сцены: «Лебедь» " +
                    "(Pas de deux) и «Чёрный лебедь» (Pas de deux в III акте). Это классика классики, " +
                    "но в нашей постановке акцент сделан не на чистый канон, а на эмоциональную линию: " +
                    "хореограф специально работала с парой, чтобы передать характер двух героинь — нежной " +
                    "Одетты и хищной Одиллии. Обратите внимание на 32 фуэте в Чёрном лебеде: классическая " +
                    "вершина балерины, после которой обычно зал взрывается аплодисментами.\n\n" +
                    "Номер 2. «Умирающий лебедь» — соло Ольги Степановой. Миниатюра Сен-Санса, поставленная " +
                    "Михаилом Фокиным в 1907 году. Меньше четырёх минут чистой эмоции и техники: руки балерины " +
                    "имитируют движения крыльев, тело едва касается сцены. Это номер, который Степанова " +
                    "танцует уже десять лет, и каждый раз — немного по-новому. На что смотреть: на работу рук " +
                    "и на то, как балерина управляет дыханием — в зале с хорошей акустикой это слышно.\n\n" +
                    "Антракт (15 минут). Можно встать, размяться, выпить воды или кофе в фойе. " +
                    "Хореограф будет в фойе и ответит на любые вопросы о первом отделении.\n\n" +
                    "Номер 3. Современный балетный номер на музыку Филипа Гласса (Piano Etude No. 2). " +
                    "Это не классика — это современная хореография, выстроенная вокруг повторов и небольших " +
                    "вариаций. Танцует ансамбль из четырёх артистов. Если кажется, что «ничего особенного " +
                    "не происходит» — это нормально, такая хореография держится на тонких сдвигах и общей " +
                    "атмосфере. На что смотреть: на синхронность группы и на то, как одна и та же фраза " +
                    "повторяется с микроизменениями.\n\n" +
                    "Что взять. Электронный билет, документ; для детей удобнее всего сидеть в первом ряду — " +
                    "там лучше видно жесты и мимику. Зал немного прохладный (около +18°C), может быть " +
                    "комфортно в кардигане. Если у вас место в дальних рядах — бинокль не помешает, но " +
                    "хореография рассчитана на восприятие без него.\n\n" +
                    "Доступность. Для людей с ограниченной мобильностью — отдельные места у прохода " +
                    "по предварительной заявке (напишите на почту организаторов за 24 часа). Лифт " +
                    "до зала работает с 18:30. Слабослышащие зрители — на сайте есть PDF с программой " +
                    "и краткими описаниями каждого номера, можно скачать заранее.",
                List.of(PUB_BALLET)
            )
        ));

        // Публикация к «День города в Коломне» — городской гайд по площадкам.
        result.put("День города в Коломне", List.of(
            new PublicationSeedSpec(
                "Гайд по Дню города: маршрут, расписание сцен и где смотреть салют",
                "День города — главный летний праздник Коломны. В этом году программа охватывает три большие " +
                    "площадки, соединённые удобным пешеходным маршрутом, и идёт двенадцать часов подряд. " +
                    "Чтобы вы провели день максимально насыщенно и не пропустили главное, мы собрали " +
                    "подробную программу и практические советы.\n\n" +
                    "Утро (11:00–14:00): Соборная площадь Коломенского кремля. Торжественное открытие в " +
                    "11:00 у Маринкиной башни — мэр и почётные гости, парад творческих коллективов, " +
                    "поднятие городского флага. Затем три часа выступлений детских и юношеских ансамблей: " +
                    "хор воскресной школы, городской оркестр духовых, фольклорная студия. На площадке " +
                    "работают тематические точки: викторина по истории Коломны, фотозона с историческими " +
                    "костюмами, мастер-классы по каллиграфии и старинным играм для детей.\n\n" +
                    "День (14:00–18:00): улица Лажечникова и пешеходная зона. Главная ярмарка дня — около " +
                    "сорока локальных производителей. Коломенская пастила в трёх исторических вариантах " +
                    "(союзная, рыхлая, постная), калачи из действующей калачной, медовуха из местной " +
                    "сыроварни, керамика рязанских и подмосковных мастеров, текстиль ручной работы. " +
                    "Параллельно — дворовый концерт акустических исполнителей у фонтана и зона стрит-арта, " +
                    "где художники прямо на ваших глазах расписывают временные щиты.\n\n" +
                    "Вечер (18:00–22:00): главная сцена у набережной Коломенки. Большой концертный блок: " +
                    "сначала городские коллективы (фольклорный ансамбль «Коломенская слобода», вокалистка " +
                    "Марина Соколова), затем приглашённые гости — артисты из Москвы и Рязани. К 21:00 " +
                    "начнётся танцевальная программа: ди-джеи, лёгкая электроника, можно потанцевать " +
                    "прямо у сцены.\n\n" +
                    "Финал (22:30): праздничный салют над Коломенкой. Лучшие точки обзора — правый берег " +
                    "у Конькобежного центра и пешеходный мост (приходите за 30 минут, оба места быстро " +
                    "заполняются). Салют идёт 12 минут, синхронизирован с музыкой по громкой связи.\n\n" +
                    "Что взять с собой. Удобная обувь — за день вы пройдёте 3–4 км. Зонт или дождевик — " +
                    "программа идёт в любую погоду кроме шторма. Бутылка воды (питьевые точки есть, но " +
                    "в пик к ним очереди). Для детей — головной убор и шумозащитные наушники, если " +
                    "планируете оставаться на салют. Наличные на ярмарке — большинство производителей " +
                    "принимают карты, но небольшие позиции (50–100 рублей) удобнее наличными.\n\n" +
                    "Как добраться. К центру лучше на электричке до станции «Коломна» — оттуда автобусы " +
                    "и пешеходные маршруты. Парковки в радиусе километра от кремля будут забиты с 10:00. " +
                    "Если на машине — оставьте её у Конькобежного центра и идите 15 минут пешком вдоль " +
                    "набережной (это и быстрее, и красивее).\n\n" +
                    "Точки помощи. У каждой площадки — стол волонтёров с городским флажком: вода, " +
                    "медицинская помощь, потерявшиеся дети (всем выдают браслет с телефоном родителя на " +
                    "входе). Стационарный медпункт работает у главной сцены.",
                List.of(PUB_DEN_GORODA_1, PUB_DEN_GORODA_2)
            )
        ));

        // Публикация к «Прогулка по Коломенскому кремлю» — материал для подготовки к экскурсии.
        result.put("Прогулка по Коломенскому кремлю", List.of(
            new PublicationSeedSpec(
                "Что посмотреть в Коломенском кремле: подготовка к экскурсии",
                "Коломенский кремль — один из самых больших и хорошо сохранившихся каменных кремлей России. " +
                    "Перед экскурсией мы советуем потратить 15 минут, чтобы прочесть этот короткий обзор: " +
                    "так вы сможете задать экскурсоводу более глубокие вопросы и получить от прогулки больше.\n\n" +
                    "История в двух абзацах. Каменный кремль построен в 1525–1531 годах при Василии III как " +
                    "южный форпост Московского княжества. Это был ответ на регулярные набеги крымских и " +
                    "казанских татар: деревянная крепость уже не справлялась. Размер кремля примерно " +
                    "соответствовал московскому — 24 гектара, 17 башен, две из которых проездные. Часть стен " +
                    "и башен не дожила до наших дней — в XIX веке местные жители разбирали кладку на " +
                    "строительство домов, и только специальное распоряжение остановило этот процесс.\n\n" +
                    "Что увидите на маршруте. Маринкина башня — один из главных символов города, по легенде " +
                    "именно здесь содержалась Марина Мнишек. Соборная площадь с Успенским собором (1672 года) " +
                    "и колокольней — действующий комплекс, регулярные службы. Фрагменты крепостной стены " +
                    "вдоль Лажечникова и Кремлёвской улицы — здесь хорошо видны разные эпохи строительства " +
                    "и поздние ремонты. Грановитая башня — единственная многогранная башня кремля. " +
                    "Семёновская и Ямская башни — сохранились в почти первозданном виде.\n\n" +
                    "Что взять с собой. Удобная обувь — гулять предстоит по брусчатке и неровным тропинкам. " +
                    "Зонт — экскурсия не отменяется в дождь. Заряженный телефон с приложением для съёмки — " +
                    "архитектурные детали хороши на фотографиях. Воду — ни одного питьевого фонтанчика " +
                    "на территории нет. Если у вас вопросы по конкретным объектам или семейной истории, " +
                    "связанной с Коломной — запишите заранее, экскурсовод оставит время в конце для разбора.\n\n" +
                    "Доступность. Маршрут проходит по неровной поверхности, людям с ограниченной мобильностью " +
                    "может быть тяжело — пишите в форму обратной связи за 24 часа, мы предложим " +
                    "адаптированный укороченный маршрут только по Соборной площади. Для слабослышащих — " +
                    "экскурсовод говорит размеренно и громко, плюс выдаём распечатанный конспект " +
                    "с ключевыми фактами.\n\n" +
                    "После экскурсии. Если хочется продолжить — рядом с кремлём интересны Калачная " +
                    "(можно купить горячий калач и зайти на 10-минутную мини-экскурсию по производству), " +
                    "Музей пастилы и набережная реки Коломенки. На всё это закладывайте дополнительные " +
                    "1,5–2 часа после основной экскурсии.",
                List.of(PUB_KREMLIN)
            )
        ));

        return result;
    }
}
