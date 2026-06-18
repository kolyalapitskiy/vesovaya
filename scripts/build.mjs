import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { categories, cities, geoOffers, services, site } from '../src/data/seo-pages.mjs';

const root = process.cwd();
const outDir = path.join(root, 'public');
const pages = [];

const esc = (value) => String(value).replace(/[&<>"']/g, (char) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
}[char]));

const citySlug = (city) => city.toLowerCase()
  .replaceAll(' ', '-')
  .replaceAll('а', 'a').replaceAll('б', 'b').replaceAll('в', 'v').replaceAll('г', 'g')
  .replaceAll('д', 'd').replaceAll('е', 'e').replaceAll('ё', 'e').replaceAll('ж', 'zh')
  .replaceAll('з', 'z').replaceAll('и', 'i').replaceAll('й', 'j').replaceAll('к', 'k')
  .replaceAll('л', 'l').replaceAll('м', 'm').replaceAll('н', 'n').replaceAll('о', 'o')
  .replaceAll('п', 'p').replaceAll('р', 'r').replaceAll('с', 's').replaceAll('т', 't')
  .replaceAll('у', 'u').replaceAll('ф', 'f').replaceAll('х', 'h').replaceAll('ц', 'c')
  .replaceAll('ч', 'ch').replaceAll('ш', 'sh').replaceAll('щ', 'sch').replaceAll('ъ', '')
  .replaceAll('ы', 'y').replaceAll('ь', '').replaceAll('э', 'e').replaceAll('ю', 'yu')
  .replaceAll('я', 'ya');

const unitSlug = (unit) => ({
  'тонн': 't',
  'кг': 'kg',
  'г': 'g',
  'т/ч': 'tch'
}[unit] ?? unit.replace(/[^a-z0-9]+/gi, '-').toLowerCase());

const projectSvg = (title, color = '#f3f4f6') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500"><rect width="800" height="500" fill="${color}"/><rect x="40" y="40" width="720" height="420" fill="none" stroke="rgba(0,0,0,0.05)" stroke-width="2"/><circle cx="400" cy="250" r="100" fill="rgba(0,0,0,0.02)"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="Inter, system-ui, Arial" font-size="28" fill="#111" font-weight="700">${title}</text><text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" font-family="Inter" font-size="14" fill="#666">Завод Весовой Техники</text></svg>`;

const logoSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" fill="none"><rect width="40" height="40" rx="4" fill="#000"/><path d="M10 20h20M15 25h10M20 15v10" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/><path d="M12 15l4-3 12 0 4 3" stroke="#fff" stroke-width="2" stroke-linejoin="round"/></svg>`;

const addPage = (page) => {
  pages.push({
    image: '/assets/hero.svg',
    ...page,
    url: page.url.endsWith('/') ? page.url : `${page.url}/`
  });
};

const breadcrumbJson = (items) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: items.map((item, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name: item.name,
    item: `${site.domain}${item.url}`
  }))
});

