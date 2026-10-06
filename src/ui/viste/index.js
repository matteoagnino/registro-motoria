import { vistaOggi } from './oggi.js';
import { vistaCalendario } from './calendario.js';
import { vistaClassi } from './classi.js';
import { vistaRegistro } from './registro.js';
import { vistaRiepilogo } from './riepilogo.js';
import { vistaVerifica } from './verifica.js';
import { vistaRubriche } from './rubriche.js';
import { vistaGiochi } from './giochi.js';
import { vistaScambio } from './scambio.js';
import { vistaImpostazioni } from './impostazioni.js';
import { vistaGuida } from './guida.js';

export const viste = {
  oggi: vistaOggi,
  calendario: vistaCalendario,
  classi: vistaClassi,
  registro: vistaRegistro,
  riepilogo: vistaRiepilogo,
  verifica: vistaVerifica,
  rubriche: vistaRubriche,
  giochi: vistaGiochi,
  scambio: vistaScambio,
  impostazioni: vistaImpostazioni,
  guida: vistaGuida
};
