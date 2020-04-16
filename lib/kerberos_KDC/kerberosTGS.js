import {
  TGT_INIT_VAL,
  TICKET_LIFETIME,
  SERVER_INIT_RAND_MAX,
  SERVER_INIT_RAND_MIN,
} from '../constants';
import ServerError from '../ServerError';
import { Cryptor } from '../crypto_classes';
import { DB } from '../db_classes/';

export default class KerberosTGS {
  cryptor = undefined;
  db = undefined;
  key = undefined;

  constructor(cryptor, db) {
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
    this.cryptor = cryptor;
    this.db = db;
    this.key = this.cryptor.getRandomKey();

    //! CHANGE THIS, maybe add IP address as uid2
    const name = 'TGS_SERVER';

    let server = {};
    server.uid1 = 'TGS';
    server.uid2 = 'SERVER';
    server.key = this.key;
    this.db.saveServer(name, server);
  }

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
    this.db.saveServer(name, server);
  }

  getTGT(cUid1, cUid2, key, lifetime_ms) {
    let tgt = {};
    tgt.uid1 = String(cUid1);
    tgt.uid2 = String(cUid2);
    tgt.key = key;
    tgt.timestamp = Date.now();
    tgt.lifetime = lifetime_ms;
    tgt.target = 'TGS';
    return this.cryptor.encrypt(this.key, JSON.stringify(tgt), TGT_INIT_VAL);
  }

  verifyTGTandGetKey(cUid1, cUid2, tgtEncStr) {
    const tgtStr = this.cryptor.decrypt(this.key, tgtEncStr, TGT_INIT_VAL);
    let tgt = {};
    try {
      tgt = JSON.parse(tgtStr);
    } catch (e) {
      if (e instanceof SyntaxError) {
        throw new ServerError('Not a Ticket Granting Ticket');
      } else {
        throw e;
      }
    }
    const crrTime = Date.now();

    if (tgt.target !== 'TGT') {
      throw new ServerError('Not a TGT');
    }
    if (tgt.timestamp > crrTime) {
      throw new ServerError('Invalid Timestamp in ticket');
    }
    if (tgt.timestamp + tgt.lifetime < crrTime) {
      throw new ServerError('Ticket Lifetime Exceeded');
    }
    if (tgt.uid1 !== String(cUid1) || tgt.uid2 !== String(cUid2)) {
      throw new ServerError('Invalid Ticket Holder');
    }

    return tgt.key;
  }

  getResponseAndTicket(
    cUid1,
    cUid2,
    tgt,
    reqEncStr,
    lifetime_ms = TICKET_LIFETIME
  ) {
    const key = this.verifyTGTandGetKey(cUid1, cUid2, tgt);
    const reqStr = this.cryptor.decrypt(key, reqEncStr, TGT_INIT_VAL);

    let req = {};
    try {
      req = JSON.parse(reqStr);
    } catch (e) {
      if (e instanceof SyntaxError) {
        throw new ServerError('Not a Ticket Granting Ticket');
      } else {
        throw e;
      }
    }

    if (req.uid1 !== String(cUid1) || req.uid2 !== String(cUid2)) {
      throw new ServerError('Invalid Ticket holder');
    }
    if (req.rand === undefined) {
      throw new ServerError('Request must contain a random number');
    }

    const reqServer = req.target;
    const server = this.db.getServer(reqServer);

    const sercreteKey = this.cryptor.getRandomKey();
    const crrTime = Date.now();

    let res = {};
    res.timestamp = crrTime;
    res.lifetime = lifetime_ms;
    res.target = reqServer;
    res.rand = req.rand;
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
    ticket.lifetime = lifetime_ms;

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
