// Baseline visiva: screenshot full-page desktop + tablet + mobile di ogni pagina.
// Uso: node screenshot.js <baseUrl> <outDir> [elencoRotte]
//   node screenshot.js http://127.0.0.1:8099 baseline/shots-mirror
//   node screenshot.js http://localhost:4321  baseline/shots-astro baseline/routes-astro.txt
//
// I due lati hanno due elenchi di rotte, e non è un dettaglio: il mirror ne ha
// 66 (comprese le 8 di archivio data, l'author page e le pagine ritirate),
// il build 52 — meno quelle non replicate per scelta, più `/design-system/`.
// Puntare il build sull'elenco del mirror produce una quindicina di 404 per
// viewport, che sembrano guasti e non lo sono.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = process.argv[2] || 'http://127.0.0.1:8099';
const OUT = process.argv[3] || 'baseline/shots-mirror';
const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'tablet', width: 900, height: 1200 },   // fascia dove viveva il bug hero: non lasciarla scoperta
  { name: 'mobile', width: 390, height: 844 },
];

const ROTTE = process.argv[4] || path.join('baseline', 'routes.txt');
const urls = fs.readFileSync(path.resolve(__dirname, ROTTE), 'utf8')
  .split('\n').map(s => s.trim()).filter(Boolean);

(async () => {
  const browser = await chromium.launch();
  let ok = 0, fail = 0;
  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 1,
      // blocca i tracker: rendono gli screenshot non deterministici
      extraHTTPHeaders: { 'Accept-Language': 'it-IT,it;q=0.9' },
    });
    await ctx.route('**://*.{googletagmanager,google-analytics,facebook,hotjar,iubenda,mailmunch,google}.*/**', r => r.abort());
    await ctx.route('**://static.hotjar.com/**', r => r.abort());
    await ctx.route('**://a.mailmunch.co/**', r => r.abort());
    await ctx.route('**://c*.iubenda.com/**', r => r.abort());
    const page = await ctx.newPage();
    const dir = path.join(__dirname, OUT, vp.name);
    fs.mkdirSync(dir, { recursive: true });
    for (const u of urls) {
      const slug = (u === '/' ? 'home' : u.replace(/^\/|\/$/g, '').replace(/\//g, '__'));
      try {
        await page.goto(BASE + u, { waitUntil: 'networkidle', timeout: 45000 });
        // disattiva animazioni e forza il lazy-load
        await page.addStyleTag({ content: `*,*::before,*::after{animation:none!important;transition:none!important}
          #maskPreloader,.preloader{display:none!important}` });
        await page.evaluate(async () => {
          await new Promise(res => {
            let y = 0;
            const step = () => {
              window.scrollBy(0, window.innerHeight);
              y += window.innerHeight;
              if (y < document.body.scrollHeight + window.innerHeight) setTimeout(step, 60);
              else { window.scrollTo(0, 0); setTimeout(res, 400); }
            };
            step();
          });
        });
        await page.screenshot({ path: path.join(dir, slug + '.png'), fullPage: true });
        ok++;
      } catch (e) {
        fail++;
        console.error(`  FAIL ${vp.name} ${u}: ${e.message.split('\n')[0]}`);
      }
    }
    await ctx.close();
    console.log(`${vp.name}: fatti`);
  }
  await browser.close();
  console.log(`\nscreenshot riusciti: ${ok}  falliti: ${fail}`);
})();
