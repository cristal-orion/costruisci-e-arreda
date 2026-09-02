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

/** Immagine: `src` è il nome del file, senza il suffisso -WxH delle miniature. */
const immagine = z.object({
  src: z.string().nullable(),
  alt: z.string().default(''),
  width: z.number().nullable().default(null),
  height: z.number().nullable().default(null),
  visibileDesktop: z.boolean().optional(),
});

const vociGalleria = z.object({
  /** Immagine a piena risoluzione, quella che apre il lightbox. */
  full: z.string().nullable(),
  src: z.string().nullable(),
  alt: z.string().default(''),
  width: z.number().nullable().default(null),
  height: z.number().nullable().default(null),
});

const hero = z
  .object({
    image: z.string().nullable(),
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
  /** Titolo del `<title>` dell'originale, che a volte differisce da quello della pagina. */
  seoTitle: z.string().nullable(),
  metaDescription: z.string().nullable(),
  hero,
  campi: z.record(z.string(), z.string()).default({}),
  headings: z.array(z.object({ tag: z.string(), text: z.string() })).default([]),
  /** Blocchi di testo, in HTML. I duplicati desktop/mobile dell'originale sono già uniti. */
  corpo: z.array(z.object({ html: z.string(), type: z.string() })).default([]),
  immagini: z.array(immagine).default([]),
  featuredImage: immagine.nullable().default(null),
  gallery: z.array(vociGalleria).default([]),
  formCf7: z.array(z.string()).default([]),
  postInfo: z.record(z.string(), z.string()).default({}),
  tassonomie: z.array(z.string()).default([]),
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
