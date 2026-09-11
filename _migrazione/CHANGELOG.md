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

### Cancello di qualità: `check-build.js`

Nuovo script che passa tutte le rotte del build a tre viewport e verifica, nel
browser, le cose che non devono mai succedere: errori JavaScript, scorrimento
orizzontale della pagina, immagini che non si caricano, `<h1>` diverso da uno,
`<title>`/meta description mancanti, canonical assente o relativo, `alt` non
dichiarato, link interni verso rotte inesistenti. Esce con codice 1 se trova
qualcosa, quindi si può mettere in CI.

Esito: **34 rotte × 3 viewport, nessun problema.** L'unica segnalazione sono i
14 link interni verso le rotte non ancora costruite (le one-off e gli archivi
`type_stores`), che è esattamente il segnale utile in questa fase.

Un falso positivo trovato e corretto nello script stesso: l'`<img>` dentro il
`<dialog>` chiuso del lightbox non ha `src` finché non si clicca una miniatura,
e veniva contata come immagine non caricata.

Griglie degli archivi: 3 colonne da 1025px, 2 da 769px, 1 sotto — i valori
`columns`/`columns_tablet`/`columns_mobile` misurati sui `loop-grid`
dell'originale. Con `auto-fit` a 1440px ne comparivano quattro.

### Da fare nel passo successivo
Le **11 pagine one-off** (homepage per prima), gli archivi `type_stores`, i 6
form, i redirect 301, poi il deploy.

---

## A04 — Homepage, e il difetto peggiore dell'originale
**2026-09-02 · fase A**

### Il difetto: cinque sezioni su sette sono buchi bianchi

Misurando i fondi delle sezioni della homepage con `getComputedStyle` si scopre
che **5 immagini di fondo su 7 non vengono applicate** — né sul mirror né sul
sito live. Le conseguenze sono visibili nella baseline
`shots-000-live-originale/desktop/home.png`:

| sezione | cosa dovrebbe esserci | cosa c'è sul sito live |
|---|---|---|
| **store** | foto di showroom + 3 loghi + titolo | **buco bianco di 700px**: titolo bianco su bianco, tre SVG scuri invisibili, restano solo tre trattini rossi |
| **progetti / render / prima-dopo** | tre riquadri da 700px con foto | **buco bianco di 700px**: tre titoli bianchi su bianco |
| la nostra storia, dal progetto | fondo decorativo | senza fondo (meno grave: il testo è nero e si legge) |

