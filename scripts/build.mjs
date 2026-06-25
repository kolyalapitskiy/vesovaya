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

const logoSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" fill="none"><rect width="40" height="40" rx="8" fill="#f97316"/><path d="M8 22h24M12 26h16M20 14v12" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/><path d="M10 17l4-4 12 0 4 4" stroke="#fff" stroke-width="2" stroke-linejoin="round"/></svg>`;

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

const organizationJson = () => ({
  '@context': 'https://schema.org',
  '@type': 'Organization',
  'name': site.name,
  'url': site.domain,
  'logo': `${site.domain}/assets/logo.svg`,
  'contactPoint': {
    '@type': 'ContactPoint',
    'telephone': site.phone,
    'contactType': 'sales',
    'email': site.email
  },
  'address': {
    '@type': 'PostalAddress',
    'streetAddress': site.address,
    'addressLocality': site.city,
    'addressCountry': site.country
  }
});

const websiteJson = () => ({
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  'name': site.name,
  'url': site.domain,
  'potentialAction': {
    '@type': 'SearchAction',
    'target': `${site.domain}/katalog/?q={search_term_string}`,
    'query-input': 'required name=search_term_string'
  }
});

const productJson = (cat, cap) => {
  const model = `${cat.name} ${cap} ${cat.unit}`;
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    'name': model,
    'image': `${site.domain}/assets/model-${cat.slug}-${cap}.svg`,
    'description': `Промышленная весоизмерительная система повышенной надежности. НПВ ${cap} ${cat.unit}.`,
    'offers': {
      '@type': 'AggregateOffer',
      'priceCurrency': 'KZT',
      'lowPrice': '500000',
      'offerCount': '1',
      'priceSpecification': {
        '@type': 'PriceSpecification',
        'valueAddedTaxIncluded': true
      }
    }
  };
};

const serviceJson = (slug, name) => ({
  '@context': 'https://schema.org',
  '@type': 'Service',
  'serviceType': name,
  'provider': {
    '@type': 'Organization',
    'name': site.name,
    'url': site.domain
  },
  'description': `Услуга ${name.toLowerCase()} от официального завода весового оборудования в Казахстане.`
});

const faqJson = () => ({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  'mainEntity': [
    {
      '@type': 'Question',
      'name': 'Каковы сроки производства промышленных весов?',
      'acceptedAnswer': {
        '@type': 'Answer',
        'text': 'Обычно срок производства автомобильных и вагонных весов составляет от 10 до 20 рабочих дней в зависимости от загруженности завода.'
      }
    },
    {
      '@type': 'Question',
      'name': 'Предоставляется ли гарантия на весы?',
      'acceptedAnswer': {
        '@type': 'Answer',
        'text': 'Да, мы предоставляем официальную гарантию от завода-производителя до 5 лет на все металлоконструкции и электронику.'
      }
    }
  ]
});

