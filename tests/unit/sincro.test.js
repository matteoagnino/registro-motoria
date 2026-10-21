import { describe, test, expect } from 'vitest';
import { comprimi, espandi } from '../../src/sincro/segnale.js';
import { aPezzi, Ricomponi } from '../../src/sincro/pezzi.js';
import { creaStatoIniziale } from '../../src/dati/seed.js';
import * as A from '../../src/dati/azioni.js';
import { creaPacchetto } from '../../src/dati/scambio.js';
import { campoVuoto, importaPacchetto, campoLivello, nDaEsportare } from '../../src/dati/campo.js';
import { preparaCiao, rispondiAlCiao, applicaPacchetto } from '../../src/sincro/protocollo.js';

// SDP come lo produce Chrome per un solo canale dati (accorciato), con indirizzi di rete privati finti.
const FP = 'sha-256 4A:AD:B9:B1:3F:82:18:3B:54:02:12:DF:3E:5D:49:6B:19:E5:7C:AB:4A:AD:B9:B1:3F:82:18:3B:54:02:12:DF';
const SDP_OFFERTA = [
  'v=0', 'o=- 4611731400430051336 2 IN IP4 127.0.0.1', 's=-', 't=0 0', 'a=group:BUNDLE 0', 'a=extmap-allow-mixed', 'a=msid-semantic: WMS',
  'm=application 51472 UDP/DTLS/SCTP webrtc-datachannel', 'c=IN IP4 192.168.1.20',
  'a=candidate:842163049 1 udp 2122260223 192.168.1.20 51472 typ host generation 0 network-id 1',
  'a=candidate:1510613869 1 udp 2122129151 fd00::1a2b 61001 typ host generation 0 network-id 2',
  'a=candidate:1876313031 1 tcp 1518280447 192.168.1.20 9 typ host tcptype active generation 0',
  'a=candidate:3 1 udp 2122194687 4b1f7e2c-1111-2222-3333-444455556666.local 53000 typ host generation 0',
  'a=ice-ufrag:Hk3Z', 'a=ice-pwd:t9yQ2mVn+8Lb1Xc0R7sKpWdE', 'a=ice-options:trickle',
  `a=fingerprint:${FP}`, 'a=setup:actpass', 'a=mid:0', 'a=sctp-port:5000', 'a=max-message-size:262144', ''
].join('\r\n');

describe('segnale nel QR', () => {
  test('il codice è corto abbastanza per un QR comodo', () => {
    const codice = comprimi(SDP_OFFERTA, 'offer');
    expect(codice.startsWith('RM1~o~')).toBe(true);
    expect(codice.length).toBeLessThan(260);
  });

  test('andata e ritorno: credenziali, impronta, ruolo e indirizzi UDP restano uguali', () => {
    const { tipo, sdp } = espandi(comprimi(SDP_OFFERTA, 'offer'));
    expect(tipo).toBe('offer');
    expect(sdp).toContain('a=ice-ufrag:Hk3Z');
    expect(sdp).toContain('a=ice-pwd:t9yQ2mVn+8Lb1Xc0R7sKpWdE');
    expect(sdp).toContain(`a=fingerprint:${FP}`);
    expect(sdp).toContain('a=setup:actpass');
    expect(sdp).toContain('m=application 9 UDP/DTLS/SCTP webrtc-datachannel');
    expect(sdp).toMatch(/a=candidate:\S+ 1 udp \d+ 192\.168\.1\.20 51472 typ host/);
    expect(sdp).toMatch(/a=candidate:\S+ 1 udp \d+ fd00::1a2b 61001 typ host/);
    expect(sdp).toMatch(/4b1f7e2c-1111-2222-3333-444455556666\.local 53000 typ host/);
    expect(sdp).not.toContain('tcp');
    expect(sdp.endsWith('\r\n')).toBe(true);
  });

  test('la risposta conserva il ruolo DTLS scelto dal dispositivo', () => {
    const risposta = SDP_OFFERTA.replace('a=setup:actpass', 'a=setup:active');
    const { tipo, sdp } = espandi(comprimi(risposta, 'answer'));
    expect(tipo).toBe('answer');
    expect(sdp).toContain('a=setup:active');
  });

  test('un codice che non è di Registro Motoria viene rifiutato con un messaggio chiaro', () => {
    expect(() => espandi('https://example.com')).toThrow(/non è un codice di Registro Motoria/);
    expect(() => espandi('RM1~o~solo-un-pezzo')).toThrow(/incompleto/);
  });

  test('senza indirizzi locali non si può collegare', () => {
    const senza = SDP_OFFERTA.split('\r\n').filter((r) => !r.startsWith('a=candidate')).join('\r\n');
    expect(() => comprimi(senza, 'offer')).toThrow(/rete/);
  });
});

