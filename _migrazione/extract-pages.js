/**
 * extract-pages.js — estrae le pagine **one-off** in blocchi ordinati.
 *
 * Le 4 collezioni a template (servizi, realizzazioni, store, articoli) hanno una
 * struttura fissa e le estrae `extract-content.js`. Le pagine one-off no: ognuna
 * ha una sequenza sua. Qui si estrae quindi un **elenco ordinato di blocchi**,
 * riconosciuti per tipo di widget Elementor, senza perdere nulla.
 *
 * Il duplicato desktop/mobile dell'originale si scioglie leggendo la pagina a
 * **due larghezze** e unendo per firma: un blocco visibile solo a 390px viene
 * aggiunto una volta, non due. È lo stesso vizio che a 900px fa vedere due volte
 * il testo dei servizi e nessuna galleria negli store.
 *
 *   cd costruisciearreda-static/costruisciearreda.it && python3 -m http.server 8099
 *   cd _migrazione && node extract-pages.js
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = process.env.MIRROR || 'http://127.0.0.1:8099';
const OUT = path.resolve(__dirname, '..', 'costruisciearreda-astro', 'src', 'content', 'pagine');
const REPORT = path.resolve(__dirname, 'baseline', 'estrazione-pagine.json');
const USATE = path.resolve(__dirname, 'baseline', 'immagini-pagine.json');

/**
 * Mappa `data-id` Elementor → percorso dell'immagine di fondo, letta dai bundle
 * CSS del mirror. Serve **solo** per i riquadri delle tassonomie: quel fondo il
 * browser non lo applica (difetto dell'originale), quindi non è misurabile e
 * l'unica fonte è la dichiarazione nel CSS.
 */
