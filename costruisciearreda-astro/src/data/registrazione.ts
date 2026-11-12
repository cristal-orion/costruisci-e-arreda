/**
 * Registrazione dei clienti di Home Design → Google Fogli (**voce B16**).
 *
 * Il percorso: in negozio il commerciante mostra un QR, il QR apre
 * `/home-design/registrati/`, il cliente compila, la riga arriva nel foglio.
 * Lo stesso form sta anche in fondo alla landing `/home-design/`, con un'altra
 * `fonte` e in un'altra **scheda** del foglio (`SCHEDA`, sotto): chi si
 * registra in negozio e chi arriva dal sito finiscono in due elenchi separati.
 *
 * Il ricevente è uno **script di Google Apps Script** collegato al foglio
 * (`Landing HomeDesigh/google-apps-script/Codice.gs`), pubblicato come app web.
 * Il suo indirizzo finisce qui sotto, oppure nella variabile di build
 * `PUBLIC_REGISTRAZIONE_ENDPOINT` (che vince, se impostata).
 *
 * **Senza indirizzo il form non si rende**, come gli altri form del sito: al
 * suo posto compaiono telefono ed email. Un form che finge di registrare è
 * peggio di nessun form, soprattutto davanti al cliente in negozio.
 *
 * La CSP non va toccata a mano: `deploy/genera-csp.js` legge dal build le
 * origini a cui i form inviano e le autorizza da sé (per Google aggiunge anche
 * `script.googleusercontent.com`, dove Apps Script rimanda la risposta).
 */

/** Indirizzo dell'app web di Apps Script: `https://script.google.com/macros/s/…/exec`. */
/* Progetto Apps Script "Registrazione Home Design", nell'account di Two Bee
   (il foglio è del cliente: il progetto legge il file dalla proprietà dello
   script ID_FOGLIO). Pubblicato il 2026-11-12. */
export const ENDPOINT_REGISTRAZIONE =
  'https://script.google.com/macros/s/AKfycbxfCOxxpY-SEYcl2nc_E7sqvhwua-r_dOS8B9U_ah-m64jjRmXkKX3043kW05lKus8/exec';

export const endpointRegistrazione = (): string =>
  (import.meta.env.PUBLIC_REGISTRAZIONE_ENDPOINT ?? '').trim() || ENDPOINT_REGISTRAZIONE.trim();

/**
 * Da dove arriva la registrazione: è la colonna "Fonte" del foglio.
 * Il QR può portarne una sua con `?fonte=…` (per esempio un QR per cassa), che
 * passa solo se fatta di lettere, cifre e trattini: il resto viene scartato.
 */
export const FONTE = {
  negozio: 'qr-negozio',
  landing: 'landing-home-design',
} as const;

/**
 * In quale scheda del foglio va la registrazione (campo `_scheda`). Deciso dal
 * proprietario il 2026-11-12: due schede, due pubblici.
 *  - `sito` → "Codice QR sito - Home Design": il form della landing, per chi
 *    arriva dalla pubblicità o dal sito anche senza essere passato dal negozio;
 *  - `negozio` → "Codice QR negozio - Home Design": la pagina del QR esposto
 *    in negozio.
 * I nomi devono essere le chiavi di `IMPOSTAZIONI.SCHEDE` in `Codice.gs`: un
 * nome che lo script non conosce non viene scritto da nessuna parte.
 */
export const SCHEDA = {
  sito: 'sito',
  negozio: 'negozio',
} as const;
export type Scheda = (typeof SCHEDA)[keyof typeof SCHEDA];

/**
 * Lo stesso controllo dell'email che fa lo script nel foglio: se il browser e
 * il foglio non sono d'accordo, il cliente vede "registrato" e la riga non c'è.
 * Tenere le due espressioni identiche (vedi `Codice.gs`, `EMAIL_VALIDA`).
 */
export const EMAIL_VALIDA = '[^\\s@]+@[^\\s@]+\\.[^\\s@]{2,}';

/**
 * Telefono facoltativo: cifre, spazi, `+`, `.`, `-`, `/` e parentesi, 6–20 caratteri.
 *
 * Gli escape dentro la classe non sono pignoleria: l'attributo `pattern` oggi
 * si compila con il flag `v` di JavaScript, che **vuole** `\(` `\)` `\/` `\-`
 * fra parentesi quadre. Scritta `[+0-9 ./()-]` l'espressione non compila, e il
 * browser allora non controlla niente, senza dirlo a nessuno.
 * Senza `^…$`: `pattern` vale già per tutto il campo.
 */
export const TELEFONO_VALIDO = '[+0-9 .\\/\\(\\)\\-]{6,20}';
