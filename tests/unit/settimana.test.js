import { describe, test, expect } from 'vitest';
import { fasceOrarie } from '../../src/ui/viste/oggi.js';

describe('settimana: fasce orarie', () => {
  test('lezioni con lo stesso orario finiscono nella stessa fascia, in ordine di orario', () => {
    const lezioni = [
      { inizio: '10:30', fine: '12:30' }, { inizio: '08:30', fine: '10:30' },
      { inizio: '14:30', fine: '16:30' }, { inizio: '08:30', fine: '10:30' }, { inizio: '10:30', fine: '12:30' }
    ];
    expect(fasceOrarie(lezioni).map((f) => f.chiave)).toEqual(['08:30–10:30', '10:30–12:30', '14:30–16:30']);
  });

  test('stesso inizio ma fine diversa: due fasce distinte; l\'ordine è numerico, non alfabetico', () => {
    const f = fasceOrarie([{ inizio: '10:30', fine: '12:30' }, { inizio: '8:30', fine: '10:30' }, { inizio: '10:30', fine: '11:30' }]);
    expect(f.map((x) => x.chiave)).toEqual(['8:30–10:30', '10:30–11:30', '10:30–12:30']);
  });

  test('settimana senza lezioni: nessuna fascia', () => {
    expect(fasceOrarie([])).toEqual([]);
  });
});
