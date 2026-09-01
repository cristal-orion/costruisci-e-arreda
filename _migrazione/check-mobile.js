const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  for (const w of [360, 390, 480, 600, 700, 768, 800]) {
    const ctx = await b.newContext({ viewport: { width: w, height: 800 } });
    for (const p of ['**://*.{googletagmanager,google-analytics,facebook,hotjar,iubenda,mailmunch,google}.*/**',
                     '**://static.hotjar.com/**', '**://a.mailmunch.co/**']) await ctx.route(p, r => r.abort());
    const p2 = await ctx.newPage();
    await p2.goto('http://127.0.0.1:8080/i-nostri-lavori/', { waitUntil: 'networkidle' });
    const m = await p2.evaluate(() => {
      const box = document.querySelector('.boxSlider .singleImage');
      const t = document.querySelector('.boxSlider .singleImage .wrapper .infoImg .title');
      const bb = box.getBoundingClientRect(), r = t.getBoundingClientRect();
      return { f: Math.round(parseFloat(getComputedStyle(t).fontSize)),
               dal: Math.round(r.left - bb.left), over: Math.round(r.right - bb.right) };
    });
    console.log(`  ${String(w).padStart(4)}px  font ${String(m.f).padStart(2)}px  dal bordo ${String(m.dal).padStart(3)}px${m.over>0?'   overflow dx '+m.over+'px':''}`);
    await ctx.close();
  }
  await b.close();
})();
