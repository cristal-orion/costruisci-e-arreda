/**
 * Titoli, descrizioni e dati strutturati (JSON-LD) — un posto solo.
 *
 * I dati strutturati non c'erano: né nel rebuild né, di fatto, nell'originale
 * (Yoast stampava un grafo generico `WebPage` con dentro gli URL `?p=ID` del
 * mirror). Per un'azienda con sette sedi è la mancanza che pesa di più:
 * indirizzi, tipo di negozio e rapporto sede → azienda sono esattamente ciò che
 * Google usa per i risultati locali e ciò che un assistente AI cita quando gli
 * chiedono "dove compro piastrelle a Nola?". Scritti nella pagina come testo,
 * vanno indovinati; scritti qui, si leggono.
 *
 * Tutto viene da `data/site.ts`: nessun indirizzo è riscritto a mano.
 */
import { company, sedi, site, social, type Sede } from '../data/site';
import { nomeDelRamoPerRotta } from '../data/rami';

/* ------------------------------------------------------------------ titoli */

/** Il suffisso che l'estrattore ha copiato dai `<title>` di Yoast. */
const SUFFISSO_ORIGINALE = / - Costruisci e Arreda S\.r\.l\.$/;

/** Oltre questa lunghezza Google tronca il titolo nei risultati (~600px). */
const TITOLO_MAX = 60;

/**
 * Il `<title>` della pagina: "titolo - Costruisci e Arreda", ma il nome del
 * sito si aggiunge **solo se ci sta**. Nell'originale il suffisso era sempre lì,
 * e su un articolo da 70 caratteri voleva dire che a finire tagliate erano le
 * parole dell'argomento — Google tronca dalla fine.
 */
export const titoloPagina = (titolo: string): string => {
  const base = titolo.replace(SUFFISSO_ORIGINALE, '').replace(/\.$/, '').trim();
  const conSuffisso = `${base} - ${site.brand}`;
  return conSuffisso.length <= TITOLO_MAX ? conSuffisso : base;
};

/* ------------------------------------------------------------- descrizioni */

/**
 * Una meta description ricavata da un testo lungo, tagliata **fra due parole**.
 * Il taglio a 155 caratteri secchi che c'era prima spezzava le parole a metà:
 * "…ceramiche, pavimenti e rivestimenti pensati per ogni esigenza estetica e
 * funzi…". Il punto di sospensione si mette solo se si è tagliato davvero.
 */
export const descrizioneDa = (testo: string, max = 155): string => {
  const pulito = testo.replace(/\s+/g, ' ').trim();
  if (pulito.length <= max) return pulito;
  const taglio = pulito.slice(0, max);
  const spazio = taglio.lastIndexOf(' ');
  return taglio.slice(0, spazio > max * 0.6 ? spazio : max).replace(/[\s,;:.–-]+$/, '') + '…';
};

