package com.festivalapp.backend.config;

import com.festivalapp.backend.config.support.DemoDataSupport;
import com.festivalapp.backend.config.support.DemoDataSupport.EventHolder;
import com.festivalapp.backend.config.support.DemoDataSupport.EventSeedSpec;
import com.festivalapp.backend.config.support.DemoDataSupport.ParticipantSeed;
import com.festivalapp.backend.config.support.DemoDataSupport.SessionSeedSpec;
import com.festivalapp.backend.entity.Category;
import com.festivalapp.backend.entity.City;
import com.festivalapp.backend.entity.Image;
import com.festivalapp.backend.entity.Organization;
import com.festivalapp.backend.entity.Participant;
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
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Component
@Order(30)
@RequiredArgsConstructor
public class AdditionalCityDemoDataInitializer implements ApplicationRunner {

    private static final String PASSWORD = "123456";

    private final CityRepository cityRepository;
    private final UserRepository userRepository;
    private final OrganizationRepository organizationRepository;
    private final SessionRepository sessionRepository;
    private final PasswordEncoder passwordEncoder;
    private final DemoDataSupport support;

    @Value("${app.demo.kolomna-seed-enabled:true}")
    private boolean kolomnaEnabled;

    @Value("${app.demo.ryazan-seed-enabled:true}")
    private boolean ryazanEnabled;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        OffsetDateTime now = OffsetDateTime.now();
        Role organizerRole = support.ensureRole(RoleName.ROLE_ORGANIZER, "Организатор мероприятий");
        Role residentRole = support.ensureRole(RoleName.ROLE_RESIDENT, "Обычный житель");
        Map<String, Category> categories = support.ensureBaseCategories();
        Map<String, Participant> participants = support.ensureParticipants(buildParticipants(), now);

        if (kolomnaEnabled) {
            seedKolomna(now, organizerRole, residentRole, categories, participants);
        }
        if (ryazanEnabled) {
            seedRyazan(now, organizerRole, residentRole, categories, participants);
        }

