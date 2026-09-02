// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { isNoindex } from './src/data/noindex.ts';

export default defineConfig({
  // Dominio di destinazione: serve per canonical, og:url e sitemap.
  site: 'https://costruisciearreda.it',

  // Tutti i 56 URL indicizzati del sito originale finiscono con "/":
  // vanno riprodotti identici, altrimenti servono 301 evitabili.
  trailingSlash: 'always',
  build: { format: 'directory' },

  integrations: [
    // La sitemap non deve contenere le rotte noindex: la lista sta in
    // src/data/noindex.ts, così è una sola e non va tenuta allineata a mano.
    sitemap({ filter: (page) => !isNoindex(new URL(page).pathname) }),
  ],

  // Un solo file CSS: il sito originale ne aveva 22 da 700 KB.
  vite: {
    build: {
      cssCodeSplit: false,
    },
  },
});
