/**
 * I rami del gruppo — fonte unica.
 *
 * Costruisci & Arreda non è un negozio: è un gruppo con quattro attività
 * distinte, che sul sito originale erano raggiungibili **solo** dal sottomenu
 * "Store" o da tre loghi SVG a metà homepage. Chi arrivava sulla home non
 * capiva quali fossero i rami né dove entrare.
 *
 * Le rotte sono quelle **già esistenti e indicizzate** della tassonomia
 * `type_stores`: sono brutte da leggere (`/type_stores/showroom-cat/`) ma sono
 * quelle che i motori conoscono, e le pagine sono già piene di contenuto.
 * Rinominarle è una modifica a sé, che richiede 301 e il rifacimento dei link
 * interni: non si fa di straforo qui.
 *
 * `tipoSede` non è decorativo: aggancia il ramo alle sedi dichiarate in
 * `site.ts`, così i comuni mostrati nelle campate non sono una seconda lista
 * da tenere allineata a mano.
 *
 * Le quattro foto della hero sono state generate apposta per la nuova parete e
 * registrate in `lib/immagini-locali.ts`. `foto: null` più `promptFoto` resta lo
 * stato di fallback per un eventuale ramo futuro ancora privo di immagine.
 */
import { sedi, type Sede } from './site';

export type Ramo = {
  /** Identificatore stabile: chiave interna, non testo da mostrare. */
  slug: string;
  /** Nome del ramo come va letto dall'utente. */
  nome: string;
  /** Una riga: cosa ci si trova. Ripresa dal testo della pagina del ramo. */
  descrizione: string;
  /** Rotta esistente e indicizzata del ramo. */
  href: string;
  /** Percorso dentro `uploads`, risolto da `lib/immagini`. `null` = da generare. */
  foto: string | null;
  /**
   * Testo alternativo della foto — **non** è il prompt.
   * È quello che leggono gli screen reader e che indicizzano i motori: va
   * scritto guardando la foto vera, quando c'è. Stringa vuota solo se la foto
   * è davvero decorativa e il nome della campata dice già tutto.
   */
  fotoAlt: string;
  /**
   * Prompt per generare la foto. Il soggetto soltanto: le regole di formato
   * sono in `FORMATO_FOTO` e vengono aggiunte da `promptCompleto()`, così stanno
   * scritte una volta e non quattro.
   * Presente = la foto va ancora fatta. Da togliere quando `foto` è popolata.
   */
  promptFoto?: string;
  /**
   * Punto della foto da tenere al centro del ritaglio, come `object-position`
   * (`'50% 35%'` = centrato in orizzontale, un po' più in alto in verticale).
   * Serve perché la campata cambia proporzione fra i viewport — da 0,78 a 1,85
   * misurati — quindi `cover` ritaglia i lati su desktop e sopra/sotto su
   * telefono. Omesso = `50% 50%`. È l'unico posto in cui va toccato.
   */
  fuoco?: string;
  /** Sedi da cui derivare i comuni. `null` per i rami che non sono un luogo. */
  tipoSede: Sede['tipo'] | null;
  /** Sostituisce i comuni derivati, per i rami che non sono un punto vendita. */
  dettaglio?: string;
};

/**
 * Le regole di formato, identiche per tutte e quattro le foto. Non sono
 * preferenze: sono **misurate** sulla parete (voce B03 del CHANGELOG).
 *
 * - **4:3 orizzontale**: la campata va da 0,78 (verticale, su desktop) a 1,85
 *   (orizzontale, su telefono) — 2,4 volte. Con `object-fit: cover` il 4:3 è
 *   l'unico formato che tiene sia il 59% della larghezza sia il 72%
 *   dell'altezza, quindi l'area sempre visibile è un rettangolo usabile e non
 *   una striscia.
 * - **soggetto nel 60% × 70% centrale**: quello che sta ai bordi viene
 *   tagliato su qualche schermo, sempre.
 * - **terzo inferiore semplice**: lì va l'insegna — nome, descrizione, sedi —
 *   sotto una velatura all'82%. Un dettaglio importante messo in basso non si
 *   vedrà.
 * - **niente testo né marchi**: un'insegna inventata su una foto di un'azienda
 *   vera è una cosa da non pubblicare.
 */
export const FORMATO_FOTO =
  'Fotografia realistica, formato 4:3 orizzontale. Soggetto contenuto nel 60% × 70% ' +
  'centrale dell’inquadratura, con circa un quinto di margine libero su ogni lato. ' +
  'Terzo inferiore dell’immagine semplice e poco dettagliato. Luce diffusa media-alta, ' +
  'colori naturali. Nessun testo, nessuna insegna, nessun logo, nessun marchio, ' +
  'nessuna filigrana, nessun volto riconoscibile in primo piano.';

