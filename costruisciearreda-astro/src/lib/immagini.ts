import type { ImageMetadata } from 'astro';
import { immaginiGenerate } from './immagini-generate';

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
