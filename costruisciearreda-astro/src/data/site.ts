/**
 * Dati del sito e dell'azienda — verificati sul mirror (footer di 66 pagine).
 * Fonte unica: qualsiasi altro punto del sito deve leggere da qui.
 */

export const site = {
  /** Nome usato dal template dei title: "%titolo% - %nome%" (schema Yoast originale) */
  name: 'Costruisci e Arreda S.r.l.',
  shortName: 'Costruisci & Arreda',
  /**
   * Il nome in coda al `<title>` e in `og:site_name`. Senza "S.r.l.": nei
   * risultati di ricerca la forma societaria sono sette caratteri che spingono
   * il titolo oltre i ~60 visibili, e nessuno cerca "Arreda S.r.l.".
   * La ragione sociale completa resta in `company.legalName` e nei dati strutturati.
   */
  brand: 'Costruisci e Arreda',
  /** Dominio di destinazione al cutover. */
  url: 'https://costruisciearreda.it',
  lang: 'it-IT',
  locale: 'it_IT',
  timezone: 'Europe/Rome',
  description:
    'Edilizia, arredo bagno, ceramiche e ferramenta in Campania: showroom, punto edile, ' +
    'ferramenta e servizi di progettazione e ristrutturazione.',
} as const;

export const company = {
  legalName: 'Costruisci & Arreda S.R.L.',
  vat: '08562161219',
  phone: '+393762024360',
  /** Come lo scrive l'originale, senza spazi dentro il numero. */
  phoneLabel: '+39 3762024360',
  /**
   * L'indirizzo è su `costruisciearreda.com`, ma **non c'è nessun e-commerce
   * dietro quel dominio**: misurato il 2026-09-11, `www.costruisciearreda.com`
   * fa 301 su `www.costruisciearreda.it` e poi su `costruisciearreda.it` —
   * torna cioè a questo stesso sito. Qui resta solo la casella di posta.
   * Il campo `shopUrl` che c'era è stato tolto per questo (voce B09).
   */
  email: 'shop@costruisciearreda.com',
  /**
   * Chi ha costruito questo sito. Al suo posto, nel footer del mirror, c'era
   * `credits: 'Vibgroup'` — il credits del **tema WordPress** dell'originale,
   * rimosso per decisione del proprietario (voce B11): di quel tema nel rebuild
   * non è rimasto niente, né CSS né markup né template.
   */
  realizzatoDa: { nome: 'Two Bee', url: 'https://www.twobee.it' },
  /** Dalla pagina "La nostra storia": fondata nel 2000 da Giorgio Gallo, a Ponticelli. */
  fondazione: '2000',
  fondatore: 'Giorgio Gallo',
} as const;

export type Sede = {
  tipo: 'Showroom' | 'Ferramenta' | 'Punto edile' | 'Uffici';
  /** Righe dell'indirizzo come le stampa il footer dell'originale. */
  righe: [string, string];
  /**
   * L'indirizzo scomposto, per i dati strutturati (`PostalAddress`): le `righe`
   * sono testo da stampare, e ricavarne CAP e comune con una regex si è già
   * visto quanto regge (vedi `comuneDi` in `rami.ts`).
   */
  indirizzo: { via: string; cap: string; comune: string; provincia: 'NA' };
  /** La pagina della sede, se ne ha una indicizzata. */
  pagina?: string;
  nota?: string;
};

/**
 * Sedi, trascritte **dal footer del mirror**, che è la fonte più completa
 * (con CAP e comune). Sono raggruppate per tipo esattamente come là.
 *
 * Nota: lo showroom di Via Martiri della Libertà 11 compare **due volte**
 * nell'originale, la seconda con l'aggiunta "(Home)". Riprodotto come sta:
 * se è un doppione va chiesto al proprietario, non deciso qui.
 */
export const sedi: Sede[] = [
  {
    tipo: 'Showroom',
    righe: ['Via Martiri della Libertà, 11', '80147 – Napoli (NA)'],
    indirizzo: { via: 'Via Martiri della Libertà, 11', cap: '80147', comune: 'Napoli', provincia: 'NA' },
    pagina: '/store/via-martiri-della-liberta-na/',
  },
  {
    tipo: 'Showroom',
    righe: ['Via Martiri della Libertà (Home)', '11, 80147 – Napoli (NA)'],
    indirizzo: { via: 'Via Martiri della Libertà, 11', cap: '80147', comune: 'Napoli', provincia: 'NA' },
    // lo slug dice "nola", ma la pagina è lo showroom Home di Napoli: titolo e testo lo confermano
    pagina: '/store/via-martiri-della-liberta-nola-na/',
  },
  {
    tipo: 'Showroom',
    righe: ['Via San Massimo, SNC', 'Mercury Center, 80035 – Nola (NA)'],
    indirizzo: { via: 'Via San Massimo, SNC – Mercury Center', cap: '80035', comune: 'Nola', provincia: 'NA' },
    pagina: '/store/via-san-massimo-na/',
  },
  {
    tipo: 'Ferramenta',
    righe: ['Corso Ponticelli, 28/C', '80147 – Napoli (NA)'],
    indirizzo: { via: 'Corso Ponticelli, 28/C', cap: '80147', comune: 'Napoli', provincia: 'NA' },
  },
  {
    tipo: 'Ferramenta',
    righe: ['Via della Libertà, 56', '80055 – Portici (NA)'],
    indirizzo: { via: 'Via della Libertà, 56', cap: '80055', comune: 'Portici', provincia: 'NA' },
  },
  {
    tipo: 'Punto edile',
    righe: ['Via Argine, 625', '80147 – Napoli (NA)'],
    indirizzo: { via: 'Via Argine, 625', cap: '80147', comune: 'Napoli', provincia: 'NA' },
    // niente `pagina`: le due pagine di Via Argine sono vuote e in noindex
  },
  {
    tipo: 'Uffici',
    righe: ['Via Gennaro Paparo, 74', '80040 – Massa di Somma (NA)'],
    indirizzo: { via: 'Via Gennaro Paparo, 74', cap: '80040', comune: 'Massa di Somma', provincia: 'NA' },
  },
];

/** Le sedi raggruppate per tipo, nell'ordine in cui appaiono nel footer. */
export const sediPerTipo = (['Showroom', 'Ferramenta', 'Punto edile', 'Uffici'] as const).map(
  (tipo) => ({ tipo, sedi: sedi.filter((s) => s.tipo === tipo) }),
);

/**
 * Tracciamento e consenso.
 *
 * - `gtm`: il contenitore Google Tag Manager aggiunto il 2026-09-25. Dentro,
 *   misurato scaricando il contenitore pubblico: un tag Google (GA4
 *   `G-2241MMD122`) e un tag HTML personalizzato con il Meta Pixel
 *   `421449629929560`, entrambi su **tutte le pagine**.
 * - `iubenda`: l'account del sito originale (stessi ID del mirror). Da lì
 *   vengono il banner dei cookie e i testi di privacy e cookie policy: le due
 *   pagine legali sono un embed di quella policy, non testo nel repo.
 */
export const tracciamento = {
  gtm: 'GTM-N5NSRTX2',
  iubenda: { siteId: 3729690, cookiePolicyId: 19235990 },
} as const;

/** URL social esatti presi dal footer del mirror. */
export const social = [
  { nome: 'LinkedIn', url: 'https://it.linkedin.com/company/costruisci-e-arreda-srl' },
  { nome: 'Facebook', url: 'https://www.facebook.com/costruisciearreda/?locale=it_IT' },
  { nome: 'Instagram', url: 'https://www.instagram.com/costruisciearreda/?hl=it' },
] as const;
