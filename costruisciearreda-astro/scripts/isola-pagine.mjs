/**
 * Toglie dal build il foglio di stile comune del sito dalle pagine che hanno
 * un'identità tutta loro (oggi: `/premi/`).
 *
 * Perché serve: il CSS del sito è un file solo (`cssCodeSplit: false`, voce A00)
 * e Astro lo collega a **ogni** pagina del build, anche a quelle che non importano
 * niente. `/premi/` è un documento a sé: usa il kit tasteskill copiato in
 * `public/assets` e il suo `public/premi/premi.css`, con un carattere diverso
 * (Archivo, non Montserrat) e le sue regole di base. Il foglio del sito, caricato
 * dopo, lo sovrascriverebbe (titoli in maiuscolo, link rossi, Montserrat…).
 * In sviluppo il collegamento non c'è, quindi la pagina "funziona" in `astro dev`
 * e si rompe solo nel build: per questo si toglie qui, a ogni build.
 *
 * Esce con 1 se una pagina elencata manca, o se dopo l'operazione ha ancora un
 * foglio di `/_astro/`: meglio fermare il build che pubblicare una pagina storta.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const DIST = fileURLToPath(new URL('../dist/', import.meta.url));
const PAGINE = ['premi/index.html'];

const FOGLIO = /[ \t]*<link rel="stylesheet" href="\/_astro\/[^"]+\.css"[^>]*>\n?/g;

let errori = 0;
for (const rel of PAGINE) {
  const file = DIST + rel;
  let html;
  try {
    html = await readFile(file, 'utf8');
  } catch {
    console.error(`isola-pagine: manca ${rel}`);
    errori += 1;
    continue;
  }
  const dopo = html.replace(FOGLIO, '');
  if (/href="\/_astro\/[^"]+\.css"/.test(dopo)) {
    console.error(`isola-pagine: ${rel} ha ancora un foglio di /_astro/`);
    errori += 1;
    continue;
  }
  await writeFile(file, dopo);
  console.log(`isola-pagine: ${rel} senza il foglio comune del sito (${html.length - dopo.length} byte in meno)`);
}
process.exit(errori ? 1 : 0);