Il fondo è dichiarato nel CSS di Elementor (`background-image:url(...)` sul
selettore dell'elemento) ma il browser non lo applica. Il valore quindi **non è
misurabile**: l'unica fonte è la dichiarazione, e l'estrattore la legge dai 30
bundle CSS del mirror associandola al `data-id` Elementor. È l'unico punto del
progetto dove si legge il CSS invece di misurare, ed è documentato nel codice.

Nel rebuild i fondi si vedono tutti. Le due sezioni che nell'originale erano
buchi ora sono sezioni vere.

### Altri difetti della homepage, corretti

- **3 `<h1>`**, uno per slide dell'hero, ciascuno sotto un `<h2>` identico
  "Edilizia, design e ferramenta". Ora l'`<h1>` è uno: il titolo della prima
  slide. Le altre due slide usano `<p>`, il contenuto è lo stesso.
- **I contatori mostravano `0`** finché non si scorreva la pagina.
- **Nessuna meta description.**
- Tutti i link puntavano a `index.html%3Fp=976.html`.
- I tre loghi degli store avevano `alt=""` pur essendo l'unico contenuto del
  link: ora hanno "Showroom", "Rivendita edile", "Ferramenta".

### Estrazione delle pagine one-off

`_migrazione/extract-pages.js`, nuovo. Le 4 collezioni a template hanno una
struttura fissa; le one-off no, ognuna ha la sua sequenza. Lo script estrae
quindi un **elenco ordinato di blocchi** tipizzati (titolo, testo, immagine,
bottone, contatore, galleria, carousel, elenco, accordion, scheda, form,
riquadri, servizi numerati…), leggendo la pagina a **due larghezze** e unendo
per firma: così il duplicato desktop/mobile dell'originale si scioglie senza
perdere i blocchi che esistono solo in una delle due varianti.

22 pagine estratte: le 11 one-off, le 2 landing, le 4 thank-you, i 5 archivi
`type_stores`.

Due bug trovati nel mio stesso estrattore, entrambi visibili solo guardando il
risultato:
1. la deduplica teneva la **prima** copia incontrata, ma nel DOM dell'originale
   la copia **nascosta** viene spesso prima: la homepage perdeva 9 blocchi, fra
   cui "La nostra storia" e "Dal progetto alla realizzazione". Ora fra due copie
   con la stessa firma vince quella visibile;
2. l'hero della homepage è uno slider slick con 3 slide, non un riquadro solo:
   cercavo `.singleImage` e ne trovavo uno, perdendo due slide su tre.

Inoltre due blocchi della homepage non sono widget Elementor ma markup del tema
(`.listProducts`, la card bianca con i 4 servizi numerati) o contenitori con il
fondo nel CSS (i riquadri): senza estrarli a parte la homepage perdeva altre due
sezioni.

### Componenti nuovi

`HeroSlider` (3 slide, `scroll-snap`, punti, autoplay, un solo `<h1>`) ·
`ServiziNumerati` (la card bianca sovrapposta all'hero, misurata 970×150px) ·
`Riquadri` (i tre riquadri di tassonomia, 700px, con il fondo che ora si vede).

`immagini.ts` ha ora `rotta()`: riscrive gli href dell'originale
(`index.html%3Fp=976.html`, `../../type_stores/showroom-cat/index.html`) in rotte
pulite tramite la mappa page-id → URL. Un href che non si risolve torna `null` e
il link non viene reso: meglio nessun link che un link rotto, e il cancello di
qualità lo segnala.

### Assegnazione delle immagini

Le 5 immagini delle sezioni sono state assegnate **guardandole una per una**:
l'ordine nel DOM non basta. `Raggruppa-1648` è il disegno tecnico di una casa,
`1649` la foto di due professionisti su una tavola di progetto, `1668` il render
di una villa, `1674` la vista dall'alto di un appartamento, `1679` lo showroom.
La prima assegnazione, fatta per posizione, metteva la foto al posto del disegno.

Gli `alt` sono stati scritti di conseguenza: erano tutti vuoti nell'originale.

### Verifica

| | desktop | mobile |
|---|---|---|
| `<h1>` | 1 | 1 |
| slide dell'hero / punti | 3 / 3 | 3 / 3 |
| servizi numerati | 4 | 4 |
| contatori (valore reso) | 24, 40, 100, 10 | idem |
| loghi store | 3 | 3 |
| riquadri **con immagine** | 3 | 3 |
| card news | 3 | 3 |
| link rotti (`#`, `%3F`, `index.html`) | 0 | 0 |
| scorrimento orizzontale | no | no |
| errori JS | nessuno | nessuno |

`check-build.js`: **34 rotte × 3 viewport, nessun problema.**

### Da fare nel passo successivo
Le altre 10 pagine one-off (storia, team, contatti, lavora-con-noi, hub servizi,
hub lavori, preventivo, 2 legal, archivio blog già fatto), i 5 archivi
`type_stores`, i 6 form, i redirect 301.

---

## A05 — Le pagine one-off e gli archivi: 48 rotte su 66
**2026-09-02 · fase A**

Aggiunte le 9 one-off restanti (storia, team, lavora-con-noi, contatti, hub
servizi, hub lavori, preventivo, 2 legal) e i 5 archivi `type_stores`.

### Un renderer di blocchi, non dieci pagine

`Blocco.astro` rende **un** blocco (16 tipi); `Blocchi.astro` li raggruppa in
**sezioni** — una nuova sezione a ogni titolo — e sceglie l'impaginazione dal
contenuto della sezione: griglia per schede e contatori, griglia per più di due
immagini, due colonne quando c'è un'immagine e un testo, colonna leggibile per
il solo testo, larghezza piena per riquadri, gallerie ed elenchi.

Il raggruppamento non è estetica. Reso come elenco piatto, il contenuto di
queste pagine dava risultati assurdi, misurati:

| pagina | prima | dopo |
|---|---|---|
| `/il-nostro-team/` | **27.005px** di altezza, 4 immagini caricate su 20 | 6.282px, 20 su 20 |
| `/la-nostra-storia/` | 17.500px | 7.874px |
| `/dalla-progettazione-alla-realizzazione/` | 26.682px | 17.302px |

Su una pagina da 27.000px il lazy-load non riesce a stare al passo: metà delle
immagini restava vuota. Con `[...pagina].astro` le dieci pagine costano un file
solo, e le decisioni che l'estrazione non può prendere — meta description, testo
dell'`<h1>`, impaginazione — stanno in `src/data/pagine.ts`.

### Altri due blocchi del tema, trovati dal fingerprint

Non sono widget Elementor, quindi il ciclo sui `data-widget_type` non li vedeva.
È stato il `fingerprint diff` a rivelarli, contando le parole:

1. **il carosello delle ultime news** (`.lastPosts`): in fondo a 6 pagine, ~300
   parole a testa. Ricostruito con le card degli articoli, estratto compreso —
   l'originale mostra l'estratto di WordPress, che è di 55 parole;
2. **l'elenco degli store** su `/type_stores/showroom-cat/`: nell'originale è uno
   shortcode che stampa ogni punto vendita **con la galleria completa**, cioè
   **281 immagini in una pagina** (56 MB, la pagina più pesante del sito). Qui
   sono card che rimandano alle pagine store, dove le gallerie già ci sono.

### La mappa delle rotte, generata invece che scritta

`rotta()` risolve gli href dell'originale (`index.html%3Fp=3317.html`) in rotte
pulite. La mappa page-id → rotta era scritta a mano e lasciava buchi: l'elenco
degli showroom non rendeva perché tre id non c'erano. Ora è **generata** dal
mirror leggendo la classe del `<body>` di ogni pagina — 45 voci, in
`src/data/rotte-legacy.ts`. Serve anche ai redirect 301: i vecchi URL `?p=ID`
erano indicizzabili.

### Difetti dell'originale corretti in queste pagine

- **Due `<h1>` sulle legal**: il testo è un embed Iubenda che inietta il proprio
  `<h1>` (più 13 `<h2>` e 2.716 parole). La pagina stampa il suo `<h1>` e uno
  script declassa quello iniettato appena arriva. Prima prova — non stampare il
  nostro — è stata scartata misurando: se l'embed tarda, la pagina resta senza
  titolo, e su mobile succedeva.
- **Titoli e indirizzi con le parole incollate**: "ENTRA IN CONTATTO<br>CON NOI"
  diventava "ENTRA IN CONTATTOCON NOI", e "Via Martiri della Libertà, 11<br>80147"
  diventava "…, 1180147". `textContent` ignora i `<br>`: l'estrattore ora li
  converte in ritorni a capo e chi rende li riporta come `<br>`.
- **Titoli dei riquadri stampati due volte**: comparivano come titoli di sezione
  vuoti ("PROGETTI", "RENDER", "PRIMA/DOPO") *e* dentro i riquadri.
- **Scorrimento orizzontale**: 16px su `/la-nostra-storia/` (un accordion finito
  in una cella di griglia, col titolo da 60px che sfondava) e 46px a 390px su
  `/type_stores/progettazione-e-ristrutturazione-edile/` (il titoletto non
  andava a capo). Entrambi trovati dal cancello di qualità.
- **SVG serviti come fotografie**: le icone dei tipi di punto vendita, rese a
  piena larghezza, diventavano alte 300px. Ora hanno una larghezza da icona.
- Titoli Yoast "Showroom **Archivi**" sostituiti da titoli veri.

### Fedeltà dei contenuti

`fingerprint.py diff` su **47 rotte confrontabili**. Le pagine con scostamento
oltre il 5% sono 27, e le cause sono tutte identificate:

| causa | pagine | |
|---|---|---|
| **etichetta privacy e campi dei form** | 10 pagine con parole mancanti **solo** queste | il form arriva al passo successivo |
| duplicato desktop/mobile rimosso | gli 8 servizi, `/contatti/`, `/type_stores/*` | zero parole mancanti oltre alle precedenti: era testo contato due volte |
| archivi filtrati davvero per categoria | 3 `cat_realizzazioni` | voluto: l'originale elencava 6 voci in tutti e tre |
| più contenuto del mirror (↑) | archivio blog, legal, hub servizi, showroom-cat | 8 articoli con estratto invece di 6 paginati; il carosello news; i testi degli store |
| lorem ipsum non riprodotto | le 2 pagine di Via Argine | l'`og:description` dell'originale contiene testo di riempimento |
| hero assente nell'originale | `appartamento-moderno-prima-e-dopo` | `background-image: url('')`: era un riquadro bianco |

Restano fuori solo le differenze cosmetiche: l'originale scrive "23 Dic" e i
puntini come `...`, il rebuild "23 dicembre 2024" e `…`.

**Segnalazione per il proprietario:** nel form del preventivo c'è un campo
etichettato "Risrtutturazione" — un errore di battitura presente sul sito live.

### Verifica
`check-build.js`: **48 rotte × 3 viewport, nessun problema.** Zero link interni
rotti: le rotte non ancora costruite sono solo le 8 date di archivio, i 2 feed,
`/author/admin/`, le 4 thank-you, le 2 landing, `/richiedi-preventivo-2/` e le 3
root di archivio CPT — nessuna linkata dalle pagine del sito.

### Da fare nel passo successivo
Le 4 thank-you page e le 2 landing, i 6 form, i redirect 301, il deploy.

---

## A06 — Thank-you, landing e i redirect 301: copertura completa delle rotte
**2026-09-02 · fase A**

### 54 rotte costruite, 66 coperte

| | rotte | |
|---|---|---|
| costruite dal rebuild | **54** | di cui 45 in sitemap, 9 in `noindex` |
| servite da un **301** | 5 | `/author/admin/`, `/services/`, `/realizzazioni/`, `/store/`, `/richiedi-preventivo-2/` |
| **non** replicate per scelta | 9 | 8 archivi data `/2024/MM/GG/` e `/feed/`: fuori sitemap, non sono contenuto |

**Tutti i 56 URL indicizzati sono coperti**: 51 serviti direttamente, 5 con
redirect, **zero da decidere**.

### Decisioni SEO che l'originale sbagliava

- **Le 4 thank-you page erano `index, follow`.** Una pagina di ringraziamento
  nei risultati di ricerca è un difetto: chi la apre da Google non ha inviato
  nulla. Ora sono in `noindex`, e restano essenziali — niente blocco contatti,
  niente carosello news (l'originale ce l'ha anche lì).
- **`/promo-casa/` porta un'offerta con scadenza** ("valida fino al 31 Dicembre")
  ed è ancora indicizzabile. Ricostruita fedelmente ma in `noindex` finché il
  proprietario non decide se aggiornare l'offerta o ritirare la pagina. Stessa
  cosa per l'altra landing, che competeva con le pagine del sito.
- **La riga legale dentro il contenuto delle landing** è stata rimossa: quelle
  pagine nell'originale non usano il footer del sito e se la portano dentro.
  Qui il footer c'è, e ripeterla due volte non ha senso.
- **`noindex.ts` ora si costruisce dalle pagine**: ogni voce con `noindex: true`
  entra da sé nella lista che filtra la sitemap. Tenere due elenchi allineati a
  mano non funziona — la sitemap includeva le landing messe in `noindex`.

### I redirect, generati e non scritti a memoria

`_migrazione/build-redirect.js` incrocia tre fonti verificabili: i 56 URL della
sitemap del live, le rotte che il build produce davvero, e la mappa page-id →
rotta generata dal mirror. Per ogni URL che il rebuild non serve più cerca la
destinazione e **registra il perché**; quelli senza destinazione ovvia restano
elencati come "da decidere" invece di ricevere un 301 a caso (l'elenco è vuoto).

Produce `baseline/redirect.json` (con le motivazioni) e
`costruisciearreda-astro/redirect.conf` per nginx, che include anche la mappa
dei vecchi URL `/?p=ID` — 44 voci, che WordPress risolveva e che possono essere
linkati dall'esterno.

### Verifica
`check-build.js`: **54 rotte × 3 viewport, nessun problema.**

### Da fare nel passo successivo
I 6 form, poi il deploy su Coolify e il cutover DNS.

---

## A07 — I sei form
**2026-09-02 · fase A**

Campi estratti dal markup dei Contact Form 7 dell'originale, uno per uno.
Definizioni in `src/data/form.ts`, rendering in `src/components/Form.astro`.

| form | id CF7 | dove | campi |
|---|---|---|---|
| contatti | `95` | blocco contatti, su ogni pagina | 7 |
| newsletter | `467` | footer | 2 |
| preventivo | `1548` | `/richiedi-preventivo/` | 10 |
| candidatura | `775` | `/lavora-con-noi/` | 9, **con allegato** |
| landing promo | `4473` | `/promo-casa/` | 7 |
| landing ceramiche | `4395` | `/soluzione-ceramiche/` | 7 |

### Niente form finti

Senza `PUBLIC_FORM_ENDPOINT` configurato il form **non viene reso**: al suo
posto compaiono telefono ed email. Un form che non invia è peggio di un numero
di telefono, e in un sito statico senza backend è esattamente quello che
sarebbe. Con l'endpoint, l'invio va via `fetch` e la pagina resta dov'è
mostrando l'esito; senza JavaScript il form fa una POST normale, perché `action`
e `method` sono nel markup.

### Difetti dell'originale corretti

- **Il campo curriculum accettava `audio/*,video/*,image/*`**: audio e video sì,
  un PDF no. Su un form di candidatura. Corretto in `.pdf,.doc,.docx`.
- **Nessuna `<label>`, solo `placeholder`**: il testo scompare appena si scrive e
  gli screen reader non lo annunciano in modo affidabile. Ogni campo ha ora la
  sua label visibile.
- **Il link all'informativa privacy puntava a `pagina#`**, cioè a niente. Ora
  porta a `/privacy-policy/`.
- **`autocomplete` assente**: il browser non poteva compilare nome, cognome,
  email, telefono, città, anno di nascita. Aggiunto su tutti i campi che lo hanno.
- **reCAPTCHA v3 su tutte le 56 pagine**, anche dove non c'è un form: 2 script di
  terze parti per pagina. Sostituito da un campo trappola, fuori dal flusso e
  fuori dall'albero di accessibilità.
- **Errore di battitura corretto**: l'opzione del preventivo era
  "Risrtutturazione". Sul sito live è ancora così.
- Lo stato dell'invio è annunciato in una regione `aria-live`, il bottone si
  disabilita durante l'invio (niente doppio invio), e i campi non validi si
  segnalano con `:user-invalid` — cioè **dopo** un tentativo, non mentre si
  scrive: `:invalid` da solo colora di rosso un campo ancora vuoto.

### Verifica

Provato nel browser con endpoint finto e richiesta intercettata: form compilato,
allegato PDF accettato, invio riuscito, messaggio "Grazie, abbiamo ricevuto la
tua candidatura", bottone riabilitato, zero errori in console. Senza endpoint,
le tre pagine con form mostrano i recapiti.

`check-build.js`: **54 rotte × 3 viewport, nessun problema.**

### Cosa resta al proprietario
Collegare il servizio di invio impostando `PUBLIC_FORM_ENDPOINT`. Il form
`candidatura` porta un allegato: EmailJS non basta, serve un endpoint che accetti
file. I campi arrivano come `multipart/form-data` con in più `_form` (quale form)
e `_url` (campo trappola: se compilato, è un bot).

---

## Fase A completa — il risultato, misurato
**2026-09-02**

### Copertura delle rotte

| | |
|---|---|
| rotte costruite | **54** (45 in sitemap, 9 in `noindex`) |
| URL indicizzati coperti | **56 su 56** — 51 diretti, 5 con redirect 301 |
| rotte non replicate per scelta | 9 (8 archivi data, 1 feed: non sono contenuto) |
| cancello di qualità | 54 rotte × 3 viewport, **nessun problema** |

### Peso reale, misurato nel browser

Byte effettivamente trasferiti a 1440px con lo scorrimento completo della pagina
(lazy-load innescato), tracker bloccati su entrambi i lati:

| rotta | mirror | rebuild | |
|---|---|---|---|
| `/type_stores/showroom-cat/` | **58,04 MB** · 179 richieste | **0,20 MB** · 7 | −100% |
| `/store/via-san-massimo-na/` | 28,94 MB · 141 | 0,63 MB · 29 | −98% |
| `/il-nostro-team/` | 7,29 MB · 63 | 0,35 MB · 26 | −95% |
| `/category/ultime-news-e-articoli/` | 6,70 MB · 54 | 0,26 MB · 13 | −96% |
| `/` homepage | 5,16 MB · 55 | 0,48 MB · 17 | −91% |
| `/la-nostra-storia/` | 3,96 MB · 55 | 0,22 MB · 13 | −94% |
| `/gres-costruisciearreda-consigli/` | 3,91 MB · 43 | 0,20 MB · 6 | −95% |
| `/contatti/` | 2,74 MB · 44 | 0,22 MB · 9 | −92% |
| `/realizzazioni/home-albe/` | 2,65 MB · 53 | 0,63 MB · 21 | −76% |
| `/services/progetto/` | 2,35 MB · 42 | 0,17 MB · 6 | −93% |
| **totale** | **121,74 MB** | **3,36 MB** | **−97%** |

Non viene da compressione aggressiva: viene dall'aver tolto ciò che non serviva.
CSS da 22 bundle di 685 KB a un file solo; JS da 790 KB in 26 file (jQuery,
Bootstrap, Swiper, slick, isotope, PixelYourSite, reCAPTCHA su ogni pagina) a
poche righe in linea; immagini in WebP con `srcset` invece degli originali a
piena risoluzione; nessun contenuto duplicato per desktop e mobile.

### I difetti dell'originale, tutti quelli trovati

Ognuno **misurato**, non dedotto:

**Contenuto invisibile o rotto**
1. 5 immagini di fondo su 7 non applicate sulla homepage: la sezione "store" e i
   tre riquadri di tassonomia erano **buchi bianchi di 700px** con i titoli
   bianchi su bianco.
2. `/realizzazioni/appartamento-moderno-prima-e-dopo/`: `background-image: url('')`
   — hero bianco vuoto di 750px, titolo bianco su bianco.
3. Le gallerie degli store **invisibili a 900px** (gallery duplicata con le classi
   `elementor-hidden-*` che non coprono la fascia tablet).
4. Il corpo del testo dei servizi mostrato **due volte** a 900px, stessa causa.
5. I contatori mostravano `0` finché non si scorreva, e restavano a zero senza JS.
6. `linea.png`, referenziata 24 volte, è **404 sul sito live**.

**SEO e semantica**
7. Homepage con **3 `<h1>`**, hub servizi con 9, archivio blog con 7, e 17 pagine
   senza nessun `<h1>`.
8. Meta description assente su 49 pagine su 56.
9. Due `<title>` identici su ogni pagina (uno dal tema, uno da Yoast).
10. `<html class="" lang="it-IT" class="no-js">`: attributo duplicato.
11. Le 4 thank-you page erano `index, follow`.
12. `/promo-casa/` con offerta scaduta, indicizzabile.
13. `/richiedi-preventivo-2/`: duplicato senza form, indicizzato.
14. Le due pagine di Via Argine identiche, entrambe indicizzate.
15. **Lorem ipsum italiano nell'`og:description`** di Via Argine, pubblicato.
16. Titoli Yoast "Showroom **Archivi**".
17. I tre archivi di tassonomia mostravano lo stesso elenco, senza rapporto con
    le categorie assegnate.
18. Il menu nel DOM **3 volte**, tutte con lo stesso `id`: HTML non valido e
    ~250 parole duplicate prima del contenuto di ogni pagina.
19. Tutti i link interni nella forma `index.html%3Fp=976.html`.
20. "Company profile" nel footer: link a `#`.

**Accessibilità**
21. `user-scalable=no, maximum-scale=1.0`: zoom bloccato (WCAG 1.4.4).
22. 594 immagini senza `alt`; negli store l'`alt` è il nome del file (`DSC03145`).
23. Nessuna `<label>` nei form, solo `placeholder`.
24. Il campo curriculum accettava `audio/*,video/*,image/*` — **non i PDF**.
25. Nessun `autocomplete` sui campi.
26. Il link all'informativa privacy puntava a `pagina#`.
27. Nessuno stato di focus visibile.
28. Titoli e indirizzi con le parole incollate (`<br>` ignorato da `textContent`).

**Peso**
29. reCAPTCHA v3 e Contact Form 7 su tutte le 56 pagine, anche senza form.
30. `theme-functions.js`: codice copiato da un altro progetto ("edilcom"), con
    branching su domini di sviluppo altrui.
31. `isotope.js` (35 KB) su 54 pagine con **zero** inizializzazioni;
    `slick.min.js` (42 KB) su 54 pagine, inizializzato su 2.
32. Due librerie carousel insieme (Swiper 140 KB + slick 42 KB).
33. Tre famiglie di icon font sovrapposte.
34. Montserrat caricato due volte (90 `@font-face` self-hosted + Google Fonts),
    più Roboto e Roboto Slab.
35. 22 bundle CSS distinti da ~700 KB: la cache del browser inutilizzabile.
36. La pagina showroom mostrava le gallerie complete di ogni store: 281 immagini.

**Altro**
37. Typo "Risrtutturazione" in un'opzione del form preventivo.
38. Il preloader era `<img src="index.html">`: un'immagine rotta che riscaricava
    la pagina.

### Cosa resta
Deploy su Coolify e cutover DNS; endpoint dei form; le decisioni di contenuto
elencate in `CLAUDE.md` sotto "Da far decidere al proprietario".

---

## A08 — Ritirata la landing con l'offerta scaduta, e due difetti miei
**2026-09-02 · decisione del proprietario**

### `/promo-casa/` rimossa

La pagina era **interamente** l'offerta scaduta: titolo "PROMO casa", prezzo
"€ 166 al mese per 48 mesi", scadenza "valida fino al 31 Dicembre", listino dei
materiali, omaggi, form "BLOCCA OFFERTA". Non c'era nulla da salvare togliendo
solo la parte scaduta.

Rimossa insieme a:
- la sua thank-you `/thankyou-promo-6500/`, che senza la landing non ha senso;
- il form CF7 `4473`, che era usato solo lì.

Entrambi gli URL erano nella sitemap del live, quindi rispondono con un **301
verso `/richiedi-preventivo/`**: chi arriva da un vecchio link o da un annuncio
cerca un preventivo, ed è dove lo trova.

Il contenuto estratto resta in `src/content/pagine/promo-casa.json`. Se la
promozione verrà rifatta, i testi ci sono e i campi del form erano: nome,
cognome, email, telefono, città, disponibilità per l'appuntamento, consenso.

Copertura invariata: **56 URL su 56** — 49 serviti direttamente, 7 con redirect.

### Due difetti del mio lavoro, trovati nel giro visivo

**1. `/type_stores/marchi/` alta 142.430px.** L'originale è 7.213px con i loghi
in riquadri di 97×97. Due cause sovrapposte:

- **l'ordine dei blocchi era sbagliato.** La deduplica desktop/mobile preferiva
  la copia visibile ma teneva la **posizione** della copia nascosta, che nel DOM
  sta in un ramo precedente. Risultato: i 13 titoli dei gruppi tutti all'inizio
  e i 103 loghi tutti in coda, in una sola sezione. Ora la posizione si aggiorna
  insieme alla copia, e i loghi tornano sotto il proprio gruppo (21 ferramenta,
  18 rivendita edile, 9 ceramiche, …);
- **i loghi erano resi come fotografie**, a piena colonna. Aggiunta la
  disposizione `loghi`: griglia densa da 7rem, altezza 6rem, `object-fit:
  contain` perché hanno proporzioni diverse e non vanno tagliati.

Risultato: **11.438px**, con i marchi leggibili e raggruppati.

**2. Scorrimento orizzontale su `/type_stores/ferramenta/`.** Il blocco dei
recapiti (la variante del form senza endpoint) finiva in una cella della griglia
dei loghi: 233px di contenuto in una colonna da 113, 72px di sfondamento a 390px.

Corretto alla radice: i blocchi che occupano **sempre** la larghezza piena —
form, riquadri, gallerie, carousel, elenchi, accordion, servizi numerati — ora
escono dalla griglia della sezione e si rendono dopo il corpo. Prima erano
gestiti con controlli sparsi in `disposizione`, e ogni caso nuovo era un cerotto.
Questo elimina anche il vecchio correttivo per l'accordion, che sfondava per lo
stesso motivo.

### Giro visivo su 23 pagine

Tutte con **un solo `<h1>`**, nessuno scorrimento orizzontale, nessuna sezione
vuota, nessun errore JavaScript.

`check-build.js`: **52 rotte × 3 viewport, nessun problema.**

---

# Fase B — le modifiche volute

La fase A è chiusa: ricostruzione 1:1, fedeltà dimostrata. Da qui in poi le
modifiche sono **volute**, non correzioni di difetti. Ognuna sposta la baseline,
quindi ognuna deve dire qui **che cosa** ha spostato e **perché** — altrimenti
il `fingerprint diff` smette di essere uno strumento e diventa rumore.

---

## B01 — La homepage apre con i quattro rami del gruppo
**2026-09-04 · richiesta del proprietario**

### La richiesta

«Costruisci e Arreda è un gruppo che comprende diversi rami: abbiamo
ferramenta, ceramiche e bagno ed edilizia. Quello che andremo a fare sarà nella
home dare spazio e mostrare fin da subito i diversi rami, in modo che l'utente
possa entrare fin da subito nelle diverse sezioni. Ogni sezione è uno showroom,
non un e-commerce.»

Tre scelte decise con il proprietario prima di scrivere il codice:
- i rami vanno **al posto** del carosello, non sotto;
- sono **quattro**, non tre: si aggiunge Progettazione e Ristrutturazione, che
  sul sito è già un ramo a sé con pagina propria e 8 servizi collegati;
- le rotte restano **quelle esistenti** (`/type_stores/...`): brutte da leggere
  ma indicizzate, e rinominarle è una modifica a sé che richiede i 301.

### Perché il carosello se ne va — misurato sul mirror

Le tre slide dell'hero originale avevano:
- lo **stesso** occhiello su tutte e tre — "Edilizia, design e ferramenta";
- tre claim generici che non nominano nessun ramo — "professionisti del
  settore", "materie prime di qualità", "estetica e funzionalità";
- un `<h1>` **ciascuna**, quindi tre `<h1>` in homepage.

Risultato: **750px di altezza** che non dicevano né quali sono i rami del
gruppo né dove entrare. I rami erano raggiungibili solo dal sottomenu "Store"
o da tre loghi SVG a metà pagina.

I tre claim **non sono stati buttati**: stanno nella riga di apertura del nuovo
hero ("Professionisti del settore, materie prime di qualità, estetica e
funzionalità: quattro rami e un solo interlocutore, dal materiale al progetto
finito"). Così la modifica è di sola struttura e il `fingerprint diff` non
segnala parole perse.

### Cosa è stato aggiunto

| File | Cos'è |
|---|---|
| `src/data/rami.ts` | I quattro rami: nome, descrizione, rotta, foto, sedi. **Fonte unica.** |
| `src/components/Rami.astro` | I riquadri: foto a pieno riquadro, velatura, nome, descrizione, comuni, azione. |
| `src/components/HeroRami.astro` | L'apertura: claim (`<h1>`) + riga di apertura + la griglia. |

`src/pages/index.astro`: `HeroSlider` → `HeroRami`. `HeroSlider.astro` **resta
in repo**, non è più importato dalla homepage: serve ancora se si volesse un
carosello altrove, e cancellarlo non fa guadagnare nulla.

**`rami.ts` non duplica le sedi.** Ogni ramo dichiara il `tipoSede`
(`Showroom` / `Punto edile` / `Ferramenta`) e i comuni mostrati nei riquadri
sono derivati da `sedi` in `site.ts`. Con la deduplica: lo showroom di Via
Martiri della Libertà è elencato due volte nel footer dell'originale, quindi
senza dedurre "Napoli" comparirebbe due volte. Progettazione ha `tipoSede:
null` — non è un punto vendita, mostrarne l'indirizzo degli uffici sarebbe
fuorviante — e al suo posto mostra "8 servizi, dal rilievo alle certificazioni".

### Misure nel browser

| | desktop 1440 | tablet 900 | mobile 390 |
|---|---|---|---|
| altezza dell'hero | 921px | 899px | 1336px |
| riquadro | 641×300 | 398×283 | 350×240 |
| colonne | 2 | 2 | 1 |
| `<h1>` | **1** (erano 3) | 1 | 1 |
| scorrimento orizzontale | no | no | no |
| rami visibili senza scorrere | **4 su 4** | 4 su 4 | 1 su 4 |

**Peso della homepage, byte trasferiti a 1440px con scroll completo:**
**0,37 MB in 16 richieste**, da 0,48 MB in 17 della homepage con il carosello,
e da 5,16 MB in 55 dell'originale (**−93%**). È scesa perché quattro foto da
640px pesano meno di tre slide a piena finestra, di cui una in `eager`.

### Due difetti trovati misurando, non guardando

**1. Fondi dei riquadri non allineati.** A 900px il titolo "Progettazione e
Ristrutturazione" va a capo, quindi quel riquadro è alto 283px e quello accanto
240: i due fondi della stessa riga non combaciavano. Causa: il `min-height`
stava sul link, che è figlio del `<li>`, e il `<li>` si allungava da solo
mentre il link no. Fix: `display: grid` sul `<li>`, così il link riempie la
cella. Verificato: 283/283.

**2. La fascia dei servizi numerati copriva i riquadri.** `ServiziNumerati` ha
`margin-top: -75px` da 769px in su — riprodotto dall'originale, dove scavalcava
la foto dell'hero. Con l'hero fatto di riquadri con il testo **in basso**, quei
75px si mangiavano i comuni e il "Scopri" dei due riquadri inferiori.

Fix alla radice: la sovrapposizione è diventata un token,
`--overlap-servizi` (0 sotto i 769px, 75px sopra). La legge chi scavalca
(`ServiziNumerati`, `margin-top: calc(-1 * ...)`) e chi deve lasciare lo spazio
(`HeroRami`, `padding-bottom`). Scritta due volte a mano si sarebbe scollata al
primo che cambia.

Verificato ai tre viewport: fondo della griglia dei rami **=** cima della
fascia dei servizi (947/947, 893/893, 1405/1405). Zero sovrapposizione, zero
buco.

### Contrasto: alzato dopo aver guardato le catture

La velatura dei riquadri era la stessa di `Riquadri.astro` (78% in basso, 45% a
metà). Non bastava: i titoli "EDILIZIA" e "FERRAMENTA" cadono su una zona
chiara della foto — un mattone illuminato, un rullo su intonaco bianco — e
diventavano illeggibili. Alzata a 82% / 58% / 18%, più un `text-shadow` sul
corpo per il contrasto locale, che evita di dover scurire tutta la foto per
salvare una riga di testo.

**Da riverificare quando arrivano le foto definitive:** quelle attuali sono in
bianco e nero, una foto a colori si comporta diversamente.

### Verifica

`check-build.js`: **52 rotte × 3 viewport, nessun problema.** `astro check`: 0
errori. `npm run build`: 52 pagine.

**Fedeltà: l'impronta della homepage, prima e dopo B01.** Confrontata con la
versione di `baseline/fingerprint-astro.json` in git, così il delta è **solo**
quello di questa modifica e non si mescola alle differenze della fase A:

| | prima | dopo |
|---|---|---|
| `<h1>` | 3 (`professionisti del settore`, …) | **1** (`Edilizia, design e ferramenta`) |
| heading | — | **+4 `<h2>`**, uno per ramo |
| immagini | 3 slide (`Raggruppa-1650/1652/1655`) | 3 foto dei rami (`RivenditaEdile`, `Ferramenta2`, `Raggruppa-1647-1`) |
| link interni | 19 | **20** |
| parole | 472 | **566** |

Nessuna parola persa: le 94 in più sono la riga di apertura e le quattro
descrizioni. Il link in più è `/type_stores/progettazione-e-ristrutturazione-edile/`,
che la homepage non raggiungeva da nessuna parte. La quarta foto
(`Raggruppa-1679`) non risulta nuova perché era già in pagina come fondo della
fascia "store".

Le voci "immagini assenti" e "parole assenti" che il `diff` contro il mirror
segnala sulla homepage sono le **stesse di prima** di B01 (etichette dei form,
abbreviazioni delle date, il `0` dei contatori): non sono un effetto di questa
modifica.

### Cosa resta aperto

1. **Le quattro foto sono provvisorie.** Sono le uniche immagini di quel ramo
   già presenti nel mirror. In `rami.ts` sono marcate `fotoProvvisoria: true`:
   cercare quel flag per sapere cosa resta da sostituire. Servono anche gli
   `alt`, oggi vuoti perché la foto è decorativa; con scatti veri dei punti
   vendita diventano contenuto e l'`alt` va scritto.

   | ramo | foto provvisoria |
   |---|---|
   | Ceramiche e Bagno | `2024/06/Raggruppa-1679.jpg` (foto di showroom, oggi fondo della fascia "store") |
   | Edilizia | `2024/07/RivenditaEdile.jpg` |
   | Ferramenta | `2024/08/Ferramenta2.jpg` |
   | Progettazione e Ristrutturazione | `2024/06/Raggruppa-1647-1.jpg` |

2. **La fascia "store" più in basso ora è un doppione.** Sono i tre loghi SVG
   che puntano alle **stesse** tre rotte del nuovo hero. Non toccata: è
   contenuto dell'originale e rimuoverlo è una decisione del proprietario. La
   proposta è riusarla per le **sedi fisiche** (`/store/via-martiri-della-liberta-na/`
   e le altre quattro), che oggi la homepage non linka da nessuna parte.

3. **I nomi dei rami sono decisi qui, non presi dal sito.** "Ceramiche e Bagno"
   e "Edilizia" sono i nomi commerciali detti dal proprietario; sul sito le
   pagine si chiamano "Showroom" e "Rivendita edile". Da confermare quale
   coppia di nomi resta, perché vale anche per menu e footer.

---

## B02 — L'hero della homepage diventa una parete, non una griglia di card
**2026-09-04 · richiesta del proprietario**

### La richiesta

«Possiamo provare a rendere le 4 card nella hero più wow? È comunque la prima
cosa che uno vede quando entra. Ora va bene ma sembra più una selezione di una
sezione piuttosto che una hero.»

### La diagnosi, misurata

Quello che faceva leggere B01 come un indice e non come un'apertura era
misurabile, non un'impressione:

| | B01 | perché era il problema |
|---|---|---|
| larghezza | rientrata nel `.container` | margini bianchi ai lati: card appoggiate su una pagina, non un'apertura |
| separazione | `gap: 15px` | quattro oggetti distinti invece di uno |
| altezza campata | 300px | a quell'altezza il testo in basso è l'etichetta di una card |
| forma | 641×300, orizzontale | banner |
| claim | 50px grigio, sul bianco sopra le card | galleggiava, non apparteneva all'hero |

### La soluzione: l'hero che il sito ha già

Il sito **ha** un hero, sulle pagine interne (`Hero.astro`), e ha una forma
misurata: a tutta finestra, **750px**, foto a pieno riquadro, titolo bianco
maiuscolo `clamp(30px, 5.4vw, 80px)` peso 300, e la riga rossa da 1px che
sfonda fino al bordo della finestra. La homepage era **l'unica pagina senza
quell'hero**.

Quindi non è stato inventato un aspetto nuovo: è stato preso l'hero del sito e
**diviso in quattro campate**, una per ramo.

| | B01 | B02 |
|---|---|---|
| larghezza | dentro il contenitore | **a tutta finestra** |
| separazione | gap 15px | **fughe da 1px** in `--c-border`, il grigio misurato |
| altezza campata | 300px | **464px**, verticale |
| claim | 50px sul bianco, sopra | **78px bianco dentro la parete**, prima campata a tutta larghezza |
| altezza totale | 921px | **771px** — vicina ai 750 dell'hero misurato |

Le fughe non sono un vezzo: fra due lastre di uno showroom c'è una fuga, non un
margine bianco. Tecnicamente sono il fondo della griglia che si vede attraverso
`gap: 1px`, quindi zero markup in più.

**Il rosso in un punto solo.** `#C20E1A` sul sito è un accento tipografico, non
un colore di bottoni. Qui compare sotto il claim e sotto il nome della campata
su cui si sta puntando. Così il rosso vuol dire "questa qui" invece di
decorare.

**Lo stato attivo risponde al gesto, non si anima da solo.** Puntando o dando
il fuoco a una campata: la velatura passa da 1 a 0.7 (la foto si schiarisce) e
la riga sotto il nome passa da bianco al 40% al rosso del brand. Verificato
anche da tastiera, dove il fuoco è un contorno bianco rientrato di 8px — quello
globale è rosso su 2px e su una campata scura, accanto a un'altra campata
scura, non si vede.

**La fascia dei servizi numerati torna a scavalcare l'hero**, come
nell'originale scavalcava la foto. Da 1200px lo spazio lo lascia la campata
(`padding-bottom: calc(var(--s-10) + var(--overlap-servizi))`), non la sezione,
perché lì le quattro campate sono una riga sola e la sovrapposizione è
uniforme. Sotto i 1200px sono su due righe e lo spazio lo lascia la sezione,
altrimenti i 75px mangerebbero solo la riga in basso.

### Copia: tolti tre modi di scrivere da template

- `Napoli · Nola` → **`Napoli e Nola`**. I punti centrali sono il modo in cui un
  template unisce dei campi, non il modo in cui si dice a qualcuno dove andare.
  Il congiuntore è in `elenco()` in `rami.ts`, che fa "A", "A e B", "A, B e C".
- `SCOPRI →` **rimosso**. Era un'etichetta maiuscola spaziata più una freccia
  appesa al testo, su un riquadro che è già interamente un link. L'affordance
  ora è il nome sottolineato dalla riga da 1px, che è il segno grafico del sito.
  `Riquadri.astro` non ha nessuna etichetta d'azione: coerente.
- `8 servizi` → **`Otto servizi`**.

### Difetti trovati misurando

**1. Il claim era invisibile.** `base.css` assegna agli heading un colore
esplicito, che batte quello ereditato dalla parete: l'`<h1>` era testo scuro su
fondo scuro. Trovato con `getComputedStyle`, non guardando — nella cattura era
solo una fascia scura vuota. Serve `color: inherit`, che avevo messo sul nome
della campata e non sul claim. (`.section--dark :where(h1,…) { color: inherit }`
in `base.css` esiste esattamente per questo.)

**2. "RISTRUTTURAZIONE" sfondava la campata.** 16 caratteri a 32px di corpo
sono ~350px in una campata da 359px con 32px di padding, cioè 295px
disponibili: `overflow: clip` la troncava a metà. Il tetto del corpo è ora
26px, deciso dalla parola più lunga e non a occhio, più `overflow-wrap:
break-word` come rete di sicurezza per nomi futuri. Verificato con
`scrollWidth > clientWidth` su tutti i testi di tutte le campate: **zero
sfondamenti** ai tre viewport.

**3. Le insegne erano scalinate.** Essendo allineate in basso, una descrizione
da 3 righe alzava il proprio nome di 21px rispetto a una da 4. Misurate le
righe reali: a 1200px+ (campate da 359px) le quattro descrizioni stanno su
**4, 4, 3 e 3** righe; a 900px e a 390px stanno **tutte su tre**. Quindi la
riserva di quattro righe serve **solo** da 1200px: sotto, lasciava un buco
sopra la riga del dove. Se le descrizioni cambiano va rimisurato — c'è scritto
nel CSS.

**4. La fascia del claim aveva 384px di fondo scuro vuoto.** Il claim occupava
il terzo sinistro. Da 1200px claim e riga di apertura stanno affiancati e
allineati in basso: la fascia scende a 306px e la parete a 771.

### Verifica

`astro check`: 0 errori. `npm run build`: 52 pagine.

| | desktop 1440 | tablet 900 | mobile 390 |
|---|---|---|---|
| altezza dell'hero | **771px** | 960px | 1272px |
| campata | 359×464 | 450×300 | 390×240 |
| colonne | 4 | 2 | 1 |
| `<h1>` | 1 | 1 | 1 |
| corpo del claim | 77,8px | 48,6px | 30px |
| testi che sfondano | 0 | 0 | 0 |
| scorrimento orizzontale | no | no | no |
| rami visibili senza scorrere | **4 su 4** | 4 su 4 | 1 su 4 |

**Peso della homepage: 0,30 MB in 16 richieste.** Era 0,37 con la griglia di
card, 0,48 con il carosello, **5,16 MB in 55 richieste nell'originale (−94%)**.
È scesa ancora perché le campate sono larghe 359px invece di 641, quindi
`astro:assets` serve varianti più piccole.

**Impronta della homepage: identica a B01.** Rispetto alla versione col
carosello in git: `<h1>` da 3 a **1**, **+4 `<h2>`** (uno per ramo), parole da
472 a **562**, link interni da 19 a **20**. Nessuna parola persa.

### Componenti

`Rami.astro` è stato **rimosso**: la parete è un oggetto solo — l'insegna del
gruppo è una campata della stessa griglia delle altre quattro — e tenerlo
spezzato in due componenti significava una griglia divisa fra due file. Tutto
sta in `HeroRami.astro`. `src/data/rami.ts` resta la fonte unica dei rami.

### Cosa resta aperto

Le tre cose aperte di B01 valgono ancora (foto provvisorie, la fascia "store"
che duplica le rotte, i nomi dei rami da confermare), e una vale ora più di
prima:

**Le quattro foto sono la leva più grossa che resta sull'impatto.** Sono tutte
in **bianco e nero** e ritagliate da scatti orizzontali, quindi la parete è
un'unica distesa di grigi e il ritaglio verticale taglia via metà
dell'inquadratura. Quattro foto **a colori, scattate verticali**, cambiano
questa apertura più di qualsiasi altra modifica al CSS. Con foto a colori va
anche rimisurata la velatura: quella attuale (82% in basso, 58% a metà, 18% in
alto) è tarata sul bianco e nero.

---

## B03 — Che ritaglio subiscono le foto, e cosa serve dallo shooting
**2026-09-04 · lo shooting nuovo è già stato richiesto al cliente**

Con quattro foto vere in arrivo, la domanda non è più "che aspetto hanno" ma
**che formato devono avere**. Misurata, la risposta ha scoperto un difetto della
parete di B02.

### Il difetto: la campata cambiava proporzione di cinque volte

`object-fit: cover` ritaglia per riempire, quindi il formato che serve dipende
dalla proporzione della campata. Misurata a 15 larghezze di finestra:

| finestra | campata | proporzione |
|---|---|---|
| 390 | 390×240 | 1,63 |
| **768** | **768×240** | **3,20** ← una feritoia |
| 900 | 450×300 | 1,50 |
| 1199 | 599×300 | 2,00 |
| **1200** | **299×464** | **0,64** ← verticale stretto |
| 1440 | 359×464 | 0,77 |
| 2560 | 639×464 | 1,38 |

**Da 0,64 a 3,20: cinque volte.** Nessuna fotografia può essere sia una feritoia
3,2:1 sia un verticale 0,64. Con `cover` centrato, la porzione **garantita
visibile** a tutte le larghezze era il **20%** della foto — e restava il 20%
qualunque formato si scegliesse, perché il limite non era il formato ma
l'intervallo.

Causa: le altezze erano **fisse** (240 / 300 / 464px) mentre la larghezza è
sempre una frazione della finestra. Una colonna singola su una finestra da
768px dava 768×240.

### Il fix: altezze proporzionali, non fisse

| colonne | prima | ora |
|---|---|---|
| 1 (<769px) | `240px` | `clamp(15rem, 60vw, 26rem)` |
| 2 (769–1199) | `300px` | `clamp(18.75rem, 31vw, 24rem)` |
| 4 (≥1200) | `464px` | `clamp(22rem, 32vw, 29rem)` |

Il tetto della fascia a 4 colonne resta i **464px** su cui la parete è
disegnata (insegna del gruppo + una campata = 768px, cioè i 750 dell'hero
misurato), quindi **il desktop non cambia**: 359×461 invece di 359×464. Il
fondo di ogni `clamp` serve a togliere l'estremo: senza, a 1200px esatti la
campata era 299×464.

**Risultato misurato: intervallo da 0,78 a 1,85** — 2,4 volte invece di 5 — e
l'area garantita passa **dal 20% al 42%**.

| formato di scatto | larghezza tenuta | altezza tenuta | area sicura |
|---|---|---|---|
| 2:3 verticale | 100% | 36% | 36% |
| 4:5 verticale | 98% | 43% | 42% |
| 1:1 quadrato | 78% | 54% | 42% |
| **4:3 orizzontale** | **59%** | **72%** | **42%** |
| 3:2 orizzontale | 52% | 81% | 42% |

Da 4:5 a 3:2 l'area sicura è la stessa: cambia **dove** sta. Il 4:3 è il
compromesso migliore perché tiene il 59% della larghezza **e** il 72%
dell'altezza, quindi l'area sicura è un rettangolo utilizzabile invece di una
striscia.

### Le specifiche per il fotografo

- **Formato 4:3 orizzontale** (o 1:1). Non 16:9, non verticale stretto.
- **Soggetto nel 60% × 70% centrale.** Un quinto di margine per lato: quello che
  sta ai bordi verrà tagliato su qualche schermo, sempre.
- **Terzo inferiore semplice.** Lì va l'insegna — nome, descrizione, sedi — sotto
  una velatura all'82%: un dettaglio importante messo in basso non si vedrà.
- **Colore, luce media-alta.** La parete è già scura e velata: una foto scura
  sopra diventa una macchia. Le provvisorie sono in bianco e nero, ed è il
  motivo per cui l'apertura è una distesa di grigi.
- **Minimo 2400px sul lato corto**, e servono gli **originali**: `astro:assets`
  genera WebP e AVIF a cinque larghezze. Una foto già compressa perde qualità
  due volte.
- Un soggetto riconoscibile per ramo: lo showroom con le ceramiche accese, il
  bancone della ferramenta, il piazzale dei materiali, un cantiere con le
  persone al lavoro.

### `fuoco`: il ritaglio si regola dai dati, non dal CSS

Aggiunto il campo opzionale `fuoco` a `Ramo` (`src/data/rami.ts`), che finisce
in `object-position` attraverso la variabile `--fuoco`. Quando arrivano le foto,
se una va tenuta più in alto si scrive `fuoco: '50% 35%'` accanto alla foto —
non si tocca il CSS del componente. Omesso vale `50% 50%`.

### Un difetto in più, trovato nella cattura a 700px

Con le campate più alte, a colonna singola su 700px la riga sotto il nome
correva per 650px sotto un nome di 220: un divisore lunghissimo invece di un
segno. L'insegna ha ora `max-width: 22rem` (352px), tetto deciso dalla parola
più lunga a corpo pieno ("RISTRUTTURAZIONE", 283px a 26px) e non a occhio. Sulle
campate da 359px non stringe nulla: il desktop non cambia.

### Verifica

`astro check`: 0 errori. `npm run build`: 52 pagine. Peso della homepage
invariato: **0,30 MB in 16 richieste**.

Nessun testo che sfonda a 390, 700, 900 e 1440 (`scrollWidth > clientWidth` su
tutti gli heading e paragrafi di tutte le campate). Nessuno scorrimento
orizzontale. Altezza dell'hero: **768px** desktop, 960 tablet, 1272 mobile.

---

## B04 — Le foto diventate prompt: stato di lavoro sulla parete
**2026-09-04 · richiesta del proprietario**

«Vado a generare le immagini a colori con l'AI, sostituisci le immagini con gli
alt che sono i prompt per generare l'immagine, così uso un'IA generativa per
crearle con il formato giusto.»

### I prompt non stanno nell'`alt`

L'`alt` è quello che leggono gli screen reader e che indicizzano i motori. Se un
prompt finisce lì e ce lo dimentichiamo, il sito va online con "Fotografia
realistica, formato 4:3 orizzontale…" come descrizione delle sue immagini.
Quindi c'è un campo suo, `promptFoto`, e `fotoAlt` resta il testo alternativo —
da scrivere guardando la foto vera, quando c'è.

La parte utile della richiesta è però esattamente quella: **la parete mostra il
prompt al posto della foto**, così si vede quale prompt appartiene a quale ramo
senza incrociare un elenco con uno screenshot.

### Come funziona lo stato di lavoro

`foto: null` + `promptFoto` presente = immagine da fare. La campata prende la
classe `--daGenerare` e mostra un riquadro tratteggiato con il prompt e, sotto,
la riga delle regole di formato. `align-content: space-between` manda il prompt
in alto e l'insegna in basso, e il `min-height` resta un pavimento: se il prompt
è lungo la campata **cresce** invece di tagliarlo.

Spariscono da sé: appena `foto` è popolata, la campata torna a mostrare
l'immagine. Non c'è niente da smontare, solo da riempire.

### Le regole di formato dichiarate una volta

`FORMATO_FOTO` in `rami.ts` è la costante con le regole misurate in B03, e
`promptCompleto(ramo)` la attacca al soggetto. Quindi i quattro prompt sono
**soggetto + regole**, e le regole stanno scritte una volta sola invece di
quattro. `promptCompleto()` finisce anche nel `title` della campata, così il
prompt completo si copia dalla pagina.

Le regole, per esteso:

> Fotografia realistica, formato 4:3 orizzontale. Soggetto contenuto nel
> 60% × 70% centrale dell'inquadratura, con circa un quinto di margine libero su
> ogni lato. Terzo inferiore dell'immagine semplice e poco dettagliato. Luce
> diffusa media-alta, colori naturali. Nessun testo, nessuna insegna, nessun
> logo, nessun marchio, nessuna filigrana, nessun volto riconoscibile in primo
> piano.

Ognuna ha un motivo misurato, non è una preferenza:

| regola | perché |
|---|---|
| 4:3 orizzontale | la campata va da 0,78 a 1,85 (B03): il 4:3 è l'unico formato che tiene il 59% della larghezza **e** il 72% dell'altezza |
| soggetto nel 60%×70% | quello che sta ai bordi viene tagliato su qualche schermo, sempre |
| terzo inferiore semplice | lì va l'insegna, sotto una velatura all'82% |
| luce media-alta, colori | la parete è già scura e velata: una foto scura sopra diventa una macchia |
| niente testo né marchi | un'insegna inventata sulla foto di un'azienda vera non si pubblica |

### I quattro soggetti

Presi dal testo delle pagine dei rami, non inventati:

- **Ceramiche e Bagno** — showroom con lastre di gres su espositori a pettine,
  composizione di mobile bagno, campionature su pannelli girevoli. (La pagina
  dice: «toccare con mano materiali pregiati… pavimenti, rivestimenti e arredo
  bagno».)
- **Edilizia** — piazzale con bancali di laterizi e sacchi di malta, ferro e
  reti in rastrelliera, muletto. (La pagina dice: «ferro, calcestruzzo, malte,
  cartongesso, laterizi».)
- **Ferramenta** — cassettiere per minuteria, utensili a pannello forato,
  elettroutensili, duplicatrice per chiavi. (La pagina dice: «chiavi e
  serrature… viti e sistemi di fissaggio… elettroutensili».)
- **Progettazione e Ristrutturazione** — tavolo da studio con pianta quotata,
  campioni di finiture, tablet con un rendering. Il tavolo con i campioni dice
  "progettiamo" meglio di due persone con il casco, che è la foto provvisoria
  di adesso e dice solo "cantiere".

Nessun genere assegnato alle persone: nella foto della progettazione il prompt
dice "due persone al lavoro", non chi sono.

### Le quattro foto provvisorie sono via

Erano quelle in bianco e nero recuperate dal mirror. `fotoProvvisoria` è stato
**rimosso** dal tipo: con `foto: null` come segnale di "da fare" era un secondo
modo di dire la stessa cosa. `Raggruppa-1679.jpg` resta nel build perché la
fascia "store" più in basso la usa ancora come fondo.

### Verifica

`astro check`: 0 errori. `npm run build`: 52 pagine.
**Homepage: 0,27 MB in 12 richieste** — quattro richieste e 36 KB in meno,
perché le foto non ci sono. Tornerà a salire quando arrivano, ed è il momento
di rimisurarla.

Altezza dell'hero con i prompt: 931px desktop (le campate crescono a 624px per
contenere il testo). Nessun testo che sfonda, nessuno scorrimento orizzontale.

### Quando arrivano le immagini

1. salvare i file in `wp-content/uploads/<anno>/<mese>/`;
2. in `rami.ts`: mettere il percorso in `foto`, **scrivere `fotoAlt`** guardando
   la foto, **togliere `promptFoto`**;
3. se una foto va tenuta più in alto o più in basso nel ritaglio, usare `fuoco`
   (`'50% 35%'`) — il CSS non si tocca;
4. rimisurare la velatura: quella attuale (82% / 58% / 18%) è tarata sul bianco
   e nero;
5. rieseguire `check-build.js` e il peso della homepage.

---

## B05 — La riga del titoletto non attraversa più la foto
**2026-09-04 · segnalato dal proprietario**

«Togli questa linea sulla foto e lasciala solo sulla nostra storia.»

### Cos'era

La riga da 1px del `Titoletto` **sfonda fino al bordo sinistro della finestra**:
è il segno grafico del sito, misurato sull'originale, e funziona quando il
titolo sta al bordo sinistro del contenitore. In "La nostra storia" e in "Dal
progetto alla realizzazione" il titolo sta nella colonna **destra**, con la foto
a sinistra: la riga partiva **688px prima del titolo**, cioè in mezzo alla foto,
e la tagliava in due.

Non era un difetto dell'originale ereditato: è nato con la ricostruzione, perché
il `Titoletto` è un componente e la riga non sa dove è stato messo.

### Quante volte capitava: due, e solo in homepage

Cercate misurando su **tutte le 52 rotte del build**, a 1440px: ogni
`.titoletto--rule` il cui bordo sinistro non coincide con quello del
`.container`. Due risultati, entrambi in `/`. Nelle altre 50 rotte i titoli con
riga sono tutti al bordo del contenitore, quindi la riga che sfonda è quella
giusta.

### Il fix: una manopola sul componente, non un'eccezione dentro di lui

`Titoletto.astro` legge ora la larghezza della riga da una variabile:

```css
width: var(--titoletto-rule-width, calc(100% + (100vw - 100%) / 2));
```

Il valore di default è quello di prima, quindi **nessuna delle 50 rotte cambia**.
Chi mette un titolo fuori dal bordo sinistro imposta
`--titoletto-rule-width: 100%` sul contenitore del titolo — è una variabile,
quindi eredita fino allo `::after`.

In `index.astro`, su `.home__testo`, **solo da 992px**:

```css
@media (min-width: 992px) {
  .home__testo { --titoletto-rule-width: 100%; }
}
```

Il breakpoint non è decorativo: 992px è dove `.home__duePer` diventa a due
colonne. **Sotto**, la griglia è a una colonna, il titolo torna al bordo del
contenitore e la riga che sfonda è di nuovo quella corretta — contenerla anche
lì avrebbe reso quei due titoli diversi da tutti gli altri su telefono.

`.home__testo` è usato anche in "Le nostre realizzazioni", ma là non contiene
titoli (il `Titoletto` è figlio diretto della griglia, in colonna sinistra):
impostare la variabile lì non tocca nulla.

### Verifica: misurata la riga, non lo stile dichiarato

Letto il rettangolo dello `::after` con `getComputedStyle(span, '::after')` e
confrontato con il bordo del titolo, a cinque larghezze, sul build:

| larghezza | "La nostra storia" | "Dal progetto…" | righe che attraversano contenuto |
|---|---|---|---|
| 1440 | titolo a 760, riga **da 760** larga 488 | titolo a 760, riga **da 760** larga 608 | **0** |
| 1024 | titolo a 552, riga **da 552** larga 421 | titolo a 552, riga **da 552** larga 421 | **0** |
| 991 | titolo a 50, riga da −202 (sfonda) | titolo a 50, riga da 0 (sfonda) | **0** |
| 768 | titolo a 38, riga da −136 (sfonda) | titolo a 38, riga da 0 (sfonda) | **0** |
| 390 | titolo a 20, riga da −28 (sfonda) | titolo a 20, riga da 0 (sfonda) | **0** |

Sopra i 992px la riga parte esattamente dal titolo; sotto, torna a sfondare.
Gli altri sei titoli con riga della homepage sono invariati a tutte e cinque le
larghezze ("Realizziamo il progetto…" e "Le nostre realizzazioni" continuano a
sfondare, come devono).

`astro check`: 0 errori. `npm run build`: 52 pagine.
`check-build.js`: **52 rotte × 3 viewport, nessun problema.**

### Nota sullo strumento

Lo script che ha trovato i due casi (`titoli con riga non allineati al bordo del
contenitore`) segnala **candidati, non difetti**: dopo il fix continua a
segnalarli, perché quei due titoli *sono* ancora fuori dal bordo — è la riga che
non sfonda più. Chi lo riesegue non si spaventi: la misura che conta è quella
del rettangolo dello `::after`, in tabella qui sopra.

---

## B06 — Le foto della parete sono arrivate, e la velatura non teneva

**2026-09-11**

### Cosa è entrato

Le quattro foto dell'hero non sono più segnaposto: sono generate, al loro posto,
con l'`alt` scritto guardandole. In `src/data/rami.ts` ogni ramo ha `foto`
popolata e `promptFoto` tolta — che è quello che fa sparire il riquadro
tratteggiato. Lo stato di lavoro resta come **fallback** per un eventuale ramo
futuro senza immagine, non è codice morto.

Insieme alle quattro sono entrate cinque immagini nuove che ne sostituiscono
altrettante del vecchio sito: la foto della sezione "La nostra storia", il fondo
della sezione "store", e le tre card della tassonomia realizzazioni. Più le
copertine degli articoli, riportate a `COPERTINA-ARTICOLI-*`.

Le nove stanno in `wp-content/uploads/2026/09/` (`src/assets/uploads` è un
symlink lì dentro) e sono registrate in `src/lib/immagini-locali.ts`, **fuori**
da `immagini-generate.ts`: quel file lo riscrive l'estrattore, e le immagini
fatte apposta per il rebuild sparirebbero al primo giro.

### Il peso, rimisurato su entrambi i lati con lo stesso strumento

I numeri di prima venivano da uno script ad hoc che non è nel repo. Confrontare
due misure prese con strumenti diversi non dimostra niente, quindi la tabella è
stata rifatta da capo — mirror **e** build — con `misura-peso.js`, che ora sta
in `_migrazione/`: contesto nuovo per rotta (cache vuota), 1440px, scorrimento
completo a passi di mezzo viewport, attesa della rete ferma, byte trasferiti
letti dalla Resource Timing API, tracker bloccati da entrambe le parti.

| rotta | mirror | rebuild | |
|---|---|---|---|
| `/type_stores/showroom-cat/` | **58,48 MB** · 190 richieste | **0,16 MB** · 7 | −100% |
| `/store/via-san-massimo-na/` | 22,08 MB · 150 | 1,09 MB · 49 | −95% |
| `/il-nostro-team/` | 7,67 MB · 74 | 0,28 MB · 26 | −96% |
| `/category/ultime-news-e-articoli/` | 7,10 MB · 67 | 0,18 MB · 13 | −97% |
| `/` homepage | 6,16 MB · 69 | 0,38 MB · 22 | −94% |
| `/la-nostra-storia/` | 5,12 MB · 71 | 0,19 MB · 15 | −96% |
| `/gres-costruisciearreda-consigli/` | 3,91 MB · 52 | 0,12 MB · 5 | −97% |
| `/contatti/` | 2,75 MB · 53 | 0,16 MB · 9 | −94% |
| `/realizzazioni/home-albe/` | 2,63 MB · 97 | 1,70 MB · 62 | **−35%** |
| `/services/progetto/` | 2,36 MB · 51 | 0,11 MB · 6 | −95% |
| **totale** | **118,27 MB** · 874 | **4,36 MB** · 214 | **−96%** |

`/realizzazioni/home-albe/` è l'unica rotta dove il vantaggio è piccolo: 61 foto
di galleria che nell'originale erano miniature e qui sono servite più grandi.
**Da guardare**: è la sola voce della tabella fuori scala rispetto alle altre.

**La homepage, risorsa per risorsa** (`misure-b06/risorse-homepage.js`): 0,384 MB
in 22 richieste. Le quattro foto della parete pesano **56,7 KB in tutto** —
18,6 + 14,6 + 13,7 + 9,8 — cioè meno del carattere Montserrat (37,4 KB) più il
fondo della sezione store (73,2 KB, la risorsa più pesante della pagina). L'HTML
è 9,8 KB, il CSS 9,2 KB.

Il numero della tabella vecchia (0,27 MB · 12 richieste) era **senza le foto** e
preso con l'altro script: non è il termine di paragone. Il paragone giusto è
6,16 MB · 69 richieste dell'originale, sulla stessa pagina, con lo stesso
strumento, oggi.

Controllato anche che il peso in più non fosse un artefatto della misura
(`misure-b06/scroll-a-confronto.js`): salto secco in fondo alla pagina e
scorrimento a passi danno lo stesso identico risultato, 0,38 MB · 22.

### Le insegne: dove arrivano davvero

Misurato con `misure-b06/altezze-insegna.js`, perché tutto quello che viene dopo
dipende da questi numeri:

| larghezza | campata | insegna | sale dal fondo |
|---|---|---|---|
| 1440 | 359×461 | 168px (196 "Progettazione") | 283-311px = **61-68%** |
| 900 | 450×300 | 140px (162) | 180-202px = **60-67%** |
| 390 | 390×240 | 140px (162) | 172-194px = **72-81%** |

L'insegna è alta più o meno uguale ovunque; la campata cambia da 240 a 464px.

### Il difetto: la velatura era tarata su una percentuale, non sull'insegna

Con le foto in bianco e nero la velatura era 82/58/18, poi abbassata a 80/52/14
per far vedere le foto a colori. Rimisurata sulle foto vere — nascondendo
l'insegna, fotografando il fondo come lo compone il browser e calcolando il
contrasto pixel per pixel contro il colore reale del testo, `text-shadow` non
contato perché WCAG non lo conta — **non passa**:

| stato | misura peggiore | area sotto soglia |
|---|---|---|
| a riposo | mobile · Ferramenta · descrizione **4,16:1** (serve 4,5) | 5,2% del nome di "Progettazione" |
| **puntata** | mobile · Ferramenta · descrizione **3,26:1** | **100%** delle sedi di Ferramenta su desktop |

Lo stato puntato era di gran lunga il peggiore, e non è un dettaglio
transitorio: con la tastiera `:focus-visible` lo tiene finché non ci si sposta.
Alla velatura veniva scalata l'**opacità** al 70%, quindi si alleggeriva tutta,
fondo compreso — proprio la fascia dove sta scritto qualcosa.

La causa vera però non è la densità. Lo stop di mezzo del gradiente stava a un
**42% fisso** dell'altezza, mentre l'insegna arriva al 61-68% su desktop e al
72-81% su telefono: il testo cadeva nella metà chiara del gradiente proprio dove
la campata è più bassa. È la stessa classe di difetto di **B03** — una misura
espressa in percentuale di un riquadro che cambia proporzione fra i viewport.

La prova che è lo stop e non la densità: alzare la velatura a percentuale fissa
passa solo dall'84/58/18 in su e col fiato corto (margine +0,13 sulla soglia),
mentre spostare lo stop dove arriva l'insegna porta lo stesso margine a **+2,88**
*e* lascia la velatura in alto più leggera. Tre sweep, in
`misure-b06/sweep-1…3`:

| tentativo | esito |
|---|---|
| velature piatte, stop al 42% | 80/52/14 boccia (−0,34); passa solo da 84/58/18 (+0,13) |
| opacità al 70/80/85% per lo stato puntato | boccia sempre: −1,24, −0,61, −0,23 |
| schiarire solo lo stop in alto | boccia sul nome a 390px (2,56): lì l'insegna sta **sopra** il 42% |
| stop al 70% / 85% dell'altezza | +2,88 |
| **stop in px dal fondo (200/210/320)** | **+2,53 a riposo, +1,24 puntata, a nove larghezze** |

I px vincono sulle percentuali perché inseguono l'insegna, che è la cosa da
coprire, invece della campata, che cambia da 240 a 464px.

### Il fix, e i due difetti trovati mentre lo si verificava

Velatura a riposo **84% / 58% / 10%**, puntata **84% / 48% / 0%**, con lo stop di
mezzo a `--velo-base` = 200px sotto i 769, 210px sopra, 320px da 1200 (sopra i
1200 ci sono in più i 75px che la fascia dei servizi scavalca).

**Perché due strati e non un `opacity`.** Un gradiente non si può animare:
misurato in `misure-b06/transizione-gradiente.js`, a metà di una transizione su
`background-image` il valore calcolato è già quello finale, cioè il browser lo
scambia di colpo. E scalare l'opacità di un solo strato alleggerisce tutto,
fondo compreso: è il difetto di partenza. Quindi `::after` è lo stato puntato e
resta sempre, `::before` è la differenza fino allo stato a riposo ed è quello
che si dissolve. Sovrapposti danno 84/58/10; il nero su nero si compone uguale
in qualunque ordine, quindi la scelta di quale sta sopra non cambia il colore.

**Difetto trovato subito dopo, misurando.** Con i due strati in piedi, la campata
puntata dava esattamente gli stessi numeri di quella a riposo — a due decimali.
Sospetto sbagliato numero uno: la cattura `fullPage` perde lo stato puntato.
Verificato (`misure-b06/hover-e-fullpage.js`): no, la conserva. Sospetto numero
due, quello giusto: `::before` è il **primo figlio**, e senza `z-index` finisce
dietro la foto, che è un figlio vero più avanti nel DOM. Lo strato c'era, si
dissolveva regolarmente (opacità 1 → 0, letta), e non si vedeva: la luminanza
media del fondo sotto l'insegna era 66,1 in tutti e due gli stati. Ora l'ordine
è dichiarato invece che ereditato dal DOM: 1 le velature, 2 il testo.

Senza quel controllo il commit sarebbe passato: il numero *sembrava* buono
perché la misura stava fotografando due volte lo stesso stato.

### Verifica

`misura-contrasto-parete.js`, ora in `_migrazione/` perché va rieseguito ogni
volta che cambiano le foto, i testi delle insegne o la velatura: **9 larghezze
× 4 campate × 3 blocchi di testo × 2 stati = 216 misure**, comprese le larghezze
di confine dei breakpoint (1200, 1199, 992, 769, 768).

| stato | margine peggiore | dove | area sotto soglia |
|---|---|---|---|
| a riposo | **+2,20** | 1440px · Ferramenta · sedi 6,70:1 (soglia 4,5) | **0,0%** |
| puntata | **+1,21** | 1200px · Edilizia · nome 4,21:1 (soglia 3) | **0,0%** |

Il verdetto è sul 1° percentile e non sul pixel peggiore: un pixel chiaro nel
buco fra due lettere non è un problema di leggibilità, una zona sì. Lo script
esce con 1 se una misura non passa, quindi si può usare come cancello.

Per confronto, la velatura precedente rimessa in piedi sulle stesse nove
larghezze (`misure-b06/contrasto-velatura-precedente.js`) boccia lo stato
puntato in blocco: Ferramenta · nome 2,17:1 a 390px, 2,31 a 769, 2,38 a 900;
Ceramiche · nome 2,42 a 390, 2,57 a 769; Progettazione · nome 2,22 a 390;
Ferramenta · descrizione 2,69 a 390 e 769; Ferramenta · sedi 3,20 a 390.
(L'elenco completo di quella riesecuzione non è stato letto fino in fondo: le
righe qui sopra sono quelle riportate a video.)

`astro check`: 0 errori. `npm run build`: 52 pagine.

### Cosa resta aperto

- **`check-build.js` non è stato rieseguito** dopo il cambio di velatura: è la
  prima cosa da fare, prima di qualsiasi altra modifica.
- **Baseline non aggiornate**: né `fingerprint-astro.json` né le catture. Il
  contenuto non è cambiato con questa voce, ma le immagini sì.
- `/realizzazioni/home-albe/` a 1,70 MB: l'unica rotta con un vantaggio piccolo.
- La velatura è tarata su **queste** foto e su **questi** testi. Se cambia una
  descrizione, l'insegna cambia altezza e `--velo-base` va rimisurata con
  `misure-b06/altezze-insegna.js`.

### B06 — verifica chiusa e baseline rigenerate (2026-09-11)

Il cancello di qualità mancava: ora c'è. **`check-build.js`: 52 rotte × 3
viewport, nessun problema** (errori JS, scorrimento orizzontale, immagini non
caricate, `<h1>` diverso da uno, title e meta description, canonical assoluto,
link interni rotti, `alt` mancanti).

**Baseline visiva rigenerata**: 156 catture (52 rotte × 3 viewport), 0 fallite.
Nel farlo è emerso che `screenshot.js` leggeva **sempre** `baseline/routes.txt`,
che è l'elenco del mirror: 66 rotte, comprese le 8 di archivio data, l'author
page e le pagine ritirate, e senza `/design-system/`. Puntato sul build
produceva una quindicina di 404 per viewport, che sembrano guasti e non lo sono.
Ora l'elenco è il terzo argomento e il build ha il suo,
`baseline/routes-astro.txt` (52 rotte, generato da `dist`).

**Impronta di contenuto rigenerata** e confrontata con la versione in git, così
il delta è solo quello di B01–B06 e non si mescola alle differenze della fase A.
30 pagine con differenze, **tutte immagini, nessuna parola persa**:

- le tre slide del carosello e i due loghi SVG della homepage escono di scena,
  entrano le nove immagini nuove;
- `hero-ceramiche-bagno` è riusata come hero di `/type_stores/showroom-cat/`:
  la foto del ramo e la pagina del ramo mostrano la stessa cosa;
- **due immagini generiche in meno, ed è un miglioramento.** L'hero dei cinque
  store era `Raggruppa-1648-1`, un'insegna buona per tutti; ora è la prima foto
  dello store stesso (`DSC03145-scaled` per Via San Massimo). Gli otto articoli
  avevano `Raggruppa-1648-3`, un banner "Ultime news"; ora hanno la propria
  copertina. In entrambi i casi l'immagine era già nella pagina, quindi
  l'impronta segna un'immagine in meno e zero nuove.

Unica differenza di testo: `/realizzazioni/appartamento-moderno-prima-e-dopo/`
passa da 71 a 75 parole. Sono le quattro dell'occhiello dell'hero ("I NOSTRI
PROGETTI", "REALIZZAZIONI"), che ora si vedono perché quella pagina ha un'hero:
nell'originale era `background-image: url('')`, 750px di bianco su bianco, e nel
rebuild era rimasta senza immagine. Ora è `007-VISTA-SALONE-CUCINA-scaled`.

**Quanto si schiarisce la foto quando si punta una campata**, misurato sulla
luminanza media del cielo (dalla cima della campata all'insegna): +17,1% su
Ceramiche, +16,0% su Edilizia, +16,4% su Ferramenta, +17,5% su Progettazione.
La risposta al gesto si vede, e il contrasto del testo regge (voce sopra).
