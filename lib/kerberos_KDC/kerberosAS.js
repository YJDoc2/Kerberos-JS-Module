import { randomBytes } from 'crypto';

import { AUTH_INIT_VAL, AUTH_TICKET_LIFETIME } from '../constants';
import Cryptor from '../crypto_classes/Cryptor';
import User from '../interface_classes/User';
import KerberosTGS from './kerberosTGS';

export default class KerberosAS {
  cryptor = undefined;
  tgs = undefined;

  constructor(cryptor, tgs) {
    if (!(cryptor instanceof Cryptor)) {
      throw new TypeError(
        "'tgs' argument must be instance of Kerberos_TGS class"
      );
    }
    if (!(tgs instanceof KerberosTGS)) {
      throw new TypeError(
        "'cryptor argument must be instance of class extending Cryptor class"
      );
    }
    this.cryptor = cryptor;
    this.tgs = tgs;
  }

  makeAuthTickets(
    rand,
    cUid1,
    cUid2,
    user,
    lifetime_ms = AUTH_TICKET_LIFETIME
  ) {
    if (!(user instanceof User)) {
      throw new TypeError(
        "'user' argument must be an instance of class extending User"
      );
    }

    const passHashKey = user.passwordToKey();
    const secreteKey = randomBytes(32).toString('base64');
    let ticket = {};
    ticket.uid1 = String(cUid1);
    ticket.uid2 = String(cUid2);
    ticket.timestamp = Date.now();
    ticket.rand = rand;
    ticket.target = 'TGS';
    ticket.key = secreteKey;
    const resEncStr = this.cryptor.encrypt(
      passHashKey,
      JSON.stringify(ticket),
      AUTH_INIT_VAL
    );
    const tgt = this.tgs.getTGT(cUid1, cUid2, secreteKey, lifetime_ms);
    return {
      auth: resEncStr,
      tgt: tgt,
    };
  }
}
