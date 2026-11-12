/**
 * Le foto di Home Design, con il loro `alt` scritto guardandole (voci B14, B16).
 *
 * In un posto solo perché le usano due pagine: la landing `/home-design/` e la
 * pagina del QR `/home-design/registrati/`. Gli originali stanno in
 * `wp-content/uploads/2026/10/` e sono registrati in `lib/immagini-locali.ts`.
 */
import type { ImageMetadata } from 'astro';
import { immagineObbligatoria } from '../lib/immagini';
import { rami } from './rami';
import { sedi } from './site';

/**
 * Il negozio di Home Design: è lo **Showroom Home** di Via Martiri della
 * Libertà 11bis, confermato dal proprietario il 2026-11-11 (voce B16). Letto
 * dalle sedi di `site.ts`, non riscritto: l'indirizzo sta in un posto solo.
 */
export const sedeHomeDesign = (() => {
  const s = sedi.find((x) => x.pagina === '/store/via-martiri-della-liberta-nola-na/');
  if (!s) throw new Error('La sede dello Showroom Home manca in data/site.ts');
  return s;
})();

const foto = (nome: string) => immagineObbligatoria(`2026/10/${nome}.jpg`, 'data/home-design.ts');

export type FotoHD = { src: ImageMetadata; alt: string };

export const fotoHD = {
  coniglioRosa: {
    src: foto('home-design-coniglio-rosa'),
    alt: 'Sedia a forma di coniglio in velluto fucsia davanti a una parete bordeaux.',
  },
  aliOro: {
    src: foto('home-design-ali-oro'),
    alt: 'Busto bianco con grandi ali dorate sopra una scaffalatura di ceramiche e oggetti decorativi, su una parete rosa.',
  },
  testeDiMoro: {
    src: foto('home-design-teste-di-moro'),
    alt: 'Due teste di moro in ceramica smaltata, nere con corone gialle, e una pigna gialla su una mensola illuminata di blu.',
  },
  vasoARighe: {
    src: foto('home-design-vaso-a-righe'),
    alt: 'Vaso in ceramica a righe bianche e nere con base verde e un mazzo di tulipani rossi, su un ripiano di vetro.',
  },
  bulldog: {
    src: foto('home-design-bulldog-pop'),
    alt: 'Statua di bulldog francese in stile pop con occhiali da sole, accanto a un orsetto viola.',
  },
  lampadaOro: {
    src: foto('home-design-lampada-oro'),
    alt: 'Lampada da tavolo dorata a forma di figura seduta, accanto a un vaso di vetro blu a coste.',
  },
  vasiCubisti: {
    src: foto('home-design-vasi-cubisti'),
    alt: 'Vasi e volti in ceramica bianca e nera di ispirazione cubista su una mensola dorata.',
  },
  orologi: {
    src: foto('home-design-orologi'),
    alt: 'Tre orologi da parete di grandi dimensioni, con quadrante effetto marmo e numeri romani dorati.',
  },
  seduteConiglio: {
    src: foto('home-design-sedute-coniglio'),
    alt: 'Sedute a forma di coniglio lilla e sgabello nero accanto a un tavolo con un orsetto viola e sedie gialle.',
  },
  lampadeConiglio: {
    src: foto('home-design-lampade-coniglio'),
    alt: 'Due lampade da tavolo con figure di coniglio, una dorata e una bianca, con paralume chiaro e rosa.',
  },
  quadroOro: {
    src: foto('home-design-quadro-oro'),
    alt: 'Quadro con il ritratto di una donna con decorazioni dorate, accanto a un orologio da parete e a una scultura colorata.',
  },
  carteDaParati: {
    src: foto('home-design-carte-da-parati'),
    alt: 'Espositore con i campioni di carta da parati, in fantasie botaniche dalle tinte scure e chiare.',
  },
  /* Due scatti larghi dell'interno, dalla galleria della vecchia pagina dello
     Showroom Home (uploads 2024/08): mostrano il negozio, non un oggetto. */
  negozioAli: {
    src: immagineObbligatoria('2024/08/DSC09950-scaled.jpg', 'data/home-design.ts'),
    alt: 'Interno del negozio: un busto con grandi ali dorate su una parete rosa, nicchie ad arco illuminate di blu, poltroncine in velluto e una scala che sale al piano di sopra.',
  },
  negozioVetrate: {
    src: immagineObbligatoria('2024/08/DSC09953-scaled.jpg', 'data/home-design.ts'),
    alt: 'Il negozio verso le vetrate: sedute a forma di coniglio, nicchie ad arco illuminate e tavolini dorati con vasi di fiori.',
  },
  store: {
    src: foto('hero-home-design'),
    alt:
      rami.find((r) => r.slug === 'home-design')?.fotoAlt ??
      'Interno dello store Home Design: una giraffa nera a grandezza naturale, sedute a forma di coniglio e un lampadario dorato.',
  },
} satisfies Record<string, FotoHD>;
