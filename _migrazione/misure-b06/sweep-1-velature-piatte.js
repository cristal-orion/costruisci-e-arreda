/**
 * Prova più velature e misura, per ognuna, il contrasto peggiore delle insegne
 * sulle foto vere, ai tre viewport. Sceglie il minimo che passa, non il più scuro.
 */
const { chromium } = require('playwright');

const BASE = 'http://localhost:4321';
const VIEWPORTS = [
  { nome: 'desktop', width: 1440, height: 900 },
  { nome: 'tablet', width: 900, height: 1000 },
  { nome: 'mobile', width: 390, height: 844 },
];
const PARTI = [
  { sel: '.parete__nome', alpha: 1, soglia: 3.0, etichetta: 'nome' },
  { sel: '.parete__cosa', alpha: 0.88, soglia: 4.5, etichetta: 'descrizione' },
  { sel: '.parete__dove', alpha: 0.72, soglia: 4.5, etichetta: 'sedi' },
];
/** basso, metà (al 42%), alto */
/** basso, metà, alto, opacità della velatura (1 = a riposo, 0.7 = puntata) */
const CANDIDATI = [
  [86, 62, 4, 1],
  [86, 58, 4, 1],
  [86, 56, 6, 1],
  [84, 54, 4, 1],
];

const css = ([b, m, a, op]) =>
  `.parete__campata::after { background: linear-gradient(to top, rgb(0 0 0 / ${b}%) 0%, rgb(0 0 0 / ${m}%) 42%, rgb(0 0 0 / ${a}%) 100%) !important; opacity: ${op} !important; }`;

const analizza = async (page, shotB64, alpha, soglia) =>
  page.evaluate(async ({ b64, alpha, soglia }) => {
    const blob = await (await fetch('data:image/png;base64,' + b64)).blob();
    const bmp = await createImageBitmap(blob);
    const cv = new OffscreenCanvas(bmp.width, bmp.height);
    const cx = cv.getContext('2d');
    cx.drawImage(bmp, 0, 0);
    const d = cx.getImageData(0, 0, bmp.width, bmp.height).data;
    const lin = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
    const lum = (r, g, b) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
    const rap = [];
    for (let p = 0; p < d.length; p += 4) {
      const [r, g, b] = [d[p], d[p + 1], d[p + 2]];
      const lf = lum(r, g, b);
      const lt = lum(alpha * 255 + (1 - alpha) * r, alpha * 255 + (1 - alpha) * g, alpha * 255 + (1 - alpha) * b);
      rap.push((Math.max(lf, lt) + 0.05) / (Math.min(lf, lt) + 0.05));
    }
    rap.sort((a, b) => a - b);
    return {
      p1: rap[Math.floor(0.01 * (rap.length - 1))],
      peggio: rap[0],
      sotto: rap.filter((x) => x < soglia).length / rap.length,
    };
  }, { b64: shotB64, alpha, soglia });

(async () => {
  const browser = await chromium.launch();

  for (const cand of CANDIDATI) {
    let peggiorMargine = Infinity, peggiorCaso = '', areaMax = 0, areaCaso = '';

    for (const vp of VIEWPORTS) {
      const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
      const page = await ctx.newPage();
      await page.goto(BASE + '/', { waitUntil: 'load' });
      await page.addStyleTag({ content: css(cand) });
      await page.waitForTimeout(600);
      await page.evaluate(() => Promise.all(
        [...document.querySelectorAll('.parete__foto')].map((i) => i.decode().catch(() => {}))));
      await page.waitForTimeout(300);

      const campate = await page.$$('.parete__campata');
      for (let i = 0; i < campate.length; i++) {
        const nome = await campate[i].$eval('.parete__nome', (e) => e.textContent.trim());
        for (const parte of PARTI) {
          const el = await campate[i].$(parte.sel);
          if (!el) continue;
          const box = await el.boundingBox();
          if (!box || box.width < 2 || box.height < 2) continue;
          await campate[i].$eval('.parete__insegna', (e) => (e.style.visibility = 'hidden'));
          const shot = await page.screenshot({
            fullPage: true,
            clip: { x: Math.round(box.x), y: Math.round(box.y), width: Math.round(box.width), height: Math.round(box.height) },
          });
          await campate[i].$eval('.parete__insegna', (e) => (e.style.visibility = ''));
          const s = await analizza(page, shot.toString('base64'), parte.alpha, parte.soglia);
          const margine = s.p1 - parte.soglia;
          const dove = `${vp.nome} · ${nome} · ${parte.etichetta}`;
          if (margine < peggiorMargine) { peggiorMargine = margine; peggiorCaso = `${dove} (${s.p1.toFixed(2)}:1)`; }
          if (s.sotto > areaMax) { areaMax = s.sotto; areaCaso = dove; }
        }
      }
      await ctx.close();
    }

    const esito = peggiorMargine >= 0 ? 'PASSA' : 'no   ';
    console.log(
      `${esito}  ${String(cand[0]).padStart(2)}/${cand[1]}/${cand[2]} @${cand[3]}  ` +
      `margine peggiore ${peggiorMargine >= 0 ? '+' : ''}${peggiorMargine.toFixed(2)} → ${peggiorCaso}  ` +
      `| area sotto soglia max ${(areaMax * 100).toFixed(1)}% (${areaCaso})`,
    );
  }
  await browser.close();
})();