const renderLayout = (page) => {
  const canonical = `${site.domain}${page.url === '/' ? '/' : page.url}`;
  const crumbs = page.breadcrumbs ?? [{ name: 'Главная', url: '/' }, { name: page.h1, url: page.url }];
  const jsonLd = [breadcrumbJson(crumbs), ...(page.schema ?? [])];
  return `<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(page.title)}</title>
  <meta name="description" content="${esc(page.description)}">
  <link rel="canonical" href="${esc(canonical)}">
  <link rel="stylesheet" href="/assets/styles.css">
  <script src="/assets/lead-form.js" defer></script>
  ${jsonLd.map((data) => `<script type="application/ld+json">${JSON.stringify(data)}</script>`).join('\n  ')}
</head>
<body>
  <header class="topbar">
    <div class="container topbar-inner">
      <a class="brand" href="/">${logoSvg}<span>${site.name}</span></a>
      <button class="menu-toggle" aria-label="Открыть меню" onclick="document.body.classList.toggle('menu-open')"><span></span></button>
      <nav class="main-nav">
        <a href="/katalog/">Каталог</a>
        <a href="/uslugi/">Услуги</a>
        <a href="/geo/">Регионы</a>
        <a href="/kontakty/">Контакты</a>
        <a class="nav-phone" href="tel:${site.phone.replace(/[^\d+]/g, '')}">${site.phone}</a>
      </nav>
    </div>
  </header>
  <main>
    <div class="container">
      <nav class="breadcrumbs" aria-label="Хлебные крошки">
        ${crumbs.map((item, index) => index === crumbs.length - 1 ? `<span>${esc(item.name)}</span>` : `<a href="${item.url}">${esc(item.name)}</a>`).join(' <span class="sep">/</span> ')}
      </nav>
    </div>
    ${page.body}
  </main>
  <footer class="footer">
    <div class="container footer-grid">
      <div class="footer-info">
        <a class="brand" href="/">${logoSvg}<span>${site.name}</span></a>
        <p>Завод-производитель весоизмерительного оборудования. Собственное производство в Казахстане. Поставка, монтаж и сервисное обслуживание всех типов промышленных весов.</p>
        <div class="footer-contacts">
          <p><strong>Адрес:</strong> ${site.address}</p>
          <p><strong>Телефон:</strong> <a href="tel:${site.phone.replace(/[^\d+]/g, '')}">${site.phone}</a></p>
          <p><strong>Email:</strong> <a href="mailto:${site.email}">${site.email}</a></p>
        </div>
      </div>
      <div class="footer-map">
        <iframe src="${site.googleMapsUrl}" width="100%" height="240" style="border:0;" allowfullscreen="" loading="lazy"></iframe>
      </div>
      <nav class="footer-nav">
        <div class="footer-nav-col">
          <h4>Оборудование</h4>
          <a href="/katalog/avtomobilnye-vesy/">Автовесы</a>
          <a href="/katalog/vagonnye-vesy/">Вагонные весы</a>
          <a href="/katalog/">Каталог</a>
        </div>
        <div class="footer-nav-col">
          <h4>Услуги</h4>
          <a href="/uslugi/poverka-vesov/">Поверка</a>
          <a href="/uslugi/montazh-avtovesov/">Монтаж</a>
          <a href="/uslugi/">Сервис</a>
        </div>
      </nav>
    </div>
    <div class="container footer-bottom">
      <p>&copy; ${new Date().getFullYear()} ${site.name}. Все права защищены. Петропавловск, Казахстан.</p>
    </div>
  </footer>
</body>
</html>`;
};

const leadForm = `<form class="lead-form" data-lead-form>
  <input type="hidden" name="page_url" value="">
  <label class="hp">Сайт <input name="website" tabindex="-1" autocomplete="off"></label>
  <div class="form-grid">
    <label>Имя <input name="name" required placeholder="Иван"></label>
    <label>Телефон <input name="phone" required type="tel" placeholder="+7 (___) ___ __ __"></label>
    <label>Город <input name="city" placeholder="Петропавловск"></label>
    <label>Тип весов <select name="product"><option value="Автовесы">Автомобильные весы</option><option value="Вагонные весы">Вагонные весы</option><option value="Сервис">Сервис и поверка</option></select></label>
  </div>
  <label>Комментарий <textarea name="message" rows="3" placeholder="НПВ, длина платформы, объект..."></textarea></label>
  <button class="button" type="submit">Получить расчет</button>
  <p class="form-status" data-form-status></p>
</form>`;

const ctaSection = `<section class="cta-section">
  <div class="container">
    <div class="cta-card-outer">
      <div class="cta-text">
        <h2>Нужен расчет стоимости?</h2>
        <p>Оставьте заявку, и наш специалист подготовит детальное коммерческое предложение с учетом логистики, монтажа и первичной поверки.</p>
        <ul class="check-list-w">
          <li>Точный подбор под ваши задачи</li>
          <li>Чертежи фундамента бесплатно</li>
          <li>Гарантия до 5 лет</li>
        </ul>
      </div>
      <div class="cta-form-box card">
        ${leadForm}
      </div>
    </div>
  </div>
</section>`;

