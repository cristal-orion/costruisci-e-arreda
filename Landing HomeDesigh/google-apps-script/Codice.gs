/**
 * Home Design — registrazione dei clienti dal sito a Google Fogli.
 *
 * Va incollato nell'editor di Apps Script **del foglio** (dal foglio:
 * Estensioni → Apps Script) e pubblicato come app web. Le istruzioni passo
 * passo sono in ISTRUZIONI.md, nella stessa cartella.
 *
 * **Due schede, due provenienze.** Ogni form del sito dice in quale scheda
 * va (campo `_scheda`, scritto nella pagina):
 *  - `sito`: il form della landing /home-design/, dove arriva chi viene
 *    dalla pubblicità o dal sito, anche senza essere passato dal negozio;
 *  - `negozio`: la pagina /home-design/registrati/, aperta con il QR esposto
 *    in negozio.
 * Un invio senza una scheda valida non viene scritto da nessuna parte.
 *
 * Cosa fa, a ogni registrazione:
 *  1. controlla i dati con le stesse regole del sito (nome, cognome, email,
 *     telefono facoltativo, presa visione dell'informativa);
 *  2. trova le colonne **per nome di intestazione**, non per posizione: se il
 *     foglio ha già "Nome", "E-mail", "Cellulare", "Data"… le riconosce anche
 *     in un altro ordine. Le colonne che mancano le aggiunge in fondo, senza
 *     toccare quelle che ci sono. Su un foglio vuoto scrive le intestazioni;
 *  3. aggiunge una riga, con la data e l'ora di Roma;
 *  4. segna "Sì" in "Già registrato" se quell'email c'era già: chi torna in
 *     negozio si riconosce;
 *  5. non scrive due volte lo stesso invio, se il telefono del cliente lo
 *     ripete perché la risposta si è persa per strada.
 *
 * Due persone che si registrano nello stesso secondo non si sovrascrivono:
 * la scrittura passa da un lucchetto (LockService).
 */

/* ---------------------------------------------------------------------------
 * Impostazioni. Di solito non serve cambiare niente.
 * ------------------------------------------------------------------------- */
var IMPOSTAZIONI = {
  /**
   * L'ID del file (la parte dell'indirizzo fra /d/ e /edit). **Lasciato vuoto
   * di proposito:** lo script si crea dal foglio (Estensioni → Apps Script) e
   * il file lo trova da solo. Questo codice sta in un repository pubblico:
   * l'ID qui dentro renderebbe raggiungibile il foglio dei clienti.
   */
  ID_FOGLIO: '',
  /**
   * Le schede, per numero: il `gid=…` dell'indirizzo quando la scheda è
   * aperta. Reggono anche se le schede vengono rinominate. Se una scheda non
   * c'è più, lo script dà errore: **non** ripiega su un'altra scheda.
   */
  SCHEDE: {
    sito: 1058875551, // "Codice QR sito - Home Design" ← landing /home-design/
    negozio: 659565949, // "Codice QR negozio - Home Design" ← /home-design/registrati/
  },
  /** Formato della colonna data. */
  FORMATO_DATA: 'dd/MM/yyyy HH:mm:ss',
};

/**
 * Le colonne. `alias` sono i nomi di intestazione riconosciuti (maiuscole,
 * accenti, spazi e trattini non contano). `titolo` è il nome usato quando la
 * colonna va creata.
 */
var COLONNE = [
  { chiave: 'data', titolo: 'Data e ora', alias: ['data e ora', 'data', 'data ora', 'data registrazione', 'registrato il', 'timestamp', 'informazioni cronologiche', 'quando', 'ora'] },
  { chiave: 'nome', titolo: 'Nome', alias: ['nome', 'first name', 'name'] },
  { chiave: 'cognome', titolo: 'Cognome', alias: ['cognome', 'last name', 'surname'] },
  { chiave: 'email', titolo: 'Email', alias: ['email', 'e-mail', 'mail', 'indirizzo email', 'indirizzo e-mail', 'posta elettronica'] },
  { chiave: 'telefono', titolo: 'Telefono', alias: ['telefono', 'cellulare', 'cell', 'tel', 'numero di telefono', 'numero', 'phone'] },
  { chiave: 'marketing', titolo: 'Consenso marketing', alias: ['consenso marketing', 'marketing', 'newsletter', 'consenso newsletter', 'consenso email', 'consenso comunicazioni'] },
  { chiave: 'privacy', titolo: 'Informativa privacy', alias: ['informativa privacy', 'privacy', 'consenso privacy', 'presa visione privacy'] },
  { chiave: 'fonte', titolo: 'Fonte', alias: ['fonte', 'provenienza', 'origine', 'canale', 'source'] },
  { chiave: 'ritorno', titolo: 'Già registrato', alias: ['gia registrato', 'già registrato', 'ritorno', 'cliente di ritorno', 'ricorrente'] },
  { chiave: 'pagina', titolo: 'Pagina', alias: ['pagina', 'url', 'pagina di registrazione'] },
];