/** Il testo semplice di un frammento HTML. */
export const testoDaHtml = (html: string | null | undefined): string =>
  (html ?? '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/* ------------------------------------------------------------ dati strutturati */

type Nodo = Record<string, unknown>;

const assoluto = (percorso: string) => new URL(percorso, site.url).href;

export const ID = {
  organizzazione: `${site.url}/#organizzazione`,
  sito: `${site.url}/#sito`,
  logo: `${site.url}/#logo`,
  pagina: (url: string) => `${url}#pagina`,
  briciole: (url: string) => `${url}#briciole`,
};

/**
 * Il tipo schema.org di una sede. `HomeGoodsStore` per gli showroom (ceramiche,
 * arredo bagno, complementi), `HardwareStore` per ferramenta e punto edile,
 * `HomeAndConstructionBusiness` per gli uffici, da cui partono progettazione e
 * ristrutturazione.
 */
const tipoSchema: Record<Sede['tipo'], string> = {
  Showroom: 'HomeGoodsStore',
  Ferramenta: 'HardwareStore',
  'Punto edile': 'HardwareStore',
  Uffici: 'HomeAndConstructionBusiness',
};

/** Nome leggibile della sede, per i dati strutturati. */
const nomeSede = (s: Sede) => {
  const home = s.righe[0].includes('(Home)') ? ' Home' : '';
  const tipo = s.tipo === 'Uffici' ? 'Uffici e progettazione' : s.tipo;
  return `${site.brand} – ${tipo}${home} ${s.indirizzo.comune}`;
};

/** Un `@id` stabile per sede: la pagina se c'è, altrimenti un frammento. */
export const idSede = (s: Sede) =>
  s.pagina
    ? `${assoluto(s.pagina)}#sede`
    : `${site.url}/#sede-${(s.tipo + '-' + s.indirizzo.via)
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')}`;

const indirizzoPostale = (s: Sede): Nodo => ({
  '@type': 'PostalAddress',
  streetAddress: s.indirizzo.via,
  postalCode: s.indirizzo.cap,
  addressLocality: s.indirizzo.comune,
  addressRegion: s.indirizzo.provincia,
  addressCountry: 'IT',
});

/**
 * Una sede come `LocalBusiness`. Mancano **di proposito** orari e coordinate:
 * non stanno da nessuna parte nel sito, e un orario inventato in un dato
 * strutturato finisce sulla scheda di Google come se fosse vero.
 */
export const sedeLd = (s: Sede, extra: Nodo = {}): Nodo => ({
  '@type': tipoSchema[s.tipo],
  '@id': idSede(s),
  name: nomeSede(s),
  address: indirizzoPostale(s),
  telephone: company.phone,
  email: company.email,
  ...(s.pagina ? { url: assoluto(s.pagina) } : {}),
  parentOrganization: { '@id': ID.organizzazione },
  image: { '@id': ID.logo },
  ...extra,
});

/** La sede che ha per pagina il percorso indicato. */
export const sedePerPagina = (percorso: string) => sedi.find((s) => s.pagina === percorso);

const uffici = sedi.find((s) => s.tipo === 'Uffici')!;

export const organizzazioneLd = (): Nodo => ({
  '@type': 'Organization',
  '@id': ID.organizzazione,
  name: site.brand,
  legalName: company.legalName,
  alternateName: site.shortName,
  url: `${site.url}/`,
  description: site.description,
  logo: {
    '@type': 'ImageObject',
    '@id': ID.logo,
    url: assoluto('/apple-touch-icon.png'),
    width: 180,
    height: 180,
    caption: site.brand,
  },
  image: { '@id': ID.logo },
  foundingDate: company.fondazione,
  founder: { '@type': 'Person', name: company.fondatore },
  vatID: `IT${company.vat}`,
  taxID: company.vat,
  telephone: company.phone,
  email: company.email,
  address: indirizzoPostale(uffici),
  areaServed: [
    { '@type': 'AdministrativeArea', name: 'Città metropolitana di Napoli' },
    { '@type': 'AdministrativeArea', name: 'Campania' },
  ],
  contactPoint: {
    '@type': 'ContactPoint',
    contactType: 'customer service',
    telephone: company.phone,
    email: company.email,
    availableLanguage: 'Italian',
    areaServed: 'IT',
  },
  sameAs: social.map((s) => s.url),
  department: sedi.filter((s) => s.tipo !== 'Uffici').map((s) => ({ '@id': idSede(s) })),
});

export const sitoLd = (): Nodo => ({
  '@type': 'WebSite',
  '@id': ID.sito,
  url: `${site.url}/`,
  name: site.brand,
  description: site.description,
  inLanguage: site.lang,
  publisher: { '@id': ID.organizzazione },
});

export type Briciola = { nome: string; url: string };

export const bricioleLd = (url: string, voci: Briciola[]): Nodo => ({
  '@type': 'BreadcrumbList',
  '@id': ID.briciole(url),
  itemListElement: voci.map((v, i) => ({
    '@type': 'ListItem',
    position: i + 1,
    name: v.nome,
    item: assoluto(v.url),
  })),
});

export type TipoPagina = 'WebPage' | 'AboutPage' | 'ContactPage' | 'CollectionPage' | 'ItemPage';

export const paginaLd = (o: {
  url: string;
  nome: string;
  descrizione: string;
  tipo?: TipoPagina;
  immagine?: string;
  conBriciole: boolean;
}): Nodo => ({
  '@type': o.tipo ?? 'WebPage',
  '@id': ID.pagina(o.url),
  url: o.url,
  name: o.nome,
  description: o.descrizione,
  inLanguage: site.lang,
  isPartOf: { '@id': ID.sito },
  about: { '@id': ID.organizzazione },
  ...(o.immagine ? { primaryImageOfPage: { '@type': 'ImageObject', url: o.immagine } } : {}),
  ...(o.conBriciole ? { breadcrumb: { '@id': ID.briciole(o.url) } } : {}),
});

/** Il grafo completo, pronto da stampare in `<script type="application/ld+json">`. */
export const grafo = (nodi: Nodo[]): string =>
  JSON.stringify({ '@context': 'https://schema.org', '@graph': nodi })
    // `</script>` dentro una stringa chiuderebbe il blocco: non succede con
    // questi dati, ma il costo di escludere il caso è una riga.
    .replace(/</g, '\\u003c');

/** Tutte le sedi con una pagina o no: servono intere nella homepage e nei contatti. */
export const tutteLeSediLd = (): Nodo[] => sedi.filter((s) => s.tipo !== 'Uffici').map((s) => sedeLd(s));

/** Genitori noti per sezione, per le briciole: la sezione è il primo segmento del percorso. */
export const BRICIOLE_SEZIONE: Record<string, Briciola> = {
  services: { nome: 'Servizi', url: '/dalla-progettazione-alla-realizzazione/' },
  realizzazioni: { nome: 'I nostri lavori', url: '/i-nostri-lavori/' },
  cat_realizzazioni: { nome: 'I nostri lavori', url: '/i-nostri-lavori/' },
  // i tre store con pagina sono showroom: il nome del ramo si legge da `rami.ts`
  store: { nome: nomeDelRamoPerRotta('/type_stores/showroom-cat/') ?? 'Showroom', url: '/type_stores/showroom-cat/' },
};
