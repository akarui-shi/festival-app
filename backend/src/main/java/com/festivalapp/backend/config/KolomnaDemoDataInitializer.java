package com.festivalapp.backend.config;

import com.festivalapp.backend.config.support.DemoDataSupport;
import com.festivalapp.backend.config.support.DemoDataSupport.ParticipantSeed;
import com.festivalapp.backend.config.support.DemoDataSupport.EventHolder;
import com.festivalapp.backend.config.support.DemoDataSupport.EventSeedSpec;
import com.festivalapp.backend.config.support.DemoDataSupport.PublicationSeedSpec;
import com.festivalapp.backend.config.support.DemoDataSupport.SessionSeedSpec;
import com.festivalapp.backend.config.support.DemoDataSupport.TicketSeedSpec;
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
import org.springframework.core.annotation.Order;
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
@Order(10)
@RequiredArgsConstructor
public class KolomnaDemoDataInitializer implements ApplicationRunner {

    private static final String CITY_NAME = "Коломна";
    private static final String CITY_REGION = "Московская область";
    private static final String DEMO_KEY = "kolomna";

    // --- Картинки. Каждый файл используется ровно один раз в Коломне (см. javadoc). ---

    // Логотип организации
    private static final String LOGO_IMAGE = "images/art gallery/serg-bataev-pWEFjiRkjDU-unsplash.jpg";

    // Картинки для событий (theatre stage / lecture / workshop / art gallery)
    private static final String EV_JAZZ_1 = "images/theatre stage/kobby-mendez-V3u2hyLPbaM-unsplash.jpg";
    private static final String EV_JAZZ_2 = "images/theatre stage/stefano-stacchini-jhPSJDhiRyQ-unsplash.jpg";

    private static final String EV_LECT_COSMOS_1 = "images/lecture/headway-F2KRf_QfCqw-unsplash.jpg";
    private static final String EV_LECT_COSMOS_2 = "images/lecture/dom-fou-YRMWVcdyhmI-unsplash.jpg";

    private static final String EV_FAMILY_1 = "images/workshop/aurelien-romain-DM3XlP765NU-unsplash.jpg";
    private static final String EV_FAMILY_2 = "images/workshop/egor-myznik-JYiN6LCrsGU-unsplash.jpg";
    private static final String EV_FAMILY_3 = "images/workshop/ksenia-berzoj-DH2Gad8wa_A-unsplash.jpg";

    private static final String EV_THEATRE_1 = "images/theatre stage/cyrus-crossan-JOtuJ-DZjTw-unsplash.jpg";
    private static final String EV_THEATRE_2 = "images/theatre stage/eduardo-pastor-SkEUgyJqJlQ-unsplash.jpg";
    private static final String EV_THEATRE_3 = "images/theatre stage/kyle-head-p6rNTdAPbuk-unsplash.jpg";

    private static final String EV_LECT_KUPETS_1 = "images/lecture/kevin-gonzalez--NXNaE9lu6w-unsplash.jpg";
    private static final String EV_LECT_KUPETS_2 = "images/lecture/wes-lewis-zt6OxRORM2g-unsplash.jpg";

    // Картинки для публикаций
    private static final String PUB_JAZZ_1 = "images/live music/frank-rolando-romero-vJ5apSa8r14-unsplash.jpg";
    private static final String PUB_COSMOS = "images/art gallery/befca5ad7ead0576c00f47ac15851df1.png";
    private static final String PUB_FAMILY_1 = "images/open air/annie-spratt-WS2anBsrum0-unsplash.jpg";
    private static final String PUB_THEATRE = "images/theatre stage/hossein-nasr-NcA0pUogtiU-unsplash.jpg";
    private static final String PUB_KUPETS = "images/art gallery/jessica-pamp-JNTSoyb_bbw-unsplash.jpg";

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

    // --- Картинки для бесплатных событий (по 2 на каждое из 4 событий). ---
    private static final String EV_FREE_WALK_1 = "images/free-walks/scale_2400.jpeg";
    private static final String EV_FREE_WALK_2 = "images/free-walks/scale_2400 (1).jpeg";
    private static final String EV_FREE_MUSEUM_1 = "images/free-museum/museum-01.jpg";
    private static final String EV_FREE_MUSEUM_2 = "images/free-museum/museum-02.jpg";
    private static final String EV_FREE_PARK_1 = "images/free-park/aneta-pawlik-h5cFbbecEuY-unsplash.jpg";
    private static final String EV_FREE_KIDS_1 = "images/free-children/madalyn-cox-l9WYx9r8QCU-unsplash.jpg";
    private static final String EV_FREE_KIDS_2 = "images/free-children/raspopova-marina-JrtYJoAIN6A-unsplash.jpg";

