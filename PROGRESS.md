# PROGRESS — Registro Motoria

Ultimo aggiornamento: 2026-10-19

STATO: VERSIONE GREZZA COMPLETATA

## Milestone
- [x] M0 — repository pubblico `matteoagnino/registro-motoria` (solo codice) e GitHub Pages: https://matteoagnino.github.io/registro-motoria/
- [x] M1 Modello dati, persistenza, motore di calcolo
- [x] M2 Classi, alunni, impostazioni
- [x] M3 Orario, calendario, pianificazione automatica
- [x] M4 Registro, riepilogo, verifica voti, export Excel
- [x] M5 Modalità campo e scambio file
- [x] M6 Giochi della Gioventù
- [x] M7 Rubriche, stampa, rifinitura
- [x] M8 Collaudo e consegna

## Test
- Unitari (106): calcolo (caso Rossi/Bianchi, 7,49/7,50, soglie, stati), planner (11 classi, G03 4BM 02/11/2026,
  gita, 9 giorni, cuscinetti), dati (azioni, round-trip archivio, migrazioni, IndexedDB), scambio, giochi, privacy.
- E2E (7): classe di prova con 3 alunni, descrittore, caso Excel → stessi voti/medie/giudizi + Excel esportato,
  lezione saltata, stampa/accessibilità, flusso iPad offline completo, backup/ripristino. Zero richieste esterne.

## Decisioni
- `node_modules` è un symlink verso `~/Library/Caches/registro-motoria-deps/node_modules`: la Scrivania è su iCloud
  e la sincronizzazione bloccava la lettura dei file (test e build appesi). Dopo `npm install` rifare il symlink
  (o lanciare `npm install` nella cartella in Caches).
- Usare `npm run …` o `./node_modules/.bin/…`, non `npx` (resta appeso in questo ambiente).
- Pianificatore: ancora = lunedì "non prima di" per plesso; giornate di progetto nell'ultima lezione del progetto,
  senza recupero; cuscinetti = ultime 2 lezioni libere del quadrimestre.
- Campo: export "dall'ultimo export" tracciato con un elenco esplicito (non con gli orari dell'iPad).
- Salvataggio su IndexedDB immediato a ogni modifica; archivio su cartella dopo 4 s.

## Rifinitura grafica (2026-10-07)
- Stile approvato (direzione A+C, vedi bozze): applicato a tutte le schermate. Test aggiornati al nuovo Riepilogo.

## Stile Apple (2026-10-12)
- Approvato da Matteo e applicato a tutta l'app (vedi CHANGELOG 0.3.0). Sostituisce lo stile «pista tecnica».

## Correzioni 2026-10-19 (0.4.0)
- D2/D3/D5 risolte (vedi DOMANDE.md), D4 in stand-by, osservazione basket Manzoni alla settimana del 19/10.
- Schema v2 con migrazione; test: 113 unitari, 7 E2E. Ricerca D6/D7 in `reports/` (fuori da git).

## Batch 2026-10-19 (0.5.0)
- Import Argo, Giochi da schede 2025/26, ricezione automatica voti iPad (cartella «voti-ipad»), 7 migliorie approvate.
- Test: 129 unitari, 8 E2E. La ricezione da cartella è testata nella logica (importaAutomatico), non end-to-end:
  la File System Access API richiede la scelta manuale della cartella.

## Cronometro Giochi (0.6.0, 2026-10-19)
- Tempi registrati sull'iPad → file voti (versione 2, campo `tempi`) → risultati Giochi sul Mac.

## 0.7.0 (2026-10-19)
- D6 risolta (scala 8…1, spareggio regole/comportamento/fair play); giudizi per Argo, iscrizione Giochi, avviso pochi voti,
  memoria protetta. Test: 136 unitari, 8 E2E.

## Prossimo passo
Fase F: Matteo prova l'app con dati finti e scrive in FEEDBACK.md. App su iPad: aprire https://matteoagnino.github.io/registro-motoria/ in Safari → Aggiungi a Home.