describe('messaggi a pezzi sul canale', () => {
  test('un messaggio grande si divide e si ricompone identico', () => {
    const msg = { tipo: 'pacchetto', dati: 'x'.repeat(100000), accento: 'è' };
    const pezzi = aPezzi(msg, 16000);
    expect(pezzi.length).toBeGreaterThan(6);
    expect(pezzi.every((p) => p.length <= 16200)).toBe(true);
    const r = new Ricomponi();
    const fuori = pezzi.map((p) => r.aggiungi(p)).filter(Boolean);
    expect(fuori).toEqual([msg]);
  });

  test('messaggi diversi in sequenza non si mescolano', () => {
    const r = new Ricomponi();
    const fuori = [...aPezzi({ n: 1 }, 50), ...aPezzi({ n: 2, t: 'y'.repeat(300) }, 50)].map((p) => r.aggiungi(p)).filter(Boolean);
    expect(fuori).toEqual([{ n: 1 }, { n: 2, t: 'y'.repeat(300) }]);
  });
});

function macEIpad() {
  let mac = { ...creaStatoIniziale(), alunni: [] };
  mac = A.importaElencoAlunni(mac, '4BM', ['Alunno Prova 01', 'Alunno Prova 02']);
  const al = A.alunniDi(mac, '4BM');
  const ipad = importaPacchetto(campoVuoto('ipad-test'), creaPacchetto(mac, ['4BM']));
  return { mac, ipad, al };
}

describe('sincronizzazione Mac ↔ iPad (logica)', () => {
  test('i voti dell\'iPad arrivano sul Mac e tornano indietro nel pacchetto aggiornato', () => {
    const prova = macEIpad();
    const { mac, al } = prova;
    let { ipad } = prova;
    ipad = campoLivello(ipad, { classe: '4BM', alunnoId: al[0].id, giornataId: 'Q1-G01', sottoObiettivo: '1.1', indice: 0, valore: 8 });
    expect(nDaEsportare(ipad)).toBe(1);

    const { messaggio, esportato } = preparaCiao(ipad);
    expect(messaggio.classi).toEqual(['4BM']);
    const r = rispondiAlCiao(mac, messaggio);
    expect(r.esito).toMatchObject({ nuove: 1, modifiche: 0, classi: 1 });
    expect(r.stato.registrazioni.some((x) => x.alunnoId === al[0].id && x.livelli[0] === 8)).toBe(true);
    expect(r.messaggio.pacchetto.classi.map((c) => c.codice)).toEqual(['4BM']);

    const fine = applicaPacchetto(esportato, JSON.parse(JSON.stringify(r.messaggio)));
    expect(nDaEsportare(fine.campo)).toBe(0);
    expect(fine.campo.registrazioni.find((x) => x.alunnoId === al[0].id).livelli[0]).toBe(8);
  });

  test('un iPad vuoto riceve tutte le classi', () => {
    const { mac } = macEIpad();
    const { messaggio } = preparaCiao(campoVuoto('ipad-nuovo'));
    const r = rispondiAlCiao(mac, messaggio);
    expect(r.messaggio.pacchetto.classi.length).toBe(mac.classi.length);
  });

  test('un voto già sul Mac e cambiato sull\'iPad resta da confermare', () => {
    const prova = macEIpad();
    const { al } = prova;
    let { mac, ipad } = prova;
    ipad = campoLivello(ipad, { classe: '4BM', alunnoId: al[0].id, giornataId: 'Q1-G01', sottoObiettivo: '1.1', indice: 0, valore: 8 });
    mac = rispondiAlCiao(mac, preparaCiao(ipad).messaggio).stato;
    ipad = campoLivello(ipad, { classe: '4BM', alunnoId: al[0].id, giornataId: 'Q1-G01', sottoObiettivo: '1.1', indice: 0, valore: 10 });
    const r = rispondiAlCiao(mac, preparaCiao(ipad).messaggio);
    expect(r.esito).toMatchObject({ nuove: 0, modifiche: 1 });
    expect(r.stato.registrazioni.find((x) => x.alunnoId === al[0].id).livelli[0]).toBe(8);
  });

  test('dati danneggiati vengono rifiutati', () => {
    const { mac } = macEIpad();
    expect(() => rispondiAlCiao(mac, { tipo: 'ciao', voti: { formato: 'altro' } })).toThrow(/file voti/);
    expect(() => rispondiAlCiao(mac, { tipo: 'boh' })).toThrow(/inatteso/);
    expect(() => applicaPacchetto(campoVuoto('x'), { tipo: 'pacchetto', pacchetto: {} })).toThrow(/pacchetto/);
  });
});