    private static final String EV_POTTERY_LAB_1 = "images/free-craft/kolomna-pottery-lab.jpg";
    private static final String EV_POTTERY_LAB_2 = "images/free-craft/kolomna-clay-hands.jpg";
    private static final String EV_PLANT_EXCHANGE_1 = "images/free-garden/kolomna-plant-exchange.jpg";
    private static final String EV_PLANT_EXCHANGE_2 = "images/free-garden/kolomna-garden-gathering.jpg";

    private final CityRepository cityRepository;
    private final UserRepository userRepository;
    private final OrganizationRepository organizationRepository;
    private final SessionRepository sessionRepository;
    private final PasswordEncoder passwordEncoder;
    private final DemoDataSupport support;
    private final String number = "123456";

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
                .passwordHash(passwordEncoder.encode(number))
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
            new ParticipantSeed("Фольклорный ансамбль «Коломенская слобода»", "Коломенская слобода", "Городской ансамбль народной песни, ведут масленичные и ярмарочные программы.", "Народная музыка", "ансамбль"),
            new ParticipantSeed("Керамическая студия «Посад»", "Посад", "Открытая ремесленная студия с мастер-классами по керамике и ручной лепке.", "Керамика", "ансамбль"),
            new ParticipantSeed("Садовый клуб «Коломенские ростки»", "Коломенские ростки", "Соседский клуб обмена растениями, черенками и городскими садовыми практиками.", "Садоводство", "ансамбль")
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

        // ===== Бесплатные события (price = 0). Для них создаётся бесплатный входной билет. =====

        // 11. Бесплатная пешая экскурсия по набережной Коломенки.
        result.add(new EventSeedSpec(
            "Бесплатная экскурсия: набережная Коломенки",
            "Пешая прогулка по обновлённой набережной с городским гидом.",
            "Часовая бесплатная прогулка вдоль реки Коломенки в сопровождении городского экскурсовода. " +
                "Маршрут начинается у Конькобежного центра, идёт по благоустроенной набережной мимо " +
                "видовых площадок и заканчивается у пешеходного моста.\n\n" +
                "Гид расскажет историю реки, как менялась прибрежная застройка от купеческой эпохи " +
                "до советских лет, и где находились утраченные мельницы. Маршрут ровный, " +
                "подходит для людей с любым уровнем подготовки и для участников с детскими колясками.\n\n" +
                "Предварительная запись не нужна — приходите к месту старта. В случае дождя прогулка " +
                "не отменяется, но просим взять зонт.",
            "0+",
            List.of("Лекция", "Фестиваль"),
            List.of(EV_FREE_WALK_1, EV_FREE_WALK_2),
            List.of(
                new SessionSeedSpec(
                    "Бесплатная прогулка",
                    now.plusDays(6).withHour(11).withMinute(0).withSecond(0).withNano(0),
                    now.plusDays(6).withHour(12).withMinute(0).withSecond(0).withNano(0),
                    "Московская область, Коломна, Набережная реки Коломенки, 7",
                    null,
                    60,
                    BigDecimal.ZERO
                )
            ),
            List.of("Дмитрий Бельский")
        ));

        // 12. Бесплатный день в краеведческом музее.
        result.add(new EventSeedSpec(
            "День открытых дверей в музее",
            "Свободный вход в краеведческий музей и тематические лекции в течение дня.",
            "Раз в месяц музей открывает двери для свободного посещения: можно осмотреть постоянную " +
                "экспозицию, выставку текущего сезона и попасть на 30-минутные тематические лекции, " +
                "которые сотрудники музея проводят в течение дня.\n\n" +
                "Рекомендуемое время визита — 1,5–2 часа. На входе дают карту музея с расписанием лекций " +
                "и подсказками, на что обратить особое внимание. Для детей подготовлен короткий квест " +
                "по экспозиции — листок с заданиями выдают бесплатно.\n\n" +
                "Большие сумки и верхняя одежда сдаются в гардероб. Фотосъёмка без вспышки разрешена.",
            "6+",
            List.of("Лекция", "Фестиваль"),
            List.of(EV_FREE_MUSEUM_1, EV_FREE_MUSEUM_2),
            List.of(
                new SessionSeedSpec(
                    "Свободное посещение",
                    now.plusDays(9).withHour(10).withMinute(0).withSecond(0).withNano(0),
                    now.plusDays(9).withHour(18).withMinute(0).withSecond(0).withNano(0),
                    null,
                    "Московская область, Коломна, улица Лажечникова, 5",
                    400,
                    BigDecimal.ZERO
                )
            ),
            List.of("Анна Воронина")
        ));

