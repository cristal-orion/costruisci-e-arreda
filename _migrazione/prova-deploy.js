/**
 * prova-deploy.js — il cancello di qualità del **server**, non delle pagine.
 *
 * `check-build.js` guarda l'HTML prodotto da Astro. Questo guarda quello che
 * succede davanti: redirect 301, intestazioni, cache, compressione, 404, e —
 * la parte che non si vede — se la Content-Security-Policy generata dal build
 * lascia davvero funzionare gli script del sito.
 *
 * Le cose che rompe un file di configurazione sbagliato sono tutte silenziose:
 * un `add_header` dentro una `location` che si porta via le intestazioni di
 * sicurezza del blocco `server`, un hash della CSP che non combacia più e
 * blocca il menu, un redirect che risponde 200 invece di 301. Nessuna di
 * queste si vede aprendo il sito.
 *
 *   docker build -t costruisciearreda .
 *   docker run --rm -d -p 8080:80 --name ca-prova costruisciearreda
 *   node _migrazione/prova-deploy.js http://127.0.0.1:8080
 *   docker rm -f ca-prova
 *
 * Esce con 1 se qualcosa non torna.
 */
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const BASE = process.argv[2] || 'http://127.0.0.1:8080';
const DEPLOY = path.resolve(__dirname, '..', 'costruisciearreda-astro', 'deploy');
const problemi = [];
const ok = [];

const segna = (condizione, descrizione, dettaglio = '') =>
  condizione ? ok.push(descrizione) : problemi.push(`${descrizione}${dettaglio ? ` — ${dettaglio}` : ''}`);

/**
 * Una richiesta cruda: niente redirect seguiti, niente decompressione
 * automatica. Servono le intestazioni **come arrivano**.
 */
const chiedi = (percorso, intestazioni = {}) =>
  new Promise((risolvi, rifiuta) => {
    const u = new URL(percorso, BASE);
    const req = http.request(
      { hostname: u.hostname, port: u.port || 80, path: u.pathname + u.search, method: 'GET', headers: intestazioni },
      (res) => {
        const pezzi = [];
        res.on('data', (c) => pezzi.push(c));
        res.on('end', () =>
          risolvi({ stato: res.statusCode, intestazioni: res.headers, corpo: Buffer.concat(pezzi) }),
        );
      },
    );
    req.on('error', rifiuta);
    req.end();
  });

