/**
 * Rotte che NON devono finire in sitemap né nei motori di ricerca.
 *
 * Fonte unica: la lista è letta da `astro.config.mjs` per filtrare la sitemap
 * e va passata come `noindex` al BaseLayout della pagina corrispondente.
 *
 * Le 4 thank-you page del sito originale erano `index, follow` — quindi
 * indicizzabili. Le 3 root di archivio dei custom post type sono pagine thin
 * con `<h1>` doppio e title generico "Archivi: …": o si progettano davvero,
 * o restano fuori dall'indice (decisione da confermare col proprietario).
 */
export const noindexRoutes: string[] = [
  '/design-system/', // pagina di controllo interna, non fa parte del sito

  // thank-you page (target dei redirect dei form)
  '/preventivo-thankyou/',
  '/newsletter-thankyou/',
  '/thankyou-promo-6500/',
  '/thankyou-progetta-gli-spazi/',

  // root di archivio dei custom post type: thin, title generico
  '/services/',
  '/realizzazioni/',
  '/store/',
];

/** true se la rotta indicata è fra quelle da tenere fuori dall'indice. */
export const isNoindex = (pathname: string): boolean =>
  noindexRoutes.includes(pathname.endsWith('/') ? pathname : `${pathname}/`);
