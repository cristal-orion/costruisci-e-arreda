/**
 * extract-content.js — estrae i contenuti del mirror in content collections Astro.
 *
 * Legge il DOM renderizzato (non l'HTML minificato) e riconosce i widget Elementor
 * per **ruolo**, non per posizione: così l'estrazione non si rompe se una pagina ha
 * un widget in più. Per ogni voce scrive un JSON in
 * `costruisciearreda-astro/src/content/<collezione>/<slug>.json`.
 *
 * Due cose importanti che l'estrazione deve gestire, entrambe conseguenze dello
 * stesso vizio dell'originale — duplicare il contenuto per desktop e per mobile e
 * nasconderne una copia con le classi `elementor-hidden-*`:
 *   - il corpo del testo dei servizi compare **due volte** (e su tablet si vede
 *     davvero due volte: è un bug del sito live);
 *   - le gallerie degli store sono duplicate (e a 900px non se ne vede nessuna).
 * Qui i duplicati esatti vengono uniti: una copia sola, responsive via CSS.
 *
 *   cd costruisciearreda-static/costruisciearreda.it && python3 -m http.server 8099
 *   cd _migrazione && node extract-content.js
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = process.env.MIRROR || 'http://127.0.0.1:8099';
const OUT_ROOT = path.resolve(__dirname, '..', 'costruisciearreda-astro', 'src', 'content');
const REPORT = path.resolve(__dirname, 'baseline', 'estrazione-report.json');

const BLOCK = [
  'googletagmanager', 'google-analytics', 'connect.facebook', 'facebook.com',
  'hotjar', 'mailmunch', 'iubenda', 'recaptcha', 'fonts.googleapis',
];

const COLLECTIONS = {
  services: [
    'sopralluogo-e-rilievo', 'progetto', 'rendering', 'consulenza-finiture',
    'disbrigo-pratiche', 'direzione-lavori', 'impianti', 'certificazioni',
  ].map((s) => ({ slug: s, url: `/services/${s}/` })),

  realizzazioni: [
    'home-albe', 'green-house', 'wood-e-white', 'bar-tabacchi', 'casa-prima-e-dopo',
    'appartamento-moderno-prima-e-dopo', 'soluzioni-per-la-famiglia',
  ].map((s) => ({ slug: s, url: `/realizzazioni/${s}/` })),

  stores: [
    'via-martiri-della-liberta-na', 'via-martiri-della-liberta-nola-na', 'via-san-massimo-na',
    'via-argine-625-80147-napoli-na', 'via-argine-625-80147-napoli-na-2',
  ].map((s) => ({ slug: s, url: `/store/${s}/` })),

  posts: [
    '5-errori-da-evitare-nella-scelta-dei-materiali-per-ledilizia',
    'come-scegliere-le-finiture-perfette-per-la-tua-casa',
    'corso-di-formazione-gestione-delle-grandi-lastre',
    'grande-novita-una-nuova-area-formativa-nel-nostro-store-di-via-argine',
    'gres-costruisciearreda-consigli',
    'mobili-bagno-quale-scegliere-per-uno-spazio-funzionale-e-di-design',
    'perche-il-rendering-3d-e-essenziale-per-la-ristrutturazione-dei-tuoi-spazi',
    'rivestimenti-con-pattern-stile-e-personalita-per-i-tuoi-spazi',
  ].map((s) => ({ slug: s, url: `/${s}/` })),
};

/**
 * Immagini puramente decorative dell'originale, da non portare nei contenuti:
 * sono grafiche di contorno ripetute su decine di pagine, non contenuto della pagina.
 * `linea.png` è perfino **404 sul sito live** pur essendo referenziata 24 volte.
 */
const DECORATIVE = ['Raggruppa-1703.png', 'linea.png', 'over-tooltip.png'];

/**
 * Immagini che appartengono al **template**, non alla singola voce: sono
 * identiche su tutte le 8 pagine dei servizi (una mostrata solo su mobile,
 * l'altra solo su desktop). Vanno nel componente, non nel contenuto.
 */
const TEMPLATE_IMAGES = ['Schermata-2024-03-14-alle-17.42.25.jpg', 'LogoServizio.png'];

/* Stessa normalizzazione di fingerprint.py: via il suffisso -WxH delle miniature,
   così il confronto col fingerprint del mirror combacia. */
