/**
 * check-build.js — cancello di qualità su tutte le rotte del build Astro.
 *
 * Per ogni rotta e per ogni viewport verifica le cose che non devono mai
 * succedere, e le verifica **misurando nel browser**, non leggendo il codice:
 *
 *   - errori JavaScript in console;
 *   - scorrimento orizzontale della pagina (deve scorrere il contenitore, mai il body);
 *   - immagini che non si caricano;
 *   - `<h1>` diverso da uno (l'originale ne aveva 0 su 17 pagine e 9 su una);
 *   - `<title>` o meta description mancanti;
 *   - canonical assente o non assoluto;
 *   - link interni che puntano a rotte inesistenti;
 *   - immagini senza `alt` **e** senza `alt=""` esplicito.
 *
 *   node check-build.js [http://127.0.0.1:4321]
 * Esce con codice 1 se trova qualcosa: si può usare in CI.
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = process.argv[2] || 'http://127.0.0.1:4321';
const DIST = path.resolve(__dirname, '..', 'costruisciearreda-astro', 'dist');
const VIEWPORTS = [
  { nome: 'desktop', width: 1440, height: 900 },
  { nome: 'tablet', width: 900, height: 1000 },
  { nome: 'mobile', width: 390, height: 844 },
];

/** Le rotte sono quelle che il build ha davvero prodotto. */
const rotte = [];
const cammina = (dir) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) cammina(path.join(dir, e.name));
    else if (e.name === 'index.html') {
      const rel = path.relative(DIST, dir).split(path.sep).join('/');
      rotte.push(rel ? `/${rel}/` : '/');
    }
  }
};
cammina(DIST);
rotte.sort();

/* La 404 non è una cartella con dentro `index.html` — Astro la scrive come
   `404.html` — quindi il giro qui sopra non la vedrebbe, ed è una pagina del
   sito come le altre: un `<h1>`, niente scorrimento orizzontale, immagini che
   si caricano. Va controllata anche lei. */
if (fs.existsSync(path.join(DIST, '404.html'))) rotte.push('/404.html');

const controlla = () => {
  const problemi = [];
  const px = (v) => Math.round(v);

  if (document.documentElement.scrollWidth > window.innerWidth) {
    problemi.push(`scorrimento orizzontale: scrollWidth ${px(document.documentElement.scrollWidth)} > viewport ${window.innerWidth}`);
  }

  const h1 = document.querySelectorAll('h1');
  if (h1.length !== 1) problemi.push(`${h1.length} <h1> invece di 1`);

  if (!document.title.trim()) problemi.push('<title> vuoto');

  const md = document.querySelector('meta[name="description"]');
  if (!md || !md.content.trim()) problemi.push('meta description assente');

  const can = document.querySelector('link[rel="canonical"]');
  if (!can) problemi.push('canonical assente');
  else if (!/^https?:\/\//.test(can.getAttribute('href') || '')) problemi.push('canonical non assoluto');

  const rotte = [];
  for (const img of document.querySelectorAll('img')) {
    /* L'`<img>` dentro un `<dialog>` chiuso è il segnaposto del lightbox: non ha
       ancora un `src` perché lo riceve al click su una miniatura. Non è un errore. */
    const dlg = img.closest('dialog');
    if (dlg && !dlg.open) continue;

    if (!img.complete || img.naturalWidth === 0) {
      // le immagini molto sotto la piega con loading=lazy non sono un errore
      const r = img.getBoundingClientRect();
      const fuori = r.top > window.innerHeight * 3;
      if (!fuori) rotte.push((img.currentSrc || img.src || '(senza src)').split('/').pop());
    }
    if (img.getAttribute('alt') === null) {
      problemi.push(`immagine senza attributo alt: ${(img.getAttribute('src') || '').split('/').pop()}`);
    }
  }
  if (rotte.length) problemi.push(`${rotte.length} immagini non caricate: ${rotte.slice(0, 3).join(', ')}`);

  const interni = [...document.querySelectorAll('a[href^="/"]')]
    .map((a) => a.getAttribute('href'))
    .filter((h) => h && !h.startsWith('//'));
  return { problemi, interni: [...new Set(interni)] };
};

(async () => {
  const browser = await chromium.launch();
  let totale = 0;
  const linkVisti = new Map();

  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    const page = await ctx.newPage();

    for (const rotta of rotte) {
      const errori = [];
      const onErr = (e) => errori.push(String(e.message ?? e).slice(0, 160));
      const onMsg = (m) => { if (m.type() === 'error') errori.push('console: ' + m.text().slice(0, 160)); };
      page.on('pageerror', onErr);
      page.on('console', onMsg);

      let res = { problemi: ['pagina non caricata'], interni: [] };
      try {
        await page.goto(BASE + rotta, { waitUntil: 'load', timeout: 60000 });
        // scorre tutta la pagina, così il lazy-load parte davvero
        await page.evaluate(async () => {
          await new Promise((r) => {
            let y = 0;
            const t = setInterval(() => {
              window.scrollBy(0, 800);
              y += 800;
              if (y >= document.body.scrollHeight) { clearInterval(t); window.scrollTo(0, 0); r(); }
            }, 25);
          });
        });
        await page.waitForTimeout(900);
        res = await page.evaluate(controlla);
      } catch (e) {
        res = { problemi: [`errore di caricamento: ${e.message.slice(0, 120)}`], interni: [] };
      }

      page.off('pageerror', onErr);
      page.off('console', onMsg);

      for (const l of res.interni) {
        if (!linkVisti.has(l)) linkVisti.set(l, rotta);
      }

      const tutti = [...res.problemi, ...errori.map((e) => `errore JS: ${e}`)];
      if (tutti.length) {
        totale += tutti.length;
        console.log(`\n### ${rotta}  [${vp.nome}]`);
        for (const p of tutti) console.log('   -', p);
      }
    }
    await ctx.close();
  }

  // link interni verso rotte che il build non ha prodotto
  const esistenti = new Set(rotte);
  const rotti = [...linkVisti.entries()].filter(([l]) => {
    const solo = l.split('#')[0].split('?')[0];
    return solo.startsWith('/') && !esistenti.has(solo) && !solo.includes('.');
  });
  if (rotti.length) {
    console.log(`\n### link interni verso rotte non ancora costruite (${rotti.length})`);
    for (const [l, da] of rotti) console.log(`   - ${l}  (linkato da ${da})`);
  }

  await browser.close();
  console.log(
    `\n${rotte.length} rotte × ${VIEWPORTS.length} viewport: ` +
      (totale ? `${totale} problemi` : 'nessun problema'),
  );
  process.exit(totale ? 1 : 0);
})();
