export const site = {
  name: 'Весовая Техника',
  domain: 'https://vesovaya.example',
  phone: '+7 (700) 000-00-00',
  email: 'sales@vesovaya.example',
  city: 'Петропавловск',
  country: 'KZ',
  address: 'Петропавловск, ул. Карима Сутюшева, 65',
  googleMapsUrl: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2345.987654321!2d69.131!3d54.871!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x43f9a3f7890abcde%3A0x1234567890abcdef!2z0YPQuy4g0JrQsNGA0LjQvNCwINCh0YPRgtGO0YjQtdCy0LAsIDY1LCDQn9C10YLRgNC-0L_QsNCy0LvQvtCy0YHQuiwg0JrQsNC30LDRhdGB0YLQsNC9!5e0!3m2!1sru!2skz!4v1710000000000!5m2!1sru!2skz',
  description: 'Производство, поставка, монтаж и обслуживание автомобильных, вагонных и промышленных весов.'
};

export const categories = [
  { slug: 'avtomobilnye-vesy', name: 'Автомобильные весы', short: 'автовесы', unit: 'тонн', capacities: [30, 40, 50, 60, 80, 100, 120] },
  { slug: 'vagonnye-vesy', name: 'Вагонные весы', short: 'вагонные весы', unit: 'тонн', capacities: [100, 150, 200, 250, 300, 400, 500] },
  { slug: 'platformennye-vesy', name: 'Платформенные весы', short: 'платформенные весы', unit: 'кг', capacities: [300, 600, 1000, 1500, 2000, 3000, 5000] },
  { slug: 'bunkernye-vesy', name: 'Бункерные весы', short: 'бункерные весы', unit: 'кг', capacities: [500, 1000, 2000, 3000, 5000, 10000, 20000] },
  { slug: 'konveyernye-vesy', name: 'Конвейерные весы', short: 'конвейерные весы', unit: 'т/ч', capacities: [50, 100, 200, 400, 600, 800, 1200] },
  { slug: 'kranovye-vesy', name: 'Крановые весы', short: 'крановые весы', unit: 'тонн', capacities: [1, 3, 5, 10, 15, 20, 30] },
  { slug: 'palletnye-vesy', name: 'Паллетные весы', short: 'паллетные весы', unit: 'кг', capacities: [600, 1000, 1500, 2000, 2500, 3000, 5000] },
  { slug: 'laboratornye-vesy', name: 'Лабораторные весы', short: 'лабораторные весы', unit: 'г', capacities: [200, 500, 1000, 2000, 5000, 10000, 20000] }
];

export const cities = [
  'Актобе',
  'Астана',
  'Алматы',
  'Караганда',
  'Костанай',
  'Павлодар',
  'Шымкент',
  'Атырау',
  'Уральск',
  'Кызылорда',
  'Петропавловск',
  'Усть-Каменогорск'
];

export const geoOffers = [
  { slug: 'avtovesy', name: 'автовесы', title: 'Автовесы' },
  { slug: 'vagonnye-vesy', name: 'вагонные весы', title: 'Вагонные весы' },
  { slug: 'montazh-vesov', name: 'монтаж весов', title: 'Монтаж весов' },
  { slug: 'poverka-vesov', name: 'поверка весов', title: 'Поверка весов' },
  { slug: 'servis-vesov', name: 'сервис весов', title: 'Сервис весов' }
];

export const services = [
  ['proizvodstvo-avtomobilnyh-vesov', 'Производство автомобильных весов'],
  ['proizvodstvo-vagonnyh-vesov', 'Производство вагонных весов'],
  ['proektirovanie-avtovesovoj', 'Проектирование автовесовой'],
  ['stroitelstvo-avtovesovoj', 'Строительство автовесовой'],
  ['montazh-avtovesov', 'Монтаж автовесов'],
  ['montazh-vagonnyh-vesov', 'Монтаж вагонных весов'],
  ['modernizaciya-vesov', 'Модернизация весов'],
  ['remont-vesov', 'Ремонт весов'],
  ['poverka-vesov', 'Поверка весов'],
  ['asu-vesovaya', 'АСУ весовая'],
  ['integraciya-s-1c', 'Интеграция весов с 1С']
];