const normImg = (src) => {
  if (!src) return null;
  const file = src.split('?')[0].split('#')[0].split('/').pop();
  return file.replace(/-\d+x\d+(\.\w+)$/, '$1');
};

const extract = () => {
  const txt = (el) => (el ? (el.textContent || '').replace(/\s+/g, ' ').trim() : '');
  const norm = (src) => {
    if (!src) return null;
    const file = src.split('?')[0].split('#')[0].split('/').pop();
    return file.replace(/-\d+x\d+(\.\w+)$/, '$1');
  };

  const out = {
    title: null,
    metaDescription: null,
    hero: null,
    postTitle: null,
    intro: null,
    bodies: [],
    fields: {},
    headings: [],
    images: [],
    gallery: [],
    forms: [],
    postInfo: {},
    featuredImage: null,
    widgetSeq: [],
    warnings: [],
  };

  /* --- tassonomie: WordPress le mette come classi, ma non sul <body>:
     stanno sull'elemento del Theme Builder (`.elementor-location-single`).
     Verificato: sul <body> non ci sono. */
  const single = document.querySelector('.elementor-location-single, .elementor-location-archive');
  out.tassonomie = single
    ? [...single.classList]
        .filter((c) => /^(cat_realizzazioni|type_stores|category)-/.test(c))
        .map((c) => c.replace(/^(cat_realizzazioni|type_stores|category)-/, ''))
    : [];

  // --- title e meta description dal <head>
  const t = document.querySelector('title');
  if (t) out.title = txt(t).replace(/\s*-\s*Costruisci e Arreda S\.r\.l\.\s*$/i, '');
  const md = document.querySelector('meta[name="description"]');
  if (md) out.metaDescription = md.content.trim() || null;

  // --- hero: immagine di fondo inline + titolo + titoletto
  const heroBox = document.querySelector('.boxSlider .singleImage');
  if (heroBox) {
    const bg = heroBox.style.backgroundImage || getComputedStyle(heroBox).backgroundImage;
    const m = bg && bg.match(/url\(["']?(.*?)["']?\)/);
    const titleEl = heroBox.querySelector('.infoImg .title');
    const kickerEl = heroBox.querySelector('.infoImg .titoletto');
    out.hero = {
      image: m ? norm(m[1]) : null,
      titleTag: titleEl ? titleEl.tagName.toLowerCase() : null,
      // i <br> del titolo diventano \n: sono interruzioni volute nel contenuto
      title: titleEl ? titleEl.innerHTML.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').replace(/[ \t]+/g, ' ').trim() : null,
      kicker: kickerEl ? txt(kickerEl) : null,
    };
  }

  const root = document.querySelector('#content') || document.body;
  const widgets = [...root.querySelectorAll('[data-widget_type]')];

  const visibile = (el) => {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };

  for (const el of widgets) {
    const type = el.dataset.widget_type.split('.')[0];
    out.widgetSeq.push(type);
    const container = el.querySelector('.elementor-widget-container') || el;

    if (type === 'theme-post-title') {
      out.postTitle = txt(el);
      continue;
    }

    if (type === 'text-editor' || type === 'theme-post-content') {
      // via i contenitori vuoti che MailMunch inietta prima e dopo il post
      const clone = container.cloneNode(true);
      clone.querySelectorAll('[class*="mailmunch"]').forEach((n) => n.remove());
      const html = clone.innerHTML.trim();
      if (html) out.bodies.push({ html, type, visibileDesktop: visibile(el) });
      continue;
    }

    if (type === 'heading') {
      const el2 = container.querySelector('h1,h2,h3,h4,h5,h6,p,div,span') || container;
      const raw = txt(el2);
      if (!raw) continue;
      out.headings.push({ tag: el2.tagName.toLowerCase(), text: raw });
      // "ETICHETTA: valore" -> campo strutturato
      const mm = raw.match(/^([A-ZÀ-Ù][A-ZÀ-Ù\s'’]{2,30}):\s*(.+)$/);
      if (mm) out.fields[mm[1].trim()] = mm[2].trim();
      continue;
    }

    if (type === 'theme-post-featured-image') {
      const img = el.querySelector('img');
      if (img) out.featuredImage = { src: norm(img.getAttribute('src')), alt: img.alt || '' };
      continue;
    }

    if (type === 'image') {
      const img = el.querySelector('img');
      if (img) {
        out.images.push({
          src: norm(img.getAttribute('src')),
          alt: img.alt || '',
          width: img.getAttribute('width') ? Number(img.getAttribute('width')) : null,
          height: img.getAttribute('height') ? Number(img.getAttribute('height')) : null,
          visibileDesktop: visibile(el),
        });
      }
      continue;
    }

    if (type === 'gallery') {
      for (const a of el.querySelectorAll('.e-gallery-item')) {
        const im = a.querySelector('.e-gallery-image');
        out.gallery.push({
          full: norm(a.getAttribute('href')),
          src: norm(im ? im.dataset.thumbnail : null),
          alt: (im && im.getAttribute('aria-label')) || a.dataset.elementorLightboxTitle || '',
          width: im && im.dataset.width ? Number(im.dataset.width) : null,
          height: im && im.dataset.height ? Number(im.dataset.height) : null,
        });
      }
      continue;
    }

    if (type === 'shortcode') {
      /* L'id del form non è sul <form> ma sul contenitore che Contact Form 7 gli
         mette attorno: `<div class="wpcf7" id="wpcf7-f467-p976-o2" data-wpcf7-id="467">`. */
      for (const w of el.querySelectorAll('.wpcf7[data-wpcf7-id]')) {
        out.forms.push(w.dataset.wpcf7Id);
      }
      continue;
    }

    if (type === 'post-info') {
      for (const item of el.querySelectorAll('.elementor-post-info__item')) {
        const label = txt(item.querySelector('.elementor-post-info__item-prefix'));
        const key = label.replace(/[:\s]+$/, '').trim();
        // le tassonomie sono una lista di link, non un valore singolo
        const terms = [...item.querySelectorAll('.elementor-post-info__terms-list-item')].map(txt);
        const value = terms.length ? terms.join(', ') : txt(item).replace(label, '').trim();
        if (key && value && !out.postInfo[key]) {
          out.postInfo[key] = value;
          const time = item.querySelector('time');
          if (time && time.getAttribute('datetime')) out.postInfo[key + '_iso'] = time.getAttribute('datetime');
        }
      }
      continue;
    }
  }

  return out;
};

/** Unisce i corpi di testo identici: sono la copia desktop/mobile dello stesso contenuto. */
const dedupBodies = (bodies, warnings) => {
  const seen = new Map();
  for (const b of bodies) {
    const key = b.html.replace(/\s+/g, ' ').trim();
    if (seen.has(key)) {
      seen.get(key).copie += 1;
      continue;
    }
    seen.set(key, { html: b.html, type: b.type, copie: 1 });
  }
  const list = [...seen.values()];
  const dup = list.filter((b) => b.copie > 1);
  if (dup.length) {
    warnings.push(
      `${dup.length} blocco/i di testo era/no duplicato/i nell'originale (copia desktop + mobile): unito/i in uno`,
    );
  }
  return list.map(({ html, type }) => ({ html, type }));
};

/** Unisce le gallerie duplicate: stessa immagine piena = stessa voce. */
const dedupGallery = (items, warnings) => {
  const seen = new Map();
  for (const it of items) {
    const key = it.full || it.src;
    if (!key) continue;
    if (seen.has(key)) {
      seen.get(key)._copie += 1;
      continue;
    }
    seen.set(key, { ...it, _copie: 1 });
  }
  const list = [...seen.values()];
  const dup = list.filter((x) => x._copie > 1).length;
  if (dup) warnings.push(`galleria duplicata nell'originale (versione desktop + mobile): ${dup} immagini unite`);
  return list.map(({ _copie, ...rest }) => rest);
};

(async () => {
  const browser = await chromium.launch();
  // 1440px: a questa larghezza l'originale mostra la variante desktop del contenuto
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.route('**/*', (r) => (BLOCK.some((b) => r.request().url().includes(b)) ? r.abort() : r.continue()));
  const page = await ctx.newPage();

  const report = { generated: new Date().toISOString(), base: BASE, collezioni: {} };

  for (const [collection, entries] of Object.entries(COLLECTIONS)) {
    const dir = path.join(OUT_ROOT, collection);
    fs.mkdirSync(dir, { recursive: true });
    report.collezioni[collection] = [];

    for (const { slug, url } of entries) {
      let raw;
      try {
        await page.goto(BASE + url, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await page.waitForTimeout(900);
        raw = await page.evaluate(extract);
      } catch (e) {
        process.stderr.write(`  !! ${url}: ${e.message}\n`);
        continue;
      }

      const warnings = [...raw.warnings];
      const bodies = dedupBodies(raw.bodies, warnings);
      const gallery = dedupGallery(raw.gallery, warnings);
      const images = raw.images.filter(
        (i) => i.src && !DECORATIVE.includes(i.src) && !TEMPLATE_IMAGES.includes(i.src),
      );
      const decorativeTolte = raw.images.length - images.length;

      /* Gli store espongono tipo e indirizzo come due heading consecutivi, non
         come "ETICHETTA: valore": qui diventano campi veri. */
      if (collection === 'stores' && raw.headings.length >= 2) {
        raw.fields.tipo = raw.headings[0].text;
        raw.fields.indirizzo = raw.headings[1].text;
      }

      /* La data dei post è in formato gg/mm/aaaa: la si porta in ISO, che è
         quello che serve a `<time>` e alla sitemap. */
      if (raw.postInfo.DATA && !raw.postInfo.DATA_iso) {
        const m = raw.postInfo.DATA.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
        if (m) raw.postInfo.DATA_iso = `${m[3]}-${m[2]}-${m[1]}`;
      }

      // immagini senza alt: è lavoro che sopravvive al rebuild, va tracciato
      const tutteImg = [...images, ...gallery, ...(raw.featuredImage ? [raw.featuredImage] : [])];
      /* Un alt che coincide col nome del file (Elementor stampa il "titolo"
         dell'immagine) non è un alt: va scritto comunque. */
      const altFinto = (i) => {
        if (!i.alt || !i.alt.trim()) return true;
        const stem = (i.src || '').replace(/\.\w+$/, '');
        return i.alt.trim() === stem || i.alt.trim() === stem.replace(/-scaled$/, '');
      };
      const senzaAlt = tutteImg.filter(altFinto).length;
      if (senzaAlt) warnings.push(`${senzaAlt} immagini su ${tutteImg.length} senza un alt vero, da scrivere`);
      if (!raw.metaDescription) warnings.push('meta description assente nell originale, da scrivere');
      if (!raw.hero || !raw.hero.image) warnings.push("IMMAGINE HERO ASSENTE nell'originale: il riquadro è vuoto e il titolo bianco è invisibile");
      if (!bodies.length) warnings.push("nessun testo descrittivo nell'originale: la pagina ha solo titolo, galleria e form");

      const entry = {
        slug,
        urlOriginale: url,
        title: raw.postTitle || raw.title,
        seoTitle: raw.title,
        metaDescription: raw.metaDescription,
        hero: raw.hero,
        campi: raw.fields,
        headings: raw.headings,
        corpo: bodies,
        immagini: images,
        featuredImage: raw.featuredImage,
        gallery,
        formCf7: [...new Set(raw.forms)],
        postInfo: raw.postInfo,
        tassonomie: raw.tassonomie || [],
        avvisi: warnings,
      };

      fs.writeFileSync(path.join(dir, `${slug}.json`), JSON.stringify(entry, null, 2) + '\n');

      report.collezioni[collection].push({
        slug,
        parole: bodies.reduce((n, b) => n + b.html.replace(/<[^>]+>/g, ' ').trim().split(/\s+/).length, 0),
        blocchiTesto: bodies.length,
        campi: Object.keys(raw.fields),
        immagini: images.length,
        decorativeTolte,
        gallery: gallery.length,
        form: [...new Set(raw.forms)],
        tassonomie: raw.tassonomie || [],
        warnings,
      });

      process.stderr.write(`  ${collection}/${slug}  ${bodies.length} blocchi, ${images.length} img, ${gallery.length} in galleria\n`);
    }
  }

  await browser.close();
  fs.mkdirSync(path.dirname(REPORT), { recursive: true });
  fs.writeFileSync(REPORT, JSON.stringify(report, null, 2) + '\n');
  process.stderr.write(`\nScritto ${REPORT}\n`);
})();
