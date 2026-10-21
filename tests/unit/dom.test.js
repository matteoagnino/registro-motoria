// @vitest-environment jsdom
import { describe, test, expect, vi } from 'vitest';
import { h } from '../../src/ui/dom.js';
import { evidenziaOvunque } from '../../src/ui/campo/alunnoAttivo.js';

describe('h(): selettore tag.classe#id', () => {
  test('id dopo le classi (es. avviso della cartella archivio)', () => {
    const el = h('div.banner-aggiorna#banner-cartella');
    expect(el.id).toBe('banner-cartella');
    expect(el.className).toBe('banner-aggiorna');
  });

  test('id prima delle classi e più classi', () => {
    const el = h('section#alunno-3.scheda-alunno.completo');
    expect(el.tagName).toBe('SECTION');
    expect(el.id).toBe('alunno-3');
    expect([...el.classList]).toEqual(['scheda-alunno', 'completo']);
  });

  test('un avviso con lo stesso id si sostituisce invece di accumularsi', () => {
    for (let i = 0; i < 3; i++) {
      document.getElementById('banner-cartella')?.remove();
      document.body.append(h('div.banner-aggiorna#banner-cartella'));
    }
    expect(document.querySelectorAll('.banner-aggiorna')).toHaveLength(1);
  });
});

describe('elenco della classe a lato', () => {
  test('cambiando alunno attivo l\'elenco si evidenzia ma resta fermo; la barra in fondo invece scorre', () => {
    const voce = (n) => h('button', { dataset: { numero: n } }, `Alunno Prova ${n}`);
    const elenco = h('aside.elenco-classe', [1, 2, 3].map(voce));
    const barra = h('nav.nav-alunni.segui', [1, 2, 3].map(voce));
    elenco.scrollTo = vi.fn();
    barra.scrollTo = vi.fn();
    document.body.replaceChildren(elenco, barra);
    const raf = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((fn) => { fn(); return 0; });
    evidenziaOvunque(3);
    expect(elenco.querySelector('[aria-current="true"]').dataset.numero).toBe('3');
    expect(elenco.scrollTo).not.toHaveBeenCalled();
    expect(raf).toHaveBeenCalledTimes(1); // solo la barra in fondo
    raf.mockRestore();
  });
});
