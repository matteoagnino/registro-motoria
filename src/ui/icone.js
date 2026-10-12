// Icone a tratto (SVG inline, nessuna risorsa esterna).
const NS = 'http://www.w3.org/2000/svg';

const PERCORSI = {
  oggi: 'M6.5 5h11a3 3 0 0 1 3 3v9a3 3 0 0 1-3 3h-11a3 3 0 0 1-3-3V8a3 3 0 0 1 3-3zM3.5 10h17M8 3v4M16 3v4M8.5 14.5h.01',
  calendario: 'M6.5 5h11a3 3 0 0 1 3 3v9a3 3 0 0 1-3 3h-11a3 3 0 0 1-3-3V8a3 3 0 0 1 3-3zM3.5 10h17M8 3v4M16 3v4M8 14h8M8 17h5',
  classi: 'M9 11.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3.5 19c.8-3.4 3-5 5.5-5s4.7 1.6 5.5 5M17 11.9a2.4 2.4 0 1 0 0-4.8 2.4 2.4 0 0 0 0 4.8zM15.5 14.2c2.4 0 4.3 1.4 5 4.8',
  registro: 'M8 3.5h8a3 3 0 0 1 3 3v11a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3v-11a3 3 0 0 1 3-3zM9 8.5h6M9 12h6M9 15.5h3.5',
  riepilogo: 'M5 20v-8M10 20V5.5M15 20v-6M20 20V9',
  verifica: 'M12 20.5a8.5 8.5 0 1 0 0-17 8.5 8.5 0 0 0 0 17zM8.3 12.2l2.5 2.5 5-5.2',
  rubriche: 'M6 4h8.5L18 7.5V20H6zM14 4v4h4M9 12h6M9 15.5h6',
  giochi: 'M12 14a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM9.2 13.3 8 20.5l4-2.3 4 2.3-1.2-7.2',
  scambio: 'M7 9.5 12 4.5l5 5M12 4.5v11M5 19.5h14',
  impostazioni: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM12 2.8v2.6M12 18.6v2.6M2.8 12h2.6M18.6 12h2.6M5.5 5.5l1.8 1.8M16.7 16.7l1.8 1.8M5.5 18.5l1.8-1.8M16.7 7.3l1.8-1.8',
  guida: 'M12 20.5a8.5 8.5 0 1 0 0-17 8.5 8.5 0 0 0 0 17zM9.6 9.4a2.5 2.5 0 1 1 3.6 2.2c-.8.4-1.2 1-1.2 1.9M12 16.6h.01',
  campo: 'M7.5 3h9a2.5 2.5 0 0 1 2.5 2.5v13a2.5 2.5 0 0 1-2.5 2.5h-9A2.5 2.5 0 0 1 5 18.5v-13A2.5 2.5 0 0 1 7.5 3zM11 18h2',
  sidebar: 'M6.5 5h11a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3h-11a3 3 0 0 1-3-3V8a3 3 0 0 1 3-3zM9.5 5v14',
  comprimi: 'M14.5 5.5 8 12l6.5 6.5',
  espandi: 'M9.5 5.5 16 12l-6.5 6.5',
  indietro: 'M14.5 5.5 8 12l6.5 6.5',
  stampa: 'M7 9V4h10v5M7 17H5.5a1.5 1.5 0 0 1-1.5-1.5V11a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4.5a1.5 1.5 0 0 1-1.5 1.5H17M7 14h10v6H7z',
  esporta: 'M12 3.5v11M8 7.5l4-4 4 4M7 11H5.5v9h13v-9H17',
  info: 'M12 20.5a8.5 8.5 0 1 0 0-17 8.5 8.5 0 0 0 0 17zM12 11v5M12 8h.01'
};

export function icona(nome, classe = 'ico') {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('class', classe);
  svg.setAttribute('aria-hidden', 'true');
  const p = document.createElementNS(NS, 'path');
  p.setAttribute('d', PERCORSI[nome] ?? '');
  svg.append(p);
  return svg;
}