export const rami: Ramo[] = [
  {
    slug: 'ceramiche-e-bagno',
    nome: 'Ceramiche e Bagno',
    descrizione:
      'Pavimenti, rivestimenti e arredo bagno da toccare con mano, in spazi ' +
      'pensati per farti vedere il progetto prima di realizzarlo.',
    href: '/type_stores/showroom-cat/',
    foto: '2026/09/hero-ceramiche-bagno.png',
    fotoAlt:
      'Showroom luminoso con grandi lastre di gres, campioni di rivestimenti e mobile bagno con lavabo.',
    tipoSede: 'Showroom',
  },
  {
    slug: 'edilizia',
    nome: 'Edilizia',
    descrizione:
      'Materiali per edilizia tecnica, ordinaria e pesante, colorificio con ' +
      'tintometro, utensili e impianti. Per imprese e professionisti.',
    href: '/type_stores/rivendita-edile/',
    foto: '2026/09/hero-edilizia.png',
    fotoAlt:
      'Piazzale di materiali edili con bancali di laterizi, sacchi di malta, profili metallici e muletto.',
    tipoSede: 'Punto edile',
  },
  {
    slug: 'ferramenta',
    nome: 'Ferramenta',
    descrizione:
      'Termoidraulica ed elettrico, fai-da-te, chiavi e serrature, vernici a ' +
      'campione, utensili e protezione individuale.',
    href: '/type_stores/ferramenta/',
    foto: '2026/09/hero-ferramenta.png',
    fotoAlt:
      'Banco di ferramenta con duplicatrice per chiavi, minuteria ordinata, utensili ed elettroutensili.',
    tipoSede: 'Ferramenta',
  },
  {
    slug: 'progettazione',
    nome: 'Progettazione e Ristrutturazione',
    descrizione:
      'Dal sopralluogo al collaudo: progetto, rendering, pratiche, impianti e ' +
      'direzione lavori con un unico interlocutore.',
    href: '/type_stores/progettazione-e-ristrutturazione-edile/',
    foto: '2026/09/hero-progettazione.png',
    fotoAlt:
      'Professionisti confrontano una pianta, campioni di finiture e il rendering di un bagno su tablet.',
    // Non è un punto vendita: mostrare l'indirizzo degli uffici sarebbe fuorviante.
    tipoSede: null,
    dettaglio: 'Otto servizi, dal rilievo alle certificazioni',
  },
];

/** Il prompt da dare al generatore: soggetto più le regole di formato. */
export const promptCompleto = (ramo: Ramo): string | null =>
  ramo.promptFoto ? `${ramo.promptFoto} ${FORMATO_FOTO}` : null;

/**
 * Il comune di una sede, estratto dalla seconda riga dell'indirizzo.
 * Le righe hanno forma `80147 – Napoli (NA)` oppure
 * `Mercury Center, 80035 – Nola (NA)`: il comune sta fra la lineetta e la
 * parentesi della provincia. Il separatore è una lineetta media, non un meno.
 */
const comune = (sede: Sede): string | null =>
  sede.righe[1].match(/[–-]\s*([^(–-]+?)\s*\(/)?.[1]?.trim() ?? null;

/**
 * I comuni in cui il ramo ha una sede, senza ripetizioni.
 * Serve la deduplica: lo showroom di Via Martiri della Libertà è elencato due
 * volte nel footer dell'originale, quindi Napoli comparirebbe due volte.
 */
export const comuniDelRamo = (ramo: Ramo): string[] =>
  ramo.tipoSede === null
    ? []
    : [
        ...new Set(
          sedi
            .filter((s) => s.tipo === ramo.tipoSede)
            .map(comune)
            .filter((c): c is string => !!c),
        ),
      ];

/** Elenco in italiano: "Napoli", "Napoli e Nola", "Napoli, Nola e Portici". */
const elenco = (voci: string[]): string =>
  voci.length < 2 ? (voci[0] ?? '') : `${voci.slice(0, -1).join(', ')} e ${voci.at(-1)}`;

/**
 * La riga di dettaglio della campata: dove si trova il ramo, o il testo
 * dichiarato per i rami che non sono un luogo.
 *
 * Scritta come si parla — "Napoli e Nola" — e non come una stringa di metadati
 * unita dai punti centrali ("Napoli · Nola"): quello è il modo in cui un
 * template mette insieme dei campi, non il modo in cui si dice a qualcuno dove
 * andare.
 */
export const dettaglioDelRamo = (ramo: Ramo): string | null =>
  ramo.dettaglio ?? (elenco(comuniDelRamo(ramo)) || null);
