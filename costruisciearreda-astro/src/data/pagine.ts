/**
 * Le pagine one-off: rotta, titolo dell'`<h1>`, descrizione, impaginazione.
 *
 * Il contenuto viene dai blocchi estratti (`src/content/pagine/*.json`); qui
 * stanno le decisioni che l'estrazione non può prendere:
 *
 *  - **la meta description**: manca su tutte le pagine dell'originale (49 su 56).
 *    Scritte qui, in italiano, una per pagina;
 *  - **il testo dell'`<h1>`**: nell'originale l'unico `<h1>` è il titolo generico
 *    dell'hero, uguale su gruppi di pagine, mentre il titolo vero della pagina è
 *    un `<div>` o un `<h2>`. Qui l'`<h1>` è il titolo della pagina;
 *  - **l'impaginazione**: una colonna, due colonne o griglia di schede.
 */

export type Impaginazione = 'colonna' | 'testo' | 'schede' | 'due-colonne';

export type PaginaOneOff = {
  /** Slug del file in `src/content/pagine/`. */
  slug: string;
  /** Rotta del sito. Deve combaciare con quella dell'originale: è indicizzata. */
  rotta: string;
  /** Titolo della pagina, usato come `<h1>`. */
  h1: string;
  /** Meta description. Obbligatoria: nell'originale mancava. */
  descrizione: string;
  impaginazione: Impaginazione;
  /** Titolo dell'hero, se la pagina ne ha uno. */
  heroKicker?: string;
  /** Tiene la pagina fuori dall'indice dei motori. */
  noindex?: boolean;
  /** Nasconde il blocco contatti: le thank-you devono restare essenziali. */
  senzaBloccoContatti?: boolean;
  /** Nota interna sul perché di una scelta, non resa nella pagina. */
  nota?: string;
  /**
   * true = la pagina contiene un documento incorporato di terze parti che
   * inietta un proprio `<h1>`. Serve alle due legal: il testo è un embed
   * Iubenda che porta il suo `<h1>`, 13 `<h2>` e 2.716 parole. La pagina stampa
   * comunque il **suo** `<h1>` (non si può dipendere da una terza parte per
   * l'intestazione: se l'embed tarda, la pagina resterebbe senza titolo — visto
   * misurando) e un piccolo script declassa quello iniettato.
   */
  conEmbedLegale?: boolean;
};

