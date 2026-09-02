import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
// Astro 7 deprecata la ri-esportazione di `z` da `astro:content`: zod si importa diretto.
import { z } from 'zod';

/**
 * Content collections del rebuild.
 *
 * I file JSON sotto `src/content/` sono **generati**, non scritti a mano:
 * li produce `_migrazione/extract-content.js` leggendo il DOM del mirror.
 * Rigenerarli è sicuro e ripetibile; le correzioni ai contenuti (alt mancanti,
 * meta description da scrivere) vanno fatte **dopo** l'estrazione, quindi il
 * campo `avvisi` di ogni voce elenca cosa resta da sistemare.
 *
 * Lo schema è volutamente vicino alla forma dell'originale: siamo in fase A,
 * ricostruzione 1:1. La normalizzazione dei contenuti è lavoro di fase B.
 */

/**
 * Immagine.
 * `src` è il solo nome del file, come lo normalizza anche `fingerprint.py`.
 * `path` è il percorso relativo a `wp-content/uploads` (es. `2024/06/Albe.jpg`):
 * serve perché due nomi di file compaiono in cartelle diverse, quindi il nome
 * da solo è ambiguo. È `path` che va usato per risolvere il file.
 */
const immagine = z.object({
  src: z.string().nullable(),
  path: z.string().nullable().default(null),
  alt: z.string().default(''),
  width: z.number().nullable().default(null),
  height: z.number().nullable().default(null),
  visibileDesktop: z.boolean().optional(),
});

const vociGalleria = z.object({
  /** Immagine a piena risoluzione, quella che apre il lightbox. */
  full: z.string().nullable(),
  fullPath: z.string().nullable().default(null),
  src: z.string().nullable(),
  path: z.string().nullable().default(null),
  alt: z.string().default(''),
  width: z.number().nullable().default(null),
  height: z.number().nullable().default(null),
});

const hero = z
  .object({
    image: z.string().nullable(),
    imagePath: z.string().nullable().default(null),
    titleTag: z.string().nullable(),
    title: z.string().nullable(),
    kicker: z.string().nullable(),
  })
  .nullable();

/** Campi comuni a tutte e quattro le collezioni. */
const comuni = {
  slug: z.string(),
  /** URL sul sito originale: serve per la mappa dei redirect 301. */
  urlOriginale: z.string(),
  title: z.string(),
  /** Titolo del `<title>` dell'originale, senza il suffisso col nome del sito. */
  seoTitle: z.string().nullable(),
  /**
   * Il `<title>` dell'originale **verbatim**. Va riprodotto tale e quale: lo
   * schema di Yoast non è uniforme — gli articoli del blog non hanno il suffisso
   * col nome del sito, tutte le altre pagine sì.
   */
  seoTitleCompleto: z.string().nullable().default(null),
  metaDescription: z.string().nullable(),
  hero,
  campi: z.record(z.string(), z.string()).default({}),
  headings: z.array(z.object({ tag: z.string(), text: z.string() })).default([]),
  /** Blocchi di testo, in HTML. I duplicati desktop/mobile dell'originale sono già uniti. */
  corpo: z.array(z.object({ html: z.string(), type: z.string() })).default([]),
  immagini: z.array(immagine).default([]),
  featuredImage: immagine.nullable().default(null),
  /**
   * Immagine usata dalle **card degli archivi**. Non compare sulla pagina
   * singola: sta solo nel template del loop di Elementor, quindi va letta dalle
   * pagine di archivio (seconda passata dell'estrattore).
   */
  cardImage: immagine.nullable().default(null),
  gallery: z.array(vociGalleria).default([]),
  formCf7: z.array(z.string()).default([]),
  postInfo: z.record(z.string(), z.string()).default({}),
  tassonomie: z.array(z.string()).default([]),
  /** id WordPress della pagina: serve a risolvere i vecchi link `?p=ID`. */
  postId: z.string().nullable().default(null),
  /** Cosa resta da sistemare su questa voce: alt mancanti, meta description, … */
  avvisi: z.array(z.string()).default([]),
};

const loader = (dir: string) => glob({ pattern: '**/*.json', base: `./src/content/${dir}` });

export const collections = {
  services: defineCollection({
    loader: loader('services'),
    schema: z.object(comuni),
  }),

  realizzazioni: defineCollection({
    loader: loader('realizzazioni'),
    schema: z.object(comuni),
  }),

  stores: defineCollection({
    loader: loader('stores'),
    schema: z.object(comuni),
  }),

  posts: defineCollection({
    loader: loader('posts'),
    schema: z.object(comuni),
  }),
};
