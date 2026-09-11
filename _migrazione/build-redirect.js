/**
 * build-redirect.js — costruisce la mappa dei redirect 301 per il cutover.
 *
 * Le fonti sono tre, tutte verificabili, **nessuna a memoria**:
 *   1. `live-sitemap/all-urls.txt` — i 56 URL indicizzati, scaricati dal sito
 *      live prima del cutover: è l'inventario autorevole;
 *   2. `costruisciearreda-astro/dist` — le rotte che il rebuild produce davvero;
 *   3. `src/data/rotte-legacy.ts` — la mappa page-id → rotta, generata dal
 *      mirror: serve per i vecchi URL nella forma `?p=ID`, che WordPress
 *      risolveva e che possono essere linkati dall'esterno.
 *
 * Per ogni URL indicizzato che il rebuild non serve più, si cerca la
 * destinazione più sensata e si registra il perché. Gli URL senza destinazione
 * ovvia restano elencati come **da decidere**: meglio un elenco corto e
 * onesto che un 301 sbagliato.
 *
 *   node build-redirect.js
 * Scrive `baseline/redirect.json`, `costruisciearreda-astro/deploy/redirect.conf`
 * (i `location`, contesto server) e `deploy/redirect-map.conf` (la mappa dei
 * vecchi `?p=ID`, contesto http).
 */
const fs = require('fs');
const path = require('path');

const BASE = __dirname;
const DIST = path.resolve(BASE, '..', 'costruisciearreda-astro', 'dist');
const SITEMAP = path.resolve(BASE, 'live-sitemap', 'all-urls.txt');
const ROTTE_TS = path.resolve(BASE, '..', 'costruisciearreda-astro', 'src', 'data', 'rotte-legacy.ts');
const OUT_JSON = path.resolve(BASE, 'baseline', 'redirect.json');
/* Due file e non uno: nginx vuole i `location` nel blocco `server` e la `map`
   nel blocco `http`. Un file unico non è includibile da nessuna parte. */
const OUT_CONF = path.resolve(BASE, '..', 'costruisciearreda-astro', 'deploy', 'redirect.conf');
const OUT_MAP = path.resolve(BASE, '..', 'costruisciearreda-astro', 'deploy', 'redirect-map.conf');

/** Le rotte che il build produce. */
const rotteBuild = () => {
  const out = new Set();
  const cammina = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) cammina(p);
      else if (e.name === 'index.html') {
        const rel = path.relative(DIST, dir).split(path.sep).join('/');
        out.add(rel ? `/${rel}/` : '/');
      }
    }
  };
  cammina(DIST);
  return out;
};

/**
 * Destinazioni decise a mano, con la ragione. Sono poche e ognuna ha un motivo
 * che sta nel contenuto, non nell'intuizione:
 */
const DECISE = {
  '/richiedi-preventivo-2/': {
    a: '/richiedi-preventivo/',
    perche:
      'duplicato di /richiedi-preventivo/ senza form: 226 parole di solo carosello news. ' +
      'Contenuto duplicato indicizzato',
  },
  '/services/': {
    a: '/dalla-progettazione-alla-realizzazione/',
    perche: 'root di archivio del CPT, pagina thin con 2 <h1> e titolo "Archivi: …". La pagina vera dei servizi è quella',
  },
  '/realizzazioni/': {
    a: '/i-nostri-lavori/',
    perche: 'root di archivio del CPT, thin. La pagina vera delle realizzazioni è quella',
  },
  '/store/': {
    a: '/type_stores/showroom-cat/',
    perche: 'root di archivio del CPT, thin. L\'elenco vero dei punti vendita è l\'archivio showroom',
  },
  '/store/via-argine-625-80147-napoli-na-2/': {
    a: '/store/via-argine-625-80147-napoli-na/',
    perche: 'copia identica della pagina di Via Argine: due URL per lo stesso punto vendita',
  },
  '/promo-casa/': {
    a: '/richiedi-preventivo/',
    perche:
      "landing con offerta scaduta (\u20ac 166 al mese, valida fino al 31 Dicembre), " +
      'ritirata su decisione del proprietario il 2026-09-02. Chi arriva da un vecchio ' +
      'link cerca un preventivo',
  },
  '/thankyou-promo-6500/': {
    a: '/richiedi-preventivo/',
    perche: 'thank-you della landing /promo-casa/: senza la landing non ha più senso',
  },
  '/author/admin/': {
    a: '/category/ultime-news-e-articoli/',
    perche: 'archivio autore di WordPress con un solo autore ("admin"): non è contenuto',
  },
};

