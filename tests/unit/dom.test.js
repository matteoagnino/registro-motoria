// @vitest-environment jsdom
import { describe, test, expect } from 'vitest';
import { h } from '../../src/ui/dom.js';

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
