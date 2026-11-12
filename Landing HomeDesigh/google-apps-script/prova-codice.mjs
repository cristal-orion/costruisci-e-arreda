/**
 * Prova di Codice.gs senza Google: simula il foglio, il lucchetto e la cache
 * e verifica i casi che in negozio non devono sbagliare.
 *
 *   node "Landing HomeDesigh/google-apps-script/prova-codice.mjs"
 *
 * Esce con 1 se una verifica non passa. Controlla anche che le regole su email
 * e telefono siano **le stesse** del sito (src/data/registrazione.ts), e che
 * l'espressione del sito compili con il flag `v`, come la compila il browser
 * per l'attributo `pattern`.
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const qui = path.dirname(fileURLToPath(import.meta.url));
const codice = fs.readFileSync(path.join(qui, 'Codice.gs'), 'utf8');
const datiSito = fs.readFileSync(
  path.join(qui, '../../costruisciearreda-astro/src/data/registrazione.ts'),
  'utf8',
);

let falliti = 0;
const verifica = (cond, nome) => {
  console.log(`${cond ? '  ok ' : 'FALLITO'}  ${nome}`);
  if (!cond) falliti++;
};

/* --- Il finto Google ------------------------------------------------------ */
function nuovoFoglio(righe = [], gid = 659565949) {
  const dati = righe.map((r) => [...r]);
  const formati = {};
  const larghezza = () => Math.max(0, ...dati.map((r) => r.length));
  const pareggia = () => {
    const w = larghezza();
    for (const r of dati) while (r.length < w) r.push('');
  };
  const range = (r, c, nr = 1, nc = 1) => ({
    getValues: () =>
      Array.from({ length: nr }, (_, i) =>
        Array.from({ length: nc }, (_, j) => dati[r - 1 + i]?.[c - 1 + j] ?? ''),
      ),
    setValues(v) {
      v.forEach((riga, i) =>
        riga.forEach((x, j) => {
          while (dati.length < r + i) dati.push([]);
          const R = dati[r - 1 + i];
          while (R.length < c + j) R.push('');
          R[c - 1 + j] = x;
        }),
      );
      pareggia();
      return this;
    },
    setFontWeight() {
      return this;
    },
    setNumberFormat(f) {
      formati[`${r},${c}`] = f;
      return this;
    },
    createTextFinder(t) {
      let caso = true;
      let intera = false;
      const finder = {
        matchCase(v) { caso = v; return finder; },
        matchEntireCell(v) { intera = v; return finder; },
        findNext() {
          for (let i = 0; i < nr; i++) {
            const v = String(dati[r - 1 + i]?.[c - 1] ?? '');
            const a = caso ? v : v.toLowerCase();
            const b = caso ? t : t.toLowerCase();
            if (intera ? a === b : a.includes(b)) return {};
          }
          return null;
        },
      };
      return finder;
    },
  });
  return {
    dati,
    formati,
    getName: () => 'Foglio1',
    getSheetId: () => gid,
    getLastRow: () => {
      for (let i = dati.length - 1; i >= 0; i--) if (dati[i].some((x) => x !== '')) return i + 1;
      return 0;
    },
    getLastColumn: () => larghezza(),
    getRange: range,
    appendRow(r) {
      dati.push([...r]);
      pareggia();
    },
    setFrozenRows() {},
  };
}

function ambiente(foglio, prima = [], proprieta = {}) {
  const cache = new Map();
  const aperti = [];
  const ctx = {
    console: { log() {}, error() {} },
    SpreadsheetApp: {
      // `prima`: le schede che nel file vengono prima di quella giusta.
      getActiveSpreadsheet: () => ({ getSheets: () => [...prima, foglio], getSheetByName: () => foglio }),
      openById: (id) => (aperti.push(id), { getSheets: () => [...prima, foglio], getSheetByName: () => foglio }),
      flush() {},
    },
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => proprieta[k] ?? null }) },
    aperti,
    LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock() {} }) },
    CacheService: { getScriptCache: () => ({ get: (k) => cache.get(k) ?? null, put: (k, v) => cache.set(k, v) }) },
    ContentService: {
      MimeType: { JSON: 'json' },
      createTextOutput: (s) => ({ contenuto: s, setMimeType() { return this; } }),
    },
    HtmlService: { createHtmlOutput: (h) => ({ html: h, setTitle() { return this; } }) },
  };
  vm.createContext(ctx);
  vm.runInContext(codice, ctx, { filename: 'Codice.gs' });
  return ctx;
}

