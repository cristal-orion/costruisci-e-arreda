/**
 * prova-registrazione.js — il form di Home Design provato da capo a fondo (voce B16).
 *
 * Browser vero → form del build → finto Apps Script → **il vero Codice.gs** →
 * foglio simulato. Il finto Apps Script si comporta come quello di Google
 * dove conta: risponde alla POST con un 302 verso un altro indirizzo, e solo
 * quella seconda risposta porta il JSON con `Access-Control-Allow-Origin: *`.
 * Rifiuta le richieste OPTIONS, come Google: se il form ne mandasse una
 * (preflight), la prova lo vedrebbe.
 *
 * Ogni pagina viene caricata con la **CSP di produzione** (deploy/csp.conf),
 * come fa prova-csp.js: un `connect-src` che non copre l'endpoint farebbe
 * fallire l'invio esattamente come in produzione.
 *
 * Il build va fatto con l'endpoint di prova, e la CSP rigenerata:
 *   cd costruisciearreda-astro
 *   PUBLIC_REGISTRAZIONE_ENDPOINT=http://localhost:8787/macros/s/PROVA/exec npm run build
 *   node deploy/genera-csp.js dist deploy/csp.conf
 *   npm run preview
 *   cd ../_migrazione && node prova-registrazione.js [http://localhost:4321]
 *
 * Esce con 1 se una verifica non passa.
 */
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const vm = require('node:vm');
const { chromium } = require('playwright');

const BASE = process.argv[2] || 'http://localhost:4321';
const PORTA = 8787;
const RADICE = path.resolve(__dirname, '..');
const codice = fs.readFileSync(path.join(RADICE, 'Landing HomeDesigh/google-apps-script/Codice.gs'), 'utf8');
/* `upgrade-insecure-requests` viene tolta, ed è l'unica differenza dalla CSP
   di produzione: porterebbe il redirect del finto Apps Script da
   http://localhost a https, dove non risponde nessuno. In produzione è tutto
   https e la direttiva non cambia niente. */
const csp = fs
  .readFileSync(path.join(RADICE, 'costruisciearreda-astro/deploy/csp.conf'), 'utf8')
  .match(/add_header\s+Content-Security-Policy\s+"([^"]+)"/)?.[1]
  ?.replace(/;\s*upgrade-insecure-requests/, '');
if (!csp) {
  console.error('Manca deploy/csp.conf: eseguire genera-csp.js dopo il build.');
  process.exit(1);
}
if (!csp.includes(`localhost:${PORTA}`)) {
  console.error(`La CSP non autorizza localhost:${PORTA}: il build non è stato fatto con l'endpoint di prova.`);
  process.exit(1);
}

let falliti = 0;
const verifica = (cond, nome) => {
  console.log(`${cond ? '  ok ' : 'FALLITO'}  ${nome}`);
  if (!cond) falliti++;
};

/* --- Il foglio simulato e Codice.gs --------------------------------------- */
/* Due schede, come il file vero: la landing scrive in "sito", la pagina del
   QR in "negozio" (campo `_scheda`, gid in Codice.gs). */
