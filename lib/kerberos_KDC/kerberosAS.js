import { AUTH_INIT_VAL, AUTH_TICKET_LIFETIME } from '../constants';
import { DB, MemoryDB } from '../db_classes';
import { Cryptor } from '../crypto_classes';
import KerberosTGS from './kerberosTGS';
import ServerError from '../ServerError';

export default class KerberosAS {
  cryptor = undefined;
  tgs = undefined;
  verifyRandDB = null;
  checkRand = false;

  constructor(cryptor, tgs, checkRand = false, verifyRandDB = undefined) {
    if (!(tgs instanceof KerberosTGS)) {
      throw new TypeError(
        "'tgs' argument must be instance of Kerberos_TGS class"
      );
    }
    if (!(cryptor instanceof Cryptor)) {
      throw new TypeError(
        "'cryptor' argument must be instance of class extending Cryptor class"
      );
    }

    if (checkRand) {
      if (!verifyRandDB) {
        verifyRandDB = new MemoryDB();
      }
      if (!(verifyRandDB instanceof DB)) {
        throw new TypeError(
          "'verifyRandDB' argument must be instance of class extending DB class"
        );
      }
      this.verifyRandDB = verifyRandDB;
    }
    this.checkRand = checkRand;
    this.cryptor = cryptor;
    this.tgs = tgs;
  }

  makeAuthTickets(
    rand,
    cUid1,
    cUid2,
    userHash,
    lifetime_ms = AUTH_TICKET_LIFETIME
  ) {
    if (!(typeof userHash === 'string' || userHash instanceof String)) {
      throw new ServerError(
        "'userHash' argument must be an instance of String"
      );
    }

    if (this.checkRand) {
      const userStr = `${cUid1}-${cUid2}`;
      let userData = this.verifyRandDB.get(userStr);

      if (!userData) {
        this.verifyRandDB.save(userStr, [rand]);
      } else if (userData.includes(rand)) {
        throw new ServerError(
          'The random number has already been used by the user'
        );
      } else {
        userData.unshift(rand);
        this.verifyRandDB.save(userStr, userData);
      }
    }

    const passHashKey = userHash;
    const secreteKey = this.cryptor.getRandomKey();

    let ticket = {};
    ticket.uid1 = String(cUid1);
    ticket.uid2 = String(cUid2);
    ticket.timestamp = Date.now();
    ticket.lifetime = lifetime_ms;
    ticket.rand = rand;
    ticket.target = 'TGS';
    ticket.key = secreteKey;

    const authTicket = this.cryptor.encrypt(
      passHashKey,
      JSON.stringify(ticket),
      AUTH_INIT_VAL
    );
    const tgt = this.tgs.getTGT(cUid1, cUid2, secreteKey, lifetime_ms);
    return {
      auth: authTicket,
      tgt: tgt,
    };
  }
}
