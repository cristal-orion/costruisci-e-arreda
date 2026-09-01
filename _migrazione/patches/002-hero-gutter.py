#!/usr/bin/env python3
"""
PATCH 002 — Hero: il titolo resta troppo attaccato al bordo sinistro del riquadro.

CONTESTO
  La patch 001 ha eliminato il taglio limitando l'offset negativo allo spazio disponibile:
      left: max(-15%, calc((100% - 100vw + 108px)/2))
  Il limite però coincide *esattamente* con il bordo di .singleImage, quindi nella fascia
  in cui il bleed non entra il titolo finisce a filo del riquadro: leggibile, ma senza respiro.

FIX
  Si aggiunge un margine di sicurezza G al limite inferiore:
      left: max(-15%, calc((100% - 100vw + 108px)/2 + 60px))
  Effetto: il testo non si avvicina mai a meno di 60px dal bordo del riquadro, mentre
  sopra i ~1700px il bleed di -15% resta intatto perché il limite è più negativo di -15%.

  Seconda modifica: la regola <=768px valeva left:0, cioè 12px dal bordo (i 12px di padding
  del container). Portata a left:20px, così sul breakpoint non si passa da 12px a 60px di colpo.

GEOMETRIA
  Dentro .wrapper: 100% = larghezza container - 24px di padding, 108px = margin laterale
  di .singleImage. La distanza fra il bordo sinistro di .wrapper e quello del riquadro è
  L = (100vw - 100% - 108px)/2, quindi imporre "testo >= G dal bordo" significa left >= G - L,
  cioe' left >= G + (100% - 100vw + 108px)/2.

COMPROMESSO ACCETTATO
  Fra ~1200 e ~1500px il container Bootstrap (1140/1320px) riempie quasi tutto il riquadro:
  non e' possibile avere insieme 60px dal bordo e l'allineamento con la colonna di testo del
  resto della pagina. In quella fascia il titolo risulta rientrato di qualche decina di px
  rispetto al contenuto sottostante. Preferito al titolo a filo del bordo.

AMBITO  49 pagine, 29 bundle CSS. Idempotente. Richiede la 001 applicata.
Uso     python3 002-hero-gutter.py [--revert]
"""
import glob, os, shutil, sys

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..',
                    'costruisciearreda-static', 'costruisciearreda.it',
                    'wp-content', 'cache', 'wpo-minify', '1788241814', 'assets')
BACKUP = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'backup-002')

REPLACEMENTS = [
    # fascia >768px: limite inferiore con margine di sicurezza di 60px
    ('left:max(-15%,calc((100% - 100vw + 108px)/2))',
     'left:max(-15%,calc((100% - 100vw + 108px)/2 + 60px))'),
    # fascia <=768px: era left:0, cioè 12px dal bordo. Portato a 20px per non
    # creare un salto 12px -> 60px sul breakpoint.
    ('.boxSlider .singleImage .wrapper .infoImg{bottom:0;left:0}',
     '.boxSlider .singleImage .wrapper .infoImg{bottom:0;left:20px}'),
]

def main():
    files = sorted(glob.glob(os.path.join(ROOT, 'wpo-minify-header-*.min.css')))
    if not files:
        sys.exit(f"nessun bundle trovato in {ROOT}")

    if '--revert' in sys.argv:
        if not os.path.isdir(BACKUP):
            sys.exit("nessun backup da ripristinare")
        n = 0
        for b in glob.glob(os.path.join(BACKUP, '*.css')):
            shutil.copy2(b, os.path.join(ROOT, os.path.basename(b))); n += 1
        print(f"ripristinati {n} bundle (stato post-001)")
        return

    os.makedirs(BACKUP, exist_ok=True)
    touched = already = missing = 0
    for f in files:
        css = open(f, encoding='utf-8').read()
        orig = css
        for old, new in REPLACEMENTS:
            if new in css:
                continue
            if old in css:
                css = css.replace(old, new)
            elif old == REPLACEMENTS[0][0]:
                missing += 1
        if css == orig:
            already += 1; continue
        bak = os.path.join(BACKUP, os.path.basename(f))
        if not os.path.exists(bak):
            shutil.copy2(f, bak)
        open(f, 'w', encoding='utf-8').write(css)
        touched += 1
    print(f"bundle modificati: {touched} | già a posto: {already} | senza la 001: {missing} | totale: {len(files)}")
    if missing:
        print("  ATTENZIONE: applica prima 001-hero-responsive.py")

if __name__ == '__main__':
    main()
