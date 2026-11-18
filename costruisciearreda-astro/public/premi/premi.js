/* Demo locale. Astro rende lo stato iniziale; azioni e movimenti restano in memoria. */
const area = document.querySelector('[data-area]');
if (area) avviaDemo(area);

function avviaDemo(area) {
  const el = (name) => area.querySelector(`[data-${name}]`);
  const fmt = new Intl.NumberFormat('it-IT', { useGrouping: 'always' });
  const punti = (n) => fmt.format(n);
  const movimentoRidotto = matchMedia('(prefers-reduced-motion: reduce)');
  const saldoIniziale = Number(area.dataset.saldo);
  const premi = [...area.querySelectorAll('[data-premio]')].map((card) => ({
    card,
    id: card.dataset.premio,
    nome: card.dataset.nome,
    categoria: card.dataset.categoria,
    costo: Number(card.dataset.costo),
    foto: card.querySelector('img'),
    stato: card.querySelector('[data-reward-state]'),
    button: card.querySelector('[data-redeem]'),
  })).sort((a, b) => a.costo - b.costo);
  const mesi = [...area.querySelectorAll('[data-month]')].map((mese) => ({
    punti: Number(mese.dataset.month),
    barra: mese.querySelector('.chart__track > span'),
    testo: mese.querySelector('[data-month-value]'),
  }));
  const saldoEl = el('balance');
  const add = el('add');
  const reset = el('reset');
  const status = el('status');
  const note = el('demo-note');
  const noteIniziale = note.textContent;
  const ledger = el('ledger');
  const movimentiIniziali = [...ledger.children];
  const dialog = el('dialog');
  const goalHeading = el('goal-heading');
  const goalType = el('goal-type');
  const goalName = el('goal-name');
  const goalMessage = el('goal-message');
  const goalPhoto = el('goal-photo');
  const goalProgress = el('goal-progress');
  const meter = el('meter');
  const meterBar = meter.firstElementChild;
  const goalPoints = el('goal-points');
  const goalPercent = el('goal-percent');
  const goalLink = el('goal-link');
  const disponibiliEl = el('available');

  const riscattati = new Set();
  let saldo = saldoIniziale;
  let accreditati = 0;
  let selezionato = null;
  let saldoVisibile = saldoIniziale;
  let frameSaldo = 0;
  const animazioni = new Map();

  function animaSaldo(da = saldoVisibile) {
    cancelAnimationFrame(frameSaldo);
    const a = saldo;
    const disegna = (n) => { saldoVisibile = n; saldoEl.textContent = punti(n); };
    if (movimentoRidotto.matches || da === a) return disegna(a);
    const inizio = performance.now();
    function tick(ora) {
      const t = Math.min((ora - inizio) / 560, 1);
      disegna(Math.round(da + (a - da) * (1 - (1 - t) ** 3)));
      if (t < 1) frameSaldo = requestAnimationFrame(tick);
    }
    frameSaldo = requestAnimationFrame(tick);
  }

  function animaBarra(barra, asse, livello, daZero = false) {
    if (!daZero && Number(barra.style.getPropertyValue('--level')) === livello) return;
    const precedente = getComputedStyle(barra).transform;
    animazioni.get(barra)?.cancel();
    barra.style.setProperty('--level', livello);
    if (movimentoRidotto.matches) return;
    const animation = barra.animate(
      [{ transform: daZero ? `scale${asse}(0)` : precedente }, { transform: `scale${asse}(${livello})` }],
      { duration: 660, easing: 'cubic-bezier(.22, 1, .36, 1)' },
    );
    animazioni.set(barra, animation);
    animation.onfinish = () => animazioni.delete(barra);
  }

  function disegnaGrafico(entrata = false) {
    const valori = mesi.map((mese, i) => mese.punti + (i === mesi.length - 1 ? accreditati : 0));
    const scala = Math.ceil((Math.max(...valori) + 100) / 1000) * 1000;
    mesi.forEach((mese, i) => {
      mese.testo.textContent = punti(valori[i]);
      animaBarra(mese.barra, 'Y', valori[i] / scala, entrata);
    });
  }

  function disegnaObiettivo(entrata) {
    const rimanenti = premi.filter(p => !riscattati.has(p.id));
    const bloccato = rimanenti.find(p => p.costo > saldo);
    const premio = bloccato ?? rimanenti.at(-1);
    goalHeading.textContent = bloccato ? 'Prossimo premio da sbloccare' : premio ? 'Obiettivo raggiunto' : 'Catalogo completato';
    goalType.textContent = premio?.categoria ?? 'Traguardo raggiunto';
    goalName.textContent = premio?.nome ?? 'Tutti i premi riscattati';
    goalProgress.hidden = !premio;
    goalLink.hidden = !premio;
    goalPhoto.hidden = !premio;
    if (!premio) {
      goalMessage.textContent = 'Reimposta la demo per riprovare.';
      return;
    }

    const nuovoPremio = goalPhoto.dataset.prize !== premio.id;
    if (nuovoPremio) {
      const foto = premio.foto.cloneNode();
      foto.loading = 'eager';
      foto.sizes = '(min-width: 640px) 310px, 40vw';
      goalPhoto.replaceChildren(foto);
      goalPhoto.dataset.prize = premio.id;
    }
    const versoObiettivo = Math.min(saldo, premio.costo);
    const quota = versoObiettivo / premio.costo;
    goalPoints.textContent = `${punti(versoObiettivo)} / ${punti(premio.costo)} punti`;
    goalPercent.textContent = `${Math.floor(quota * 100)}%`;
    meter.setAttribute('aria-label', `Punti per ${premio.nome}`);
    meter.setAttribute('aria-valuemax', premio.costo);
    meter.setAttribute('aria-valuenow', versoObiettivo);
    if (bloccato) {
      const numero = document.createElement('strong');
      numero.textContent = `${punti(premio.costo - saldo)} punti`;
      goalMessage.replaceChildren('Ti mancano ', numero, '.');
    } else {
      goalMessage.textContent = 'Hai i punti per riscattarlo.';
    }
    goalLink.href = `#${premio.card.id}`;
    animaBarra(meterBar, 'X', quota, entrata || nuovoPremio);
  }

  function disegnaPremi() {
    let disponibili = 0;
    for (const premio of premi) {
      const riscattato = riscattati.has(premio.id);
      const pronto = !riscattato && saldo >= premio.costo;
      if (pronto) disponibili++;
      premio.card.dataset.state = riscattato ? 'done' : pronto ? 'ready' : 'locked';
      premio.stato.textContent = riscattato ? 'Punti scalati' : pronto ? 'Disponibile' : `Mancano ${punti(premio.costo - saldo)} punti`;
      premio.button.disabled = !pronto;
      premio.button.textContent = riscattato ? 'Riscattato' : pronto ? 'Riscatta' : 'Bloccato';
      if (pronto) premio.button.setAttribute('aria-label', `Riscatta ${premio.nome}`);
      else premio.button.removeAttribute('aria-label');
    }
    disponibiliEl.textContent = disponibili === 1 ? '1 premio disponibile con il tuo saldo' : `${disponibili} premi disponibili con il tuo saldo`;
  }

  function disegna(entrata = false) {
    animaSaldo(entrata ? 0 : saldoVisibile);
    disegnaGrafico(entrata);
    disegnaObiettivo(entrata);
    disegnaPremi();
  }

  function aggiungiMovimento(nome, descrizione, variazione) {
    const riga = document.createElement('li');
    const info = document.createElement('span');
    const titolo = document.createElement('strong');
    const dettaglio = document.createElement('small');
    const importo = document.createElement('strong');
    riga.setAttribute('data-assumed', '');
    titolo.textContent = nome;
    dettaglio.textContent = descrizione;
    importo.textContent = `${variazione > 0 ? '+' : '−'}${punti(Math.abs(variazione))} punti`;
    if (variazione > 0) importo.classList.add('ledger__positive');
    info.append(titolo, dettaglio);
    riga.append(info, importo);
    ledger.prepend(riga);
    if (ledger.childElementCount > 4) ledger.lastElementChild.remove();
  }

  add.addEventListener('click', () => {
    const accredito = Number(add.dataset.add);
    const sbloccati = premi.filter(p => !riscattati.has(p.id) && p.costo > saldo && p.costo <= saldo + accredito);
    saldo += accredito;
    accreditati += accredito;
    aggiungiMovimento('Ordine simulato', `Materiali · ${punti(Number(add.dataset.euro))} €`, accredito);
    const messaggio = `+${punti(accredito)} punti accreditati.`;
    const esito = sbloccati.length ? ` ${sbloccati.map(p => p.nome).join(', ')}: ${sbloccati.length === 1 ? 'ora disponibile' : 'ora disponibili'}.` : '';
    note.textContent = messaggio + esito;
    note.classList.add('is-updated');
    disegna();
    status.textContent = `${messaggio}${esito} Saldo: ${punti(saldo)} punti.`;
  });

  reset.addEventListener('click', () => {
    saldo = saldoIniziale;
    accreditati = 0;
    riscattati.clear();
    ledger.replaceChildren(...movimentiIniziali);
    note.textContent = noteIniziale;
    note.classList.remove('is-updated');
    disegna();
    status.textContent = `Demo ripristinata. Saldo: ${punti(saldo)} punti.`;
  });

  for (const premio of premi) {
    premio.button.addEventListener('click', () => {
      if (riscattati.has(premio.id) || premio.costo > saldo) return;
      selezionato = premio;
      dialog.returnValue = '';
      el('dialog-copy').textContent = `${premio.nome} costa ${punti(premio.costo)} punti. Dopo il riscatto te ne resteranno ${punti(saldo - premio.costo)}.`;
      dialog.showModal();
    });
  }

  dialog.addEventListener('close', () => {
    const premio = selezionato;
    selezionato = null;
    if (dialog.returnValue !== 'conferma' || !premio || riscattati.has(premio.id) || premio.costo > saldo) return;
    saldo -= premio.costo;
    riscattati.add(premio.id);
    aggiungiMovimento(premio.nome, 'Riscatto demo', -premio.costo);
    note.textContent = noteIniziale;
    note.classList.remove('is-updated');
    disegna();
    premio.card.querySelector('h3').focus({ preventScroll: true });
    status.textContent = `${premio.nome}: riscatto demo confermato. Saldo: ${punti(saldo)} punti.`;
  });

  movimentoRidotto.addEventListener('change', ({ matches }) => {
    if (!matches) return;
    cancelAnimationFrame(frameSaldo);
    saldoVisibile = saldo;
    saldoEl.textContent = punti(saldo);
    for (const animation of animazioni.values()) animation.cancel();
    animazioni.clear();
  });

  add.disabled = reset.disabled = false;
  disegna(true);
}
