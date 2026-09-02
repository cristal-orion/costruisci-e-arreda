import type { ImageMetadata } from 'astro';
import { immaginiGenerate } from './immagini-generate';
import { rottePerId } from '../data/rotte-legacy';

/**
 * Risoluzione delle immagini del mirror.
 *
 * `src/assets/uploads` è un **collegamento simbolico** a
 * `costruisciearreda-static/costruisciearreda.it/wp-content/uploads`: gli originali
 * stanno già nel repo dentro il mirror, e copiarli qui li duplicherebbe (125 MB
 * per le immagini usate dai contenuti). Così restano in un posto solo e
 * `astro:assets` lavora sugli originali, generando WebP/AVIF e gli `srcset`.
 *
 * La mappa arriva da `immagini-generate.ts`, che è **generato** da
 * `_migrazione/extract-content.js` con import statici delle sole immagini usate.
 * Un `import.meta.glob` eager sulla cartella intera tirerebbe nel build tutte le
 * 668 immagini del mirror: provato, 164 MB di output invece del necessario.
 *
 * Si risolve per **percorso** (`2024/06/Albe.jpg`), non per nome file: due nomi
 * compaiono in cartelle diverse (`Raggruppa-1648.jpg`, `Raggruppa-1646.jpg`) e
 * il solo nome è ambiguo.
 */

/** L'immagine, o `undefined` se il percorso non è fra quelle usate dai contenuti. */
export const immagine = (path: string | null | undefined): ImageMetadata | undefined =>
  path ? immaginiGenerate[path] : undefined;

/**
 * Come `immagine`, ma solleva un errore se manca.
 * Da usare dove l'immagine è indispensabile: meglio fermare il build che
 * pubblicare un buco.
 */
export const immagineObbligatoria = (
  path: string | null | undefined,
  dove: string,
): ImageMetadata => {
  const img = immagine(path);
  if (!img) throw new Error(`Immagine non trovata: "${path}" (richiesta da ${dove})`);
  return img;
};

export const totaleImmagini = Object.keys(immaginiGenerate).length;

/**
 * Riscrive un href dell'originale in una rotta pulita.
 *
 * Nel mirror i link sono nella forma rotta `index.html%3Fp=976.html` oppure
 * relativi al file (`type_stores/showroom-cat/index.html`). La mappa page-id →
 * rotta è quella costruita leggendo la classe del `<body>` di ogni pagina.
 * Un href che non si riesce a risolvere torna `null`: meglio nessun link che un
 * link rotto, e il cancello di qualità lo segnala.
 */
/* La mappa page-id → rotta è generata dal mirror: vedi src/data/rotte-legacy.ts.
   Scritta a mano lasciava buchi — l'elenco degli showroom non rendeva perché
   tre id non c'erano. */

export const rotta = (href: string | null | undefined): string | null => {
  if (!href) return null;
  const h = href.trim();
  if (!h || h === '#' || h.endsWith('#')) return null;
  if (/^(https?:|mailto:|tel:)/.test(h)) return h;

  const perId = h.match(/[?%]3?F?p=(\d+)/i) || h.match(/p=(\d+)/);
  if (perId) return rottePerId[perId[1]] ?? null;

  // link relativo al file: `../../type_stores/showroom-cat/index.html`
  const pulito = h.replace(/^(\.\.\/)+/, '').replace(/index\.html$/, '').replace(/^\/+/, '');
  if (!pulito) return '/';
  return `/${pulito.replace(/\/+$/, '')}/`;
};

/**
 * Estratto di un testo HTML: le prime `parole` parole, senza tag.
 *
 * L'originale mostra nelle card del carosello news l'estratto generato da
 * WordPress, che è di **55 parole** (il default di `the_excerpt`). Riprodurlo
 * non è un vezzo: senza, quelle pagine perdono contenuto reale, e il
 * `fingerprint diff` lo segnala. Il default qui è lo stesso.
 */
export const estratto = (html: string | undefined, parole = 55): string | undefined => {
  if (!html) return undefined;
  const testo = html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#8217;|&rsquo;/g, '’')
    .replace(/\s+/g, ' ')
    .trim();
  if (!testo) return undefined;
  const parti = testo.split(' ');
  return parti.length <= parole ? testo : parti.slice(0, parole).join(' ') + '…';
};