const richCatalogTemplate = (cat) => `<section class="container content-section">
  <div class="rich-text">
    <h1>${cat.name} от производителя</h1>
    <p class="lead">Профессиональное весовое оборудование для предприятий агропромышленного комплекса, добывающей отрасли и логистики. Собственное производство в Казахстане.</p>
    <div class="main-img-box"><img src="/assets/cat-${cat.slug}.svg" alt="${cat.name}"></div>
    <h2>Преимущества наших ${cat.short}</h2>
    <p>Мы производим ${cat.name.toLowerCase()}, которые отличаются повышенной надежностью металлоконструкции и высокой точностью измерений. Платформы весов проектируются с учетом экстремальных нагрузок и климатических условий региона.</p>
    <div class="grid col-2">
      <div class="card"><h4>Цифровая электроника</h4><p>Защита от помех, высокая скорость работы и возможность удаленной диагностики каждого тензодатчика.</p></div>
      <div class="card"><h4>Надежная сталь</h4><p>Используем только качественный металлопрокат с антикоррозийным покрытием для долгого срока службы.</p></div>
    </div>
  </div>
</section>
<section class="container">
  <h2>Модельный ряд</h2>
  <div class="grid col-4">
    ${cat.capacities.map(cap => `<a href="/katalog/${cat.slug}/${cap}-${unitSlug(cat.unit)}/" class="card model-item">
      <h3>${cap} ${cat.unit}</h3>
      <p>НПВ ${cap} ${cat.unit}</p>
      <span>Смотреть &rarr;</span>
    </a>`).join('')}
  </div>
</section>
${ctaSection}`;

const richModelTemplate = (cat, cap) => {
  const model = `${cat.name} ${cap} ${cat.unit}`;
  return `<section class="container content-section">
  <div class="product-layout">
    <div class="product-main">
      <h1>${model}</h1>
      <p class="lead">Промышленная весоизмерительная система повышенной надежности. Идеально подходит для объектов с высокой интенсивностью движения.</p>
      <div class="main-img-box"><img src="/assets/model-${cat.slug}-${cap}.svg" alt="${model}"></div>
      <div class="rich-text">
        <h2>Технические характеристики</h2>
        <table class="specs-table card">
          <tr><td>Наибольший предел взвешивания (НПВ)</td><td>${cap} ${cat.unit}</td></tr>
          <tr><td>Класс точности</td><td>Средний (III)</td></tr>
          <tr><td>Диапазон рабочих температур</td><td>-50°C ... +50°C</td></tr>
          <tr><td>Защита датчиков</td><td>IP68 (полная герметичность)</td></tr>
        </table>
        <h2>Описание решения</h2>
        <p>Модель ${model} разработана для тяжелых условий эксплуатации. Усиленная рама и специальные узлы встройки тензодатчиков гарантируют стабильность показаний при проезде любого транспорта.</p>
      </div>
    </div>
    <div class="product-aside">
      <div class="sticky-box card">
        <h3>Запросить КП</h3>
        <p>Оставьте контакты, и мы перезвоним для уточнения деталей.</p>
        ${leadForm}
      </div>
    </div>
  </div>
</section>
${ctaSection}`;
};

const richGeoTemplate = (city, offer) => `<section class="container content-section">
  <div class="rich-text">
    <h1>${offer.title} в г. ${city}</h1>
    <p class="lead">Прямые поставки оборудования и профессиональный сервис в регионе ${city}.</p>
    <div class="main-img-box"><img src="/assets/geo-${citySlug(city)}-${offer.slug}.svg" alt="${offer.title} в ${city}"></div>
    <h2>Локальный сервис в ${city}</h2>
    <p>Наличие мобильных сервисных бригад позволяет нам в кратчайшие сроки осуществлять монтаж, поверка и ремонт весов в ${city}. Мы работаем по всему региону, обеспечивая бесперебойную работу вашего весового хозяйства.</p>
    <div class="grid col-3">
      <div class="card"><h4>Своя логистика</h4><p>Быстрая доставка до вашего объекта в ${city}.</p></div>
      <div class="card"><h4>Выезд инженера</h4><p>Шеф-монтаж и обучение персонала в ${city}.</p></div>
      <div class="card"><h4>Документация</h4><p>Полный пакет документов для ГСИ РК.</p></div>
    </div>
  </div>
</section>
${ctaSection}`;

