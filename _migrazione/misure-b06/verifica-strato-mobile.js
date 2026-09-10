const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  await p.goto('http://localhost:4321/', { waitUntil: 'load' });
  await p.waitForTimeout(500);
  const leggi = () => p.evaluate(() => {
    const c = document.querySelectorAll('.parete__campata')[2];
    const st = getComputedStyle(c, '::before');
    return { opacity: st.opacity, bg: st.backgroundImage.slice(0, 60), veloBase: getComputedStyle(c).getPropertyValue('--velo-base') };
  });
  console.log('prima  ', await leggi());
  await p.hover('.parete__campata:nth-of-type(3)');
  await p.waitForTimeout(600);
  console.log('puntata', await leggi());
  await b.close();
})();
