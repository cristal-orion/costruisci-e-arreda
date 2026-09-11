// Genera favicon.ico e apple-touch-icon.png a partire da public/favicon.svg
// (il marchio rosso del logo, estratto da src/assets/logo.svg).
//
//   node scripts/genera-favicon.mjs
//
// Rieseguire dopo ogni modifica a public/favicon.svg: i due raster sono
// artefatti derivati, non file da ritoccare a mano.
//
// sharp arriva con astro (servizio immagini). Non è una dipendenza diretta:
// se un giorno astro smettesse di portarlo, questo script va aggiornato.
import sharp from 'sharp';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const radice = new URL('../', import.meta.url);
const sorgente = fileURLToPath(new URL('public/favicon.svg', radice));
const ico = fileURLToPath(new URL('public/favicon.ico', radice));
const apple = fileURLToPath(new URL('public/apple-touch-icon.png', radice));

// Ogni misura è renderizzata dal vettore, non ricavata per riduzione da una
// più grande: a 16px la differenza su un marchio geometrico si vede.
const MISURE = [16, 32, 48];

const rendi = (lato, sfondo) => {
  let p = sharp(sorgente, { density: 1200 }).resize(lato, lato, {
    fit: 'contain',
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  });
  if (sfondo) p = p.flatten({ background: sfondo });
  return p.png({ compressionLevel: 9 }).toBuffer();
};

const png = await Promise.all(MISURE.map((lato) => rendi(lato)));

// Contenitore ICO con payload PNG (supportato da ogni browser in circolazione).
const testata = Buffer.alloc(6);
testata.writeUInt16LE(0, 0); // riservato
testata.writeUInt16LE(1, 2); // tipo: icona
testata.writeUInt16LE(MISURE.length, 4);

let offset = 6 + 16 * MISURE.length;
const voci = MISURE.map((lato, i) => {
  const v = Buffer.alloc(16);
  v.writeUInt8(lato === 256 ? 0 : lato, 0); // larghezza
  v.writeUInt8(lato === 256 ? 0 : lato, 1); // altezza
  v.writeUInt8(0, 2); // colori in palette: 0 = truecolor
  v.writeUInt8(0, 3); // riservato
  v.writeUInt16LE(1, 4); // piani
  v.writeUInt16LE(32, 6); // bit per pixel
  v.writeUInt32LE(png[i].length, 8);
  v.writeUInt32LE(offset, 12);
  offset += png[i].length;
  return v;
});

writeFileSync(ico, Buffer.concat([testata, ...voci, ...png]));

// iOS appiattisce la trasparenza sul nero: qui lo sfondo va messo, ed è il
// bianco su cui il logo sta nell'header del sito.
writeFileSync(apple, await rendi(180, '#ffffff'));

console.log(`favicon.ico        ${MISURE.join('/')}px`);
console.log('apple-touch-icon.png  180px su bianco');
