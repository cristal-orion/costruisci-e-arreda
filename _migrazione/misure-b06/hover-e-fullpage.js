/* Il fullPage screenshot conserva lo stato :hover? Misurato sulla luminanza media. */
const { chromium } = require('playwright');
const media = (page, b64) => page.evaluate(async (b64) => {
  const blob = await (await fetch('data:image/png;base64,' + b64)).blob();
  const bmp = await createImageBitmap(blob);
  const cv = new OffscreenCanvas(bmp.width, bmp.height);
  const cx = cv.getContext('2d'); cx.drawImage(bmp, 0, 0);
  const d = cx.getImageData(0, 0, bmp.width, bmp.height).data;
  let s = 0; for (let p = 0; p < d.length; p += 4) s += (d[p] + d[p+1] + d[p+2]) / 3;
  return s / (d.length / 4);
}, b64);

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1200, height: 1400 } });
  const p = await ctx.newPage();
  await p.goto('http://localhost:4321/', { waitUntil: 'load' });
  await p.waitForTimeout(600);
  await p.evaluate(() => Promise.all([...document.querySelectorAll('.parete__foto')].map(i => i.decode().catch(()=>{}))));
  const camp = (await p.$$('.parete__campata'))[1];
  const nome = await camp.$('.parete__nome');
  const box = await nome.boundingBox();
  const clip = { x: Math.round(box.x), y: Math.round(box.y), width: Math.round(box.width), height: Math.round(box.height) };
  const scatta = async (full) => {
    await camp.$eval('.parete__insegna', e => e.style.visibility = 'hidden');
    const s = await p.screenshot(full ? { fullPage: true, clip } : { clip });
    await camp.$eval('.parete__insegna', e => e.style.visibility = '');
    return media(p, s.toString('base64'));
  };
  console.log('riposo   viewport', (await scatta(false)).toFixed(1), ' fullPage', (await scatta(true)).toFixed(1));
  await camp.hover();
  await p.waitForTimeout(600);
  console.log('puntata  viewport', (await scatta(false)).toFixed(1), ' fullPage', (await scatta(true)).toFixed(1));
  console.log('opacity ::before ora:', await p.evaluate(() => getComputedStyle(document.querySelectorAll('.parete__campata')[1], '::before').opacity));
  await b.close();
})();
