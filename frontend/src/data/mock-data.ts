import type { User, Category, City, Venue, Event, Session, Registration, Favorite, Review, Publication } from '@/types';

export const mockUsers: User[] = [
  { id: 'u1', email: 'ivan@mail.ru', firstName: 'Иван', lastName: 'Петров', role: 'RESIDENT', active: true, createdAt: '2024-01-15T10:00:00Z', avatarUrl: '' },
  { id: 'u2', email: 'maria@mail.ru', firstName: 'Мария', lastName: 'Сидорова', role: 'RESIDENT', active: true, createdAt: '2024-02-20T10:00:00Z', phone: '+7 900 123-45-67' },
  { id: 'u3', email: 'org@fest.ru', firstName: 'Алексей', lastName: 'Козлов', role: 'ORGANIZER', active: true, createdAt: '2024-01-10T10:00:00Z' },
  { id: 'u4', email: 'org2@fest.ru', firstName: 'Елена', lastName: 'Морозова', role: 'ORGANIZER', active: true, createdAt: '2024-03-01T10:00:00Z' },
  { id: 'u5', email: 'admin@fest.ru', firstName: 'Дмитрий', lastName: 'Волков', role: 'ADMIN', active: true, createdAt: '2023-12-01T10:00:00Z' },
  { id: 'u6', email: 'anna@mail.ru', firstName: 'Анна', lastName: 'Кузнецова', role: 'RESIDENT', active: false, createdAt: '2024-04-10T10:00:00Z' },
];

export const mockCategories: Category[] = [
  { id: 'c1', name: 'Музыка', slug: 'music', icon: '🎵' },
  { id: 'c2', name: 'Театр', slug: 'theater', icon: '🎭' },
  { id: 'c3', name: 'Выставки', slug: 'exhibitions', icon: '🖼️' },
  { id: 'c4', name: 'Кино', slug: 'cinema', icon: '🎬' },
  { id: 'c5', name: 'Еда и напитки', slug: 'food', icon: '🍽️' },
  { id: 'c6', name: 'Мастер-классы', slug: 'workshops', icon: '🎨' },
  { id: 'c7', name: 'Спорт', slug: 'sports', icon: '⚽' },
  { id: 'c8', name: 'Литература', slug: 'literature', icon: '📚' },
];

export const mockCities: City[] = [
  { id: 'city1', name: 'Ярославль', region: 'Ярославская область' },
  { id: 'city2', name: 'Кострома', region: 'Костромская область' },
  { id: 'city3', name: 'Владимир', region: 'Владимирская область' },
  { id: 'city4', name: 'Суздаль', region: 'Владимирская область' },
];

export const mockVenues: Venue[] = [
  { id: 'v1', name: 'Городской парк культуры', address: 'ул. Советская, 15', cityId: 'city1', capacity: 500, description: 'Главный парк города с летней эстрадой' },
  { id: 'v2', name: 'ДК «Современник»', address: 'пр. Ленина, 42', cityId: 'city1', capacity: 300, description: 'Дом культуры с залом и выставочным пространством' },
  { id: 'v3', name: 'Арт-пространство «Текстиль»', address: 'ул. Фабричная, 8', cityId: 'city2', capacity: 150, description: 'Лофт для творческих мероприятий' },
  { id: 'v4', name: 'Набережная Волги', address: 'Волжская набережная', cityId: 'city1', capacity: 1000, description: 'Открытая площадка на набережной' },
  { id: 'v5', name: 'Музей деревянного зодчества', address: 'ул. Пушкинская, 2', cityId: 'city4', capacity: 200, description: 'Историческая площадка под открытым небом' },
  { id: 'v6', name: 'Библиотека им. Горького', address: 'ул. Чехова, 11', cityId: 'city3', capacity: 80, description: 'Уютное пространство для камерных мероприятий' },
];

const withRelations = (v: Venue): Venue => ({ ...v, city: mockCities.find(c => c.id === v.cityId) });