const invia = (ctx, p) => JSON.parse(ctx.doPost({ parameter: { _modo: 'json', ...p } }).contenuto);
const buono = (extra = {}) => ({
  nome: 'Anna',
  cognome: 'Esposito',
  email: 'anna@esempio.it',
  telefono: '+39 333 123 4567',
  privacy: 'si',
  marketing: 'si',
  fonte: 'qr-negozio',
  _scheda: 'negozio',
  pagina: '/home-design/registrati/',
  _id: 'id-' + Math.random(),
  ...extra,
});

/* --- 1. Foglio vuoto ------------------------------------------------------ */
console.log('\nFoglio vuoto');
{
  const f = nuovoFoglio();
  const ctx = ambiente(f);
  const r = invia(ctx, buono());
  verifica(r.ok === true, 'risponde ok');
  verifica(f.dati[0][0] === 'Data e ora' && f.dati[0].includes('Email'), 'scrive le intestazioni');
  verifica(f.dati.length === 2, 'una riga di dati');
  const h = f.dati[0];
  const v = (t) => f.dati[1][h.indexOf(t)];
  verifica(Object.prototype.toString.call(v('Data e ora')) === '[object Date]', 'la data è una data vera');
  verifica(v('Nome') === 'Anna' && v('Cognome') === 'Esposito', 'nome e cognome');
  verifica(v('Email') === 'anna@esempio.it', 'email');
  verifica(v('Telefono') === "'+39 333 123 4567", 'il telefono resta testo (non diventa formula né numero)');
  verifica(v('Consenso marketing') === 'Sì' && v('Informativa privacy') === 'Sì', 'consensi');
  verifica(v('Fonte') === 'qr-negozio', 'fonte');
  verifica(v('Già registrato') === 'No', 'prima volta: non già registrato');
}

/* --- 2. Foglio già impostato, altro ordine e altri nomi ------------------- */
console.log('\nFoglio preimpostato con intestazioni sue');
{
  const f = nuovoFoglio([['E-mail', 'Cellulare', 'Nome ', 'Cognome', 'Data', 'Note del negozio']]);
  const ctx = ambiente(f);
  const r = invia(ctx, buono({ marketing: '' }));
  verifica(r.ok, 'risponde ok');
  const h = f.dati[0];
  verifica(h.slice(0, 6).join('|') === 'E-mail|Cellulare|Nome |Cognome|Data|Note del negozio', 'le colonne esistenti restano dove sono');
  verifica(h.includes('Consenso marketing') && h.includes('Fonte') && h.includes('Già registrato'), 'aggiunge in fondo le colonne che mancano');
  verifica(f.dati[1][0] === 'anna@esempio.it' && f.dati[1][1] === "'+39 333 123 4567", 'scrive email e telefono nelle colonne giuste');
  verifica(f.dati[1][5] === '', 'non tocca le colonne che non sono sue');
  verifica(f.dati[1][h.indexOf('Consenso marketing')] === 'No', 'marketing non spuntato = No');
  invia(ctx, buono({ email: 'ANNA@esempio.it' }));
  verifica(f.dati[2][h.indexOf('Già registrato')] === 'Sì', 'la stessa email (maiuscole o no) risulta già registrata');
  verifica(f.dati[0].length === h.length, 'al secondo invio non aggiunge altre colonne');
}

/* --- 3. Nome e cognome in una colonna ------------------------------------- */
console.log('\nColonna unica "Nome e cognome"');
{
  const f = nuovoFoglio([['Data', 'Nome e cognome', 'Email']]);
  const ctx = ambiente(f);
  invia(ctx, buono());
  verifica(f.dati[1][1] === 'Anna Esposito', 'la riempie con nome e cognome');
  verifica(!f.dati[0].includes('Nome') && !f.dati[0].includes('Cognome'), 'non aggiunge Nome e Cognome separati');
}

