import { AUTH_INIT_VAL, AUTH_TICKET_LIFETIME } from '../constants';
import { DB, MemoryDB } from '../db_classes';
import { Cryptor } from '../crypto_classes';
import KerberosTGS from './kerberosTGS';
import ServerError from '../ServerError';

/**
 * Class for functionality of Genrating Authentication ticket and Ticket Granting Ticket.
 * This does not actually create any server, just has all functionality required for auth and TGT generation.
 */
export default class KerberosAS {
  cryptor = undefined;
  tgs = undefined;
  verifyRandDB = null;
  checkRand = false;

  // Pass checkRand ture if want to verify random number sent in request and prevent replay attacks.
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

  /**
   *
   * Does not actually authenticate, must be called after doing authentication .
   *
   * @param {Number} rand random number sent in user request,can be used to detect replay attacks, if checkRand is given as true in constructor
   * @param {string} cUid1 uid for gien user which must be same on all servers, eg,ip address
   * @param {string} cUid2 uid for gien user which must be same on all servers, eg,ip address
   * @param {string} userHash hash generated from parameter specific to user, must be reproducible on client side,is used to encrypt auth ticket
   * @param {Number} lifetimeMs lifetime for authentication ticket and TGT, default = AUTH_TICKET_LIFETIME
   *
   * @returns {Object} returns object with two properites : auth as encrypted auth ticket and tgt as encrypted TGT
   */
  makeAuthTickets(
    rand,
    cUid1,
    cUid2,
    userHash,
    lifetimeMs = AUTH_TICKET_LIFETIME
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
        // IMPORTANT, unshift does not return updated array, so two different steps are reuired.
        // unshift is used as it appends at start, and if a replay attack uses latest request
        // searching will be faster, and may be more optimized.
        userData.unshift(rand);
        this.verifyRandDB.save(userStr, userData);
      }
    }
    const secreteKey = this.cryptor.getRandomKey();

    // In case this structure is changed also check Kerberos_Server/Server and Kerberos_client/Client classes as well for consistancy.
    let ticket = {};
    ticket.uid1 = String(cUid1);
    ticket.uid2 = String(cUid2);
    ticket.timestamp = Date.now();
    ticket.lifetime = lifetimeMs;
    ticket.rand = rand;
    ticket.target = 'TGS';
    ticket.key = secreteKey;

    const authTicket = this.cryptor.encrypt(
      userHash,
      JSON.stringify(ticket),
      AUTH_INIT_VAL
    );
    const tgt = this.tgs.getTGT(cUid1, cUid2, secreteKey, lifetimeMs);
    return {
      auth: authTicket,
      tgt: tgt,
    };
  }
}
