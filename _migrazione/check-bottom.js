const { chromium } = require('playwright');
const fs=require('fs'), path=require('path');
(async () => {
  const b = await chromium.launch();
  const out=path.join(__dirname,'baseline','hero-check'); fs.mkdirSync(out,{recursive:true});
  const tag = process.argv[2] || 'bottom';
  for (const w of [360, 390, 480, 600, 768, 900, 1440]) {
    const ctx = await b.newContext({ viewport: { width: w, height: 780 } });
    for (const p of ['**://*.{googletagmanager,google-analytics,facebook,hotjar,iubenda,mailmunch,google}.*/**',
                     '**://static.hotjar.com/**','**://a.mailmunch.co/**']) await ctx.route(p, r=>r.abort());
    const p2 = await ctx.newPage();
    await p2.goto('http://127.0.0.1:8080/i-nostri-lavori/', { waitUntil:'networkidle' });
    await p2.addStyleTag({content:'*,*::before,*::after{animation:none!important;transition:none!important}#maskPreloader,.preloader{display:none!important}'});
    await p2.locator('.boxSlider .singleImage').first().screenshot({path:path.join(out,`${tag}-${w}.png`)});
    const m = await p2.evaluate(() => {
      const box=document.querySelector('.boxSlider .singleImage');
      const info=document.querySelector('.boxSlider .singleImage .wrapper .infoImg');
      const t=document.querySelector('.boxSlider .singleImage .wrapper .infoImg .title');
      const sub=document.querySelector('.boxSlider .singleImage .wrapper .infoImg h2');
      const bb=box.getBoundingClientRect();
      const ib=info.getBoundingClientRect();
      const sb=sub?sub.getBoundingClientRect():null;
      // la riga rossa è un ::after del titoletto: prendi anche quella
      return {
        heroH: Math.round(bb.height),
        bloccoDalFondo: Math.round(bb.bottom - ib.bottom),
        sottoDalFondo: sb?Math.round(bb.bottom - sb.bottom):null,
        titoloDalTop: Math.round(t.getBoundingClientRect().top - bb.top),
      };
    });
    const flag = m.bloccoDalFondo < 0 ? ' <-- FUORI' : (m.bloccoDalFondo < 24 ? ' <-- troppo vicino' : '');
    console.log(`  ${String(w).padStart(4)}px  hero ${String(m.heroH).padStart(4)}px  blocco dal fondo ${String(m.bloccoDalFondo).padStart(4)}px  sottotitolo ${String(m.sottoDalFondo).padStart(4)}px${flag}`);
    await ctx.close();
  }
  await b.close();
})();