export const mockEvents: Event[] = [
  {
    id: 'e1', title: 'Фестиваль уличной музыки «Звуки города»', description: 'Ежегодный фестиваль уличных музыкантов. Живые выступления на открытых площадках города: джаз, фолк, инди-рок, классика. Приходите с друзьями и семьёй — будет душевно!\n\nВ программе:\n- Выступления 20+ музыкантов\n- Фуд-корт с локальной кухней\n- Мастер-классы по игре на укулеле\n- Детская музыкальная площадка',
    shortDescription: 'Живая музыка на улицах города: джаз, фолк, инди-рок. 20+ артистов, фуд-корт и мастер-классы.',
    imageUrl: '', categoryId: 'c1', category: mockCategories[0], venueId: 'v4', venue: withRelations(mockVenues[3]),
    cityId: 'city1', city: mockCities[0], organizationId: '', organizerId: 'u3', format: 'OFFLINE', status: 'PUBLISHED',
    startDate: '2026-06-15T10:00:00Z', endDate: '2026-06-17T22:00:00Z', isFree: true, tags: ['музыка', 'фестиваль', 'лето', 'семейный'],
    createdAt: '2026-03-01T10:00:00Z', updatedAt: '2026-03-15T10:00:00Z', sessionsCount: 6, registrationsCount: 234, averageRating: 4.7, reviewsCount: 45,
  },
  {
    id: 'e2', title: 'Выставка современного искусства «Новые горизонты»', description: 'Коллекция работ молодых художников региона. Живопись, скульптура, инсталляции и digital art. Кураторские экскурсии каждый час.',
    shortDescription: 'Живопись, скульптура, инсталляции от молодых художников. Кураторские экскурсии.',
    imageUrl: '', categoryId: 'c3', category: mockCategories[2], venueId: 'v2', venue: withRelations(mockVenues[1]),
    cityId: 'city1', city: mockCities[0], organizationId: '', organizerId: 'u3', format: 'OFFLINE', status: 'PUBLISHED',
    startDate: '2026-05-20T10:00:00Z', endDate: '2026-06-20T18:00:00Z', price: 300, isFree: false, tags: ['искусство', 'выставка', 'молодёжь'],
    createdAt: '2026-02-10T10:00:00Z', updatedAt: '2026-02-15T10:00:00Z', sessionsCount: 4, registrationsCount: 156, averageRating: 4.5, reviewsCount: 28,
  },
  {
    id: 'e3', title: 'Гастрофестиваль «Вкусы Волги»', description: 'Кулинарный фестиваль с участием лучших ресторанов и фермеров региона. Дегустации, мастер-классы от шеф-поваров, конкурс пирогов.',
    shortDescription: 'Дегустации, мастер-классы от шеф-поваров, конкурс пирогов — лучшее от фермеров региона.',
    imageUrl: '', categoryId: 'c5', category: mockCategories[4], venueId: 'v1', venue: withRelations(mockVenues[0]),
    cityId: 'city1', city: mockCities[0], organizationId: '', organizerId: 'u4', format: 'OFFLINE', status: 'PUBLISHED',
    startDate: '2026-07-10T11:00:00Z', endDate: '2026-07-12T20:00:00Z', price: 500, isFree: false, tags: ['еда', 'гастрономия', 'фестиваль'],
    createdAt: '2026-04-01T10:00:00Z', updatedAt: '2026-04-05T10:00:00Z', sessionsCount: 8, registrationsCount: 312, averageRating: 4.8, reviewsCount: 67,
  },
  {
    id: 'e4', title: 'Театральный фестиваль «Маленькие сцены»', description: 'Иммерсивный театральный фестиваль в необычных локациях города. Спектакли на чердаках, во дворах и заброшенных зданиях.',
    shortDescription: 'Иммерсивный театр в необычных локациях: чердаки, дворы, заброшенные здания.',
    imageUrl: '', categoryId: 'c2', category: mockCategories[1], venueId: 'v3', venue: withRelations(mockVenues[2]),
    cityId: 'city2', city: mockCities[1], organizationId: '', organizerId: 'u4', format: 'OFFLINE', status: 'PUBLISHED',
    startDate: '2026-08-05T18:00:00Z', endDate: '2026-08-10T23:00:00Z', price: 800, isFree: false, tags: ['театр', 'иммерсивный', 'культура'],
    createdAt: '2026-05-01T10:00:00Z', updatedAt: '2026-05-10T10:00:00Z', sessionsCount: 5, registrationsCount: 98, averageRating: 4.9, reviewsCount: 22,
  },
  {
    id: 'e5', title: 'Мастер-класс «Керамика для начинающих»', description: 'Создайте свою первую керамическую чашку! Все материалы включены. Подходит для взрослых и детей от 10 лет.',
    shortDescription: 'Создайте свою керамическую чашку! Все материалы включены, подходит для детей от 10 лет.',
    imageUrl: '', categoryId: 'c6', category: mockCategories[5], venueId: 'v3', venue: withRelations(mockVenues[2]),
    cityId: 'city2', city: mockCities[1], organizationId: '', organizerId: 'u3', format: 'OFFLINE', status: 'PUBLISHED',
    startDate: '2026-05-25T14:00:00Z', endDate: '2026-05-25T17:00:00Z', price: 1500, isFree: false, tags: ['мастер-класс', 'керамика', 'творчество'],
    createdAt: '2026-04-15T10:00:00Z', updatedAt: '2026-04-15T10:00:00Z', sessionsCount: 3, registrationsCount: 24, averageRating: 4.6, reviewsCount: 8,
  },
  {
    id: 'e6', title: 'Книжный фестиваль «Страница»', description: 'Встречи с авторами, книжная ярмарка, читательские клубы и поэтические вечера. Вход свободный.',
    shortDescription: 'Встречи с авторами, книжная ярмарка, читательские клубы и поэтические вечера.',
    imageUrl: '', categoryId: 'c8', category: mockCategories[7], venueId: 'v6', venue: withRelations(mockVenues[5]),
    cityId: 'city3', city: mockCities[2], organizationId: '', organizerId: 'u4', format: 'OFFLINE', status: 'PUBLISHED',
    startDate: '2026-09-01T10:00:00Z', endDate: '2026-09-03T20:00:00Z', isFree: true, tags: ['книги', 'литература', 'фестиваль'],
    createdAt: '2026-06-01T10:00:00Z', updatedAt: '2026-06-05T10:00:00Z', sessionsCount: 10, registrationsCount: 178, averageRating: 4.4, reviewsCount: 33,
  },
  {
    id: 'e7', title: 'Кинофестиваль короткого метра «Кадр»', description: 'Показы лучших короткометражных фильмов студентов и молодых режиссёров. Q&A с авторами после каждого блока.',
    shortDescription: 'Лучшие короткометражки студентов и молодых режиссёров. Общение с авторами.',
    imageUrl: '', categoryId: 'c4', category: mockCategories[3], venueId: 'v2', venue: withRelations(mockVenues[1]),
    cityId: 'city1', city: mockCities[0], organizationId: '', organizerId: 'u3', format: 'HYBRID', status: 'PUBLISHED',
    startDate: '2026-10-15T17:00:00Z', endDate: '2026-10-18T22:00:00Z', price: 200, isFree: false, tags: ['кино', 'фестиваль', 'молодёжь'],
    createdAt: '2026-07-01T10:00:00Z', updatedAt: '2026-07-10T10:00:00Z', sessionsCount: 4, registrationsCount: 87, averageRating: 4.3, reviewsCount: 15,
  },
  {
    id: 'e8', title: 'Городской забег «Золотая осень»', description: 'Массовый забег по историческому центру города. Дистанции: 3 км, 5 км, 10 км. Участие бесплатное, регистрация обязательна.',
    shortDescription: 'Забег по историческому центру: 3, 5, 10 км. Бесплатное участие.',
    imageUrl: '', categoryId: 'c7', category: mockCategories[6], venueId: 'v1', venue: withRelations(mockVenues[0]),
    cityId: 'city1', city: mockCities[0], organizationId: '', organizerId: 'u4', format: 'OFFLINE', status: 'PENDING',
    startDate: '2026-10-01T08:00:00Z', endDate: '2026-10-01T14:00:00Z', isFree: true, tags: ['спорт', 'бег', 'осень'],
    createdAt: '2026-07-20T10:00:00Z', updatedAt: '2026-07-20T10:00:00Z', sessionsCount: 3, registrationsCount: 0, averageRating: 0, reviewsCount: 0,
  },
];