export const pagineOneOff: PaginaOneOff[] = [
  {
    slug: 'la-nostra-storia',
    rotta: '/la-nostra-storia/',
    h1: 'La nostra storia',
    descrizione:
      'Da una piccola ferramenta a Ponticelli a quattro showroom in Campania: la storia, ' +
      'la missione e i valori di Costruisci e Arreda.',
    impaginazione: 'colonna',
  },
  {
    slug: 'il-nostro-team',
    rotta: '/il-nostro-team/',
    h1: 'Il nostro team',
    descrizione:
      'Le persone di Costruisci e Arreda: progettisti, tecnici e consulenti che seguono ' +
      'ogni cantiere dal sopralluogo alla consegna.',
    impaginazione: 'schede',
  },
  {
    slug: 'lavora-con-noi',
    rotta: '/lavora-con-noi/',
    h1: 'Lavora con noi',
    descrizione:
      'Posizioni aperte e candidature spontanee in Costruisci e Arreda: invia il tuo ' +
      'curriculum e raccontaci cosa sai fare.',
    impaginazione: 'testo',
  },
  {
    slug: 'contatti',
    rotta: '/contatti/',
    h1: 'Contatti',
    descrizione:
      'Indirizzi, telefono ed email di Costruisci e Arreda: showroom a Napoli e Nola, ' +
      'ferramenta, punto edile e uffici.',
    impaginazione: 'colonna',
  },
  {
    slug: 'dalla-progettazione-alla-realizzazione',
    rotta: '/dalla-progettazione-alla-realizzazione/',
    h1: 'Dalla progettazione alla realizzazione',
    descrizione:
      'Gli otto servizi di Costruisci e Arreda: sopralluogo e rilievo, progetto, ' +
      'rendering, consulenza finiture, disbrigo pratiche, direzione lavori, impianti, ' +
      'certificazioni.',
    impaginazione: 'colonna',
  },
  {
    slug: 'i-nostri-lavori',
    rotta: '/i-nostri-lavori/',
    h1: 'I nostri lavori',
    descrizione:
      'Le realizzazioni di Costruisci e Arreda: progetti di ristrutturazione, rendering 3D ' +
      'e trasformazioni prima e dopo.',
    impaginazione: 'colonna',
  },
  {
    slug: 'richiedi-preventivo',
    rotta: '/richiedi-preventivo/',
    h1: 'Richiedi un preventivo',
    descrizione:
      'Richiedi un preventivo gratuito a Costruisci e Arreda per ristrutturazioni, ' +
      'arredo bagno, ceramiche e forniture edili in Campania.',
    impaginazione: 'testo',
  },
  {
    slug: 'privacy-policy',
    rotta: '/privacy-policy/',
    h1: 'Privacy Policy',
    descrizione:
      'Informativa sul trattamento dei dati personali di Costruisci & Arreda S.R.L.',
    impaginazione: 'testo',
    conEmbedLegale: true,
  },
  {
    slug: 'cookie-policy',
    rotta: '/cookie-policy/',
    h1: 'Cookie Policy',
    descrizione: 'Informativa sui cookie utilizzati dal sito di Costruisci & Arreda S.R.L.',
    impaginazione: 'testo',
    conEmbedLegale: true,
  },

  /* --- Gli archivi `type_stores` ---------------------------------------------
     Nell'originale hanno l'URL di un archivio di tassonomia ma **contenuto
     proprio**: presentazione del tipo di punto vendita, foto, marchi trattati.
     Non sono elenchi generati, quindi si trattano come pagine one-off.
     I titoli Yoast erano "Showroom **Archivi**": qui sono titoli veri.        */
  {
    slug: 'type_stores-showroom-cat',
    rotta: '/type_stores/showroom-cat/',
    h1: 'Showroom',
    descrizione:
      'I quattro showroom di Costruisci e Arreda a Napoli e Nola: ceramiche, pavimenti, ' +
      'rivestimenti e arredo bagno da toccare con mano.',
    impaginazione: 'colonna',
  },
  {
    slug: 'type_stores-rivendita-edile',
    rotta: '/type_stores/rivendita-edile/',
    h1: 'Rivendita edile',
    descrizione:
      'La rivendita edile di Costruisci e Arreda: materiali da costruzione, malte, ' +
      'isolanti e forniture per il cantiere.',
    impaginazione: 'colonna',
  },
  {
    slug: 'type_stores-ferramenta',
    rotta: '/type_stores/ferramenta/',
    h1: 'Ferramenta',
    descrizione:
      'Le ferramenta di Costruisci e Arreda a Napoli e Portici: utensili, elettroutensili, ' +
      'minuteria e attrezzatura professionale.',
    impaginazione: 'colonna',
  },
  {
    slug: 'type_stores-progettazione-e-ristrutturazione-edile',
    rotta: '/type_stores/progettazione-e-ristrutturazione-edile/',
    h1: 'Progettazione e ristrutturazione edile',
    descrizione:
      'Progettazione e ristrutturazione edile con Costruisci e Arreda: dal sopralluogo ' +
      'alla consegna, con un unico interlocutore.',
    impaginazione: 'colonna',
  },
  {
    slug: 'type_stores-marchi',
    rotta: '/type_stores/marchi/',
    h1: 'I marchi che trattiamo',
    descrizione:
      'I marchi trattati da Costruisci e Arreda: ceramiche, sanitari, rubinetteria, ' +
      'utensileria e materiali per l\'edilizia.',
    impaginazione: 'colonna',
  },

  /* --- Thank-you page -------------------------------------------------------
     Nell'originale sono **`index, follow`**, quindi indicizzabili: una pagina di
     ringraziamento nei risultati di ricerca è un difetto, perché chi la apre da
     Google non ha inviato nulla. Qui vanno in `noindex` e restano essenziali:
     nessun blocco contatti, nessun carosello news.                            */
  {
    slug: 'preventivo-thankyou',
    rotta: '/preventivo-thankyou/',
    h1: 'Grazie per averci contattati',
    descrizione: 'La tua richiesta di preventivo è stata inviata: ti ricontattiamo presto.',
    impaginazione: 'testo',
    noindex: true,
    senzaBloccoContatti: true,
  },
  {
    slug: 'newsletter-thankyou',
    rotta: '/newsletter-thankyou/',
    h1: 'Grazie per l\'iscrizione',
    descrizione: 'Iscrizione alla newsletter di Costruisci e Arreda completata.',
    impaginazione: 'testo',
    noindex: true,
    senzaBloccoContatti: true,
  },
  {
    slug: 'thankyou-promo-6500',
    rotta: '/thankyou-promo-6500/',
    h1: 'Grazie per averci contattati',
    descrizione: 'La tua richiesta è stata inviata: ti ricontattiamo presto.',
    impaginazione: 'testo',
    noindex: true,
    senzaBloccoContatti: true,
  },
  {
    slug: 'thankyou-progetta-gli-spazi',
    rotta: '/thankyou-progetta-gli-spazi/',
    h1: 'Grazie per averci contattati',
    descrizione: 'La tua richiesta è stata inviata: ti ricontattiamo presto.',
    impaginazione: 'testo',
    noindex: true,
    senzaBloccoContatti: true,
  },

  /* --- Landing pubblicitarie ------------------------------------------------
     `/promo-casa/` contiene un'offerta con scadenza ("valida fino al 31
     Dicembre") ed è ancora `index, follow`: una promozione scaduta nei risultati
     di ricerca danneggia chi la trova e chi la pubblica. Ricostruita fedelmente
     ma in `noindex` finché il proprietario non decide se aggiornare l'offerta o
     ritirare la pagina. Vale lo stesso per l'altra landing.                   */
  {
    slug: 'promo-casa',
    rotta: '/promo-casa/',
    h1: 'Promo casa',
    descrizione:
      'Offerta Costruisci e Arreda per la casa: pavimenti, rivestimenti e arredo bagno ' +
      'in un\'unica soluzione.',
    impaginazione: 'colonna',
    noindex: true,
    nota: "offerta con scadenza: da aggiornare o ritirare, decisione del proprietario",
  },
  {
    slug: 'soluzione-ceramiche',
    rotta: '/soluzione-ceramiche/',
    h1: 'Soluzione ceramiche',
    descrizione:
      'Ceramiche, gres e rivestimenti Costruisci e Arreda: scegli le finiture con i ' +
      'nostri consulenti.',
    impaginazione: 'colonna',
    noindex: true,
    nota: 'landing pubblicitaria: fuori indice per non competere con le pagine del sito',
  },
];
