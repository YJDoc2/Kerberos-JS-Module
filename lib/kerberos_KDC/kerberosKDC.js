import { DB, LocalDB, MemoryDB } from '../db_classes';
import { Cryptor, AESCryptor } from '../crypto_classes';
import KerberosAS from './kerberosAS';
import KerberosTGS from './kerberosTGS';
import { AUTH_TICKET_LIFETIME, TICKET_LIFETIME } from '../constants';

/**
 * An easier interface class over Authentication Server and Ticket Granting Server
 * This creates instances of KerberosAS and KerberosTGS internally and provides an interface over thier methods.
 * If the Authentication Service and Ticket Granting Service is set up on single Server,
 * then rather than maintaining individual objects of KerberosAS and KerberosTGS, this can be used.
 */
export default class KerberosKDC {
  cryptor = undefined;
  serverDB = undefined;
  TGS = undefined;
  AS = undefined;
  checkRand = false;
  verifyRandDB = null;

  constructor(
    cryptor = undefined,
    serverDB = undefined,
    checkRand = false,
    verifyRandDB = undefined
  ) {
    if (!cryptor) {
      cryptor = new AESCryptor();
    }
    if (!serverDB) {
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
    this.serverDB = serverDB;
    this.cryptor = cryptor;
    this.TGS = new KerberosTGS(cryptor, serverDB, checkRand, this.verifyRandDB);
    this.AS = new KerberosAS(cryptor, this.TGS, checkRand, this.verifyRandDB);
  }

  /**For generating initial authentication tickets.
   * Note this is supposed to be called after verifying that the user making request is a valid user,
   * as this does not performs any auth checks,but only make the tickets.
   * rand argument is the random number sent by user, and can be verified to prevent replay attacks,if checkRand is given as true in constructor
   * cUid arguments are any idetifiers such as username, ip from which user is requesting etc, in string form
   *     which will be saved inside Ticket Granting Tickets, and must be same on this server, and any other perticular server where the request is to be made.
   * userHash is any string that is specific to the pericular user, eg an sha256 hash of users's password.
   *      This must be exactly reproducable on client side.
   * lifetimems is lifetime of ticket in milliseconds, default = AUTH_TICKET_LIFETIME
   * return auth ticket , ticket granting ticket in a single object, with auth and tgt properties as respective.
   */
  genAuthTickets(
    rand,
    cUid1,
    cUid2,
    userHash,
    lifetimeMs = AUTH_TICKET_LIFETIME
  ) {
    if (!(typeof userHash === 'string' || userHash instanceof String)) {
      throw new TypeError("'userHash' argument must be instance of String");
    }
    return this.AS.makeAuthTickets(rand, cUid1, cUid2, userHash, lifetimeMs);
  }

  // Is used to generate a new server structure. This creates a server entry for Ticket Granting Service.
  // The created structure is saved in serverDB and must be exactly same on the actual server on which Kerberos_server/Server is used.
  addServer(sUid) {
    return this.TGS.addServer(sUid);
  }

  // This is used to generate tickets.
  // returns an encrypted response and encrypted ticket
  getResAndTicket(
    cUid1,
    cUid2,
    tgt,
    reqServer,
    rand,
    lifetimeMs = TICKET_LIFETIME
  ) {
    return this.TGS.getResponseAndTicket(
      cUid1,
      cUid2,
      tgt,
      reqServer,
      rand,
      lifetimeMs
    );
  }

  decryptReq(encReqStr, tgt) {
    return this.TGS.decryptReq(encReqStr, tgt);
  }

  // To verify rand sent in the request
  // Note Must be explicitly called in order to check
  verifyRand(cUid1, cUid2, rand) {
    return this.TGS.verifyRand(cUid1, cUid2, rand);
  }
}
