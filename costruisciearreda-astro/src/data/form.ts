/**
 * I sei form del sito, con i campi **estratti dal markup di Contact Form 7**.
 *
 * L'originale li invia a WordPress con reCAPTCHA v3; nel rebuild l'invio va a un
 * endpoint configurabile (`PUBLIC_FORM_ENDPOINT`). Senza endpoint configurato il
 * form **non viene reso** e al suo posto compaiono i recapiti diretti: meglio un
 * telefono che un form che finge di inviare.
 *
 * Difetti dell'originale corretti qui:
 *  - **il campo curriculum accetta `audio/*,video/*,image/*`**: audio e video sì,
 *    un PDF no. Su un form di candidatura. Corretto in `.pdf,.doc,.docx`;
 *  - i campi hanno **solo il placeholder** e nessuna `<label>`: il testo
 *    scompare appena si scrive e gli screen reader non lo annunciano in modo
 *    affidabile. Qui ogni campo ha la sua label;
 *  - il link all'informativa privacy puntava a `pagina#`, cioè a niente: ora
 *    porta a `/privacy-policy/`;
 *  - `autocomplete` assente: il browser non poteva compilare nome, email, telefono.
 *
 * **Segnalazione:** nel form del preventivo l'opzione è scritta
 * "Risrtutturazione" — errore di battitura presente sul sito live.
 */

export type Campo = {
  name: string;
  label: string;
  tipo: 'text' | 'email' | 'tel' | 'date' | 'textarea' | 'file' | 'radio';
  obbligatorio?: boolean;
  /** Valore di `autocomplete`: permette al browser di compilare. */
  autocomplete?: string;
  /** Solo per `radio`. */
  opzioni?: string[];
  /** Solo per `file`. */
  accept?: string;
  /** Suggerimento sotto il campo. */
  aiuto?: string;
  /** Occupa due colonne nella griglia. */
  intero?: boolean;
};

export type Form = {
  /** id del Contact Form 7 originale: serve a ritrovare la corrispondenza. */
  idCf7: string;
  nome: string;
  invio: string;
  campi: Campo[];
  /** Messaggio dopo l'invio riuscito. */
  successo: string;
  /** Rotta della thank-you page dell'originale, se ce n'era una. */
  thankyou?: string;
};

const privacy: Campo = {
  name: 'privacy',
  label: 'Ho letto e accetto l’informativa sulla privacy',
  tipo: 'text', // reso come checkbox dal componente
  obbligatorio: true,
  intero: true,
};

/** Campi anagrafici comuni a cinque form su sei. */
const anagrafica: Campo[] = [
  { name: 'nome', label: 'Nome', tipo: 'text', obbligatorio: true, autocomplete: 'given-name' },
  { name: 'cognome', label: 'Cognome', tipo: 'text', obbligatorio: true, autocomplete: 'family-name' },
  { name: 'email', label: 'E-mail', tipo: 'email', obbligatorio: true, autocomplete: 'email' },
  { name: 'telefono', label: 'Telefono', tipo: 'tel', obbligatorio: true, autocomplete: 'tel' },
];

export const forms: Record<string, Form> = {
  /** Blocco contatti, presente su 26 pagine dell'originale. */
  contatti: {
    idCf7: '95',
    nome: 'Richiesta di informazioni',
    invio: 'Invia messaggio',
    successo: 'Grazie, abbiamo ricevuto la tua richiesta: ti ricontattiamo presto.',
    campi: [
      ...anagrafica,
      { name: 'company', label: 'Ragione sociale', tipo: 'text', autocomplete: 'organization' },
      { name: 'piva', label: 'P.IVA', tipo: 'text' },
      privacy,
    ],
  },

  /** Newsletter del footer. */
  newsletter: {
    idCf7: '467',
    nome: 'Iscrizione alla newsletter',
    invio: 'Iscriviti',
    successo: 'Iscrizione registrata: grazie.',
    thankyou: '/newsletter-thankyou/',
    campi: [
      { name: 'email', label: 'E-mail', tipo: 'email', obbligatorio: true, autocomplete: 'email', intero: true },
      privacy,
    ],
  },

  preventivo: {
    idCf7: '1548',
    nome: 'Richiesta di preventivo',
    invio: 'Invia richiesta',
    successo: 'Grazie, abbiamo ricevuto la tua richiesta di preventivo.',
    thankyou: '/preventivo-thankyou/',
    campi: [
      ...anagrafica,
      { name: 'citta', label: 'Città', tipo: 'text', obbligatorio: true, autocomplete: 'address-level2' },
      {
        name: 'ricontatto',
        label: 'Quando preferisci essere ricontattato',
        tipo: 'date',
        obbligatorio: true,
      },
      {
        name: 'tipo',
        label: 'Di cosa hai bisogno',
        tipo: 'radio',
        // "Ristrutturazione" scritto correttamente: sul sito live è "Risrtutturazione"
        opzioni: ['Nuovo progetto', 'Ristrutturazione'],
        obbligatorio: true,
        intero: true,
      },
      { name: 'messaggio', label: 'Messaggio', tipo: 'textarea', intero: true },
      privacy,
    ],
  },

  candidatura: {
    idCf7: '775',
    nome: 'Candidatura',
    invio: 'Invia candidatura',
    successo: 'Grazie, abbiamo ricevuto la tua candidatura.',
    campi: [
      { name: 'nome', label: 'Nome', tipo: 'text', obbligatorio: true, autocomplete: 'given-name' },
      { name: 'cognome', label: 'Cognome', tipo: 'text', obbligatorio: true, autocomplete: 'family-name' },
      { name: 'anno', label: 'Anno di nascita', tipo: 'text', obbligatorio: true, autocomplete: 'bday-year' },
      { name: 'email', label: 'E-mail', tipo: 'email', obbligatorio: true, autocomplete: 'email' },
      { name: 'telefono', label: 'Telefono', tipo: 'tel', autocomplete: 'tel' },
      { name: 'job', label: 'Posizione lavorativa', tipo: 'text', obbligatorio: true },
      {
        name: 'curriculum',
        label: 'Curriculum',
        tipo: 'file',
        obbligatorio: true,
        // l'originale accettava audio, video e immagini, ma non i PDF
        accept: '.pdf,.doc,.docx',
        aiuto: 'PDF o Word, fino a 5 MB.',
        intero: true,
      },
      { name: 'messaggio', label: 'Messaggio', tipo: 'textarea', intero: true },
      privacy,
    ],
  },

  /* Il form `4473` della landing `/promo-casa/` è stato rimosso insieme alla
     pagina: l'offerta era scaduta. Se la promozione verrà rifatta, la
     definizione si ricostruisce dai campi elencati nel CHANGELOG (voce A08). */

  'landing-ceramiche': {
    idCf7: '4395',
    nome: 'Richiesta appuntamento',
    invio: 'Fissa appuntamento',
    successo: 'Grazie, ti ricontattiamo per fissare l’appuntamento.',
    thankyou: '/thankyou-progetta-gli-spazi/',
    campi: [
      ...anagrafica,
      { name: 'citta', label: 'Città', tipo: 'text', obbligatorio: true, autocomplete: 'address-level2' },
      {
        name: 'disponibilita',
        label: 'Quando saresti disponibile per un appuntamento',
        tipo: 'text',
        obbligatorio: true,
        intero: true,
      },
      privacy,
    ],
  },
};

/** L'id CF7 → la chiave del form, per collegare i blocchi estratti. */
export const formPerIdCf7: Record<string, string> = Object.fromEntries(
  Object.entries(forms).map(([chiave, f]) => [f.idCf7, chiave]),
);
