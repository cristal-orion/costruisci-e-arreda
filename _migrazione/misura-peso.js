/**
 * misura-peso.js — quanto pesa davvero una pagina, misurato nel browser.
 *
 * Non somma i byte dei file su disco: apre la pagina con la cache vuota, la
 * scorre fino in fondo (così parte il lazy-load, che è la metà del peso di una
 * pagina con gallerie) e legge i **byte trasferiti** dalla Resource Timing API,
 * headers compresi. È il numero che vede chi apre il sito, non una stima.
 *
 * I tracker sono bloccati: sul mirror ce ne sono sei e il loro peso dipende
 * dalla rete e dal consenso, non dal sito. Confrontare due pagine con dentro
 * sei terze parti misura le terze parti, non il lavoro fatto.
 *
 *   node misura-peso.js [base] [rotta ...]
 *   node misura-peso.js http://127.0.0.1:4321            # il build Astro
 *   node misura-peso.js http://127.0.0.1:8099            # il mirror
 *
 * Senza rotte usa le 10 di campione della tabella in CLAUDE.md.
 */
const { chromium } = require('playwright');

const BASE = process.argv[2] || 'http://127.0.0.1:4321';
const ROTTE = process.argv.length > 3 ? process.argv.slice(3) : [
  '/type_stores/showroom-cat/',
  '/store/via-san-massimo-na/',
  '/il-nostro-team/',
  '/category/ultime-news-e-articoli/',
  '/',
  '/la-nostra-storia/',
  '/gres-costruisciearreda-consigli/',
  '/contatti/',
  '/realizzazioni/home-albe/',
  '/services/progetto/',
];

const VIEWPORT = { width: 1440, height: 900 };
const TRACKER = /googletagmanager|google-analytics|analytics\.google|facebook\.(net|com)|hotjar|mailmunch|iubenda|recaptcha|doubleclick|fonts\.googleapis|fonts\.gstatic|clarity\.ms/i;

const mb = (n) => (n / 1024 / 1024).toFixed(2).replace('.', ',');

/** Scorre fino in fondo a passi di mezzo viewport: il lazy-load osserva l'incrocio. */
async function scorriTutto(page) {
  await page.evaluate(async () => {
    const passo = window.innerHeight / 2;
    for (let y = 0; y < document.body.scrollHeight; y += passo) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 120));
    }
    window.scrollTo(0, document.body.scrollHeight);
    await new Promise((r) => setTimeout(r, 600));
    window.scrollTo(0, 0);
  });
}

(async () => {
  const browser = await chromium.launch();
  const righe = [];

  for (const rotta of ROTTE) {
    // Un contesto nuovo per rotta: cache vuota, come chi arriva la prima volta.
    const ctx = await browser.newContext({ viewport: VIEWPORT });
    await ctx.route('**/*', (r) => (TRACKER.test(r.request().url()) ? r.abort() : r.continue()));
    const page = await ctx.newPage();

    const url = BASE.replace(/\/$/, '') + rotta;
    await page.goto(url, { waitUntil: 'load', timeout: 120000 });
    await scorriTutto(page);
    await page.waitForLoadState('networkidle', { timeout: 120000 }).catch(() => {});

    const misura = await page.evaluate(() => {
      const risorse = performance.getEntriesByType('resource');
      const nav = performance.getEntriesByType('navigation')[0];
      const byTipo = {};
      for (const r of risorse) {
        byTipo[r.initiatorType] = (byTipo[r.initiatorType] || 0) + (r.transferSize || 0);
      }
      return {
        byte: risorse.reduce((s, r) => s + (r.transferSize || 0), 0) + (nav?.transferSize || 0),
        richieste: risorse.length + (nav ? 1 : 0),
        byTipo,
        altezza: document.documentElement.scrollHeight,
      };
    });

    righe.push({ rotta, ...misura });
    console.log(
      `${mb(misura.byte).padStart(6)} MB · ${String(misura.richieste).padStart(3)} richieste   ${rotta}`,
    );
    await ctx.close();
  }

  const totale = righe.reduce((s, r) => s + r.byte, 0);
  console.log(`\n${mb(totale)} MB in totale su ${righe.length} rotte, ` +
    `${righe.reduce((s, r) => s + r.richieste, 0)} richieste.`);

  await browser.close();
})();