const richServiceTemplate = (slug, name) => `<section class="container content-section">
  <div class="rich-text">
    <h1>${name}</h1>
    <p class="lead">Весь спектр работ по обслуживанию промышленных весовых систем любой сложности.</p>
    <div class="main-img-box"><img src="/assets/service-${slug}.svg" alt="${name}"></div>
    <h2>Как мы выполняем ${name.toLowerCase()}</h2>
    <p>Наши инженеры имеют многолетний опыт работы с весовым оборудованием. При оказании услуги "${name}" мы используем только современное диагностическое оборудование и эталонные гири.</p>
    <div class="card service-steps">
      <h3>Порядок работ:</h3>
      <ol>
        <li>Аудит состояния весового оборудования</li>
        <li>Подготовка сметы и согласование сроков</li>
        <li>Выполнение работ по регламенту</li>
        <li>Тестирование и сдача объекта заказчику</li>
      </ol>
    </div>
  </div>
</section>
${ctaSection}`;

// Add Basic Pages
addPage({
  url: '/',
  title: 'Автомобильные и вагонные весы | Завод весовой техники',
  h1: 'Завод Весовой Техники',
  description: 'Производство, монтаж и сервис промышленных весов в Казахстане. Высокая точность, гарантия до 5 лет.',
  body: `<section class="hero-section">
    <div class="container">
      <p class="eyebrow">Завод весоизмерительного оборудования</p>
      <h1>Точность, которая работает на ваш бизнес</h1>
      <p>Проектируем и производим надежные весовые комплексы для транспорта и промышленности. Работаем по всему Казахстану.</p>
      <div class="hero-actions"><a href="/katalog/" class="button">В каталог</a><a href="/kontakty/" class="button outline">Контакты</a></div>
    </div>
  </section>
  <section class="container features-row">
    <div class="grid col-3">
      <div class="card"><h3>10+ лет</h3><p>Опыта в весостроении</p></div>
      <div class="card"><h3>800+</h3><p>Реализованных проектов</p></div>
      <div class="card"><h3>24/7</h3><p>Сервисная поддержка</p></div>
    </div>
  </section>
  <section class="container">
    <h2>Каталог оборудования</h2>
    <div class="grid col-2">
      ${categories.slice(0, 4).map(cat => `<a href="/katalog/${cat.slug}/" class="card cat-card"><h3>${cat.name}</h3><p>До ${cat.capacities[cat.capacities.length-1]} ${cat.unit}</p><span>Подробнее &rarr;</span></a>`).join('')}
    </div>
  </section>
  ${ctaSection}`
});

addPage({
  url: '/katalog/',
  title: 'Каталог весов | Производство промышленных весов',
  h1: 'Каталог',
  description: 'Все типы промышленных весов от производителя: автомобильные, вагонные, платформенные.',
  body: `<section class="container page-header"><h1>Каталог весов</h1></section>
  <section class="container grid col-3">
    ${categories.map(cat => `<a href="/katalog/${cat.slug}/" class="card"><h3>${cat.name}</h3><p>Производство и сервис.</p></a>`).join('')}
  </section>`
});

addPage({
  url: '/uslugi/',
  title: 'Услуги по весовому оборудованию | Завод весов',
  h1: 'Услуги',
  description: 'Монтаж, ремонт, поверка и модернизация всех видов промышленных весов.',
  body: `<section class="container page-header"><h1>Наши услуги</h1></section>
  <section class="container grid col-2">
    ${services.map(([slug, name]) => `<a href="/uslugi/${slug}/" class="card"><h3>${name}</h3><p>Экспертный сервис.</p></a>`).join('')}
  </section>`
});

addPage({
  url: '/geo/',
  title: 'Весы в городах Казахстана | География работы',
  h1: 'География',
  description: 'Поставляем и обслуживаем весы в Петропавловске, Астане, Алматы и других регионах.',
  body: `<section class="container page-header"><h1>География работы</h1></section>
  <section class="container grid col-4">
    ${cities.map(city => `<a href="/geo/${citySlug(city)}/avtovesy/" class="city-link">${city}</a>`).join('')}
  </section>`
});

