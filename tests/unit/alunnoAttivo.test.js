import { describe, test, expect } from 'vitest';
import { schedaFatta, appenaCompletata, prossimoDaRegistrare } from '../../src/ui/campo/alunnoAttivo.js';

const stati = (...s) => s.map((st, i) => [{ numero: i + 1 }, st]);

describe('alunno attivo in palestra', () => {
  test('completo, assente ed esonerato contano come scheda fatta', () => {
    expect(['completo', 'assente', 'es'].every(schedaFatta)).toBe(true);
    expect(['vuoto', 'incompleto'].some(schedaFatta)).toBe(false);
  });

  test('il passaggio scatta solo quando la scheda diventa fatta', () => {
    expect(appenaCompletata('incompleto', 'completo')).toBe(true);
    expect(appenaCompletata('vuoto', 'assente')).toBe(true);
    expect(appenaCompletata('completo', 'completo')).toBe(false);
    expect(appenaCompletata('completo', 'incompleto')).toBe(false);
    expect(appenaCompletata('vuoto', 'incompleto')).toBe(false);
  });

  test('il prossimo è il primo alunno successivo ancora da registrare', () => {
    expect(prossimoDaRegistrare(stati('completo', 'completo', 'vuoto', 'incompleto'), 1)).toBe(3);
    expect(prossimoDaRegistrare(stati('vuoto', 'completo', 'es', 'incompleto'), 2)).toBe(4);
  });

  test('arrivati in fondo riparte dai primi rimasti indietro', () => {
    expect(prossimoDaRegistrare(stati('vuoto', 'completo', 'completo'), 3)).toBe(1);
  });

  test('nessun prossimo quando la classe è tutta registrata', () => {
    expect(prossimoDaRegistrare(stati('completo', 'assente', 'es'), 2)).toBeNull();
  });
});
