/**
 * I marchi trattati, dai loghi delle pagine `/type_stores/marchi/`,
 * `/type_stores/ferramenta/` e `/type_stores/rivendita-edile/`.
 *
 * Nell'originale i loghi hanno tutti `alt=""`: per un motore di ricerca, o per
 * un assistente che deve rispondere "chi vende Mapei a Napoli?", la pagina dei
 * marchi era una griglia di 106 immagini senza nome. Qui il nome si legge.
 *
 * Il nome è quello **scritto nel logo**, controllato guardando le immagini, non
 * ricavato dal nome del file: `0008_Ellisse-1.png` è il logo Boero,
 * `ferre¦C.png` è Gianfranco Ferré Home.
 *
 * Chiave: percorso dentro `uploads`, come nei blocchi estratti.
 */
export const marchi: Record<string, string> = {
  // ferramenta
  '2024/06/well-done.png': 'Well Done',
  '2024/06/Upower.png': 'Upower',
  '2024/06/Tremolada.png': 'Tremolada',
  '2024/06/Total.png': 'Total',
  '2024/06/Teorema.png': 'Teorema',
  '2024/06/Spadeitalia.png': 'Spade Italia',
  '2024/06/silca.png': 'Silca',
  '2024/06/ITALKALI.png': 'Italkali',
  '2024/06/Impercot.png': 'Impercot',
  '2024/06/GROHEpng.png': 'Grohe',
  '2024/06/Fischer.png': 'Fischer',
  '2024/06/Far.png': 'FAR',
  '2024/06/comisa.png.png': 'Comisa',
  '2024/06/CISA.png': 'CISA',
  '2024/06/Chaffoteaux.png': 'Chaffoteaux',
  '2024/06/Catis.png': 'Catis',
  '2024/06/Castoro.png': 'Gruppo Castoro',
  '2024/06/Carson.png': 'Carson',
  '2024/06/bostik.png': 'Bostik',
  '2024/06/AUX_logo.png.png': 'AUX',
  '2024/06/arcansas.png': 'Arcansas',

  // edilizia
  '2024/06/0000_vetroasfalto.png': 'Vetroasfalto',
  '2024/06/0001_adesivi-makita-logo.png': 'Makita',
  '2024/06/0002_montolit-logo.png': 'Montolit',
  '2024/06/0003_moccia.png': 'Moccia',
  '2024/06/0004_fornaci-dcb.png': 'Fornaci DCB',
  '2024/06/0005_Gyproc_Logo_RGB.png': 'Gyproc',
  '2024/06/0006_marmorinotools_logo.png': 'Marmorino Tools',
  '2024/06/0007_linvea.png': 'Linvea',
  '2024/06/0008_Ellisse-1.png': 'Boero',
  '2024/06/0009_calceforte.png': 'Calceforte',
  '2024/06/0010_five.png': 'FI·VE',
  '2024/06/0011_gasbeton.png': 'Gasbeton',
  '2024/06/0012_schluter-systems.png': 'Schlüter-Systems',
  '2024/06/0013_ECLISSE.png': 'Eclisse',
  '2024/06/0014_CVR.png': 'CVR',
  '2024/06/Isolmant.png': 'Isolmant',
  '2024/06/Mapei.png': 'Mapei',
  '2024/06/Polymerbit.png': 'Polymerbit',
  '2024/06/kerakoll.png': 'Kerakoll',
  '2024/06/membrapol.png': 'Membrapol',

  // ceramiche e pavimenti
  '2024/06/0000_Atlas-concorde.png': 'Atlas Concorde',
  '2024/06/0001_Navarti.png': 'Navarti',
  '2024/06/0002_DUNE.png': 'Dune',
  '2024/06/0003_FIORANESE.png': 'Fioranese',
  '2024/06/0004_AVA-.png': 'La Fabbrica AVA',
  '2024/06/0005_Tonalite.png': 'Tonalite',
  '2024/06/0006_CASALGRANDE-PADANA.png': 'Casalgrande Padana',
  '2024/06/0007_Laminam.png': 'Laminam',
  '2024/06/0008_Fap-ceramiche.png': 'Fap Ceramiche',
  '2024/06/verus.png': 'Verus Ceramiche',

  // arredo bagno, rubinetteria, sanitari
  '2024/06/bongio.png': 'Bongio',
  '2024/06/fir.png': 'FIR Italia',
  '2024/06/teorema-1.png': 'Teorema',
  '2024/06/treemme.png': 'Treemme',
  '2024/06/cielo.png': 'Cielo',
  '2024/06/hatria.png': 'Hatria',
  '2024/06/grohe.png': 'Grohe',
  '2024/06/albatros.png': 'Albatros',
  '2024/06/calibe.png': 'Calibe',
  '2024/06/hafro.png': 'Hafro',
  '2024/06/megius.png': 'Megius',
  '2024/06/relax.png': 'Relax',
  '2024/06/relaxdesign.png': 'Relax Design',
  '2024/06/spring.png': 'Spring',
  '2024/06/ardeco.png': 'Ardeco',
  '2024/06/artesi.png': 'Artesi',
  '2024/06/azzurra.png': 'Azzurra',
  '2024/06/mobilcrab.png': 'Mobilcrab',
  '2024/06/puntotre.png': 'Puntotre',

  // termoarredo e riscaldamento
  '2024/06/antrax.png': 'Antrax IT',
  '2024/06/cordivari.png': 'Cordivari',
  '2024/06/globalradiator.png': 'Global Radiator',
  '2024/06/irsap.png': 'Irsap',

  // porte e serramenti
  '2024/06/ferrerolegno.png': 'FerreroLegno',
  '2024/06/fossati.png': 'Fossati Serramenti',

  // illuminazione e complementi
  '2024/06/Cristalrecord.png': 'Cristal Record',
  '2024/06/Nowodvorski.png': 'Nowodvorski',
  '2024/06/sforzin.png': 'Sforzin',
  '2024/06/slamp.png': 'Slamp',
  '2024/06/zumaline.png': 'Zumaline',
  '2024/06/edg.png': 'EDG Enzo De Gasperi',
  '2024/06/ethancloe.png': 'Ethan Chloe',
  '2024/06/garpe.png': 'Garpe Interiores',
  '2024/06/karedesign.png': 'Kare Design',
  '2024/06/qeeboo.png': 'Qeeboo',

  // carta da parati e tessuti
  '2024/06/Casadeco.png': 'Casadeco',
  '2024/06/Casamance.png': 'Casamance',
  '2024/06/caselio.png': 'Caselio',
  '2024/06/roberto_cavalli.png': 'Roberto Cavalli Home',
  '2024/06/DolceeGabbana.png': 'Dolce&Gabbana Casa',
  '2024/06/ferre¦C.png': 'Gianfranco Ferré Home',
  '2024/06/Ideco.png': 'Ideco',
  '2024/06/IndustriaEmiliana.png': 'Industria Emiliana Parati',
  '2024/06/inkiostrobianco.png': 'Inkiostro Bianco',
  '2024/06/JannelliVolpi.png': 'Jannelli & Volpi',
  '2024/06/Lamborghini.png': 'Lamborghini',
  '2024/06/Missoni.png': 'Missoni Home',
  '2024/06/PhilippPlain.png': 'Philipp Plein',
  '2024/06/Trussardi.png': 'Trussardi',
  '2024/06/Versace.png': 'Versace Home',
  '2024/06/Zambaiti.png': 'Zambaiti Parati',
  '2024/06/viaroma60.png': 'Via Roma 60',
};

/** Il nome del marchio mostrato da un logo, o `null` se l'immagine non è un logo. */
export const marchioDaLogo = (path: string | null | undefined): string | null =>
  (path && marchi[path]) || null;

/** I nomi dei marchi, senza doppioni, nell'ordine in cui compaiono. */
export const nomiMarchi = [...new Set(Object.values(marchi))];
