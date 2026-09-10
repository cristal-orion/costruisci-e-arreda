/* I browser interpolano davvero un gradiente in transizione? Misurato, non dedotto. */
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await (await b.newContext()).newPage();
  await p.setContent(`<style>
    #x { width: 200px; height: 200px;
         background-image: linear-gradient(to top, rgb(0 0 0 / 84%) 0px, rgb(0 0 0 / 58%) 100px, rgb(0 0 0 / 10%) 100%);
         transition: background-image 600ms linear; }
    #x.su { background-image: linear-gradient(to top, rgb(0 0 0 / 84%) 0px, rgb(0 0 0 / 48%) 100px, rgb(0 0 0 / 0%) 100%); }
  </style><div id="x"></div>`);
  await p.evaluate(() => document.getElementById('x').classList.add('su'));
  await p.waitForTimeout(300);
  console.log('a metà transizione:', await p.evaluate(() => getComputedStyle(document.getElementById('x')).backgroundImage));
  await p.waitForTimeout(500);
  console.log('a fine transizione: ', await p.evaluate(() => getComputedStyle(document.getElementById('x')).backgroundImage));
  await b.close();
})();
