/**
 * harvest-tokens.js — estrae i design token REALI dal mirror misurandoli nel browser.
 *
 * Non legge il CSS: raccoglie i valori calcolati (getComputedStyle) su un campione di
 * pagine rappresentative di tutti i template, a 3 viewport, e li aggrega per frequenza
 * pesata (caratteri di testo per la tipografia, area in px² per i colori di sfondo).
 *
 *   cd costruisciearreda-static/costruisciearreda.it && python3 -m http.server 8099
 *   node _migrazione/harvest-tokens.js http://127.0.0.1:8099 baseline/tokens-mirror.json
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = process.argv[2] || 'http://127.0.0.1:8099';
const OUT = path.resolve(__dirname, process.argv[3] || 'baseline/tokens-mirror.json');

// un campione per ogni template + le one-off che contano
const ROUTES = [
  '/',
  '/la-nostra-storia/',
  '/il-nostro-team/',
  '/lavora-con-noi/',
  '/contatti/',
  '/dalla-progettazione-alla-realizzazione/',
  '/services/progetto/',
  '/i-nostri-lavori/',
  '/realizzazioni/home-albe/',
  '/cat_realizzazioni/progetti/',
  '/store/via-san-massimo-na/',
  '/type_stores/showroom-cat/',
  '/category/ultime-news-e-articoli/',
  '/gres-costruisciearreda-consigli/',
  '/richiedi-preventivo/',
  '/privacy-policy/',
];

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'tablet', width: 900, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
];

const BLOCK = [
  'googletagmanager.com', 'google-analytics.com', 'connect.facebook.net',
  'facebook.com', 'hotjar.com', 'hotjar.io', 'mailmunch.co', 'iubenda.com',
  'google.com/recaptcha', 'gstatic.com/recaptcha', 'fonts.googleapis.com',
];

const collect = () => {
  const inc = (m, k, n) => m[k] = (m[k] || 0) + n;
  const out = {
    type: {},        // tipografia pesata sui caratteri
    bg: {},          // background-color pesato sull'area
    fg: {},          // color del testo pesato sui caratteri
    radius: {},
    shadow: {},
    borderColor: {},
    containers: {},  // larghezze dei contenitori principali
    roleType: {},    // tipografia per ruolo semantico (tag + regione)
  };

  const region = (el) => {
    if (el.closest('header, .header, #header, .navbar')) return 'header';
    if (el.closest('footer, .footer, #footer')) return 'footer';
    if (el.closest('form')) return 'form';
    if (el.closest('.boxSlider, .infoImg, .hero')) return 'hero';
    return 'body';
  };

  const all = document.querySelectorAll('*');
  for (const el of all) {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') continue;
    const r = el.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) continue;

    // testo diretto del nodo (non dei figli)
    let text = '';
    for (const n of el.childNodes) if (n.nodeType === 3) text += n.textContent;
    text = text.replace(/\s+/g, ' ').trim();

    if (text.length > 0) {
      const w = text.length;
      const sig = [
        cs.fontFamily.split(',')[0].replace(/["']/g, ''),
        Math.round(parseFloat(cs.fontSize)) + 'px',
        cs.fontWeight,
        'lh:' + (cs.lineHeight === 'normal' ? 'normal' : Math.round(parseFloat(cs.lineHeight)) + 'px'),
        'ls:' + (cs.letterSpacing === 'normal' ? '0' : cs.letterSpacing),
        cs.textTransform,
      ].join(' | ');
      inc(out.type, sig, w);
      inc(out.fg, cs.color, w);
      inc(out.roleType, `${region(el)} > ${el.tagName.toLowerCase()} | ${Math.round(parseFloat(cs.fontSize))}px | ${cs.fontWeight} | ${cs.textTransform}`, w);
    }

    const bg = cs.backgroundColor;
    if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') {
      inc(out.bg, bg, Math.round(r.width * r.height));
    }
    if (cs.borderRadius && cs.borderRadius !== '0px') inc(out.radius, cs.borderRadius, 1);
    if (cs.boxShadow && cs.boxShadow !== 'none') inc(out.shadow, cs.boxShadow, 1);
    if (parseFloat(cs.borderTopWidth) > 0 || parseFloat(cs.borderBottomWidth) > 0) {
      inc(out.borderColor, `${cs.borderTopWidth} ${cs.borderTopStyle} ${cs.borderTopColor}`, 1);
    }
  }

  // larghezze reali dei contenitori
  for (const sel of ['.container', '.elementor-container', '.e-con-inner', 'main', '.elementor-section-boxed > .elementor-container']) {
    const el = document.querySelector(sel);
    if (el) {
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      out.containers[sel] = {
        width: Math.round(r.width),
        maxWidth: cs.maxWidth,
        paddingInline: `${cs.paddingLeft} / ${cs.paddingRight}`,
      };
    }
  }

  // padding verticale delle sezioni: distribuzione
  const secPad = {};
  for (const el of document.querySelectorAll('section, .elementor-section, .e-con')) {
    const cs = getComputedStyle(el);
    const k = `${cs.paddingTop} / ${cs.paddingBottom}`;
    secPad[k] = (secPad[k] || 0) + 1;
  }
  out.sectionPadding = secPad;

  return out;
};

const mergeInto = (dst, src) => {
  for (const [bucket, val] of Object.entries(src)) {
    if (bucket === 'containers') { dst.containers = { ...dst.containers, ...val }; continue; }
    dst[bucket] = dst[bucket] || {};
    for (const [k, n] of Object.entries(val)) dst[bucket][k] = (dst[bucket][k] || 0) + n;
  }
};

const topN = (obj, n) => Object.entries(obj || {})
  .sort((a, b) => b[1] - a[1]).slice(0, n)
  .map(([k, v]) => ({ value: k, weight: v }));

(async () => {
  const browser = await chromium.launch();
  const result = { base: BASE, generated: new Date().toISOString(), routes: ROUTES.length, byViewport: {} };

  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    await ctx.route('**/*', (route) => {
      const u = route.request().url();
      if (BLOCK.some((b) => u.includes(b))) return route.abort();
      return route.continue();
    });
    const page = await ctx.newPage();
    const agg = {};

    for (const r of ROUTES) {
      const url = BASE + r;
      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
        await page.waitForTimeout(700);
        const data = await page.evaluate(collect);
        mergeInto(agg, data);
        process.stderr.write(`  ${vp.name} ${r}\n`);
      } catch (e) {
        process.stderr.write(`  !! ${vp.name} ${r}: ${e.message}\n`);
      }
    }

    result.byViewport[vp.name] = {
      width: vp.width,
      typography: topN(agg.type, 40),
      textColor: topN(agg.fg, 12),
      background: topN(agg.bg, 12),
      borderRadius: topN(agg.radius, 12),
      boxShadow: topN(agg.shadow, 8),
      border: topN(agg.borderColor, 12),
      sectionPadding: topN(agg.sectionPadding, 15),
      roleTypography: topN(agg.roleType, 40),
      containers: agg.containers,
    };
    await ctx.close();
  }

  await browser.close();
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(result, null, 2));
  process.stderr.write(`\nScritto ${OUT}\n`);
})();
