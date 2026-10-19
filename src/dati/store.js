// Store dell'applicazione: stato immutabile + autosalvataggio + notifiche.

export function creaStore(statoIniziale, { salva, ritardo = 250 } = {}) {
  let stato = statoIniziale;
  const ascoltatori = new Set();
  let timer = null;
  let inSalvataggio = Promise.resolve();

  const pianificaSalvataggio = () => {
    if (!salva) return;
    clearTimeout(timer);
    timer = setTimeout(() => {
      inSalvataggio = Promise.resolve(salva(stato)).catch((e) => {
        console.error('Salvataggio non riuscito', e);
        for (const fn of ascoltatori) fn(stato, { erroreSalvataggio: e });
      });
    }, ritardo);
  };

  return {
    get: () => stato,
    /** fn(stato) deve restituire un NUOVO stato (nessuna mutazione). */
    aggiorna(fn) {
      const nuovo = fn(stato);
      if (nuovo === stato) return stato;
      stato = nuovo;
      pianificaSalvataggio();
      for (const l of ascoltatori) l(stato, {});
      return stato;
    },
    sostituisci(nuovo) {
      stato = nuovo;
      pianificaSalvataggio();
      for (const l of ascoltatori) l(stato, { sostituito: true });
    },
    ascolta(fn) {
      ascoltatori.add(fn);
      return () => ascoltatori.delete(fn);
    },
    /** Forza il salvataggio immediato (es. prima di chiudere o esportare). */
    async salvaOra() {
      clearTimeout(timer);
      if (salva) await salva(stato);
      await inSalvataggio;
    }
  };
}
