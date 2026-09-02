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
  tipo: 'showroom' | 'ferramenta' | 'punto-edile' | 'uffici';
  indirizzo: string;
  citta: string;
  nota?: string;
};

export const sedi: Sede[] = [
  { tipo: 'showroom', indirizzo: 'Via Martiri della Libertà 11', citta: 'Napoli' },
  { tipo: 'showroom', indirizzo: 'Via San Massimo', citta: 'Nola', nota: 'Mercury Center' },
  { tipo: 'ferramenta', indirizzo: 'Corso Ponticelli 28/C', citta: 'Napoli' },
  { tipo: 'ferramenta', indirizzo: 'Via della Libertà 56', citta: 'Portici' },
  { tipo: 'punto-edile', indirizzo: 'Via Argine 625', citta: 'Napoli' },
  { tipo: 'uffici', indirizzo: 'Via Gennaro Paparo 74', citta: 'Massa di Somma' },
];

export const social = [
  { nome: 'LinkedIn', url: 'https://www.linkedin.com/company/costruisci-arreda/' },
  { nome: 'Facebook', url: 'https://www.facebook.com/costruisciearreda/' },
  { nome: 'Instagram', url: 'https://www.instagram.com/costruisciearreda/' },
] as const;