        // 13. Бесплатный кинопоказ в парке.
        result.add(new EventSeedSpec(
            "Кинопоказ в парке: фильмы под открытым небом",
            "Вечерний бесплатный показ художественного кино на большом экране в городском парке.",
            "Городской летний кинолекторий: вечерний показ художественного фильма на большом экране, " +
                "установленном на лужайке парка. Перед сеансом — короткое вступительное слово куратора " +
                "программы и розыгрыш сувениров.\n\n" +
                "Зрители располагаются на собственных пледах или на скамейках, расставленных вокруг экрана. " +
                "Рядом работает бесплатная зона с горячим чаем и попкорном по символической цене " +
                "от партнёров. Длительность фильма с обсуждением — около 2,5 часов.\n\n" +
                "Программа сезона публикуется заранее в сообществе. В случае дождя показ переносится " +
                "в крытое фойе соседнего ДК — об этом сообщают за два часа до начала.",
            "12+",
            List.of("Фестиваль"),
            List.of(EV_FREE_PARK_1),
            List.of(
                new SessionSeedSpec(
                    "Вечерний показ",
                    now.plusDays(13).withHour(20).withMinute(0).withSecond(0).withNano(0),
                    now.plusDays(13).withHour(22).withMinute(30).withSecond(0).withNano(0),
                    "Московская область, Коломна, Красногвардейская улица, 2",
                    null,
                    250,
                    BigDecimal.ZERO
                )
            ),
            List.of()
        ));

        // 14. Бесплатная творческая мастерская для детей.
        result.add(new EventSeedSpec(
            "Творческая мастерская для детей",
            "Бесплатное детское занятие по рисованию и декоративному творчеству.",
            "Полуторачасовое творческое занятие для детей 5–10 лет. На каждом занятии — новая тема: " +
                "рисование, аппликация, лепка, роспись по дереву или работа с природными материалами. " +
                "Все материалы предоставляются мастерской бесплатно.\n\n" +
                "Группа маленькая — до 15 детей, чтобы каждому уделить внимание. Родители могут " +
                "остаться рядом и помочь, либо подождать в соседнем кафе. По итогам занятия каждый " +
                "ребёнок забирает свою работу.\n\n" +
                "Регистрация обязательна: места разбираются за 2–3 дня. Если вы зарегистрировались, " +
                "но не сможете прийти — обязательно отмените, чтобы место досталось ребёнку из листа " +
                "ожидания.",
            "5+",
            List.of("Мастер-класс"),
            List.of(EV_FREE_KIDS_1, EV_FREE_KIDS_2),
            List.of(
                new SessionSeedSpec(
                    "Детская мастерская",
                    now.plusDays(8).withHour(11).withMinute(0).withSecond(0).withNano(0),
                    now.plusDays(8).withHour(12).withMinute(30).withSecond(0).withNano(0),
                    null,
                    "Московская область, Коломна, улица Зайцева, 14",
                    15,
                    BigDecimal.ZERO
                )
            ),
            List.of("Павел Громов")
        ));

