import type { ImageMetadata } from 'astro';

import heroCeramicheBagno from '../assets/uploads/2026/09/hero-ceramiche-bagno.png';
import heroEdilizia from '../assets/uploads/2026/09/hero-edilizia.png';
import heroFerramenta from '../assets/uploads/2026/09/hero-ferramenta.png';
import heroProgettazione from '../assets/uploads/2026/09/hero-progettazione.png';
import storiaTeamEditoriale from '../assets/uploads/2026/09/storia-team-editoriale.png';
import homeStorePanoramica from '../assets/uploads/2026/09/home-store-panoramica.png';
import cardProgetti from '../assets/uploads/2026/09/card-progetti.png';
import cardRender from '../assets/uploads/2026/09/card-render.png';
import cardPrimaDopo from '../assets/uploads/2026/09/card-prima-dopo.png';

/**
 * Immagini aggiunte al rebuild, non estratte dal vecchio sito WordPress.
 *
 * Stanno fuori da `immagini-generate.ts` perché quel file viene rigenerato
 * dall'estrattore e perderebbe gli asset creati apposta per il nuovo layout.
 */
export const immaginiLocali: Record<string, ImageMetadata> = {
  '2026/09/hero-ceramiche-bagno.png': heroCeramicheBagno,
  '2026/09/hero-edilizia.png': heroEdilizia,
  '2026/09/hero-ferramenta.png': heroFerramenta,
  '2026/09/hero-progettazione.png': heroProgettazione,
  '2026/09/storia-team-editoriale.png': storiaTeamEditoriale,
  /* Non usata da nessuna pagina da quando la fascia "store" è stata rimossa
     (voce B07): il build la pota. Resta registrata perché è il fondo pronto se
     quella fascia tornerà, riusata per le sedi fisiche. */
  '2026/09/home-store-panoramica.png': homeStorePanoramica,
  '2026/09/card-progetti.png': cardProgetti,
  '2026/09/card-render.png': cardRender,
  '2026/09/card-prima-dopo.png': cardPrimaDopo,
};
