/**
 * Pagine del sito che il build **non genera più**, e dove porta ora il loro URL.
 *
 * Fonte unica, letta da tre posti:
 *  - `pages/store/[slug].astro` non genera la pagina;
 *  - `lib/immagini.ts` (`rotta()`) riscrive verso la destinazione i link dei
 *    contenuti estratti, che puntano ancora al vecchio page-id;
 *  - `_migrazione/build-redirect.js` ne fa i 301 di nginx (legge questo file
 *    con un'espressione regolare: **una voce per riga**, `perche` fra doppi apici).
 */
export const rotteRitirate: Record<string, { a: string; perche: string }> = {
  '/store/via-martiri-della-liberta-nola-na/': { a: '/home-design/', perche: "lo Showroom Home di Via Martiri 11bis è il negozio di Home Design: la landing /home-design/ prende il suo posto (decisione del 2026-11-14, voce B17)" },
};

/** La rotta da linkare oggi: la destinazione, se la rotta è stata ritirata. */
export const rottaAttuale = (r: string): string => rotteRitirate[r]?.a ?? r;