        // 15. Дворовая керамическая лаборатория — бесплатная лепка и демонстрации.
        result.add(new EventSeedSpec(
            "Дворовая керамическая лаборатория",
            "Бесплатные занятия по ручной лепке и знакомство с керамическим ремеслом.",
            "Керамическая студия «Посад» открывает двор мастерской для бесплатной лаборатории: " +
                "короткие демонстрации, ручная лепка небольших предметов, разговор о коломенских " +
                "ремёслах и аккуратная работа с глиной для новичков.\n\n" +
                "У события два сеанса. Утром проходит семейная группа: дети и взрослые делают простые " +
                "формы, которые можно забрать после сушки. Вечером — спокойная взрослая группа с " +
                "демонстрацией круга и разбором фактур. Билеты бесплатные, но разделены по ролям: " +
                "рабочие места с материалами, наблюдатели и семейные места.\n\n" +
                "Глина, инструменты и фартуки выдаются на месте. Готовые работы забираются через неделю " +
                "после сушки и обжига, о времени выдачи организаторы сообщат отдельно.",
            "6+",
            List.of("Мастер-класс", "Фестиваль"),
            List.of(EV_POTTERY_LAB_1, EV_POTTERY_LAB_2),
            List.of(
                new SessionSeedSpec(
                    "Семейная лепка",
                    now.plusDays(17).withHour(11).withMinute(0).withSecond(0).withNano(0),
                    now.plusDays(17).withHour(13).withMinute(0).withSecond(0).withNano(0),
                    null,
                    "Московская область, Коломна, улица Зайцева, 14",
                    45,
                    BigDecimal.ZERO,
                    List.of(
                        new TicketSeedSpec("Семейное место", BigDecimal.ZERO, 20),
                        new TicketSeedSpec("Рабочее место ребёнка", BigDecimal.ZERO, 25)
                    )
                ),
                new SessionSeedSpec(
                    "Вечерняя группа для взрослых",
                    now.plusDays(17).withHour(18).withMinute(0).withSecond(0).withNano(0),
                    now.plusDays(17).withHour(20).withMinute(0).withSecond(0).withNano(0),
                    null,
                    "Московская область, Коломна, улица Зайцева, 14",
                    50,
                    BigDecimal.ZERO,
                    List.of(
                        new TicketSeedSpec("Рабочее место за столом", BigDecimal.ZERO, 30),
                        new TicketSeedSpec("Наблюдатель демонстрации", BigDecimal.ZERO, 20)
                    )
                )
            ),
            List.of("Керамическая студия «Посад»")
        ));