export const mockSessions: Session[] = [
  { id: 's1', eventId: 'e1', date: '2026-06-15', startTime: '10:00', endTime: '14:00', maxParticipants: 200, currentParticipants: 145 },
  { id: 's2', eventId: 'e1', date: '2026-06-15', startTime: '16:00', endTime: '22:00', maxParticipants: 300, currentParticipants: 230 },
  { id: 's3', eventId: 'e1', date: '2026-06-16', startTime: '10:00', endTime: '22:00', maxParticipants: 500, currentParticipants: 320 },
  { id: 's4', eventId: 'e2', date: '2026-05-25', startTime: '10:00', endTime: '13:00', maxParticipants: 50, currentParticipants: 42 },
  { id: 's5', eventId: 'e2', date: '2026-05-25', startTime: '14:00', endTime: '18:00', maxParticipants: 50, currentParticipants: 38 },
  { id: 's6', eventId: 'e3', date: '2026-07-10', startTime: '11:00', endTime: '15:00', maxParticipants: 100, currentParticipants: 89 },
  { id: 's7', eventId: 'e3', date: '2026-07-11', startTime: '11:00', endTime: '20:00', maxParticipants: 200, currentParticipants: 167 },
  { id: 's8', eventId: 'e4', date: '2026-08-05', startTime: '18:00', endTime: '21:00', maxParticipants: 30, currentParticipants: 28 },
  { id: 's9', eventId: 'e5', date: '2026-05-25', startTime: '14:00', endTime: '17:00', maxParticipants: 12, currentParticipants: 10 },
  { id: 's10', eventId: 'e6', date: '2026-09-01', startTime: '10:00', endTime: '18:00', maxParticipants: 80, currentParticipants: 55 },
];

