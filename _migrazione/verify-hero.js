// Verifica hero: distanza del titolo dal bordo del riquadro, a più larghezze.
// Uso: node verify-hero.js <url> <outPrefix>
const { chromium } = require('playwright');
const fs = require('fs'); const path = require('path');
const URL = process.argv[2] || 'http://127.0.0.1:8080/i-nostri-lavori/';
const PREFIX = process.argv[3] || 'hero';
const WIDTHS = [768, 900, 1024, 1100, 1280, 1366, 1440, 1600, 1920, 2560];
(async () => {
  const browser = await chromium.launch();
  const out = path.join(__dirname, 'baseline', 'hero-check');
  fs.mkdirSync(out, { recursive: true });
  for (const w of WIDTHS) {
    const ctx = await browser.newContext({ viewport: { width: w, height: 800 } });
    for (const p of ['**://*.{googletagmanager,google-analytics,facebook,hotjar,iubenda,mailmunch,google}.*/**',
                     '**://static.hotjar.com/**', '**://a.mailmunch.co/**']) await ctx.route(p, r => r.abort());
    const page = await ctx.newPage();
    await page.goto(URL, { waitUntil: 'networkidle', timeout: 45000 });
    await page.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important}#maskPreloader,.preloader{display:none!important}' });
    await page.locator('.boxSlider .singleImage').first()
      .screenshot({ path: path.join(out, `${PREFIX}-${w}.png`) });
    const m = await page.evaluate(() => {
      const box = document.querySelector('.boxSlider .singleImage');
      const t = document.querySelector('.boxSlider .singleImage .wrapper .infoImg .title');
      const sub = document.querySelector('.boxSlider .singleImage .wrapper .infoImg h2');
      const wr = document.querySelector('.boxSlider .singleImage .wrapper');
      const b = box.getBoundingClientRect(), r = t.getBoundingClientRect();
      return {
        dalBordo: Math.round(r.left - b.left),
        dalBordoSub: sub ? Math.round(sub.getBoundingClientRect().left - b.left) : null,
        vsContenuto: Math.round(r.left - wr.getBoundingClientRect().left),
        font: Math.round(parseFloat(getComputedStyle(t).fontSize)),
        overflowDx: Math.round(r.right - b.right),
      };
    });
    const flag = m.dalBordo < 0 ? ' <-- TAGLIATO' : (m.dalBordo < 24 ? ' <-- troppo vicino' : '');
    console.log(`  ${String(w).padStart(4)}px  font ${String(m.font).padStart(2)}px  ` +
      `dal bordo ${String(m.dalBordo).padStart(4)}px  (sottotitolo ${String(m.dalBordoSub).padStart(4)}px)  ` +
      `vs colonna testo ${m.vsContenuto >= 0 ? '+' : ''}${m.vsContenuto}px${flag}`);
    await ctx.close();
  }
  await browser.close();
})();
