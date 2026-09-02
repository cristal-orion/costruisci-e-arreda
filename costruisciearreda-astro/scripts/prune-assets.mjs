/**
 * Rimuove da `dist/_astro` i file che nessun file del build referenzia.
 *
 * Perché serve: le immagini dei contenuti si risolvono per percorso a runtime,
 * quindi `src/lib/immagini-generate.ts` le importa **tutte** in modo statico.
 * Vite emette ogni asset importato staticamente, anche se poi la pagina usa solo
 * le versioni ottimizzate prodotte da `astro:assets`. Risultato misurato:
 * 289 originali non referenziati in `dist`, 124,6 MB di peso morto.
 *
 * Il criterio è verificabile: si raccolgono tutti i nomi `/_astro/...` citati in
 * qualunque file di testo del build (HTML, CSS, JS, XML, JSON, txt) e si tolgono
 * solo quelli che non compaiono da nessuna parte. Con `--dry-run` non cancella.
 */
import { readdir, readFile, stat, unlink } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

// `fileURLToPath`, non `.pathname`: il percorso del progetto contiene spazi e
// `.pathname` li restituisce percent-encoded (`Costruisci%20e%20arreda`).
const DIST = fileURLToPath(new URL('../dist/', import.meta.url));
const ASTRO = join(DIST, '_astro');
const TESTO = new Set(['.html', '.css', '.js', '.mjs', '.xml', '.json', '.txt', '.map', '.svg']);
const dryRun = process.argv.includes('--dry-run');

const camminaFile = async (dir) => {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await camminaFile(p)));
    else out.push(p);
  }
  return out;
};

const tutti = await camminaFile(DIST);

/* Nomi citati da qualunque file di testo del build. Si cerca il nome nudo, non
   solo il percorso `/_astro/...`: così si intercettano anche i riferimenti
   costruiti a pezzi dentro un bundle JS. */
const citati = new Set();
for (const f of tutti) {
  if (!TESTO.has(extname(f))) continue;
  const testo = await readFile(f, 'utf8');
  for (const m of testo.matchAll(/[A-Za-z0-9._-]+\.(?:webp|avif|jpe?g|png|svg|gif|woff2?|css|js)/g)) {
    citati.add(m[0]);
  }
}

const inAstro = (await readdir(ASTRO, { withFileTypes: true })).filter((e) => e.isFile());
let rimossi = 0;
let byte = 0;
const esempi = [];

for (const e of inAstro) {
  if (citati.has(e.name)) continue;
  const p = join(ASTRO, e.name);
  byte += (await stat(p)).size;
  rimossi += 1;
  if (esempi.length < 5) esempi.push(e.name);
  if (!dryRun) await unlink(p);
}

const mb = (byte / 1024 / 1024).toFixed(1);
console.log(
  rimossi
    ? `${dryRun ? '[dry-run] ' : ''}potati ${rimossi} asset non referenziati su ${inAstro.length} (${mb} MB) — es. ${esempi.join(', ')}`
    : `nessun asset non referenziato fra i ${inAstro.length} di _astro`,
);
