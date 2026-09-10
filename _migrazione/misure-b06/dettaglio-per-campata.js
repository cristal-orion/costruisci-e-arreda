/**
 * Quanto contrasto ha davvero il testo delle insegne sopra le foto vere.
 *
 * Non legge i valori dichiarati nel CSS: nasconde il testo, fotografa il fondo
 * come il browser lo compone (foto + velatura), e per ogni pixel calcola il
 * rapporto di contrasto con il colore che il testo ha davvero in quel punto —
 * il bianco è a 88% e 72% di opacità, quindi si mescola con ciò che ha sotto.
 * Il `text-shadow` non è contato: WCAG non lo conta.
 */
const { chromium } = require('playwright');

const BASE = process.argv[2] || 'http://localhost:4321';
const VIEWPORTS = [
  { nome: 'desktop', width: 1440, height: 900 },
  { nome: 'tablet', width: 900, height: 1000 },
  { nome: 'mobile', width: 390, height: 844 },
];
/* selettore, opacità del bianco, soglia WCAG (il nome è > 24px: testo grande) */
const PARTI = [
  { sel: '.parete__nome', alpha: 1, soglia: 3.0, etichetta: 'nome' },
  { sel: '.parete__cosa', alpha: 0.88, soglia: 4.5, etichetta: 'descrizione' },
  { sel: '.parete__dove', alpha: 0.72, soglia: 4.5, etichetta: 'sedi' },
];

(async () => {
  const browser = await chromium.launch();

  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    const page = await ctx.newPage();
    await page.goto(BASE + '/', { waitUntil: 'load' });
    await page.waitForTimeout(800);
    // le foto sono `lazy`: aspetta che siano decodificate davvero
    await page.evaluate(() => Promise.all(
      [...document.querySelectorAll('.parete__foto')].map((i) => i.decode().catch(() => {})),
    ));
    await page.waitForTimeout(400);

    console.log(`\n### ${vp.nome} ${vp.width}px`);
    const campate = await page.$$('.parete__campata');

    for (let i = 0; i < campate.length; i++) {
      const nome = await campate[i].$eval('.parete__nome', (e) => e.textContent.trim());
      const out = [];

      for (const parte of PARTI) {
        const el = await campate[i].$(parte.sel);
        if (!el) continue;
        const box = await el.boundingBox();
        if (!box || box.width < 2 || box.height < 2) continue;

        // nasconde tutta l'insegna: fotografa il fondo, non il testo
        await campate[i].$eval('.parete__insegna', (e) => (e.style.visibility = 'hidden'));
        const shot = await page.screenshot({
          fullPage: true,
          clip: { x: Math.round(box.x), y: Math.round(box.y), width: Math.round(box.width), height: Math.round(box.height) },
        });
        await campate[i].$eval('.parete__insegna', (e) => (e.style.visibility = ''));

        const stat = await page.evaluate(async ({ b64, alpha, soglia }) => {
          const blob = await (await fetch('data:image/png;base64,' + b64)).blob();
          const bmp = await createImageBitmap(blob);
          const cv = new OffscreenCanvas(bmp.width, bmp.height);
          const cx = cv.getContext('2d');
          cx.drawImage(bmp, 0, 0);
          const d = cx.getImageData(0, 0, bmp.width, bmp.height).data;

          const lin = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
          const lum = (r, g, b) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);

          const rapporti = [];
          for (let p = 0; p < d.length; p += 4) {
            const [r, g, b] = [d[p], d[p + 1], d[p + 2]];
            // il testo è bianco con `alpha`: sopra questo pixel diventa questo colore
            const tr = alpha * 255 + (1 - alpha) * r;
            const tg = alpha * 255 + (1 - alpha) * g;
            const tb = alpha * 255 + (1 - alpha) * b;
            const lf = lum(r, g, b), lt = lum(tr, tg, tb);
            rapporti.push((Math.max(lf, lt) + 0.05) / (Math.min(lf, lt) + 0.05));
          }
          rapporti.sort((a, b) => a - b);
          const perc = (q) => rapporti[Math.floor(q * (rapporti.length - 1))];
          return {
            peggio: rapporti[0],
            p1: perc(0.01),
            medio: rapporti.reduce((s, x) => s + x, 0) / rapporti.length,
            pixel: rapporti.length,
            sottoSoglia: rapporti.filter((x) => x < soglia).length / rapporti.length,
          };
        }, { b64: shot.toString('base64'), alpha: parte.alpha, soglia: parte.soglia });

        out.push({ ...parte, ...stat });
      }

      console.log(`  ${nome}`);
      for (const o of out) {
        const esito = o.p1 >= o.soglia ? 'ok  ' : 'NO  ';
        console.log(
          `    ${esito}${o.etichetta.padEnd(11)} peggiore ${o.peggio.toFixed(2)} · 1° percentile ` +
          `${o.p1.toFixed(2)} · medio ${o.medio.toFixed(2)} · sotto ${o.soglia}:1 il ` +
          `${(o.sottoSoglia * 100).toFixed(1)}% dell'area`,
        );
      }
    }
    await ctx.close();
  }
  await browser.close();
})();
