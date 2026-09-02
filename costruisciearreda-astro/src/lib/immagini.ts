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

/**
 * Riscrive un href dell'originale in una rotta pulita.
 *
 * Nel mirror i link sono nella forma rotta `index.html%3Fp=976.html` oppure
 * relativi al file (`type_stores/showroom-cat/index.html`). La mappa page-id →
 * rotta è quella costruita leggendo la classe del `<body>` di ogni pagina.
 * Un href che non si riesce a risolvere torna `null`: meglio nessun link che un
 * link rotto, e il cancello di qualità lo segnala.
 */
const PER_ID: Record<string, string> = {
  '2': '/',
  '100': '/la-nostra-storia/',
  '102': '/il-nostro-team/',
  '106': '/lavora-con-noi/',
  '107': '/contatti/',
  '110': '/richiedi-preventivo-2/',
  '905': '/dalla-progettazione-alla-realizzazione/',
  '975': '/services/sopralluogo-e-rilievo/',
  '976': '/services/progetto/',
  '977': '/services/rendering/',
  '978': '/services/consulenza-finiture/',
  '979': '/services/disbrigo-pratiche/',
  '980': '/services/direzione-lavori/',
  '981': '/services/impianti/',
  '982': '/services/certificazioni/',
  '1398': '/i-nostri-lavori/',
  '1407': '/realizzazioni/home-albe/',
  '1524': '/richiedi-preventivo/',
  '1562': '/preventivo-thankyou/',
  '4078': '/realizzazioni/green-house/',
  '4137': '/realizzazioni/casa-prima-e-dopo/',
  '4155': '/realizzazioni/wood-e-white/',
  '4188': '/realizzazioni/bar-tabacchi/',
  '4208': '/realizzazioni/appartamento-moderno-prima-e-dopo/',
  '4230': '/realizzazioni/soluzioni-per-la-famiglia/',
  '4333': '/privacy-policy/',
  '4335': '/cookie-policy/',
  '4392': '/soluzione-ceramiche/',
  '4474': '/promo-casa/',
  '4488': '/thankyou-progetta-gli-spazi/',
  '4540': '/thankyou-promo-6500/',
  '4599': '/mobili-bagno-quale-scegliere-per-uno-spazio-funzionale-e-di-design/',
  '4603': '/gres-costruisciearreda-consigli/',
  '4615': '/perche-il-rendering-3d-e-essenziale-per-la-ristrutturazione-dei-tuoi-spazi/',
  '4618': '/5-errori-da-evitare-nella-scelta-dei-materiali-per-ledilizia/',
  '4631': '/newsletter-thankyou/',
};

export const rotta = (href: string | null | undefined): string | null => {
  if (!href) return null;
  const h = href.trim();
  if (!h || h === '#' || h.endsWith('#')) return null;
  if (/^(https?:|mailto:|tel:)/.test(h)) return h;

  const perId = h.match(/[?%]3?F?p=(\d+)/i) || h.match(/p=(\d+)/);
  if (perId) return PER_ID[perId[1]] ?? null;

  // link relativo al file: `../../type_stores/showroom-cat/index.html`
  const pulito = h.replace(/^(\.\.\/)+/, '').replace(/index\.html$/, '').replace(/^\/+/, '');
  if (!pulito) return '/';
  return `/${pulito.replace(/\/+$/, '')}/`;
};
