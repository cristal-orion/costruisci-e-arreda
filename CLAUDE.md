# Costruisci e Arreda — copia statica del sito

> ## ⏯ PUNTO DI RIPRESA — leggere per primo
>
> **Ultima sessione: 2026-09-02.** **34 rotte su 66 sono ricostruite.** Fatti:
> scaffold + design system, i 4 componenti, hero + titoletto, l'estrazione dei
> contenuti, header e footer, i template di servizi/realizzazioni/store/articoli
> e gli archivi di blog e `cat_realizzazioni`.
> Il prossimo passo sono le **11 pagine one-off**, homepage per prima.
> Non serve rianalizzare il sito né chiedere conferma del piano: è tutto in questo file.
>
> ### Stato del rebuild: `costruisciearreda-astro/`
> Astro 7.2.10 · Node 22.22 · `trailingSlash: 'always'` · sitemap filtrata sui noindex.
> Design system **misurato** (non letto dal CSS) e verificato nel browser ai tre viewport:
> `src/styles/{fonts,tokens,base,global}.css`, `src/components/Button.astro`,
> `src/layouts/BaseLayout.astro`, `src/data/{site,noindex}.ts`.
> Pagina di controllo dei token: `/design-system/` (noindex).
> CSS a **10,3 KB** (3,0 KB gzip) contro i 685 KB dell'originale; zero JS.
> Misure, deviazioni dichiarate e verifiche: `_migrazione/CHANGELOG.md`, voce **A00**.
>
> Comandi: `cd costruisciearreda-astro && npm run dev` (oppure `astro dev --background`,
> gestibile con `astro dev stop|status|logs`) · `npm run build` · `npm run preview`.
>
> ### Prossimo passo, in ordine
> 1. Le **11 pagine one-off**: homepage, storia, team, lavora-con-noi, contatti,
>    hub servizi, hub lavori, preventivo, 2 legal, archivio blog. Serve estenderne
>    l'estrazione: `extract-content.js` copre i 4 tipi a template, non le one-off.
> 2. Gli archivi **`type_stores`** (5 rotte): sono pagine con contenuto proprio,
>    non semplici elenchi. `/type_stores/showroom-cat/` nell'originale pesa 56 MB.
> 3. I **6 form** (`95` contatti, `467` newsletter footer, `1548` preventivo,
>    `775` lavora-con-noi **con allegato**, `4473` e `4395` landing). Sono le
>    ultime parole che mancano nel diff del fingerprint.
> 4. Confronto visivo pagina per pagina contro `shots-000-live-originale`.
> 5. Redirect 301 dai 56 URL indicizzati, poi deploy Coolify e cutover DNS.
>
> ### Decisione strategica presa
> Il sito **non** va messo online come mirror statico. Va **ricostruito in Astro** (perché
> l'editor interno **Tharvel** si monta sopra siti Astro, su `/tharveladmin`) e poi hostato
> su Coolify sulla VPS OVH. Il mirror resta **strumento di misura e riferimento, non prodotto**:
> vedi "Ricostruzione in Astro + Tharvel". Le patch CSS sul mirror **non sopravvivono** al rebuild;
> hanno valore solo come diagnosi e come decisione di comportamento.
>
> ### Stato del mirror: 2 PATCH APPLICATE (non è più lo stato originale)
> - `_migrazione/patches/001-hero-responsive.py` — hero non più tagliato (era 176px a 1440px)
> - `_migrazione/patches/002-hero-gutter.py` — hero a 60px dal bordo del riquadro
> - Entrambe idempotenti, con backup e `--revert`. Dettagli e misure in `_migrazione/CHANGELOG.md`.
> - Lo stato **originale** del sito live è conservato in `_migrazione/baseline/shots-000-live-originale/`
>   e `_migrazione/baseline/fingerprint-mirror.json` — non sovrascriverli mai.
>
> ### Deciso di NON fare
> - **Niente altre patch sul mirror.** Producono lavoro che si butta.
> - **Niente sweep dei difetti di layout** sul mirror: in Astro spariscono da sé.
> - **Niente pre-conversione delle immagini in WebP.** Ad Astro vanno dati gli originali,
>   `astro:assets` genera WebP/AVIF e gli `srcset`. Pre-comprimere = perdita di qualità doppia.
> - I **form** non sono un problema: il proprietario li rifà con EmailJS o Klaviyo.
>   **Eccezione:** il form `775` di `/lavora-con-noi/` ha un upload file (curriculum) —
>   EmailJS non va bene per gli allegati, serve altro.
>
> ### Cosa sopravvive al rebuild (lavoro che si tiene)
> Testi riscritti · meta description / title / H1 · `alt` delle immagini (594 mancanti) ·
> mappa rotte e redirect 301 · scelte sulle landing e sulle offerte scadute · baseline e
> fingerprint · decisioni di comportamento (es. "hero a 60px dal bordo, font fluido").
>
> ### Cosa è già ricostruito
> **34 rotte**: 8 servizi · 7 realizzazioni · 5 store · 8 articoli · 3 archivi
> `cat_realizzazioni` · archivio blog · pagina di controllo · segnaposto homepage.
> Contenuti in 4 content collections (28 voci, 5.037 parole) generate da
> `_migrazione/extract-content.js`. Fedeltà verificata con `fingerprint.py diff`:
> sulle 33 rotte confrontabili il conteggio parole di store e realizzazioni è
> **identico**, e le uniche parole davvero mancanti sono l'etichetta privacy dei
> form. Peso reale misurato: la pagina store da **28,9 MB a 0,60 MB**.
>
> ### Passi 1, 2 e 3 — fatti
> Scaffold + design system dai token misurati · i 4 componenti (`Carousel`, `Gallery`
> con lightbox, `Counter`, `Accordion`) — 2,9 KB di JS in tutto, zero librerie, nessuna
> icon font (SVG in linea) · `Hero` e `Titoletto`, con il contenitore rifatto
> proporzionale invece che a gradini Bootstrap.
> Dettagli e verifiche: CHANGELOG voci **A00**, **A01**, **A02**.
>
> ### Indirizzo confermato dal proprietario (2026-09-02)
> «lo scopo è avere il sito **pressoché uguale o molto simile ma migliore, più veloce
> e migliorato da tutti i difetti** del sito WordPress con Elementor; poi una volta
> fatto questo facciamo le modifiche che cerca il cliente.»
>
> Quindi: **i difetti dell'originale si correggono, non si riproducono.** Non serve
> più chiedere conferma per le deviazioni che sistemano un difetto — vanno fatte e
> registrate nel CHANGELOG. Già confermate così: Roboto → Montserrat (default
> Elementor che trapelava su 34 pagine), contenitore proporzionale invece dei gradini
> Bootstrap, archivi di tassonomia filtrati davvero per categoria, un solo `<h1>`
> per pagina, contenuto non più duplicato per desktop e mobile.
>
> Restano **due fasi distinte**: prima la ricostruzione migliorata (questa), poi le
> modifiche volute dal cliente. Non mescolarle.
>
> ### Due fasi, da tenere separate
> **Fase A** ricostruzione 1:1, gate = fingerprint pulito. **Fase B** modifiche volute
> (testi, rotte semplificate, nuove sezioni hero), una alla volta, aggiornando la baseline.
> Motivo: se si mescolano, ogni differenza è ambigua.
>
> ### Da chiedere al cliente (non bloccante, ma prima del cutover)
> Accessi WP admin · **Search Console + GA4** (valgono più dell'admin: dicono quali URL portano
> traffico) · destinatari email dei 6 form · quali landing tenere (`/promo-casa/` ha un'offerta
> **scaduta** ancora indicizzata) · immagini a piena risoluzione dalla media library.
>
> ### Ambiente già pronto
> - Server locale del mirror: `cd costruisciearreda-static/costruisciearreda.it && python3 -m http.server 8080`
>   (gli script di misura si aspettano la porta **8099**)
> - Playwright installato in `_migrazione/` (chromium-headless-shell 1234 in cache).
>   **Gli script di misura vanno eseguiti da `_migrazione/`**: `playwright` sta lì.
> - Script pronti: `fingerprint.py` (ora anche in modo `astro`), `screenshot.js`,
>   `verify-hero.js`, `audit-hero-edges.js`, `harvest-tokens.js`, `harvest-layout.js`,
>   `extract-content.js` (rigenera i contenuti e il modulo immagini),
>   `check-build.js` (cancello di qualità su tutte le rotte del build)
> - Git inizializzato, branch `main`.


## Cos'è questo progetto

Mirror statico (wget) del sito WordPress pubblico **https://costruisciearreda.it**, scaricato
il **2026-09-01**. Non è il codice sorgente del sito: è l'HTML renderizzato + gli asset,
con i link riscritti in forma relativa. Non ci sono PHP, template, database né build system.

Obiettivo dichiarato dal proprietario: **ottimizzare questa copia statica e apportare
modifiche mirate, poi hostarla su Coolify (VPS OVH) e farci puntare il dominio.**

### Layout su disco

```
Costruisci e arreda/
├── CLAUDE.md                        ← questo file
├── costruisciearreda-static.zip     170 MB — archivio ridondante della cartella sotto
└── costruisciearreda-static/
    ├── README.txt                   istruzioni: python3 -m http.server dalla root del sito
    ├── download.log                 log wget completo (utile per capire cosa è stato scaricato)
    └── costruisciearreda.it/        ← DOCUMENT ROOT (192 MB, 1012 file)
```

Non esiste git, né Dockerfile, né docker-compose, né nginx.conf, né package.json,
né `.htaccess`, né sitemap. Tutto da creare.

---

## Contenuti del sito

Azienda campana (Napoli) di edilizia, arredo bagno, ceramiche e ferramenta: 4 showroom,
punto edile, ferramenta, servizi di progettazione e ristrutturazione.

**Dati aziendali** (dal footer, presenti su tutte le pagine):
- Costruisci & Arreda S.R.L. — P.IVA 08562161219
- Telefono: `tel:+393762024360` · Email pubblica: `shop@costruisciearreda.com`
- Sedi: Showroom Via Martiri della Libertà 11, Napoli · Via San Massimo (Mercury Center), Nola ·
  Ferramenta Corso Ponticelli 28/C, Napoli e Via della Libertà 56, Portici ·
  Punto edile Via Argine 625, Napoli · Uffici Via Gennaro Paparo 74, Massa di Somma
- Social: LinkedIn, Facebook, Instagram · Shop e-commerce **separato**: `costruisciearreda.com`
- Credits tema: Vibgroup

### Mappa pagine (56 pagine reali, escluse feed/duplicati)

| Sezione | Percorso |
|---|---|
| Homepage | `/index.html` (page-id 2) |
| Azienda | `/la-nostra-storia/`, `/il-nostro-team/`, `/lavora-con-noi/`, `/contatti/` |
| Servizi (hub) | `/dalla-progettazione-alla-realizzazione/` (page-id 905, `<title>` = "Servizi") |
| Servizi (8 CPT) | `/services/{sopralluogo-e-rilievo,progetto,rendering,consulenza-finiture,disbrigo-pratiche,direzione-lavori,impianti,certificazioni}/` |
| Realizzazioni (hub) | `/i-nostri-lavori/` (page-id 1398) |
| Realizzazioni (7 CPT) | `/realizzazioni/{home-albe,green-house,wood-e-white,bar-tabacchi,casa-prima-e-dopo,appartamento-moderno-prima-e-dopo,soluzioni-per-la-famiglia}/` |
| Tassonomia realizzazioni | `/cat_realizzazioni/{progetti,render,prima-dopo}/` |
| Store (3 CPT) | `/store/{via-martiri-della-liberta-na,via-martiri-della-liberta-nola-na,via-san-massimo-na}/` |
| Tassonomia store | `/type_stores/{showroom-cat,rivendita-edile,ferramenta,progettazione-e-ristrutturazione-edile,marchi}/` |
| Blog | `/category/ultime-news-e-articoli/` + 8 articoli con slug proprio + archivi `/2024/MM/GG/` |
| Preventivo | `/richiedi-preventivo/` (page-id 1524) |
| Legal | `/privacy-policy/`, `/cookie-policy/` |
| Feed RSS | `*/feed/index.html` (21 file, inutili in statico) |
| Residui WP | `/wp-json/index.html`, `/xmlrpc.php?rsd`, `/robots.txt` |

**Custom post type / tassonomie WP originali:** `services`, `realizzazioni` (tax `cat_realizzazioni`),
`store` (tax `cat_store`, URL `type_stores`).

---

## Stack originale (ciò che il mirror porta con sé)

- WordPress 7.1 · tema **jeansolutions** + child **costruisciarreda-child**
- **Elementor 4.2.4 + Elementor Pro 4.2.2** (kit `elementor-kit-99`) — quasi tutto il layout
- Plugin rilevati (da `/wp-json` namespaces e asset): Yoast SEO 28.3, Contact Form 7 6.1.7,
  CF7 Redirect (wpcf7r), WP Store Locator (wpsl), PixelYourSite Free 11.3.1,
  Iubenda Cookie Solution, Duplicate Post, WP-Optimize (cache `wpo-minify`)
- jQuery 3.7.1 + jquery-migrate + jQuery UI core, Bootstrap, slick.min.js, isotope.js, Swiper 8.4.5

### Terze parti caricate su ogni pagina (5 script esterni + pixel inline)

| Servizio | ID |
|---|---|
| Iubenda cookie solution + autoblocking | siteId `3729690`, cookiePolicyId `19235990` |
| Google Analytics 4 (gtag) | `G-S9GXD41RQP` |
| Meta Pixel | `421449629929560` (+ `facebook-domain-verification` 6bmk01i8l6dbgqqfjhg3ar8omcjb6z) |
| Hotjar | `5089718` |
| MailMunch | site-id `1084818` |
| Google reCAPTCHA v3 | site key `6LeXBiMqAAAAAP2Jf-n7PyBRnM_MKFEU6u8sUlXN` |

### Design tokens

- Colore primario brand: **`#C20E1A`** (rosso). Secondario `#333333`, testo `#7A7A7A`, sfondo `#F5F5F5`.
  `--e-global-color-accent: #61CE70` è un default Elementor mai usato.
- Font reale: **Montserrat** — caricato **due volte** (90 `@font-face` statici self-hosted
  dentro il bundle CSS *e* da `fonts.googleapis.com`).
- **Correzione (2026-09-02, misurata):** era annotato qui che Roboto e Roboto Slab fossero
  default Elementor inutilizzati. Per Roboto è **falso**: `.elementor-widget-text-editor`
  imposta `font-family: var(--e-global-typography-text-font-family)` = Roboto, e quel widget
  è su **34 pagine** — il corpo del testo di quelle pagine è reso in Roboto. Unificare su
  Montserrat nel rebuild è quindi una modifica **visibile**, non neutra. Roboto Slab, invece,
  non è mai reso davvero.
- Secondo rosso `#CA0411` su `/dalla-progettazione-alla-realizzazione/` (colore inline
  Elementor, un solo punto del sito): normalizzare a `#C20E1A`.
- **I bottoni non usano il rosso del brand.** Misurate 6 varianti: l'azione primaria è il
  grigio scuro pieno dei submit dei form (`#333`, 16px/400, padding 10px 30px, raggio 0).
- Icon fonts: Font Awesome 4 (tema padre) + FA 5/6 light/regular/solid/brands (child) + fontello (WPSL).
  **Tre famiglie di icone sovrapposte.**

---

## Peso e performance misurati

### Percorso critico homepage

| Risorsa | Raw | Gzip |
|---|---|---|
| `index.html` | 86,6 KB | 16,1 KB |
| 1 bundle CSS (`wpo-minify-header-*.min.css`) | **685 KB** | 85 KB |
| 26 file JS locali | **790 KB** | 216 KB |
| Immagini referenziate | **3,4 MB** | — |
| + 5 script di terze parti | — | — |

**Totale homepage ≈ 4,5 MB.** Su altre pagine è molto peggio (sotto).

### Immagini — il problema principale

- 667 raster in `wp-content/uploads` per **159 MB**. Di questi **466 "originali" = 148 MB**.
- **Zero WebP/AVIF.** 390 `.jpg` + 253 `.png` + 31 `.jpeg`.
- 110 immagini più larghe di 2000 px servite a piena risoluzione.
- Foto salvate in PNG: `2024/12/COPERTINA-ARTICOLI-{1,2,3}.png` = 1920×1080 per 2,2–2,8 MB **ciascuna**.
  Il record è `2024/08/3.png`, 2160×2160, **5,2 MB**.
- Payload immagini per pagina (byte reali dei file referenziati):

  | Pagina | MB | n. immagini |
  |---|---|---|
  | `type_stores/showroom-cat/` | **56,2** | 139 |
  | `store/via-san-massimo-na/` | 20,0 | 47 |
  | `realizzazioni/wood-e-white/` | 19,4 | 12 |
  | `store/via-martiri-della-liberta-na/` | 19,3 | 48 |
  | `store/via-martiri-della-liberta-nola-na/` | 18,0 | 38 |
  | `realizzazioni/home-albe/` | 14,5 | 61 |

- Sui 1608 tag `<img>` del sito: **969 senza `width`/`height`** (→ CLS), **594 senza `alt`**
  (→ accessibilità + SEO), solo 321 con `loading="lazy"`, solo 328 con `srcset`.
  Più 119 `background-image: url(...)` inline (non lazy-abili, non responsive).

### CSS — cache inutilizzabile

WP-Optimize ha generato **22 bundle header distinti da ~700 KB ciascuno** (15 MB totali in
`wp-content/cache/wpo-minify/1788241814/`), uno per combinazione di dipendenze di pagina.
Navigando fra sezioni il browser **riscarica 700 KB di CSS** invece di riusare la cache.
Ogni bundle contiene tutto insieme: Elementor (2384 occorrenze), WP Store Locator (406),
CF7 (151), slick (104), Bootstrap, 3 icon font, Montserrat.

### JS ridondante o morto

- `wp-content/plugins/pixelyoursite/dist/scripts/`: `public.js` 182 KB + `tld.min.js` 138 KB = **320 KB
  solo per il tracking**, in aggiunta a gtag, Meta Pixel, Hotjar e MailMunch.
- `swiper.min.js` 140 KB **e** `slick.min.js` 42 KB: due librerie carousel.
- `isotope.js` 35 KB caricato ovunque, usato dai soli filtri realizzazioni.
- `bootstrap.min.js` 36 KB: nel markup si usano solo le utility CSS `d-*`/`row`/`col-*`, non i componenti JS.
- `jquery-migrate` 13 KB e `wp-polyfill` 29 KB: puro debito legacy.
- **`themes/costruisciarreda-child/js/theme-functions.js` è codice copiato da un altro progetto**
  ("edilcom"): le prime righe fanno branching su `areadev.it` / `vibegotest2.it` / `www.edilcomgru.com`
  e costruiscono path AJAX verso `wp-content/themes/edilcom-child/includes/ajax/*.php`.
  Su costruisciearreda.it `rootPath` resta **undefined**. Da eliminare.
- `contact-form-7` + reCAPTCHA v3 caricati su **tutte** le 56 pagine, non solo dove c'è un form.

---

## Problemi bloccanti da risolvere prima del deploy

### 1. URL `%3F` — la navigazione principale è rotta/inaccettabile

wget ha salvato le pagine anche nella variante `?p=ID` e **il menu punta a quelle**:

```
<a href="index.html%3Fp=100.html">La nostra storia</a>
```

- **9394** riferimenti `%3F` nell'HTML, di cui l'intero menu (Azienda, tutti i Servizi,
  Realizzazioni, Richiedi Preventivo, Privacy, Cookie).
- **2064** riferimenti asset con `%3Fver=` (`jquery.min.js%3Fver=3.7.1`, ecc.).
- 138 file su disco hanno un `?` letterale nel nome.
- Verificato: con `python3 -m http.server` questi URL rispondono **200** (il modulo tronca il path
  su `?` *prima* dell'unquote). **nginx e Caddy decodificano `%3F` durante la normalizzazione
  dell'URI: il comportamento va verificato sull'immagine effettiva usata da Coolify.**
- In ogni caso vanno riscritti: come URL pubblici sono inaccettabili (SEO, canonical, condivisione).

**Buona notizia:** la versione con slug pulito **esiste già su disco per ogni pagina**
(`/la-nostra-storia/`, `/services/progetto/`, …). Il fix è una passata di rewrite dei link +
rinomina degli asset per togliere il query string, poi eliminare i 138 duplicati `?p=`.

Integrità verificata: su 7097 riferimenti locali solo 71 non risolvono, e sono tutti link di
discovery oEmbed (`wp-json/oembed/...`) — irrilevanti.

### 2. URL assoluti verso il sito live

**1709** occorrenze di `https://costruisciearreda.it` restano nell'HTML. Le critiche:

- 180× `https://costruisciearreda.it/wp-admin/admin-ajax.php` (endpoint Elementor/CF7)
- 90× `https://costruisciearreda.it/wp-json/pys-facebook/v1/event` (PixelYourSite)
- 496× immagini `DSC0*-scaled.jpg` puntate in assoluto sul dominio vecchio
- canonical, `og:url`, JSON-LD Yoast: in parte già riscritti in relativo dal mirror
  (`canonical="index.html%3Fp=100.html"` — **da rigenerare in assoluto sul nuovo dominio**)

Finché il dominio punta al vecchio host questi funzionano; **al cutover diventano loop o 404.**

### 3. Nessun backend: i form non funzionano

Tre form Contact Form 7, tutti con POST verso WordPress + reCAPTCHA:

| Form ID | Dove | Campi |
|---|---|---|
| `1548` | `/richiedi-preventivo/` | nome, cognome, your-email, telefono, citta, company, piva, messaggio, ricontatto, radio-589, privacy |
| `95` | footer di **ogni** pagina (newsletter) | email + privacy |
| `467` | `/contatti/` e altre | nome, cognome, your-email, telefono, company, piva, privacy |

In statico non inviano nulla. Serve una scelta esplicita: endpoint serverless/API, servizio form
esterno, o riportare il sito su WordPress. **Da decidere con il proprietario.**

### 4. SEO e semantica

- **Homepage con 3 `<h1>`** (uno per slide dell'hero: "professionisti del settore",
  "materie prime di qualità", "estetica e funzionalità"), ciascuno sotto un `<h2>` identico
  "Edilizia, design e ferramenta".
- `/dalla-progettazione-alla-realizzazione/`: **9 `<h1>`** (uno per card servizio).
  `/category/ultime-news-e-articoli/`: 7 `<h1>`.
- **17 pagine senza nessun `<h1>`**, incluse tutte le 7 `/realizzazioni/*` e le legal.
- **Meta description presente solo su 7 pagine** (i soli articoli blog). Assente su homepage,
  servizi, store, realizzazioni, contatti, preventivo.
- Il menu è renderizzato **3 volte** nel DOM di ogni pagina (canvas mobile + header mobile +
  header desktop) → ~250 parole di boilerplate duplicate prima del contenuto reale.
- `robots.txt` attuale contiene solo crawl-delay per Bing/MSN: **nessun riferimento a sitemap**.
  Nessuna sitemap nel mirror (Yoast la generava lato server).
- 21 feed RSS `*/feed/` da rimuovere; contengono `guid` che espongono gli ambienti di sviluppo
  del fornitore (`https://vibegotest2.it/costruisciarreda/`, `http://localhost/costruisciarreda/`).
- Bug visibile: il preloader è `<img class="preloader" src="index.html">` — punta all'HTML,
  quindi è un'immagine rotta che riscarica la pagina.
- `<meta name="viewport" content="... user-scalable=no, maximum-scale=1.0">` — blocca lo zoom,
  fallimento di accessibilità (WCAG 1.4.4).

---

## Piano di ottimizzazione (in ordine di ritorno)

1. **Immagini.** Convertire in WebP/AVIF con fallback, ridimensionare i 110 file >2000 px alle
   dimensioni realmente rese, ricostruire `srcset`/`sizes`, aggiungere `width`/`height` e
   `loading="lazy"` (escluso l'LCP, che va in `fetchpriority="high"`), riscrivere le
   `background-image` inline in `<picture>` dove possibile. Aggiungere gli `alt` mancanti (594).
   *Atteso: 159 MB → 15–25 MB; showroom-cat da 56 MB a <3 MB.*
2. **URL.** Passata di rewrite `%3F` → slug puliti, rinomina asset senza query string,
   eliminazione dei 138 duplicati `?p=`, dei 21 feed e dei residui `wp-json`/`xmlrpc`.
3. **CSS.** Sostituire i 22 bundle da 700 KB con un unico CSS purgato (rimuovere WP Store Locator
   se le mappe non servono, ridurre a **una** icon font, self-hostare solo i pesi Montserrat usati
   ed eliminare il doppio caricamento da Google Fonts). *Atteso: 685 KB → <80 KB.*
4. **JS.** Rimuovere `theme-functions.js` (codice di un altro progetto), `jquery-migrate`,
   `wp-polyfill`, `bootstrap.min.js`, una delle due librerie carousel, `isotope` fuori dalle
   pagine realizzazioni, `admin-ajax` e gli endpoint `wp-json`. Valutare la rimozione di
   PixelYourSite (320 KB) mantenendo gtag + Meta Pixel diretti. Caricare CF7/reCAPTCHA solo
   sulle pagine con form. *Atteso: 790 KB → 100–150 KB.*
5. **Terze parti.** 6 servizi di tracking sono ridondanti: consolidare. Tenerli tutti dietro
   il consenso Iubenda (verificare che l'autoblocking copra gtag, Meta Pixel, Hotjar, MailMunch).
6. **SEO.** Un solo `<h1>` per pagina, `<h1>` sulle 17 pagine che non l'hanno, meta description
   su tutte, canonical assoluti sul nuovo dominio, `og:url`/JSON-LD rigenerati, sitemap.xml,
   `robots.txt` con la sitemap. Ridurre il menu triplicato a un solo markup responsive.
7. **Accessibilità.** Rimuovere `user-scalable=no`/`maximum-scale`, sistemare il preloader rotto,
   verificare il contrasto del rosso `#C20E1A` su bianco per il testo piccolo.
8. **Form.** Implementare la soluzione scelta al punto 3 dei bloccanti.

---

---

## Ricostruzione in Astro + Tharvel (valutazione)

Domanda posta dal proprietario: senza il sorgente WordPress/Elementor, ricostruire il sito nel
nostro stack (Astro + editor **Tharvel**) è complesso?

**Risposta breve: no, ed è la strada migliore.** L'HTML renderizzato *è* una specifica completa
dell'output: testi, immagini, struttura e stili sono tutti recuperabili. Del sorgente WordPress
mancano solo tre cose — workflow di editing, backend dei form, data model dei CPT — e tutte e tre
andrebbero comunque rifatte da zero nel nostro stack. Non sono una perdita.

Il mirror statico invece dà un sito **hostabile ma non modificabile**: markup generato da Elementor
con class-soup, 22 bundle CSS da 700 KB, nessuna fonte di verità. Ogni "piccola modifica" diventa
editing a mano di HTML minificato su 56 file. Tharvel non ci può lavorare sopra.

### Quanto lavoro è davvero (misurato)

**Contenuto totale del sito: 14.744 parole** (menu esclusi) = ~10 pagine A4. 15 pagine su 55
hanno meno di 120 parole. **476 immagini** originali distinte effettivamente referenziate.

Similarità strutturale misurata per gruppo di pagine (sequenza di widget/blocchi):

| Gruppo | Pagine | Similarità | Conseguenza |
|---|---|---|---|
| `/services/*` | 8 | **100%** | 1 template + 8 record di contenuto |
| `/store/*` | 3 | **100%** | 1 template + 3 record |
| `/realizzazioni/*` | 7 | 95% | 1 template + 7 record |
| Articoli blog | 8 | 92% | 1 template + 8 markdown |
| Archivi tassonomia | 8 | 55% | 1 template + varianti |
| Pagine one-off | 11 | — | homepage, storia, team, lavora-con-noi, contatti, hub servizi, hub lavori, preventivo, 2 legal, archivio blog |

**Totale: ~5 template + 11 pagine one-off.** In Astro: 5 layout + 3 content collections
(`services`, `realizzazioni`, `posts`) + 11 pagine `.astro`.

### Inventario componenti (19 tipi di widget Elementor, ma solo 4 sono componenti veri)

`image` (224), `heading` (180), `text-editor` (83), `theme-post-title` (64), `button` (52),
`theme-post-featured-image` (49), `shortcode` (38, = form CF7), `post-info` (22) — tutto markup banale.

Componenti con logica da reimplementare, **con l'uso reale verificato**:

| Componente | Pagine dove è usato | Note |
|---|---|---|
| Carousel | 11 (Swiper via Elementor) + 2 (slick) | un solo componente copre entrambi |
| Gallery / lightbox | 10 | |
| Counter animato | **2** (`index.html`, `la-nostra-storia`) | |
| Accordion | **1** | |
| Form | 3 (preventivo, newsletter footer, contatti) | serve backend |

**Il "prima/dopo" non è uno slider interattivo**: è solo la tassonomia `cat_realizzazioni-prima-dopo`,
gallerie di foto affiancate. Nessun componente speciale.

**JS morto confermato:** `isotope.js` (35 KB) è caricato su **54 pagine con ZERO inizializzazioni**.
`slick.min.js` (42 KB) è caricato su tutte le 54 pagine ma inizializzato su **2**.

### L'unico costo reale

**Non si porta il CSS di Elementor: si reimplementa.** Il bundle da 685 KB contiene 2384 occorrenze
di selettori Elementor legati a class-name generati (`elementor-element-a1b2c3`) che fuori da
Elementor non significano nulla. Va riscritto il design da zero — fattibile perché il design è
semplice: Montserrat, rosso `#C20E1A`, card, carousel, gallerie. Stimabile in <80 KB di CSS.

La resa non sarà pixel-perfect al primo colpo: serve un confronto visivo pagina per pagina
contro il mirror (che resta il riferimento). Questo è il vero lavoro, non l'estrazione dei contenuti.

### Vantaggi collaterali della ricostruzione

Tutti i problemi elencati sopra si risolvono **nativamente** invece che con patch sul mirror:
un solo `<h1>`, meta description per pagina, canonical corretti, sitemap generata da Astro,
immagini via `astro:assets` (WebP/AVIF + `srcset` + dimensioni automatiche), zero URL `%3F`,
zero URL assoluti al vecchio dominio, menu una volta sola nel DOM, niente jQuery/Bootstrap/
isotope/slick/PixelYourSite. E il sito diventa editabile da Tharvel su `/tharveladmin`.

### Se si ottiene l'accesso a WordPress admin

**Dove vive davvero il contenuto** (verificato sul mirror): solo **8 pagine su 55** — i post del blog —
usano `post_content`. Le altre sono **22 layout Elementor** + Theme Builder (9 template `archive`,
26 `single`), quindi il contenuto sta in `_elementor_data` (JSON in postmeta), non in `post_content`.
Un export WordPress "normale" restituisce quindi pagine **vuote**: va letto il postmeta.

Buona notizia: `_elementor_data` è un albero strutturato (sezioni → colonne → widget + settings),
quindi è una fonte **migliore** dell'HTML renderizzato. Con soli 19 tipi di widget, un convertitore
Elementor-JSON → componente Astro è deterministico e scrivibile una volta sola.

**Cosa l'admin dà e il mirror non può dare** (in ordine di importanza):

1. **Config dei 3 form CF7** — destinatario email, corpo del messaggio, campi obbligatori, redirect
   post-invio (plugin wpcf7-redirect). Dal mirror si vedono i nomi dei campi ma **non dove finiscono
   i dati**. È il solo modo di chiudere il bloccante "form".
2. **Media library** — originali a piena risoluzione + `alt`/caption/title. Chiarisce se i 594 `<img>`
   senza alt sono vuoti in libreria o è Elementor che non li stampa.
3. **Config Yoast** — title template, meta description, focus keyword, `sitemap_index.xml`, redirect.
   Chiarisce se le 49 meta description mancanti sono assenti davvero.
4. **Schema CPT / ACF** — quali campi hanno `services`, `realizzazioni`, `store` (indirizzo, orari,
   telefono, gallery). Dal mirror si deduce dal rendering; dall'admin si legge.
5. **Elementor Site Settings (kit export)** — token globali di colore/tipografia/breakpoint in JSON.
6. **Contenuti non linkati** — bozze, pagine orfane, media non referenziati.

**Cosa NON cambia:** i 5 template, i 4 componenti e la reimplementazione del CSS restano identici.
Sono il grosso del lavoro. L'admin non rende la migrazione *più veloce*, la rende **più affidabile**
e sblocca i punti sopra.

**Checklist di estrazione (l'accesso ha una scadenza: fare tutto prima del cutover):**

- `Strumenti → Esporta` → WXR completo (include i postmeta, quindi `_elementor_data` e `_yoast_wpseo_*`)
- REST API autenticata: `/wp-json/wp/v2/{pages,posts,services,realizzazioni,store}?per_page=100&context=edit&_embed`
- `Elementor → Strumenti / Template` → export dei template Theme Builder + export del kit (Site Settings)
- CF7: per ognuno dei 3 form, screenshot/copia dei tab **Form**, **Mail**, **Messaggi** + settings del redirect
- Yoast: `sitemap_index.xml` + elenco URL indicizzati
- Media library completa (o almeno le 476 immagini usate) con alt e caption
- Elenco plugin attivi con versione, per sapere cosa va replicato

**Attenzione:** non installare plugin sul sito live del cliente senza autorizzazione esplicita.
L'estrazione va fatta in sola lettura.

### Cosa NON è recuperabile dal mirror (da rifare comunque)

1. **Backend form** — decisione aperta (vedi bloccante 3).
2. **Sitemap Yoast** (`sitemap_index.xml`) e lista URL indicizzati: **scaricarli dal sito live
   prima del cutover** per costruire la mappa dei redirect 301.
3. **Immagini a risoluzione piena** non referenziate in nessuna pagina: se servono, prenderle
   dalla media library WP prima di dismettere l'hosting.
4. Eventuali contenuti dietro login o non linkati dal frontend pubblico.

### Ordine di lavoro consigliato

1. Scaricare dal live sitemap + URL indicizzati (finestra che si chiude al cutover).
2. Scaffold Astro + design system (token, tipografia, i 4 componenti).
3. Estrarre contenuti in content collections (script one-shot sull'HTML del mirror).
4. I 5 template, poi le 11 pagine one-off, confronto visivo contro il mirror.
5. Pipeline immagini con `astro:assets` sulle 476 immagini reali.
6. Form + SEO + redirect 301.
7. Deploy Coolify + Tharvel, poi cutover DNS.

**Il mirror statico resta utile come riferimento visivo e come archivio dei contenuti — non come
prodotto da mettere online.**

## Hosting su Coolify (VPS OVH)

Da creare da zero. Approccio consigliato:

- **Repo git** con solo `costruisciearreda-static/costruisciearreda.it/` come document root
  (l'HTML statico è ~4 MB; le 159 MB di immagini vanno prima ottimizzate — evitare di
  committare gli originali). Escludere lo zip da 170 MB.
- **Dockerfile** minimale: nginx o Caddy su Alpine che serve la root.
- **Config server:** gzip + brotli, `Cache-Control` lungo con hash sugli asset e breve
  sull'HTML, `try_files $uri $uri/index.html`, pagina 404, header di sicurezza
  (HSTS, X-Content-Type-Options, Referrer-Policy, CSP compatibile con le terze parti sopra).
- **Redirect 301** dal vecchio schema di URL a quello nuovo, se qualcosa era indicizzato
  in forma `?p=ID`.
- **Coolify:** app di tipo Dockerfile/static, dominio con TLS Let's Encrypt automatico.
- **Cutover dominio:** verificare che tutti i punti 1 e 2 dei bloccanti siano risolti *prima* di
  spostare il DNS, altrimenti gli URL assoluti verso il vecchio host creano loop.
- **Prima del cutover** scaricare dal sito live ciò che il mirror non ha: `sitemap_index.xml`
  di Yoast e l'elenco reale degli URL indicizzati, per costruire la mappa dei redirect.

---

## AGGIORNAMENTO 2026-09-01 — il mirror è INCOMPLETO

Scaricata la sitemap Yoast dal sito live (`_migrazione/live-sitemap/`, 56 URL) e confrontata col mirror.
**44 URL in comune, 12 presenti nel live e assenti dal mirror, 11 nel mirror e non in sitemap.**

wget ha seguito solo i link della navigazione pubblica, quindi ha perso tutte le pagine
non in menu — comprese le **landing pubblicitarie**. HTML delle 12 recuperato in
`_migrazione/pagine-mancanti-html/` (solo HTML, **senza asset**: serve un wget mirato).

### Le 12 pagine mancanti (tutte verificate HTTP 200)

| URL | page-id | Cos'è |
|---|---|---|
| `/promo-casa/` | 4474 | **landing pubblicitaria** con form CF7 `4473` |
| `/soluzione-ceramiche/` | 4392 | **landing pubblicitaria** con form CF7 `4395` |
| `/richiedi-preventivo-2/` | 110 | duplicato di `/richiedi-preventivo/` |
| `/preventivo-thankyou/` | 1562 | thank-you (target redirect CF7) |
| `/newsletter-thankyou/` | 4631 | thank-you |
| `/thankyou-promo-6500/` | 4540 | thank-you della landing promo |
| `/thankyou-progetta-gli-spazi/` | 4488 | thank-you della landing ceramiche |
| `/services/` `/realizzazioni/` `/store/` | — | root archivio CPT, titoli Yoast generici "Archivi: …", 2 `<h1>` |
| `/store/via-argine-625-80147-napoli-na/` + `-2/` | — | **il Punto edile di Via Argine**, presente nel footer ma mai linkato. Due copie identiche |

### Conseguenze da recepire nelle sezioni sopra

- **I form sono 5, non 3.** Oltre a `1548` (preventivo), `95` (newsletter footer) e `467` (contatti),
  esistono `4473` (promo-casa) e `4395` (soluzione-ceramiche).
- **Le 4 thank-you page sono `index, follow`**: vanno in `noindex`. Ora sono indicizzabili.
- **Contenuto duplicato indicizzato:** `/richiedi-preventivo/` vs `/richiedi-preventivo-2/`, e le due
  copie di Via Argine. Serve canonical o 301 nella nuova struttura.
- Le 3 root archivio CPT sono pagine thin con `<h1>` doppio: nel rebuild o si progettano davvero
  o si mettono in `noindex`.
- 8 archivi data `/2024/MM/GG/` e `/feed/` sono nel mirror ma **fuori sitemap**: da non replicare.
- `/type_stores/ferramenta/` e `/type_stores/marchi/` sono nel mirror ma **fuori sitemap**:
  verificare se sono volutamente escluse.

### Lezione operativa

Il mirror non è una fonte affidabile di *completezza*, solo di *resa visiva*. La sitemap del live è
l'unico inventario autorevole degli URL — ed è disponibile **senza credenziali**, ma solo fino al cutover.

---

## Mirror completato + baseline di fedeltà (2026-09-01)

### Mirror

Le 12 pagine mancanti sono state scaricate con gli asset:
`wget --input-file=_migrazione/url-mancanti.txt -p -E -k -N -P costruisciearreda-static`

- **1012 → 1045 file, 192 → 201 MB**
- **56/56 URL della sitemap ora coperti** (67 pagine totali col resto)
- 374 link locali nelle pagine nuove, **0 rotti**
- 428 link nelle pagine nuove restano assoluti verso il live: `--convert-links` riscrive solo
  ciò che scarica nella stessa sessione. Irrilevante per un mirror di riferimento.

**4 asset 404 — sono bug del sito in produzione, non del mirror:**
`linea.png` (**referenziato 24 volte nell'HTML, 404 sul live**), `over-tooltip.png`,
e i due SVG font legacy (`fontello.svg?…`, `fontawesome-webfont.svg?v=4.7.0`). Nel rebuild
`linea.png` va sostituito con un divider CSS.

### I form sono 6 (non 3, non 5)

| ID | Pagina | Note |
|---|---|---|
| `95` | footer di 26 pagine | newsletter |
| `467` | 26 pagine | contatti |
| `1548` | `/richiedi-preventivo/` | preventivo completo |
| `775` | `/lavora-con-noi/` | **con upload file `curriculum`** |
| `4473` | `/promo-casa/` | landing |
| `4395` | `/soluzione-ceramiche/` | landing |

**Attenzione EmailJS:** 5 form su 6 sono banali, ma il `775` ha un allegato (CV). EmailJS gestisce
male gli allegati (limite dimensione, base64). Serve una soluzione diversa per quel form:
storage + link, o un endpoint dedicato.

### Contenuti stantii scoperti (decisioni di prodotto, non tecniche)

- **`/promo-casa/`**: offerta "€166 al mese per 48 mesi, **valida fino al 31 Dicembre**,
  Showroom di Nola" con listino dettagliato. Scaduta, ancora live e `index, follow`.
- **`/richiedi-preventivo-2/`**: 226 parole, **nessun form**, solo il carosello news.
  Pagina vuota indicizzata, duplicato di `/richiedi-preventivo/`.
- Footer delle landing con social diversi dal resto del sito (X e YouTube invece di LinkedIn).
- Le 4 thank-you page sono indicizzabili.

Da chiedere al cliente: quali landing tenere, quali offerte sono ancora valide.

### Baseline di fedeltà — come si dimostra che il rebuild è identico

Due controlli complementari in `_migrazione/`, entrambi rieseguibili sul build Astro.

**1. Impronta di contenuto** — `fingerprint.py` (nessuna dipendenza)

Per ogni pagina estrae: title, meta description, lista `<h1>`, outline completo degli heading,
testo normalizzato, conteggio parole, lista immagini (thumbnail ricondotte all'originale),
numero link, form. Baseline: `baseline/fingerprint-mirror.json` — 67 pagine, 21.627 parole,
480 heading, 466 immagini.

```bash
python3 _migrazione/fingerprint.py mirror > _migrazione/baseline/fingerprint-astro.json
python3 _migrazione/fingerprint.py diff baseline/fingerprint-mirror.json baseline/fingerprint-astro.json
```

Il diff segnala: pagine perse, title/h1 cambiati, scostamento parole >5%, parole assenti,
immagini assenti, heading assenti. **Questo prende la perdita di contenuto, che lo screenshot non
mostra** (un paragrafo mancante in fondo pagina è invisibile a occhio).

**2. Baseline visiva** — `screenshot.js` (Playwright)

132 screenshot full-page (66 rotte × desktop 1440 + mobile 390) in `baseline/shots-mirror/`, 101 MB.
Tracker bloccati, animazioni disattivate, lazy-load forzato con auto-scroll → output deterministico.

```bash
cd costruisciearreda-static/costruisciearreda.it && python3 -m http.server 8099   # mirror
node _migrazione/screenshot.js http://127.0.0.1:8099 baseline/shots-mirror
node _migrazione/screenshot.js http://localhost:4321 baseline/shots-astro          # build Astro
```

`baseline/routes.txt` è l'elenco delle rotte: **va aggiornato quando le rotte cambiano**
(vedi "semplificare le rotte" sotto).

### Le due fasi — tenerle separate

Il rischio è fare rebuild e restyling insieme: a quel punto ogni differenza è ambigua,
non sai se è un bug o una scelta.

**Fase A — ricostruzione 1:1.** Nessuna modifica di contenuto o layout. Gate di uscita:
`fingerprint diff` pulito + confronto visivo pagina per pagina. Da qui in poi la fedeltà è
*dimostrata*, non sperata.

**Fase B — modifiche volute.** Sopra la fase A, una alla volta e tracciate:
riscrittura testi, semplificazione rotte, nuove sezioni hero. Ogni modifica **aggiorna la baseline**
con una nota del perché. Così il diff resta uno strumento utile invece di rumore.

**Vincolo sulla semplificazione delle rotte:** i 56 URL in `_migrazione/live-sitemap/all-urls.txt`
sono indicizzati. Ogni rotta accorpata o rinominata richiede un **301** dal vecchio URL.
La mappa dei redirect va costruita da quel file, non a memoria.

---

## Flusso di modifica — validato sulla patch 001

Il flusso è stato provato end-to-end su un bug reale (hero tagliato). Sei passi:

1. **Localizzare la causa nel CSS**, non nel markup. I selettori sono nel bundle
   `wp-content/cache/wpo-minify/1788241814/assets/wpo-minify-header-*.min.css`.
2. **Contare l'ambito**: quante pagine e quanti bundle. Una regola sta in **tutti i 29
   bundle** — modificarne uno non basta e non si vede subito.
3. **Scrivere una patch script idempotente** in `_migrazione/patches/`, con backup e
   `--revert`. Mai editare a mano un bundle minificato da 700 KB.
4. **Misurare, non guardare**: uno script Playwright che legge i valori calcolati
   (`getBoundingClientRect`, `getComputedStyle`) a più larghezze. `_migrazione/verify-hero.js`
   è il modello.
5. **Prova visiva prima/dopo** sfruttando `--revert` per catturare i due stati.
6. **`fingerprint.py diff`** per dimostrare che non è cambiato il contenuto.
7. **Registrare in `_migrazione/CHANGELOG.md`** con causa, fix, misure e la nota
   "da riportare nel rebuild".

**Nota importante:** una modifica al mirror serve a validare la diagnosi e a decidere il
comportamento voluto, **non a produrre l'artefatto finale**. Ogni patch chiude con una nota
su come va implementata in Astro. Il mirror resta un banco di prova.

**Lezione sui viewport:** il bug viveva a 769–1450px e la baseline con soli desktop 1440 +
mobile 390 lo mostrava per caso. `screenshot.js` ora cattura anche **tablet 900px**.

### Baseline: convenzione

- `baseline/shots-000-live-originale/` — record **intatto** del sito live al 2026-09-01.
  Non sovrascriverlo mai: è il riferimento che distingue un bug di ricostruzione da una scelta.
- `baseline/fingerprint-mirror.json` — impronta di contenuto, stessa data.
- `baseline/hero-check/` — prove prima/dopo della patch 001.
- Ogni patch successiva produce le proprie prove, non tocca la 000.

## Convenzioni di lavoro

- Il sito è **in italiano**: contenuti, `lang="it-IT"`, fuso `Europe/Rome`. Ogni testo nuovo in italiano.
- Prima di modifiche di massa sull'HTML, **fare un backup** o lavorare in git: non esiste sorgente
  da cui rigenerare il mirror (il sito live può cambiare).
- Per verificare in locale: `cd costruisciearreda-static/costruisciearreda.it && python3 -m http.server 8080`.
  Attenzione: `http.server` è **più permissivo** di nginx sugli URL `%3F` — un test verde qui
  non garantisce che funzioni in produzione.
- Gli script di analisi/ottimizzazione one-shot vanno nella scratchpad, non nel repo del sito.
