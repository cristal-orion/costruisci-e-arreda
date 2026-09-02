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