function nuovaScheda(gid) {
  const righe = [];
  const foglio = {
    getName: () => 'Foglio1',
    getLastRow: () => righe.length,
    getLastColumn: () => Math.max(0, ...righe.map((r) => r.length)),
    getRange: (r, c, nr = 1, nc = 1) => ({
      getValues: () => Array.from({ length: nr }, (_, i) => Array.from({ length: nc }, (_, j) => righe[r - 1 + i]?.[c - 1 + j] ?? '')),
      setValues(v) {
        v.forEach((riga, i) => riga.forEach((x, j) => {
          while (righe.length < r + i) righe.push([]);
          righe[r - 1 + i][c - 1 + j] = x;
        }));
        return this;
      },
      setFontWeight() { return this; },
      setNumberFormat() { return this; },
      createTextFinder: (t) => {
        const f = {
          matchCase: () => f,
          matchEntireCell: () => f,
          findNext: () => {
            for (let i = 0; i < nr; i++) if (String(righe[r - 1 + i]?.[c - 1] ?? '').toLowerCase() === t.toLowerCase()) return {};
            return null;
          },
        };
        return f;
      },
    }),
    appendRow: (r) => righe.push([...r]),
    setFrozenRows() {},
  };
  foglio.getSheetId = () => gid;
  return { foglio, righe };
}
const negozio = nuovaScheda(659565949); // "Codice QR negozio - Home Design"
const sito = nuovaScheda(1058875551); // "Codice QR sito - Home Design"
const righe = negozio.righe;
const righeSito = sito.righe;
const cache = new Map();
const ctx = {
  console: { log() {}, error() {} },
  SpreadsheetApp: { getActiveSpreadsheet: () => ({ getSheets: () => [sito.foglio, negozio.foglio] }), openById: () => ({ getSheets: () => [sito.foglio, negozio.foglio] }), flush() {} },
  LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock() {} }) },
  CacheService: { getScriptCache: () => ({ get: (k) => cache.get(k) ?? null, put: (k, v) => cache.set(k, v) }) },
  ContentService: { MimeType: { JSON: 'json' }, createTextOutput: (s) => ({ json: s, setMimeType() { return this; } }) },
  HtmlService: { createHtmlOutput: (h) => ({ html: h, setTitle() { return this; } }) },
};
vm.createContext(ctx);
vm.runInContext(codice, ctx);

const valore = (n, titolo, r = righe) => r[n]?.[r[0].indexOf(titolo)];

/* --- Il finto Apps Script -------------------------------------------------- */
let modo = 'normale'; // 'normale' | 'cade-dopo-scrittura' | 'rifiuta'
let opzioniRicevute = 0;
const risposte = new Map();
let n = 0;

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORTA}`);
  if (req.method === 'OPTIONS') {
    opzioniRicevute++;
    res.writeHead(405);
    return res.end();
  }
  if (req.method === 'POST' && url.pathname === '/macros/s/PROVA/exec') {
    let corpo = '';
    req.on('data', (d) => (corpo += d));
    req.on('end', () => {
      const parametri = Object.fromEntries(new URLSearchParams(corpo));
      if (modo === 'rifiuta') {
        const k = `k${++n}`;
        risposte.set(k, { json: JSON.stringify({ ok: false, messaggio: 'Messaggio di prova dal foglio.' }) });
        res.writeHead(302, { Location: `/macros/echo?k=${k}`, 'Access-Control-Allow-Origin': '*' });
        return res.end();
      }
      const uscita = ctx.doPost({ parameter: parametri });
      if (modo === 'cade-dopo-scrittura') return req.socket.destroy(); // riga scritta, risposta persa
      const k = `k${++n}`;
      risposte.set(k, uscita);
      res.writeHead(302, { Location: `/macros/echo?k=${k}`, 'Access-Control-Allow-Origin': '*' });
      res.end();
    });
    return;
  }
  if (req.method === 'GET' && url.pathname === '/macros/echo') {
    const r = risposte.get(url.searchParams.get('k'));
    if (!r) {
      res.writeHead(404);
      return res.end();
    }
    if (r.html) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(r.html);
    }
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    return res.end(r.json);
  }
  res.writeHead(404);
  res.end();
});

/* --- Il browser ------------------------------------------------------------ */
async function nuovoContesto(browser, opzioni = {}) {
  const c = await browser.newContext(opzioni);
  await c.route(`${BASE}/**`, async (route) => {
    const r = await route.fetch();
    if (!(r.headers()['content-type'] ?? '').startsWith('text/html')) return route.fulfill({ response: r });
    /* Il banner dei cookie copre il bottone sul telefono: in negozio il
       cliente lo chiude, qui lo si toglie per provare il form. */
    const html = (await r.text()).replace(
      /<script(?![^>]*\bsrc=)[^>]*>(?:(?!<\/script>)[\s\S])*?iubenda(?:(?!<\/script>)[\s\S])*?<\/script>/g,
      '',
    );
    return route.fulfill({ response: r, body: html, headers: { ...r.headers(), 'content-security-policy': csp } });
  });
  return c;
}

