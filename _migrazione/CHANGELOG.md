# Changelog modifiche al mirror

Ogni modifica volontaria al sito va registrata qui. La baseline
`baseline/shots-000-live-originale/` è il record intatto di come appariva il sito live
al 2026-09-01 e **non va sovrascritta**: serve a distinguere per sempre un bug
di ricostruzione da una scelta.

---

## 001 — Hero pagine interne: titolo tagliato a sinistra
**2026-09-01 · fase B (modifica voluta) · 49 pagine, 29 bundle CSS**

Script: `patches/001-hero-responsive.py` (idempotente, `--revert` per annullare)
Backup: `patches/backup-001/`
Prove: `baseline/hero-check/{prima,dopo}-{768,900,1100,1280,1440,1920}.png`

### Causa
`.boxSlider .singleImage .wrapper .infoImg { left: -15% }` spinge il blocco fuori dal
container per un effetto bleed voluto, ma il genitore ha `overflow:hidden` e `margin`
laterale di 54px. Sopra i 768px non esisteva alcun correttivo, quindi il testo veniva
tranciato. Concausa: `.title { font-size: 80px }` fisso, che da solo eccede il container
sotto i ~1400px. Sotto i 768px un correttivo esisteva già (`left:0`, `font-size:30px`):
**il bug viveva nella fascia 769px–1450px, cioè tutti i desktop e i tablet.**

### Fix
1. `left: max(-15%, calc((100% - 100vw + 108px)/2))` — mantiene il bleed dove c'è spazio,
   altrimenti si ferma al bordo di `.singleImage`.
2. `font-size: clamp(30px, 5.4vw, 80px)` su entrambe le regole (base e `<=768px`),
   così scompare anche il salto 80px → 30px.

### Misure (pagina `/i-nostri-lavori/`, taglio a sinistra)

| viewport | prima | dopo | font prima → dopo |
|---|---|---|---|
| 768px | nessuno | nessuno | 30 → 41px |
| 900px | **56px tagliati** | nessuno | 80 → 49px |
| 1100px | **112px tagliati** | nessuno | 80 → 59px |
| 1280px | **139px tagliati** | nessuno | 80 → 69px |
| 1440px | **176px tagliati** | nessuno | 80 → 78px |
| 1920px | nessuno | nessuno | 80 → 80px (invariato) |

Mobile invariato fino a 480px (30px). Tra 480 e 768px il titolo ora cresce
gradualmente (32→41px) invece di restare a 30px.

### Verifica contenuto
`fingerprint.py diff` → **nessuna differenza di contenuto**: è una modifica solo visiva.

### Da riportare nel rebuild Astro
Non portare `left:-15%` con `overflow:hidden`. L'hero va costruito con il titolo
vincolato al container e il bleed ottenuto, se lo si vuole, con un offset limitato
(`max()`/`clamp()`) o con un container dedicato più largo.

---

## 002 — Hero: titolo troppo attaccato al bordo del riquadro
**2026-09-01 · fase B (modifica voluta) · 49 pagine, 29 bundle CSS · richiede la 001**

Script: `patches/002-hero-gutter.py` (idempotente, `--revert` riporta allo stato post-001)
Backup: `patches/backup-002/`
Prove: `baseline/hero-check/v2-dopo-*.png` (confronto con `prima-*` e `dopo-*` della 001)

### Causa
La 001 aveva eliminato il taglio limitando l'offset negativo allo spazio disponibile, ma il
limite coincideva **esattamente** con il bordo di `.singleImage`: dove il bleed non entrava,
il titolo finiva a filo del riquadro, senza respiro.
In più la regola `<=768px` valeva `left:0`, cioè 12px dal bordo (solo il padding del container).

### Fix
```css
/* >768px: limite inferiore con margine di sicurezza di 60px */
left: max(-15%, calc((100% - 100vw + 108px)/2 + 60px));
/* <=768px: da left:0 a left:20px, per non passare da 12px a 60px sul breakpoint */
```

### Misure — distanza del titolo dal bordo del riquadro (`/i-nostri-lavori/`)

| viewport | originale | dopo 001 | dopo 002 | font |
|---|---|---|---|---|
| 360–480px | 12px | 12px | **32px** | 30px |
| 600px | 12px | 12px | **32px** | 32px |
| 768px | 12px | 12px | **32px** | 41px |
| 900px | −56px (tagliato) | 0px (a filo) | **60px** | 49px |
| 1100px | −112px | 0px | **60px** | 59px |
| 1280px | −139px | 0px | **60px** | 69px |
| 1440px | −176px | 0px | **60px** | 78px |
| 1600px | ok | 0px | **60px** | 80px |
| 1920px | ok | 64px | **64px** | 80px |
| 2560px | ok | 384px | **384px** | 80px |