/**
 * Colonne riconosciute ma mai create da sole: se il foglio ha "Nome e
 * cognome" in una colonna sola, la riempie; se non ce l'ha, non la aggiunge.
 */
var COLONNE_FACOLTATIVE = [
  { chiave: 'nomecompleto', alias: ['nome e cognome', 'nome cognome', 'cliente', 'nominativo', 'full name'] },
];

/** Le stesse regole del sito (src/data/registrazione.ts): tenerle identiche. */
var EMAIL_VALIDA = /^(?:[^\s@]+@[^\s@]+\.[^\s@]{2,})$/;
var TELEFONO_VALIDO = /^(?:[+0-9 .\/\(\)\-]{6,20})$/;

/* ---------------------------------------------------------------------------
 * Punti d'ingresso dell'app web.
 * ------------------------------------------------------------------------- */

/**
 * Aprire l'indirizzo dell'app web nel browser chiama questa funzione: serve a
 * controllare che la pubblicazione sia giusta. Deve rispondere {"ok":true,…}.
 */
function doGet() {
  try {
    var schede = {};
    Object.keys(IMPOSTAZIONI.SCHEDE).forEach(function (nome) {
      schede[nome] = scheda_(nome).getName();
    });
    return json_({ ok: true, servizio: 'Registrazione Home Design', schede: schede });
  } catch (err) {
    return json_({ ok: false, servizio: 'Registrazione Home Design', errore: String(err && err.message ? err.message : err) });
  }
}

function doPost(e) {
  var p = (e && e.parameter) || {};
  var modo = p._modo === 'json' ? 'json' : 'pagina';
  var esito;
  try {
    esito = registra_(p);
  } catch (err) {
    console.error('Registrazione non riuscita: ' + (err && err.stack ? err.stack : err));
    esito = {
      ok: false,
      errore: 'interno',
      messaggio: 'Non siamo riusciti a registrarti. Riprova tra qualche istante, oppure chiedi in negozio.',
    };
  }
  return modo === 'json' ? json_(esito) : pagina_(esito);
}

/* ---------------------------------------------------------------------------
 * La registrazione.
 * ------------------------------------------------------------------------- */

function registra_(p) {
  // Campo trappola compilato: è un programma automatico. Si risponde "ok"
  // per non insegnargli niente, e non si scrive nulla.
  if (pulisci_(p._url)) return { ok: true };

  var dati = {
    nome: pulisci_(p.nome),
    cognome: pulisci_(p.cognome),
    email: pulisci_(p.email).toLowerCase(),
    telefono: pulisci_(p.telefono),
    privacy: p.privacy === 'si',
    marketing: p.marketing === 'si',
    fonte: pulisci_(p.fonte).slice(0, 40) || 'sito',
    pagina: pulisci_(p.pagina).slice(0, 200),
    id: pulisci_(p._id).slice(0, 80),
    scheda: pulisci_(p._scheda),
  };

  // Il form non dice dove scrivere: è un errore del sito, non del cliente.
  if (!Object.prototype.hasOwnProperty.call(IMPOSTAZIONI.SCHEDE, dati.scheda)) {
    console.error('Scheda sconosciuta: "' + dati.scheda + '" (pagina ' + dati.pagina + ')');
    return {
      ok: false,
      errore: 'scheda',
      messaggio: 'Non siamo riusciti a registrarti. Riprova tra qualche istante, oppure chiedi in negozio.',
    };
  }

  var problema = controlla_(dati);
  if (problema) return { ok: false, errore: 'dati', messaggio: problema };

  // Lo stesso invio ripetuto (risposta persa, secondo tocco): già scritto.
  var cache = CacheService.getScriptCache();
  var chiaveCache = dati.id ? 'invio:' + dati.id : '';
  if (chiaveCache && cache.get(chiaveCache)) return { ok: true, ripetuto: true };

  var lucchetto = LockService.getScriptLock();
  if (!lucchetto.tryLock(25000)) {
    return { ok: false, errore: 'occupato', messaggio: 'Troppe registrazioni nello stesso momento. Riprova fra qualche secondo.' };
  }
  try {
    // Ricontrollo dentro il lucchetto: due tentativi quasi simultanei.
    if (chiaveCache && cache.get(chiaveCache)) return { ok: true, ripetuto: true };

    var foglio = scheda_(dati.scheda);
    var colonne = colonne_(foglio);
    var ritorno = emailGiaPresente_(foglio, colonne.email, dati.email);

    var valori = {
      data: new Date(),
      nome: dati.nome,
      cognome: dati.cognome,
      nomecompleto: (dati.nome + ' ' + dati.cognome).trim(),
      email: dati.email,
      telefono: dati.telefono,
      marketing: dati.marketing ? 'Sì' : 'No',
      privacy: dati.privacy ? 'Sì' : 'No',
      fonte: dati.fonte,
      ritorno: ritorno ? 'Sì' : 'No',
      pagina: dati.pagina,
    };

    var riga = [];
    for (var i = 0; i < foglio.getLastColumn(); i++) riga.push('');
    Object.keys(colonne).forEach(function (chiave) {
      var v = valori[chiave];
      riga[colonne[chiave] - 1] = v instanceof Date ? v : testo_(v);
    });

    foglio.appendRow(riga);
    var n = foglio.getLastRow();
    if (colonne.data) foglio.getRange(n, colonne.data).setNumberFormat(IMPOSTAZIONI.FORMATO_DATA);
    // Il telefono resta testo: "+39 333…" non deve diventare un numero.
    if (colonne.telefono) foglio.getRange(n, colonne.telefono).setNumberFormat('@');
    SpreadsheetApp.flush();

    if (chiaveCache) cache.put(chiaveCache, '1', 21600); // 6 ore
    return { ok: true, ritorno: ritorno };
  } finally {
    lucchetto.releaseLock();
  }
}

