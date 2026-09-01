#!/usr/bin/env python3
"""
Estrae un'impronta di CONTENUTO per ogni pagina: heading, testo, immagini, link, form.
Serve a dimostrare che il sito ricostruito non ha perso contenuto rispetto all'originale.

Uso:
  python3 fingerprint.py mirror  > baseline/fingerprint-mirror.json
  python3 fingerprint.py astro   > baseline/fingerprint-astro.json   (da adattare quando esiste il build)
  python3 fingerprint.py diff baseline/fingerprint-mirror.json baseline/fingerprint-astro.json
"""
import re, os, sys, json, glob, html, unicodedata

MIRROR = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                      '..', 'costruisciearreda-static', 'costruisciearreda.it')

def norm(t):
    t = html.unescape(t)
    t = unicodedata.normalize('NFKC', t)
    t = t.replace(' ', ' ').replace('’', "'").replace('‘', "'")
    t = t.replace('“', '"').replace('”', '"').replace('–', '-').replace('—', '-')
    return re.sub(r'\s+', ' ', t).strip()

def strip_tags(s):
    return norm(re.sub(r'<[^>]+>', ' ', s))

def page_body(s):
    """Corpo utile: esclude head, script, style, commenti, i 3 menu duplicati e il footer."""
    i = s.find('<div id="page"')
    j = s.find('<footer')
    b = s[i:j] if i >= 0 and j > i else s
    b = re.sub(r'<script.*?</script>|<style.*?</style>|<!--.*?-->', ' ', b, flags=re.S)
    b = re.sub(r'<nav[^>]*id="menuContainer".*?</nav>', ' ', b, flags=re.S)
    return b

def fingerprint(path, url):
    s = open(path, encoding='utf-8', errors='replace').read()
    body = page_body(s)
    title = re.search(r'<title>(.*?)</title>', s, flags=re.S)
    desc  = re.search(r'<meta name="description" content="([^"]*)"', s)
    headings = [(m.group(1).lower(), strip_tags(m.group(2)))
                for m in re.finditer(r'<(h[1-6])[^>]*>(.*?)</\1>', body, flags=re.S)]
    headings = [(lvl, t) for lvl, t in headings if t]
    text = strip_tags(body)
    imgs = sorted({re.sub(r'-\d+x\d+(\.\w+)$', r'\1', m.group(1).split('?')[0].replace('\\/', '/').rsplit('/', 1)[-1])
                   for m in re.finditer(r'(?:src|href)="([^"]*wp-content/uploads/[^"]*\.(?:jpe?g|png|svg|webp))"', body)})
    links = sorted({m.group(1) for m in re.finditer(r'<a[^>]*href="([^"]+)"', body)
                    if not m.group(1).startswith(('#', 'javascript:', 'data:'))})
    forms = sorted({m.group(1) for m in re.finditer(r'wpcf7-f(\d+)-p\d+-o\d+', s)})
    return {
        'url': url,
        'title': norm(title.group(1)) if title else None,
        'meta_description': norm(desc.group(1)) if desc else None,
        'h1': [t for lvl, t in headings if lvl == 'h1'],
        'headings': [f'{lvl}:{t}' for lvl, t in headings],
        'word_count': len(text.split()),
        'text': text,
        'images': imgs,
        'image_count': len(imgs),
        'internal_links': len(links),
        'cf7_forms': forms,
    }

def collect():
    out = {}
    for f in sorted(glob.glob(os.path.join(MIRROR, '**', 'index.html'), recursive=True)):
        rel = os.path.relpath(f, MIRROR)
        if '/feed/' in rel.replace(os.sep, '/') or rel.startswith('wp-json'):
            continue
        d = os.path.dirname(rel).replace(os.sep, '/')
        url = '/' if d == '' else f'/{d}/'
        out[url] = fingerprint(f, url)
    return out

def diff(a_path, b_path):
    A = json.load(open(a_path)); B = json.load(open(b_path))
    problems = 0
    only_a = sorted(set(A) - set(B)); only_b = sorted(set(B) - set(A))
    if only_a:
        print(f"PAGINE PERSE ({len(only_a)}):");  [print('   ', u) for u in only_a]; problems += len(only_a)
    if only_b:
        print(f"PAGINE NUOVE ({len(only_b)}):");  [print('   ', u) for u in only_b]
    for u in sorted(set(A) & set(B)):
        a, b = A[u], B[u]
        msgs = []
        if a['title'] != b['title']:
            msgs.append(f"title: {a['title']!r} -> {b['title']!r}")
        if a['h1'] != b['h1']:
            msgs.append(f"h1: {a['h1']} -> {b['h1']}")
        wa, wb = a['word_count'], b['word_count']
        if wa and abs(wa - wb) / wa > 0.05:
            msgs.append(f"parole: {wa} -> {wb} ({100*(wb-wa)/wa:+.0f}%)")
        aw, bw = set(a['text'].split()), set(b['text'].split())
        lost = aw - bw
        if len(lost) > max(5, 0.05 * len(aw)):
            msgs.append(f"parole assenti: {len(lost)} (es. {sorted(lost)[:6]})")
        la, lb = set(a['images']), set(b['images'])
        if la - lb:
            msgs.append(f"immagini assenti: {sorted(la-lb)[:6]}{'...' if len(la-lb)>6 else ''}")
        ha = [h for h in a['headings'] if h not in b['headings']]
        if ha:
            msgs.append(f"heading assenti: {ha[:4]}{'...' if len(ha)>4 else ''}")
        if msgs:
            problems += 1
            print(f"\n### {u}")
            for m in msgs: print('   -', m)
    print(f"\n{'OK: nessuna differenza di contenuto' if problems==0 else f'{problems} pagine con differenze'}")
    return 1 if problems else 0

if __name__ == '__main__':
    if len(sys.argv) > 1 and sys.argv[1] == 'diff':
        sys.exit(diff(sys.argv[2], sys.argv[3]))
    print(json.dumps(collect(), ensure_ascii=False, indent=1))