Sopra i ~1700px il bleed originale di −15% resta intatto: il limite è più negativo di −15%,
quindi non entra in gioco.

### Compromesso accettato
Fra ~1024 e ~1600px il container Bootstrap (960/1140/1320px) riempie quasi tutto il riquadro:
non si può avere insieme 60px dal bordo **e** l'allineamento con la colonna di testo del resto
della pagina. In quella fascia il titolo risulta rientrato di 12–48px rispetto al contenuto
sottostante (a 1366 e 1600px invece sporge di 11–38px). Preferito al titolo a filo del bordo.

### Verifica contenuto
`fingerprint.py diff` → nessuna differenza: modifica solo visiva.

### Da riportare nel rebuild Astro
L'hero va costruito con **un solo sistema di spaziatura**: padding orizzontale sul riquadro
dell'hero, non un offset negativo calcolato contro il container Bootstrap. Il bleed, se lo si
vuole tenere, è un `padding-inline` più piccolo sul riquadro, non un `left` negativo — così
la distanza dal bordo è una costante e non il risultato di tre geometrie che si inseguono.

### Osservazione RITIRATA
Avevo annotato che sotto i 768px `bottom:0` facesse toccare il bordo inferiore.
**Falso, verificato con misura.** `bottom` è relativo a `.wrapper`, che a quelle larghezze è
alto 300px dentro un riquadro di 400px: il blocco risulta quindi a **100px** dal bordo inferiore,
non a 0. L'annotazione derivava dalla lettura del CSS, non da una misura.

Audit su tutte le **49 pagine con hero**, a 390 / 900 / 1440px (`baseline/audit-hero-*.json`,
script `audit-hero-edges.js`): **0 pagine con bordo < 16px o ritaglio**.
Minimi osservati: sinistra 32px (mobile) / 60px (tablet e desktop), fondo 100px su tutti.
Nessuna patch 003 necessaria.

---

# Ricostruzione in Astro

Da qui in poi il changelog registra il **rebuild**, non più le patch al mirror.
Il mirror resta congelato con le patch 001 e 002; nessuna patch nuova.

## A00 — Scaffold + design system misurato
**2026-09-02 · fase A · progetto `costruisciearreda-astro/`**

Astro 7.2.10, Node 22.22. `trailingSlash: 'always'` e `build.format: 'directory'`
perché tutti i 56 URL indicizzati dell'originale finiscono con `/`: riprodurli
identici evita 301 inutili al cutover.

### Nuovi strumenti di misura (rieseguibili sul build Astro)

| Script | Cosa produce |
|---|---|
| `_migrazione/harvest-tokens.js` | `baseline/tokens-mirror.json` — tipografia, colori, raggi, ombre, padding di sezione, aggregati **per frequenza pesata** (caratteri di testo per la tipografia, px² di area per i fondi) su 16 pagine × 3 viewport |
| `_migrazione/harvest-layout.js` | `baseline/layout-mirror.json` — geometrie per template: header, riquadro hero e posizione del titolo dentro di esso, contenitori, footer, ritmo verticale, griglie ripetute |

Entrambi bloccano i tracker e leggono `getComputedStyle`/`getBoundingClientRect`:
nessun valore del design system è dedotto leggendo il CSS di Elementor.

### Token misurati che contano

- **Contenitore:** 1320px + 12px di gutter (tema/Bootstrap), 1140px (Elementor).
- **Header:** 101px desktop, 69px mobile, `position: static` (non sticky), fondo trasparente.
- **Hero:** riquadro 750px desktop **e tablet**, 400px mobile. Titolo
  `clamp(30px, 5.4vw, 80px)` peso 300 maiuscolo bianco. Rientro del testo
  misurato: `left:42px` desktop, `left:20px` mobile → 114px e 32px dal bordo.
- **Ritmo di sezione:** 100px sopra e sotto; 150px nelle sezioni ampie.
- **Titoli display:** 50 / 60 / 70px. **Non scalano fra 1440px e 900px**: restano
  fissi e crollano al valore mobile (30 / 30 / 40px) solo sotto i 768px. I `clamp`
  sono tarati perché il massimo sia già raggiunto a 900px — la fascia desktop+tablet
  coincide col mirror, sotto degrada morbido invece di saltare.
