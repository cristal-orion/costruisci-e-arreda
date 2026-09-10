const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  await p.goto('http://localhost:4321/', { waitUntil: 'load' });
  await p.evaluate(async () => {
    const passo = window.innerHeight / 2;
    for (let y = 0; y < document.body.scrollHeight; y += passo) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 120)); }
    window.scrollTo(0, document.body.scrollHeight);
    await new Promise(r => setTimeout(r, 600));
  });
  await p.waitForLoadState('networkidle').catch(() => {});
  const r = await p.evaluate(() => performance.getEntriesByType('resource')
    .map(x => ({ url: x.name.replace(location.origin, ''), kb: +(x.transferSize / 1024).toFixed(1), tipo: x.initiatorType }))
    .sort((a, b) => b.kb - a.kb));
  const nav = await p.evaluate(() => performance.getEntriesByType('navigation')[0].transferSize);
  console.log(`HTML  ${(nav/1024).toFixed(1)} KB`);
  for (const x of r) console.log(`${String(x.kb).padStart(7)} KB  ${x.tipo.padEnd(6)} ${x.url}`);
  console.log('totale', ((r.reduce((s,x)=>s+x.kb,0)*1024 + nav)/1024/1024).toFixed(3), 'MB in', r.length + 1, 'richieste');
  await b.close();
})();
