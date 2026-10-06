#!/bin/bash
# Registro Motoria — ciclo di lavoro autonomo di Claude Code.
# Rilancia Claude in modalità non interattiva finché PROGRESS.md non segnala la versione grezza completata.
# Se una sessione si interrompe (limiti d'uso del piano Pro), attende e riprova.
# Uso: ./loop.sh          (interrompi in qualsiasi momento con Ctrl+C)

cd "$(dirname "$0")" || exit 1
ATTESA_MIN=30          # minuti di attesa dopo un'interruzione
MAX_CICLI=60           # sicurezza: numero massimo di cicli

# Garanzia "nessuna spesa": procede solo se Claude Code usa l'abbonamento claude.ai, non una chiave API a consumo.
if ! claude auth status 2>/dev/null | grep -q '"authMethod": *"claude.ai"'; then
  echo "STOP: Claude Code non risulta collegato all'abbonamento claude.ai (possibile uso a pagamento via API). Esegui 'claude auth login' e riprova."
  exit 1
fi

PROMPT="Leggi CLAUDE.md, PROGRESS.md, FEEDBACK.md e DOMANDE.md. Riprendi esattamente dal prossimo task non completato del PIANO.md (o dalla prossima voce aperta di FEEDBACK.md se la versione grezza è completata) e prosegui in autonomia rispettando le regole invalicabili. Aggiorna PROGRESS.md dopo ogni task."

for ((i=1; i<=MAX_CICLI; i++)); do
  if grep -q "STATO: VERSIONE GREZZA COMPLETATA" PROGRESS.md 2>/dev/null && ! grep -q "\[ \]" FEEDBACK.md 2>/dev/null; then
    echo "Lavoro completato: nessun task né feedback aperto."; break
  fi
  echo "=== Ciclo $i — $(date '+%d/%m %H:%M') ==="
  claude -p "$PROMPT" --permission-mode bypassPermissions --output-format text 2>&1 | tee -a loop.log
  STATUS=${PIPESTATUS[0]}
  if [ "$STATUS" -ne 0 ]; then
    echo "Sessione interrotta (codice $STATUS). Nuovo tentativo tra $ATTESA_MIN minuti…" | tee -a loop.log
    sleep $((ATTESA_MIN * 60))
  fi
done
