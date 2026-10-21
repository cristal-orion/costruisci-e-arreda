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
import heroHomeDesign from '../assets/uploads/2026/10/hero-home-design.jpg';
import homeDesignTesteDiMoro from '../assets/uploads/2026/10/home-design-teste-di-moro.jpg';
import homeDesignSeduteConiglio from '../assets/uploads/2026/10/home-design-sedute-coniglio.jpg';
import homeDesignBulldogPop from '../assets/uploads/2026/10/home-design-bulldog-pop.jpg';
import homeDesignVasoARighe from '../assets/uploads/2026/10/home-design-vaso-a-righe.jpg';
import homeDesignVasiCubisti from '../assets/uploads/2026/10/home-design-vasi-cubisti.jpg';
import homeDesignOrologi from '../assets/uploads/2026/10/home-design-orologi.jpg';
import homeDesignLampadaOro from '../assets/uploads/2026/10/home-design-lampada-oro.jpg';
import homeDesignLampadeConiglio from '../assets/uploads/2026/10/home-design-lampade-coniglio.jpg';
import homeDesignConiglioRosa from '../assets/uploads/2026/10/home-design-coniglio-rosa.jpg';
import homeDesignCarteDaParati from '../assets/uploads/2026/10/home-design-carte-da-parati.jpg';
import homeDesignAliOro from '../assets/uploads/2026/10/home-design-ali-oro.jpg';
import homeDesignQuadroOro from '../assets/uploads/2026/10/home-design-quadro-oro.jpg';

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
  /* Home Design (voce B14): foto dello store, scelte da `Costruisci_e_Arreda_foto/`
     e ridotte a 2000–2400px sul lato lungo, in sRGB e senza metadati. */
  '2026/10/hero-home-design.jpg': heroHomeDesign,
  '2026/10/home-design-teste-di-moro.jpg': homeDesignTesteDiMoro,
  '2026/10/home-design-sedute-coniglio.jpg': homeDesignSeduteConiglio,
  '2026/10/home-design-bulldog-pop.jpg': homeDesignBulldogPop,
  '2026/10/home-design-vaso-a-righe.jpg': homeDesignVasoARighe,
  '2026/10/home-design-vasi-cubisti.jpg': homeDesignVasiCubisti,
  '2026/10/home-design-orologi.jpg': homeDesignOrologi,
  '2026/10/home-design-lampada-oro.jpg': homeDesignLampadaOro,
  '2026/10/home-design-lampade-coniglio.jpg': homeDesignLampadeConiglio,
  '2026/10/home-design-coniglio-rosa.jpg': homeDesignConiglioRosa,
  '2026/10/home-design-carte-da-parati.jpg': homeDesignCarteDaParati,
  '2026/10/home-design-ali-oro.jpg': homeDesignAliOro,
  '2026/10/home-design-quadro-oro.jpg': homeDesignQuadroOro,
};
