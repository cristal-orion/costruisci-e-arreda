# Home Design: registrazione dei clienti su Google Fogli

**Due pagine, due elenchi** (deciso il 2026-11-12):

| Da dove si registra | Pagina | Scheda del foglio |
|---|---|---|
| Dal sito o dalla pubblicità, anche senza essere venuto in negozio | `https://costruisciearreda.it/home-design/` (form in fondo alla landing) | **Codice QR sito - Home Design** |
| In negozio, con il QR esposto | `https://costruisciearreda.it/home-design/registrati/` | **Codice QR negozio - Home Design** |

Ogni form dice allo script in quale scheda scrivere. Le schede "Cartaceo"
non vengono mai toccate. La colonna **Fonte** dice in più da quale QR o link
è arrivata ogni persona.

Finché il collegamento non è fatto, il form non c'è: al suo posto la pagina
mostra telefono ed email. Così nessun cliente compila un form che non porta da
nessuna parte.

---

## 1. Collegare il foglio (circa 5 minuti, una volta sola)

**Le schede sono già impostate nello script**, per numero (`gid`), così
reggono anche se vengono rinominate. Se una delle due viene cancellata, lo
script dà errore invece di scrivere altrove.

L'indirizzo del foglio **non** è scritto nello script, di proposito: questo
codice sta in un repository pubblico. Non serve, perché lo script si crea
dal foglio stesso (punto 2) e il foglio lo trova da solo.

L'account che fa questi passi deve poter **modificare** il foglio.

1. Apri il foglio "CANALE DI ARRIVO CLIENTI - Ceramiche & Home Design".
2. Menu **Estensioni → Apps Script**. Si apre l'editor in una nuova scheda.
3. Cancella tutto quello che c'è nel file `Codice.gs` e incolla il contenuto di
   **`google-apps-script/Codice.gs`** (in questa cartella).
4. Salva (icona del dischetto, o Ctrl+S).
5. **Prova dall'editor:** nel menu a tendina in alto scegli `provaRegistrazione`
   e premi **Esegui**. Google chiede le autorizzazioni:
   - "Rivedi autorizzazioni" → scegli il tuo account;
   - se compare "Google non ha verificato questa app": **Avanzate → Vai a … (non sicuro)**.
     È normale: lo script è tuo e non è pubblicato sullo store di Google;
   - **Consenti**.

   Torna sul foglio. **In tutte e due le schede** "Codice QR sito" e
   "Codice QR negozio" ci sono le intestazioni (le scrive lo script, se la
   scheda era vuota) e una riga con nome **Prova Editor** e fonte
   `prova-editor`. **Cancella le due righe, non le intestazioni.**
6. **Pubblica:** in alto a destra **Esegui il deployment → Nuovo deployment**.
   - Ingranaggio accanto a "Seleziona tipo" → **App web**;
   - Descrizione: `Registrazione Home Design`;
   - **Esegui come: Me**;
   - **Chi ha accesso: Chiunque** ← proprio "Chiunque", **non** "Chiunque con
     account Google". Con l'altra scelta i clienti senza Google, o non
     collegati, vedrebbero un errore;
   - **Esegui il deployment**.
7. Copia l'**URL dell'app web**: finisce con `/exec`, tipo
   `https://script.google.com/macros/s/AKfy…/exec`.
8. **Controllo:** apri quell'indirizzo nel browser. Deve rispondere
   `{"ok":true,…,"schede":{"sito":"Codice QR sito - Home Design","negozio":"Codice QR negozio - Home Design"}}`.
   Se risponde `"ok":false`, il messaggio dice quale scheda non trova.
9. **Manda l'URL a chi gestisce il sito** (o mettilo tu in
   `costruisciearreda-astro/src/data/registrazione.ts`, in
   `ENDPOINT_REGISTRAZIONE`, e fai il push). Dopo il deploy il form compare
   sulle due pagine, e la CSP si aggiorna da sola.

### Le colonne del foglio

Lo script **non tocca l'ordine delle tue colonne**: le riconosce dal nome
dell'intestazione nella riga 1 (maiuscole, accenti e trattini non contano).

| Cosa scrive | Intestazioni riconosciute |
|---|---|
| Data e ora (di Roma) | Data e ora, Data, Timestamp, Registrato il, Informazioni cronologiche… |
| Nome · Cognome | Nome, Cognome — oppure una colonna sola "Nome e cognome", "Cliente", "Nominativo" |
| Email | Email, E-mail, Mail, Indirizzo email, Posta elettronica |
| Telefono | Telefono, Cellulare, Cell, Tel |
| Consenso marketing (Sì/No) | Consenso marketing, Marketing, Newsletter, Consenso newsletter |
| Informativa privacy (Sì) | Informativa privacy, Privacy, Consenso privacy |
| Fonte | Fonte, Provenienza, Origine, Canale |
| Già registrato (Sì/No) | Già registrato, Ritorno, Cliente di ritorno |
| Pagina | Pagina, URL |

