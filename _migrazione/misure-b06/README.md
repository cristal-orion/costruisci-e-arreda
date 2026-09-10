# Le misure della voce B06

Prove one-shot, tenute perché sono l'unica cosa che dimostra i numeri scritti
nel CHANGELOG. Non sono strumenti da rieseguire a ogni giro: i due che servono
ancora domani stanno nella cartella sopra, `_migrazione/misura-peso.js` e
`_migrazione/misura-contrasto-parete.js`.

Vogliono il build servito su `http://localhost:4321` (`npm run preview`) —
`127.0.0.1` non basta, il preview si lega solo a `localhost`. Si lanciano da qui
senza `NODE_PATH`: `playwright` sta in `_migrazione/node_modules`.

| script | cosa ha misurato | cosa ne è uscito |
|---|---|---|
| `risorse-homepage.js` | ogni risorsa della homepage con i byte trasferiti | 0,384 MB in 22 richieste, di cui 56,7 KB le quattro foto della parete |
| `scroll-a-confronto.js` | salto secco in fondo alla pagina contro scorrimento a passi | identici (0,38 MB · 22): il peso in più **non** era il modo di misurare |
| `altezze-insegna.js` | quanto sale l'insegna dal fondo della campata | 172-194px su telefono, 180-202 su tablet, 283-311 su desktop |
| `dettaglio-per-campata.js` | contrasto riquadro per riquadro, con percentili | la velatura 80/52/14 bocciava su 6 misure |
| `sweep-1-velature-piatte.js` | velature via via più dense, stop fisso al 42% | passa solo dall'84/58/18 in su, e col fiato corto (+0,13) |
| `sweep-2-stop-in-percentuale.js` | stop di mezzo al 70% / 85% invece che al 42% | margine da +0,13 a +2,88 |
| `sweep-3-stop-in-px.js` | stop ancorato in px dal fondo, a nove larghezze | 200/210/320px: passa ovunque, anche puntata |
| `transizione-gradiente.js` | se un gradiente si può animare | no: il valore calcolato salta subito a quello finale |
| `hover-e-fullpage.js` | se `fullPage` conserva lo stato puntato | sì — a non funzionare era lo strato, non la cattura |
| `verifica-strato-mobile.js` | opacità dello strato che si dissolve | 1 → 0, mentre la luminanza non cambiava: strato dietro la foto |
| `contrasto-velatura-precedente.js` | la velatura di prima, alle stesse nove larghezze | lo stato puntato boccia in blocco |
