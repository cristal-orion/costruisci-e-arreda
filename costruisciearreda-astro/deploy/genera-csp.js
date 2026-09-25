/**
 * genera-csp.js — scrive la Content-Security-Policy leggendola dal build.
 *
 * Il sito ha **7 script in linea** (menu, form, gallerie, contatori, carosello,
 * il caricatore di Iubenda e lo script che declassa l'`<h1>` iniettato dalle
 * legal). Con una CSP seria quegli script vanno autorizzati uno per uno con
 * l'hash del loro contenuto, e l'alternativa — `'unsafe-inline'` — vale quanto
 * non averla.
 *
 * Gli hash **non** vanno scritti a mano in `nginx.conf`: Astro minifica gli
 * script in linea, quindi basta cambiare una riga in un componente e l'hash non
 * combacia più. A quel punto il browser blocca lo script e la pagina smette di
 * funzionare **in silenzio** — il menu non si apre, la galleria non si apre, e
 * niente nei log del server. Questo file quindi si rigenera a ogni build, dal
 * build stesso: se gli script cambiano, la CSP cambia con loro.
 *
 *   node deploy/genera-csp.js [cartella del build] [file di uscita]
 *   node deploy/genera-csp.js dist deploy/csp.conf
 *
 * Il file prodotto è un frammento nginx con un solo `add_header`, da includere
 * nel blocco `server`.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const DIST = process.argv[2] || 'dist';
const OUT = process.argv[3] || path.join('deploy', 'csp.conf');

/** Tutti i file HTML del build, ricorsivamente. */
const html = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? html(p) : e.name.endsWith('.html') ? [p] : [];
  });

/* `<script>` senza `src`: sono quelli che la CSP deve autorizzare per hash.
   Il corpo va preso **esattamente** come sta nel file, byte per byte: uno
   spazio in più e l'hash è un altro.
   I blocchi `application/ld+json` restano fuori: sono dati, il browser non li
   esegue e la CSP non li guarda. Contarli voleva dire un hash per pagina (il
   grafo cambia da una pagina all'altra) e un'intestazione da 53 hash. */
const INLINE = /<script(?![^>]*\bsrc=)(?![^>]*\btype="application\/ld\+json")[^>]*>([\s\S]*?)<\/script>/g;

const pagine = html(DIST);
const hash = new Map(); // hash -> quante pagine lo usano

for (const f of pagine) {
  const testo = fs.readFileSync(f, 'utf8');
  for (const m of testo.matchAll(INLINE)) {
    const corpo = m[1];
    if (!corpo.trim()) continue;
    const h = `'sha256-${crypto.createHash('sha256').update(corpo, 'utf8').digest('base64')}'`;
    hash.set(h, (hash.get(h) ?? 0) + 1);
  }
}

const hashes = [...hash.keys()].sort();

/**
 * L'origine a cui i form inviano, se configurata.
 *
 * `PUBLIC_FORM_ENDPOINT` è letta da Astro **durante il build** e finisce
 * nell'HTML, quindi qui è nota: la CSP se la prende da sola invece di
 * aspettare che qualcuno si ricordi di aggiornarla al cutover. Serve in due
 * direttive, perché il form invia in due modi — `fetch` quando il JS c'è
 * (`connect-src`) e POST normale quando non c'è (`form-action`).
 */
const endpoint = process.env.PUBLIC_FORM_ENDPOINT?.trim();
let origineForm = '';
if (endpoint) {
  try {
    origineForm = ' ' + new URL(endpoint).origin;
  } catch {
    console.error(`PUBLIC_FORM_ENDPOINT non è un URL valido: ${endpoint}`);
    process.exit(1);
  }
}

