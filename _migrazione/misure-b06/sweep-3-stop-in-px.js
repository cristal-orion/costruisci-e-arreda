/**
 * Stop di mezzo ancorato in **px dal fondo** invece che in percentuale:
 * l'insegna è alta più o meno uguale a tutte le larghezze (140-196px misurati),
 * mentre la campata cambia da 240 a 464px. Una percentuale insegue la campata,
 * i px inseguono l'insegna — che è quello che il gradiente deve coprire.
 * Provato a sette larghezze, comprese quelle di confine dei breakpoint.
 */
const { chromium } = require('playwright');
const LARGHEZZE = [1440, 1200, 1199, 992, 900, 769, 768, 600, 390];
const PARTI = [
  { sel: '.parete__nome', alpha: 1, soglia: 3.0, etichetta: 'nome' },
  { sel: '.parete__cosa', alpha: 0.88, soglia: 4.5, etichetta: 'descrizione' },
  { sel: '.parete__dove', alpha: 0.72, soglia: 4.5, etichetta: 'sedi' },
];
const CANDIDATI = [
  { b: 84, m: 58, t: 10, base: [200, 210, 320], nota: 'a riposo' },
  { b: 84, m: 58, t: 0, base: [200, 210, 320], nota: 'puntata (si schiarisce il cielo)' },
  { b: 84, m: 48, t: 0, base: [200, 210, 320], nota: 'puntata, anche la fascia di mezzo' },
  { b: 84, m: 40, t: 0, base: [200, 210, 320], nota: 'puntata, molto più chiara' },
];
const css = (c) => `
  .parete__campata { --velo-base: ${c.base[0]}px; }
  @media (min-width: 769px) { .parete__campata { --velo-base: ${c.base[1]}px; } }
  @media (min-width: 1200px) { .parete__campata { --velo-base: ${c.base[2]}px; } }
  .parete__campata::after {
    background: linear-gradient(to top, rgb(0 0 0 / ${c.b}%) 0, rgb(0 0 0 / ${c.m}%) var(--velo-base), rgb(0 0 0 / ${c.t}%) 100%) !important;
    opacity: 1 !important;
  }`;

const analizza = (page, b64, alpha, soglia) => page.evaluate(async ({ b64, alpha, soglia }) => {
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
  return { p1: rap[Math.floor(0.01 * (rap.length - 1))], sotto: rap.filter((x) => x < soglia).length / rap.length };
}, { b64, alpha, soglia });

(async () => {
  const browser = await chromium.launch();
  for (const cand of CANDIDATI) {
    let margine = Infinity, caso = '', area = 0;
    for (const w of LARGHEZZE) {
      const ctx = await browser.newContext({ viewport: { width: w, height: 900 } });
      const page = await ctx.newPage();
      await page.goto('http://localhost:4321/', { waitUntil: 'load' });
      await page.addStyleTag({ content: css(cand) });
      await page.waitForTimeout(500);
      await page.evaluate(() => Promise.all([...document.querySelectorAll('.parete__foto')].map((i) => i.decode().catch(() => {}))));
      const campate = await page.$$('.parete__campata');
      for (let i = 0; i < campate.length; i++) {
        const nome = await campate[i].$eval('.parete__nome', (e) => e.textContent.trim().slice(0, 12));
        for (const parte of PARTI) {
          const el = await campate[i].$(parte.sel);
          if (!el) continue;
          const box = await el.boundingBox();
          if (!box) continue;
          await campate[i].$eval('.parete__insegna', (e) => (e.style.visibility = 'hidden'));
          const shot = await page.screenshot({ fullPage: true, clip: { x: Math.round(box.x), y: Math.round(box.y), width: Math.round(box.width), height: Math.round(box.height) } });
          await campate[i].$eval('.parete__insegna', (e) => (e.style.visibility = ''));
          const s = await analizza(page, shot.toString('base64'), parte.alpha, parte.soglia);
          if (s.p1 - parte.soglia < margine) { margine = s.p1 - parte.soglia; caso = `${w}px · ${nome} · ${parte.etichetta} ${s.p1.toFixed(2)}:1`; }
          if (s.sotto > area) area = s.sotto;
        }
      }
      await ctx.close();
    }
    console.log(`${margine >= 0 ? 'PASSA' : 'no   '}  ${cand.b}/${cand.m}/${cand.t} base ${cand.base.join('/')}px  margine ${margine >= 0 ? '+' : ''}${margine.toFixed(2)} → ${caso} | area max ${(area * 100).toFixed(1)}%  (${cand.nota})`);
  }
  await browser.close();
})();
