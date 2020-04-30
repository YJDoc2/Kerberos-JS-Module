import {
  TGT_INIT_VAL,
  TICKET_LIFETIME,
  SERVER_INIT_RAND_MAX,
  SERVER_INIT_RAND_MIN,
} from '../constants';
import ServerError from '../ServerError';
import { Cryptor } from '../crypto_classes';
import { DB, MemoryDB } from '../db_classes/';

/**
 * Class for functionality of Genrating Authentication ticket and Ticket Granting Ticket.
 * This does not actually create any server, just has all functionality required for auth and TGT generation.
 */
export default class KerberosTGS {
  cryptor = undefined;
  db = undefined;
  key = undefined;
  checkRand = false;
  verifyRandDB = null;

  // Pass check rand if want to verify random number sent in request and prevent replay attacks.
  constructor(cryptor, db, checkRand = false, verifyRandDB = undefined) {
    if (!(cryptor instanceof Cryptor)) {
      throw new TypeError(
        "'cryptor' argument must be an instance of class extending class Cryptor"
      );
    }
    if (!(db instanceof DB)) {
      throw new TypeError(
        "'cryptor' argument must be an instance of class extending class Cryptor"
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
    this.db = db;
    try {
      const server = db.get('TGS_SERVER');
      this.key = server.key;
    } catch (e) {
      this.key = this.cryptor.getRandomKey();
      //! CHANGE THIS, maybe add IP address as uid2
      const name = 'TGS_SERVER';
      let server = {};
      server.uid1 = 'TGS';
      server.uid2 = 'SERVER';
      server.key = this.key;
      this.db.save(name, server);
    }
  }

  // To generate a Server structure and save it in db passed in constructor.
  // The same structure must be used on a perticular server.
  addServer(sUid) {
    const name = String(sUid);
    const sercreteKey = this.cryptor.getRandomKey();
    let server = {};
    server.uid = name;
    server.key = sercreteKey;
    server.init_val = Math.floor(
      Math.random() * (SERVER_INIT_RAND_MAX - SERVER_INIT_RAND_MIN + 1) +
        SERVER_INIT_RAND_MIN
    );
    this.db.save(name, server);
  }

  // Generates a Ticket Granting Ticket.
  // In case this structure is changed also check Kerberos_Server/Server and Kerberos_client/Client classes as well for consistancy.
  // Also change the structure in verifyTGTandGetKey()
  getTGT(cUid1, cUid2, key, lifetimeMs) {
    let tgt = {};
    tgt.uid1 = String(cUid1);
    tgt.uid2 = String(cUid2);
    tgt.key = key;
    tgt.timestamp = Date.now();
    tgt.lifetime = lifetimeMs;
    tgt.target = 'TGS';
    return this.cryptor.encrypt(this.key, JSON.stringify(tgt), TGT_INIT_VAL);
  }

  // Helper function to decrypt TGT, should not be used externally
  decryptTGT(encTGT) {
    const tgtStr = this.cryptor.decrypt(this.key, encTGT, TGT_INIT_VAL);
    let tgt = {};
    try {
      tgt = JSON.parse(tgtStr);
      return tgt;
    } catch (e) {
      if (e instanceof SyntaxError) {
        throw new ServerError('Not a Ticket Granting Ticket');
      } else {
        throw e;
      }
    }
  }

  // Verifies an encrypted TGT and return the key from it.Should not be used externally
  verifyTGTAndGetKey(cUid1, cUid2, tgtEncStr) {
    const tgt = this.decryptTGT(tgtEncStr);
    const crrTime = Date.now();

    if (tgt.target !== 'TGS') {
      throw new ServerError('Not a TGT');
    }
    // In case there is some error of time settings on servers
    // The timestamps in ticket must alway be less than current time on any server, as ticket will be granted before any use.
    if (tgt.timestamp > crrTime) {
      throw new ServerError('Invalid Timestamp in ticket');
    }
    // In case TGT is expired
    if (tgt.timestamp + tgt.lifetime < crrTime) {
      throw new ServerError('Ticket Lifetime Exceeded');
    }
    // in case the ticket is not meant for the user who provided it.
    if (tgt.uid1 !== String(cUid1) || tgt.uid2 !== String(cUid2)) {
      throw new ServerError('Invalid Ticket Holder');
    }
    return tgt.key;
  }

  // A function to decrypt the request made to TGS
  decryptReq(encReqStr, tgt) {
    const decTgt = this.decryptTGT(tgt);

    const reqStr = this.cryptor.decrypt(decTgt.key, encReqStr, TGT_INIT_VAL);

    return reqStr;
  }

  // Function to verify the random number give by user is not already used by that user.
  // Used to prevent Replay attacks.
  // Note Must be explicitly called in order to check
  // The checkRand argument in constructor must be given true in order to use this.
  // This is not done directly in decrypt request as it may not be necessary that the encrypted request will directly contain the
  // random as a property, thus an extra method call is required.
  verifyRand(rand, cUid1, cUid2) {
    if (!this.checkRand) {
      throw new TypeError(
        'This instance was not initialized with check_rand = true'
      );
    }
    if (!rand) {
      throw new ServerError("'rand' is not present");
    }
    if (isNaN(rand)) {
      throw new ServerError('rand must be a Number');
    }

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

  /**
   * Function to generate the encrypted response and encrypted ticket.
   * In case this structure is changed also check Kerberos_Server/Server and Kerberos_client/Client classes as well for consistancy.
   * @param {Number} rand random number given by the request
   * @param {String} reqServer Server for which the ticket is to be generated
   * @param {String} cUid1 uid for gien user which must be same on all servers, eg,ip address
   * @param {String} cUid2 uid for gien user which must be same on all servers, eg,ip address
   * @param {Encrypted String} tgt encrypted Ticket Granting Ticket
   * @param {Number} lifetimeMs lifetime for generated ticket default = TICKET_LIFETIME
   * @returns {Object} An object which has properties : res for encrypted response and ticket for encrypted ticket
   */
  getResAndTicket(
    rand,
    reqServer,
    cUid1,
    cUid2,
    tgt,
    lifetimeMs = TICKET_LIFETIME
  ) {
    const key = this.verifyTGTAndGetKey(cUid1, cUid2, tgt);

    const server = this.db.get(reqServer);

    const sercreteKey = this.cryptor.getRandomKey();
    const crrTime = Date.now();

    let res = {};
    res.timestamp = crrTime;
    res.lifetime = lifetimeMs;
    res.target = reqServer;
    res.rand = rand;
    res.key = sercreteKey;
    res.init_val = server.init_val;

    const resEnc = this.cryptor.encrypt(key, JSON.stringify(res), TGT_INIT_VAL);

    let ticket = {};
    ticket.uid1 = String(cUid1);
    ticket.uid2 = String(cUid2);
    ticket.key = sercreteKey;
    ticket.init_val = server.init_val;
    ticket.target = reqServer;
    ticket.timestamp = crrTime;
    ticket.lifetime = lifetimeMs;

    const ticketEnc = this.cryptor.encrypt(
      server.key,
      JSON.stringify(ticket),
      server.init_val
    );

    return {
      res: resEnc,
      ticket: ticketEnc,
    };
  }
}