addPage({
  url: '/kontakty/',
  title: 'Контакты завода весов | Петропавловск',
  h1: 'Контакты',
  description: 'Свяжитесь с нами: Петропавловск, ул. Карима Сутюшева, 65.',
  body: `<section class="container contact-section-page">
    <div class="contact-text">
      <h1>Контакты</h1>
      <div class="contact-item"><h4>Адрес офиса</h4><p>${site.address}</p></div>
      <div class="contact-item"><h4>Телефон</h4><p><a href="tel:${site.phone.replace(/[^\d+]/g, '')}">${site.phone}</a></p></div>
      <div class="contact-item"><h4>Email</h4><p><a href="mailto:${site.email}">${site.email}</a></p></div>
      <div class="contact-item"><h4>Режим работы</h4><p>Пн-Пт: 09:00 - 18:00</p></div>
    </div>
    <div class="contact-form-side card">
      <h3>Заказать расчет</h3>
      ${leadForm}
    </div>
  </section>
  <section class="container map-section">
    <div class="map-box card"><iframe src="${site.googleMapsUrl}" width="100%" height="500" style="border:0;" allowfullscreen="" loading="lazy"></iframe></div>
  </section>`
});

// Rich Data Pages
for (const cat of categories) {
  addPage({ url: `/katalog/${cat.slug}/`, title: `${cat.name} от производителя | Купить весы`, h1: cat.name, body: richCatalogTemplate(cat) });
  for (const cap of cat.capacities) {
    addPage({ url: `/katalog/${cat.slug}/${cap}-${unitSlug(cat.unit)}/`, title: `${cat.name} ${cap} ${cat.unit} | Цена и характеристики`, h1: `${cat.name} ${cap} ${cat.unit}`, body: richModelTemplate(cat, cap) });
  }
}
for (const city of cities) {
  for (const off of geoOffers) {
    addPage({ url: `/geo/${citySlug(city)}/${off.slug}/`, title: `${off.title} в г. ${city} — производство и монтаж`, h1: `${off.title} в ${city}`, body: richGeoTemplate(city, off) });
  }
}
for (const [slug, name] of services) {
  addPage({ url: `/uslugi/${slug}/`, title: `${name} — профессиональные услуги завода`, h1: name, body: richServiceTemplate(slug, name) });
}

// Build Logic
const pagePath = (url) => url === '/' ? path.join(outDir, 'index.html') : path.join(outDir, url, 'index.html');
await rm(outDir, { recursive: true, force: true });
await mkdir(path.join(outDir, 'assets'), { recursive: true });

for (const page of pages) {
  const file = pagePath(page.url);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, renderLayout(page));
}

