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

/**
 * Le pagine **one-off** non hanno una struttura fissa: ognuna è una sequenza sua
 * di blocchi. Lo schema descrive quindi un elenco ordinato di blocchi tipizzati,
 * generato da `_migrazione/extract-pages.js`.
 */
const immagineVoce = z.object({
  path: z.string().nullable().default(null),
  fullPath: z.string().nullable().default(null),
  src: z.string().nullable().default(null),
  alt: z.string().default(''),
  titolo: z.string().nullable().default(null),
  href: z.string().nullable().default(null),
  width: z.number().nullable().default(null),
  height: z.number().nullable().default(null),
});

const comuniBlocco = {
  visibile: z.boolean().default(true),
  varianti: z.array(z.string()).default([]),
  soloMobile: z.boolean().default(false),
};

const blocco = z.discriminatedUnion('tipo', [
  z.object({ tipo: z.literal('titolo'), ...comuniBlocco, livello: z.number().nullable(), testo: z.string(), href: z.string().nullable().default(null) }),
  z.object({ tipo: z.literal('testo'), ...comuniBlocco, html: z.string(), parole: z.number().default(0) }),
  z.object({ tipo: z.literal('immagine'), ...comuniBlocco, path: z.string().nullable(), src: z.string().nullable().default(null), alt: z.string().default(''), width: z.number().nullable().default(null), height: z.number().nullable().default(null), href: z.string().nullable().default(null), didascalia: z.string().nullable().default(null) }),
  z.object({ tipo: z.literal('bottone'), ...comuniBlocco, testo: z.string(), href: z.string().nullable() }),
  z.object({ tipo: z.literal('contatore'), ...comuniBlocco, valore: z.number().nullable(), durata: z.number().default(2000), prefisso: z.string().default(''), suffisso: z.string().default(''), etichetta: z.string().default('') }),
  z.object({ tipo: z.literal('galleria'), ...comuniBlocco, voci: z.array(immagineVoce) }),
  z.object({ tipo: z.literal('carousel'), ...comuniBlocco, voci: z.array(immagineVoce) }),
  z.object({ tipo: z.literal('elenco'), ...comuniBlocco, voci: z.array(z.object({ titolo: z.string().nullable(), testo: z.string().nullable().default(null), href: z.string().nullable(), path: z.string().nullable().default(null), alt: z.string().default('') })) }),
  z.object({ tipo: z.literal('accordion'), ...comuniBlocco, voci: z.array(z.object({ titolo: z.string(), html: z.string() })) }),
  z.object({ tipo: z.literal('elencoVoci'), ...comuniBlocco, voci: z.array(z.object({ testo: z.string(), href: z.string().nullable() })) }),
  z.object({ tipo: z.literal('scheda'), ...comuniBlocco, path: z.string().nullable(), alt: z.string().default(''), titolo: z.string().nullable(), html: z.string().default(''), href: z.string().nullable().default(null) }),
  z.object({ tipo: z.literal('form'), ...comuniBlocco, id: z.array(z.string()) }),
  z.object({ tipo: z.literal('separatore'), ...comuniBlocco }),
  z.object({ tipo: z.literal('cornice'), ...comuniBlocco, sottotipo: z.string() }),
  z.object({ tipo: z.literal('servizinumerati'), ...comuniBlocco, voci: z.array(z.object({ numero: z.string().nullable(), titolo: z.string().nullable(), href: z.string().nullable() })) }),
  z.object({
    tipo: z.literal('riquadri'),
    ...comuniBlocco,
    voci: z.array(
      z.object({
        titolo: z.string(),
        titoloLivello: z.number().nullable().default(null),
        href: z.string().nullable(),
        elementorId: z.string().nullable().default(null),
        path: z.string().nullable().default(null),
        /** false = nell'originale il fondo non si vedeva (buco bianco). */
        fondoApplicato: z.boolean().default(true),
      }),
    ),
  }),
  /**
   * Elenco dei punti vendita di un tipo. Nell'originale è uno shortcode che
   * stampa ogni store con la **galleria completa**: 281 immagini in una pagina,
   * 56 MB. Qui sono card che rimandano alle pagine store.
   */
  z.object({
    tipo: z.literal('elencoStore'),
    ...comuniBlocco,
    voci: z.array(
      z.object({
        titolo: z.string(),
        testo: z.string().nullable().default(null),
        href: z.string().nullable(),
        path: z.string().nullable().default(null),
      }),
    ),
  }),
  /** Il carosello delle ultime news del tema, in fondo a diverse pagine. */
  z.object({ tipo: z.literal('ultimeNews'), ...comuniBlocco, titolo: z.string().default('News and Event') }),
  z.object({ tipo: z.literal('sconosciuto'), ...comuniBlocco, sottotipo: z.string(), testo: z.string().default('') }),
]);

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

  pagine: defineCollection({
    loader: loader('pagine'),
    schema: z.object({
      slug: z.string(),
      urlOriginale: z.string(),
      title: z.string().nullable(),
      titleCompleto: z.string().nullable(),
      metaDescription: z.string().nullable(),
      /** Il `<meta name="robots">` dell'originale: dice cosa era indicizzabile. */
      robots: z.string().nullable().default(null),
      postId: z.string().nullable().default(null),
      hero: z
        .object({
          slides: z.array(
            z.object({
              imagePath: z.string().nullable(),
              image: z.string().nullable(),
              titolo: z.string().nullable(),
              titoloTag: z.string().nullable(),
              kicker: z.string().nullable(),
            }),
          ),
        })
        .nullable()
        .default(null),
      blocchi: z.array(blocco).default([]),
      /**
       * Immagini di fondo delle sezioni, dichiarate nel CSS di Elementor.
       * `fondoApplicato: false` significa che nell'originale **non si vedevano**:
       * sulla homepage sono 5 su 7, e producono buchi bianchi di 700px con
       * titoli bianchi su bianco. Nel rebuild si vedono.
       */
      fondiSezione: z
        .array(
          z.object({
            elementorId: z.string(),
            path: z.string(),
            fondoApplicato: z.boolean().default(false),
            testo: z.string().default(''),
            altezza: z.number().default(0),
          }),
        )
        .default([]),
      avvisi: z.array(z.string()).default([]),
    }),
  }),
};
