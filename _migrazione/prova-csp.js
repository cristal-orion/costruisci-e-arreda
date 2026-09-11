/**
 * prova-csp.js — la Content-Security-Policy provata **senza** il server.
 *
 * `prova-deploy.js` fa questo controllo contro il container nginx, ed è la
 * prova buona. Ma serve Docker, e quando Docker non c'è la CSP resterebbe
 * l'unico pezzo del deploy scritto e mai eseguito — proprio quello che rompe le
 * cose in silenzio: un hash che non combacia non dà errori nel server, blocca
 * lo script e basta.
 *
 * Qui la politica viene presa da `deploy/csp.conf` — lo stesso file che finisce
 * in nginx — e **appiccicata alle risposte** mentre il browser carica le pagine
 * dal `npm run preview`. L'HTML è identico a quello che servirà nginx, quindi
 * gli hash sono quelli veri e le violazioni sono quelle vere.
 *
 * Quello che questo NON prova: che nginx mandi davvero l'intestazione, e che
 * non se la mangi una `location`. Quello lo dice solo `prova-deploy.js`.
 *
 *   npm run preview          (nella cartella dell'app)
 *   node _migrazione/prova-csp.js [http://localhost:4321]
 *
 * Esce con 1 se una pagina viola la politica.
 */
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const BASE = process.argv[2] || 'http://localhost:4321';
const CSP_CONF = path.resolve(__dirname, '..', 'costruisciearreda-astro', 'deploy', 'csp.conf');

/* Dal frammento nginx si estrae la politica: `add_header ... "…" always;` */
const conf = fs.readFileSync(CSP_CONF, 'utf8');
const csp = conf.match(/add_header\s+Content-Security-Policy\s+"([^"]+)"/)?.[1];
if (!csp) {
  console.error(`Nessuna politica dentro ${CSP_CONF}: eseguire prima deploy/genera-csp.js`);
  process.exit(1);
}

const rotte = [
  ...fs
    .readFileSync(path.resolve(__dirname, 'baseline', 'routes-astro.txt'), 'utf8')
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean),
  '/404.html',
];

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });

  /* La CSP arriva come intestazione, non come `<meta>`: il `<meta>` non
     supporta `frame-ancestors` e viene applicato più tardi, quindi non
     proverebbe la stessa cosa. */
  await ctx.route('**/*', async (route) => {
    const risposta = await route.fetch();
    const tipo = risposta.headers()['content-type'] ?? '';
    if (!tipo.startsWith('text/html')) return route.fulfill({ response: risposta });
    return route.fulfill({
      response: risposta,
      headers: { ...risposta.headers(), 'content-security-policy': csp },
    });
  });

  const pagina = await ctx.newPage();
  await pagina.addInitScript(() => {
    window.__violazioni = [];
    document.addEventListener('securitypolicyviolation', (e) => {
      window.__violazioni.push(
        `${e.effectiveDirective} blocca ${e.blockedURI || 'inline'}` +
          (e.sourceFile ? ` (${e.sourceFile.split('/').pop()}:${e.lineNumber})` : ''),
      );
    });
  });

  const erroriJs = [];
  pagina.on('pageerror', (e) => erroriJs.push(e.message));

  const problemi = [];
  for (const r of rotte) {
    await pagina.goto(BASE + r, { waitUntil: 'load', timeout: 45000 });
    /* Iubenda e le gallerie caricano dopo il `load`: senza questa attesa le
       violazioni di quelle due pagine non si vedrebbero. */
    await pagina.waitForTimeout(1200);
    const v = await pagina.evaluate(() => {
      const x = window.__violazioni ?? [];
      window.__violazioni = [];
      return x;
    });
    for (const riga of new Set(v)) problemi.push(`${r} — ${riga}`);
  }

  await browser.close();

  console.log(`${rotte.length} rotte provate con la politica di ${path.relative(process.cwd(), CSP_CONF)}.`);
  if (erroriJs.length) {
    console.log(`\nerrori JavaScript (${erroriJs.length}):`);
    for (const e of new Set(erroriJs)) console.log(`  - ${e}`);
  }
  if (problemi.length) {
    console.log(`\n${problemi.length} violazioni:`);
    for (const p of problemi) console.log(`  - ${p}`);
    process.exit(1);
  }
  console.log('Nessuna violazione.');
  if (erroriJs.length) process.exit(1);
})();
