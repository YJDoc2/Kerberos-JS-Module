import ServerError from '../ServerError';
import { DB, LocalDB, MemoryDB } from '../db_classes';
import { Cryptor, AESCryptor } from '../crypto_classes';

export default class Server {
  cryptor = undefined;
  server = undefined;
  key = '';
  initVal = null;
  name = null;
  checkRand = false;
  verifyRandDB = null;

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
    if (!serverObj.key || !serverObj.initVal || !serverObj.uid) {
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
    this.key = serverObj.Key;
    this.initVal = serverObj.initVal;
    this.name = serverObj.uid;
  }

  static MakeServerFromDB(
    name,
    cryptor = null,
    db = null,
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
    const server = db.getServer(name);
    return new Server(server, cryptor, checkRand, verifyRandDB);
  }

  verifyTicketAndGetKey(cUid1, cUid2, ticketEncStr) {
    const ticketStr = this.cryptor.decrypt(
      this.key,
      ticketEncStr,
      this.initVal
    );

    let ticket = {};
    try {
      ticket = JSON.parse(ticketStr);
    } catch (e) {
      if (e instanceof SyntaxError) {
        throw new ServerError('Invalid Ticket');
      } else {
        throw e;
      }
    }

    crr_time = Date.now();
    if (ticket.uid1 !== cUid1 || ticket.uid2 !== cUid2) {
      throw new ServerError('Invalid Ticket Holder');
    }
    if (ticket.timestamp > crr_time) {
      throw new ServerError('Invalid Timestamp in Ticket');
    }
    if (ticket.timestamp + ticket.lifetime_ms < crr_time) {
      throw new ServerError('Ticket lifetime Exceeded');
    }
    if (ticket.target !== this.name) {
      throw new ServerError('Wrong Target Server');
    }
    return ticket.key;
  }

  decryptReq(cUid1, cUid2, ticket, reqEncStr) {
    const key = this.verifyTicketAndGetKey(cUid1, cUid2, ticket);

    const req_str = this.cryptor.decrypt(key, reqEncStr, this.initVal);

    let req = {};

    try {
      req = json.loads(req_str);
    } catch (e) {
      if (e instanceof SyntaxError) {
        throw new ServerError('Invalid Request Encryption');
      } else {
        throw e;
      }
    }
    return req;
  }
  encryptRes(cUid1, cUid2, ticket, resObj) {
    key = this.verifyTicketAndGetKey(cUid1, cUid2, ticket);
    encRes = this.cryptor.encrypt(key, JSON.stringify(resObj), this.initVal);
    return encRes;
  }

  verifyRand(cUid1, cUid2, rand) {
    if (!this.checkRand) {
      throw new TypeError(
        'This instance was not initialized with check_rand = True'
      );
    }
    if (!rand) {
      throw new ServerError("'rand' is not present");
    }
    if (!(rand instanceof Number)) {
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
      this.verifyRandDB.save(userStr, userData.unshift(rand));
    }
  }
}