const fondiDichiarati = () => {
  const dir = path.resolve(__dirname, '..', 'costruisciearreda-static', 'costruisciearreda.it',
    'wp-content', 'cache', 'wpo-minify');
  const mappa = {};
  const bundles = [];
  const cammina = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) cammina(p);
      else if (e.name.endsWith('.css')) bundles.push(p);
    }
  };
  try { cammina(dir); } catch { return mappa; }
  const re = /elementor-element-([0-9a-f]{6,8})[^{}]*\{[^{}]*?background-image:url\(([^)]+)\)/g;
  for (const f of bundles) {
    const css = fs.readFileSync(f, 'utf8');
    let m;
    while ((m = re.exec(css))) {
      const rel = m[2].replace(/["']/g, '').match(/uploads\/(.+)$/);
      if (rel && !mappa[m[1]]) mappa[m[1]] = rel[1].replace(/-\d+x\d+(\.\w+)$/, '$1');
    }
  }
  return mappa;
};

const BLOCK = [
  'googletagmanager', 'google-analytics', 'connect.facebook', 'facebook.com',
  'hotjar', 'mailmunch', 'iubenda', 'recaptcha', 'fonts.googleapis',
];

/** Le 11 one-off + le landing + le thank-you + i 5 archivi `type_stores`. */
const PAGINE = [
  { slug: 'home', url: '/' },
  { slug: 'la-nostra-storia', url: '/la-nostra-storia/' },
  { slug: 'il-nostro-team', url: '/il-nostro-team/' },
  { slug: 'lavora-con-noi', url: '/lavora-con-noi/' },
  { slug: 'contatti', url: '/contatti/' },
  { slug: 'dalla-progettazione-alla-realizzazione', url: '/dalla-progettazione-alla-realizzazione/' },
  { slug: 'i-nostri-lavori', url: '/i-nostri-lavori/' },
  { slug: 'richiedi-preventivo', url: '/richiedi-preventivo/' },
  { slug: 'privacy-policy', url: '/privacy-policy/' },
  { slug: 'cookie-policy', url: '/cookie-policy/' },
  { slug: 'promo-casa', url: '/promo-casa/' },
  { slug: 'soluzione-ceramiche', url: '/soluzione-ceramiche/' },
  { slug: 'richiedi-preventivo-2', url: '/richiedi-preventivo-2/' },
  { slug: 'preventivo-thankyou', url: '/preventivo-thankyou/' },
  { slug: 'newsletter-thankyou', url: '/newsletter-thankyou/' },
  { slug: 'thankyou-promo-6500', url: '/thankyou-promo-6500/' },
  { slug: 'thankyou-progetta-gli-spazi', url: '/thankyou-progetta-gli-spazi/' },
  { slug: 'type_stores-showroom-cat', url: '/type_stores/showroom-cat/' },
  { slug: 'type_stores-rivendita-edile', url: '/type_stores/rivendita-edile/' },
  { slug: 'type_stores-ferramenta', url: '/type_stores/ferramenta/' },
  { slug: 'type_stores-progettazione-e-ristrutturazione-edile', url: '/type_stores/progettazione-e-ristrutturazione-edile/' },
  { slug: 'type_stores-marchi', url: '/type_stores/marchi/' },
];

/** Grafiche di contorno dell'originale, non contenuto della pagina. */
const DECORATIVE = ['Raggruppa-1703.png', 'linea.png', 'over-tooltip.png'];

const estrai = () => {
  /* Dichiarata qui dentro e non fuori: `page.evaluate` esegue nel browser, dove
     le costanti del processo Node non esistono. */
  const DECORATIVE = ['Raggruppa-1703.png', 'linea.png', 'over-tooltip.png'];
  const clean = (s) => (s || '').replace(/\s+/g, ' ').trim();

  /**
   * Testo di un elemento **rispettando i `<br>`**.
   *
   * `textContent` li ignora e il risultato è testo incollato: il titolo
   * "ENTRA IN CONTATTO<br>CON NOI" diventava "ENTRA IN CONTATTOCON NOI" e
   * l'indirizzo "Via Martiri della Libertà, 11<br>80147, Napoli" diventava
   * "…, 1180147, Napoli". Qui il `<br>` diventa un ritorno a capo, che chi
   * rende trasforma in `<br>`.
   */
  const testoDi = (el) => {
    if (!el) return '';
    const c = el.cloneNode(true);
    c.querySelectorAll('br').forEach((b) => b.replaceWith('\n'));
    return c.textContent
      .split('\n')
      .map((r) => r.replace(/\s+/g, ' ').trim())
      .filter(Boolean)
      .join('\n');
  };
  const vis = (el) => {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden';
  };
  const perc = (src) => {
    if (!src) return null;
    const m = src.split('?')[0].split('#')[0].match(/wp-content\/uploads\/(.+)$/);
    return m ? m[1].replace(/-\d+x\d+(\.\w+)$/, '$1') : null;
  };
  const nome = (p) => (p ? p.split('/').pop() : null);

  const out = { blocchi: [], hero: null, meta: {} };

  // --- head
  const t = document.querySelector('title');
  out.meta.titleCompleto = t ? clean(t.textContent) : null;
  out.meta.title = out.meta.titleCompleto
    ? out.meta.titleCompleto.replace(/\s*-\s*Costruisci e Arreda S\.r\.l\.\s*$/i, '')
    : null;
  const md = document.querySelector('meta[name="description"]');
  out.meta.metaDescription = md ? md.content.trim() || null : null;
  const rob = document.querySelector('meta[name="robots"]');
  out.meta.robots = rob ? rob.content.trim() : null;
  const mId = document.body.className.match(/\b(?:postid|page-id)-(\d+)\b/);
  out.meta.postId = mId ? mId[1] : null;

  // --- hero: può avere più slide (la homepage ne ha 3)
  const box = document.querySelector('.boxSlider');
  if (box) {
    /* Due strutture diverse: la homepage è uno slider slick con più slide (che
       clona i primi e gli ultimi elementi), le pagine interne hanno un solo
       `.singleImage`. Si cercano prima le slide, poi si ricade sul riquadro. */
    let slide = [...box.querySelectorAll('.slick-slide:not(.slick-cloned), .swiper-slide:not(.swiper-slide-duplicate)')];
    if (!slide.length) slide = [...box.querySelectorAll('.singleImage')];
    const leggi = (s) => {
      const conBg = s.matches('.singleImage') ? s : s.querySelector('.singleImage') || s;
      const bg = conBg.style.backgroundImage || getComputedStyle(conBg).backgroundImage;
      const m = bg && bg.match(/url\(["']?(.*?)["']?\)/);
      const titolo = s.querySelector('.title, h1') || s.querySelector('h2');
      const kicker = s.querySelector('.titoletto');
      /* Il titoletto dell'hero e il titolo possono essere lo stesso nodo: in
         quel caso il titoletto non è un'informazione in più. */
      const testoKicker = kicker ? clean(kicker.textContent) : null;
      const testoTitolo = titolo
        ? titolo.innerHTML.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').replace(/[ \t]+/g, ' ').trim()
        : null;
      return {
        imagePath: m ? perc(m[1]) : null,
        image: m ? nome(perc(m[1])) : null,
        titolo: testoTitolo,
        titoloTag: titolo ? titolo.tagName.toLowerCase() : null,
        kicker: testoKicker === testoTitolo ? null : testoKicker,
      };
    };
    const slides = (slide.length ? slide : [box]).map(leggi).filter((s) => s.titolo || s.imagePath);
    out.hero = { slides };
  }

  // --- blocchi
  const radice = document.querySelector('#content') || document.body;
  for (const el of radice.querySelectorAll('[data-widget_type]')) {
    const tipo = el.dataset.widget_type.split('.')[0];
    const cont = el.querySelector('.elementor-widget-container') || el;
    const visibile = vis(el);
    const varianti = [...el.classList].filter(
      (c) => !/^elementor-/.test(c) && !/^e-/.test(c) && c !== 'animated',
    );
    const base = { visibile, varianti };

    if (tipo === 'heading' || tipo === 'theme-post-title') {
      /* I titoli dentro i riquadri delle tassonomie appartengono al riquadro,
         non alla pagina: emetterli anche come titoli autonomi produceva tre
         sezioni vuote "PROGETTI", "RENDER", "PRIMA/DOPO" seguite dai riquadri
         che ripetevano gli stessi titoli. */
      if (el.closest('a[href*="cat_realizzazioni"]')) continue;
      const h = cont.querySelector('h1,h2,h3,h4,h5,h6,p,div,span') || cont;
      const testo = testoDi(h);
      if (!testo) continue;
      const link = cont.querySelector('a[href]');
      out.blocchi.push({
        tipo: 'titolo',
        ...base,
        livello: /^h[1-6]$/.test(h.tagName.toLowerCase()) ? Number(h.tagName[1]) : null,
        testo,
        href: link ? link.getAttribute('href') : null,
      });
      continue;
    }

    if (tipo === 'text-editor' || tipo === 'theme-post-content') {
      const c = cont.cloneNode(true);
      c.querySelectorAll('[class*="mailmunch"]').forEach((n) => n.remove());
      const html = c.innerHTML.trim();
      if (html) out.blocchi.push({ tipo: 'testo', ...base, html, parole: clean(c.textContent).split(/\s+/).length });
      continue;
    }

    if (tipo === 'image' || tipo === 'theme-post-featured-image') {
      const img = el.querySelector('img');
      if (!img) continue;
      const p = perc(img.getAttribute('src'));
      if (!p || DECORATIVE.includes(nome(p))) continue;
      const a = el.querySelector('a[href]');
      out.blocchi.push({
        tipo: 'immagine',
        ...base,
        path: p,
        src: nome(p),
        alt: img.alt || '',
        width: img.getAttribute('width') ? Number(img.getAttribute('width')) : null,
        height: img.getAttribute('height') ? Number(img.getAttribute('height')) : null,
        href: a ? a.getAttribute('href') : null,
        didascalia: clean(el.querySelector('figcaption, .widget-image-caption')?.textContent) || null,
      });
      continue;
    }

    if (tipo === 'button') {
      const a = cont.querySelector('a[href]');
      out.blocchi.push({
        tipo: 'bottone',
        ...base,
        testo: clean(cont.textContent),
        href: a ? a.getAttribute('href') : null,
      });
      continue;
    }

    if (tipo === 'counter') {
      const n = el.querySelector('.elementor-counter-number');
      out.blocchi.push({
        tipo: 'contatore',
        ...base,
        valore: n ? Number(n.dataset.toValue) : null,
        durata: n ? Number(n.dataset.duration) : 2000,
        prefisso: clean(el.querySelector('.elementor-counter-number-prefix')?.textContent) || '',
        suffisso: clean(el.querySelector('.elementor-counter-number-suffix')?.textContent) || '',
        etichetta: clean(el.querySelector('.elementor-counter-title')?.textContent) || '',
      });
      continue;
    }

    if (tipo === 'gallery' || tipo === 'image-carousel' || tipo === 'loop-carousel') {
      const voci = [];
      for (const a of el.querySelectorAll('.e-gallery-item')) {
        const im = a.querySelector('.e-gallery-image');
        voci.push({
          fullPath: perc(a.getAttribute('href')),
          path: perc(im ? im.dataset.thumbnail : null),
          alt: (im && im.getAttribute('aria-label')) || a.dataset.elementorLightboxTitle || '',
          width: im && im.dataset.width ? Number(im.dataset.width) : null,
          height: im && im.dataset.height ? Number(im.dataset.height) : null,
        });
      }
      for (const s of el.querySelectorAll('.swiper-slide:not(.swiper-slide-duplicate)')) {
        const img = s.querySelector('img');
        const a = s.querySelector('a[href]');
        if (img) {
          voci.push({
            path: perc(img.getAttribute('src')),
            fullPath: perc(a ? a.getAttribute('href') : null),
            alt: img.alt || '',
            titolo: clean(s.querySelector('h1,h2,h3,h4')?.textContent) || null,
            href: a ? a.getAttribute('href') : null,
          });
        }
      }
      if (voci.length) {
        out.blocchi.push({
          tipo: tipo === 'gallery' ? 'galleria' : 'carousel',
          ...base,
          voci: voci.filter((v) => v.path || v.fullPath),
        });
      }
      continue;
    }

    if (tipo === 'loop-grid') {
      const voci = [];
      for (const c of el.querySelectorAll('[data-elementor-type="loop-item"]')) {
        const a = c.querySelector('a[href]');
        const img = c.querySelector('img');
        voci.push({
          titolo: clean(c.querySelector('h1,h2,h3,h4')?.textContent) || null,
          testo: clean(c.querySelector('p')?.textContent) || null,
          href: a ? a.getAttribute('href') : null,
          path: perc(img ? img.getAttribute('src') : null),
          alt: img ? img.alt || '' : '',
        });
      }
      if (voci.length) out.blocchi.push({ tipo: 'elenco', ...base, voci });
      continue;
    }

    if (tipo === 'accordion' || tipo === 'toggle') {
      const voci = [];
      for (const it of el.querySelectorAll('.elementor-accordion-item, .elementor-toggle-item')) {
        voci.push({
          titolo: clean(it.querySelector('.elementor-tab-title, .elementor-toggle-title')?.textContent),
          html: (it.querySelector('.elementor-tab-content') || { innerHTML: '' }).innerHTML.trim(),
        });
      }
      if (voci.length) out.blocchi.push({ tipo: 'accordion', ...base, voci });
      continue;
    }

    if (tipo === 'icon-list') {
      const voci = [...el.querySelectorAll('.elementor-icon-list-item')].map((li) => ({
        testo: testoDi(li),
        href: li.querySelector('a[href]')?.getAttribute('href') || null,
      }));
      if (voci.length) out.blocchi.push({ tipo: 'elencoVoci', ...base, voci });
      continue;
    }

    if (tipo === 'image-box') {
      const img = el.querySelector('img');
      const a = el.querySelector('a[href]');
      out.blocchi.push({
        tipo: 'scheda',
        ...base,
        path: perc(img ? img.getAttribute('src') : null),
        alt: img ? img.alt || '' : '',
        titolo: testoDi(el.querySelector('.elementor-image-box-title')) || null,
        html: (el.querySelector('.elementor-image-box-description') || { innerHTML: '' }).innerHTML.trim(),
        href: a ? a.getAttribute('href') : null,
      });
      continue;
    }

    if (tipo === 'shortcode') {
      const form = [...el.querySelectorAll('.wpcf7[data-wpcf7-id]')].map((w) => w.dataset.wpcf7Id);
      if (form.length) out.blocchi.push({ tipo: 'form', ...base, id: form });
      continue;
    }

    if (tipo === 'divider') {
      out.blocchi.push({ tipo: 'separatore', ...base });
      continue;
    }

    if (tipo === 'social-icons' || tipo === 'search-form' || tipo === 'post-info') {
      out.blocchi.push({ tipo: 'cornice', sottotipo: tipo, ...base });
      continue;
    }

    out.blocchi.push({ tipo: 'sconosciuto', sottotipo: tipo, ...base, testo: clean(el.textContent).slice(0, 120) });
  }

  /* --- Blocchi del TEMA, non di Elementor: non hanno `data-widget_type`, quindi
     il ciclo sopra non li vede. Sono due, entrambi sulla homepage:
       - `.listProducts`: la card bianca sotto l'hero con i 4 servizi numerati;
       - i riquadri delle tassonomie, che sono `<a>` contenitori di Elementor con
         l'immagine di fondo dichiarata nel CSS (non inline), quindi va letta
         da `getComputedStyle`.
     Vanno estratti a parte, altrimenti la homepage perde due sezioni intere. */

  /* Fondi di sezione: alcune sezioni hanno un'immagine dichiarata nel CSS di
     Elementor e non inline (il disegno tecnico accanto a "Realizziamo il
     progetto dei tuoi sogni" è uno di questi). Si registrano gli id dei
     contenitori nell'ordine del documento, con un riferimento al testo che
     contengono: il percorso lo risolve il processo Node leggendo i bundle. */
  out.contenitori = [...document.querySelectorAll('[data-element_type="container"][data-id]')]
    .filter((c) => vis(c))
    .map((c) => ({
      elementorId: c.dataset.id,
      fondoApplicato: getComputedStyle(c).backgroundImage !== 'none',
      testo: clean(c.textContent).slice(0, 70),
      altezza: Math.round(c.getBoundingClientRect().height),
    }));

  /* --- Elenco degli store: su `/type_stores/showroom-cat/` uno shortcode
     WordPress stampa i punti vendita di quel tipo, ognuno con la **galleria
     completa**. Sono 281 immagini in una pagina, 56 MB: nel rebuild diventa un
     elenco di card che rimandano alle pagine store, dove le gallerie già ci
     sono. Qui si estraggono titolo, testo e link di ciascuno. */
  const titoliStore = [...document.querySelectorAll('.titleStore')];
  if (titoliStore.length) {
    const voci = titoliStore
      .map((t) => {
        let wrap = t;
        for (let i = 0; i < 5 && wrap; i++) {
          wrap = wrap.parentElement;
          if (wrap && wrap.querySelector('.contentStore, .btn, a[href*="p="]')) break;
        }
        const a = wrap ? wrap.querySelector('a[href*="p="], a[href*="/store/"]') : null;
        const cont = wrap ? wrap.querySelector('.contentStore') : null;
        const img = wrap ? wrap.querySelector('img') : null;
        return {
          titolo: testoDi(t),
          testo: cont ? testoDi(cont) : null,
          href: a ? a.getAttribute('href') : null,
          path: img ? perc(img.getAttribute('src')) : null,
        };
      })
      .filter((v) => v.titolo && v.href);
    if (voci.length) out.blocchi.push({ tipo: 'elencoStore', visibile: true, varianti: [], voci });
  }

  /* --- Carosello delle ultime news: è il `.lastPosts` del tema, presente in
     fondo a diverse pagine. Non è un widget Elementor, quindi il ciclo sopra
     non lo vede: senza questo blocco tre pagine perdevano ~300 parole a testa,
     ed è il fingerprint che l'ha rilevato. */
  const lastPosts = document.querySelector('.lastPosts');
  if (lastPosts) {
    const titolo = lastPosts.querySelector('h1,h2,h3');
    out.blocchi.push({
      tipo: 'ultimeNews',
      visibile: vis(lastPosts),
      varianti: [],
      titolo: titolo ? testoDi(titolo) : 'News and Event',
    });
  }

  const cardServizi = document.querySelector('.listProducts');
  if (cardServizi) {
    const voci = [...cardServizi.children]
      .map((c) => {
        const a = c.querySelector('a[href]');
        const foglie = [...c.querySelectorAll('*')]
          .filter((e) => e.children.length === 0)
          .map((e) => clean(e.textContent))
          .filter(Boolean);
        const numero = foglie.find((t) => /^\d{1,2}$/.test(t)) || null;
        const titolo = foglie.find((t) => !/^\d{1,2}$/.test(t) && !/^—?\s*scopri/i.test(t)) || null;
        return { numero, titolo, href: a ? a.getAttribute('href') : null };
      })
      .filter((v) => v.titolo);
    if (voci.length) out.blocchi.push({ tipo: 'servizinumerati', visibile: vis(cardServizi), varianti: [], voci });
  }

  const tiles = [...document.querySelectorAll('a[href*="cat_realizzazioni"]')].filter(
    (a) => a.matches('[data-element_type="container"]') || a.querySelector('h1,h2,h3,h4'),
  );
  if (tiles.length) {
    const voci = tiles.map((a) => {
      const h = a.querySelector('h1,h2,h3,h4');
      /* L'immagine di fondo di questi riquadri **non viene applicata**:
         `getComputedStyle` restituisce `none` sul live come nel mirror.
         Conseguenza visibile nella baseline `shots-000-live-originale`:
         al posto dei riquadri c'è un buco bianco di 700px e i titoli, bianchi,
         sono invisibili su fondo bianco. Difetto reale dell'originale.
         Qui si registra l'id Elementor: l'url dichiarato lo risolve il processo
         Node leggendo i bundle CSS, perché dal browser non è misurabile. */
      return {
        titolo: h ? testoDi(h) : testoDi(a),
        titoloLivello: h && /^h[1-6]$/.test(h.tagName.toLowerCase()) ? Number(h.tagName[1]) : null,
        href: a.getAttribute('href'),
        elementorId: a.dataset.id || null,
        path: null,
        fondoApplicato: getComputedStyle(a).backgroundImage !== 'none',
      };
    });
    out.blocchi.push({ tipo: 'riquadri', visibile: tiles.some(vis), varianti: [], voci });
  }

  return out;
};

/** Firma di un blocco: serve a unire le copie desktop/mobile dello stesso contenuto. */
const firma = (b) => {
  switch (b.tipo) {
    case 'titolo': return `titolo|${b.livello}|${b.testo}`;
    case 'testo': return `testo|${b.html.replace(/\s+/g, ' ').trim()}`;
    case 'immagine': return `immagine|${b.path}|${b.href || ''}`;
    case 'bottone': return `bottone|${b.testo}|${b.href || ''}`;
    case 'contatore': return `contatore|${b.valore}|${b.etichetta}`;
    case 'galleria':
    case 'carousel': return `${b.tipo}|${b.voci.map((v) => v.path || v.fullPath).join(',')}`;
    case 'elenco': return `elenco|${b.voci.map((v) => v.titolo || v.href).join(',')}`;
    case 'accordion': return `accordion|${b.voci.map((v) => v.titolo).join(',')}`;
    case 'elencoVoci': return `elencoVoci|${b.voci.map((v) => v.testo).join(',')}`;
    case 'scheda': return `scheda|${b.titolo}|${b.path}`;
    case 'servizinumerati': return `servizinumerati|${b.voci.map((v) => v.titolo).join(',')}`;
    case 'elencoStore': return `elencoStore|${b.voci.map((v) => v.titolo).join(',')}`;
    case 'ultimeNews': return `ultimeNews|${b.titolo}`;
    case 'riquadri': return `riquadri|${b.voci.map((v) => v.titolo).join(',')}`;
    case 'form': return `form|${b.id.join(',')}`;
    default: return `${b.tipo}|${b.sottotipo || ''}|${(b.testo || '').slice(0, 60)}`;
  }
};

(async () => {
  const browser = await chromium.launch();
  const contesti = {};
  for (const [nome, w] of [['desktop', 1440], ['mobile', 390]]) {
    const c = await browser.newContext({ viewport: { width: w, height: 900 } });
    await c.route('**/*', (r) => (BLOCK.some((b) => r.request().url().includes(b)) ? r.abort() : r.continue()));
    contesti[nome] = await c.newPage();
  }

  const report = { generated: new Date().toISOString(), pagine: {} };
  const percorsi = new Set();
  const fondi = fondiDichiarati();
  process.stderr.write(`fondi dichiarati nei bundle CSS: ${Object.keys(fondi).length}\n`);
  fs.mkdirSync(OUT, { recursive: true });

  for (const { slug, url } of PAGINE) {
    const per = {};
    for (const [nome, page] of Object.entries(contesti)) {
      try {
        await page.goto(BASE + url, { waitUntil: 'load', timeout: 60000 });
        await page.evaluate(async () => {
          await new Promise((r) => {
            let y = 0;
            const t = setInterval(() => {
              window.scrollBy(0, 800); y += 800;
              if (y >= document.body.scrollHeight) { clearInterval(t); window.scrollTo(0, 0); r(); }
            }, 25);
          });
        });
        await page.waitForTimeout(900);
        per[nome] = await page.evaluate(estrai);
      } catch (e) {
        process.stderr.write(`  !! ${url} [${nome}]: ${e.message}\n`);
      }
    }
    if (!per.desktop) continue;

    /* Unione: si parte dai blocchi visibili su desktop, poi si aggiungono quelli
       che esistono solo su mobile — e si registra quali erano duplicati. */
    const viste = new Map();
    const ordine = [];
    let dupDesktop = 0;
    for (const b of per.desktop.blocchi) {
      const f = firma(b);
      if (viste.has(f)) {
        dupDesktop += 1;
        /* Fra due copie con la stessa firma va tenuta quella **visibile**: nel
           DOM dell'originale la copia nascosta viene spesso prima, e tenere la
           prima faceva sparire sezioni intere della homepage. */
        if (b.visibile && !viste.get(f).visibile) viste.set(f, { ...b, soloMobile: false });
        continue;
      }
      viste.set(f, { ...b, soloMobile: false });
      ordine.push(f);
    }
    let soloMobile = 0;
    for (const b of (per.mobile ? per.mobile.blocchi : [])) {
      const f = firma(b);
      if (viste.has(f)) continue;
      if (!b.visibile) continue;
      viste.set(f, { ...b, soloMobile: true });
      ordine.push(f);
      soloMobile += 1;
    }

    const blocchi = ordine.map((f) => viste.get(f)).filter((b) => b.visibile || b.soloMobile);
    const nascosti = ordine.map((f) => viste.get(f)).filter((b) => !b.visibile && !b.soloMobile).length;

    /* Riquadri: completa il percorso del fondo con l'url dichiarato nel CSS. */
    for (const b of blocchi) {
      if (b.tipo !== 'riquadri') continue;
      for (const v of b.voci) {
        if (!v.path && v.elementorId && fondi[v.elementorId]) v.path = fondi[v.elementorId];
      }
    }

    for (const b of blocchi) {
      for (const p of [b.path, ...(b.voci || []).flatMap((v) => [v.path, v.fullPath])]) {
        if (p) percorsi.add(p);
      }
    }
    for (const s of per.desktop.hero?.slides || []) if (s.imagePath) percorsi.add(s.imagePath);

    const avvisi = [];
    if (!per.desktop.meta.metaDescription) avvisi.push('meta description assente nell originale, da scrivere');
    if (dupDesktop) avvisi.push(`${dupDesktop} blocchi duplicati nell'originale, uniti in uno`);
    if (soloMobile) avvisi.push(`${soloMobile} blocchi esistono solo nella variante mobile`);
    if (nascosti) avvisi.push(`${nascosti} blocchi nascosti a tutti i viewport (markup morto, scartato)`);
    const riquadriRotti = blocchi
      .filter((b) => b.tipo === 'riquadri')
      .flatMap((b) => b.voci)
      .filter((v) => !v.fondoApplicato).length;
    if (riquadriRotti) {
      avvisi.push(
        `${riquadriRotti} riquadri con immagine di fondo NON applicata nell'originale ` +
          '(buco bianco con titolo bianco su bianco): nel rebuild il fondo si vede',
      );
    }
    if (/noindex/i.test(per.desktop.meta.robots || '')) avvisi.push('era noindex nell originale');
    else if ((per.desktop.meta.robots || '').includes('index')) avvisi.push('era indicizzabile nell originale');

    /* Fondi di sezione risolti: solo quelli che il browser non applicava e per
       cui esiste una dichiarazione nel CSS. Tenerli separati dai blocchi è
       voluto: sono decorazioni di sezione, non contenuto in sequenza. */
    const fondiSezione = (per.desktop.contenitori || [])
      .map((c) => ({ ...c, path: fondi[c.elementorId] || null }))
      .filter((c) => c.path);

    for (const c of fondiSezione) percorsi.add(c.path);

    const voce = {
      slug,
      urlOriginale: url,
      ...per.desktop.meta,
      hero: per.desktop.hero,
      blocchi,
      fondiSezione,
      avvisi,
    };
    fs.writeFileSync(path.join(OUT, `${slug}.json`), JSON.stringify(voce, null, 2) + '\n');

    const conteggio = {};
    for (const b of blocchi) conteggio[b.tipo] = (conteggio[b.tipo] || 0) + 1;
    report.pagine[url] = {
      slug,
      title: per.desktop.meta.title,
      metaDescription: !!per.desktop.meta.metaDescription,
      robots: per.desktop.meta.robots,
      slide: per.desktop.hero?.slides.length ?? 0,
      blocchi: blocchi.length,
      fondiSezione: fondiSezione.map((c) => ({ id: c.elementorId, path: c.path, applicato: c.fondoApplicato, testo: c.testo.slice(0, 40) })),
      tipi: conteggio,
      parole: blocchi.filter((b) => b.tipo === 'testo').reduce((n, b) => n + (b.parole || 0), 0),
      avvisi,
    };
    process.stderr.write(`  ${url}  ${blocchi.length} blocchi (${Object.entries(conteggio).map(([k, v]) => k + ':' + v).join(' ')})\n`);
  }

  await browser.close();
  fs.mkdirSync(path.dirname(REPORT), { recursive: true });
  fs.writeFileSync(REPORT, JSON.stringify(report, null, 2) + '\n');
  fs.writeFileSync(USATE, JSON.stringify([...percorsi].sort(), null, 2) + '\n');
  process.stderr.write(`\nScritto ${REPORT}\nScritto ${USATE} (${percorsi.size} immagini)\n`);
})();