const renderLayout = (page) => {
  const canonical = `${site.domain}${page.url === '/' ? '/' : page.url}`;
  const crumbs = page.breadcrumbs ?? [{ name: 'Главная', url: '/' }, { name: page.h1, url: page.url }];
  const jsonLd = [breadcrumbJson(crumbs), ...(page.schema ?? [])];
  const imageUrl = page.image ? `${site.domain}${page.image}` : `${site.domain}/assets/hero.svg`;
  return `<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(page.title)}</title>
  <meta name="description" content="${esc(page.description)}">
  <link rel="canonical" href="${esc(canonical)}">
  <link rel="stylesheet" href="/assets/styles.css">
  
  <!-- Open Graph -->
  <meta property="og:title" content="${esc(page.title)}">
  <meta property="og:description" content="${esc(page.description)}">
  <meta property="og:type" content="${page.url === '/' ? 'website' : 'article'}">
  <meta property="og:url" content="${esc(canonical)}">
  <meta property="og:image" content="${esc(imageUrl)}">
  <meta property="og:site_name" content="${esc(site.name)}">

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
<section class="container" style="padding-top: 0;">
  <h2 style="font-size: 28px; font-weight: 800; margin-bottom: 24px;">Другие направления в г. ${city}</h2>
  <div class="grid col-5">
    ${geoOffers.map(off => {
      const isActive = off.slug === offer.slug;
      const borderStyle = isActive ? 'border: 2px solid var(--b); background: var(--w);' : '';
      return `<a href="/geo/${citySlug(city)}/${off.slug}/" class="card" style="padding: 20px; display: flex; flex-direction: column; justify-content: space-between; min-height: 120px; ${borderStyle}">
        <h4 style="margin: 0 0 8px; font-size: 15px; font-weight: 800;">${off.title}</h4>
        <span style="font-size: 12px; font-weight: 700; opacity: ${isActive ? '0.4' : '1'};">
          ${isActive ? 'Текущая страница' : 'Подробнее &rarr;'}
        </span>
      </a>`;
    }).join('')}
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
  schema: [organizationJson(), websiteJson(), faqJson()],
  body: `<section class="hero-section">
    <div class="container">
      <p class="eyebrow">Завод Весового Оборудования в Казахстане</p>
      <h1>Промышленные весы для логистики и строительства</h1>
      <p>Собственное производство весов полного цикла в Казахстане. Доставка, профессиональный монтаж и калибровка весовых комплексов по всей стране.</p>
      <div class="hero-actions"><a href="/katalog/" class="button">В каталог</a><a href="/kontakty/" class="button outline">Получить консультацию</a></div>
    </div>
  </section>
  <section class="container features-row" style="padding-top: 0; margin-bottom: 40px;">
    <div class="grid col-3">
      <div class="card">
        <h3>Собственный завод</h3>
        <p>Производство в Казахстане. Конструкции адаптированы под резкие температурные перепады и климат регионов.</p>
      </div>
      <div class="card">
        <h3>Реестр ГСИ РК</h3>
        <p>Оборудование сертифицировано в Казахстане. Поставляется с пакетом документов и первичной поверкой.</p>
      </div>
      <div class="card">
        <h3>Мобильный сервис</h3>
        <p>Собственные выездные бригады. Пусконаладка, калибровка и сервисное обслуживание в любом регионе РК.</p>
      </div>
    </div>
  </section>
  <section class="container solutions-section" style="padding: 40px 24px; margin-bottom: 60px;">
    <h2 style="font-size: 32px; font-weight: 800; margin-bottom: 32px;">Отраслевые весовые решения</h2>
    <div class="grid col-3">
      <div class="card" style="display: flex; flex-direction: column; justify-content: space-between;">
        <div>
          <h4 style="font-size: 18px; margin: 0 0 12px; font-weight: 800;">Для логистики и складов</h4>
          <p style="color: var(--g5); font-size: 15px; margin-bottom: 20px; line-height: 1.5;">Автомобильные весы с автоматизацией взвешивания (АСУ «Весовая») и интеграцией с 1С. Исключают человеческий фактор и ускоряют учет грузов.</p>
        </div>
        <a href="/katalog/avtomobilnye-vesy/" style="font-weight: 700; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Автовесы &rarr;</a>
      </div>
      <div class="card" style="display: flex; flex-direction: column; justify-content: space-between;">
        <div>
          <h4 style="font-size: 18px; margin: 0 0 12px; font-weight: 800;">Для строительства и карьеров</h4>
          <p style="color: var(--g5); font-size: 15px; margin-bottom: 20px; line-height: 1.5;">Усиленные платформы автомобильных и платформенных весов повышенной жесткости для тяжелой строительной техники и учета инертных материалов.</p>
        </div>
        <a href="/katalog/platformennye-vesy/" style="font-weight: 700; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Платформенные &rarr;</a>
      </div>
      <div class="card" style="display: flex; flex-direction: column; justify-content: space-between;">
        <div>
          <h4 style="font-size: 18px; margin: 0 0 12px; font-weight: 800;">Для агрокомплексов и элеваторов</h4>
          <p style="color: var(--g5); font-size: 15px; margin-bottom: 20px; line-height: 1.5;">Бункерные, вагонные и платформенные весовые комплексы для точной приемки, фасовки и отгрузки зерновых культур и сырья.</p>
        </div>
        <a href="/katalog/" style="font-weight: 700; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Все решения &rarr;</a>
      </div>
    </div>
  </section>
  <section class="container" style="padding-top: 0;">
    <h2 style="font-size: 32px; font-weight: 800; margin-bottom: 32px;">Каталог оборудования</h2>
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
  breadcrumbs: [
    { name: 'Главная', url: '/' },
    { name: 'Каталог', url: '/katalog/' }
  ],
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
  breadcrumbs: [
    { name: 'Главная', url: '/' },
    { name: 'Услуги', url: '/uslugi/' }
  ],
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
  breadcrumbs: [
    { name: 'Главная', url: '/' },
    { name: 'География', url: '/geo/' }
  ],
  body: `<section class="container page-header">
    <h1>География работы по регионам</h1>
    <p style="font-size: 18px; color: var(--g5); max-width: 600px; margin: 8px 0 0;">Поставляем и обслуживаем весы во всех городах Казахстана. Собственные выездные бригады.</p>
  </section>
  <section class="geo-grid-section">
    <div class="container">
      <div class="grid col-4">
        ${cities.map(city => `<a href="/geo/${citySlug(city)}/avtovesy/" class="city-link">${city}</a>`).join('')}
      </div>
    </div>
  </section>`
});