/** Il primo problema dei dati, in parole da mostrare al cliente; '' se va tutto bene. */
function controlla_(d) {
  if (!d.nome) return 'Scrivi il tuo nome.';
  if (d.nome.length > 80) return 'Il nome è troppo lungo.';
  if (!d.cognome) return 'Scrivi il tuo cognome.';
  if (d.cognome.length > 80) return 'Il cognome è troppo lungo.';
  if (!d.email) return 'Scrivi la tua email.';
  if (d.email.length > 254 || !EMAIL_VALIDA.test(d.email)) return 'Controlla l’email: deve essere come nome@esempio.it';
  if (d.telefono && !TELEFONO_VALIDO.test(d.telefono)) return 'Il numero di telefono può avere solo cifre, spazi e il prefisso con il +.';
  if (!d.privacy) return 'Per registrarti devi dichiarare di aver letto l’informativa sulla privacy.';
  return '';
}

/* ---------------------------------------------------------------------------
 * Il foglio e le sue colonne.
 * ------------------------------------------------------------------------- */

/** La scheda per nome di provenienza ('sito' o 'negozio'), cercata per gid. */
function scheda_(nome) {
  var file = IMPOSTAZIONI.ID_FOGLIO
    ? SpreadsheetApp.openById(IMPOSTAZIONI.ID_FOGLIO)
    : SpreadsheetApp.getActiveSpreadsheet();
  if (!file) throw new Error('Foglio non trovato: crea lo script dal foglio (Estensioni → Apps Script) o imposta ID_FOGLIO.');
  if (!Object.prototype.hasOwnProperty.call(IMPOSTAZIONI.SCHEDE, nome)) throw new Error('Scheda sconosciuta: "' + nome + '".');
  var gid = Number(IMPOSTAZIONI.SCHEDE[nome]);
  var schede = file.getSheets();
  for (var i = 0; i < schede.length; i++) {
    if (schede[i].getSheetId() === gid) return schede[i];
  }
  throw new Error('Nel foglio non c’è la scheda "' + nome + '" (gid=' + gid + '): è stata cancellata? Correggi SCHEDE.');
}

