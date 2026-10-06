# PROMPT DI AVVIO — da incollare in Claude Code (prima sessione)

Apri il Terminale sul Mac e lancia:

```bash
mkdir -p ~/Desktop/WORKSPACE/registro-motoria
cp -R ~/Desktop/WORKSPACE/programmazione_motoria_4-5/registro-motoria-kit/. ~/Desktop/WORKSPACE/registro-motoria/
cd ~/Desktop/WORKSPACE/registro-motoria
claude
```

Poi incolla questo messaggio:

---

Sei lo sviluppatore del progetto **Registro Motoria** in questa cartella. Prima di tutto leggi
integralmente `CLAUDE.md`, `SPEC.md` e `PIANO.md`, poi i file in `seed/` e i due modelli Excel che trovi
nella cartella principale (spostali in `riferimenti/`).

Compiti di questa prima sessione:
1. Crea `PROGRESS.md` (stato, milestone, task, decisioni, prossimo passo), `FEEDBACK.md` e `DOMANDE.md`
   vuoti, `CHANGELOG.md`.
2. Leggi i modelli Excel con uno script (es. Python `openpyxl` o Node `exceljs`) ed estrai casi di test
   per il motore di calcolo (SPEC §4.10).
3. Esegui la milestone **M0** e prosegui con le successive in ordine, in autonomia totale, rispettando le
   regole invalicabili (nessun dato personale su GitHub o servizi esterni, nessuna spesa).
4. Aggiorna `PROGRESS.md` dopo ogni task: se la sessione si interrompe per i limiti d'uso, il prossimo
   avvio riparte da lì.

Non chiedermi conferme: se hai un dubbio di dominio, annotalo in `DOMANDE.md`, scegli l'ipotesi più
prudente e prosegui. Fermati solo a versione grezza completata (M8) e scrivimi un riepilogo di
massimo 15 righe con cosa provare per primo.

---

Per far ripartire il lavoro automaticamente dopo i limiti d'uso, vedi `LEGGIMI.md` (script `loop.sh`).
