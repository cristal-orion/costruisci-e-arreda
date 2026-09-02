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
const MODULO_IMMAGINI = path.resolve(
  __dirname, '..', 'costruisciearreda-astro', 'src', 'lib', 'immagini-generate.ts',
);

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
  /** Nome del file, senza il suffisso -WxH delle miniature (come fingerprint.py). */
  const norm = (src) => {
    if (!src) return null;
    const file = src.split('?')[0].split('#')[0].split('/').pop();
    return file.replace(/-\d+x\d+(\.\w+)$/, '$1');
  };
  /**
   * Percorso relativo a `wp-content/uploads`, es. `2024/06/Albe.jpg`.
   * Serve perché due nomi di file compaiono in cartelle diverse
   * (`Raggruppa-1648.jpg` e `Raggruppa-1646.jpg`): il solo nome è ambiguo.
   */
  const percorso = (src) => {
    if (!src) return null;
    const clean = src.split('?')[0].split('#')[0];
    const m = clean.match(/wp-content\/uploads\/(.+)$/);
    if (!m) return null;
    return m[1].replace(/-\d+x\d+(\.\w+)$/, '$1');
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

  /* L'id WordPress della pagina: serve a risolvere i link `index.html%3Fp=ID`
     che l'originale usa negli archivi. Sta nella classe del <body>. */
  const mId = document.body.className.match(/\b(?:postid|page-id)-(\d+)\b/);
  out.postId = mId ? mId[1] : null;

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
  if (t) {
    /* `titleCompleto` è il `<title>` **verbatim**: va riprodotto tale e quale,
       perché lo schema di Yoast non è uniforme — gli articoli del blog non
       hanno il suffisso col nome del sito, tutte le altre pagine sì. */
    out.titleCompleto = txt(t);
    out.title = out.titleCompleto.replace(/\s*-\s*Costruisci e Arreda S\.r\.l\.\s*$/i, '');
  }
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
      imagePath: m ? percorso(m[1]) : null,
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
      if (img) {
        out.featuredImage = {
          src: norm(img.getAttribute('src')),
          path: percorso(img.getAttribute('src')),
          alt: img.alt || '',
        };
      }
      continue;
    }

    if (type === 'image') {
      const img = el.querySelector('img');
      if (img) {
        out.images.push({
          src: norm(img.getAttribute('src')),
          path: percorso(img.getAttribute('src')),
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
          fullPath: percorso(a.getAttribute('href')),
          src: norm(im ? im.dataset.thumbnail : null),
          path: percorso(im ? im.dataset.thumbnail : null),
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
  /** Percorsi (relativi a uploads) di tutte le immagini che i contenuti usano. */
  const percorsiUsati = new Set();
  /** id WordPress → slug, per risolvere i link `index.html%3Fp=ID` degli archivi. */
  const slugPerId = {};

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
        /** Il `<title>` dell'originale, verbatim. */
        seoTitleCompleto: raw.titleCompleto ?? null,
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
        postId: raw.postId ?? null,
        avvisi: warnings,
      };

      if (raw.postId) slugPerId[raw.postId] = { collection, slug, title: entry.title };

      for (const p of [
        raw.hero && raw.hero.imagePath,
        raw.featuredImage && raw.featuredImage.path,
        ...images.map((i) => i.path),
        ...gallery.flatMap((g) => [g.path, g.fullPath]),
      ]) {
        if (p) percorsiUsati.add(p);
      }

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

  /* ---------------------------------------------------------------------------
     Seconda passata: gli archivi di tassonomia.
     Le card del `loop-grid` usano un'immagine in evidenza che sulle pagine
     singole **non compare**: sta solo nel template del loop. Senza questa
     passata le card del rebuild userebbero la prima foto della galleria, che è
     un'altra immagine — il fingerprint lo segnala come immagine assente.
     Qui si legge la mappa slug → immagine dalle pagine di archivio.
     Si prende anche l'intestazione introduttiva dell'archivio, che è contenuto. */
  const ARCHIVI = ['/cat_realizzazioni/progetti/', '/cat_realizzazioni/render/', '/cat_realizzazioni/prima-dopo/'];
  const cardPerSlug = {};
  const datiArchivi = {};

  for (const url of ARCHIVI) {
    try {
      await page.goto(BASE + url, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForTimeout(900);
      const res = await page.evaluate(() => {
        const clean = (s) => (s || '').replace(/\s+/g, ' ').trim();
        const perc = (src) => {
          if (!src) return null;
          const m = src.split('?')[0].match(/wp-content\/uploads\/(.+)$/);
          return m ? m[1].replace(/-\d+x\d+(\.\w+)$/, '$1') : null;
        };
        const card = [];
        for (const c of document.querySelectorAll('[data-elementor-type="loop-item"]')) {
          const a = c.querySelector('a[href]');
          const img = c.querySelector('img');
          card.push({
            href: a ? a.getAttribute('href') : null,
            titolo: clean(c.querySelector('h1,h2,h3,h4')?.textContent),
            imgPath: perc(img ? img.getAttribute('src') : null),
            imgAlt: img ? img.alt || '' : '',
          });
        }
        const t = document.querySelector('title');
        const md = document.querySelector('meta[name="description"]');
        const h1 = document.querySelector('#content h1, .boxSlider .title');
        // l'intestazione introduttiva dell'archivio, dopo l'hero
        const intro = [...document.querySelectorAll('#content h2')]
          .map((x) => clean(x.textContent))
          .find((x) => x && !/^(REALIZZAZIONI|Le nostre realizzazioni|progetti|render|prima\/dopo|Realizza con noi)/i.test(x));
        return {
          titleCompleto: t ? clean(t.textContent) : null,
          metaDescription: md ? md.content.trim() || null : null,
          h1: h1 ? clean(h1.textContent) : null,
          intro: intro || null,
          card,
        };
      });
      datiArchivi[url] = res;
      for (const c of res.card) {
        if (!c.imgPath || !c.href) continue;
        /* Gli href degli archivi sono nella forma rotta `index.html%3Fp=4155.html`:
           si risolvono con la mappa id → slug raccolta nella passata principale. */
        const perId = c.href.match(/p=(\d+)/);
        const perSlug = c.href.match(/realizzazioni\/([^/]+)\/?/);
        const slug = perId
          ? slugPerId[perId[1]] && slugPerId[perId[1]].slug
          : perSlug && perSlug[1];
        if (slug) cardPerSlug[slug] = { path: c.imgPath, alt: c.imgAlt, titolo: c.titolo };
      }
      process.stderr.write(`  archivio ${url}  ${res.card.length} card\n`);
    } catch (e) {
      process.stderr.write(`  !! archivio ${url}: ${e.message}\n`);
    }
  }

  /* L'immagine delle card finisce sulle voci delle realizzazioni. Gli href
     dell'originale sono nella forma rotta `index.html%3Fp=ID`, quindi la mappa
     per slug si costruisce anche confrontando i titoli. */
  const dirReal = path.join(OUT_ROOT, 'realizzazioni');
  for (const f of fs.readdirSync(dirReal).filter((x) => x.endsWith('.json'))) {
    const file = path.join(dirReal, f);
    const voce = JSON.parse(fs.readFileSync(file, 'utf8'));
    const perSlug = cardPerSlug[voce.slug];
    const perTitolo = Object.values(cardPerSlug).find(
      (c) => c.titolo && c.titolo.toLowerCase() === String(voce.title).toLowerCase(),
    );
    const scelta = perSlug || perTitolo;
    if (scelta) {
      voce.cardImage = { src: scelta.path.split('/').pop(), path: scelta.path, alt: scelta.alt };
      for (const p of [scelta.path]) percorsiUsati.add(p);
      fs.writeFileSync(file, JSON.stringify(voce, null, 2) + '\n');
    }
  }
  const senzaCard = fs.readdirSync(dirReal).filter((x) => x.endsWith('.json'))
    .filter((f) => !JSON.parse(fs.readFileSync(path.join(dirReal, f), 'utf8')).cardImage);

  fs.writeFileSync(
    path.resolve(__dirname, 'baseline', 'archivi-mirror.json'),
    JSON.stringify(datiArchivi, null, 2) + '\n',
  );

  await browser.close();

  /* Immagini di template, usate dai layout e non dai contenuti: vanno nel modulo
     comunque, altrimenti i template non le trovano. */
  const IMMAGINI_TEMPLATE = ['2024/06/LogoServizio.png'];
  for (const p of IMMAGINI_TEMPLATE) percorsiUsati.add(p);

  /* Le immagini delle pagine one-off: l'elenco lo produce `extract-pages.js`,
     che gira separatamente. Se il file esiste, i suoi percorsi entrano nel
     modulo generato — altrimenti quelle pagine non troverebbero le immagini. */
  const daPagine = path.resolve(__dirname, 'baseline', 'immagini-pagine.json');
  if (fs.existsSync(daPagine)) {
    const elenco = JSON.parse(fs.readFileSync(daPagine, 'utf8'));
    for (const p of elenco) percorsiUsati.add(p);
    process.stderr.write(`  + ${elenco.length} immagini dalle pagine one-off\n`);
  }

  /* Modulo con gli import **espliciti** delle sole immagini usate.
     Serve perché `import.meta.glob` eager su tutta la cartella uploads tira nel
     build tutte le 668 immagini del mirror (164 MB di output): misurato.
     Con gli import statici Astro emette solo queste. */
  const ordinati = [...percorsiUsati].sort();
  const esistenti = ordinati.filter((rel) =>
    fs.existsSync(path.resolve(__dirname, '..', 'costruisciearreda-static',
      'costruisciearreda.it', 'wp-content', 'uploads', rel)),
  );
  const perse = ordinati.filter((r) => !esistenti.includes(r));

  const righe = [
    '/* GENERATO da _migrazione/extract-content.js — non modificare a mano.',
    ' *',
    ' * Import espliciti delle sole immagini che i contenuti usano davvero.',
    ' * Un `import.meta.glob` eager sulla cartella uploads tirerebbe nel build',
    ' * tutte le 668 immagini del mirror: misurato, 164 MB di output.',
    ` * Qui sono ${esistenti.length}.`,
    ' */',
    "import type { ImageMetadata } from 'astro';",
    '',
    ...esistenti.map((rel, i) => `import i${i} from '../assets/uploads/${rel}';`),
    '',
    'export const immaginiGenerate: Record<string, ImageMetadata> = {',
    ...esistenti.map((rel, i) => `  ${JSON.stringify(rel)}: i${i},`),
    '};',
    '',
  ];
  fs.mkdirSync(path.dirname(MODULO_IMMAGINI), { recursive: true });
  fs.writeFileSync(MODULO_IMMAGINI, righe.join('\n'));

  fs.mkdirSync(path.dirname(REPORT), { recursive: true });
  report.immagini = { usate: esistenti.length, nonTrovate: perse };
  report.archivi = Object.fromEntries(
    Object.entries(datiArchivi).map(([u, d]) => [u, { card: d.card.length, h1: d.h1, intro: d.intro, title: d.titleCompleto }]),
  );
  report.realizzazioniSenzaCardImage = senzaCard;
  report.slugPerId = slugPerId;
  fs.writeFileSync(REPORT, JSON.stringify(report, null, 2) + '\n');
  process.stderr.write(`\nScritto ${REPORT}\n`);
  process.stderr.write(`Scritto ${MODULO_IMMAGINI} (${esistenti.length} immagini`);
  process.stderr.write(perse.length ? `, ${perse.length} non trovate)\n` : ')\n');
})();
