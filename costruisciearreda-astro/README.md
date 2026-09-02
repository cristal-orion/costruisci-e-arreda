# costruisciearreda-astro

Ricostruzione in Astro di **costruisciearreda.it**, destinata all'editor interno
**Tharvel** (che si monta su `/tharveladmin`) e all'hosting su Coolify (VPS OVH).

Il contesto completo, le decisioni prese e lo stato di avanzamento stanno in
`../CLAUDE.md`. Il registro delle modifiche, delle misure e delle deviazioni
dichiarate rispetto al sito originale sta in `../_migrazione/CHANGELOG.md`.

## Comandi

```bash
npm run dev        # sviluppo su :4321  (oppure: astro dev --background)
npm run build      # build statico in dist/
npm run preview    # serve dist/ su :4321
```

## Come è fatto il design system

I token in `src/styles/tokens.css` non sono scelti a occhio né letti dal CSS di
Elementor: sono **misurati** sul mirror del sito originale con
`getComputedStyle`/`getBoundingClientRect`, aggregati per frequenza pesata su
16 pagine e 3 viewport. Gli script che li producono stanno in `../_migrazione/`:

```bash
cd ../costruisciearreda-static/costruisciearreda.it && python3 -m http.server 8099
cd ../_migrazione
node harvest-tokens.js http://127.0.0.1:8099 baseline/tokens-mirror.json
node harvest-layout.js http://127.0.0.1:8099 baseline/layout-mirror.json
```

Ogni volta che serve un valore nuovo — una dimensione, un colore, una distanza —
**va misurato**, non dedotto leggendo il CSS: su questo sito le regole si
sovrappongono su quattro contesti annidati e 29 bundle, e leggerle porta a
conclusioni sbagliate (è già capitato: vedi la patch 001 nel CHANGELOG).

`/design-system/` è la pagina di controllo dei token: sta fuori dalla sitemap
tramite `src/data/noindex.ts`.

## Struttura

```
src/
├── components/     componenti riusabili
├── data/           site.ts (dati azienda, fonte unica) · noindex.ts (rotte fuori indice)
├── layouts/        BaseLayout.astro — guscio HTML, meta, canonical
├── pages/          rotte
└── styles/         fonts · tokens · base · global (unico punto di ingresso)
```

## Regole non negoziabili

- `description` è **obbligatoria** nel `BaseLayout`: nell'originale mancava su 49 pagine.
- **Un solo `<h1>` per pagina**, messo dalla pagina, mai dal layout.
- `trailingSlash: 'always'`: i 56 URL indicizzati finiscono tutti con `/`.
- Niente `user-scalable=no` né `maximum-scale` nel viewport (WCAG 1.4.4).
- Le rotte che cambiano rispetto all'originale richiedono un **301**: la mappa si
  costruisce da `../_migrazione/live-sitemap/all-urls.txt`, non a memoria.