// CSS with Layout Alignment Fixes
const css = `
:root {
  --b: #000; --w: #fff; --g1: #f9fafb; --g2: #f3f4f6; --g3: #e5e7eb; --g4: #9ca3af; --g5: #4b5563;
  --font: 'Inter', system-ui, -apple-system, sans-serif;
}
* { box-sizing: border-box; min-width: 0; }
body { margin: 0; font-family: var(--font); color: var(--b); background: var(--w); line-height: 1.6; overflow-x: hidden; }
a { color: inherit; text-decoration: none; }

.container { width: 100%; max-width: 1240px; margin: 0 auto; padding: 0 24px; }

/* Topbar */
.topbar { background: var(--w); border-bottom: 1px solid var(--g3); position: sticky; top: 0; z-index: 1000; }
.topbar-inner { display: flex; align-items: center; justify-content: space-between; height: 72px; }
.brand { display: flex; align-items: center; gap: 10px; font-weight: 900; font-size: 18px; text-transform: uppercase; letter-spacing: -0.5px; }
.brand svg { width: 32px; height: 32px; flex-shrink: 0; }
.main-nav { display: flex; gap: 32px; align-items: center; }
.main-nav a:hover { opacity: 0.6; }
.nav-phone { font-weight: 800; border: 2px solid var(--b); padding: 8px 16px; border-radius: 4px; }

.menu-toggle { display: none; background: none; border: 0; padding: 10px; cursor: pointer; }
.menu-toggle span { display: block; width: 20px; height: 2px; background: var(--b); position: relative; }
.menu-toggle span::before, .menu-toggle span::after { content:''; display: block; width: 20px; height: 2px; background: var(--b); position: absolute; }
.menu-toggle span::before { top: -6px; }
.menu-toggle span::after { bottom: 6px; }

/* Global Components */
section { padding: 60px 0; }
.grid { display: grid; gap: 32px; }
.col-2 { grid-template-columns: repeat(2, 1fr); }
.col-3 { grid-template-columns: repeat(3, 1fr); }
.col-4 { grid-template-columns: repeat(4, 1fr); }
.card { background: var(--g1); border: 1px solid var(--g3); padding: 32px; border-radius: 8px; }
.button { display: inline-block; padding: 14px 28px; background: var(--b); color: var(--w); font-weight: 700; border: 0; border-radius: 4px; cursor: pointer; text-align: center; }
.button.outline { background: transparent; border: 2px solid var(--b); color: var(--b); }

/* Breadcrumbs */
.breadcrumbs { padding: 24px 0; font-size: 13px; color: var(--g5); }
.sep { color: var(--g3); margin: 0 8px; }

/* Hero */
.hero-section { background: var(--g1); padding: 100px 0; border-bottom: 1px solid var(--g3); margin-bottom: 80px; }
.hero-section h1 { font-size: clamp(34px, 5vw, 64px); line-height: 1.1; margin: 20px 0; font-weight: 900; }
.hero-section p { font-size: 20px; color: var(--g5); max-width: 700px; margin-bottom: 40px; }
.hero-actions { display: flex; gap: 16px; }
.eyebrow { text-transform: uppercase; font-weight: 700; letter-spacing: 2px; font-size: 14px; color: var(--g4); }

/* Content Sections */
.rich-text h1 { font-size: clamp(32px, 4vw, 48px); line-height: 1.1; margin-bottom: 24px; font-weight: 900; }
.rich-text h2 { font-size: 32px; margin: 48px 0 24px; font-weight: 800; }
.rich-text p { font-size: 18px; color: var(--g5); margin-bottom: 24px; }
.lead { font-size: 22px !important; color: var(--b) !important; font-weight: 500; margin-bottom: 32px; }
.main-img-box { margin: 40px 0; border-radius: 12px; overflow: hidden; border: 1px solid var(--g3); line-height: 0; }
.main-img-box img { width: 100%; height: auto; }

/* Lead Form */
.lead-form { display: flex; flex-direction: column; gap: 20px; width: 100%; }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.lead-form label { font-size: 12px; font-weight: 700; text-transform: uppercase; display: flex; flex-direction: column; gap: 8px; color: var(--g5); }
.lead-form input, .lead-form select, .lead-form textarea { padding: 12px; border: 1px solid var(--g3); border-radius: 4px; font-family: inherit; font-size: 15px; width: 100%; }
.lead-form input:focus { border-color: var(--b); outline: 0; }
.hp { display: none; }

/* CTA Section Fix */
.cta-section { background: var(--b); color: var(--w); margin: 40px 0; border-radius: 16px; overflow: hidden; }
.cta-card-outer { display: grid; grid-template-columns: 1fr 480px; gap: 80px; align-items: center; padding: 60px 0; }
.cta-text h2 { font-size: 42px; margin: 0 0 20px; font-weight: 800; }
.cta-text p { font-size: 19px; color: var(--g4); margin: 0; }
.check-list-w { list-style: none; padding: 0; margin: 32px 0 0; display: flex; flex-direction: column; gap: 12px; }
.check-list-w li::before { content: '✓'; color: var(--g4); margin-right: 12px; font-weight: 900; }
.cta-form-box { background: var(--w); color: var(--b); padding: 40px; }

/* Product Layout */
.product-layout { display: grid; grid-template-columns: 1fr 420px; gap: 80px; }
.specs-table { width: 100%; border-collapse: collapse; margin-top: 24px; background: var(--w); }
.specs-table td { padding: 16px 20px; border-bottom: 1px solid var(--g3); }
.specs-table td:last-child { text-align: right; font-weight: 800; }
.sticky-box { position: sticky; top: 100px; }

/* Geo Link Styling */
.city-link { display: block; padding: 20px; background: var(--g1); border: 1px solid var(--g3); border-radius: 8px; text-align: center; font-weight: 600; font-size: 16px; transition: all 0.2s; }
.city-link:hover { background: var(--b); color: var(--w); border-color: var(--b); transform: translateY(-3px); box-shadow: 0 4px 12px rgba(0,0,0,0.1); }

/* Footer */
.footer { background: var(--g1); border-top: 1px solid var(--g3); padding: 80px 0 40px; color: var(--b); margin-top: 100px; }
.footer-grid { display: grid; grid-template-columns: 1.5fr 1.5fr 1fr; gap: 60px; align-items: start; }
.footer-info p { margin: 24px 0; color: var(--g5); font-size: 15px; max-width: 360px; }
.footer-contacts p { margin: 8px 0; font-size: 15px; }
.footer-contacts strong { color: var(--g5); font-size: 12px; text-transform: uppercase; display: block; margin-bottom: 4px; }

.footer-map { border-radius: 8px; overflow: hidden; border: 1px solid var(--g3); line-height: 0; }
.footer-nav { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; }
.footer-nav h4 { font-size: 13px; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 20px; }
.footer-nav a { display: block; margin-bottom: 12px; font-size: 15px; color: var(--g5); }
.footer-nav a:hover { color: var(--b); }

.footer-bottom { margin-top: 60px; padding-top: 30px; border-top: 1px solid var(--g3); font-size: 13px; color: var(--g4); display: flex; justify-content: space-between; }

/* Contact Page Map Fix */
.map-section { margin-top: 40px; padding-top: 0; }

/* Mobile Adaptivity */
@media (max-width: 1100px) {
  .cta-card-outer { grid-template-columns: 1fr; gap: 40px; padding: 40px 0; }
  .product-layout, .contact-section-page { grid-template-columns: 1fr; gap: 60px; }
  .footer-grid { grid-template-columns: 1fr 1fr; }
  .footer-nav { grid-column: span 2; }
}

@media (max-width: 768px) {
  .main-nav { display: none; }
  .menu-toggle { display: block; }
  .menu-open .main-nav { 
    display: flex; flex-direction: column; position: fixed; top: 72px; left: 0; width: 100%; 
    background: var(--w); border-bottom: 1px solid var(--g3); padding: 40px 24px; gap: 24px; 
    box-shadow: 0 10px 30px rgba(0,0,0,0.1); 
  }
  .col-2, .col-3, .col-4 { grid-template-columns: 1fr; }
  .form-grid { grid-template-columns: 1fr; }
  .footer-grid { grid-template-columns: 1fr; gap: 40px; }
  .footer-nav { grid-column: auto; }
  .hero-actions { flex-direction: column; }
  .cta-text h2 { font-size: 32px; }
  .cta-form-box { padding: 30px 20px; }
}
`;
await writeFile(path.join(outDir, 'assets', 'styles.css'), css);

