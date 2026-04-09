export interface Event {
  id: number;
  title: string;
  description: string;
  shortDescription: string;
  date: string;
  time: string;
  endDate?: string;
  address: string;
  city: string;
  category: string;
  ageRestriction: string;
  image: string;
  organizerName: string;
  organizerAvatar?: string;
  price: string;
  isFree: boolean;
  sessions: { date: string; time: string; spotsLeft: number }[];
  rating: number;
  reviewCount: number;
}

export const cities = [
  "Суздаль",
  "Мышкин",
  "Плёс",
  "Елабуга",
  "Тобольск",
  "Углич",
];

export const categories = [
  "Все",
  "Музыка",
  "Театр",
  "Выставка",
  "Мастер-класс",
  "Фестиваль",
  "Экскурсия",
  "Кино",
];

export const events: Event[] = [
  {
    id: 1,
    title: "Фестиваль народных промыслов",
    description: "Ежегодный фестиваль, посвящённый традиционным ремёслам и народному творчеству. Мастера со всей области представят свои работы: керамику, вышивку, резьбу по дереву, кузнечное дело. Гостей ждут мастер-классы, ярмарка, народные гуляния и концертная программа.",
    shortDescription: "Традиционные ремёсла, мастер-классы и ярмарка",
    date: "15 мая 2026",
    time: "10:00",
    endDate: "17 мая 2026",
    address: "Торговая площадь, д. 1",
    city: "Суздаль",
    category: "Фестиваль",
    ageRestriction: "0+",
    image: "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=600&h=400&fit=crop",
    organizerName: "Культурный центр «Суздаль»",
    price: "Бесплатно",
    isFree: true,
    sessions: [
      { date: "15 мая", time: "10:00", spotsLeft: 120 },
      { date: "16 мая", time: "10:00", spotsLeft: 85 },
      { date: "17 мая", time: "10:00", spotsLeft: 200 },
    ],
    rating: 4.8,
    reviewCount: 24,
  },
  {
    id: 2,
    title: "Вечер классической музыки",
    description: "Камерный концерт в историческом зале. Прозвучат произведения Чайковского, Рахманинова и Скрябина в исполнении лауреатов международных конкурсов.",
    shortDescription: "Чайковский, Рахманинов, Скрябин — камерный концерт",
    date: "22 мая 2026",
    time: "19:00",
    address: "ул. Кремлёвская, д. 14",
    city: "Суздаль",
    category: "Музыка",
    ageRestriction: "6+",
    image: "https://images.unsplash.com/photo-1507838153414-b4b713384a76?w=600&h=400&fit=crop",
    organizerName: "Филармония малых городов",
    price: "500 ₽",
    isFree: false,
    sessions: [
      { date: "22 мая", time: "19:00", spotsLeft: 45 },
    ],
    rating: 4.9,
    reviewCount: 12,
  },
  {
    id: 3,
    title: "Выставка «Краски провинции»",
    description: "Выставка работ местных художников, посвящённая красоте малых городов России. Живопись, графика, фотография.",
    shortDescription: "Живопись, графика и фотография местных художников",
    date: "1 июня 2026",
    time: "11:00",
    endDate: "30 июня 2026",
    address: "Музейный переулок, д. 3",
    city: "Плёс",
    category: "Выставка",
    ageRestriction: "0+",
    image: "https://images.unsplash.com/photo-1531243269054-5ebf6f34081e?w=600&h=400&fit=crop",
    organizerName: "Плёсский музей-заповедник",
    price: "200 ₽",
    isFree: false,
    sessions: [
      { date: "Ежедневно", time: "11:00–18:00", spotsLeft: 999 },
    ],
    rating: 4.6,
    reviewCount: 8,
  },
  {
    id: 4,
    title: "Мастер-класс по гончарному делу",
    description: "Создайте свою первую керамическую чашу под руководством мастера с 20-летним стажем. Все материалы включены.",
    shortDescription: "Создайте керамическую чашу своими руками",
    date: "10 мая 2026",
    time: "14:00",
    address: "ул. Ремесленная, д. 7",
    city: "Мышкин",
    category: "Мастер-класс",
    ageRestriction: "8+",
    image: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=600&h=400&fit=crop",
    organizerName: "Мастерская «Глина и огонь»",
    price: "1 200 ₽",
    isFree: false,
    sessions: [
      { date: "10 мая", time: "14:00", spotsLeft: 8 },
      { date: "11 мая", time: "14:00", spotsLeft: 12 },
    ],
    rating: 4.7,
    reviewCount: 31,
  },
  {
    id: 5,
    title: "Театральный фестиваль «Малая сцена»",
    description: "Три дня театрального искусства: спектакли камерных театров, читки пьес, встречи с режиссёрами и актёрами.",
    shortDescription: "Камерные спектакли, читки пьес, встречи с актёрами",
    date: "20 июня 2026",
    time: "17:00",
    endDate: "22 июня 2026",
    address: "Городской дом культуры",
    city: "Углич",
    category: "Театр",
    ageRestriction: "12+",
    image: "https://images.unsplash.com/photo-1503095396549-807759245b35?w=600&h=400&fit=crop",
    organizerName: "Театральное объединение «Малая сцена»",
    price: "300 ₽",
    isFree: false,
    sessions: [
      { date: "20 июня", time: "17:00", spotsLeft: 60 },
      { date: "21 июня", time: "17:00", spotsLeft: 55 },
      { date: "22 июня", time: "12:00", spotsLeft: 70 },
    ],
    rating: 4.5,
    reviewCount: 16,
  },
  {
    id: 6,
    title: "Экскурсия «Тайны старого города»",
    description: "Пешеходная экскурсия по историческому центру. Вы узнаете о купеческих династиях, архитектурных памятниках и городских легендах.",
    shortDescription: "Пешеходная экскурсия по историческому центру",
    date: "Каждую субботу",
    time: "11:00",
    address: "Сбор у Торговых рядов",
    city: "Елабуга",
    category: "Экскурсия",
    ageRestriction: "0+",
    image: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=600&h=400&fit=crop",
    organizerName: "Бюро экскурсий «Елабуга»",
    price: "400 ₽",
    isFree: false,
    sessions: [
      { date: "Каждую субботу", time: "11:00", spotsLeft: 20 },
    ],
    rating: 4.9,
    reviewCount: 42,
  },
];
