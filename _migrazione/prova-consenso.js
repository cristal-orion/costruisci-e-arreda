/**
 * prova-consenso.js — il banner dei cookie fa davvero quello che dice?
 *
 * Tre visite, ognuna con il browser pulito, e la CSP vera applicata come
 * intestazione (la stessa di `prova-csp.js`):
 *
 *   1. **prima della scelta**: il banner c'è, e verso Google e Meta non parte
 *      nessuna richiesta — né GTM, né GA4, né il pixel;
 *   2. **Rifiuta**: dopo il clic, e sulla pagina successiva, ancora nessuna;
 *   3. **Accetta**: GTM si carica, GA4 invia, e la CSP non blocca niente; sulla
 *      pagina successiva il banner non ricompare.
 *
 * Il punto 1 è quello che conta per la legge, e non si vede guardando il sito:
 * un tracker che parte prima del consenso non fa comparire niente sullo schermo.
 *
 *   node prova-consenso.js [http://localhost:4321]
 * Esce con codice 1 se una delle tre non torna.
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const BASE = process.argv[2] || 'http://localhost:4321';
const conf = fs.readFileSync(
  path.resolve(__dirname, '..', 'costruisciearreda-astro', 'deploy', 'csp.conf'),
  'utf8',
);
const csp = conf.match(/add_header\s+Content-Security-Policy\s+"([^"]+)"/)?.[1];
if (!csp) {
  console.error('Nessuna politica in deploy/csp.conf: eseguire prima deploy/genera-csp.js');
  process.exit(1);
}

const TRACKER = /googletagmanager\.com|google-analytics\.com|analytics\.google\.com|facebook\.(com|net)/;

const nuovaVisita = async (browser) => {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'it-IT' });
  /* Solo le risposte del sito: le richieste verso Google e Meta vanno lasciate
     al browser, altrimenti le ripeterebbe Playwright al posto suo. */
  await ctx.route(`${BASE}/**`, async (route) => {
    const risposta = await route.fetch();
    const tipo = risposta.headers()['content-type'] ?? '';
    if (!tipo.startsWith('text/html')) return route.fulfill({ response: risposta });
    return route.fulfill({
      response: risposta,
      headers: { ...risposta.headers(), 'content-security-policy': csp },
    });
  });
  const pagina = await ctx.newPage();
  const tracker = [];
  const violazioni = [];
  pagina.on('request', (r) => TRACKER.test(r.url()) && tracker.push(r.url().slice(0, 80)));
  await pagina.addInitScript(() => {
    document.addEventListener('securitypolicyviolation', (e) =>
      console.log(`CSP: ${e.effectiveDirective} blocca ${e.blockedURI}`),
    );
  });
  pagina.on('console', (m) => m.text().startsWith('CSP:') && violazioni.push(m.text()));
  return { ctx, pagina, tracker, violazioni };
};

const banner = (p) => p.locator('#iubenda-cs-banner').isVisible().catch(() => false);
const attendi = (p, ms) => p.waitForTimeout(ms);

(async () => {
  const browser = await chromium.launch();
  const problemi = [];
  const esito = (ok, testo) => {
    console.log(`${ok ? '  ok ' : '  NO '} ${testo}`);
    if (!ok) problemi.push(testo);
  };

  // 1. prima della scelta
  {
    const v = await nuovaVisita(browser);
    await v.pagina.goto(`${BASE}/`, { waitUntil: 'load' });
    await v.pagina.waitForSelector('#iubenda-cs-banner', { timeout: 15000 }).catch(() => {});
    await attendi(v.pagina, 4000);
    console.log('1. prima della scelta');
    esito(await banner(v.pagina), 'il banner compare');
    esito(v.tracker.length === 0, `nessuna richiesta a Google o Meta (${v.tracker.length})`);
    esito(v.violazioni.length === 0, `nessuna violazione della CSP ${v.violazioni.join(' · ')}`);
    await v.ctx.close();
  }

  // 2. rifiuta
  {
    const v = await nuovaVisita(browser);
    await v.pagina.goto(`${BASE}/`, { waitUntil: 'load' });
    await v.pagina.waitForSelector('.iubenda-cs-reject-btn', { timeout: 15000 });
    await v.pagina.click('.iubenda-cs-reject-btn');
    await attendi(v.pagina, 2000);
    await v.pagina.goto(`${BASE}/contatti/`, { waitUntil: 'load' });
    await attendi(v.pagina, 4000);
    console.log('2. Rifiuta');
    esito(!(await banner(v.pagina)), 'il banner non ricompare sulla pagina dopo');
    esito(v.tracker.length === 0, `nessuna richiesta a Google o Meta (${v.tracker.length})`);
    esito(v.violazioni.length === 0, `nessuna violazione della CSP ${v.violazioni.join(' · ')}`);
    await v.ctx.close();
  }

  // 3. accetta
  {
    const v = await nuovaVisita(browser);
    await v.pagina.goto(`${BASE}/`, { waitUntil: 'load' });
    await v.pagina.waitForSelector('.iubenda-cs-accept-btn', { timeout: 15000 });
    await v.pagina.click('.iubenda-cs-accept-btn');
    await attendi(v.pagina, 5000);
    const dopoClic = [...v.tracker];
    /* Il banner chiede il consenso solo per le finalità che la policy di
       Iubenda dichiara. Se la policy non elenca GA4 e il Meta Pixel, il banner
       non chiede né misurazione (4) né marketing (5), GTM giustamente non parte
       — e il difetto sta nella policy, non nel codice. Lo si dice. */
    const cookieIub = (await v.ctx.cookies()).find((c) => c.name.startsWith('_iub_cs-'));
    const finalita = cookieIub ? JSON.parse(decodeURIComponent(cookieIub.value)).purposes ?? {} : {};
    const chiesteMisuraOMarketing = '4' in finalita || '5' in finalita;
    await v.pagina.goto(`${BASE}/contatti/`, { waitUntil: 'load' });
    await attendi(v.pagina, 5000);
    console.log('3. Accetta');
    esito(
      chiesteMisuraOMarketing,
      `il banner chiede il consenso per misurazione (4) o marketing (5) — finalità ottenute: ${
        Object.keys(finalita).join(', ') || 'nessuna'
      }` +
        (chiesteMisuraOMarketing
          ? ''
          : '\n       → la policy Iubenda non dichiara GA4 né il Meta Pixel: vanno aggiunti nel pannello Iubenda'),
    );
    esito(dopoClic.some((u) => u.includes('gtm.js')), 'GTM si carica subito dopo il clic');
    esito(
      v.tracker.some((u) => /collect/.test(u)),
      'GA4 invia i dati (richiesta /collect)',
    );
    esito(!(await banner(v.pagina)), 'il banner non ricompare sulla pagina dopo');
    esito(v.violazioni.length === 0, `nessuna violazione della CSP ${v.violazioni.join(' · ')}`);
    await v.ctx.close();
  }

  await browser.close();
  console.log(problemi.length ? `\n${problemi.length} problemi.` : '\nNessun problema.');
  process.exit(problemi.length ? 1 : 0);
})();