        // 16. Обмен растениями у Пятницких ворот — черенки, лекция и детская посадка.
        result.add(new EventSeedSpec(
            "Обмен растениями у Пятницких ворот",
            "Бесплатный обмен черенками, лекция о городском саде и детская посадка.",
            "Садовый клуб «Коломенские ростки» проводит открытый обмен растениями у исторического " +
                "центра. Можно принести укоренённые черенки, лишние комнатные растения, семена или " +
                "просто прийти за советом и забрать растение из общей полки.\n\n" +
                "В программе три бесплатных сеанса: дневной обмен, короткая лекция о неприхотливых " +
                "растениях для двора и детская посадка в маленькие горшки. Разные билеты помогают " +
                "понять, сколько людей принесут растения, сколько придут только выбрать и сколько " +
                "детей нужно обеспечить грунтом и горшками.\n\n" +
                "Просьба подписывать растения: название, условия ухода, нужно ли много света. Если " +
                "не знаете сорт — волонтёры помогут определить хотя бы базовый тип.",
            "0+",
            List.of("Фестиваль", "Лекция", "Мастер-класс"),
            List.of(EV_PLANT_EXCHANGE_1, EV_PLANT_EXCHANGE_2),
            List.of(
                new SessionSeedSpec(
                    "Свободный обмен растениями",
                    now.plusDays(19).withHour(12).withMinute(0).withSecond(0).withNano(0),
                    now.plusDays(19).withHour(15).withMinute(0).withSecond(0).withNano(0),
                    null,
                    "Московская область, Коломна, улица Лажечникова, 5",
                    160,
                    BigDecimal.ZERO,
                    List.of(
                        new TicketSeedSpec("Принесу растение", BigDecimal.ZERO, 70),
                        new TicketSeedSpec("Приду выбрать", BigDecimal.ZERO, 90)
                    )
                ),
                new SessionSeedSpec(
                    "Лекция о городском саде",
                    now.plusDays(19).withHour(15).withMinute(30).withSecond(0).withNano(0),
                    now.plusDays(19).withHour(16).withMinute(30).withSecond(0).withNano(0),
                    null,
                    "Московская область, Коломна, улица Лажечникова, 5",
                    70,
                    BigDecimal.ZERO,
                    List.of(
                        new TicketSeedSpec("Место на лекции", BigDecimal.ZERO, 60),
                        new TicketSeedSpec("Стоячий слушатель", BigDecimal.ZERO, 10)
                    )
                ),
                new SessionSeedSpec(
                    "Детская посадка",
                    now.plusDays(19).withHour(17).withMinute(0).withSecond(0).withNano(0),
                    now.plusDays(19).withHour(18).withMinute(0).withSecond(0).withNano(0),
                    null,
                    "Московская область, Коломна, улица Лажечникова, 5",
                    35,
                    BigDecimal.ZERO,
                    List.of(
                        new TicketSeedSpec("Детское место с материалами", BigDecimal.ZERO, 25),
                        new TicketSeedSpec("Родитель-сопровождающий", BigDecimal.ZERO, 10)
                    )
                )
            ),
            List.of("Садовый клуб «Коломенские ростки»")
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
                List.of(PUB_JAZZ_1)
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
                List.of(PUB_FAMILY_1)
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

        result.put("Дворовая керамическая лаборатория", List.of(
            new PublicationSeedSpec(
                "Как устроена бесплатная керамическая лаборатория: группы, материалы и выдача работ",
                "Керамическая лаборатория во дворе студии «Посад» — это не лекция про ремесло со стороны, " +
                    "а практический день, где можно попробовать глину руками и понять, как рождается " +
                    "простая керамическая форма. Участие бесплатное, но билеты разделены по типам, чтобы " +
                    "команда заранее подготовила нужное количество рабочих мест, фартуков и глины.\n\n" +
                    "Утренний сеанс «Семейная лепка» рассчитан на детей от 6 лет и взрослых. Семейное место " +
                    "подходит для взрослого и ребёнка, которые делают одну общую работу. Отдельное рабочее " +
                    "место ребёнка — для тех, кто хочет полностью самостоятельную работу с материалами. " +
                    "Ведущие предлагают простые формы: маленькая миска, фигурная плитка, подвеска или " +
                    "декоративный домик.\n\n" +
                    "Вечерняя группа для взрослых спокойнее и подробнее. Участники с рабочим местом делают " +
                    "свою форму за столом, а наблюдатели смотрят демонстрацию круга, задают вопросы и могут " +
                    "попробовать отдельные фактуры на общей пробной доске. Этот формат удобен, если хочется " +
                    "познакомиться с ремеслом, но не пачкать руки или не забирать готовую работу.\n\n" +
                    "Что будет с работами. После занятия изделия остаются в студии на сушку и обжиг. Через " +
                    "неделю организаторы пришлют уведомление, когда их можно забрать. Если работа треснет " +
                    "при сушке, студия сохранит фрагмент и предложит бесплатное место на следующей лаборатории: " +
                    "глина живая, и это тоже часть процесса.\n\n" +
                    "Что взять. Одежду, которую не страшно испачкать, короткие ногти или перчатки по желанию, " +
                    "и пакет для личных вещей. Все инструменты, фартуки, глина и вода есть на месте. " +
                    "Фотографировать можно, но без вспышки рядом с рабочими столами.",
                List.of(EV_POTTERY_LAB_1, EV_POTTERY_LAB_2)
            )
        ));

        result.put("Обмен растениями у Пятницких ворот", List.of(
            new PublicationSeedSpec(
                "Что принести на обмен растениями и как выбрать здоровый черенок",
                "Обмен растениями у Пятницких ворот — это бесплатная соседская встреча для тех, кто " +
                    "любит зелень дома, во дворе или на балконе. Можно принести лишние черенки, семена, " +
                    "маленькие горшки, грунт или просто прийти за советом. Даже если у вас пока нет " +
                    "растений, событие подходит для первого шага: волонтёры помогут выбрать неприхотливый " +
                    "вариант и объяснят базовый уход.\n\n" +
                    "Как подготовить растение. За день до обмена полейте его, но не заливайте. Если несёте " +
                    "черенок, поставьте его в небольшой стакан с водой или заверните корни во влажную салфетку. " +
                    "На карточке подпишите название, условия света, частоту полива и любые особенности: " +
                    "например, «не любит прямое солнце» или «быстро растёт, нужна опора».\n\n" +
                    "Билет «Принесу растение» нужен тем, кто приносит материал для общей полки. Билет " +
                    "«Приду выбрать» — для тех, кто хочет забрать растение или просто посмотреть. На лекцию " +
                    "и детскую посадку отдельные бесплатные билеты: там ограничены места, стулья и материалы. " +
                    "Родитель-сопровождающий не получает отдельный горшок, но может помогать ребёнку.\n\n" +
                    "На лекции садовый клуб расскажет о растениях, которые хорошо переживают городские " +
                    "условия: хлорофитум, традесканция, сансевиерия, мята, бархатцы и настурция для дворовых " +
                    "контейнеров. Отдельный блок — как договориться с соседями о поливе и не превратить " +
                    "общую клумбу в спор за ответственность.\n\n" +
                    "Детская посадка проходит в 17:00. Дети сажают маленькое растение в горшок, подписывают " +
                    "табличку и получают карточку ухода. Грунт, горшки и перчатки выдаются на месте. " +
                    "Если ребёнок маленький, приходите с билетом сопровождающего: места рядом ограничены, " +
                    "и так организаторам проще подготовить пространство.",
                List.of(EV_PLANT_EXCHANGE_1, EV_PLANT_EXCHANGE_2)
            )
        ));

        return result;
    }
}
