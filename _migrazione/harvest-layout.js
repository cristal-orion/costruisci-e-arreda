/**
 * harvest-layout.js — misura la struttura di layout del mirror, template per template.
 *
 * Complementa harvest-tokens.js (che aggrega tipografia e colori): qui interessano
 * le GEOMETRIE — altezza header, riquadro hero e posizione del titolo dentro di esso,
 * larghezza e padding del contenitore di contenuto, footer, ritmo verticale fra sezioni.
 *
 *   node _migrazione/harvest-layout.js http://127.0.0.1:8099 baseline/layout-mirror.json
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = process.argv[2] || 'http://127.0.0.1:8099';
const OUT = path.resolve(__dirname, process.argv[3] || 'baseline/layout-mirror.json');

const ROUTES = {
  home: '/',
  'one-off/storia': '/la-nostra-storia/',
  'one-off/team': '/il-nostro-team/',
  'one-off/contatti': '/contatti/',
  'one-off/hub-servizi': '/dalla-progettazione-alla-realizzazione/',
  'one-off/hub-lavori': '/i-nostri-lavori/',
  'one-off/preventivo': '/richiedi-preventivo/',
  'one-off/legal': '/privacy-policy/',
  'tpl/service': '/services/progetto/',
  'tpl/realizzazione': '/realizzazioni/home-albe/',
  'tpl/store': '/store/via-san-massimo-na/',
  'tpl/tax-realizzazioni': '/cat_realizzazioni/progetti/',
  'tpl/tax-store': '/type_stores/showroom-cat/',
  'tpl/blog-archive': '/category/ultime-news-e-articoli/',
  'tpl/post': '/gres-costruisciearreda-consigli/',
};

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'tablet', width: 900, height: 1000 },
  { name: 'mobile', width: 390, height: 844 },
];

const BLOCK = [
  'googletagmanager.com', 'google-analytics.com', 'connect.facebook.net',
  'facebook.com', 'hotjar.com', 'hotjar.io', 'mailmunch.co', 'iubenda.com',
  'google.com/recaptcha', 'gstatic.com/recaptcha', 'fonts.googleapis.com',
];

const measure = () => {
  const px = (v) => Math.round(parseFloat(v) * 10) / 10;
  const box = (el) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: px(r.x), y: px(r.y + window.scrollY), w: px(r.width), h: px(r.height) };
  };
  const typo = (el) => {
    if (!el) return null;
    const cs = getComputedStyle(el);
    return {
      family: cs.fontFamily.split(',')[0].replace(/["']/g, ''),
      size: px(cs.fontSize),
      weight: cs.fontWeight,
      lineHeight: cs.lineHeight,
      transform: cs.textTransform,
      color: cs.color,
    };
  };
  const chain = (el, upto = 6) => {
    const out = [];
    let n = el;
    for (let i = 0; n && i < upto; i++, n = n.parentElement) {
      const cs = getComputedStyle(n);
      const r = n.getBoundingClientRect();
      out.push({
        sel: n.tagName.toLowerCase() + (n.className && typeof n.className === 'string'
          ? '.' + n.className.trim().split(/\s+/).slice(0, 3).join('.') : ''),
        w: px(r.width),
        maxWidth: cs.maxWidth,
        pad: `${cs.paddingTop} ${cs.paddingRight} ${cs.paddingBottom} ${cs.paddingLeft}`,
        margin: `${cs.marginTop} ${cs.marginRight} ${cs.marginBottom} ${cs.marginLeft}`,
        overflow: cs.overflow,
        position: cs.position,
      });
    }
    return out;
  };

  const res = { url: location.pathname, vw: window.innerWidth };

  // --- header
  const hdr = document.querySelector('header, .header, #header, .navbar');
  if (hdr) {
    const cs = getComputedStyle(hdr);
    res.header = { ...box(hdr), position: cs.position, bg: cs.backgroundColor, zIndex: cs.zIndex };
  }

  // --- hero: riquadro immagine + blocco testo
  const heroBox = document.querySelector('.boxSlider .singleImage, .boxSlider, .homeSlider, .mainSlider');
  if (heroBox) {
    const cs = getComputedStyle(heroBox);
    res.hero = {
      selector: heroBox.className.trim().split(/\s+/).slice(0, 3).join('.'),
      box: box(heroBox),
      overflow: cs.overflow,
      margin: `${cs.marginTop} ${cs.marginRight} ${cs.marginBottom} ${cs.marginLeft}`,
    };
    const info = heroBox.querySelector('.infoImg, .caption, .slide-caption');
    if (info) {
      const ics = getComputedStyle(info);
      res.hero.info = { box: box(info), position: ics.position, left: ics.left, bottom: ics.bottom, width: ics.width };
    }
    const title = heroBox.querySelector('.title, h1, h2');
    if (title) {
      res.hero.title = { tag: title.tagName.toLowerCase(), box: box(title), typo: typo(title), text: title.textContent.trim().slice(0, 60) };
      // distanza reale del titolo dal bordo sinistro del riquadro hero
      const hb = heroBox.getBoundingClientRect(), tb = title.getBoundingClientRect();
      res.hero.titleGutterLeft = px(tb.x - hb.x);
      res.hero.titleClippedLeft = tb.x < hb.x ? px(hb.x - tb.x) : 0;
    }
    const sub = heroBox.querySelector('.subtitle, .sub, p');
    if (sub) res.hero.subtitle = { box: box(sub), typo: typo(sub), text: sub.textContent.trim().slice(0, 60) };
  }

  // --- contenitore di contenuto: catena dal primo paragrafo "vero"
  const ps = [...document.querySelectorAll('p')].filter((p) => {
    if (p.closest('header, footer, .header, .footer, nav')) return false;
    const t = p.textContent.replace(/\s+/g, ' ').trim();
    const r = p.getBoundingClientRect();
    return t.length > 60 && r.width > 0 && r.height > 0;
  });
  if (ps.length) {
    res.contentColumn = { text: ps[0].textContent.trim().slice(0, 50), width: px(ps[0].getBoundingClientRect().width), typo: typo(ps[0]), chain: chain(ps[0]) };
  }

  // --- primo h1/h2 di contenuto (fuori hero/header/footer)
  const h = [...document.querySelectorAll('h1, h2')].find((e) => {
    if (e.closest('header, footer, .header, .footer, nav, .boxSlider')) return false;
    const r = e.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && e.textContent.trim().length > 2;
  });
  if (h) res.firstHeading = { tag: h.tagName.toLowerCase(), typo: typo(h), box: box(h), text: h.textContent.trim().slice(0, 60) };

  // --- footer
  const ft = document.querySelector('footer, .footer, #footer');
  if (ft) {
    const cs = getComputedStyle(ft);
    res.footer = { ...box(ft), bg: cs.backgroundColor, pad: `${cs.paddingTop} ${cs.paddingBottom}` };
  }

  // --- ritmo verticale: gap fra le sezioni di primo livello del contenuto
  const main = document.querySelector('main, #main, .site-main, .elementor') || document.body;
  const secs = [...main.children].filter((el) => {
    const r = el.getBoundingClientRect();
    return r.height > 40 && getComputedStyle(el).display !== 'none';
  });
  res.sectionRhythm = secs.slice(0, 12).map((el) => {
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return { sel: el.tagName.toLowerCase() + (typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : ''), h: px(r.height), padY: `${cs.paddingTop}/${cs.paddingBottom}`, marginY: `${cs.marginTop}/${cs.marginBottom}`, bg: cs.backgroundColor };
  });

  // --- griglie ripetute: cerca gruppi di fratelli con la stessa classe
  const grids = [];
  for (const p of document.querySelectorAll('div, ul, section')) {
    const kids = [...p.children];
    if (kids.length < 3) continue;
    const cls = kids[0].className;
    if (typeof cls !== 'string' || !cls.trim()) continue;
    if (!kids.every((k) => k.className === cls)) continue;
    const cs = getComputedStyle(p);
    const kb = kids[0].getBoundingClientRect();
    if (kb.width < 80 || kb.height < 80) continue;
    grids.push({
      parent: p.tagName.toLowerCase() + '.' + String(p.className).trim().split(/\s+/).slice(0, 2).join('.'),
      child: cls.trim().split(/\s+/).slice(0, 3).join('.'),
      n: kids.length,
      display: cs.display,
      gap: cs.gap,
      childW: px(kb.width),
      childH: px(kb.height),
      perRow: Math.round(p.getBoundingClientRect().width / kb.width),
      radius: getComputedStyle(kids[0]).borderRadius,
    });
  }
  res.grids = grids.slice(0, 6);

  return res;
};

(async () => {
  const browser = await chromium.launch();
  const out = { base: BASE, generated: new Date().toISOString(), byRoute: {} };

  for (const [label, route] of Object.entries(ROUTES)) {
    out.byRoute[label] = { route, viewports: {} };
    for (const vp of VIEWPORTS) {
      const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
      await ctx.route('**/*', (r) => (BLOCK.some((b) => r.request().url().includes(b)) ? r.abort() : r.continue()));
      const page = await ctx.newPage();
      try {
        await page.goto(BASE + route, { waitUntil: 'domcontentloaded', timeout: 45000 });
        await page.waitForTimeout(600);
        out.byRoute[label].viewports[vp.name] = await page.evaluate(measure);
        process.stderr.write(`  ${label} @${vp.width}\n`);
      } catch (e) {
        out.byRoute[label].viewports[vp.name] = { error: e.message };
        process.stderr.write(`  !! ${label} @${vp.width}: ${e.message}\n`);
      }
      await ctx.close();
    }
  }

  await browser.close();
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2));
  process.stderr.write(`\nScritto ${OUT}\n`);
})();
