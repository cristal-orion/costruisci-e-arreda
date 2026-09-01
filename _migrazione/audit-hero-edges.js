// Misura, su ogni pagina con hero, la distanza del blocco titolo dai 4 bordi del riquadro
// e l'eventuale ritaglio. Uso: node audit-hero-edges.js <viewportWidth>
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const W = parseInt(process.argv[2] || '390', 10);
const routes = fs.readFileSync(path.join(__dirname,'baseline','routes.txt'),'utf8')
  .split('\n').map(s=>s.trim()).filter(Boolean);
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport:{width:W,height:800} });
  for (const p of ['**://*.{googletagmanager,google-analytics,facebook,hotjar,iubenda,mailmunch,google}.*/**',
                   '**://static.hotjar.com/**','**://a.mailmunch.co/**']) await ctx.route(p, r=>r.abort());
  const page = await ctx.newPage();
  const rows=[];
  for (const u of routes) {
    try {
      await page.goto('http://127.0.0.1:8080'+u, { waitUntil:'load', timeout:30000 });
      const m = await page.evaluate(() => {
        const box=document.querySelector('.boxSlider .singleImage');
        if(!box) return null;
        const info=box.querySelector('.wrapper .infoImg');
        if(!info) return null;
        const t=info.querySelector('.title');
        const bb=box.getBoundingClientRect(), ib=info.getBoundingClientRect();
        return {
          sx: Math.round(ib.left-bb.left), dx: Math.round(bb.right-ib.right),
          top: Math.round(ib.top-bb.top),  bot: Math.round(bb.bottom-ib.bottom),
          heroH: Math.round(bb.height), infoH: Math.round(ib.height),
          testo: t? t.textContent.trim().slice(0,34):'',
          righe: t? Math.round(t.getBoundingClientRect().height/parseFloat(getComputedStyle(t).fontSize)):0,
        };
      });
      if(m) rows.push({u,...m});
    } catch(e){ rows.push({u, err:e.message.split('\n')[0]}); }
  }
  await b.close();
  const bad = rows.filter(r=>!r.err && (r.sx<16||r.dx<0||r.top<0||r.bot<16));
  console.log(`viewport ${W}px — pagine con hero: ${rows.filter(r=>!r.err).length}`);
  console.log(`problemi (bordo < 16px o ritaglio): ${bad.length}`);
  for(const r of bad) console.log(`   sx${String(r.sx).padStart(5)} dx${String(r.dx).padStart(5)} top${String(r.top).padStart(5)} bot${String(r.bot).padStart(5)}  ${r.u}  "${r.testo}"`);
  const minBot = rows.filter(r=>!r.err).reduce((a,r)=>Math.min(a,r.bot),1e9);
  const minSx  = rows.filter(r=>!r.err).reduce((a,r)=>Math.min(a,r.sx),1e9);
  console.log(`\nminimi osservati:  sinistra ${minSx}px   fondo ${minBot}px`);
  fs.writeFileSync(path.join(__dirname,'baseline',`audit-hero-${W}.json`), JSON.stringify(rows,null,1));
})();
