# CHANGELOG

## 0.5.0 — Argo, Giochi 2025/26, voti automatici e aiuti in palestra (2026-10-19)
- Import anagrafiche dall'Excel «Lista schede alunno» di Argo: anteprima, numeri di Argo per le classi vuote,
  nuovi in coda, ritirati segnati, nessun alunno cancellato, backup prima dell'import.
- Giochi secondo le schede 2025/26: riduzione del tempo ed esclusione dalla media per singola prova, circuito
  adattato, correttivo di classifica della classe (+0,5/+1), scala dei punti 8→1 o N→1.
- Voti dall'iPad al Mac in automatico: l'iPad salva il file nella cartella «voti-ipad», il Mac lo importa da solo
  (le modifiche a voti già presenti restano da confermare).
- iPad: banner «lezione di adesso» con recuperi in sospeso, anello di avanzamento e badge recuperi sulle classi,
  «Annulla» dopo ogni tocco, promemoria se ci sono voti non esportati da più di 24 ore.
- Mac: recuperi in sospeso e avanzamento delle prove nella Settimana, andamento dei voti nel Riepilogo.
- Schema dati v3 (correttivi Giochi per prova) con migrazione automatica.

## 0.4.0 — correzioni di calendario e recuperi (2026-10-19)
- 5B Boncompagni: «Venerdì 1» (10:30–12:30) dalla settimana del 19/10, ricostruito a ritroso; le settimane di
  vacanza intera non contano nell'alternanza.
- Prima settimana (14–18/09, orario ridotto) senza lezioni.
- Osservazione del progetto basket a Manzoni anticipata alla settimana del 19/10; la lezione di progetto
  successiva serve a recuperare gli assenti. Le giornate di progetto seguono la settimana indicata.
- Palestra Boncompagni inagibile fino a nuova comunicazione, con data modificabile dal Calendario.
- Prove recuperate: niente livelli a un assente senza data di recupero; «Recupera oggi» sull'iPad; peso e data
  dal giorno del recupero.
- Schema dati v2: migrazione automatica dei registri già salvati (solo dove i valori sono quelli iniziali).

## 0.3.0 — stile Apple (2026-10-12)
- Rivisto con la skill `apple-design` (emilkowalski/skills) e le Human Interface Guidelines di Apple.
- Font di sistema San Francisco (niente più font incorporati: app più leggera), titoli grandi con tracking negativo.
- Aspetto chiaro/scuro automatico dal sistema, su Mac e iPad.
- Barra laterale traslucida a gruppi (Didattica, Valutazione, Altro), nascondibile; barra strumenti traslucida.
- Livelli come capsule tinte con testo accessibile: tutte le combinazioni ≥ 4,5:1 (prima 2,4:1 sul livello 8).
- Risposta immediata alla pressione, finestre che si «materializzano», rispetto di riduci movimento / riduci trasparenza / aumenta contrasto.

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
