const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  for (const vp of [{n:'desktop',w:1440,h:900},{n:'tablet',w:900,h:1000},{n:'mobile',w:390,h:844}]) {
    const ctx = await b.newContext({ viewport: { width: vp.w, height: vp.h } });
    const p = await ctx.newPage();
    await p.goto('http://localhost:4321/', { waitUntil: 'load' });
    await p.waitForTimeout(600);
    const r = await p.evaluate(() => [...document.querySelectorAll('.parete__campata')].map((c) => {
      const camp = c.getBoundingClientRect(), ins = c.querySelector('.parete__insegna').getBoundingClientRect();
      return {
        nome: c.querySelector('.parete__nome').textContent.trim().slice(0, 22),
        campata: `${Math.round(camp.width)}×${Math.round(camp.height)}`,
        insegna: Math.round(ins.height),
        // quanto sale l'insegna dal fondo della campata, in px e in % dell'altezza
        daFondo: Math.round(camp.bottom - ins.top),
        pct: Math.round(((camp.bottom - ins.top) / camp.height) * 100),
      };
    }));
    console.log(`\n${vp.n} ${vp.w}px`);
    for (const x of r) console.log(`  ${x.nome.padEnd(24)} campata ${x.campata.padEnd(9)} insegna ${String(x.insegna).padStart(3)}px · sale ${String(x.daFondo).padStart(3)}px dal fondo (${x.pct}%)`);
    await ctx.close();
  }
  await b.close();
})();
