/**
 * Velatura con lo stop di mezzo agganciato a **dove arriva l'insegna**, non a
 * una percentuale fissa: sale al 61-68% dell'altezza su desktop e al 72-81% su
 * telefono (misurato), quindi uno stop unico al 42% lascia il nome nella parte
 * chiara del gradiente proprio dove la campata è bassa.
 */
const { chromium } = require('playwright');
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
const CANDIDATI = [
  { b: 86, m: 60, t: 12, pGrande: 70, pPiccolo: 85, nota: 'riposo' },
  { b: 84, m: 58, t: 10, pGrande: 70, pPiccolo: 85, nota: 'riposo più leggero' },
  { b: 86, m: 60, t: 2, pGrande: 70, pPiccolo: 85, nota: 'puntata: si schiarisce solo il cielo' },
  { b: 84, m: 56, t: 0, pGrande: 70, pPiccolo: 85, nota: 'puntata, più leggera' },
];
const css = (c) => `
  .parete__campata::after {
    background: linear-gradient(to top, rgb(0 0 0 / ${c.b}%) 0%, rgb(0 0 0 / ${c.m}%) var(--velo-meta), rgb(0 0 0 / ${c.t}%) 100%) !important;
    opacity: 1 !important;
  }
  .parete__campata { --velo-meta: ${c.pPiccolo}%; }
  @media (min-width: 769px) { .parete__campata { --velo-meta: ${c.pGrande}%; } }
`;

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
    for (const vp of VIEWPORTS) {
      const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
      const page = await ctx.newPage();
      await page.goto('http://localhost:4321/', { waitUntil: 'load' });
      await page.addStyleTag({ content: css(cand) });
      await page.waitForTimeout(600);
      await page.evaluate(() => Promise.all([...document.querySelectorAll('.parete__foto')].map((i) => i.decode().catch(() => {}))));
      const campate = await page.$$('.parete__campata');
      for (let i = 0; i < campate.length; i++) {
        const nome = await campate[i].$eval('.parete__nome', (e) => e.textContent.trim().slice(0, 14));
        for (const parte of PARTI) {
          const el = await campate[i].$(parte.sel);
          if (!el) continue;
          const box = await el.boundingBox();
          if (!box) continue;
          await campate[i].$eval('.parete__insegna', (e) => (e.style.visibility = 'hidden'));
          const shot = await page.screenshot({ fullPage: true, clip: { x: Math.round(box.x), y: Math.round(box.y), width: Math.round(box.width), height: Math.round(box.height) } });
          await campate[i].$eval('.parete__insegna', (e) => (e.style.visibility = ''));
          const s = await analizza(page, shot.toString('base64'), parte.alpha, parte.soglia);
          if (s.p1 - parte.soglia < margine) { margine = s.p1 - parte.soglia; caso = `${vp.nome} · ${nome} · ${parte.etichetta} ${s.p1.toFixed(2)}:1`; }
          if (s.sotto > area) area = s.sotto;
        }
      }
      await ctx.close();
    }
    console.log(`${margine >= 0 ? 'PASSA' : 'no   '}  ${cand.b}/${cand.m}/${cand.t} stop ${cand.pGrande}/${cand.pPiccolo}%  margine ${margine >= 0 ? '+' : ''}${margine.toFixed(2)} → ${caso}  | area max ${(area * 100).toFixed(1)}%  (${cand.nota})`);
  }
  await browser.close();
})();