const violazioni = [];
const osserva = (page) => {
  page.on('console', (m) => {
    if (/Content Security Policy|Refused to|CORS/i.test(m.text())) violazioni.push(m.text());
  });
  /* Le richieste fallite contano solo se le ha bloccate la CSP: i due guasti
     di rete li provoca la prova stessa (risposta persa, rete assente). */
  page.on('requestfailed', (r) => {
    const e = r.failure()?.errorText ?? '';
    if (/csp|blocked/i.test(e)) violazioni.push(`richiesta bloccata ${r.url()}: ${e}`);
  });
  page.on('pageerror', (e) => violazioni.push('errore JS: ' + e.message));
};

async function compila(page, sel, dati) {
  const f = page.locator(sel);
  await f.locator('input[name=nome]').fill(dati.nome);
  await f.locator('input[name=cognome]').fill(dati.cognome);
  await f.locator('input[name=email]').fill(dati.email);
  await f.locator('input[name=telefono]').fill(dati.telefono ?? '');
  if (dati.privacy !== false) await f.locator('input[name=privacy]').check();
  if (dati.marketing) await f.locator('input[name=marketing]').check();
}

(async () => {
  await new Promise((r) => server.listen(PORTA, r));
  /* Chromium tratta come "pubblica" una pagina servita da `route.fulfill`, e
     blocca le sue richieste verso `localhost` (Local Network Access). In
     produzione il percorso è pubblico → pubblico (sito → Google) e il
     controllo non scatta: qui va spento, o il finto Apps Script locale non
     riceverebbe niente. */
  const browser = await chromium.launch({
    args: ['--disable-features=LocalNetworkAccessChecks,PrivateNetworkAccessRespectPreflightResults,BlockInsecurePrivateNetworkRequests'],
  });

  /* ===== La pagina del QR, su un telefono ===== */
  console.log('\nPagina del QR (390px, ?fonte=cassa-1)');
  {
    const c = await nuovoContesto(browser, { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const page = await c.newPage();
    osserva(page);
    await page.goto(`${BASE}/home-design/registrati/?fonte=cassa-1`, { waitUntil: 'networkidle' });
    const form = '#registrazione-negozio';

    // email sbagliata: niente invio, messaggio sotto il campo
    await compila(page, form, { nome: 'Anna', cognome: 'Esposito', email: 'anna@esempio' });
    await page.locator(`${form} button[type=submit]`).click();
    await page.waitForTimeout(400);
    verifica(righe.length === 0, 'email senza dominio: non parte nessun invio');
    verifica(await page.locator('[data-reg-errore=email]').first().isVisible(), 'email senza dominio: il messaggio sotto il campo si vede');

    // invio buono, con spazi e maiuscole
    await page.locator(`${form} input[name=email]`).fill('  Anna.Esposito@Esempio.IT ');
    await page.locator(`${form} input[name=telefono]`).fill('+39 333 123 4567');
    await page.locator(`${form} button[type=submit]`).click();
    await page.locator('[data-reg-fatto]').first().waitFor({ state: 'visible', timeout: 8000 }).catch(() => {});
    const confermato = await page.locator('[data-reg-fatto]').first().isVisible();
    verifica(confermato, 'dopo l’invio compare la conferma');
    if (!confermato) {
      console.log('    stato:', await page.locator('[data-reg-stato]').first().textContent());
      console.log('    violazioni:', violazioni.join(' | ') || '(nessuna)');
      console.log('    righe nel foglio:', righe.length);
      process.exit(1);
    }
    verifica((await page.locator('[data-reg-fatto-titolo]').first().textContent()) === 'Grazie Anna, sei registrato.', 'la conferma chiama il cliente per nome');
    verifica(righe.length === 2, 'una riga nel foglio (più le intestazioni)');
    verifica(valore(1, 'Email') === 'anna.esposito@esempio.it', 'email pulita: minuscola e senza spazi');
    verifica(valore(1, 'Fonte') === 'cassa-1', 'la fonte del QR (?fonte=cassa-1) arriva nel foglio');
    verifica(valore(1, 'Pagina') === '/home-design/registrati/', 'la pagina di registrazione arriva nel foglio');
    verifica(valore(1, 'Consenso marketing') === 'No' && valore(1, 'Informativa privacy') === 'Sì', 'consensi: marketing non spuntato = No');
    verifica(valore(1, 'Telefono') === "'+39 333 123 4567", 'telefono come testo');

    // secondo cliente sullo stesso telefono
    await page.locator('[data-reg-altro]').first().click();
    verifica(await page.locator(form).isVisible(), '"Registra un’altra persona" riporta il form');
    verifica((await page.locator(`${form} input[name=nome]`).inputValue()) === '', 'il form torna vuoto');
    await compila(page, form, { nome: 'Luca', cognome: 'Russo', email: 'luca@esempio.it', marketing: true });
    await page.locator(`${form} button[type=submit]`).click();
    await page.locator('[data-reg-fatto]').first().waitFor({ state: 'visible', timeout: 8000 }).catch(() => {});
    verifica(await page.locator('[data-reg-fatto]').first().isVisible(), 'seconda registrazione: conferma (risposta JSON anche dopo il reset)');
    verifica(righe.length === 3 && valore(2, 'Consenso marketing') === 'Sì', 'seconda riga, con il consenso marketing');
    verifica(valore(2, 'Fonte') === 'cassa-1', 'dopo il reset la fonte resta quella del QR');

    // la risposta si perde dopo che la riga è stata scritta
    await page.locator('[data-reg-altro]').first().click();
    await compila(page, form, { nome: 'Sara', cognome: 'Greco', email: 'sara@esempio.it' });
    modo = 'cade-dopo-scrittura';
    await page.locator(`${form} button[type=submit]`).click();
    await page.waitForFunction(() => document.querySelector('[data-reg-stato]')?.dataset.esito === 'errore', null, { timeout: 8000 }).catch(() => {});
    const msg = await page.locator('[data-reg-stato]').first().textContent();
    verifica(/connessione|Registrati/i.test(msg ?? ''), `risposta persa: messaggio di errore chiaro («${msg?.slice(0, 50)}…»)`);
    verifica(righe.length === 4, 'risposta persa: la riga era comunque stata scritta');
    verifica((await page.locator(`${form} input[name=nome]`).inputValue()) === 'Sara', 'risposta persa: i dati restano nei campi');
    modo = 'normale';
    await page.locator(`${form} button[type=submit]`).click();
    await page.locator('[data-reg-fatto]').first().waitFor({ state: 'visible', timeout: 8000 }).catch(() => {});
    verifica(await page.locator('[data-reg-fatto]').first().isVisible(), 'secondo tentativo: conferma');
    verifica(righe.length === 4, 'secondo tentativo: nessun doppione nel foglio');

    // rete assente
    await page.locator('[data-reg-altro]').first().click();
    await compila(page, form, { nome: 'Gino', cognome: 'Rossi', email: 'gino@esempio.it' });
    await c.route(`http://localhost:${PORTA}/**`, (r) => r.abort('internetdisconnected'));
    await page.locator(`${form} button[type=submit]`).click();
    await page.waitForFunction(() => document.querySelector('[data-reg-stato]')?.dataset.esito === 'errore', null, { timeout: 8000 }).catch(() => {});
    verifica(/connessione/i.test((await page.locator('[data-reg-stato]').first().textContent()) ?? ''), 'senza rete: messaggio "manca la connessione"');
    verifica(await page.locator(`${form} button[type=submit]`).isEnabled(), 'senza rete: il bottone torna premibile');
    await c.unroute(`http://localhost:${PORTA}/**`);

    // il foglio rifiuta (per esempio una regola cambiata): il messaggio arriva al cliente
    modo = 'rifiuta';
    await page.locator(`${form} button[type=submit]`).click();
    await page.waitForFunction(() => document.querySelector('[data-reg-stato]')?.textContent?.includes('prova dal foglio'), null, { timeout: 8000 }).catch(() => {});
    verifica(((await page.locator('[data-reg-stato]').first().textContent()) ?? '').includes('prova dal foglio'), 'il messaggio d’errore del foglio viene mostrato');
    modo = 'normale';

    verifica(opzioniRicevute === 0, 'nessuna richiesta OPTIONS (nessun preflight che Apps Script rifiuterebbe)');
    await c.close();
  }

  /* ===== La landing, su desktop ===== */
  console.log('\nLanding (1440px)');
  {
    const c = await nuovoContesto(browser, { viewport: { width: 1440, height: 900 } });
    const page = await c.newPage();
    osserva(page);
    await page.goto(`${BASE}/home-design/`, { waitUntil: 'networkidle' });
    const prima = righeSito.length;
    const primaNegozio = righe.length;
    await page.locator('#registrati').scrollIntoViewIfNeeded();
    await compila(page, '#registrazione-landing', { nome: 'Marta', cognome: 'Bianchi', email: 'marta@esempio.it' });
    await page.locator('#registrazione-landing button[type=submit]').click();
    await page.locator('[data-reg-fatto]').first().waitFor({ state: 'visible', timeout: 8000 }).catch(() => {});
    verifica(righeSito.length === prima + (prima ? 1 : 2), 'una riga nuova nella scheda "sito"');
    verifica(righe.length === primaNegozio, 'la scheda "negozio" non cambia');
    verifica(valore(righeSito.length - 1, 'Fonte', righeSito) === 'landing-home-design', 'fonte: landing-home-design');
    verifica(valore(righeSito.length - 1, 'Pagina', righeSito) === '/home-design/', 'pagina: /home-design/');

    // chi si è registrato in negozio è nuovo per l'elenco del sito
    await page.locator('[data-reg-altro]').first().click();
    await compila(page, '#registrazione-landing', { nome: 'Anna', cognome: 'Esposito', email: 'anna.esposito@esempio.it' });
    await page.locator('#registrazione-landing button[type=submit]').click();
    await page.locator('[data-reg-fatto]').first().waitFor({ state: 'visible', timeout: 8000 }).catch(() => {});
    verifica(valore(righeSito.length - 1, 'Già registrato', righeSito) === 'No', 'due elenchi separati: già in "negozio" non conta per "sito"');

    // la stessa email una seconda volta nella stessa scheda: "Già registrato"
    await page.locator('[data-reg-altro]').first().click();
    await compila(page, '#registrazione-landing', { nome: 'Marta', cognome: 'Bianchi', email: 'marta@esempio.it' });
    await page.locator('#registrazione-landing button[type=submit]').click();
    await page.locator('[data-reg-fatto]').first().waitFor({ state: 'visible', timeout: 8000 }).catch(() => {});
    verifica(valore(righeSito.length - 1, 'Già registrato', righeSito) === 'Sì', 'chi torna risulta "Già registrato"');

    // l'elenco "Cosa trovi in negozio": una voce cambia foto e colore
    const fondo0 = await page.locator('[data-elenco]').evaluate((e) => getComputedStyle(e).backgroundColor);
    await page.locator('[data-elenco-voce="6"]').click();
    await page.waitForTimeout(600);
    const fondo1 = await page.locator('[data-elenco]').evaluate((e) => getComputedStyle(e).backgroundColor);
    verifica(fondo0 !== fondo1, `elenco: il colore della sezione cambia (${fondo0} → ${fondo1})`);
    verifica(await page.locator('[data-elenco-foto="6"]').evaluate((e) => e.classList.contains('is-on')), 'elenco: la foto della voce si accende');
    await c.close();
  }

  /* ===== Senza JavaScript ===== */
  console.log('\nSenza JavaScript');
  {
    const c = await nuovoContesto(browser, { viewport: { width: 390, height: 844 }, javaScriptEnabled: false });
    const page = await c.newPage();
    osserva(page);
    await page.goto(`${BASE}/home-design/registrati/`, { waitUntil: 'networkidle' });
    const prima = righe.length;
    await compila(page, '#registrazione-negozio', { nome: 'Pia', cognome: 'Conte', email: 'pia@esempio.it' });
    await Promise.all([page.waitForNavigation({ timeout: 8000 }).catch(() => {}), page.locator('#registrazione-negozio button[type=submit]').click()]);
    verifica(righe.length === prima + 1, 'la POST normale scrive la riga');
    verifica(((await page.textContent('body')) ?? '').includes('Grazie, sei registrato.'), 'e mostra una pagina di conferma, non del JSON');
    verifica(valore(righe.length - 1, 'Fonte') === 'qr-negozio', 'fonte predefinita: qr-negozio');
    await c.close();
  }

  verifica(violazioni.length === 0, `nessuna violazione della CSP né errore JavaScript${violazioni.length ? ': ' + violazioni.join(' | ') : ''}`);

  await browser.close();
  server.close();
  console.log(falliti ? `\n${falliti} verifiche NON passate` : '\nTutte le verifiche passate');
  process.exit(falliti ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