/** Riduce un'intestazione alla forma confrontabile: "E-mail " → "email". */
function normalizza_(s) {
  return String(s == null ? '' : s)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Mappa chiave → numero di colonna (da 1). Scrive le intestazioni su un foglio
 * vuoto e aggiunge in fondo quelle che mancano.
 */
function colonne_(foglio) {
  var ultima = foglio.getLastColumn();
  var intestazioni = ultima > 0 ? foglio.getRange(1, 1, 1, ultima).getValues()[0] : [];
  var vuoto = intestazioni.every(function (h) { return String(h).trim() === ''; });

  if (vuoto) {
    if (foglio.getLastRow() > 1) {
      throw new Error('La prima riga del foglio è vuota ma sotto ci sono dati: scrivi le intestazioni nella riga 1.');
    }
    var titoli = COLONNE.map(function (c) { return c.titolo; });
    foglio.getRange(1, 1, 1, titoli.length).setValues([titoli]).setFontWeight('bold');
    foglio.setFrozenRows(1);
    var mappa0 = {};
    COLONNE.forEach(function (c, i) { mappa0[c.chiave] = i + 1; });
    return mappa0;
  }

  var normalizzate = intestazioni.map(normalizza_);
  var mappa = {};
  var trova = function (alias) {
    for (var a = 0; a < alias.length; a++) {
      var i = normalizzate.indexOf(normalizza_(alias[a]));
      if (i !== -1) return i + 1;
    }
    return 0;
  };

  var mancanti = [];
  COLONNE.forEach(function (c) {
    var col = trova(c.alias);
    if (col) mappa[c.chiave] = col;
    else mancanti.push(c);
  });
  COLONNE_FACOLTATIVE.forEach(function (c) {
    var col = trova(c.alias);
    if (col) mappa[c.chiave] = col;
  });

  // "Nome e cognome" in una colonna sola: nome e cognome separati non servono.
  if (mappa.nomecompleto) {
    mancanti = mancanti.filter(function (c) { return c.chiave !== 'nome' && c.chiave !== 'cognome'; });
  }

  if (mancanti.length) {
    var da = ultima + 1;
    foglio
      .getRange(1, da, 1, mancanti.length)
      .setValues([mancanti.map(function (c) { return c.titolo; })])
      .setFontWeight('bold');
    mancanti.forEach(function (c, i) { mappa[c.chiave] = da + i; });
  }
  return mappa;
}

function emailGiaPresente_(foglio, colonna, email) {
  var righe = foglio.getLastRow() - 1;
  if (!colonna || righe < 1 || !email) return false;
  var trovata = foglio
    .getRange(2, colonna, righe, 1)
    .createTextFinder(email)
    .matchCase(false)
    .matchEntireCell(true)
    .findNext();
  return trovata !== null;
}

/* ---------------------------------------------------------------------------
 * Utilità.
 * ------------------------------------------------------------------------- */

function pulisci_(v) {
  return String(v == null ? '' : v)
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Un testo che comincia con = + - @ il foglio lo leggerebbe come formula
 * (e "=HYPERLINK(…)" scritto da qualcuno nel campo nome diventerebbe un
 * link). L'apostrofo davanti lo tiene testo e non si vede nella cella.
 */
function testo_(v) {
  var s = String(v == null ? '' : v);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function json_(oggetto) {
  return ContentService.createTextOutput(JSON.stringify(oggetto)).setMimeType(ContentService.MimeType.JSON);
}

/** Risposta per chi invia senza JavaScript: una pagina leggibile, non del JSON. */
function pagina_(esito) {
  var titolo = esito.ok ? 'Grazie, sei registrato.' : 'Registrazione non riuscita';
  var testo = esito.ok ? 'Ti scriveremo presto con le novità di Home Design.' : esito.messaggio;
  var html =
    '<!doctype html><html lang="it"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1">' +
    '<title>' + titolo + '</title></head>' +
    '<body style="margin:0;padding:40px 20px;font-family:system-ui,sans-serif;background:#1a2039;color:#f9a3c0">' +
    '<h1 style="font-size:32px;margin:0 0 16px">' + escape_(titolo) + '</h1>' +
    '<p style="font-size:18px;margin:0 0 24px">' + escape_(testo) + '</p>' +
    '<p><a style="color:#f9a3c0" href="https://costruisciearreda.it/home-design/" target="_top">Torna a Home Design</a></p>' +
    '</body></html>';
  return HtmlService.createHtmlOutput(html).setTitle(titolo);
}

function escape_(s) {
  return String(s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

/* ---------------------------------------------------------------------------
 * Prova dall'editor.
 * ------------------------------------------------------------------------- */

/**
 * Da eseguire una volta dall'editor (menu in alto: seleziona "provaRegistrazione"
 * e premi Esegui). Chiede le autorizzazioni e scrive **una riga di prova in
 * ognuna delle due schede**, con fonte "prova-editor": controlla che ci siano,
 * poi cancellale.
 */
function provaRegistrazione() {
  var pagine = { sito: '/home-design/', negozio: '/home-design/registrati/' };
  Object.keys(IMPOSTAZIONI.SCHEDE).forEach(function (nome) {
    var esito = registra_({
      nome: 'Prova',
      cognome: 'Editor',
      email: 'prova@esempio.it',
      telefono: '+39 333 000 0000',
      privacy: 'si',
      marketing: 'no',
      fonte: 'prova-editor',
      pagina: pagine[nome] || '',
      _scheda: nome,
      _id: 'prova-' + nome + '-' + new Date().getTime(),
    });
    console.log(nome + ': ' + JSON.stringify(esito));
    if (!esito.ok) throw new Error(nome + ': ' + esito.messaggio);
  });
}
