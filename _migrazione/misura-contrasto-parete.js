/**
 * misura-contrasto-parete.js — il contrasto del testo delle insegne sulle foto
 * della parete (`HeroRami`), misurato come lo compone il browser.
 *
 * Non legge i valori dichiarati nel CSS e non guarda le catture a occhio:
 * nasconde l'insegna, fotografa il fondo (foto + velatura), e per ogni pixel
 * calcola il rapporto di contrasto con il colore che il testo ha **davvero** lì
 * sopra — il bianco delle due righe minori è all'88% e al 72% di opacità,
 * quindi si mescola con quello che ha sotto. Il `text-shadow` non è contato:
 * WCAG non lo conta, e la velatura deve reggere da sola.
 *
 * Misura i due stati, perché sono due: a riposo e **puntata**. Lo stato puntato
 * non è transitorio per chi arriva con la tastiera, e alleggerire la velatura
 * lì aveva portato le sedi di Ferramenta sotto soglia sul 100% dell'area.
 *
 * Il verdetto è sul **1° percentile**, non sul pixel peggiore: un pixel chiaro
 * in un buco fra due lettere non è un problema di leggibilità, una zona sì.
 * Viene stampata anche la quota di area sotto soglia.
 *
 *   node misura-contrasto-parete.js [http://localhost:4321]
 * Esce con 1 se una qualsiasi misura non passa: si può usare come cancello.
 *
 * Da rieseguire ogni volta che cambiano le foto, i testi delle insegne o la
 * velatura: sono le tre cose da cui dipende il risultato.
 */
const { chromium } = require('playwright');

const BASE = process.argv[2] || 'http://localhost:4321';
/* Le larghezze includono i confini dei breakpoint: è lì che le campate
   cambiano proporzione, e il difetto trovato in B03 viveva esattamente lì. */
const LARGHEZZE = [1440, 1200, 1199, 992, 900, 769, 768, 600, 390];
const PARTI = [
  /* Il nome è oltre i 24px: per WCAG è testo grande, soglia 3:1. */
  { sel: '.parete__nome', alpha: 1, soglia: 3.0, etichetta: 'nome' },
  { sel: '.parete__cosa', alpha: 0.88, soglia: 4.5, etichetta: 'descrizione' },
  { sel: '.parete__dove', alpha: 0.72, soglia: 4.5, etichetta: 'sedi' },
];

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
  return {
    p1: rap[Math.floor(0.01 * (rap.length - 1))],
    peggio: rap[0],
    sotto: rap.filter((x) => x < soglia).length / rap.length,
  };
}, { b64, alpha, soglia });

(async () => {
  const browser = await chromium.launch();
  const bocciati = [];

  for (const stato of ['riposo', 'puntata']) {
    let peggiorMargine = Infinity, peggiorCaso = '', areaMax = 0, areaCaso = '';

    for (const w of LARGHEZZE) {
      const ctx = await browser.newContext({ viewport: { width: w, height: 900 } });
      const page = await ctx.newPage();
      await page.goto(BASE + '/', { waitUntil: 'load' });
      await page.waitForTimeout(500);
      await page.evaluate(() => Promise.all(
        [...document.querySelectorAll('.parete__foto')].map((i) => i.decode().catch(() => {}))));

      const campate = await page.$$('.parete__campata');
      for (const campata of campate) {
        const nome = await campata.$eval('.parete__nome', (e) => e.textContent.trim());
        if (stato === 'puntata') {
          await campata.hover();
          await page.waitForTimeout(500); // la dissolvenza dello strato mobile
        }

        for (const parte of PARTI) {
          const el = await campata.$(parte.sel);
          if (!el) continue;
          const box = await el.boundingBox();
          if (!box || box.width < 2 || box.height < 2) continue;
          const scroll = await page.evaluate(() => window.scrollY);

          await campata.$eval('.parete__insegna', (e) => (e.style.visibility = 'hidden'));
          const shot = await page.screenshot({
            fullPage: true,
            clip: {
              x: Math.round(box.x),
              y: Math.round(box.y + scroll),
              width: Math.round(box.width),
              height: Math.round(box.height),
            },
          });
          await campata.$eval('.parete__insegna', (e) => (e.style.visibility = ''));

          const s = await analizza(page, shot.toString('base64'), parte.alpha, parte.soglia);
          const dove = `${w}px · ${nome} · ${parte.etichetta}`;
          if (s.p1 - parte.soglia < peggiorMargine) {
            peggiorMargine = s.p1 - parte.soglia;
            peggiorCaso = `${dove} ${s.p1.toFixed(2)}:1 (soglia ${parte.soglia})`;
          }
          if (s.sotto > areaMax) { areaMax = s.sotto; areaCaso = dove; }
          if (s.p1 < parte.soglia) bocciati.push(`${stato} · ${dove} ${s.p1.toFixed(2)}:1`);
        }
      }
      await ctx.close();
    }

    console.log(
      `${peggiorMargine >= 0 ? 'PASSA' : 'NO   '}  ${stato.padEnd(8)} margine peggiore ` +
      `${peggiorMargine >= 0 ? '+' : ''}${peggiorMargine.toFixed(2)} → ${peggiorCaso}\n` +
      `                area sotto soglia al massimo ${(areaMax * 100).toFixed(1)}%` +
      (areaMax > 0 ? ` (${areaCaso})` : ''),
    );
  }

  await browser.close();
  if (bocciati.length) {
    console.log(`\n${bocciati.length} misure sotto soglia:`);
    for (const b of bocciati) console.log('  ' + b);
    process.exit(1);
  }
})();
