# LEGGIMI — Kit di avvio "Registro Motoria"

## Cosa c'è in questa cartella
| File | A cosa serve |
|---|---|
| `PROMPT_AVVIO.md` | comandi da Terminale + messaggio da incollare nella prima sessione di Claude Code |
| `CLAUDE.md` | regole permanenti per Claude (privacy, nessuna spesa, stack, modo di lavorare) |
| `SPEC.md` | cosa deve fare il gestionale: dati, calcoli, pianificazione, schermate Mac e iPad |
| `PIANO.md` | 8 tappe (M0–M8) con criteri di accettazione verificabili + fase di correzioni |
| `seed/` | dati iniziali: sotto-obiettivi, indicatori, descrittori, orario, calendario 2026/27, Giochi |
| `Registro_Motoria_MODELLO_classe4/5.xlsx` | modelli Excel approvati: fonte di verità per calcoli e layout |
| `loop.sh` | fa ripartire Claude in automatico dopo i limiti d'uso |

## Come partire
1. Segui `PROMPT_AVVIO.md` (prima sessione interattiva: così vedi che parte bene).
2. Quando M0 è completata puoi lasciarlo lavorare da solo con il ciclo automatico:
   ```bash
   cd ~/Desktop/WORKSPACE/registro-motoria
   chmod +x loop.sh
   ./loop.sh
   ```
   Lo script controlla che Claude Code usi il tuo abbonamento (non una chiave API a pagamento), lancia
   Claude in autonomia, e se la sessione si interrompe per i limiti del piano Pro attende 30 minuti e
   riprende da `PROGRESS.md`. Lascia il Mac acceso e collegato alla corrente (Impostazioni → Batteria →
   impedisci lo stop automatico). Interrompi quando vuoi con Ctrl+C.
3. Per sapere a che punto è: apri `PROGRESS.md`.

## Sicurezza
- La modalità senza conferme (`bypassPermissions`) permette a Claude di eseguire comandi senza chiedere:
  lavora nella cartella del progetto e le regole di `CLAUDE.md` vietano dati su GitHub e spese, ma è
  bene lanciarla solo in questa cartella.
- Su GitHub va solo il codice. I dati degli alunni restano nel browser del Mac/iPad e nei file JSON nelle
  tue cartelle (consigliata la cartella del Drive d'istituto).

## Dopo la versione grezza
Prova l'app con dati finti, poi scrivi le osservazioni in `FEEDBACK.md`, una per riga con `- [ ]`
davanti (es. `- [ ] Il bottone 10 è troppo vicino al 9 sull'iPad`). Rilancia `./loop.sh`: Claude le
lavora una per una e le segna `- [x]`.
