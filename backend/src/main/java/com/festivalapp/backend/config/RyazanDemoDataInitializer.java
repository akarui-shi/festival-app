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
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Инициализатор демо-данных для Рязани.
 *
 * <p>На старте создаёт (если их ещё нет):
 * <ul>
 *   <li>город Рязань;</li>
 *   <li>демо-организатора {@code organizer.ryazan@festival.local};</li>
 *   <li>организацию «Рязанская культурная лаборатория» с логотипом из реального фото;</li>
 *   <li>несколько артистов (вокалистка, лектор-историк, продюсер, куратор и др.);</li>
 *   <li>7 событий на разных площадках Рязани (адрес — manualAddress, т. к. рязанские venues
 *       не сидаются в V2);</li>
 *   <li>7 публикаций (по одной на событие) с очень подробным {@code content}.</li>
 * </ul>
 *
 * <p>Картинки берутся из {@code resources/images/<категория>/<файл>.jpg} и не пересекаются
 * с теми, что использует {@link KolomnaDemoDataInitializer}.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class RyazanDemoDataInitializer implements ApplicationRunner {

    private static final String CITY_NAME = "Рязань";
    private static final String CITY_REGION = "Рязанская область";
    private static final String DEMO_KEY = "ryazan";

    // --- Картинки. Каждая — ровно одна сущность Рязани (см. javadoc). ---

    // Логотип организации
    private static final String LOGO_IMAGE = "images/art gallery/zalfa-imani-1xp5VxvyKL0-unsplash.jpg";

    // События
    private static final String EV_NIGHT_1 = "images/live music/pexels-brett-sayles-1434625.jpg";
    private static final String EV_NIGHT_2 = "images/live music/pexels-donnie-chan-2879509-4409009.jpg";

    private static final String EV_LECT_1 = "images/lecture/alizea-sidorov-2vLe7yNQ-RA-unsplash.jpg";
    private static final String EV_LECT_2 = "images/lecture/jeremy-mcgilvrey-CnAgA4rmGUQ-unsplash.jpg";

    private static final String EV_FAMILY_1 = "images/open air/aranxa-esteve-pOXHU0UEDcg-unsplash.jpg";
    private static final String EV_FAMILY_2 = "images/open air/colin-lloyd-eiQqGBAMgIE-unsplash.jpg";
    private static final String EV_FAMILY_3 = "images/open air/david-dvoracek-3kBIZZluhNc-unsplash.jpg";

    private static final String EV_LYBED_1 = "images/open air/joey-thompson-4zN_-PKsbWw-unsplash.jpg";
    private static final String EV_LYBED_2 = "images/open air/john-moeses-bauan-oOOlaMzjvY0-unsplash.jpg";
    private static final String EV_LYBED_3 = "images/open air/sebastian-mark-9xsXiWvjnLQ-unsplash.jpg";

    private static final String EV_DRAMA_1 = "images/theatre stage/pexels-468684-ink-1117962645-20898292.jpg";
    private static final String EV_DRAMA_2 = "images/theatre stage/pexels-bence-szemerey-337043-7513421.jpg";

    private static final String EV_URBAN_1 = "images/workshop/ksenia-berzoj-HKl3Ox28Bo0-unsplash.jpg";
    private static final String EV_URBAN_2 = "images/workshop/alina-chernovolova-Q1AUTlf1D60-unsplash.jpg";

    private static final String EV_ELECTRO_1 = "images/music stage/photo.jpg";

    // Публикации
    private static final String PUB_NIGHT_1 = "images/live music/pexels-andrea-roman-291935393-13388890.jpg";
    private static final String PUB_NIGHT_2 = "images/music stage/magnus-lunay-LHR6tUw8N34-unsplash.jpg";
    private static final String PUB_LECT = "images/art gallery/praewthida-k-vJejbjXEOxU-unsplash.jpg";
    private static final String PUB_FAMILY_1 = "images/open air/tony-pham-FUmDe-Bx1LA-unsplash.jpg";
    private static final String PUB_FAMILY_2 = "images/art/mandell-smock--dQ1n2q5JFg-unsplash.jpg";
    private static final String PUB_LYBED = "images/theatre stage/pexels-eloimotte-26285734.jpg";
    private static final String PUB_DRAMA = "images/music stage/noah-carter-_TJ22WxXJ8U-unsplash.jpg";
    private static final String PUB_URBAN = "images/music stage/rahul-kukreja-_5MoVxUZxEw-unsplash.jpg";
    private static final String PUB_ELECTRO = "images/music stage/ivaldo-hadi-4AUzJ6hbPJU-unsplash.jpg";

    // --- Россия-специфичные картинки (Wikimedia Commons, скачаны автоматически). ---
    // Используются в новых рязанских событиях: экскурсия по Кремлю, городская ярмарка, архитектурные прогулки.
    private static final String EV_KREMLIN_RZ_1 = "images/ryazan-views/ryazan-01.jpg";
    private static final String EV_KREMLIN_RZ_2 = "images/ryazan-views/ryazan-02.jpg";
    private static final String EV_KREMLIN_RZ_3 = "images/russian-architecture/architecture-04.jpg";

    private static final String EV_YARMARKA_1 = "images/ryazan-views/ryazan-03.jpg";
    private static final String EV_YARMARKA_2 = "images/russian-festival/festival-04.jpg";
    private static final String EV_YARMARKA_3 = "images/russian-festival/festival-05.jpg";

    private static final String EV_ARCH_WALK_1 = "images/ryazan-views/ryazan-04.jpg";
    private static final String EV_ARCH_WALK_2 = "images/ryazan-views/ryazan-05.jpg";
    private static final String EV_ARCH_WALK_3 = "images/russian-architecture/architecture-05.jpg";

    private static final String PUB_KREMLIN_RZ_1 = "images/ryazan-views/ryazan-06.jpg";
    private static final String PUB_KREMLIN_RZ_2 = "images/russian-architecture/architecture-06.jpg";
    private static final String PUB_YARMARKA = "images/russian-festival/festival-06.jpg";

    // --- Картинки для бесплатных событий Рязани (по 2 на каждое из 4 событий). ---
    private static final String EV_FREE_WALK_RZ_1 = "images/free-walks/walks-03.jpg";
    private static final String EV_FREE_WALK_RZ_2 = "images/free-walks/walks-04.jpg";
    private static final String EV_FREE_MUSEUM_RZ_1 = "images/free-museum/museum-03.jpg";
    private static final String EV_FREE_MUSEUM_RZ_2 = "images/free-museum/museum-04.jpg";
    private static final String EV_FREE_PARK_RZ_1 = "images/free-park/park-03.jpg";
    private static final String EV_FREE_PARK_RZ_2 = "images/free-park/park-04.jpg";
    private static final String EV_FREE_CINEMA_RZ_1 = "images/free-park/ryazan-open-air-cinema.jpg";
    private static final String EV_FREE_KIDS_RZ_1 = "images/free-children/ryazan-kids-artwork.jpg";
    private static final String EV_FREE_KIDS_RZ_2 = "images/free-children/raspopova-marina-JrtYJoAIN6A-unsplash.jpg";

    private final CityRepository cityRepository;
    private final UserRepository userRepository;
    private final OrganizationRepository organizationRepository;
    private final SessionRepository sessionRepository;
    private final PasswordEncoder passwordEncoder;
    private final DemoDataSupport support;

    @Value("${app.demo.ryazan-seed-enabled:true}")
    private boolean enabled;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (!enabled) {
            log.info("Ryazan demo seeding is disabled");
            return;
        }
        OffsetDateTime now = OffsetDateTime.now();

        // Базовые сущности города.
        City ryazan = ensureCity(now);
        Role organizerRole = support.ensureRole(RoleName.ROLE_ORGANIZER, "Организатор мероприятий");
        Role residentRole = support.ensureRole(RoleName.ROLE_RESIDENT, "Обычный житель");

        User organizer = ensureOrganizerUser(ryazan, now);
        support.ensureUserRole(organizer, organizerRole, now);
        support.ensureUserRole(organizer, residentRole, now);

        Organization organization = ensureOrganization(ryazan, now);
        support.ensureOrganizationMember(organizer, organization, "владелец", now);

        // Логотип/обложка организации.
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

        Map<String, Category> categories = support.ensureBaseCategories();
        Map<String, Participant> participants = support.ensureParticipants(buildParticipants(), now);

        List<EventSeedSpec> eventSpecs = buildEventSpecs(now);
        Map<String, List<PublicationSeedSpec>> publicationsByEventTitle = buildPublicationSpecsByEventTitle();

        for (EventSeedSpec spec : eventSpecs) {
            EventHolder holder = support.ensureEventBase(spec, organization, organizer, ryazan, now);
            Event event = holder.event();

            support.ensureEventCategories(event, spec.categoryNames(), categories);
            support.ensureEventImages(event, spec.classpathImagePaths(), organizer, now, DEMO_KEY);

            if (holder.created() || sessionRepository.findAllByEventIdOrderByStartsAtAsc(event.getId()).isEmpty()) {
                support.createSessionsAndTickets(event, spec, ryazan);
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

        // Дозаполняем координаты у сессий, которые были созданы до того, как
        // в V8 миграции появились venues Рязани (без этого карта не показывала
        // рязанские мероприятия — у session.latitude/longitude были NULL).
        support.patchMissingSessionCoordinates();

        log.info("Ryazan demo data has been seeded/verified: {} events", eventSpecs.size());
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

    private Organization ensureOrganization(City city, OffsetDateTime now) {
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

    // ===== Артисты, специфичные для Рязани =====

    private List<ParticipantSeed> buildParticipants() {
        return List.of(
            new ParticipantSeed("Дарья Белова", "Daria Belova", "Вокалистка с инди-поп программой и камерным составом.", "Инди", "исполнитель"),
            new ParticipantSeed("Антон Сухов", "Антон Сухов", "Городской историк и лектор о культурном наследии Рязани.", "Лектор", "лектор"),
            new ParticipantSeed("Никита Власов", "NVLS", "Электронный продюсер и лайв-исполнитель с атмосферными сетами.", "Электроника", "исполнитель"),
            new ParticipantSeed("Елена Гурьева", "Елена Гурьева", "Куратор семейных мастер-классов и интерактивных программ.", "Образование", "исполнитель"),
            new ParticipantSeed("Сергей Титов", "Sergey Titov Quartet", "Саксофонист и руководитель городского джаз-квартета.", "Джаз", "исполнитель"),
            new ParticipantSeed("Мария Ефимова", "Мария Ефимова", "Уличный художник, ведёт мастер-классы по урбан-арту и каллиграфии.", "Изобразительное искусство", "исполнитель"),
            new ParticipantSeed("Театр «Молодёжная сцена»", "Молодёжная сцена", "Рязанская театральная студия, ставит современные пьесы.", "Театр", "ансамбль"),
            new ParticipantSeed("Игорь Демьянов", "DJ Demyanov", "Резидент рязанских клубов, работает с house и techno.", "Электроника", "исполнитель"),
            new ParticipantSeed("Татьяна Лазарева", "Татьяна Лазарева", "Аккредитованный экскурсовод по Рязанскому кремлю и историческому центру.", "Экскурсия", "экскурсовод"),
            new ParticipantSeed("Архитектурное бюро «Старый план»", "Старый план", "Команда историков архитектуры, проводит пешие прогулки по дореволюционной Рязани.", "Лектор", "лектор")
        );
    }

    // ===== События =====

    private List<EventSeedSpec> buildEventSpecs(OffsetDateTime now) {
        List<EventSeedSpec> result = new ArrayList<>();

        // 1. Ночь музыки на Почтовой — масштабный городской концерт.
        // Картинки: 3 из live music.
        result.add(new EventSeedSpec(
            "Ночь музыки на Почтовой",
            "Современный городской концерт в самом сердце пешеходной Рязани.",
            "Главное музыкальное событие весны на Почтовой улице — пешеходной артерии центра. Программа " +
                "построена как непрерывный четырёхчасовой блок: каждые 40–50 минут на сцене появляется " +
                "новый артист, между сетами — короткие визуальные включения от рязанских видеохудожников.\n\n" +
                "Открывает вечер вокалистка Дарья Белова с инди-поп программой и живым составом — клавиши, " +
                "контрабас, ударные. Затем — лайв электронного продюсера Никиты Власова (NVLS): атмосферные " +
                "пады, ломаные ритмы, аналоговые синтезаторы. Финал — джазовый квартет Сергея Титова, " +
                "который завершит вечер плотным саксофоновым сетом.\n\n" +
                "Площадка вмещает до 420 человек. Звук — линейные массивы по обе стороны сцены, специально " +
                "настроенные для уличного формата. Световое оборудование на временных фермах, к концу вечера " +
                "включается полная программа.",
            "12+",
            List.of("Концерт", "Фестиваль"),
            List.of(EV_NIGHT_1, EV_NIGHT_2),
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

        // 2. Лекторий: Истории старой Рязани.
        // Картинки: 2 из lecture.
        result.add(new EventSeedSpec(
            "Лекторий: Истории старой Рязани",
            "Публичная лекция о ключевых страницах истории города.",
            "Антон Сухов — городской историк и автор экскурсий по старой Рязани — прочтёт открытую лекцию " +
                "о трёх эпохах города: домонгольской Рязани, губернском периоде XIX века и советской " +
                "застройке. На примерах конкретных зданий разберём, как менялся облик города и что " +
                "сохранилось до наших дней.\n\n" +
                "Лекция сопровождается архивными фото, картами и редкими снимками из частных коллекций. " +
                "Подойдёт и старшеклассникам, которые готовятся к экзамену по истории, и взрослым, которым " +
                "интересна городская среда. В конце — открытая сессия вопросов на 30 минут.\n\n" +
                "Площадка — Соборная площадь, 13. Зал на 180 мест, удобный подъезд на общественном транспорте, " +
                "парковка ограничена.",
            "6+",
            List.of("Лекция"),
            List.of(EV_LECT_1, EV_LECT_2),
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

        // 4. Опен-эйр на Лыбедском бульваре.
        // Картинки: 3 из open air.
        result.add(new EventSeedSpec(
            "Опен-эйр на Лыбедском бульваре",
            "Городской опен-эйр с двумя сценами: лайв и диджей-сеты на главном бульваре города.",
            "Лыбедский бульвар на один вечер становится многосценной площадкой. Главная сцена — лайв-программа " +
                "Дарьи Беловой и приглашённых гостей; вторая сцена — диджей-сеты резидентов рязанских клубов, " +
                "включая Игоря Демьянова с его фирменной хаус-программой.\n\n" +
                "Между сценами — фуд-зона с локальными производителями, маркет дизайнерских товаров и зона " +
                "тихого отдыха для тех, кто хочет передохнуть от музыки. Программа идёт с 17:00 до 23:00, " +
                "так что можно подключиться в любое время.\n\n" +
                "Вход свободный, без регистрации. Ограничение 18+ действует только в баре, на остальных зонах " +
                "возрастных ограничений нет, рекомендация — 12+. На бульваре будут стационарные туалеты, " +
                "пеленальная зона и точки питьевой воды.",
            "12+",
            List.of("Концерт", "Фестиваль"),
            List.of(EV_LYBED_1, EV_LYBED_2, EV_LYBED_3),
            List.of(
                new SessionSeedSpec(
                    "Опен-эйр",
                    now.plusDays(18).withHour(17).withMinute(0).withSecond(0).withNano(0),
                    now.plusDays(18).withHour(23).withMinute(0).withSecond(0).withNano(0),
                    null,
                    "Рязанская область, Рязань, Лыбедский бульвар, 5",
                    600,
                    BigDecimal.ZERO
                )
            ),
            List.of("Дарья Белова", "Игорь Демьянов")
        ));

        // 5. Драматическая сцена у Театральной — премьера молодёжного театра.
        // Картинки: 2 из theatre stage.
        result.add(new EventSeedSpec(
            "Драматическая сцена: премьера «Молодёжной сцены»",
            "Премьера современной пьесы в исполнении рязанской театральной студии.",
            "Театр «Молодёжная сцена» представляет премьеру спектакля по современной российской пьесе. " +
                "Это камерная постановка на час сорок без антракта — история взросления и сложного выбора, " +
                "сделанная минималистичными средствами: пять актёров, одна декорация, выразительная работа " +
                "со светом и звуком.\n\n" +
                "Спектакль уже год обкатывается в студии — это первая большая публичная премьера. После показа " +
                "запланировано 30-минутное обсуждение с режиссёром и актёрами: можно задать любой вопрос, " +
                "поделиться впечатлениями, обсудить трактовку.\n\n" +
                "Возрастной ценз — 16+. Постановка касается тем, требующих эмоциональной готовности: " +
                "семейный конфликт, выбор профессии, отношения. Если у вас сложный период — учтите это, " +
                "выбирая спектакль.",
            "16+",
            List.of("Концерт"),
            List.of(EV_DRAMA_1, EV_DRAMA_2),
            List.of(
                new SessionSeedSpec(
                    "Премьера",
                    now.plusDays(17).withHour(19).withMinute(0).withSecond(0).withNano(0),
                    now.plusDays(17).withHour(20).withMinute(40).withSecond(0).withNano(0),
                    null,
                    "Рязанская область, Рязань, Театральная площадь, 7А",
                    160,
                    new BigDecimal("850.00")
                )
            ),
            List.of("Театр «Молодёжная сцена»")
        ));

        // 6. Мастер-класс по урбан-арту.
        // Картинки: 2 из workshop.
        result.add(new EventSeedSpec(
            "Мастер-класс по урбан-арту",
            "Практическое занятие по уличному искусству для подростков и взрослых.",
            "Уличный художник Мария Ефимова проведёт практический мастер-класс по городскому искусству: " +
                "от базовых техник до собственного небольшого проекта. За три часа вы успеете попробовать " +
                "три формата: трафарет, скетч-стена и каллиграфический теггинг.\n\n" +
                "Все материалы (баллончики, маркеры, бумага, картон) — на месте. С собой — удобная одежда, " +
                "которую не жалко, и закрытая обувь. Мастер-класс проходит в крытом пространстве на территории " +
                "арт-кластера, поэтому погода не важна.\n\n" +
                "Возрастной ценз — 14+. Группа маленькая (15 человек), регистрация обязательна. По итогам " +
                "вы заберёте свои работы и получите чек-лист с базовыми приёмами для самостоятельной " +
                "практики.",
            "14+",
            List.of("Мастер-класс"),
            List.of(EV_URBAN_1, EV_URBAN_2),
            List.of(
                new SessionSeedSpec(
                    "Группа выходного дня",
                    now.plusDays(19).withHour(13).withMinute(0).withSecond(0).withNano(0),
                    now.plusDays(19).withHour(16).withMinute(0).withSecond(0).withNano(0),
                    null,
                    "Рязанская область, Рязань, Первомайский проспект, 64",
                    15,
                    new BigDecimal("1800.00")
                )
            ),
            List.of("Мария Ефимова")
        ));

        // 7. Электронный лайв на крыше — клубный формат.
        // Картинки: 1 из music stage.
        result.add(new EventSeedSpec(
            "Электронный лайв на крыше",
            "Атмосферный электронный сет на открытой крыше с панорамой города.",
            "Лайв-сет Никиты Власова и приглашённых гостей на крыше культурного центра. Камерный формат " +
                "(до 120 человек) с панорамным видом на закат над городом — без больших сцен и громкого PA, " +
                "ставка на качественный звук в небольшой ёмкости пространства.\n\n" +
                "Программа разделена на две части: первый блок — атмосферный, дроновые подложки и " +
                "медленные ритмы под закат; второй — более ритмичный, с танцевальной электроникой " +
                "до 23:00. Есть бар, но без громкой кухни — лёгкие закуски, кофе, безалкогольные коктейли.\n\n" +
                "На крыше прохладнее, чем кажется снизу: возьмите кардиган. Дресс-код — комфортный, без " +
                "формальных требований. Доступ только по электронному билету; вход с 18:30, начало " +
                "программы — 19:30.",
            "18+",
            List.of("Концерт"),
            List.of(EV_ELECTRO_1),
            List.of(
                new SessionSeedSpec(
                    "Лайв-сет",
                    now.plusDays(22).withHour(19).withMinute(30).withSecond(0).withNano(0),
                    now.plusDays(22).withHour(23).withMinute(0).withSecond(0).withNano(0),
                    null,
                    "Рязанская область, Рязань, улица Почтовая, 60",
                    120,
                    new BigDecimal("1500.00")
                )
            ),
            List.of("Никита Власов", "Игорь Демьянов")
        ));

        // 8. Экскурсия по Рязанскому кремлю — обзорная пешая экскурсия.
        // Картинки: 2 реальных вида Рязани + 1 фото русской архитектуры.
        result.add(new EventSeedSpec(
            "Экскурсия по Рязанскому кремлю",
            "Двухчасовая обзорная экскурсия по архитектурному ансамблю Рязанского кремля.",
            "Татьяна Лазарева — аккредитованный экскурсовод с десятилетним опытом — проведёт обзорную " +
                "экскурсию по Рязанскому кремлю. Маршрут включает Соборную колокольню, Успенский собор, " +
                "Архангельский собор, гражданские постройки XVII века и валы древней крепости.\n\n" +
                "В программе — рассказ о становлении Рязани как губернского центра, история переноса " +
                "епархии из старой Рязани, особенности архитектурных стилей XVII–XIX веков. Отдельный блок — " +
                "Соборная колокольня высотой 83 метра, одна из самых высоких в России. На колокольню в этой " +
                "экскурсии не поднимаемся (это отдельный билет), но из исторических фактов узнаете о ней " +
                "достаточно.\n\n" +
                "Группа — до 25 человек. Экскурсия идёт пешком, по ровной территории кремля, подойдёт " +
                "участникам любой подготовки. В дождь не отменяется — берите зонт.",
            "8+",
            List.of("Лекция", "Фестиваль"),
            List.of(EV_KREMLIN_RZ_1, EV_KREMLIN_RZ_2, EV_KREMLIN_RZ_3),
            List.of(
                new SessionSeedSpec(
                    "Обзорная экскурсия",
                    now.plusDays(13).withHour(11).withMinute(0).withSecond(0).withNano(0),
                    now.plusDays(13).withHour(13).withMinute(0).withSecond(0).withNano(0),
                    null,
                    "Рязанская область, Рязань, Кремлевский вал, 10",
                    25,
                    new BigDecimal("550.00")
                )
            ),
            List.of("Татьяна Лазарева")
        ));

        // 9. Городская ярмарка на Соборной — ярмарка локальных производителей.
        // Картинки: 1 вид Рязани + 2 фото российских праздников.
        result.add(new EventSeedSpec(
            "Городская ярмарка на Соборной",
            "Ярмарка местных производителей и фольклорная программа на Соборной площади.",
            "Большая городская ярмарка локальных производителей: рязанские фермерские хозяйства, " +
                "мастера-ремесленники, малые производства. На площади более пятидесяти точек: молочка " +
                "из Шиловского района, мёд, пастила, домашние сыры, керамика, текстиль ручной работы, " +
                "украшения, парфюмерия рязанских мастеров.\n\n" +
                "Параллельно — фольклорная сцена: выступления городских ансамблей русской народной песни, " +
                "частушки, кадрильный блок, в финале — общий хоровод. Между основными выступлениями " +
                "проходят короткие мастер-классы для детей: лепка из глины, простая роспись, плетение " +
                "из лыка.\n\n" +
                "Ярмарка работает 11:00–19:00, вход свободный. Большинство производителей принимают карты " +
                "и переводы, но мелкие позиции удобнее наличными. Зона для отдыха с тентами и скамейками — " +
                "по периметру площади.",
            "0+",
            List.of("Фестиваль", "Мастер-класс"),
            List.of(EV_YARMARKA_1, EV_YARMARKA_2, EV_YARMARKA_3),
            List.of(
                new SessionSeedSpec(
                    "Дневная ярмарка",
                    now.plusDays(21).withHour(11).withMinute(0).withSecond(0).withNano(0),
                    now.plusDays(21).withHour(19).withMinute(0).withSecond(0).withNano(0),
                    null,
                    "Рязанская область, Рязань, Соборная площадь, 13",
                    1500,
                    BigDecimal.ZERO
                )
            ),
            List.of("Елена Гурьева")
        ));

        // 10. Архитектурные прогулки старой Рязани — пешая тематическая прогулка.
        // Картинки: 2 реальных вида Рязани + 1 фото русской архитектуры.
        result.add(new EventSeedSpec(
            "Архитектурные прогулки старой Рязани",
            "Двухчасовая прогулка с историком архитектуры по дореволюционным кварталам.",
            "Архитектурное бюро «Старый план» проводит тематическую пешую прогулку по дореволюционным " +
                "кварталам Рязани. Маршрут — около двух километров от Соборной площади до Лыбедского " +
                "бульвара через улицы Почтовую, Соборную и Свободы. Главный фокус — гражданская архитектура " +
                "XIX — начала XX века: купеческие особняки, доходные дома, торговые ряды.\n\n" +
                "Что увидите. Особняк купцов Морозовых, бывший Дом губернатора, торговые ряды на Соборной, " +
                "доходные дома эклектики и модерна на Почтовой, фрагменты исторической вымостки. По " +
                "пути ведущий обращает внимание на детали, которые обычно проходят мимо: типы декоративной " +
                "кладки, формы оконных переплётов, кованые элементы, литые номера домов.\n\n" +
                "Прогулка идёт два часа в комфортном темпе с двумя остановками. Раздаточный материал — " +
                "карта маршрута и краткий справочник по архитектурным стилям. Группа до 20 человек, " +
                "регистрация обязательна.",
            "12+",
            List.of("Лекция"),
            List.of(EV_ARCH_WALK_1, EV_ARCH_WALK_2, EV_ARCH_WALK_3),
            List.of(
                new SessionSeedSpec(
                    "Прогулка с историком",
                    now.plusDays(24).withHour(15).withMinute(0).withSecond(0).withNano(0),
                    now.plusDays(24).withHour(17).withMinute(0).withSecond(0).withNano(0),
                    null,
                    "Рязанская область, Рязань, Соборная площадь, 13",
                    20,
                    new BigDecimal("700.00")
                )
            ),
            List.of("Архитектурное бюро «Старый план»", "Антон Сухов")
        ));

        // ===== Бесплатные события (price = 0). Для них создаётся бесплатный входной билет. =====

        // 11. Бесплатная прогулка по историческому центру Рязани.
        result.add(new EventSeedSpec(
            "Бесплатная прогулка по историческому центру",
            "Часовая обзорная прогулка по пешеходным улицам центра города.",
            "Часовая бесплатная прогулка с городским гидом по пешеходным маршрутам исторического " +
                "центра. Маршрут идёт от Соборной площади через Почтовую улицу к Лыбедскому бульвару, " +
                "длина — около 2 км в комфортном темпе.\n\n" +
                "По пути гид расскажет о ключевых городских объектах, отметит детали гражданской " +
                "архитектуры XIX века, ответит на вопросы о городе. Прогулка подходит для жителей и " +
                "гостей города, для семей с детьми и для людей с любым уровнем подготовки.\n\n" +
                "Регистрация не нужна — приходите за 5 минут до начала к точке старта (восточная " +
                "сторона Соборной площади, у фонтана). В дождь прогулка не отменяется.",
            "0+",
            List.of("Лекция", "Фестиваль"),
            List.of(EV_FREE_WALK_RZ_1, EV_FREE_WALK_RZ_2),
            List.of(
                new SessionSeedSpec(
                    "Прогулка с гидом",
                    now.plusDays(7).withHour(11).withMinute(0).withSecond(0).withNano(0),
                    now.plusDays(7).withHour(12).withMinute(0).withSecond(0).withNano(0),
                    null,
                    "Рязанская область, Рязань, Соборная площадь, 13",
                    50,
                    BigDecimal.ZERO
                )
            ),
            List.of("Татьяна Лазарева", "Антон Сухов")
        ));

        // 12. Бесплатная выставка в галерее.
        result.add(new EventSeedSpec(
            "Открытая выставка: современное искусство Рязани",
            "Бесплатный показ работ местных художников в галерее исторического центра.",
            "Сезонная бесплатная выставка работ художников, фотографов и керамистов из Рязани и " +
                "Рязанской области. Около 40 работ в трёх залах, кураторская навигация, тексты " +
                "к каждому экспонату на стендах.\n\n" +
                "Самостоятельный осмотр занимает 40–60 минут. Дважды в день — короткая бесплатная " +
                "экскурсия с куратором (12:00 и 16:00, по 25 минут). Можно прийти в любое время " +
                "в часы работы и подключиться к экскурсии без регистрации.\n\n" +
                "Большие сумки и верхняя одежда — в гардероб. Фотосъёмка без вспышки разрешена. " +
                "В сувенирной лавке доступны открытки и небольшие репродукции по символическим ценам.",
            "12+",
            List.of("Лекция", "Фестиваль"),
            List.of(EV_FREE_MUSEUM_RZ_1, EV_FREE_MUSEUM_RZ_2),
            List.of(
                new SessionSeedSpec(
                    "Свободное посещение",
                    now.plusDays(10).withHour(11).withMinute(0).withSecond(0).withNano(0),
                    now.plusDays(10).withHour(19).withMinute(0).withSecond(0).withNano(0),
                    null,
                    "Рязанская область, Рязань, улица Почтовая, 60",
                    300,
                    BigDecimal.ZERO
                )
            ),
            List.of("Архитектурное бюро «Старый план»")
        ));

        // 14. Бесплатная детская творческая мастерская.
        result.add(new EventSeedSpec(
            "Детская мастерская: рисуем город",
            "Бесплатное творческое занятие для детей о любимых местах Рязани.",
            "Полуторачасовая бесплатная мастерская для детей 5–10 лет. Участники рисуют собственную " +
                "карту любимой Рязани: кремль, парк, дом, школу, двор, реку или любое место, которое " +
                "кажется важным. Ведущая помогает выбрать сюжет, подобрать цвета и собрать работу в " +
                "небольшой бумажный постер.\n\n" +
                "Все материалы выдаются на месте: бумага, краски, фломастеры, наклейки, трафареты и " +
                "защитные фартуки. Родители могут остаться рядом или подождать в зоне отдыха. В конце " +
                "каждый ребёнок забирает работу домой, а желающие могут оставить копию для мини-выставки " +
                "в холле площадки.\n\n" +
                "Участие бесплатное, но нужна регистрация из-за маленькой группы. Если место занято, " +
                "можно записаться в лист ожидания — организаторы часто открывают дополнительную группу.",
            "5+",
            List.of("Мастер-класс"),
            List.of(EV_FREE_KIDS_RZ_1, EV_FREE_KIDS_RZ_2),
            List.of(
                new SessionSeedSpec(
                    "Детская группа",
                    now.plusDays(9).withHour(12).withMinute(0).withSecond(0).withNano(0),
                    now.plusDays(9).withHour(13).withMinute(30).withSecond(0).withNano(0),
                    null,
                    "Рязанская область, Рязань, улица Почтовая, 60",
                    18,
                    BigDecimal.ZERO
                )
            ),
            List.of("Елена Гурьева")
        ));

        return result;
    }

    // ===== Публикации =====

    /**
     * Подробные пресс-материалы и гайды к каждому событию. Тексты длинные (≥1500 знаков),
     * с конкретными деталями: программа по часам, рекомендации по одежде/документам,
     * описание площадок, доступность.
     */
    private Map<String, List<PublicationSeedSpec>> buildPublicationSpecsByEventTitle() {
        Map<String, List<PublicationSeedSpec>> result = new LinkedHashMap<>();

        result.put("Ночь музыки на Почтовой", List.of(
            new PublicationSeedSpec(
                "Программа Ночи музыки: расписание сетов, артисты и навигация по площадке",
                "Ночь музыки на Почтовой — это четыре часа непрерывной живой программы и три полноценных " +
                    "артиста на одной сцене. В этой публикации собрали всё, что поможет вам спланировать вечер: " +
                    "точное расписание, навигацию по площадке, советы по одежде и ответы на самые частые вопросы.\n\n" +
                    "Расписание по сетам. 19:30 — открытие, короткое приветствие куратора и художественный " +
                    "видеоролик о Рязани. 19:45 — выход Дарьи Беловой с инди-поп программой, живой состав " +
                    "(вокал, клавиши, контрабас, ударные), длительность около 45 минут. 20:35 — пятнадцать минут " +
                    "технической паузы, можно отойти за напитками или к фуд-зоне. 20:50 — лайв Никиты Власова " +
                    "(NVLS): атмосферные синтезаторы, аналоговые драм-машины, около 50 минут. 21:45 — финальный " +
                    "сет квартета Сергея Титова: джазовая программа с акцентом на тенор-саксофон. 22:00 — " +
                    "финал, общий выход артистов, короткие слова благодарности команде.\n\n" +
                    "Площадка и навигация. Сцена расположена в северной части пешеходной Почтовой, ближе " +
                    "к перекрёстку с улицей Радищева. Зрительская зона — 420 человек, без фиксированных мест: " +
                    "удобнее всего занять место за 30–40 минут до начала. По периметру — фуд-точки рязанских " +
                    "производителей: кофе, лимонады, выпечка, безалкогольные коктейли. Бар с алкогольной " +
                    "продукцией работает в выделенной зоне (18+, документ обязателен).\n\n" +
                    "Что взять с собой. Электронный билет (QR-код в приложении или распечатанный), документ. " +
                    "Удобная обувь — стоять придётся четыре часа. На случай прохладной погоды: куртка или " +
                    "свитер. Зонт — да, в кейсе мелкого дождя программу не отменяем, есть тенты по периметру. " +
                    "Большие сумки и рюкзаки на входе досматриваются службой безопасности — лучше прийти " +
                    "налегке.\n\n" +
                    "Как добраться. От железнодорожного вокзала «Рязань-2» — 20 минут пешком или 8 минут " +
                    "на автобусе. От центра — 10 минут пешком от Соборной площади. Парковка платная и " +
                    "ограниченная: в радиусе 300 метров несколько небольших стоянок, заполняются быстро. " +
                    "Рекомендуем общественный транспорт или такси — в день мероприятия в районе будет много " +
                    "пешеходов.\n\n" +
                    "Что после. После 22:00 часть артистов остаётся на короткую афтепати в баре «Коридор» " +
                    "(улица Почтовая, 48) — это уже не часть мероприятия, отдельная программа клуба, но " +
                    "удобный способ продолжить вечер. Утром после концерта на этой же площадке — городской " +
                    "маркет местных производителей с 10:00, можно зайти, если вы остаётесь в городе.\n\n" +
                    "Ограничения и доступность. Возрастной ценз — 12+. Для людей с ограниченной мобильностью " +
                    "выделены отдельные места у входа в зрительскую зону: запрос на сопровождение можно " +
                    "оставить через форму обратной связи на странице события за 24 часа. Слабослышащим — " +
                    "программа без речевого сопровождения в основной части (только музыка), что упрощает " +
                    "восприятие.",
                List.of(PUB_NIGHT_1, PUB_NIGHT_2)
            )
        ));

        result.put("Опен-эйр на Лыбедском бульваре", List.of(
            new PublicationSeedSpec(
                "Расписание сцен опен-эйра: что играют, где встать и как не потеряться",
                "Опен-эйр на Лыбедском — это большой шестичасовой формат с двумя сценами, фуд-зоной и " +
                    "маркетом. Чтобы вы могли спланировать вечер и не пропустить любимых артистов, " +
                    "собрали в одной публикации полное расписание, схему площадки и практические советы.\n\n" +
                    "Главная сцена (северная часть бульвара). 17:00 — открытие, короткий сет приветственного " +
                    "DJ. 17:30 — лайв молодого рязанского коллектива (объявят в день мероприятия, мы " +
                    "стараемся поддерживать локальную сцену). 18:30 — Дарья Белова с расширенным составом " +
                    "и приглашёнными гостями (60-минутный сет с соло-номерами и совместными композициями). " +
                    "19:45 — гость из Москвы (сюрприз, объявление в день события). 21:00 — финальный сет " +
                    "приглашённого хедлайнера.\n\n" +
                    "Вторая сцена (южная часть, диджей-формат). 17:30 — открытие, тёплый melodic-house. " +
                    "18:30 — Игорь Демьянов с фирменным хаус-сетом, 90 минут. 20:00 — гостевая женщина-DJ " +
                    "из Петербурга. 21:30 — техно-блок до конца программы. Между сценами — 7 минут пешком " +
                    "по бульвару, можно перемещаться свободно.\n\n" +
                    "Фуд-зона. Расположена в центре бульвара, между сценами. Локальные производители: " +
                    "коломенские пастилы, рязанские медовые напитки, веганская и невеганская кухня, кофе " +
                    "третьей волны, безалкогольные коктейли. Бар с алкогольной продукцией — в отдельной " +
                    "огороженной зоне (18+, документ обязателен).\n\n" +
                    "Маркет. Около 30 рязанских и подмосковных дизайнеров: одежда, керамика, украшения, " +
                    "иллюстрации, парфюмерия. Маркет работает 17:00–21:00, после — закрывается, " +
                    "чтобы не отвлекать от музыки. Большинство продавцов принимают карты и переводы.\n\n" +
                    "Что взять. Удобная обувь — много движения. На случай прохладной погоды — кардиган " +
                    "или толстовка. Зонт — да, программа идёт в любую погоду кроме экстремальной. " +
                    "Маленький рюкзак удобнее, чем большая сумка (на входе рамки металлоискателя). " +
                    "Документ — обязательно, особенно для бара.\n\n" +
                    "Как добраться. Лыбедский бульвар — центр города, удобно с любой стороны. От " +
                    "Соборной площади — 7 минут пешком. От ж/д вокзала — 25 минут или короткая поездка " +
                    "на такси. Парковка платная, в радиусе 200 метров несколько небольших стоянок, " +
                    "к 17:00 заполняются. Рекомендуем общественный транспорт.\n\n" +
                    "С детьми. Программа рассчитана на 12+, но родители часто приходят с младшими детьми. " +
                    "Это ваше решение: на бульваре громко, до 22:00 точно не уснуть, но программа " +
                    "интересная и для семей. Шумозащитные наушники для детей — отличная идея. С коляской " +
                    "везде проедете, бульвар широкий.\n\n" +
                    "Безопасность. Служба охраны на обеих сценах и фуд-зоне; 4 точки оказания первой " +
                    "помощи; 6 точек питьевой воды. Если потерялись — общая точка встречи у скульптуры " +
                    "в центре бульвара (помечена красным флажком).",
                List.of(PUB_LYBED)
            )
        ));

        result.put("Драматическая сцена: премьера «Молодёжной сцены»", List.of(
            new PublicationSeedSpec(
                "Премьера «Молодёжной сцены»: интервью с режиссёром и контекст пьесы",
                "В преддверии премьеры мы поговорили с режиссёром «Молодёжной сцены» о том, почему именно " +
                    "эта пьеса, как готовилась постановка и кому будет интересно. Этот текст можно прочесть " +
                    "до спектакля — он добавит контекста и поможет глубже воспринять увиденное.\n\n" +
                    "Почему эта пьеса. «Это современная российская пьеса, написанная пять лет назад. Она про " +
                    "выбор — момент, когда ты понимаешь, что больше не можешь идти по сценарию, который " +
                    "тебе написала семья. Не про восстание подростка, а именно про взрослое решение, в любом " +
                    "возрасте. Мы обкатывали её в студии год, пробовали разные ходы — теперь готовы " +
                    "к большой публике.»\n\n" +
                    "Контекст. Пьеса написана драматургом из Екатеринбурга, входит в шорт-лист нескольких " +
                    "профессиональных премий. В России её ставили в трёх городах, у каждой постановки своё " +
                    "режиссёрское прочтение. «Молодёжная сцена» делает камерную, очень негромкую версию: " +
                    "ставка на актёрскую работу, минимум визуальных эффектов.\n\n" +
                    "Сценография. Одна декорация на весь спектакль — деревянный куб с полками. По мере " +
                    "действия из куба достаются предметы, потом убираются обратно. «Это метафора " +
                    "родительского дома: всё, что когда-то казалось важным, аккуратно сложено по полкам, " +
                    "и каждый предмет тянет за собой воспоминание. К финалу куб остаётся пустым.»\n\n" +
                    "Актёры. Пять человек, все из основного состава студии. У каждого за плечами 4–6 лет " +
                    "работы в театре, основная роль — у молодой актрисы, которая занимается с режиссёром " +
                    "уже шесть лет. «Главную роль строили вокруг неё — её темперамента, манеры речи, " +
                    "способности держать длинный молчаливый кадр. Получилось очень личное.»\n\n" +
                    "Звук и свет. Музыкальное решение — фортепианные эскизы рязанского композитора, " +
                    "написанные специально для этой постановки. Свет минималистичный: четыре источника, " +
                    "переходы плавные, без театральных вспышек. «Мы хотели, чтобы зритель забыл о технике " +
                    "и просто слушал актёров.»\n\n" +
                    "Что важно знать перед спектаклем. Длительность — час сорок без антракта. Возрастной " +
                    "ценз — 16+, отдельные сцены могут быть эмоционально сложными (семейный конфликт). " +
                    "Если у вас сейчас непростой период — учтите это, выбирая спектакль или дату. Зал " +
                    "камерный (160 мест), нет «плохих» рядов, видимость хорошая отовсюду.\n\n" +
                    "После показа — обсуждение. 30 минут, режиссёр и часть актёров остаются в зале, " +
                    "можно задать любой вопрос. Это не «нужно сидеть до конца» — кто хочет уйти, спокойно " +
                    "уходит после поклонов; кто хочет обсудить — остаётся. Часть зрителей задают вопросы, " +
                    "часть просто слушает и думает.\n\n" +
                    "Площадка — Театральная площадь, 7А. Зал на 160 мест, удобный подъезд общественным " +
                    "транспортом, парковка ограничена. Гардероб работает с 18:30, начало ровно в 19:00.",
                List.of(PUB_DRAMA)
            )
        ));

        result.put("Электронный лайв на крыше", List.of(
            new PublicationSeedSpec(
                "Лайв-сет на крыше: что взять с собой, как одеться и план вечера",
                "Закатный лайв на крыше — формат, который мы делаем редко: камерные 120 человек, панорама " +
                    "города, плавный переход от тёплого закатного звука к более ритмичной танцевальной " +
                    "программе. В этом материале — всё, что поможет вам провести вечер с максимальным " +
                    "комфортом.\n\n" +
                    "План вечера. 18:30 — открытие двери, можно подняться на крышу, занять место, " +
                    "познакомиться с пространством. На входе охрана сверяет билет с паспортом — возрастной " +
                    "ценз 18+ строгий, без документа не пустят. 19:00 — открытый бар начинает работу, " +
                    "медленный амбиентный фон от приглашённого DJ. 19:30 — основной лайв Никиты Власова: " +
                    "первый блок атмосферный, медленные ритмы, дроновые подложки — идеально под закат. " +
                    "21:00 — короткая пауза, артист переключает оборудование, бар работает активно. " +
                    "21:15 — второй блок более ритмичный, танцевальная электроника. 22:30 — гостевой DJ " +
                    "до 23:00. 23:00 — закрытие.\n\n" +
                    "Площадка. Крыша культурного центра на Почтовой, 60. Открытое пространство примерно " +
                    "300 квадратных метров, безопасное ограждение по периметру (соответствует всем нормам). " +
                    "Звук — небольшой, но очень качественный комплект: специально подобран под камерный " +
                    "формат, без перегруза. Свет — мягкий, без резких лазеров и стробоскопов: ставка " +
                    "на атмосферу, а не на клубный визуал.\n\n" +
                    "Бар и еда. Лёгкие закуски (брускетты, тапас, сырная тарелка), кофе третьей волны, " +
                    "коктейли — алкогольные и безалкогольные. Полноценной кухни нет; если планируете " +
                    "ужинать плотно — лучше до мероприятия. Мы рекомендуем кафе на той же Почтовой " +
                    "в радиусе 5 минут.\n\n" +
                    "Что надеть. На крыше прохладнее, чем кажется снизу: даже в тёплый день к 22:00 " +
                    "может быть +14°C. Возьмите кардиган, толстовку или лёгкую куртку. Дресс-код " +
                    "комфортный, без формальных требований — главное, чтобы вам было удобно три " +
                    "с половиной часа.\n\n" +
                    "Что взять с собой. Электронный билет (QR в приложении или распечатанный), документ " +
                    "(паспорт обязателен!), наличные/карту для бара (большинство платежей картой, но " +
                    "иногда удобнее наличные). Минимум вещей — на крыше нет гардероба для верхней одежды, " +
                    "хранить вещи неудобно.\n\n" +
                    "Как добраться. Почтовая, 60 — центр города. От Соборной площади — 8 минут пешком. " +
                    "От ж/д вокзала — 22 минуты пешком или 7 минут на такси. Парковка во дворе очень " +
                    "ограниченная, в радиусе 200 метров несколько небольших стоянок. Рекомендуем такси " +
                    "или общественный транспорт — особенно на обратный путь, так как после полуночи " +
                    "автобусы ходят редко.\n\n" +
                    "Доступность и ограничения. Возрастной ценз 18+, документ обязателен. Подъём на " +
                    "крышу — лифт + один пролёт лестницы; для людей с ограниченной мобильностью пишите " +
                    "в форму обратной связи за 24 часа, найдём решение. Курение — только в специально " +
                    "отведённой зоне у северного парапета.\n\n" +
                    "Если погода плохая. В случае сильного дождя или ветра мероприятие переносится в зал " +
                    "на 2-м этаже того же здания. Решение принимается за 4 часа до начала, всем " +
                    "зарегистрированным приходит уведомление по почте и push в приложении.",
                List.of(PUB_ELECTRO)
            )
        ));

        // Публикация к экскурсии по Рязанскому кремлю.
        result.put("Экскурсия по Рязанскому кремлю", List.of(
            new PublicationSeedSpec(
                "Что нужно знать перед экскурсией по Рязанскому кремлю",
                "Рязанский кремль — это не одно здание, а целый архитектурный ансамбль на территории около " +
                    "26 гектаров. За два часа экскурсии мы охватим главное, но если вы хотите получить " +
                    "от прогулки максимум — потратьте 15 минут на этот короткий обзор.\n\n" +
                    "Контекст. Современный Рязанский кремль не имеет отношения к Старой Рязани (она была " +
                    "разрушена в 1237 году и находится в 50 км от современного города). Это уже " +
                    "переяславский кремль — деревянная крепость на холме над Трубежом, постепенно " +
                    "превратившаяся в каменный архитектурный комплекс XV–XIX веков. Стен в привычном смысле " +
                    "тут нет — рельеф холма и валы выполняли защитную функцию, поэтому ансамбль читается " +
                    "иначе, чем московский или коломенский кремль.\n\n" +
                    "Главные точки маршрута. Успенский собор (1693–1699) — самый большой действующий " +
                    "пятиглавый собор России XVII века, построен Яковом Бухвостовым в стиле «нарышкинского " +
                    "барокко». Соборная колокольня (1789–1840) — 83 метра, построена в три приёма разными " +
                    "архитекторами, но при этом сохраняет цельность стиля. Архангельский собор (XV–XVI века, " +
                    "перестроен в XVII) — старейшее здание ансамбля, изначально домовая церковь рязанских " +
                    "епископов. Дворец Олега (XVII век) — гражданская постройка, сейчас здесь " +
                    "Историко-архитектурный музей-заповедник, в него можно зайти отдельно после экскурсии.\n\n" +
                    "Что взять с собой. Удобная обувь — в кремле много неровных каменных мостовых и " +
                    "брусчатки. Зонт — экскурсия идёт в любую погоду. Заряженный телефон или фотоаппарат — " +
                    "архитектурные детали отлично выходят на фото. Воду — питьевых точек в самом кремле " +
                    "нет, ближайшие — за валами на Соборной площади.\n\n" +
                    "Что почитать заранее. Если у вас час свободного времени — статья «Рязанский кремль» " +
                    "в Википедии даст хороший общий контекст. Для более глубокого погружения — материалы " +
                    "Рязанского историко-архитектурного музея-заповедника, у них есть бесплатная электронная " +
                    "библиотека на сайте. Особенно интересна серия «Архитекторы Рязани» — там разобраны " +
                    "биографии Бухвостова и других мастеров, чьи постройки мы увидим.\n\n" +
                    "После экскурсии. Если останутся силы — рекомендуем подняться на Соборную колокольню " +
                    "(отдельный билет, 200 рублей, работает до 18:00). Это 296 ступеней по узкой винтовой " +
                    "лестнице, не для всех, но виды на город сверху того стоят. Альтернатива — спокойный " +
                    "обед в одном из кафе у Соборной площади и пешая прогулка по историческому центру.\n\n" +
                    "Доступность. Маршрут проходит по неровной поверхности с уклонами — людям с ограниченной " +
                    "мобильностью может быть тяжело. По запросу (за 24 часа на почту) подберём адаптированный " +
                    "укороченный маршрут только по ровной части ансамбля.",
                List.of(PUB_KREMLIN_RZ_1, PUB_KREMLIN_RZ_2)
            )
        ));

        // Публикация к городской ярмарке на Соборной.
        result.put("Городская ярмарка на Соборной", List.of(
            new PublicationSeedSpec(
                "Гайд по ярмарке на Соборной: производители, маршрут и что точно стоит попробовать",
                "Соборная площадь на один день превращается в большой гастрономический и ремесленный рынок: " +
                    "более пятидесяти производителей, фольклорная сцена, мастер-классы для детей. " +
                    "В этом материале — практический гайд: как обойти всё за два часа, что точно стоит " +
                    "попробовать и где удобно отдохнуть.\n\n" +
                    "Карта площадки. Производители расположены по периметру площади четырьмя секторами: " +
                    "северный — гастрономия (молочка, сыры, мясная продукция), восточный — мёд и сладости " +
                    "(пастила, варенье, медовуха), южный — ремесло (керамика, текстиль, украшения), " +
                    "западный — детская зона и тёплые палатки с чаем. В центре площади — фольклорная " +
                    "сцена, перед ней огороженная танцевальная зона.\n\n" +
                    "Что точно стоит попробовать. Из гастрономии — фермерская молочка из Шиловского района " +
                    "(сливочное масло на закваске, обязательно купить ложечку для пробы) и сыры из села " +
                    "Кораблино (мягкие сыры с травами, тильзитер местного производства). Из сладостей — " +
                    "белёвскую и коломенскую пастилу разных сортов и медовуху от рязанской пасеки (есть " +
                    "безалкогольный вариант для детей). Из ремесла — керамика мастеров из Скопина " +
                    "(скопинская глиняная игрушка — старинный местный промысел) и плетёные изделия из лозы.\n\n" +
                    "Расписание сцены. 11:30 — открытие ярмарки, выступление детского ансамбля. 12:30 — " +
                    "блок народных песен, ансамбль из пяти исполнителей. 14:00 — кадрильный блок, можно " +
                    "выйти в круг и танцевать вместе. 15:30 — мастер-класс по простому народному танцу " +
                    "для всех желающих (в том числе для детей и взрослых, которые никогда не танцевали). " +
                    "17:00 — частушки и шуточные песни. 18:30 — финальный общий хоровод.\n\n" +
                    "Детская программа. Параллельно с основной программой работают четыре мастер-класса " +
                    "по 30 минут: лепка из глины (10:00, 13:00, 16:00), роспись деревянных матрёшек " +
                    "(11:00, 14:00, 17:00), плетение из лыка (12:00, 15:00, 18:00) и игры с традиционными " +
                    "игрушками (постоянно). Все занятия бесплатные, по живой очереди.\n\n" +
                    "Что взять с собой. Большую сумку или эко-сумку — на ярмарке вы наверняка что-то " +
                    "купите. Удобную обувь — за два часа обхода накопится приличный пробег. Наличные — " +
                    "большинство принимает карты, но небольшие позиции (50–150 рублей) удобнее наличными. " +
                    "Воду — несколько питьевых точек по периметру площади, но в пик к ним очереди. " +
                    "Для детей — головной убор и крем от солнца, основная активность днём на открытом " +
                    "пространстве.\n\n" +
                    "Как добраться. Соборная площадь — центр Рязани, удобно с любой стороны. Парковка " +
                    "ограничена, в день ярмарки заполняется к 11:00 — рекомендуем общественный транспорт " +
                    "или такси. Ближайшие остановки в 5–10 минутах ходьбы. Если на машине — оставьте " +
                    "её в районе ж/д вокзала и пройдите 15 минут пешком.\n\n" +
                    "Доступность. Площадка ровная, удобна для людей с колясками и ограниченной мобильностью. " +
                    "Туалеты, точка первой помощи и стол волонтёров — у западного входа. Всем детям на " +
                    "входе выдают браслет с телефоном родителя — на случай, если потеряетесь в толпе.",
                List.of(PUB_YARMARKA)
            )
        ));

        return result;
    }
}
