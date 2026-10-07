# CHANGELOG

## 0.2.0 — nuovo stile grafico (2026-10-07)
- Tema "pista tecnica" approvato da Matteo: gestionale scuro con griglia e accento arancio, font Archivo + IBM Plex Mono
  incorporati (offline), icone SVG, barra laterale comprimibile a icone (automatica su Registro/Riepilogo/Verifica).
- Registro compatto: livelli come blocchi colorati 10→5, fasce dei nuclei, legenda, contatori registrati/da recuperare.
- Riepilogo: medie colorate, giudizio unico «da riportare» cliccabile (definitivo marcato ✎ con il calcolato sotto),
  avvisi a icone, spiegazione del calcolo al clic sul valore.
- Modalità campo chiara ad alto contrasto: bottoni livello colorati, barra di avanzamento, navigazione alunni a colori.
- Stampa sempre chiara.
- Aggiornamenti: avviso «Nuova versione disponibile · Aggiorna ora» invece di restare bloccati sulla versione in cache.

## 0.1.0 — versione grezza (2026-10-06)
- M0: Vite + vitest + Playwright + ESLint; `.gitignore` anti-dati; `npm run privacy-check` + hook pre-commit.
- M1: motore di calcolo puro (voto prova, giudizi, pesi, medie ponderate, valore finale, soglie, stati, avvisi,
  regola 9 giorni) con il caso "Rossi" dei modelli Excel; IndexedDB, archivio JSON (File System Access + fallback),
  backup datati, schema versionato con migrazioni.
- M2: Classi e alunni (numeri fissi, Ritirato, ES, OP); Impostazioni di tutto il contenuto didattico.
- M3: pianificazione automatica 2026/27 (chiusure, venerdì alternati, basket, prova→recupero, cuscinetti,
  lezioni libere, lezioni saltate con slittamento); viste settimanale e per classe.
- M4: Registro con descrittori, Riepilogo con spiegazione del calcolo, Verifica voti stile Argo, export Excel.
- M5: modalità campo per iPad offline, pacchetto classe e file voti, import idempotente con conferma delle modifiche.
- M6: Giochi della Gioventù: tempi con penalità e correttivi, statistiche, classifiche 4ª/5ª, storico, proposta.
- M7: griglia di stampa A4 (nomi on/off), guida integrata, controlli di accessibilità di base, test zero rete.
- M8: e2e completi (7), backup/ripristino, `MANUALE.md`.
- Pubblicazione su GitHub Pages (2026-10-07): https://matteoagnino.github.io/registro-motoria/
