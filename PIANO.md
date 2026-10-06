# PIANO DI LAVORO — Registro Motoria v1

Ogni milestone ha task e **criteri di accettazione verificabili**. Una milestone è chiusa solo quando
tutti i criteri sono verdi. Aggiorna `PROGRESS.md` a ogni task.

## M0 — Fondamenta e sicurezza
- Repo git locale in `~/Desktop/WORKSPACE/registro-motoria`, Vite + vitest + playwright + eslint.
- `.gitignore`: `*.rmpack.json`, `*.rmvoti.json`, `*archivio*.json`, `backup/`, `dati/`, `*.xlsx` tranne `riferimenti/`.
- `npm run privacy-check`: script che fallisce se nel diff/commit compaiono file di dati, JSON con campo
  `cognomeNome` non finto, o URL di servizi esterni nel codice di runtime.
- Repository GitHub **pubblico** `matteoagnino/registro-motoria` (solo codice: Pages su repo privato richiede un piano a pagamento) + deploy GitHub Pages
  con `npm run deploy` (branch `gh-pages`). Nessuna GitHub Action a pagamento.
**Accettazione**: `npm test` verde; `npm run privacy-check` blocca un file finto `test.rmvoti.json`; build
statica funzionante; pagina Pages raggiungibile con app vuota.

## M1 — Modello dati, persistenza, motore di calcolo
- Store IndexedDB + archivio JSON (File System Access API con fallback download/upload) + backup datati.
- Import dei seed (`seed/*.json`) al primo avvio; schema versionato con migrazioni.
- Modulo `calcolo/` puro e testato: voto prova, giudizio, pesi, medie ponderate, valore finale, soglie,
  avvisi, stati, regola di recupero (SPEC §4).
**Accettazione**: test unitari che riproducono **esattamente** i valori del caso "Rossi" (SPEC §4.10) e i
casi limite (7,49/7,50, nessun indicatore, AS poi recuperato, NV, ES, OP, soglie esatte 5,5/6,5/…);
round-trip archivio JSON senza perdite.

## M2 — Classi, alunni, impostazioni
- Anagrafica 11 classi da seed; inserimento alunni (numero fisso, nuovi in coda, Ritirato non cancella).
- Editor Impostazioni: sotto-obiettivi, indicatori, descrittori, concorre Q1/Q2, pesi, soglie, obiettivi
  di scheda, obiettivi personalizzati, prove Giochi.
**Accettazione**: modifica di un descrittore riflessa ovunque; e2e: creo classe di prova con 3 alunni finti.

## M3 — Orario, calendario e pianificazione automatica
- Calendario regionale e chiusure; orario con venerdì alternati; vincoli (aula Boncompagni, basket).
- Motore: sequenza condivisa delle giornate → lezioni reali per classe; alternanza prova/recupero;
  2 cuscinetti per quadrimestre; lezioni libere (prima di Natale, fine anno); progetto basket come blocco.
- Lezione saltata con motivo → slittamento automatico; avviso se i cuscinetti finiscono.
- Viste settimanale condivisa e per classe; controllo regola dei 9 giorni.
**Accettazione**: test che generano il calendario 2026/27 di tutte le 11 classi senza lezioni in giorni di
chiusura; G03 di 4BM cade lunedì 2/11/2026; una gita inserita fa slittare tutte le giornate successive
della sola classe coinvolta; la regola dei 9 giorni non è mai violata dal pianificatore.

## M4 — Registro, riepilogo, verifica voti, export
- Registro per classe/giornata (gestionale), descrittore al tocco del livello.
- Riepilogo 1°Q/2°Q con spiegazione del calcolo; Verifica voti stile Argo.
- Export Excel: riepilogo per documento di valutazione e registro nel formato dei modelli in `riferimenti/`.
**Accettazione**: inserendo nel gestionale i dati di esempio del modello Excel classe 4 si ottengono gli
stessi voti, medie e giudizi dell'Excel (test e2e); l'Excel esportato si apre senza errori.

## M5 — Modalità campo (iPad) e scambio file
- PWA installabile offline; vista `#/campo` ottimizzata per tablet (bottoni ≥ 44 px).
- Pacchetto classe (Mac→iPad), file voti (iPad→Mac), import idempotente con gestione modifiche, backup.
**Accettazione**: test e2e (viewport iPad, offline simulato): importo pacchetto, registro 3 alunni,
esporto, importo nel gestionale → voti identici; re-import dello stesso file = nessun duplicato;
modifica successiva = segnalata come modifica.

## M6 — Giochi della Gioventù
- Inserimento risultati per classe e rilevazione; calcoli da `seed/giochi_gioventu.json` (Super Gym tempo +
  penalità, ostacoli al centesimo, prove di squadra, correttivi); statistiche; classifiche tra classi con
  punti 8…1; spareggio fair play; storico pluriennale; proposta classi da iscrivere (una 4ª, una 5ª).
**Accettazione**: test con dati finti di 5 quarte e 6 quinte → classifica e media troncata corrette.

## M7 — Rubriche, stampa, rifinitura
- Consultazione rubriche; stampa della griglia della giornata (cartaceo di riserva, nomi on/off).
- Rifinitura UI per l'uso in palestra; guida rapida integrata (in italiano).
**Accettazione**: stampa A4 leggibile; controllo accessibilità base; nessuna richiesta di rete (test).

## M8 — Collaudo e consegna della versione grezza
- Suite e2e completa, test di migrazione schema, backup/ripristino, `MANUALE.md` per Matteo
  (installazione su Mac e iPad, flusso AirDrop, backup), `CHANGELOG.md`.
- Scrivi `STATO: VERSIONE GREZZA COMPLETATA` in `PROGRESS.md`.

## Fase F — Correzioni da FEEDBACK.md (dopo la prova d'uso di Matteo)
Ciclo: leggi voci aperte → batch → test → commit → deploy → chiudi voce. Priorità: bug che falsano i
calcoli > blocchi d'uso in palestra > modifiche di layout > nuove funzioni.
