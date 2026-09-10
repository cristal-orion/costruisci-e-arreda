/* Stesso peso, due modi di scorrere: salto secco in fondo vs passi da mezzo viewport. */
const { chromium } = require('playwright');
const misura = async (b, modo) => {
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  await p.goto('http://localhost:4321/', { waitUntil: 'load' });
  if (modo === 'salto') {
    await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await p.waitForTimeout(1500);
  } else {
    await p.evaluate(async () => {
      const passo = window.innerHeight / 2;
      for (let y = 0; y < document.body.scrollHeight; y += passo) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 120)); }
      window.scrollTo(0, document.body.scrollHeight);
      await new Promise(r => setTimeout(r, 600));
    });
  }
  await p.waitForLoadState('networkidle').catch(() => {});
  const m = await p.evaluate(() => {
    const r = performance.getEntriesByType('resource');
    const nav = performance.getEntriesByType('navigation')[0];
    return { mb: (r.reduce((s, x) => s + x.transferSize, 0) + nav.transferSize) / 1024 / 1024, n: r.length + 1 };
  });
  await ctx.close();
  console.log(`${modo.padEnd(7)} ${m.mb.toFixed(2)} MB · ${m.n} richieste`);
};
(async () => { const b = await chromium.launch(); await misura(b, 'salto'); await misura(b, 'passi'); await b.close(); })();