- **Colore del testo:** `#333` è il dominante (32.213 caratteri sul campione),
  non `#7A7A7A` (3.301). Il rosso `#C20E1A` è un accento tipografico.
- **Raggi:** solo `3px` e il motivo `0 30px 0 0`, distintivo del sito.

### Deviazioni dichiarate (differenze volute rispetto al mirror)

1. **Un solo font.** L'originale caricava Montserrat **due volte** (90 `@font-face`
   statici self-hosted + `fonts.googleapis.com`), più Roboto e Roboto Slab.
   Qui: Montserrat variable, solo i sottoinsiemi latino e latino esteso, 2 file.
   → **Correzione all'analisi precedente:** era annotato che Roboto fosse un default
   Elementor "mai usato". È **falso**: `.elementor-widget-text-editor` imposta
   `font-family: var(--e-global-typography-text-font-family)` = Roboto, e quel widget
   è presente su **34 pagine**. Il corpo del testo di quelle pagine è reso in Roboto.
   Unificare su Montserrat è quindi una modifica **visibile**, non un'ottimizzazione neutra.
   Roboto Slab invece non è mai reso davvero.
2. **Contenitore fluido invece che a scatti.** Bootstrap dava larghezze a gradini
   (1320px a 1440, 720px a 900). Qui `max-width: 1320px` con gutter costante.
   Conseguenza misurabile: a 900px il contenuto è largo 876px invece di 720px, e il
   titolo hero sta a 54px dal bordo invece di 114px. Ai due estremi (1440 e 390)
   il risultato è **identico al mirror**.
3. **Bottoni consolidati** da 6 varianti a 5 (`solid`, `outline-dark`, `outline-light`,
   `outline-muted`, `text`) × 2 dimensioni. Rilevato misurando: **il rosso del brand
   non è mai usato su un bottone**; l'azione primaria è il grigio scuro pieno dei
   submit dei form (`#333`, 16px/400, padding 10px 30px, raggio 0).
4. **`#CA0411` normalizzato a `#C20E1A`.** Il secondo rosso compare solo su
   `/dalla-progettazione-alla-realizzazione/` (colore inline di Elementor): un incidente.
5. **`user-scalable=no` e `maximum-scale=1.0` rimossi** dal viewport (WCAG 1.4.4).
6. **`description` obbligatoria** nel `BaseLayout`: nessuna pagina può uscire senza
   meta description. Nell'originale mancava su 49 pagine su 56.
7. **Focus visibile** su tutti gli elementi interattivi: l'originale non ne aveva.

### Altri difetti dell'originale trovati misurando

- **Due `<title>` identici su ogni pagina**: uno dal tema, uno da Yoast. HTML non valido.
- **`<html class="" lang="it-IT" class="no-js">`**: attributo `class` duplicato.
- Testo nero puro `#000` mescolato a `#333` senza ragione (8.507 caratteri).

### Peso, per confronto

| | Originale | Astro (scaffold) |
|---|---|---|
| CSS | 685 KB (22 bundle distinti) | **10,3 KB** (3,0 KB gzip), un solo file |
| Font | 90 `@font-face` × 2 caricamenti + Roboto + Roboto Slab | 2 file woff2 (40 + 72 KB), `unicode-range` |
| JS | 790 KB su 26 file | **0 KB** |

### Bug trovati nel mio stesso lavoro, misurando

Vale come promemoria del perché la verifica va fatta nel browser e non a occhio:
1. I primi `clamp` dei titoli display davano 31,5px a 900px invece di 50px —
   il mirror li tiene fissi fino a 768px. Coefficienti `vw` ricalcolati.
2. La pagina `/design-system/` faceva scorrere il documento in orizzontale su
   mobile (scrollWidth 520px su viewport 390px): le tabelle larghe ora stanno in
   un contenitore `.scroll-x`.
3. La variante `outline-light` su fondo scuro era testo bianco su grigio chiaro:
   sul caso `<button>` vinceva il fondo nativo `buttonface` del browser. Aggiunti
   `appearance: none` e `background: transparent` sulla base `.btn`.

### Struttura creata

```
costruisciearreda-astro/
├── astro.config.mjs          site + trailingSlash + sitemap filtrata sui noindex
└── src/
    ├── components/Button.astro
    ├── data/site.ts          dati azienda e sedi, verificati sul footer di 66 pagine
    ├── data/noindex.ts       rotte fuori indice: fonte unica, letta anche dalla sitemap
    ├── layouts/BaseLayout.astro
    ├── pages/index.astro     segnaposto
    ├── pages/design-system/  pagina di controllo dei token (noindex)
    └── styles/{fonts,tokens,base,global}.css
```

