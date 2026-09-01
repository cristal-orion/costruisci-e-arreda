#!/usr/bin/env python3
"""
PATCH 001 — Hero delle pagine interne: il titolo viene tagliato a sinistra.

CAUSA
  .boxSlider .singleImage .wrapper .infoImg { left: -15% }
  Il blocco è spinto fuori dal container per ottenere un effetto "bleed", ma il
  genitore .boxSlider .singleImage ha overflow:hidden e margin laterale di 54px.
  Sopra i 768px non c'è nessun correttivo, quindi appena lo spazio laterale
  disponibile scende sotto il 15% della larghezza del container il testo viene
  tranciato. A 1440px il taglio è già di ~176px ("I NOSTRI PROGETTI" -> "STRI PROGETTI").
  Concausa: .title ha font-size:80px fisso, che da solo eccede il container
  sotto i ~1400px.
  Sotto i 768px esisteva già un correttivo (left:0, font-size:30px): il bug vive
  quindi nella fascia 769px - ~1450px, cioè su tutti i desktop e i tablet.

FIX
  1) left: max(-15%, calc((100% - 100vw + 108px)/2))
     Mantiene il bleed di -15% dove c'è spazio; dove non c'è, si ferma esattamente
     al bordo di .singleImage invece di sparire sotto l'overflow.
     Geometria: dentro .wrapper, 100% = larghezza container - 24px di padding,
     108px = margin laterale di .singleImage. Lo spazio libero a sinistra è
     (100vw - 108px - 100%)/2, quindi l'offset negativo massimo ammesso è il suo opposto.
  2) font-size: clamp(30px, 5.4vw, 80px) su entrambe le regole (base e <=768px).
     Agli estremi il risultato è identico a prima (30px su telefono, ~80px su
     desktop largo); elimina il salto 80px -> 30px e l'overflow nella fascia centrale.

AMBITO  49 pagine, 29 bundle CSS. Idempotente: rieseguibile senza effetti.
Uso     python3 001-hero-responsive.py [--revert]
"""
import glob, os, shutil, sys

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..',
                    'costruisciearreda-static', 'costruisciearreda.it',
                    'wp-content', 'cache', 'wpo-minify', '1788241814', 'assets')
BACKUP = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'backup-001')

REPLACEMENTS = [
    # 1) offset laterale limitato allo spazio realmente disponibile
    ('.boxSlider .singleImage .wrapper .infoImg{position:absolute;bottom:100px;left:-15%;color:#fff}',
     '.boxSlider .singleImage .wrapper .infoImg{position:absolute;bottom:100px;'
     'left:max(-15%,calc((100% - 100vw + 108px)/2));color:#fff}'),
    # 2) titolo fluido: regola base
    ('.boxSlider .singleImage .wrapper .infoImg .title{font-size:80px;font-weight:300;text-transform:uppercase}',
     '.boxSlider .singleImage .wrapper .infoImg .title{font-size:clamp(30px,5.4vw,80px);'
     'font-weight:300;text-transform:uppercase}'),
    # 3) titolo fluido: override <=768px (stesso valore, così non reintroduce il salto)
    ('.boxSlider .singleImage .wrapper .infoImg .title{font-size:30px}',
     '.boxSlider .singleImage .wrapper .infoImg .title{font-size:clamp(30px,5.4vw,80px)}'),
]

def main():
    revert = '--revert' in sys.argv
    files = sorted(glob.glob(os.path.join(ROOT, 'wpo-minify-header-*.min.css')))
    if not files:
        sys.exit(f"nessun bundle trovato in {ROOT}")

    if revert:
        if not os.path.isdir(BACKUP):
            sys.exit("nessun backup da ripristinare")
        n = 0
        for b in glob.glob(os.path.join(BACKUP, '*.css')):
            shutil.copy2(b, os.path.join(ROOT, os.path.basename(b))); n += 1
        print(f"ripristinati {n} bundle dal backup")
        return

    os.makedirs(BACKUP, exist_ok=True)
    touched = already = 0
    for f in files:
        css = open(f, encoding='utf-8').read()
        orig = css
        for old, new in REPLACEMENTS:
            if new in css:
                continue          # già applicata
            if old in css:
                css = css.replace(old, new)
        if css == orig:
            already += 1
            continue
        bak = os.path.join(BACKUP, os.path.basename(f))
        if not os.path.exists(bak):
            shutil.copy2(f, bak)
        open(f, 'w', encoding='utf-8').write(css)
        touched += 1
    print(f"bundle modificati: {touched} | già a posto: {already} | totale: {len(files)}")
    print(f"backup in: {os.path.relpath(BACKUP)}")

if __name__ == '__main__':
    main()
