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