### Verifica

Token calcolati nel browser, confrontati con la misura del mirror:

| | 1440px | 900px | 390px |
|---|---|---|---|
| `--t-display-sm` | 50px ✓ | 50px ✓ | 30px ✓ |
| `--t-display` | 60px ✓ | 60px ✓ | 30px ✓ |
| `--t-display-lg` | 70px ✓ | 70px ✓ | 40px ✓ |
| `--hero-title-size` | 77,76px (mirror 77,8) ✓ | 48,6px ✓ | 30px ✓ |
| scorrimento orizzontale | no | no | no |

### Da fare nel passo successivo
I 4 componenti con logica reale (carousel, gallery/lightbox, counter, accordion),
poi l'hero. Il "prima/dopo" non è un componente: è la tassonomia
`cat_realizzazioni-prima-dopo`.

---

## A01 — I 4 componenti con logica reale
**2026-09-02 · fase A**

`Carousel.astro` · `Gallery.astro` (con lightbox) · `Counter.astro` · `Accordion.astro`.
Nessuna libreria: al posto di Swiper (140 KB), slick (42 KB), isotope (35 KB) e del
lightbox di Elementor ci sono **2,9 KB di JS in tutto**, in linea nella pagina.
Ogni componente resta usabile se il JS non parte.

### Configurazione, presa dai `data-settings` di Elementor

Le config non sono state indovinate: `data-settings` è l'attributo dove Elementor
serializza le impostazioni del widget, e in 88 pagine del mirror ce n'è una sola per tipo.

| Widget | Istanze | Config reale |
|---|---|---|
| `image-carousel` | 20 su 8 pagine | autoplay 5000ms · infinite · speed 500ms · pausa su hover e su interazione · **navigazione a punti, nessuna freccia** |
| `loop-carousel` | 3 su 3 pagine | idem + 10px fra le slide, paginazione a bullet |
| `gallery` | 13 su 10 pagine | masonry · gap 10px · lazyload · `link_to: file` · overlay in dissolvenza · colonne 3/2/2 (realizzazioni), 3–4/2/1–2 (store) |
| `counter` | 8 su 2 pagine | durata 2000ms · da 0 · valori 24, 40+, 100, 10 |
| `accordion` | 1 su 1 pagina | 3 voci, la prima aperta all'avvio |

Inventario completo dei widget: 19 tipi, di cui solo questi 4 hanno logica.
`image` 238 · `heading` 192 · `text-editor` 92 · `theme-post-title` 64 · `button` 56 ·
`theme-post-featured-image` 49 · `shortcode` 40 (= form CF7) · `post-info` 22 ·
`image-box` 19 (schede del team) · `icon-list` 18 · `divider` 8 · `search-form` 8 ·
`social-icons` 8 · `loop-grid` 5 (3 colonne desktop / 2 tablet / 1 mobile, paginazione ajax).

### Due bug dell'originale, trovati misurando

1. **Le gallerie degli store sono invisibili a 900px.** Sugli store la gallery è
   duplicata — una versione per desktop, una per mobile — con le classi
   `elementor-hidden-*` messe male: una è `hidden-mobile hidden-tablet`, l'altra
   `hidden-desktop hidden-tablet`. A 900px **nessuna delle due si vede**. Misurato su
   `/store/via-san-massimo-na/` e `/store/via-martiri-della-liberta-na/`.
   Qui la gallery è una sola con colonne responsive: il problema non può ripresentarsi.
2. **Il contatore mostra `0` finché non si scorre**, e resta a zero se il JS non parte:
   nell'originale il valore finale vive solo nel JavaScript. Qui il numero vero è
   nell'HTML e l'animazione parte da zero — leggibile senza JS e dai motori.

Inoltre: **20 istanze di image-carousel su 20 sono nascoste su desktop** (il contenuto
lì è mostrato come griglia), e 3 di loro sono nascoste a *tutti* i viewport — markup morto
da non riportare.

### Scelte tecniche

- **Carousel:** striscia con `scroll-snap` e `grid-auto-columns` calcolate dalle slide
  per vista. Senza JS scorre già col dito, con la rotella e con la tastiera; il JS
  aggiunge punti, autoplay, pausa su hover/focus/interazione e stop fuori dallo schermo.
  La slide attiva la determina un `IntersectionObserver`, non un contatore nostro:
  così i punti restano giusti anche se l'utente scorre a mano.