addPage({
  url: '/kontakty/',
  title: 'Контакты завода весов | Петропавловск',
  h1: 'Контакты',
  description: 'Свяжитесь с нами: Петропавловск, ул. Карима Сутюшева, 65.',
  breadcrumbs: [
    { name: 'Главная', url: '/' },
    { name: 'Контакты', url: '/kontakty/' }
  ],
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
  addPage({
    url: `/katalog/${cat.slug}/`,
    title: `${cat.name} от производителя | Купить весы`,
    h1: cat.name,
    breadcrumbs: [
      { name: 'Главная', url: '/' },
      { name: 'Каталог', url: '/katalog/' },
      { name: cat.name, url: `/katalog/${cat.slug}/` }
    ],
    body: richCatalogTemplate(cat)
  });
  for (const cap of cat.capacities) {
    addPage({
      url: `/katalog/${cat.slug}/${cap}-${unitSlug(cat.unit)}/`,
      title: `${cat.name} ${cap} ${cat.unit} | Цена и характеристики`,
      h1: `${cat.name} ${cap} ${cat.unit}`,
      image: `/assets/model-${cat.slug}-${cap}.svg`,
      breadcrumbs: [
        { name: 'Главная', url: '/' },
        { name: 'Каталог', url: '/katalog/' },
        { name: cat.name, url: `/katalog/${cat.slug}/` },
        { name: `${cat.name} ${cap} ${cat.unit}`, url: `/katalog/${cat.slug}/${cap}-${unitSlug(cat.unit)}/` }
      ],
      schema: [productJson(cat, cap)],
      body: richModelTemplate(cat, cap)
    });
  }
}
for (const city of cities) {
  for (const off of geoOffers) {
    addPage({
      url: `/geo/${citySlug(city)}/${off.slug}/`,
      title: `${off.title} в г. ${city} — производство и монтаж`,
      h1: `${off.title} в ${city}`,
      image: `/assets/geo-${citySlug(city)}-${off.slug}.svg`,
      breadcrumbs: [
        { name: 'Главная', url: '/' },
        { name: 'Регионы', url: '/geo/' },
        { name: `${off.title} в ${city}`, url: `/geo/${citySlug(city)}/${off.slug}/` }
      ],
      body: richGeoTemplate(city, off)
    });
  }
}
for (const [slug, name] of services) {
  addPage({
    url: `/uslugi/${slug}/`,
    title: `${name} — профессиональные услуги завода`,
    h1: name,
    image: `/assets/service-${slug}.svg`,
    breadcrumbs: [
      { name: 'Главная', url: '/' },
      { name: 'Услуги', url: '/uslugi/' },
      { name: name, url: `/uslugi/${slug}/` }
    ],
    schema: [serviceJson(slug, name)],
    body: richServiceTemplate(slug, name)
  });
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
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

:root {
  --navy: #0f1f3d; --navy-light: #162847; --navy-mid: #1e3a6e;
  --blue: #1a56db; --blue-light: #3b82f6;
  --orange: #f97316; --orange-dark: #ea6c0a; --orange-light: #fed7aa;
  --b: #0f1f3d; --w: #ffffff;
  --g1: #f8fafc; --g2: #f1f5f9; --g3: #e2e8f0; --g4: #94a3b8; --g5: #475569; --g6: #334155;
  --font: 'Inter', system-ui, -apple-system, sans-serif;
  --radius: 12px; --radius-sm: 8px;
  --shadow: 0 4px 24px rgba(15,31,61,0.10);
  --shadow-lg: 0 8px 48px rgba(15,31,61,0.15);
}
* { box-sizing: border-box; min-width: 0; }
body { margin: 0; font-family: var(--font); color: var(--b); background: var(--w); line-height: 1.6; overflow-x: hidden; }
a { color: inherit; text-decoration: none; }
img { display: block; max-width: 100%; }

.container { width: 100%; max-width: 1240px; margin: 0 auto; padding: 0 24px; }

/* Topbar */
.topbar { background: var(--navy); border-bottom: 1px solid rgba(255,255,255,0.08); position: sticky; top: 0; z-index: 1000; backdrop-filter: blur(12px); }
.topbar-inner { display: flex; align-items: center; justify-content: space-between; height: 72px; }
.brand { display: flex; align-items: center; gap: 12px; font-weight: 900; font-size: 18px; text-transform: uppercase; letter-spacing: -0.5px; color: var(--w); }
.brand svg { width: 36px; height: 36px; flex-shrink: 0; }
.main-nav { display: flex; gap: 28px; align-items: center; }
.main-nav a { color: rgba(255,255,255,0.75); font-weight: 500; font-size: 15px; transition: color 0.2s; }
.main-nav a:hover { color: var(--w); }
.nav-phone { font-weight: 800 !important; color: var(--w) !important; background: var(--orange); padding: 9px 20px; border-radius: var(--radius-sm); font-size: 14px !important; transition: background 0.2s, transform 0.15s !important; }
.nav-phone:hover { background: var(--orange-dark) !important; transform: translateY(-1px); }

.menu-toggle { display: none; background: none; border: 0; padding: 10px; cursor: pointer; }
.menu-toggle span { display: block; width: 22px; height: 2px; background: var(--w); position: relative; }
.menu-toggle span::before, .menu-toggle span::after { content:''; display: block; width: 22px; height: 2px; background: var(--w); position: absolute; }
.menu-toggle span::before { top: -7px; }
.menu-toggle span::after { bottom: 7px; }

/* Global Components */
section { padding: 80px 0; }
.grid { display: grid; gap: 28px; }
.col-2 { grid-template-columns: repeat(2, 1fr); }
.col-3 { grid-template-columns: repeat(3, 1fr); }
.col-4 { grid-template-columns: repeat(4, 1fr); }

.card { background: var(--w); border: 1px solid var(--g3); padding: 32px; border-radius: var(--radius); box-shadow: var(--shadow); transition: transform 0.25s, box-shadow 0.25s, border-color 0.25s; }
.card:hover { transform: translateY(-4px); box-shadow: var(--shadow-lg); border-color: var(--orange); }

.button { display: inline-flex; align-items: center; justify-content: center; padding: 15px 32px; background: var(--orange); color: var(--w); font-weight: 700; font-size: 16px; border: 0; border-radius: var(--radius-sm); cursor: pointer; text-align: center; transition: background 0.2s, transform 0.15s, box-shadow 0.2s; box-shadow: 0 4px 16px rgba(249,115,22,0.35); gap: 8px; }
.button:hover { background: var(--orange-dark); transform: translateY(-2px); box-shadow: 0 6px 24px rgba(249,115,22,0.45); }
.button.outline { background: transparent; border: 2px solid rgba(255,255,255,0.6); color: var(--w); box-shadow: none; }
.button.outline:hover { border-color: var(--w); background: rgba(255,255,255,0.1); }
.button.dark { background: var(--navy); box-shadow: 0 4px 16px rgba(15,31,61,0.25); }
.button.dark:hover { background: var(--navy-light); }

.eyebrow { display: inline-block; text-transform: uppercase; font-weight: 700; letter-spacing: 2px; font-size: 13px; color: var(--orange); background: rgba(249,115,22,0.1); padding: 4px 14px; border-radius: 100px; margin-bottom: 16px; }

/* Breadcrumbs */
.breadcrumbs { padding: 20px 0; font-size: 13px; color: var(--g4); }
.sep { color: var(--g3); margin: 0 8px; }
.breadcrumbs a:hover { color: var(--orange); }

/* Content / Rich Text */
.rich-text h1 { font-size: clamp(32px, 4vw, 48px); line-height: 1.1; margin-bottom: 24px; font-weight: 900; color: var(--navy); }
.rich-text h2 { font-size: 30px; margin: 48px 0 20px; font-weight: 800; color: var(--navy); }
.rich-text p { font-size: 17px; color: var(--g5); margin-bottom: 24px; line-height: 1.75; }
.lead { font-size: 21px !important; color: var(--navy) !important; font-weight: 500; margin-bottom: 32px !important; }
.main-img-box { margin: 40px 0; border-radius: var(--radius); overflow: hidden; border: 1px solid var(--g3); line-height: 0; box-shadow: var(--shadow); }
.main-img-box img { width: 100%; height: auto; }

/* Page Header */
.page-header { padding: 48px 0 36px !important; }
.page-header h1 { font-size: clamp(28px, 3.5vw, 48px); font-weight: 900; margin: 8px 0 0; color: var(--navy); }

/* Lead Form */
.lead-form { display: flex; flex-direction: column; gap: 16px; width: 100%; }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.lead-form label { font-size: 12px; font-weight: 700; text-transform: uppercase; display: flex; flex-direction: column; gap: 6px; color: var(--g5); }
.lead-form input, .lead-form select, .lead-form textarea { padding: 13px 16px; border: 1.5px solid var(--g3); border-radius: var(--radius-sm); font-family: inherit; font-size: 15px; width: 100%; color: var(--navy); background: var(--g1); transition: border-color 0.2s, box-shadow 0.2s; }
.lead-form input:focus, .lead-form select:focus, .lead-form textarea:focus { border-color: var(--orange); outline: 0; box-shadow: 0 0 0 3px rgba(249,115,22,0.15); background: var(--w); }
.lead-form .button { width: 100%; font-size: 17px; padding: 17px; }
.form-status { font-size: 14px; text-align: center; color: var(--g5); min-height: 20px; }

/* CTA Section */
.cta-section { background: linear-gradient(135deg, var(--navy) 0%, var(--navy-mid) 100%); margin: 0; border-radius: 0; padding: 100px 0 !important; position: relative; overflow: hidden; }
.cta-section::before { content: ''; position: absolute; top: -250px; right: -100px; width: 700px; height: 700px; background: radial-gradient(circle, rgba(249,115,22,0.10) 0%, transparent 60%); }
.cta-card-outer { display: grid; grid-template-columns: 1fr 500px; gap: 80px; align-items: center; position: relative; z-index: 1; }
.cta-text h2 { font-size: clamp(28px, 3.5vw, 48px); font-weight: 900; color: var(--w); margin: 0 0 20px; letter-spacing: -0.5px; }
.cta-text p { font-size: 18px; color: rgba(255,255,255,0.65); margin: 0 0 32px; line-height: 1.65; }
.check-list-w { list-style: none; padding: 0; display: flex; flex-direction: column; gap: 14px; }
.check-list-w li { display: flex; align-items: center; gap: 12px; font-size: 16px; color: rgba(255,255,255,0.85); font-weight: 500; }
.check-list-w li::before { content: '\u2713'; width: 24px; height: 24px; background: var(--orange); border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-weight: 900; font-size: 12px; color: var(--w); flex-shrink: 0; }
.cta-form-box { background: var(--w); border-radius: var(--radius); padding: 44px; box-shadow: 0 24px 80px rgba(0,0,0,0.25); }
.cta-form-box h3 { font-size: 22px; font-weight: 800; color: var(--navy); margin: 0 0 8px; }
.cta-form-box .form-subtitle { font-size: 14px; color: var(--g5); margin-bottom: 28px; }

/* Product Layout */
.product-layout { display: grid; grid-template-columns: 1fr 420px; gap: 80px; }
.specs-table { width: 100%; border-collapse: collapse; margin-top: 24px; background: var(--w); border-radius: var(--radius); overflow: hidden; border: 1px solid var(--g3); }
.specs-table td { padding: 16px 20px; border-bottom: 1px solid var(--g3); font-size: 15px; }
.specs-table td:first-child { color: var(--g5); }
.specs-table td:last-child { text-align: right; font-weight: 800; color: var(--navy); }
.specs-table tr:last-child td { border-bottom: 0; }
.sticky-box { position: sticky; top: 100px; }

/* Geo / City Grid */
.geo-grid-section { background: var(--g1); padding: 60px 0; }
.geo-grid-section .city-link { background: var(--w); box-shadow: var(--shadow); border-radius: var(--radius); padding: 24px 20px; font-weight: 700; font-size: 16px; }
.geo-grid-section .city-link:hover { background: var(--navy); color: var(--w); border-color: var(--navy); transform: translateY(-3px); box-shadow: var(--shadow-lg); }

.city-link { display: block; padding: 20px 24px; background: var(--g1); border: 1px solid var(--g3); border-radius: var(--radius); text-align: center; font-weight: 700; font-size: 16px; transition: all 0.2s; color: var(--navy); }
.city-link:hover { background: var(--navy); color: var(--w); border-color: var(--navy); transform: translateY(-3px); box-shadow: var(--shadow-lg); }

/* Footer */
.footer { background: var(--navy); border-top: 1px solid rgba(255,255,255,0.08); padding: 80px 0 0; color: var(--w); margin-top: 40px; }
.footer-grid { display: grid; grid-template-columns: 1.5fr 1.5fr 1fr; gap: 60px; align-items: start; }
.footer .brand { color: var(--w); }
.footer-info p { margin: 20px 0; color: rgba(255,255,255,0.55); font-size: 15px; max-width: 340px; line-height: 1.7; }
.footer-contacts p { margin: 8px 0; font-size: 15px; color: rgba(255,255,255,0.7); }
.footer-contacts strong { color: rgba(255,255,255,0.35); font-size: 11px; text-transform: uppercase; display: block; margin-bottom: 2px; }
.footer-contacts a:hover { color: var(--orange); }
.footer-map { border-radius: var(--radius); overflow: hidden; border: 1px solid rgba(255,255,255,0.1); line-height: 0; }
.footer-nav { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; }
.footer-nav h4 { font-size: 12px; text-transform: uppercase; letter-spacing: 1.5px; margin: 0 0 20px; color: rgba(255,255,255,0.35); }
.footer-nav a { display: block; margin-bottom: 12px; font-size: 15px; color: rgba(255,255,255,0.6); transition: color 0.2s; }
.footer-nav a:hover { color: var(--orange); }
.footer-bottom { margin-top: 60px; padding: 24px 0; border-top: 1px solid rgba(255,255,255,0.08); font-size: 13px; color: rgba(255,255,255,0.3); display: flex; justify-content: space-between; }

/* Utility */
.map-section { margin-top: 40px; padding-top: 0; }

/* Responsive */
@media (max-width: 1100px) {
  .cta-card-outer { grid-template-columns: 1fr; gap: 48px; }
  .cta-form-box { max-width: 600px; }
  .product-layout { grid-template-columns: 1fr; gap: 60px; }
  .footer-grid { grid-template-columns: 1fr 1fr; }
  .footer-nav { grid-column: span 2; }
}

@media (max-width: 768px) {
  .main-nav { display: none; }
  .menu-toggle { display: block; }
  .menu-open .main-nav { display: flex; flex-direction: column; position: fixed; top: 72px; left: 0; width: 100%; background: var(--navy); border-bottom: 1px solid rgba(255,255,255,0.1); padding: 40px 24px; gap: 24px; box-shadow: 0 10px 40px rgba(0,0,0,0.3); }
  .col-2, .col-3, .col-4 { grid-template-columns: 1fr; }
  .form-grid { grid-template-columns: 1fr; }
  .footer-grid { grid-template-columns: 1fr; gap: 40px; }
  .footer-nav { grid-column: auto; }
  section { padding: 60px 0; }
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

// Generate robots.txt
const robotsTxt = `User-agent: *
Disallow: /admin/
Disallow: /admin
Disallow: /api/
Sitemap: ${site.domain}/sitemap.xml
`;
await writeFile(path.join(outDir, 'robots.txt'), robotsTxt);

// Generate sitemap.xml
const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map(page => `  <url>
    <loc>${site.domain}${page.url}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>${page.url === '/' ? 'daily' : 'weekly'}</changefreq>
    <priority>${page.url === '/' ? '1.0' : page.url.split('/').length <= 3 ? '0.8' : '0.5'}</priority>
  </url>`).join('\n')}
</urlset>`;
await writeFile(path.join(outDir, 'sitemap.xml'), sitemapXml);

// Generate llms.txt
const llmsTxt = `# ${site.name}

> ${site.description}

## Основные контакты
- **Телефон**: ${site.phone}
- **Email**: ${site.email}
- **Адрес**: ${site.address}

## Карта страниц сайта
${pages.map(page => `- [${page.title}](${site.domain}${page.url})`).join('\n')}
`;
await writeFile(path.join(outDir, 'llms.txt'), llmsTxt);

// Generate humans.txt
const humansTxt = `/* TEAM */
Chef: Завод Весовой Техники
Contact: ${site.email}
From: Петропавловск, Казахстан

/* SITE */
Last update: ${new Date().toLocaleDateString('ru-RU')}
Standards: HTML5, CSS3
Components: Node.js http, Vanilla JS
Software: Custom Static Site Generator
`;
await writeFile(path.join(outDir, 'humans.txt'), humansTxt);

console.log(`Built ${pages.length} pages, sitemap.xml, robots.txt, llms.txt, and humans.txt successfully.`);
