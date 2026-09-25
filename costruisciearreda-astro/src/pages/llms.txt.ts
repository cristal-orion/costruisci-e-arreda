/**
 * `/llms.txt` — il sito riassunto per gli assistenti AI (formato llmstxt.org).
 *
 * Un assistente che deve rispondere "dove trovo un rivenditore Mapei a Napoli?"
 * o "chi fa ristrutturazioni chiavi in mano a Nola?" legge le pagine in fretta,
 * e le pagine di questo sito sono per metà gallerie di foto. Qui gli stessi
 * fatti stanno in poche righe: chi è l'azienda, dove sono le sedi, cosa si
 * trova in ognuna, quali servizi e quali marchi.
 *
 * Tutto è **derivato** dai dati del sito (`site.ts`, `rami.ts`, `marchi.ts`, le
 * collection): si rigenera a ogni build e non si può scollare dalle pagine.
 */
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { company, sedi, site, social } from '../data/site';
import { rami } from '../data/rami';
import { nomiMarchi } from '../data/marchi';
import { descrizioneDa, testoDaHtml } from '../lib/seo';
import { isNoindex } from '../data/noindex';

const url = (percorso: string) => new URL(percorso, site.url).href;

export const GET: APIRoute = async () => {
  const servizi = await getCollection('services');
  const realizzazioni = await getCollection('realizzazioni');
  const articoli = (await getCollection('posts')).sort((a, b) =>
    (b.data.postInfo.DATA_iso ?? '').localeCompare(a.data.postInfo.DATA_iso ?? ''),
  );

  const riga = (titolo: string, percorso: string, nota?: string) =>
    `- [${titolo}](${url(percorso)})${nota ? `: ${nota}` : ''}`;

  const testo = [
    `# ${site.brand}`,
    '',
    `> ${company.legalName} (P.IVA ${company.vat}) vende materiali per l'edilizia, ceramiche, ` +
      `arredo bagno e ferramenta in provincia di Napoli, e segue progettazione e ` +
      `ristrutturazione dal sopralluogo al collaudo. Fondata nel ${company.fondazione} da ` +
      `${company.fondatore} con una ferramenta a Ponticelli (Napoli).`,
    '',
    `Telefono: ${company.phoneLabel} · Email: ${company.email} · Preventivi: ${url('/richiedi-preventivo/')}`,
    '',
    '## Sedi',
    '',
    ...sedi.map((s) => {
      const nome = `${s.tipo}${s.righe[0].includes('(Home)') ? ' Home' : ''} – ${s.indirizzo.comune}`;
      const indirizzo = `${s.indirizzo.via}, ${s.indirizzo.cap} ${s.indirizzo.comune} (${s.indirizzo.provincia})`;
      return s.pagina && !isNoindex(s.pagina)
        ? riga(nome, s.pagina, indirizzo)
        : `- ${nome}: ${indirizzo}`;
    }),
    '',
    '## Cosa si trova',
    '',
    ...rami.map((r) => riga(r.nome, r.href, r.descrizione)),
    '',
    '## Servizi di progettazione e ristrutturazione',
    '',
    ...servizi.map((s) =>
      riga(
        s.data.title,
        `/services/${s.data.slug}/`,
        s.data.metaDescription ?? descrizioneDa(testoDaHtml(s.data.corpo[0]?.html), 140),
      ),
    ),
    '',
    '## Marchi trattati',
    '',
    `${nomiMarchi.join(', ')}. Elenco completo con i loghi: ${url('/type_stores/marchi/')}`,
    '',
    '## Realizzazioni',
    '',
    riga('Tutti i lavori', '/i-nostri-lavori/'),
    ...realizzazioni.map((r) => riga(r.data.title, `/realizzazioni/${r.data.slug}/`)),
    '',
    '## Guide e articoli',
    '',
    ...articoli.map((a) =>
      riga(
        a.data.title.replace(/\?(?=\p{L})/gu, '? '),
        `/${a.data.slug}/`,
        a.data.metaDescription ?? undefined,
      ),
    ),
    '',
    '## Azienda',
    '',
    riga('La nostra storia', '/la-nostra-storia/'),
    riga('Il nostro team', '/il-nostro-team/'),
    riga('Lavora con noi', '/lavora-con-noi/'),
    riga('Contatti', '/contatti/'),
    ...social.map((s) => `- ${s.nome}: ${s.url}`),
    '',
  ].join('\n');

  return new Response(testo, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