await writeFile(path.join(outDir, 'assets', 'lead-form.js'), `document.addEventListener('submit', async (e) => {
  const f = e.target.closest('[data-lead-form]'); if(!f) return; e.preventDefault();
  const s = f.querySelector('[data-form-status]');
  f.querySelector('[name="page_url"]').value = window.location.href;
  s.textContent = 'Отправка...';
  try {
    const r = await fetch('/api/leads', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(Object.fromEntries(new FormData(f))) });
    if(!r.ok) throw new Error();
    f.reset(); s.textContent = 'Успешно отправлено!';
  } catch { s.textContent = 'Ошибка. Попробуйте снова.'; }
});`);

// Assets
await writeFile(path.join(outDir, 'assets', 'hero.svg'), projectSvg('Весовая Техника'));
await writeFile(path.join(outDir, 'assets', 'project-3.svg'), projectSvg('Сервис и Монтаж'));
for(const cat of categories) {
  await writeFile(path.join(outDir, 'assets', `cat-${cat.slug}.svg`), projectSvg(cat.name));
  for(const cap of cat.capacities) {
    await writeFile(path.join(outDir, 'assets', `model-${cat.slug}-${cap}.svg`), projectSvg(`${cat.short} ${cap}${cat.unit}`));
  }
}
for(const city of cities) {
  for(const off of geoOffers) {
    await writeFile(path.join(outDir, 'assets', `geo-${citySlug(city)}-${off.slug}.svg`), projectSvg(`${off.title}\n${city}`));
  }
}
for(const [slug, name] of services) {
  await writeFile(path.join(outDir, 'assets', `service-${slug}.svg`), projectSvg(name));
}

console.log('Built 140 pages with spacing fixes and styled geo links.');