- Le colonne che **mancano** vengono aggiunte **in fondo**, una volta sola.
- Le colonne **tue** che lo script non conosce (per esempio "Note del
  negozio") restano vuote e tue: puoi scriverci quello che vuoi.
- Su un foglio **vuoto** scrive lui le intestazioni.
- Le schede si scelgono in `Codice.gs`, in `SCHEDE`, con il numero `gid=…`
  che compare nell'indirizzo quando la scheda è aperta.

### Due cose da sapere sui dati

- **"Consenso marketing" è la colonna che decide a chi puoi mandare
  newsletter.** È facoltativo e parte non spuntato, come vuole la legge: a chi
  ha "No" non vanno mandate email promozionali. L'informativa privacy invece è
  obbligatoria per registrarsi.
- **"Già registrato: Sì"** vuol dire che quell'email c'era già **in quella
  scheda**: è un cliente che torna. Le due schede sono elenchi separati, quindi
  chi si è registrato dal sito e poi in negozio compare in tutte e due. Ogni registrazione è comunque una riga nuova, così vedi anche
  quante volte e quando è tornato.

---

### La condivisione del file

Oggi il file si apre **senza accedere**, con il solo link: è il caso di
"Chiunque abbia il link". Dentro ci sono nomi, email e telefoni dei clienti.
**Allo script la condivisione non serve**, perché scrive con l'account di chi
l'ha pubblicato. Quindi in **Condividi → Accesso generale** scegli **"Con
limitazioni"** e aggiungi per nome solo le persone che devono vederlo.

---

## 2. I QR

Due QR, uno per pagina:

| QR | Indirizzo | Dove va |
|---|---|---|
| **Pubblicità** | `https://costruisciearreda.it/home-design/` | nelle ads e nei materiali fuori dal negozio → scheda "sito" |
| **Negozio** | `https://costruisciearreda.it/home-design/registrati/` | sul banco e in vetrina → scheda "negozio" |

I file stanno in `qr/`, in tre versioni ognuno: SVG per la stampa a qualsiasi
misura, PNG 2000×2000 blu notte su bianco, PNG nero su bianco. Correzione
d'errore "Q": regge anche se il cartello si rovina un po'.

**Per la stampa:** almeno **3×3 cm**, meglio 5×5 su un cartello da banco.
Lascia il bordo bianco intorno così com'è: senza, i telefoni fanno fatica a
leggerlo. Non stamparlo su fondo scuro o colorato.

**Più QR per sapere da dove arrivano** (una campagna, una cassa, una fiera):
aggiungi `?fonte=` all'indirizzo, con lettere, cifre e trattini. Nella colonna
Fonte comparirà quel nome. La scheda non cambia: la decide la pagina.

```
https://costruisciearreda.it/home-design/?fonte=ads-instagram
https://costruisciearreda.it/home-design/registrati/?fonte=vetrina
```

Per generare il QR di un indirizzo così, dalla radice del repo:

```bash
npx qrcode@1.5.4 -e Q -w 2000 -o qr-vetrina.png "https://costruisciearreda.it/home-design/registrati/?fonte=vetrina"
```

---

## 3. Se qualcosa non va

| Cosa succede | Perché, e cosa fare |
|---|---|
| Sulla pagina c'è "La registrazione online non è ancora attiva" | L'URL dell'app web non è ancora nel sito (punto 9) |
| Il cliente vede "Non siamo riusciti a registrarti" | Lo script ha dato errore. In Apps Script: menu a sinistra **Esecuzioni**, apri l'ultima riga rossa e leggi il messaggio |
| L'indirizzo `/exec` aperto nel browser chiede di accedere | Al punto 6 è stato scelto "Chiunque con account Google": rifai il deployment con **Chiunque** |
| Hai **modificato** `Codice.gs` | Non basta salvare: **Esegui il deployment → Gestisci deployment → matita → Versione: Nuova versione → Esegui il deployment**. L'URL resta lo stesso |
| "La prima riga del foglio è vuota ma sotto ci sono dati" | Scrivi le intestazioni nella riga 1 |

**Non creare un "Nuovo deployment"** dopo aver cambiato il codice: avrebbe un
URL diverso, e il sito continuerebbe a mandare i dati al vecchio.

---

## Come è stato provato

- `google-apps-script/prova-codice.mjs` — lo script del foglio su un foglio
  simulato: 55 verifiche (il file vero con quattro schede: la landing scrive
  solo in "sito", la pagina del QR solo in "negozio", un invio senza scheda
  valida da nessuna parte; foglio vuoto, colonne tue in altro ordine, colonna
  unica "Nome e cognome", dati sbagliati, campo trappola, invio ripetuto senza
  doppioni, formule iniettate nei campi, email già registrata, regole uguali a
  quelle del sito).
  `node "Landing HomeDesigh/google-apps-script/prova-codice.mjs"`
- `_migrazione/prova-registrazione.js` — il form vero, in un browser, con la
  CSP di produzione, contro un finto Apps Script che esegue **questo stesso
  `Codice.gs`**: 36 verifiche, con le due schede separate, comprese rete assente, risposta persa dopo la
  scrittura (nessun doppione al secondo tentativo), secondo cliente sullo
  stesso telefono, e invio senza JavaScript.

Quello che una prova locale non può dire è come risponde **il tuo** deployment
di Google: dopo il punto 9, una registrazione di prova dal telefono, una
occhiata al foglio, e la riga di prova si cancella.
