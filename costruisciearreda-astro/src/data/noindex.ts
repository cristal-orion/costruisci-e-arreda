import { pagineOneOff } from './pagine';

/**
 * Rotte che NON devono finire in sitemap né nei motori di ricerca.
 *
 * La lista si costruisce **dalle pagine stesse**: ogni voce di `pagineOneOff`
 * con `noindex: true` entra qui automaticamente. Tenere due elenchi allineati a
 * mano non funziona — è già capitato che la sitemap includesse le landing messe
 * in `noindex`.
 *
 * Perché queste rotte stanno fuori dall'indice:
 *  - **thank-you page**: nell'originale sono `index, follow`, quindi
 *    indicizzabili. Chi le apre da una ricerca non ha inviato nulla;
 *  - **landing pubblicitarie**: `/promo-casa/` porta un'offerta con scadenza
 *    ancora indicizzata; competono con le pagine del sito sulle stesse ricerche;
 *  - **root di archivio dei custom post type**: pagine thin con `<h1>` doppio e
 *    titolo generico "Archivi: …";
 *  - **`/design-system/`**: pagina di controllo interna, non fa parte del sito.
 */
const daPagine = pagineOneOff.filter((p) => p.noindex).map((p) => p.rotta);

export const noindexRoutes: string[] = [
  '/design-system/',
  ...daPagine,

  // root di archivio dei custom post type: thin, titolo generico
  '/services/',
  '/realizzazioni/',
  '/store/',

  // le due copie del punto edile di Via Argine: nell'originale non hanno
  // contenuto e non sono linkate da nessuna pagina
  '/store/via-argine-625-80147-napoli-na/',
  '/store/via-argine-625-80147-napoli-na-2/',
];

/** true se la rotta indicata è fra quelle da tenere fuori dall'indice. */
export const isNoindex = (pathname: string): boolean =>
  noindexRoutes.includes(pathname.endsWith('/') ? pathname : `${pathname}/`);
