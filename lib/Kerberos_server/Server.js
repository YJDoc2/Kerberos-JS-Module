import ServerError from '../ServerError';
import { DB, LocalDB, MemoryDB } from '../db_classes';
import { Cryptor, AESCryptor } from '../crypto_classes';

/**
 * Kerbersos class which should be used on servers that are to be protected using Kerberos
 * Note this does not actually creates a Server, just has the functionality that is required on Server side.
 * The optional argument checkRand in constructor allows checking of the random numbers sent in requests to prevent replay attacks
 *
 * The cUid arguments in encrypt and decrypt functions are used to verify that the ticket and request belongs to the user
 * These must be same for a given user on a perticular server and the Ticket granting server. Cab be used to prevent replay attacks.
 */
export default class Server {
  cryptor = undefined;
  server = undefined;
  key = '';
  initVal = null;
  name = null;
  checkRand = false;
  verifyRandDB = null;

  // Direct constructor if you have a server structure ready, or doing some tests.
  // In case arguments are changed, please also check verifyRand function's comments.
  constructor(
    serverObj,
    cryptor = undefined,
    checkRand = false,
    verifyRandDB = undefined
  ) {
    if (cryptor === undefined) {
      cryptor = new AESCryptor();
    }
    if (!(cryptor instanceof Cryptor)) {
      throw new TypeError(
        "'cryptor' argument must be an instance of class extending Cryptor class "
      );
    }
    if (!serverObj.key || !serverObj.init_val || !serverObj.uid) {
      throw new TypeError('Invalid Server object');
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
    this.server = serverObj;
    this.key = serverObj.key;
    this.initVal = serverObj.init_val;
    this.name = serverObj.uid;
  }

  // Static method for loading server structure from a db and make an object.
  static MakeServerFromDB(
    name,
    cryptor = undefined,
    db = undefined,
    checkRand = false,
    verifyRandDB = undefined
  ) {
    if (!cryptor) {
      cryptor = new AESCryptor();
    }
    if (!db) {
      db = new LocalDB();
    }
    if (!(cryptor instanceof Cryptor)) {
      throw new TypeError(
        "'cryptor' argument must be an instance of class extending Cryptor class "
      );
    }
    if (!(db instanceof DB)) {
      throw new TypeError(
        "'db' argument must be an instance of class extending DB class "
      );
    }
    const server = db.get(name);
    return new Server(server, cryptor, checkRand, verifyRandDB);
  }

  decryptTicket(encTicket) {
    const ticketStr = this.cryptor.decrypt(this.key, encTicket, this.initVal);

    let ticket = {};
    try {
      ticket = JSON.parse(ticketStr);
      return ticket;
    } catch (e) {
      if (e instanceof SyntaxError) {
        throw new ServerError('Invalid Ticket');
      } else {
        throw e;
      }
    }
  }

  // Verifies the Ticket Granting Ticket and returns the key stored in it.
  // In case the structure of TGT is changed in Kerberos_KDC/KerberosTGS this must be updated.
  // cUid1 and cUid2 are identifies of a perticular user, and must be same on TGS and on a perticuar server
  verifyTicketAndGetKey(cUid1, cUid2, ticketEncStr) {
    const ticket = this.decryptTicket(ticketEncStr);
    const crrTime = Date.now();
    // In case the requesting user is not the one ticket was granted to
    if (ticket.uid1 !== cUid1 || ticket.uid2 !== cUid2) {
      throw new ServerError('Invalid Ticket Holder');
    }

    // In case there is some error of time settings on servers
    // The timestamps in ticket must alway be less than current time on any server, as ticket will be granted before any use.
    if (ticket.timestamp > crrTime) {
      throw new ServerError('Invalid Timestamp in Ticket');
    }

    // In case ticket is expired
    if (ticket.timestamp + ticket.lifetime < crrTime) {
      throw new ServerError('Ticket lifetime Exceeded');
    }

    // In case the ticket is not intended for this server, this is set by TGS,
    // and the server creted here, and stored in TGS's DB must be same.
    if (ticket.target !== this.name) {
      throw new ServerError('Wrong Target Server');
    }
    return ticket.key;
  }

  // Decrypts the encrypted request string given.
  // In case the structure of TGT is changed in Kerberos_KDC/KerberosTGS this must be updated.
  // cUid1 and cUid2 are identifies of a perticular user, and must be same on TGS and on a perticuar server
  decryptReq(reqEncStr, ticket) {
    const decTicket = this.decryptTicket(ticket);

    const reqStr = this.cryptor.decrypt(decTicket.key, reqEncStr, this.initVal);
    return reqStr;
  }

  // Ecrypts the encrypted response object given.
  // In case the structure of TGT is changed in Kerberos_KDC/KerberosTGS this must be updated.
  // cUid1 and cUid2 are identifies of a perticular user, and must be same on TGS and on a perticuar server
  encryptRes(cUid1, cUid2, response, ticket) {
    const key = this.verifyTicketAndGetKey(cUid1, cUid2, ticket);

    const encRes = this.cryptor.encrypt(
      key,
      JSON.stringify(response),
      this.initVal
    );
    return encRes;
  }

  // Function to verify the random number give by user is not already used by that user.
  // Used to prevent Replay attacks.
  // The checkRand argument in constructor must be given true in order to use this.
  // This is not done directly in decrypt request as it may not be neccessary that the encrypted request will directly contain the
  // random as a property, thus an extra method call is required.
  verifyRand(rand, cUid1, cUid2) {
    if (!this.checkRand) {
      throw new TypeError(
        'This instance was not initialized with check_rand = True'
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
}
