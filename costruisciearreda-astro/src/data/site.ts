/**
 * Dati del sito e dell'azienda — verificati sul mirror (footer di 66 pagine).
 * Fonte unica: qualsiasi altro punto del sito deve leggere da qui.
 */

export const site = {
  /** Nome usato dal template dei title: "%titolo% - %nome%" (schema Yoast originale) */
  name: 'Costruisci e Arreda S.r.l.',
  shortName: 'Costruisci & Arreda',
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
  phoneLabel: '+39 376 2024360',
  email: 'shop@costruisciearreda.com',
  /** E-commerce su dominio separato, non fa parte di questo sito. */
  shopUrl: 'https://costruisciearreda.com',
  credits: 'Vibgroup',
} as const;

export type Sede = {
  tipo: 'Showroom' | 'Ferramenta' | 'Punto edile' | 'Uffici';
  /** Righe dell'indirizzo come le stampa il footer dell'originale. */
  righe: [string, string];
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
  { tipo: 'Showroom', righe: ['Via Martiri della Libertà, 11', '80147 – Napoli (NA)'] },
  { tipo: 'Showroom', righe: ['Via Martiri della Libertà (Home)', '11, 80147 – Napoli (NA)'] },
  { tipo: 'Showroom', righe: ['Via San Massimo, SNC', 'Mercury Center, 80035 – Nola (NA)'] },
  { tipo: 'Ferramenta', righe: ['Corso Ponticelli, 28/C', '80147 – Napoli (NA)'] },
  { tipo: 'Ferramenta', righe: ['Via della Libertà, 56', '80055 – Portici (NA)'] },
  { tipo: 'Punto edile', righe: ['Via Argine, 625', '80147 – Napoli (NA)'] },
  { tipo: 'Uffici', righe: ['Via Gennaro Paparo, 74', '80040 – Massa di Somma (NA)'] },
];

/** Le sedi raggruppate per tipo, nell'ordine in cui appaiono nel footer. */
export const sediPerTipo = (['Showroom', 'Ferramenta', 'Punto edile', 'Uffici'] as const).map(
  (tipo) => ({ tipo, sedi: sedi.filter((s) => s.tipo === tipo) }),
);

/** URL social esatti presi dal footer del mirror. */
export const social = [
  { nome: 'LinkedIn', url: 'https://it.linkedin.com/company/costruisci-e-arreda-srl' },
  { nome: 'Facebook', url: 'https://www.facebook.com/costruisciearreda/?locale=it_IT' },
  { nome: 'Instagram', url: 'https://www.instagram.com/costruisciearreda/?hl=it' },
] as const;
