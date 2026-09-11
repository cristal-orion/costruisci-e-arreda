/**
 * Navigazione — estratta dal menu del mirror e ripulita.
 *
 * Nell'originale il menu è nel DOM **3 volte** (canvas mobile + header mobile +
 * header desktop), tutte e tre con lo **stesso `id="menuContainer"`** — HTML non
 * valido e ~250 parole di boilerplate duplicate prima del contenuto. Qui è una
 * sola volta, reso responsive dal CSS.
 *
 * Gli href dell'originale puntano alla forma rotta `index.html%3Fp=976.html`:
 * sono stati risolti in slug puliti tramite la mappa page-id → URL costruita
 * leggendo la classe del `<body>` di ogni pagina del mirror (45 id, nessun
 * conflitto, tutti i 15 id del menu risolti).
 *
 * Le voci "Azienda", "Servizi" e "Store" nell'originale hanno come href la
 * pagina corrente più `#`: non sono link, sono interruttori del sottomenu.
 * Qui hanno `href: null` e diventano bottoni veri.
 */

import { rami } from './rami';

export type VoceMenu = {
  label: string;
  /** `null` = non è un link, apre solo il sottomenu. */
  href: string | null;
  external?: boolean;
  figli?: VoceMenu[];
};

/**
 * Le voci dei quattro rami, lette da `rami.ts` invece di riscritte.
 *
 * **Modifica voluta (fase B, voce B07):** i nomi sono quelli con cui il
 * proprietario descrive il gruppo — "Ceramiche e Bagno" ed "Edilizia" al posto
 * di "Showroom" e "Rivendita edile", che erano i titoli delle pagine generati
 * da WordPress. Le rotte non cambiano, quindi non serve nessun 301.
 * "Marchi" non è un ramo: è l'elenco delle marche trattate, e resta a sé.
 */
const vociDeiRami = (): VoceMenu[] => rami.map((r) => ({ label: r.nome, href: r.href }));

export const menuPrincipale: VoceMenu[] = [
  {
    label: 'Azienda',
    href: null,
    figli: [
      { label: 'La nostra storia', href: '/la-nostra-storia/' },
      { label: 'Il nostro Team', href: '/il-nostro-team/' },
      { label: 'Lavora con Noi', href: '/lavora-con-noi/' },
      { label: 'Contatti', href: '/contatti/' },
    ],
  },
  {
    label: 'Servizi',
    href: null,
    figli: [
      { label: 'Tutti i servizi', href: '/dalla-progettazione-alla-realizzazione/' },
      { label: 'Sopralluogo e rilievo', href: '/services/sopralluogo-e-rilievo/' },
      { label: 'Progetto', href: '/services/progetto/' },
      { label: 'Rendering', href: '/services/rendering/' },
      { label: 'Consulenza finiture', href: '/services/consulenza-finiture/' },
      { label: 'Disbrigo pratiche', href: '/services/disbrigo-pratiche/' },
      { label: 'Direzione lavori', href: '/services/direzione-lavori/' },
      { label: 'Impianti', href: '/services/impianti/' },
      { label: 'Certificazioni', href: '/services/certificazioni/' },
    ],
  },
  {
    label: 'Store',
    href: null,
    figli: [
      ...vociDeiRami(),
      { label: 'Marchi', href: '/type_stores/marchi/' },
    ],
  },
  { label: 'Realizzazioni', href: '/i-nostri-lavori/' },
  { label: 'News and Event', href: '/category/ultime-news-e-articoli/' },
  { label: 'Richiedi Preventivo', href: '/richiedi-preventivo/' },
  { label: 'Shop Online', href: 'https://www.costruisciearreda.com/', external: true },
];

/**
 * Colonne di link del footer, nell'ordine dell'originale.
 * "Company profile" nell'originale punta a `#`: è un link morto. Qui è omesso —
 * se serve davvero va deciso dove deve portare.
 */
export const colonneFooter: { titolo: string; voci: VoceMenu[] }[] = [
  {
    titolo: 'azienda',
    voci: [
      { label: 'La nostra storia', href: '/la-nostra-storia/' },
      { label: 'Il nostro Team', href: '/il-nostro-team/' },
      { label: 'Lavora con noi', href: '/lavora-con-noi/' },
      { label: 'Contatti', href: '/contatti/' },
    ],
  },
  {
    titolo: 'Link utili',
    voci: [
      { label: 'Realizzazioni', href: '/i-nostri-lavori/' },
      { label: 'Richiedi preventivo', href: '/richiedi-preventivo/' },
      { label: 'News and Event', href: '/category/ultime-news-e-articoli/' },
    ],
  },
  {
    titolo: 'Store',
    voci: [
      ...vociDeiRami(),
      { label: 'Marchi', href: '/type_stores/marchi/' },
    ],
  },
  {
    titolo: 'Servizi',
    voci: [
      { label: 'Sopralluogo e rilievo', href: '/services/sopralluogo-e-rilievo/' },
      { label: 'Progetto', href: '/services/progetto/' },
      { label: 'Rendering', href: '/services/rendering/' },
      { label: 'Consulenza finiture', href: '/services/consulenza-finiture/' },
      { label: 'Disbrigo pratiche', href: '/services/disbrigo-pratiche/' },
      { label: 'Direzione lavori', href: '/services/direzione-lavori/' },
      { label: 'Impianti', href: '/services/impianti/' },
      { label: 'Certificazioni', href: '/services/certificazioni/' },
    ],
  },
];

export const legalFooter: VoceMenu[] = [
  { label: 'Privacy Policy', href: '/privacy-policy/' },
  { label: 'Cookie Policy', href: '/cookie-policy/' },
];
