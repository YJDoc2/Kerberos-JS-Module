import { DB, LocalDB } from '../db_classes';
import { Cryptor, AESCryptor } from '../crypto_classes';
import KerberosAS from './kerberosAS';
import KerberosTGS from './kerberosTGS';
import { AUTH_TICKET_LIFETIME, TICKET_LIFETIME } from '../constants';

export default class KerberosKDC {
  cryptor = undefined;
  serverDB = undefined;
  TGS = undefined;
  AS = undefined;

  constructor(cryptor = undefined, serverDB = undefined) {
    if (cryptor === undefined) {
      cryptor = new AESCryptor();
    }
    if (serverDB === undefined) {
      serverDB = new LocalDB();
    }

    if (!(cryptor instanceof Cryptor)) {
      throw new TypeError(
        "'cryptor' argument must be an instance of class extending Cryptor class "
      );
    }
    if (!(serverDB instanceof DB)) {
      throw new TypeError(
        "'serverDB' argument must be an instance of class extending DB class "
      );
    }

    this.serverDB = serverDB;
    this.cryptor = cryptor;
    this.TGS = new KerberosTGS(cryptor, serverDB);
    this.AS = new KerberosAS(cryptor, this.TGS);
  }

  genAuthTickets(
    rand,
    cUid1,
    cUid2,
    userHash,
    lifetime_ms = AUTH_TICKET_LIFETIME
  ) {
    if (!(userHash instanceof String)) {
      throw new TypeError("'userHash' argument must be instance of String");
    }
    return this.AS.makeAuthTickets(rand, cUid1, cUid2, user, lifetime_ms);
  }

  addServer(sUid) {
    return this.TGS.addServer(sUid);
  }

  getResAndTicket(cUid1, cUid2, tgt, reqEncStr, lifetime_ms = TICKET_LIFETIME) {
    return this.TGS.getResponseAndTicket(
      cUid1,
      cUid2,
      tgt,
      reqEncStr,
      lifetime_ms
    );
  }
}