/**
 * Le direttive.
 *
 * `style-src` tiene `'unsafe-inline'` e non è una resa: 18 pagine hanno
 * attributi `style="…"` (i campioni di colore della pagina di controllo, le
 * altezze dei riquadri), e per gli **attributi** gli hash non valgono — servirebbe
 * `'unsafe-hashes'`, che è più debole di quello che risolve. Uno stile in linea
 * non esegue codice: il rischio è di un altro ordine rispetto a uno script.
 *
 * I due domini di Iubenda servono alle sole legal, e servono **anche in
 * `style-src`**: misurato con `_migrazione/prova-csp.js`, l'embed tira due fogli
 * di stile (`www.iubenda.com/assets/privacy_policy.css` e
 * `cdn.iubenda.com/iubenda_badge.css`) che senza quei domini vengono bloccati —
 * il documento legale resterebbe senza impaginazione.
 *
 * `'strict-dynamic'` c'è per una cosa sola, sempre trovata misurando: su
 * `/privacy-policy/` `iubenda.js` **inserisce un altro script in linea**, il cui
 * contenuto non si può conoscere in anticipo, quindi non si può autorizzare per
 * hash. Con `'strict-dynamic'` la fiducia si propaga: il nostro caricatore è
 * autorizzato per hash, `iubenda.js` lo carica lui, e quello che `iubenda.js`
 * crea a sua volta è autorizzato di conseguenza. (`'unsafe-inline'` non sarebbe
 * nemmeno una scorciatoia: quando in una politica ci sono degli hash, i browser
 * lo ignorano.)
 *
 * Il prezzo di `'strict-dynamic'` è che `'self'` e i domini in `script-src`
 * vengono ignorati per gli script **inseriti dal parser**. Qui non cambia
 * niente: verificato sul build, nel sito non c'è nemmeno un `<script src>` —
 * tutto il JavaScript è in linea, 2,9 KB in tutto.
 *
 * `form-action` e `connect-src` si allargano da sé quando
 * `PUBLIC_FORM_ENDPOINT` è impostata: senza, il browser bloccherebbe l'invio
 * dei form il giorno del cutover, ed è il tipo di guasto che si scopre dal
 * cliente che non riceve più richieste.
 */
/**
 * Le origini di terze parti, per servizio. Google e Meta ci sono perché GTM,
 * **dopo il consenso** dato nel banner Iubenda, carica GA4 e il Meta Pixel
 * (vedi `src/components/Consenso.astro`): senza queste righe la CSP bloccava
 * ogni invio, e le statistiche restavano a zero senza un errore visibile.
 * Gli script non vanno elencati: li inserisce uno script autorizzato per hash,
 * e `'strict-dynamic'` li lascia passare.
 */
const IUBENDA = 'https://cdn.iubenda.com https://www.iubenda.com https://*.iubenda.com';
const GOOGLE =
  'https://www.googletagmanager.com https://*.google-analytics.com https://*.analytics.google.com';
const META = 'https://www.facebook.com https://connect.facebook.net';

const direttive = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'self'",
  `img-src 'self' data: ${IUBENDA} ${GOOGLE} ${META}`,
  `font-src 'self' ${IUBENDA}`,
  `style-src 'self' 'unsafe-inline' ${IUBENDA}`,
  `script-src 'self' 'strict-dynamic' ${hashes.join(' ')} ${IUBENDA}`,
  `connect-src 'self' ${IUBENDA} ${GOOGLE} ${META}${origineForm}`,
  `frame-src ${IUBENDA}`,
  `form-action 'self'${origineForm}`,
  'upgrade-insecure-requests',
];

const righe = [
  '# GENERATO da deploy/genera-csp.js durante il build — non modificare a mano.',
  '#',
  `# ${pagine.length} pagine esaminate, ${hashes.length} script in linea distinti.`,
  '# Ogni hash autorizza un preciso script in linea: se un componente cambia,',
  '# questo file cambia con lui. Scritto a mano si scollerebbe in silenzio.',
  '#',
  `# Endpoint dei form: ${endpoint || '(non configurato — i form mostrano i recapiti)'}`,
  '#',
  ...[...hash.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([h, n]) => `#   ${h}  su ${n} pagine`),
  '',
  `add_header Content-Security-Policy "${direttive.join('; ')}" always;`,
  '',
];

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, righe.join('\n'));

console.log(`${pagine.length} pagine, ${hashes.length} script in linea distinti.`);
for (const [h, n] of [...hash.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${h}  su ${n} pagine`);
}
console.log(`\nScritto ${OUT}`);