/* --- 4. Errori e difese --------------------------------------------------- */
console.log('\nDati sbagliati e difese');
{
  const f = nuovoFoglio();
  const ctx = ambiente(f);
  const casi = [
    [{ email: 'anna@esempio' }, 'email senza dominio'],
    [{ email: 'anna esposito@esempio.it' }, 'email con spazio'],
    [{ nome: '   ' }, 'nome vuoto'],
    [{ cognome: '' }, 'cognome vuoto'],
    [{ privacy: '' }, 'informativa non spuntata'],
    [{ telefono: '333-ABC' }, 'telefono con lettere'],
    [{ nome: 'x'.repeat(81) }, 'nome troppo lungo'],
  ];
  for (const [extra, nome] of casi) {
    const r = invia(ctx, buono(extra));
    verifica(r.ok === false && typeof r.messaggio === 'string' && r.messaggio.length > 5, `rifiuta: ${nome}`);
  }
  verifica(f.dati.length === 0, 'nessuna riga scritta per i dati sbagliati');

  const r = invia(ctx, buono({ _url: 'http://spam' }));
  verifica(r.ok === true && f.dati.length === 0, 'campo trappola: risponde ok ma non scrive');

  invia(ctx, buono({ telefono: '' }));
  verifica(f.dati.length === 2, 'telefono vuoto è accettato (facoltativo)');

  const id = 'stesso-invio';
  invia(ctx, buono({ _id: id, email: 'b@esempio.it' }));
  const r2 = invia(ctx, buono({ _id: id, email: 'b@esempio.it' }));
  verifica(r2.ok === true && f.dati.length === 3, 'lo stesso invio ripetuto non crea un doppione');

  invia(ctx, buono({ nome: '=HYPERLINK("http://x","clic")', cognome: '+cmd', email: 'c@esempio.it' }));
  const h = f.dati[0];
  verifica(String(f.dati[3][h.indexOf('Nome')]).startsWith("'="), 'una formula nel nome resta testo');
  verifica(String(f.dati[3][h.indexOf('Cognome')]).startsWith("'+"), 'un + iniziale resta testo');

  invia(ctx, buono({ nome: '  Maria\n\tRosa  ', email: '  D@Esempio.IT ' }));
  verifica(f.dati[4][h.indexOf('Nome')] === 'Maria Rosa', 'spazi e a capo ripuliti');
  verifica(f.dati[4][h.indexOf('Email')] === 'd@esempio.it', 'email in minuscolo e senza spazi');
}

/* --- 5. Senza JavaScript, e foglio malmesso -------------------------------- */
console.log('\nRisposte');
{
  const f = nuovoFoglio();
  const ctx = ambiente(f);
  const out = ctx.doPost({ parameter: { ...buono(), _modo: 'pagina' } });
  verifica(typeof out.html === 'string' && out.html.includes('Grazie'), 'senza JavaScript risponde con una pagina');
  const g = JSON.parse(ctx.doGet().contenuto);
  // Qui il file ha solo la scheda del negozio: manca "sito", e il controllo lo dice.
  verifica(g.ok === false && /sito/.test(g.errore), 'doGet segnala la scheda che manca, invece di dire ok');

  const rotto = nuovoFoglio([['', '', ''], ['dato', 'orfano', '']]);
  const r = invia(ambiente(rotto), buono());
  verifica(r.ok === false && r.errore === 'interno', 'intestazioni vuote sopra dei dati: errore chiaro, nessuna scrittura');
  verifica(rotto.dati.length === 2, 'il foglio malmesso non viene toccato');
}

/* --- 6. Stesse regole del sito -------------------------------------------- */
console.log('\nRegole uguali a quelle del sito');
{
  const estrai = (nome) => {
    const m = datiSito.match(new RegExp(`export const ${nome} = '([^']+)'`));
    return m ? m[1].replace(/\\\\/g, '\\') : null;
  };
  const emailSito = estrai('EMAIL_VALIDA');
  const telSito = estrai('TELEFONO_VALIDO');
  verifica(emailSito && telSito, 'regole trovate in registrazione.ts');

  let compila = true;
  let reEmail, reTel;
  try {
    // Così le compila il browser per `pattern`: ^(?:…)$ con il flag v.
    reEmail = new RegExp(`^(?:${emailSito})$`, 'v');
    reTel = new RegExp(`^(?:${telSito})$`, 'v');
  } catch (e) {
    compila = false;
    console.log('   ', e.message);
  }
  verifica(compila, 'le espressioni del sito compilano con il flag v (attributo pattern)');

  const ctx = ambiente(nuovoFoglio());
  const gsEmail = vm.runInContext('EMAIL_VALIDA', ctx);
  const gsTel = vm.runInContext('TELEFONO_VALIDO', ctx);
  const email = ['a@b.it', 'nome.cognome@gmail.com', 'x@y', 'a b@c.it', 'a@b.c', 'mario+negozio@libero.it', '@b.it'];
  const tel = ['+39 333 1234567', '081/123456', '(081) 555-12', '12345', '333ABC', '+39.333.123.4567'];
  verifica(compila && email.every((s) => reEmail.test(s) === gsEmail.test(s)), 'email: sito e foglio danno lo stesso verdetto');
  verifica(compila && tel.every((s) => reTel.test(s) === gsTel.test(s)), 'telefono: sito e foglio danno lo stesso verdetto');
}

