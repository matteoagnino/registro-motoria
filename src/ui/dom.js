// Mini-helper DOM senza framework.

/** h('div.classe#id', {attr, onclick}, ...figli) */
export function h(sel, attrs, ...figli) {
  const [tagEId, ...classi] = sel.split('.');
  const [tag, id] = tagEId.split('#');
  const el = document.createElement(tag || 'div');
  if (id) el.id = id;
  if (classi.length) el.className = classi.join(' ');
  if (attrs && (typeof attrs !== 'object' || attrs instanceof Node || Array.isArray(attrs))) {
    figli.unshift(attrs);
    attrs = null;
  }
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (k === 'class') el.className = [el.className, v].filter(Boolean).join(' ');
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else if (k === 'value') el.value = v;
    else if (k in el && k !== 'list' && typeof v !== 'string') el[k] = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  appendi(el, figli);
  return el;
}

function appendi(el, figli) {
  for (const f of figli.flat(Infinity)) {
    if (f == null || f === false) continue;
    el.append(f instanceof Node ? f : document.createTextNode(String(f)));
  }
}

export function select(opzioni, valore, attrs = {}) {
  return h('select', attrs, opzioni.map((o) => {
    const [v, t] = Array.isArray(o) ? o : [o, o];
    return h('option', { value: v, selected: String(v) === String(valore ?? '') }, t);
  }));
}

export function campo(etichetta, controllo, aiuto) {
  return h('label.campo', h('span.etichetta', etichetta), controllo, aiuto ? h('small.aiuto', aiuto) : null);
}

let toastTimer;
export function avviso(testo, tipo = 'ok') {
  let t = document.getElementById('toast');
  if (!t) {
    t = h('div#toast', { role: 'status', 'aria-live': 'polite' });
    document.body.append(t);
  }
  t.className = `toast ${tipo} visibile`;
  t.textContent = testo;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('visibile'), tipo === 'errore' ? 6000 : 2600);
}

/** Finestra modale accessibile. Restituisce una funzione di chiusura. */
export function modale(titolo, contenuto, { azioni = [], largo = false } = {}) {
  const prima = document.activeElement;
  const chiudi = () => {
    sfondo.remove();
    document.removeEventListener('keydown', esc);
    prima?.focus?.();
  };
  const esc = (e) => e.key === 'Escape' && chiudi();
  const sfondo = h('div.modale-sfondo', { onclick: (e) => e.target === sfondo && chiudi() },
    h(`div.modale${largo ? '.largo' : ''}`, { role: 'dialog', 'aria-modal': 'true', 'aria-label': titolo },
      h('header', h('h2', titolo), h('button.chiudi', { onclick: chiudi, 'aria-label': 'Chiudi' }, '×')),
      h('div.corpo', contenuto),
      h('footer', azioni.map((a) => h(`button${a.primario ? '.primario' : ''}${a.pericolo ? '.pericolo' : ''}`, {
        onclick: async () => { if ((await a.azione?.()) !== false) chiudi(); }
      }, a.testo)), h('button', { onclick: chiudi }, azioni.length ? 'Annulla' : 'Chiudi'))));
  document.body.append(sfondo);
  document.addEventListener('keydown', esc);
  sfondo.querySelector('footer button, .corpo input, .corpo select')?.focus();
  return chiudi;
}

/** Conferma esplicita (per azioni distruttive). */
export function conferma(titolo, testo, testoOk = 'Conferma', pericolo = true) {
  return new Promise((resolve) => {
    let fatto = false;
    const chiudi = modale(titolo, h('p', testo), {
      azioni: [{ testo: testoOk, pericolo, primario: !pericolo, azione: () => { fatto = true; resolve(true); } }]
    });
    const obs = new MutationObserver(() => {
      if (!document.body.contains(document.querySelector('.modale-sfondo')) && !fatto) {
        resolve(false);
        obs.disconnect();
      }
    });
    obs.observe(document.body, { childList: true });
    return chiudi;
  });
}

/** Esegue un'azione sullo store mostrando eventuali errori in modo leggibile. */
export function prova(fn, messaggioOk) {
  try {
    const r = fn();
    if (messaggioOk) avviso(messaggioOk);
    return r;
  } catch (e) {
    avviso(e.message || String(e), 'errore');
    return undefined;
  }
}