- **Gallery:** masonry col multi-colonna CSS (`columns`), zero libreria di
  posizionamento. Conseguenza accettata: l'ordine di lettura scende per colonna
  invece di andare per righe.
- **Lightbox:** `<dialog>` nativo — cattura del focus, chiusura con Esc e sfondo li dà
  il browser. Frecce, click sullo sfondo e ritorno del focus alla miniatura di partenza.
  Ogni gallery ha il proprio dialog legato per id: due gallerie sulla stessa pagina
  non si pestano i piedi.
- **Accordion:** `<details>`/`<summary>` nativi, **zero JS**. L'attributo `name`
  condiviso rende le voci mutuamente esclusive come in Elementor; dove non è supportato
  si possono aprire più voci insieme — peggioramento accettabile. Il titolo resta un
  `<h2>`: cambiarlo altererebbe l'outline degli heading che `fingerprint.py` confronta.
- **Nessuna icon font.** Le tre famiglie sovrapposte dell'originale (Font Awesome 4,
  FA 5/6, fontello) sono sostituite da SVG in linea nei componenti.

### Token aggiunto

`--t-counter: 5rem` (80px). È l'**unica** misura tipografica fissa dell'originale:
il numero del contatore è 80px peso 300 a tutti e tre i viewport, mobile compreso.
Non va reso fluido — inizialmente gli avevo dato `--t-display-lg` (70px): sbagliato,
corretto dopo la misura.

### Verifica nel browser

| | 1440px | 900px | 390px |
|---|---|---|---|
| carousel, slide per vista | 3 | 2 | 1 |
| carousel, punti | 5, l'attivo segue lo scorrimento | idem | idem |
| gallery, colonne | 3 | 2 | 2 |
| gallery, gap | 10px | 10px | 10px |
| contatore | 80px · peso 300 · `#C20E1A` | idem | idem |
| accordion | 3 voci, 1 aperta, `<h2>` 60px | idem | `<h2>` 30px |
| scorrimento orizzontale | no | no | no |
| errori JS in console | nessuno | nessuno | nessuno |

Provato interattivamente: click sul punto 3 → `scrollLeft` 0 → 871 · lightbox apre con
didascalia "(1 di 8)" → freccia destra → "(2 di 8)" → Esc chiude · click sulla 2ª voce
dell'accordion → `[false, true, false]`, quindi l'esclusività funziona · contatori dopo
lo scorrimento → 24, 40, 100, 10.

### Un difetto di Astro da conoscere

Astro **elimina lo spazio** fra testo e tag inline quando il tag va a capo nel sorgente:
`…vengono dai\n<code>data-settings</code>` viene reso `vengono daidata-settings`.
Succedeva in 6 punti della pagina di controllo. Serve uno spazio esplicito `{' '}`
oppure tenere il tag sulla stessa riga. Aggiunto un controllo automatico che cerca
gli inline "incollati" leggendo i nodi di testo nel DOM, riutilizzabile su ogni pagina.

### Da fare nel passo successivo
L'hero, poi l'estrazione dei contenuti in content collections.

---

## A02 — Hero, titoletto e contenitore proporzionale
**2026-09-02 · fase A**

`Hero.astro` · `Titoletto.astro` · nuova regola `.container`.

### Il titoletto: il segno grafico del sito

Nell'originale la classe si chiama `.titolettoBorder`, ma **non ha nessun bordo**:
misurando gli pseudo-elementi si scopre che è uno `::after` di
`width: 400%; left: -300%; height: 1px` — una riga da 1px che passa sotto il titolo,
sfonda tre larghezze verso sinistra (quindi fuori schermo) e si ferma esattamente
dove finisce il titolo. È lo **stesso trucco dell'offset negativo in percentuale**
che ha causato il bug dell'hero corretto dalle patch 001/002.

Varianti misurate: rossa `#C20E1A`, scura `#333`, tenue `#A6A6A6`, bianca sopra le
immagini. Dimensioni: etichetta 23px peso 500; titoli 50px/300, 60px/200, 70px/400.
La variante `.w-130` fa uscire la riga a destra invece che a sinistra.

Qui la riga è `width: calc(100% + (100vw - 100%) / 2)` con `right: 0`: parte dal bordo
sinistro della finestra e finisce dove finisce il testo, senza percentuali negative e
senza `overflow:hidden` che la possa tagliare. Sborda a sinistra dell'area visibile,
che in LTR non produce scorrimento orizzontale — verificato a 12 larghezze.