        support.patchMissingSessionCoordinates();
        log.info("Additional city demo organizers/events have been seeded/verified");
    }

    private void seedKolomna(OffsetDateTime now,
                             Role organizerRole,
                             Role residentRole,
                             Map<String, Category> categories,
                             Map<String, Participant> participants) {
        City city = ensureCity("Коломна", "Московская область", now);

        User craftOrganizer = ensureOrganizer("organizer.craft.kolomna@festival.local", "organizer_craft_kolomna",
            "+79001230021", "Наталья", "Посадская", city, now);
        User stageOrganizer = ensureOrganizer("organizer.stage.kolomna@festival.local", "organizer_stage_kolomna",
            "+79001230022", "Виктор", "Сценический", city, now);
        prepareOrganizer(craftOrganizer, organizerRole, residentRole, now);
        prepareOrganizer(stageOrganizer, organizerRole, residentRole, now);

        Organization craftOrg = ensureOrganization("Коломенский центр ремёсел", city,
            "Городская команда мастерских: керамика, гастрономия, ремесленные ярмарки и семейные практикумы.",
            "craft@kolomna-events.local", "+74966123021", "vk.com/kolomna_craft", now);
        Organization stageOrg = ensureOrganization("Коломенская сцена и двор", city,
            "Независимая площадка для камерной музыки, театра, балета и вечерних городских событий.",
            "stage@kolomna-events.local", "+74966123022", "vk.com/kolomna_stage", now);
        prepareOrganization(craftOrg, craftOrganizer, "kolomna-extra", "images/free-craft/kolomna-pottery-lab.jpg", now);
        prepareOrganization(stageOrg, stageOrganizer, "kolomna-extra", "images/theatre stage/eduardo-pastor-SkEUgyJqJlQ-unsplash.jpg", now);

        support.ensureParticipantImages(participants, kolomnaParticipantImages(), craftOrganizer, now, "kolomna-participants");

        seedEvents(craftOrg, craftOrganizer, city, categories, participants, now, "kolomna-extra", List.of(
            new EventSeedSpec(
                "Ярмарка ремёсел на Посаде",
                "Большой ремесленный день с керамикой, калачами, музыкой и мастер-классами.",
                "Коломенский центр ремёсел собирает во дворе мастерские, гастрономические точки и короткие занятия для гостей. " +
                    "Можно посмотреть работу гончарного круга, расписать небольшую плитку, попробовать свежие калачи и послушать " +
                    "фольклорный сет ансамбля «Коломенская слобода». Формат рассчитан на семьи и туристов: активности идут волнами, " +
                    "поэтому можно прийти в любое время и выбрать интересную мастерскую.",
                "0+",
                List.of("Фестиваль", "Мастер-класс"),
                List.of("images/free-craft/kolomna-clay-hands.jpg", "images/russian-festival/festival-02.jpg"),
                List.of(new SessionSeedSpec("Ремесленная ярмарка", now.plusDays(31).withHour(12).withMinute(0).withSecond(0).withNano(0),
                    now.plusDays(31).withHour(18).withMinute(0).withSecond(0).withNano(0),
                    "Московская область, Коломна, улица Зайцева, 14", null, 500, BigDecimal.ZERO)),
                List.of("Керамическая студия «Посад»", "Мастерская «Калачный двор»", "Фольклорный ансамбль «Коломенская слобода»")
            ),
            new EventSeedSpec(
                "Ночная экскурсия: легенды Коломенского кремля",
                "Вечерняя прогулка по кремлю с городскими легендами и историческими сюжетами.",
                "Маршрут начинается у Лажечникова и проходит по самым выразительным точкам кремля в мягком вечернем свете. " +
                    "Дмитрий Бельский и Анна Воронина расскажут не только проверенную историческую канву, но и городские легенды: " +
                    "о Маринкиной башне, купеческих дворах и исчезнувших воротах. Группа небольшая, темп спокойный, на финише — " +
                    "горячий чай и ответы на вопросы.",
                "12+",
                List.of("Лекция"),
                List.of("images/kolomna-views/kolomna-04.jpg", "images/russian-architecture/architecture-01.jpg"),
                List.of(new SessionSeedSpec("Вечерняя группа", now.plusDays(34).withHour(20).withMinute(30).withSecond(0).withNano(0),
                    now.plusDays(34).withHour(22).withMinute(0).withSecond(0).withNano(0),
                    null, "Московская область, Коломна, улица Лажечникова, 5", 35, new BigDecimal("700.00"))),
                List.of("Дмитрий Бельский", "Анна Воронина")
            )
        ));

        seedEvents(stageOrg, stageOrganizer, city, categories, participants, now, "kolomna-stage", List.of(
            new EventSeedSpec(
                "Балетный класс в старом зале",
                "Открытый класс по классическому танцу с балериной Ольгой Степановой.",
                "Камерное занятие для взрослых новичков и тех, кто давно хотел попробовать балет без давления профессиональной школы. " +
                    "Ольга Степанова проведёт разминку у станка, покажет базовые позиции и объяснит, как классический танец помогает " +
                    "осанке и координации. В конце — короткий показательный фрагмент и фото в зале.",
                "12+",
                List.of("Мастер-класс"),
                List.of("images/theatre stage/kyle-head-p6rNTdAPbuk-unsplash.jpg", "images/art gallery/praewthida-k-vJejbjXEOxU-unsplash.jpg"),
                List.of(new SessionSeedSpec("Открытый класс", now.plusDays(29).withHour(18).withMinute(30).withSecond(0).withNano(0),
                    now.plusDays(29).withHour(20).withMinute(0).withSecond(0).withNano(0),
                    null, "Московская область, Коломна, улица Октябрьской Революции, 205", 40, new BigDecimal("650.00"))),
                List.of("Балерина Ольга Степанова")
            ),
            new EventSeedSpec(
                "Акустический двор: песни у пастильной",
                "Тёплый вечер акустики, саксофона и разговоров во внутреннем дворе.",
                "Небольшой двор превращается в камерную летнюю сцену: Марина Соколова играет акустический сет, Алексей Руденко " +
                    "добавляет мягкие саксофонные партии, а после концерта гости остаются на открытую беседу о локальной музыке. " +
                    "Формат без больших трибун и суеты, с посадкой за столиками и горячим чаем.",
                "12+",
                List.of("Концерт"),
                List.of("images/open air/aranxa-esteve-pOXHU0UEDcg-unsplash.jpg", "images/live music/frank-rolando-romero-vJ5apSa8r14-unsplash.jpg"),
                List.of(new SessionSeedSpec("Акустический вечер", now.plusDays(36).withHour(19).withMinute(0).withSecond(0).withNano(0),
                    now.plusDays(36).withHour(21).withMinute(0).withSecond(0).withNano(0),
                    null, "Московская область, Коломна, Красногвардейская улица, 2", 90, new BigDecimal("550.00"))),
                List.of("Марина Соколова", "Алексей Руденко")
            )
        ));
    }

    private void seedRyazan(OffsetDateTime now,
                            Role organizerRole,
                            Role residentRole,
                            Map<String, Category> categories,
                            Map<String, Participant> participants) {
        City city = ensureCity("Рязань", "Рязанская область", now);

        User excursionOrganizer = ensureOrganizer("organizer.walks.ryazan@festival.local", "organizer_walks_ryazan",
            "+79001230031", "Ирина", "Соборная", city, now);
        User musicOrganizer = ensureOrganizer("organizer.music.ryazan@festival.local", "organizer_music_ryazan",
            "+79001230032", "Михаил", "Почтовый", city, now);
        prepareOrganizer(excursionOrganizer, organizerRole, residentRole, now);
        prepareOrganizer(musicOrganizer, organizerRole, residentRole, now);

        Organization excursionOrg = ensureOrganization("Рязанский городской центр экскурсий", city,
            "Экскурсии, прогулки, музейные программы и семейные маршруты по Рязани.",
            "walks@ryazan-events.local", "+74912223031", "vk.com/ryazan_walks", now);
        Organization musicOrg = ensureOrganization("Рязанский дом музыки", city,
            "Организатор концертов, джазовых вечеров, клубных лайвов и независимых музыкальных событий.",
            "music@ryazan-events.local", "+74912223032", "vk.com/ryazan_music_house", now);
        prepareOrganization(excursionOrg, excursionOrganizer, "ryazan-extra", "images/ryazan-views/ryazan-01.jpg", now);
        prepareOrganization(musicOrg, musicOrganizer, "ryazan-extra", "images/music stage/rahul-kukreja-_5MoVxUZxEw-unsplash.jpg", now);

        support.ensureParticipantImages(participants, ryazanParticipantImages(), excursionOrganizer, now, "ryazan-participants");

        seedEvents(excursionOrg, excursionOrganizer, city, categories, participants, now, "ryazan-walks", List.of(
            new EventSeedSpec(
                "Фото-прогулка по старым кварталам",
                "Маршрут по фактурным улицам Рязани с историком архитектуры и подсказками для съёмки.",
                "Архитектурное бюро «Старый план» ведёт прогулку по дореволюционным кварталам, а Антон Сухов добавляет " +
                    "исторические детали о домах и дворах. Участники узнают, где искать старую кирпичную кладку, вывески, " +
                    "кованые элементы и тихие проходные дворы. Подойдёт для смартфона и камеры.",
                "12+",
                List.of("Лекция"),
                List.of("images/ryazan-views/ryazan-04.jpg", "images/russian-architecture/architecture-05.jpg"),
                List.of(new SessionSeedSpec("Фото-маршрут", now.plusDays(30).withHour(16).withMinute(0).withSecond(0).withNano(0),
                    now.plusDays(30).withHour(18).withMinute(0).withSecond(0).withNano(0),
                    null, "Рязанская область, Рязань, Соборная площадь, 13", 28, new BigDecimal("650.00"))),
                List.of("Архитектурное бюро «Старый план»", "Антон Сухов")
            ),
            new EventSeedSpec(
                "Семейная лаборатория музейных историй",
                "Детская программа о городе: мини-экскурсия, задания и творческая карта.",
                "Елена Гурьева и Татьяна Лазарева проводят семейное занятие, где дети собирают собственную карту Рязани: " +
                    "слушают короткие истории, ищут детали на старых фотографиях и рисуют маршрут любимых мест. Родители могут " +
                    "участвовать вместе с детьми, все материалы входят в бесплатный билет.",
                "5+",
                List.of("Мастер-класс", "Лекция"),
                List.of("images/free-children/ryazan-kids-artwork.jpg", "images/free-museum/museum-04.jpg"),
                List.of(new SessionSeedSpec("Семейная группа", now.plusDays(32).withHour(12).withMinute(0).withSecond(0).withNano(0),
                    now.plusDays(32).withHour(13).withMinute(30).withSecond(0).withNano(0),
                    null, "Рязанская область, Рязань, улица Почтовая, 60", 30, BigDecimal.ZERO)),
                List.of("Елена Гурьева", "Татьяна Лазарева")
            )
        ));

        seedEvents(musicOrg, musicOrganizer, city, categories, participants, now, "ryazan-music", List.of(
            new EventSeedSpec(
                "Джазовый вечер в камерном зале",
                "Квартет Сергея Титова и Дарья Белова в камерной программе на один вечер.",
                "Рязанский дом музыки собирает вечер для тех, кто любит живой звук без большой фестивальной сцены. " +
                    "Сергей Титов Quartet играет джазовые стандарты и авторские темы, Дарья Белова выходит с несколькими " +
                    "вокальными номерами в середине программы. Зал небольшой, посадка свободная.",
                "12+",
                List.of("Концерт"),
                List.of("images/live music/pexels-brett-sayles-1434625.jpg", "images/music stage/magnus-lunay-LHR6tUw8N34-unsplash.jpg"),
                List.of(new SessionSeedSpec("Камерный концерт", now.plusDays(33).withHour(19).withMinute(0).withSecond(0).withNano(0),
                    now.plusDays(33).withHour(21).withMinute(0).withSecond(0).withNano(0),
                    null, "Рязанская область, Рязань, улица Почтовая, 54", 140, new BigDecimal("900.00"))),
                List.of("Сергей Титов", "Дарья Белова")
            ),
            new EventSeedSpec(
                "Виниловая ночь на Почтовой",
                "Клубная программа с виниловыми сетами, электроникой и мягким late-night форматом.",
                "Никита Власов и Игорь Демьянов делают ночной сет без жёсткого клубного шума: винил, downtempo, house " +
                    "и электронные вставки. Пространство работает с рассадкой и танцевальной зоной, вход строго 18+, " +
                    "документ проверяется на входе.",
                "18+",
                List.of("Концерт"),
                List.of("images/music stage/ivaldo-hadi-4AUzJ6hbPJU-unsplash.jpg", "images/music stage/photo.jpg"),
                List.of(new SessionSeedSpec("Ночной сет", now.plusDays(38).withHour(21).withMinute(0).withSecond(0).withNano(0),
                    now.plusDays(38).withHour(23).withMinute(45).withSecond(0).withNano(0),
                    null, "Рязанская область, Рязань, улица Почтовая, 60", 120, new BigDecimal("1100.00"))),
                List.of("Никита Власов", "Игорь Демьянов")
            )
        ));
    }

    private void seedEvents(Organization organization,
                            User organizer,
                            City city,
                            Map<String, Category> categories,
                            Map<String, Participant> participants,
                            OffsetDateTime now,
                            String demoKey,
                            List<EventSeedSpec> specs) {
        for (EventSeedSpec spec : specs) {
            EventHolder holder = support.ensureEventBase(spec, organization, organizer, city, now);
            support.ensureEventCategories(holder.event(), spec.categoryNames(), categories);
            support.ensureEventImages(holder.event(), spec.classpathImagePaths(), organizer, now, demoKey);
            if (holder.created() || sessionRepository.findAllByEventIdOrderByStartsAtAsc(holder.event().getId()).isEmpty()) {
                support.createSessionsAndTickets(holder.event(), spec, city);
            }
            support.ensureEventParticipants(holder.event(), spec.participantNames(), participants);
            support.normalizePrimaryImage(holder.event().getId());
        }
    }

    private City ensureCity(String name, String region, OffsetDateTime now) {
        return cityRepository.findFirstByNameIgnoreCaseAndRegionIgnoreCase(name, region)
            .or(() -> cityRepository.findFirstByNameIgnoreCase(name))
            .orElseGet(() -> cityRepository.save(City.builder()
                .name(name)
                .region(region)
                .active(true)
                .createdAt(now)
                .build()));
    }

    private User ensureOrganizer(String email,
                                 String login,
                                 String phone,
                                 String firstName,
                                 String lastName,
                                 City city,
                                 OffsetDateTime now) {
        User user = userRepository.findByEmail(email)
            .orElseGet(() -> userRepository.save(User.builder()
                .login(login)
                .email(email)
                .phone(phone)
                .passwordHash(passwordEncoder.encode(PASSWORD))
                .firstName(firstName)
                .lastName(lastName)
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

    private void prepareOrganizer(User organizer, Role organizerRole, Role residentRole, OffsetDateTime now) {
        support.ensureUserRole(organizer, organizerRole, now);
        support.ensureUserRole(organizer, residentRole, now);
    }

    private Organization ensureOrganization(String name,
                                            City city,
                                            String description,
                                            String email,
                                            String phone,
                                            String socialLinks,
                                            OffsetDateTime now) {
        return organizationRepository.findByNameIgnoreCase(name)
            .orElseGet(() -> organizationRepository.save(Organization.builder()
                .city(city)
                .name(name)
                .description(description)
                .contactEmail(email)
                .contactPhone(phone)
                .website("https://" + email.substring(email.indexOf('@') + 1))
                .socialLinks(socialLinks)
                .moderationStatus("одобрена")
                .createdAt(now)
                .updatedAt(now)
                .build()));
    }

    private void prepareOrganization(Organization organization,
                                     User owner,
                                     String demoKey,
                                     String imagePath,
                                     OffsetDateTime now) {
        support.ensureOrganizationMember(owner, organization, "владелец", now);
        Image image = support.ensureImage(demoKey, imagePath, "org-" + organization.getId(), owner, now);
        boolean changed = false;
        if (organization.getLogoImage() == null) {
            organization.setLogoImage(image);
            changed = true;
        }
        if (organization.getCoverImage() == null) {
            organization.setCoverImage(image);
            changed = true;
        }
        if (changed) {
            organization.setUpdatedAt(now);
            organizationRepository.save(organization);
        }
    }

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
            new ParticipantSeed("Садовый клуб «Коломенские ростки»", "Коломенские ростки", "Соседский клуб обмена растениями, черенками и городскими садовыми практиками.", "Садоводство", "ансамбль"),
            new ParticipantSeed("Дарья Белова", "Daria Belova", "Вокалистка с инди-поп программой и камерным составом.", "Инди", "исполнитель"),
            new ParticipantSeed("Антон Сухов", "Антон Сухов", "Городской историк и лектор о культурном наследии Рязани.", "Лектор", "лектор"),
            new ParticipantSeed("Никита Власов", "NVLS", "Электронный продюсер и лайв-исполнитель с атмосферными сетами.", "Электроника", "исполнитель"),
            new ParticipantSeed("Елена Гурьева", "Елена Гурьева", "Куратор семейных мастер-классов и интерактивных программ.", "Образование", "исполнитель"),
            new ParticipantSeed("Сергей Титов", "Sergey Titov Quartet", "Саксофонист и руководитель городского джаз-квартета.", "Джаз", "исполнитель"),
            new ParticipantSeed("Мария Ефимова", "Мария Ефимова", "Уличный художник, ведёт мастер-классы по урбан-арту и каллиграфии.", "Изобразительное искусство", "исполнитель"),
            new ParticipantSeed("Театр «Молодёжная сцена»", "Молодёжная сцена", "Рязанская театральная студия, ставит современные пьесы.", "Театр", "ансамбль"),
            new ParticipantSeed("Игорь Демьянов", "DJ Demyanov", "Резидент рязанских клубов, работает с house и techno.", "Электроника", "исполнитель"),
            new ParticipantSeed("Татьяна Лазарева", "Татьяна Лазарева", "Аккредитованный экскурсовод по Рязанскому кремлю и историческому центру.", "Экскурсия", "экскурсовод"),
            new ParticipantSeed("Архитектурное бюро «Старый план»", "Старый план", "Команда историков архитектуры, проводит пешие прогулки по дореволюционной Рязани.", "Лектор", "лектор"),
            new ParticipantSeed("Волонтёрский штаб «Лыбедь»", "Лыбедь", "Городская команда добровольцев, организует экологические акции и соседские встречи.", "Волонтёрство", "ансамбль"),
            new ParticipantSeed("Книжный клуб «Почтовая»", "Почтовая", "Открытый книжный клуб с читками, обменом книгами и литературными разговорами.", "Литература", "ансамбль")
        );
    }

    private Map<String, String> kolomnaParticipantImages() {
        Map<String, String> images = new LinkedHashMap<>();
        images.put("Илья Лебедев", "images/participants/ilya-lebedev.jpg");
        images.put("Алексей Руденко", "images/participants/alexey-rudenko.jpg");
        images.put("Анна Власова", "images/participants/anna-vlasova.jpg");
        images.put("Дмитрий Орлов", "images/participants/dmitry-orlov.jpg");
        images.put("Егор Нечаев", "images/participants/egor-nechaev.jpg");
        images.put("Марина Соколова", "images/participants/marina-sokolova.jpg");
        images.put("Никита Белов", "images/participants/nikita-belov.jpg");
        images.put("Ольга Климова", "images/participants/olga-klimova.jpg");
        images.put("Павел Громов", "images/participants/pavel-gromov.jpg");
        images.put("Софья Мороз", "images/participants/sofya-moroz.jpg");
        images.put("Анна Воронина", "images/participants/anna-voronina.jpg");
        images.put("Театр «Коломенская маска»", "images/participants/kolomna-mask.jpg");
        images.put("Балерина Ольга Степанова", "images/participants/olga-stepanova.jpg");
        images.put("Мастерская «Калачный двор»", "images/participants/kalachny-dvor.jpg");
        images.put("Дмитрий Бельский", "images/participants/dmitry-belsky.jpg");
        images.put("Фольклорный ансамбль «Коломенская слобода»", "images/participants/kolomna-sloboda.jpg");
        images.put("Керамическая студия «Посад»", "images/participants/posad-studio.jpg");
        images.put("Садовый клуб «Коломенские ростки»", "images/participants/kolomna-rostki.jpg");
        return images;
    }

    private Map<String, String> ryazanParticipantImages() {
        Map<String, String> images = new LinkedHashMap<>();
        images.put("Дарья Белова", "images/participants/daria-belova.jpg");
        images.put("Антон Сухов", "images/participants/anton-sukhov.jpg");
        images.put("Никита Власов", "images/participants/nikita-vlasov.jpg");
        images.put("Елена Гурьева", "images/participants/elena-guryeva.jpg");
        images.put("Сергей Титов", "images/participants/sergey-titov.jpg");
        images.put("Мария Ефимова", "images/participants/maria-efimova.jpg");
        images.put("Театр «Молодёжная сцена»", "images/participants/youth-stage.jpg");
        images.put("Игорь Демьянов", "images/participants/igor-demyanov.jpg");
        images.put("Татьяна Лазарева", "images/participants/tatyana-lazareva.jpg");
        images.put("Архитектурное бюро «Старый план»", "images/participants/old-plan.jpg");
        images.put("Волонтёрский штаб «Лыбедь»", "images/participants/lybed-volunteers.jpg");
        images.put("Книжный клуб «Почтовая»", "images/participants/pochtovaya-bookclub.jpg");
        return images;
    }
}