const main = () => {
  const build = rotteBuild();
  const indicizzati = fs
    .readFileSync(SITEMAP, 'utf8')
    .split(/\s+/)
    .filter(Boolean)
    .map((u) => new URL(u).pathname)
    .map((p) => (p.endsWith('/') ? p : `${p}/`));

  const redirect = [];
  const daDecidere = [];
  const serviti = [];

  for (const url of [...new Set(indicizzati)].sort()) {
    if (build.has(url)) {
      serviti.push(url);
      continue;
    }
    if (DECISE[url]) {
      redirect.push({ da: url, a: DECISE[url].a, perche: DECISE[url].perche, fonte: 'sitemap del live' });
      continue;
    }
    daDecidere.push(url);
  }

  /* Rotte non in sitemap ma presenti nel mirror, per cui una destinazione è
     comunque ovvia: meglio un 301 che un 404 se qualcuno le ha linkate. */
  for (const [url, d] of Object.entries(DECISE)) {
    if (indicizzati.includes(url)) continue;
    if (build.has(url)) continue;
    redirect.push({ da: url, a: d.a, perche: d.perche, fonte: 'mirror, fuori sitemap' });
  }

  /* Gli URL `?p=ID`: WordPress li risolveva, e possono essere linkati
     dall'esterno o restare nella cronologia dei motori. */
  const ts = fs.readFileSync(ROTTE_TS, 'utf8');
  const perId = [...ts.matchAll(/'(\d+)':\s*"([^"]+)"/g)].map(([, id, rotta]) => ({ id, rotta }));
  const perIdValidi = perId.filter((x) => build.has(x.rotta));

  redirect.sort((a, b) => a.da.localeCompare(b.da));

  const report = {
    generated: new Date().toISOString(),
    indicizzati: indicizzati.length,
    servitiDirettamente: serviti.length,
    redirect,
    daDecidere,
    queryString: {
      nota:
        'I vecchi URL nella forma /?p=ID vanno rediretti alla rotta corrispondente. ' +
        'La mappa è generata dal mirror, non scritta a mano.',
      voci: perIdValidi.length,
      esempi: perIdValidi.slice(0, 5),
    },
  };
  fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });
  fs.mkdirSync(path.dirname(OUT_CONF), { recursive: true });
  fs.writeFileSync(OUT_JSON, JSON.stringify(report, null, 2) + '\n');

  /* Configurazione per nginx, in due file perché i due pezzi vanno in due
     contesti diversi: i `location` e l'`if` dentro `server`, la `map` dentro
     `http`. Scritti così sono includibili tali e quali, senza ritocchi. */
  const intestazione = (dove) => [
    '# GENERATO da _migrazione/build-redirect.js — non modificare a mano.',
    '#',
    '# Redirect 301 per il cutover. Le destinazioni vengono dalla sitemap del sito',
    '# live (i 56 URL indicizzati) confrontata con le rotte che il rebuild produce.',
    `# ${dove}`,
    '',
  ];

  const righeServer = [
    ...intestazione('Da includere nel blocco `server` di nginx.'),
    '# --- URL che il rebuild non serve più ---',
    ...redirect.flatMap((r) => [`# ${r.perche}`, `location = ${r.da} { return 301 ${r.a}; }`, '']),
    '# --- Vecchi URL nella forma /?p=ID (WordPress) ---',
    '# La mappa sta in redirect-map.conf (contesto http); qui si usa il risultato.',
    '# `if` a livello di server con un solo `return` è uno dei due usi sicuri.',
    'if ($rotta_per_id != "") { return 301 $rotta_per_id; }',
    '',
  ];
  fs.writeFileSync(OUT_CONF, righeServer.join('\n'));

  const righeMap = [
    ...intestazione('Da includere nel blocco `http` di nginx (in conf.d/ ci finisce da sé).'),
    '# nginx non instrada sui parametri: serve una mappa sul valore di $arg_p.',
    '# Il risultato lo usa redirect.conf, dentro il blocco server.',
    'map $arg_p $rotta_per_id {',
    '    default "";',
    ...perIdValidi.map((x) => `    ${x.id} "${x.rotta}";`),
    '}',
    '',
  ];
  fs.writeFileSync(OUT_MAP, righeMap.join('\n'));

  console.log(`URL indicizzati: ${indicizzati.length}`);
  console.log(`  serviti dal rebuild: ${serviti.length}`);
  console.log(`  con redirect 301:    ${redirect.filter((r) => r.fonte === 'sitemap del live').length}`);
  console.log(`  da decidere:         ${daDecidere.length}`);
  for (const u of daDecidere) console.log(`      ${u}`);
  console.log(`\nredirect totali (sitemap + mirror): ${redirect.length}`);
  console.log(`mappa ?p=ID: ${perIdValidi.length} voci`);
  console.log(`\nScritto ${OUT_JSON}`);
  console.log(`Scritto ${OUT_CONF}`);
  console.log(`Scritto ${OUT_MAP}`);
};

main();