Il componente si riserva da sé lo spazio della riga (`padding-bottom: 0.6em`): la riga
è posizionata in assoluto, quindi senza quel padding si sovrapporrebbe al contenuto
successivo. Trovato guardando lo screenshot dei campioni.

### Il contenitore, rifatto proporzionale

Bootstrap dava larghezze **a gradini** (1320px sopra i 1400, 1140 sopra i 1200,
960 sopra i 992, 720 sopra i 768): il margine laterale saltava fra 32px e 102px
a denti di sega. La prima versione di `.container` (A00) usava invece un gutter fisso
di 12px, e a 900px il rientro dell'hero risultava 54px contro i 114px misurati.

Nuova regola, una sola riga:
`width: min(100% - 2 * var(--gutter), var(--container-cap, var(--container)))`
con `--gutter: clamp(20px, 5vw, 72px)` e `--container: 1296px` (la larghezza di
**contenuto** misurata a 1440px).

| larghezza | margine mio | margine originale | rientro hero mio | originale |
|---|---|---|---|---|
| 1920 | 312px | **312px** | 354px | — |
| 1440 | 72px | **72px** | **114px** | **114px** |
| 1300 | 65px | 92px | 107px | — |
| 1200 | 60px | 42px | 102px | — |
| 1100 | 55px | 82px | 97px | — |
| 1000 | 50px | 32px | 92px | — |
| 900 | 45px | 102px | 87px | 114px |
| 390 | 20px | 12px | **32px** | **32px** |

Combacia **esatto** dove l'originale è al suo tetto (1440 e 1920) e sul rientro
dell'hero ai due estremi; nella fascia intermedia sta nel mezzo del dente di sega
invece di saltare. **Deviazione dichiarata**: se si volesse la resa a gradini si
cambia solo quella regola in `base.css`.

### L'hero

| | misurato sull'originale | ricostruito |
|---|---|---|
| altezza riquadro | 750px desktop e tablet · 400px mobile | ✓ identico |
| titolo | `clamp(30px, 5.4vw, 80px)` peso 300 maiuscolo bianco | ✓ 77,76 / 48,6 / 30px |
| blocco di testo | 100px dal fondo a tutti i viewport | ✓ 100px a 12 larghezze |
| rientro dal bordo | 114px a 1440 · 32px a 390 | ✓ identico |
| titolo tagliato | 0 dopo le patch 001/002 | ✓ 0 a 12 larghezze |

**Un solo sistema di spaziatura**, come deciso dopo le patch: il testo sta nello stesso
`.container` di tutto il resto più `--hero-inset` come `padding-inline`. Niente `left`
negativo, niente container Bootstrap dentro un `overflow:hidden`.

Differenze volute:
1. **L'immagine è un `<img>`**, non una `background-image` inline. Nell'originale i 119
   fondi inline non erano né responsive né rinviabili; così invece prende `srcset` da
   `astro:assets` e `fetchpriority="high"`, essendo l'elemento LCP.
2. **Velatura in basso** (`scrim`, attiva per default): il testo bianco su una foto
   qualsiasi non garantisce contrasto. Si disattiva con `scrim={false}`.
3. **Il titolo è `h1` per default.** Nell'originale i servizi usano `h1.title` e le
   realizzazioni `h2.title` — ed è per questo che le 7 pagine `/realizzazioni/*` non
   hanno nessun `h1`. Il livello resta configurabile, ma il default giusto è `h1`.