export const mockRegistrations: Registration[] = [
  { id: 'r1', userId: 'u1', sessionId: 's1', eventId: 'e1', event: mockEvents[0], session: mockSessions[0], status: 'CONFIRMED', createdAt: '2026-05-01T10:00:00Z' },
  { id: 'r2', userId: 'u1', sessionId: 's6', eventId: 'e3', event: mockEvents[2], session: mockSessions[5], status: 'CONFIRMED', createdAt: '2026-06-01T10:00:00Z' },
  { id: 'r3', userId: 'u2', sessionId: 's4', eventId: 'e2', event: mockEvents[1], session: mockSessions[3], status: 'ATTENDED', createdAt: '2026-05-10T10:00:00Z' },
  { id: 'r4', userId: 'u1', sessionId: 's8', eventId: 'e4', event: mockEvents[3], session: mockSessions[7], status: 'CANCELLED', createdAt: '2026-07-01T10:00:00Z' },
];

export const mockFavorites: Favorite[] = [
  { id: 'f1', userId: 'u1', eventId: 'e1', event: mockEvents[0], createdAt: '2026-04-01T10:00:00Z' },
  { id: 'f2', userId: 'u1', eventId: 'e3', event: mockEvents[2], createdAt: '2026-04-15T10:00:00Z' },
  { id: 'f3', userId: 'u1', eventId: 'e4', event: mockEvents[3], createdAt: '2026-05-01T10:00:00Z' },
  { id: 'f4', userId: 'u2', eventId: 'e1', event: mockEvents[0], createdAt: '2026-04-05T10:00:00Z' },
];

export const mockReviews: Review[] = [
  { id: 'rev1', userId: 'u1', user: mockUsers[0], eventId: 'e1', rating: 5, comment: 'Потрясающий фестиваль! Атмосфера невероятная, музыканты играли от души. Обязательно приду в следующем году!', status: 'APPROVED', createdAt: '2025-07-01T10:00:00Z', updatedAt: '2025-07-01T10:00:00Z' },
  { id: 'rev2', userId: 'u2', user: mockUsers[1], eventId: 'e1', rating: 4, comment: 'Очень понравилось! Единственное — хотелось бы больше мест для сидения.', status: 'APPROVED', createdAt: '2025-07-02T10:00:00Z', updatedAt: '2025-07-02T10:00:00Z' },
  { id: 'rev3', userId: 'u1', user: mockUsers[0], eventId: 'e2', rating: 5, comment: 'Выставка поразила разнообразием. Кураторские экскурсии — отдельный восторг!', status: 'APPROVED', createdAt: '2025-06-15T10:00:00Z', updatedAt: '2025-06-15T10:00:00Z' },
  { id: 'rev4', userId: 'u2', user: mockUsers[1], eventId: 'e3', rating: 5, comment: 'Вкуснейшие пироги и великолепная атмосфера! Дети в восторге от мастер-классов.', status: 'APPROVED', createdAt: '2025-08-01T10:00:00Z', updatedAt: '2025-08-01T10:00:00Z' },
  { id: 'rev5', userId: 'u6', user: mockUsers[5], eventId: 'e4', rating: 5, comment: 'Иммерсивный театр — это что-то невероятное. Чувствуешь себя частью спектакля.', status: 'PENDING', createdAt: '2025-09-01T10:00:00Z', updatedAt: '2025-09-01T10:00:00Z' },
];

