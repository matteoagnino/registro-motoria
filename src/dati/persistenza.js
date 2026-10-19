// Persistenza locale in IndexedDB: stato corrente + backup datati (ultimi N).
import { openDB } from 'idb';

export const MAX_BACKUP = 20;
const DB_NAME = 'registro-motoria';

export function apriPersistenza(nomeDb = DB_NAME) {
  const dbp = openDB(nomeDb, 1, {
    upgrade(db) {
      db.createObjectStore('kv');
      db.createObjectStore('backup', { keyPath: 'id', autoIncrement: true });
    }
  });

  return {
    async leggi(chiave) {
      return (await dbp).get('kv', chiave);
    },
    async scrivi(chiave, valore) {
      return (await dbp).put('kv', valore, chiave);
    },
    async aggiungiBackup(stato, motivo) {
      const db = await dbp;
      await db.add('backup', { creatoIl: new Date().toISOString(), motivo, stato });
      const chiavi = await db.getAllKeys('backup');
      for (const k of chiavi.slice(0, Math.max(0, chiavi.length - MAX_BACKUP))) await db.delete('backup', k);
    },
    async elencoBackup() {
      const tutti = await (await dbp).getAll('backup');
      return tutti.map(({ id, creatoIl, motivo }) => ({ id, creatoIl, motivo })).reverse();
    },
    async leggiBackup(id) {
      return (await (await dbp).get('backup', id))?.stato ?? null;
    }
  };
}