4. **Niente `text-wrap: balance`** sul titolo: le interruzioni di riga sono decise nel
   contenuto (i `<br>` dell'originale) e il bilanciamento automatico le ridistribuiva,
   cambiando il numero di righe. Visto nello screenshot: 3 righe invece di 2.

### Da fare nel passo successivo
Estrazione dei contenuti in content collections (`services`, `realizzazioni`, `posts`)
con uno script sull'HTML del mirror. Poi header e footer, che servono a ogni template.

---

## A03 — Contenuti, header, footer, i 4 template di contenuto e 2 archivi
**2026-09-02 · fase A**

34 rotte costruite su 66. Contenuti estratti in content collections, header e
footer, i template di servizi, realizzazioni, store e articoli, gli archivi del
blog e della tassonomia delle realizzazioni.

### Estrazione dei contenuti

`_migrazione/extract-content.js` legge il **DOM renderizzato** e riconosce i
widget Elementor per **ruolo**, non per posizione, così non si rompe se una
pagina ha un widget in più. Due passate:

1. le 28 voci delle quattro collezioni (`services` 8, `realizzazioni` 7,
   `stores` 5, `posts` 8) → un JSON per voce in `src/content/`;
2. i tre archivi `cat_realizzazioni`, per l'immagine delle **card**, che sulle
   pagine singole non compare: sta solo nel template del loop di Elementor.
   Senza questa passata le card userebbero la prima foto della galleria, che è
   un altro file — il fingerprint lo segnalava come immagine assente.

L'estrazione genera anche `src/lib/immagini-generate.ts` (298 import statici) e
un report con, per ogni voce, **cosa resta da sistemare**: alt mancanti, meta
description da scrivere, immagini hero assenti, testi assenti.

### Difetti dell'originale trovati misurando

| Cosa | Dove |
|---|---|
| Il corpo del testo si vede **due volte** a 900px | tutte le 8 pagine dei servizi |
| Le gallerie **non si vedono affatto** a 900px | le 3 pagine store con galleria |
| `background-image: url('')`: hero bianco vuoto di 750px, titolo bianco su bianco | `/realizzazioni/appartamento-moderno-prima-e-dopo/` |
| **Nessun testo descrittivo**, solo titolo, "DETTAGLI" e galleria | 5 realizzazioni su 7 |
| **Lorem ipsum italiano nell'`og:description`**, pubblicato | `/store/via-argine-625-80147-napoli-na/` |
| I **tre archivi di tassonomia mostrano lo stesso elenco**, che non corrisponde alle categorie assegnate | `/cat_realizzazioni/{progetti,render,prima-dopo}/` |
| `<title>` senza il nome del sito, a differenza di tutte le altre pagine | gli 8 articoli del blog |
| Gli `alt` delle gallerie sono il **nome del file** (`DSC03145`), non un alt | 124 immagini su 3 store + realizzazioni |
| Link morto verso `#` | "Company profile" nel footer |

I primi due difetti hanno la **stessa causa**: l'originale duplica il contenuto
per desktop e per mobile e nasconde una copia con le classi `elementor-hidden-*`,
ma la fascia tablet non è coperta. Nel rebuild i duplicati sono uniti e la resa
è responsive: entrambi i difetti non possono ripresentarsi.

### Header e footer

Il menu sta nel DOM **una volta** invece di tre (l'originale ha tre `<nav>` con
lo stesso `id="menuContainer"`: HTML non valido, più ~250 parole duplicate prima
del contenuto di ogni pagina). Gli href, che nell'originale puntano alla forma
rotta `index.html%3Fp=976.html`, sono risolti in slug puliti con una mappa
page-id → URL costruita dalle classi del `<body>` (45 id, nessun conflitto,
tutti i 15 id del menu risolti).

| | 1440px | 992–1280px | 390px |
|---|---|---|---|
| header, originale | 101px | **145px, menu su 3 righe** | 69px |
| header, rebuild | **101px** | 101–105px, 1–2 righe | **69px** |

Sotto i 992px — il punto di rottura del tema originale — il menu diventa un
pannello laterale con velo, chiusura con Esc, click fuori e blocco dello
scorrimento. Le tre voci con sottomenu erano link a `pagina#`: sono diventate
bottoni veri con `aria-expanded`.

Correzioni ad annotazioni precedenti: **telefono ed email non sono nel footer**
ma nel blocco "Realizza con noi il tuo progetto" sopra di esso; il form
newsletter del footer è il **CF7 467**, non il 95 (il 95 è quello del blocco
contatti).

### Immagini: perché serve una potatura del build

Le immagini dei contenuti si risolvono per percorso a runtime, quindi il modulo
generato le importa **tutte** in modo statico. Vite emette ogni asset importato
staticamente, anche quando la pagina usa solo le versioni ottimizzate prodotte da
`astro:assets`: misurato, **289 originali non referenziati in `dist`, 124,6 MB**
di peso morto. Un `import.meta.glob` eager sulla cartella è peggio: tira dentro
tutte le 668 immagini del mirror.

`scripts/prune-assets.mjs` (dentro `npm run build`) raccoglie i nomi citati da
qualunque file di testo del build e rimuove il resto. Il criterio è verificabile
e c'è `--dry-run`. Risultato: `dist` da **126 MB a 692 KB** con i soli servizi,
e le immagini restano un solo file nel repo, dentro il mirror, raggiunte da
`src/assets/uploads` che è un **collegamento simbolico**.

### Peso reale misurato nel browser

Byte effettivamente trasferiti a 1440px, con lo scorrimento completo della pagina
per innescare il lazy-load, tracker bloccati su entrambi i lati:

| rotta | mirror | rebuild | |
|---|---|---|---|
| `/store/via-san-massimo-na/` | **28,94 MB** · 141 richieste | **0,60 MB** · 28 richieste | −98% |
| `/gres-costruisciearreda-consigli/` | 3,91 MB · 43 | 0,18 MB · 6 | −95% |
| `/realizzazioni/home-albe/` | 2,65 MB · 53 | 0,61 MB · 21 | −77% |
| `/services/progetto/` | 2,35 MB · 42 | 0,15 MB · 6 | −94% |

Una copertina da 2.889 KB diventa 132 KB in WebP: −95% senza differenza visibile.

### Fedeltà dei contenuti: `fingerprint.py diff`

Aggiunto il modo `astro` (legge `costruisciearreda-astro/dist`) e corrette due
distorsioni della misura che facevano risultare differenze inesistenti:

1. le immagini si confrontano per **stem**, non per nome completo: `astro:assets`
   rinomina `DSC06147-scaled.jpg` in `DSC06147-scaled.HASH_var.webp`, e il
   confronto per nome dava ogni immagine come "assente";
2. il corpo della pagina del mirror parte **dopo l'ultimo `</header>`**, come il
   `<main>` del build: prima includeva la cornice solo da un lato.

Sulle **33 rotte confrontabili**, il diff residuo è:

| differenza | pagine | perché |
|---|---|---|
| `h1` diverso | 25 | **voluto**: un solo `h1` per pagina, ed è il titolo della voce e non il banner generico dell'hero (identico su tutte le 8 pagine dei servizi). Gli articoli non avevano `h1`, l'archivio del blog ne aveva **7** |
| heading assenti | 33 | il titoletto dell'hero non è più un `<h2>` (non è un heading), il titolo dell'articolo è passato da `h2` a `h1`, e l'heading "tags" dell'originale — vuoto — è omesso |
| immagini assenti | 31 | quasi sempre **una sola**: `Raggruppa-1703`, grafica decorativa tolta di proposito |
| parole oltre il 5% | 15 | vedi sotto |
| `title` diverso | 4 | gli archivi: "Progetti **Archivi**" di Yoast sostituito da un titolo vero |

Le differenze di conteggio parole, verificate una per una:

- **servizi (−26%)**: è il **duplicato rimosso**. Confrontando gli insiemi di
  parole, le uniche assenti sono le 6 dell'etichetta privacy del form; il resto
  è la seconda copia dello stesso testo, che l'originale contava due volte.
- **store e realizzazioni**: `146 → 146` e `304 → 304`, conteggio **identico**.
- **archivi di tassonomia (−25%)**: l'originale elenca 6 voci in tutti e tre gli
  archivi, il rebuild filtra davvero per categoria (2 progetti, 4 render, 3
  prima/dopo).
- **`/` homepage**: è ancora il segnaposto, non è fra le pagine ricostruite.
- **`/store/via-argine.../`**: da 46 a 63 parole. L'originale non ha contenuto:
  le 46 parole erano il lorem ipsum dell'`og:description` letto dal `<head>`.

Le uniche parole che mancano davvero su tutte le pagine sono **"Ho letto e
accetto l'informativa sulla privacy"**: l'etichetta della privacy del form
newsletter, che arriva al passo "Form".

### Scelte tecniche

- **Collezioni in JSON** invece di Markdown: i corpi di testo restano HTML
  verbatim, senza passare dal pipeline Markdown che potrebbe alterarli. Siamo in
  fase A, ricostruzione 1:1; normalizzare i contenuti è lavoro di fase B.
- **`description` obbligatoria** nel layout: dove l'originale non l'ha (49 pagine
  su 56) si ricava dal primo paragrafo, e resta segnata come "da scrivere" nel
  report. Nessuna pagina può uscire senza.
- **`<title>` verbatim** dove l'originale non seguiva "titolo - nome sito":
  gli 8 articoli del blog. Il campo `seoTitleCompleto` lo conserva.
- **Componente `Card`** per le griglie degli archivi. Nell'originale il titolo
  della card è un `<h1>`: è per questo che l'archivio del blog ne ha 7 e la
  pagina hub dei servizi 9.
- **Blocco contatti** (`BloccoContatti.astro`) nel layout: sta su ogni pagina
  dell'originale e contiene i recapiti veri.
- Astro 7 deprecata `z` da `astro:content`: zod si importa diretto.

### Da fare nel passo successivo
Le **11 pagine one-off** (homepage per prima), gli archivi `type_stores`, i 6
form, i redirect 301, poi il deploy.