export const mockPublications: Publication[] = [
  {
    id: 'p1', title: 'Лето культуры: что ждёт горожан в этом сезоне', content: 'Этим летом город оживёт десятками мероприятий. Мы подготовили обзор самых ярких событий сезона — от уличных концертов до гастрономических фестивалей. Читайте подробности и планируйте свой культурный досуг!\n\nВ программе лета — фестиваль уличной музыки «Звуки города», гастрофестиваль «Вкусы Волги», серия мастер-классов по керамике и многое другое. Каждый найдёт что-то по душе.\n\nОсобое внимание в этом году уделено семейному досугу: детские площадки, мастер-классы для малышей и специальные программы для подростков.',
    excerpt: 'Обзор главных культурных событий лета — от уличных концертов до гастрофестивалей.',
    imageUrl: '', authorId: 'u3', author: mockUsers[2], status: 'PUBLISHED',
    publishedAt: '2026-04-01T10:00:00Z', createdAt: '2026-03-28T10:00:00Z', updatedAt: '2026-04-01T10:00:00Z', tags: ['лето', 'обзор', 'культура'],
  },
  {
    id: 'p2', title: 'Интервью с организатором «Звуков города»', content: 'Алексей Козлов рассказал о подготовке к третьему фестивалю уличной музыки. Как выбирают артистов, что нового в этом году и почему уличная музыка важна для города.\n\n«Мы хотим, чтобы каждый житель чувствовал, что город — это место для творчества», — говорит Алексей.',
    excerpt: 'Организатор фестиваля «Звуки города» — о подготовке, артистах и миссии уличной музыки.',
    imageUrl: '', authorId: 'u3', author: mockUsers[2], status: 'PUBLISHED',
    publishedAt: '2026-04-05T10:00:00Z', createdAt: '2026-04-03T10:00:00Z', updatedAt: '2026-04-05T10:00:00Z', tags: ['интервью', 'музыка', 'фестиваль'],
  },
  {
    id: 'p3', title: 'Как прошёл гастрофестиваль: фотоотчёт', content: 'Собрали лучшие моменты прошлогоднего гастрофестиваля «Вкусы Волги». 50+ фотографий, рецепт пирога-победителя и впечатления гостей.',
    excerpt: 'Фотоотчёт и лучшие моменты прошлогоднего гастрофестиваля «Вкусы Волги».',
    imageUrl: '', authorId: 'u4', author: mockUsers[3], status: 'PUBLISHED',
    publishedAt: '2025-12-10T10:00:00Z', createdAt: '2025-12-08T10:00:00Z', updatedAt: '2025-12-10T10:00:00Z', tags: ['фотоотчёт', 'еда', 'фестиваль'],
  },
  {
    id: 'p4', title: 'Открытие нового арт-пространства «Текстиль»', content: 'В Костроме открылось новое творческое пространство в здании бывшей текстильной фабрики. Лофт площадью 500 м² будет принимать выставки, концерты и мастер-классы.',
    excerpt: 'В Костроме открылся лофт для творческих мероприятий в здании бывшей фабрики.',
    imageUrl: '', authorId: 'u4', author: mockUsers[3], status: 'PENDING',
    createdAt: '2026-04-07T10:00:00Z', updatedAt: '2026-04-07T10:00:00Z', tags: ['новости', 'площадка', 'Кострома'],
  },
];

export const MOCK_PASSWORDS: Record<string, string> = {
  'ivan@mail.ru': 'password123',
  'maria@mail.ru': 'password123',
  'org@fest.ru': 'password123',
  'org2@fest.ru': 'password123',
  'admin@fest.ru': 'password123',
};
