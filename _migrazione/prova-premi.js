/**
 * /premi/: verifica del flusso demo e del layout sul build con la CSP di deploy.
 * Dalla radice dell’app: npm run build && node deploy/genera-csp.js dist deploy/csp.conf
 * Con `npm run preview` attivo: node _migrazione/prova-premi.js http://localhost:4321
 */
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { chromium } = require('playwright');

const base = process.argv[2] || 'http://localhost:4321';
const conf = resolve(__dirname, '../costruisciearreda-astro/deploy/csp.conf');
const policy = readFileSync(conf, 'utf8').match(/add_header\s+Content-Security-Policy\s+"([^"]+)"/)[1];

(async () => {
  const browser = await chromium.launch();
  try {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
    const azioni = [];
    await ctx.route(`${base}/premi/`, async route => {
      const response = await route.fetch();
      await route.fulfill({ response, headers: { ...response.headers(), 'content-security-policy': policy } });
    });
    await ctx.addInitScript(() => {
      window.violazioni = [];
      document.addEventListener('securitypolicyviolation', e => window.violazioni.push(e.violatedDirective + ': ' + e.blockedURI));
    });
    const page = await ctx.newPage();
    const errori = [];
    page.on('pageerror', e => errori.push(e.message));
    page.on('request', r => {
      if (r.method() !== 'GET') azioni.push(`${r.method()} ${r.url()}`);
    });
    const get = name => page.locator(`[data-${name}]`);
    const saldo = get('balance');
    const ordina = get('add');
    const portatile = page.locator('#premio-portatile button');
    const smartphone = page.locator('#premio-smartphone button');
    const dialog = page.getByRole('dialog');
    const conferma = dialog.getByRole('button', { name: 'Conferma' });

    assert.equal((await page.goto(`${base}/premi/`)).status(), 200);
    await page.waitForFunction(() => document.documentElement.dataset.momentsReady === '1');
    assert.equal(await page.locator('meta[name="robots"]').getAttribute('content'), 'noindex, nofollow');
    assert.equal(await saldo.textContent(), '8.420');
    assert.equal(await get('goal-name').textContent(), 'Portatile');
    assert.match(await get('goal-message').textContent(), /580 punti/);
    assert.equal(await get('goal-percent').textContent(), '93%');
    assert.equal(await get('meter').getAttribute('aria-valuenow'), '8420');
    assert.ok(await portatile.isDisabled());
    assert.ok(await smartphone.isEnabled());

    await ordina.click();
    assert.equal(await saldo.textContent(), '9.060');
    assert.match(await get('demo-note').textContent(), /Portatile: ora disponibile/);
    assert.equal(await get('goal-name').textContent(), 'Bici elettrica');
    assert.equal(await get('goal-percent').textContent(), '64%');
    assert.equal(await get('goal-photo').getAttribute('data-prize'), 'bici');
    assert.equal(await get('month-value').last().textContent(), '2.740');
    assert.match(await get('ledger').locator('li').first().innerText(), /Ordine simulato[\s\S]*\+640 punti/);
    assert.ok(await portatile.isEnabled());

    await portatile.click();
    assert.ok(await dialog.isVisible());
    assert.match(await get('dialog-copy').textContent(), /resteranno 60/);
    await page.keyboard.press('Escape');
    assert.equal(await saldo.textContent(), '9.060');
    assert.ok(await portatile.isEnabled());
    await portatile.click();
    await conferma.click();
    await page.waitForFunction(() => document.querySelector('[data-balance]').textContent === '60');
    assert.equal(await portatile.textContent(), 'Riscattato');
    assert.ok(await smartphone.isDisabled());
    assert.equal(await get('goal-name').textContent(), 'Cravatta in seta');
    assert.equal(await get('month-value').last().textContent(), '2.740');
    assert.match(await get('ledger').locator('li').first().innerText(), /Portatile[\s\S]*−9\.000 punti/);
    assert.equal(await page.evaluate(() => document.activeElement.tagName), 'H3');

    await get('reset').click();
    assert.equal(await saldo.textContent(), '8.420');
    assert.equal(await get('goal-name').textContent(), 'Portatile');
    assert.equal(await get('ledger').locator('li').count(), 3);
    assert.equal(await portatile.textContent(), 'Bloccato');
    assert.equal(await get('month-value').last().textContent(), '2.100');
    const question = page.getByText('Come riscatto un premio?', { exact: true });
    await question.click();
    assert.ok(await page.getByText('Sceglilo dal catalogo', { exact: false }).isVisible());

    for (const width of [1440, 1024, 820, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      await page.waitForFunction(() => document.fonts.status === 'loaded');
      const layout = await page.evaluate(async () => {
        const foto = [...document.images];
        foto.forEach(img => { img.loading = 'eager'; });
        await Promise.allSettled(foto.map(img => img.decode()));
        const sezioni = [...document.querySelectorAll('main > section')];
        const overview = document.querySelector('.overview').getBoundingClientRect();
        return {
          larghezza: document.documentElement.scrollWidth,
          altezza: document.documentElement.scrollHeight,
          fotoRotte: foto.filter(img => !img.naturalWidth).map(img => img.src),
          sezioniBloccate: sezioni.filter(s => getComputedStyle(s).minHeight !== '0px').map(s => s.className),
          spazioDopoDashboard: Math.round(sezioni[1].getBoundingClientRect().top - overview.bottom),
          colonneMovimenti: getComputedStyle(document.querySelector('.account__grid')).gridTemplateColumns.split(' ').length,
          sforano: [...document.querySelectorAll('.overview__panel, .reward, .nav__logo, .demo-tag')]
            .filter(e => e.getBoundingClientRect().left < 0 || e.getBoundingClientRect().right > innerWidth)
            .map(e => e.className),
        };
      });
      assert.equal(layout.larghezza, width, `overflow a ${width}px`);
      assert.deepEqual(layout.fotoRotte, []);
      assert.deepEqual(layout.sezioniBloccate, []);
      assert.deepEqual(layout.sforano, []);
      assert.equal(layout.colonneMovimenti, width >= 640 ? 2 : 1);
      assert.ok(layout.spazioDopoDashboard >= 32 && layout.spazioDopoDashboard <= 72);
      console.log(`${width}px: pagina ${layout.altezza}px, stacco dopo il riepilogo ${layout.spazioDopoDashboard}px`);
    }
    await page.getByRole('button', { name: 'Menu', exact: true }).click();
    await page.getByRole('navigation', { name: 'Principale' }).getByRole('link', { name: 'Catalogo' }).click();
    assert.equal(await page.getByRole('button', { name: 'Menu', exact: true }).getAttribute('aria-expanded'), 'false');
    assert.ok(page.url().endsWith('#premi'));
    assert.deepEqual(await page.evaluate(() => window.violazioni), [], 'violazioni CSP');
    assert.deepEqual(errori, [], 'errori JavaScript');
    assert.deepEqual(azioni, [], 'la demo non deve inviare richieste al server');

    const animata = await ctx.newPage();
    await animata.emulateMedia({ reducedMotion: 'no-preference' });
    await animata.goto(`${base}/premi/`);
    await animata.waitForFunction(() => document.querySelector('[data-balance]').textContent === '8.420'
      && !document.querySelector('[data-add]').disabled);
    const barreAnimate = await animata.evaluate(() => {
      document.querySelector('[data-add]').click();
      const barra = document.querySelector('[data-meter] > span');
      const mese = document.querySelector('.chart__bars li:last-child .chart__track > span');
      return [barra, mese].every(el => el.getAnimations().some(a => a.playState === 'running'));
    });
    assert.ok(barreAnimate, 'ordine: animazione di avanzamento e dell’ultimo mese');
    await animata.waitForFunction(() => document.querySelector('[data-balance]').textContent === '9.060');

    const statica = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
    const senzaJs = await statica.newPage();
    await senzaJs.goto(`${base}/premi/`);
    assert.equal(await senzaJs.locator('[data-balance]').textContent(), '8.420');
    assert.ok(await senzaJs.locator('[data-add]').isDisabled());
    assert.ok(await senzaJs.locator('#catalog-h').isVisible());
    console.log('Demo verificata: ordine, animazioni, sblocco, annullamento, riscatto, ripristino, menu, immagini, CSP e fallback senza JavaScript.');
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
