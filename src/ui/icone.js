// Icone a tratto (SVG inline, nessuna risorsa esterna).
const NS = 'http://www.w3.org/2000/svg';

const PERCORSI = {
  oggi: 'M4 6h16M4 12h16M4 18h10',
  calendario: 'M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2zM4 10h16M9 3v4M15 3v4',
  classi: 'M9 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM17 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM3 19c1-3.5 3.5-5 6-5s5 1.5 6 5M15 15c2.5 0 4.5 1 5.5 4',
  registro: 'M7 4h10a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM9 9h6M9 13h6M9 17h3',
  riepilogo: 'M5 19v-8M10 19V5M15 19v-6M20 19V8',
  verifica: 'M5 12l4 4 10-10',
  rubriche: 'M6 4h9l3 3v13H6zM9 11h6M9 15h6',
  giochi: 'M12 14a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM9 13l-2 7 5-3 5 3-2-7',
  scambio: 'M7 10l5-5 5 5M12 5v11M5 19h14',
  impostazioni: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1',
  guida: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .9-1 1.7M12 17h.01',
  campo: 'M8 3h8a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM11 18h2',
  comprimi: 'M15 6l-6 6 6 6',
  espandi: 'M9 6l6 6-6 6',
  indietro: 'M15 6l-6 6 6 6',
  stampa: 'M7 9V4h10v5M7 17H5a1 1 0 0 1-1-1v-5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v5a1 1 0 0 1-1 1h-2M7 14h10v6H7z',
  esporta: 'M12 4v11M7 10l5 5 5-5M5 20h14'
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
