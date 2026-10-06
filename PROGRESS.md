# PROGRESS — Registro Motoria

Ultimo aggiornamento: 2026-10-06

## Milestone
- [~] M0 Fondamenta e sicurezza — tutto fatto tranne repo GitHub + Pages (bloccato: `gh` non autenticato, vedi DOMANDE D1)
- [~] M1 Modello dati, persistenza, motore di calcolo — motore di calcolo fatto e testato; manca store IndexedDB/archivio
- [~] M3 (anticipato) motore di pianificazione puro fatto e testato
- [ ] M2 Classi, alunni, impostazioni
- [ ] M4 Registro, riepilogo, verifica voti, export
- [ ] M5 Modalità campo e scambio file
- [ ] M6 Giochi della Gioventù
- [ ] M7 Rubriche, stampa, rifinitura
- [ ] M8 Collaudo e consegna

## Fatto
- Kit copiato in `~/Desktop/WORKSPACE/registro-motoria`, modelli Excel in `riferimenti/` (contengono solo alunni "(esempio)").
- Analisi dei modelli Excel (formule di Registro, Riepilogo, Dati, Giochi, Calendario) → casi di test in `tests/unit/calcolo.test.js`.
- Vite 8 + vitest 5 + Playwright (chromium) + ESLint 10; `vite-plugin-pwa`; `idb`, `exceljs`.
- `npm run privacy-check` (`scripts/privacy-check.mjs`) + hook git `pre-commit`; blocca `test.rmvoti.json` (verificato).
- `src/calcolo/` (voti, riepilogo, regola 9 giorni) · `src/pianificazione/` (date, lezioni, planner).

## Test
- `tests/unit/calcolo.test.js` — caso Rossi/Bianchi dell'Excel, 7,49/7,50, soglie esatte, AS/NV/ES/OP/Ritirato, pesi.
- `tests/unit/planner.test.js` — 11 classi, chiusure, G03 4BM = 02/11/2026, gita → slittamento solo della classe, 9 giorni.
- `tests/unit/privacy.test.js` — guardia anti-dati e assenza di API di rete in `src/`.

## Decisioni
- Usare `./node_modules/.bin/…` o `npm run …`: `npx` resta bloccato in questo ambiente.
- Config vitest separata (`vitest.config.js`) per non caricare il plugin PWA nei test.
- Pianificatore: le giornate hanno un'"ancora" (lunedì della settimana per plesso, = "non prima di");
  le giornate di progetto cadono nell'ultima lezione del progetto e non richiedono recupero;
  dopo ogni prova la lezione successiva è di recupero; cuscinetti = ultime 2 lezioni libere del quadrimestre,
  usati solo se la sequenza slitta oltre.

## Prossimo passo
M1: store IndexedDB + archivio JSON (File System Access + fallback) + backup + migrazioni; poi UI M2.
