# Il sito: build di Astro, servito da nginx.
#
# Sta nella **radice del repo** e non dentro `costruisciearreda-astro/` per un
# motivo preciso: `costruisciearreda-astro/src/assets/uploads` è un symlink a
# `costruisciearreda-static/costruisciearreda.it/wp-content/uploads`, dove
# stanno gli originali delle immagini. Con il contesto di build limitato alla
# cartella dell'app quel symlink punta fuori e il build muore senza immagini.
#
#   docker build -t costruisciearreda .
#   docker run --rm -p 8080:80 costruisciearreda
#
# Su Coolify: applicazione di tipo **Dockerfile**, base directory `/`,
# Dockerfile `Dockerfile`, porta esposta **80**.

# --- Build ------------------------------------------------------------------
# node:22-alpine: `engines` chiede >= 22.12. Alpine va bene anche per sharp —
# verificato che il package-lock contenga `@img/sharp-linuxmusl-x64`, senza il
# quale la conversione delle immagini fallirebbe su musl.
FROM node:22-alpine AS build
WORKDIR /app

# Le dipendenze prima del codice: cambiano di rado, così il layer si riusa.
COPY costruisciearreda-astro/package.json costruisciearreda-astro/package-lock.json ./costruisciearreda-astro/
RUN --mount=type=cache,target=/root/.npm \
    cd costruisciearreda-astro && npm ci

# Gli originali delle immagini, nella posizione esatta in cui il symlink li
# cerca (476 file davvero referenziati su 735).
COPY costruisciearreda-static/costruisciearreda.it/wp-content/uploads \
     ./costruisciearreda-static/costruisciearreda.it/wp-content/uploads

# Il sito.
COPY costruisciearreda-astro ./costruisciearreda-astro
WORKDIR /app/costruisciearreda-astro

# `PUBLIC_FORM_ENDPOINT` la legge Astro **durante il build** e finisce dentro
# l'HTML: va passata qui come build arg, non alle variabili di runtime del
# container, dove non avrebbe alcun effetto. Senza, i form non vengono resi e al
# loro posto compaiono i recapiti diretti — è voluto, vedi .env.example.
# Su Coolify: variabile dell'applicazione con "Build Variable" attivo.
ARG PUBLIC_FORM_ENDPOINT=""
ENV PUBLIC_FORM_ENDPOINT=$PUBLIC_FORM_ENDPOINT

# `node_modules/.astro` è la cache delle immagini convertite: 126 MB, ed è la
# parte lenta del build (2.101 WebP generati dai 476 originali). Con la cache
# mount sopravvive fra un deploy e l'altro, quindi solo le immagini nuove
# vengono riconvertite. Senza, il build funziona comunque: ci mette di più.
RUN --mount=type=cache,target=/app/costruisciearreda-astro/node_modules/.astro \
    npm run build

# La CSP si genera **dal build**, con gli hash degli script in linea: scritta a
# mano si scollerebbe al primo componente modificato, e il browser bloccherebbe
# gli script in silenzio. Vedi deploy/genera-csp.js.
RUN node deploy/genera-csp.js dist deploy/csp.conf

# Precompressione: i file sono statici, quindi comprimerli a ogni richiesta è
# lavoro buttato. `gzip -9` una volta qui, e nginx li serve con `gzip_static`.
# `gzip -c` invece di `-k` perché il gzip di busybox non ha `-k` su tutte le
# versioni, e un flag che manca farebbe fallire il build.
RUN find dist -type f \
      \( -name '*.html' -o -name '*.css' -o -name '*.js' -o -name '*.svg' \
         -o -name '*.xml' -o -name '*.txt' \) \
      -exec sh -c 'for f; do gzip -9 -c "$f" > "$f.gz"; done' sh {} +

# --- Servizio ---------------------------------------------------------------
FROM nginx:alpine

# Il blocco server del sito prende il posto di quello di default.
COPY costruisciearreda-astro/deploy/nginx.conf /etc/nginx/conf.d/default.conf
# La mappa dei vecchi URL `?p=ID` vuole il contesto `http`: in conf.d ci finisce.
COPY costruisciearreda-astro/deploy/redirect-map.conf /etc/nginx/conf.d/00-redirect-map.conf
# I pezzi inclusi dal blocco server.
COPY costruisciearreda-astro/deploy/redirect.conf /etc/nginx/snippets/redirect.conf
COPY costruisciearreda-astro/deploy/intestazioni.conf /etc/nginx/snippets/intestazioni.conf
COPY --from=build /app/costruisciearreda-astro/deploy/csp.conf /etc/nginx/snippets/csp.conf

COPY --from=build /app/costruisciearreda-astro/dist /usr/share/nginx/html

# Se la configurazione non regge, meglio saperlo mentre si costruisce l'immagine
# che al primo avvio in produzione.
RUN nginx -t

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD wget -q --spider http://127.0.0.1/ || exit 1