(async () => {
  // --- 1. I redirect 301 dalle rotte ritirate ------------------------------
  const mappaRedirect = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, 'baseline', 'redirect.json'), 'utf8'),
  ).redirect;

  for (const r of mappaRedirect) {
    const res = await chiedi(r.da);
    segna(
      res.stato === 301 && res.intestazioni.location === r.a,
      `301 ${r.da} → ${r.a}`,
      `risposto ${res.stato} verso ${res.intestazioni.location ?? '(niente)'}`,
    );
  }

  // --- 2. I vecchi URL WordPress nella forma /?p=ID ------------------------
  // Letti dalla mappa vera, non da un elenco a parte: se la mappa cambia, la
  // prova cambia con lei.
  const mappaConf = fs.readFileSync(path.join(DEPLOY, 'redirect-map.conf'), 'utf8');
  const perId = [...mappaConf.matchAll(/^\s+(\d+)\s+"([^"]+)";/gm)].map((m) => ({ id: m[1], rotta: m[2] }));
  segna(perId.length > 0, `mappa ?p=ID letta (${perId.length} voci)`);

  let idRotti = 0;
  for (const v of perId) {
    const res = await chiedi(`/?p=${v.id}`);
    if (res.stato !== 301 || res.intestazioni.location !== v.rotta) {
      idRotti++;
      if (idRotti <= 3) problemi.push(`301 /?p=${v.id} → ${v.rotta} — risposto ${res.stato} verso ${res.intestazioni.location ?? '(niente)'}`);
    }
  }
  segna(idRotti === 0, `tutti i ${perId.length} vecchi URL ?p=ID rediretti`, `${idRotti} sbagliati`);

  // --- 3. Le pagine ---------------------------------------------------------
  const home = await chiedi('/');
  segna(home.stato === 200, 'la homepage risponde 200', `stato ${home.stato}`);
  segna(
    String(home.intestazioni['content-type'] ?? '').startsWith('text/html'),
    'la homepage è servita come text/html',
    home.intestazioni['content-type'],
  );

  const conBarra = await chiedi('/contatti/');
  segna(conBarra.stato === 200, '/contatti/ risponde 200', `stato ${conBarra.stato}`);

  /* La barra finale fa parte dell'URL canonico (`trailingSlash: 'always'`).
     Senza, la cosa giusta è un 301 verso la forma con la barra; servire la
     stessa pagina su due URL diversi è contenuto duplicato. Qui la risposta
     viene **riportata**, non data per buona: dipende da come nginx risolve il
     `try_files`, ed è esattamente la cosa da verificare sul server vero. */
  const senzaBarra = await chiedi('/contatti');
  if (senzaBarra.stato === 301 && senzaBarra.intestazioni.location?.endsWith('/contatti/')) {
    ok.push('/contatti (senza barra) → 301 verso /contatti/');
  } else if (senzaBarra.stato === 200) {
    problemi.push(
      '/contatti (senza barra) risponde 200: la stessa pagina è servita su due URL. ' +
        'Va aggiunto un 301 verso la forma con la barra in deploy/nginx.conf',
    );
  } else {
    problemi.push(`/contatti (senza barra) risponde ${senzaBarra.stato}: né 200 né 301`);
  }

  // --- 4. La 404 ------------------------------------------------------------
  const inesistente = await chiedi('/questa-pagina-non-esiste-davvero/');
  segna(inesistente.stato === 404, 'un indirizzo inventato risponde 404', `stato ${inesistente.stato}`);
  segna(
    inesistente.corpo.toString('utf8').includes('Pagina non trovata'),
    'la 404 è la pagina del sito, non quella di nginx',
  );

  // --- 5. Le intestazioni sull'HTML ----------------------------------------
  const attese = {
    'content-security-policy': (v) => v.includes("script-src 'self' 'sha256-"),
    'x-content-type-options': (v) => v === 'nosniff',
    'referrer-policy': (v) => v === 'strict-origin-when-cross-origin',
    'x-frame-options': (v) => v === 'SAMEORIGIN',
    'permissions-policy': (v) => v.includes('geolocation=()'),
    'strict-transport-security': (v) => v.startsWith('max-age='),
    'cache-control': (v) => v.includes('must-revalidate'),
  };
  for (const [nome, valida] of Object.entries(attese)) {
    const v = home.intestazioni[nome];
    segna(!!v && valida(String(v)), `homepage: ${nome}`, v ? `vale "${v}"` : 'assente');
  }
  segna(!home.intestazioni['server']?.includes('/'), 'la versione di nginx non è annunciata', home.intestazioni['server']);

  // --- 6. Le intestazioni su un asset con hash ------------------------------
  /* Questa è la prova che conta più delle altre: in nginx `add_header` dentro
     una `location` **cancella** quelli del blocco `server`. La location degli
     asset imposta il `Cache-Control`, quindi se non include anche le
     intestazioni di sicurezza, il 99% delle richieste del sito esce senza. */
  const asset = home.corpo.toString('utf8').match(/\/_astro\/[A-Za-z0-9._-]+\.(?:webp|css|woff2|svg)/)?.[0];
  segna(!!asset, 'trovato un asset con hash da controllare');
  if (asset) {
    const a = await chiedi(asset);
    segna(a.stato === 200, `l'asset ${asset} risponde 200`, `stato ${a.stato}`);
    segna(
      String(a.intestazioni['cache-control'] ?? '').includes('immutable'),
      'asset con hash: cache lunga e immutable',
      a.intestazioni['cache-control'],
    );
    segna(
      a.intestazioni['x-content-type-options'] === 'nosniff' &&
        !!a.intestazioni['content-security-policy'],
      'asset con hash: le intestazioni di sicurezza non sono sparite nella location',
      `nosniff ${a.intestazioni['x-content-type-options'] ?? '(assente)'}, CSP ${a.intestazioni['content-security-policy'] ? 'presente' : '(assente)'}`,
    );
  }

  // --- 7. Compressione -------------------------------------------------------
  const compressa = await chiedi('/', { 'Accept-Encoding': 'gzip' });
  segna(
    compressa.intestazioni['content-encoding'] === 'gzip',
    'la homepage viene servita compressa con gzip',
    compressa.intestazioni['content-encoding'] ?? '(non compressa)',
  );
  if (compressa.intestazioni['content-encoding'] === 'gzip') {
    const rapporto = compressa.corpo.length / home.corpo.length;
    ok.push(`  compressa a ${(rapporto * 100).toFixed(0)}% (${home.corpo.length} → ${compressa.corpo.length} byte)`);
  }

  // --- 8. File di servizio ---------------------------------------------------
  const robots = await chiedi('/robots.txt');
  segna(robots.stato === 200, 'robots.txt risponde 200', `stato ${robots.stato}`);
  segna(robots.corpo.toString('utf8').includes('Sitemap:'), 'robots.txt indica la sitemap');
  const sitemap = await chiedi('/sitemap-index.xml');
  segna(sitemap.stato === 200, 'sitemap-index.xml risponde 200', `stato ${sitemap.stato}`);

  // --- 9. La CSP lascia lavorare gli script? --------------------------------
  /* Un hash sbagliato non dà errori nel server: il browser blocca lo script e
     basta. Si vede solo aprendo le pagine e ascoltando le violazioni. */
  const rotte = [
    ...fs
      .readFileSync(path.resolve(__dirname, 'baseline', 'routes-astro.txt'), 'utf8')
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean),
    '/404.html',
  ];

  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const pagina = await ctx.newPage();
  const violazioni = [];
  const erroriJs = [];

  await pagina.addInitScript(() => {
    document.addEventListener('securitypolicyviolation', (e) => {
      window.__violazioni = window.__violazioni || [];
      window.__violazioni.push(`${e.violatedDirective} ← ${e.blockedURI || e.sourceFile || 'inline'}`);
    });
  });
  pagina.on('pageerror', (e) => erroriJs.push(e.message));

  for (const r of rotte) {
    await pagina.goto(BASE + r, { waitUntil: 'load', timeout: 45000 });
    await pagina.waitForTimeout(150);
    const v = await pagina.evaluate(() => window.__violazioni ?? []);
    for (const x of v) violazioni.push(`${r}: ${x}`);
    await pagina.evaluate(() => (window.__violazioni = []));
  }
  await browser.close();

  segna(violazioni.length === 0, `nessuna violazione della CSP su ${rotte.length} rotte`, violazioni.slice(0, 5).join(' | '));
  segna(erroriJs.length === 0, 'nessun errore JavaScript', erroriJs.slice(0, 3).join(' | '));

  // --- Esito -----------------------------------------------------------------
  console.log(`${ok.length} controlli passati.`);
  if (problemi.length) {
    console.log(`\n${problemi.length} problemi:`);
    for (const p of problemi) console.log(`  - ${p}`);
    process.exit(1);
  }
  console.log('Nessun problema.');
})();