console.log('\nIl file vero ha quattro schede: landing → "sito", pagina del QR → "negozio", le altre mai');
const quattro = () => {
  const intest = ['AUTORIZZAZIONE? SI/NO', 'VENDITRICE', 'NOME', 'COGNOME', 'E-MAIL'];
  const t = {
    negozio: nuovoFoglio([], 659565949), // "Codice QR negozio - Home Design"
    sito: nuovoFoglio([], 1058875551), // "Codice QR sito - Home Design"
    cartaceo: nuovoFoglio([intest], 649859177), // "HOME DESIGN Cartaceo"
    ceramiche: nuovoFoglio([intest], 0), // "CERAMICHE & BAGNO Cartaceo"
  };
  return { t, ctx: ambiente(t.negozio, [t.cartaceo, t.ceramiche, t.sito]) };
};
const intatte = (t) => t.cartaceo.getLastRow() === 1 && t.cartaceo.getLastColumn() === 5 && t.ceramiche.getLastRow() === 1;
{
  const { t, ctx } = quattro();
  const r = invia(ctx, buono({ _scheda: 'negozio', _id: 'q1' }));
  verifica(r.ok && t.negozio.getLastRow() === 2 && t.sito.getLastRow() === 0, 'pagina del QR (_scheda=negozio) → solo "Codice QR negozio"');
  const r2 = invia(ctx, buono({ _scheda: 'sito', fonte: 'landing-home-design', _id: 'q2' }));
  verifica(r2.ok && t.sito.getLastRow() === 2 && t.negozio.getLastRow() === 2, 'landing (_scheda=sito) → solo "Codice QR sito"');
  verifica(intatte(t), 'le due schede "Cartaceo" non vengono toccate');
  const r3 = invia(ctx, buono({ _scheda: 'sito', _id: 'q3' }));
  verifica(r3.ok && r3.ritorno === true, '"Già registrato" guarda la scheda in cui si scrive');
}
{
  const { t, ctx } = quattro();
  const senza = buono({ _id: 'q4' });
  delete senza._scheda;
  const r = invia(ctx, senza);
  const r2 = invia(ctx, buono({ _scheda: 'altro', _id: 'q5' }));
  verifica(!r.ok && !r2.ok && r.errore === 'scheda' && r2.errore === 'scheda', 'scheda mancante o sconosciuta: errore');
  verifica(t.negozio.getLastRow() === 0 && t.sito.getLastRow() === 0 && intatte(t), '…e non scrive in nessuna scheda');
}
{
  const intest = ['AUTORIZZAZIONE? SI/NO', 'VENDITRICE', 'NOME'];
  const cartaceo = nuovoFoglio([intest], 649859177);
  const sito = nuovoFoglio([], 1058875551);
  const r = invia(ambiente(sito, [cartaceo]), buono({ _scheda: 'negozio' }));
  verifica(!r.ok, 'scheda del negozio cancellata: la registrazione dà errore');
  verifica(cartaceo.getLastRow() === 1 && sito.getLastRow() === 0, '…e non ripiega su un\'altra scheda');
}
{
  const { t, ctx } = quattro();
  const g = JSON.parse(ctx.doGet().contenuto);
  verifica(g.ok && g.schede && 'sito' in g.schede && 'negozio' in g.schede, 'il controllo dal browser (doGet) trova le due schede');
  ctx.provaRegistrazione();
  verifica(t.negozio.getLastRow() === 2 && t.sito.getLastRow() === 2 && intatte(t), 'provaRegistrazione scrive una riga in ognuna delle due schede');
}
{
  const nomiSito = [...datiSito.matchAll(/^\s+(\w+): '(\w+)',$/gm)]
    .filter((m) => m[1] === m[2]).map((m) => m[1]).sort().join(',');
  const ctx = ambiente(nuovoFoglio());
  const nomiGs = Object.keys(vm.runInContext('IMPOSTAZIONI.SCHEDE', ctx)).sort().join(',');
  verifica(nomiSito === nomiGs && nomiGs === 'negozio,sito', `le schede del sito (${nomiSito}) sono quelle di Codice.gs (${nomiGs})`);
  verifica(vm.runInContext('IMPOSTAZIONI.ID_FOGLIO', ctx) === '', 'ID_FOGLIO vuoto: il repository è pubblico');
}

console.log('\nProgetto a parte (non creato dal foglio): il file viene dalla proprietà dello script');
{
  const ctx = ambiente(nuovoFoglio([], 659565949), [nuovoFoglio([], 1058875551)], { ID_FOGLIO: '  ID-DI-PROVA ' });
  const r = invia(ctx, buono({ _id: 'p1' }));
  verifica(r.ok && ctx.aperti.length > 0 && ctx.aperti.every((x) => x === 'ID-DI-PROVA'), 'apre il foglio con l\'ID della proprietà, senza spazi');
  const ctx2 = ambiente(nuovoFoglio([], 659565949), [nuovoFoglio([], 1058875551)]);
  invia(ctx2, buono({ _id: 'p2' }));
  verifica(ctx2.aperti.length === 0, 'senza proprietà usa il foglio da cui è stato creato lo script');
}

console.log(falliti ? `\n${falliti} verifiche NON passate` : '\nTutte le verifiche passate');
process.exit(falliti ? 1 : 0);
