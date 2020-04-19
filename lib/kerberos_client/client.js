import { TGT_INIT_VAL } from '../constants';
import { DB, MemoryDB } from '../db_classes';
import { Cryptor, AESCryptor } from '../crypto_classes';

export default class Client {
  cryptor = undefined;
  key = null;
  keymap = null;

  constructor(userKey, cryptor = undefined, keymapDB = undefined) {
    if (cryptor == undefined) {
      cryptor = new AESCryptor();
    }

    if (keymapDB == undefined) {
      cryptor = new MemoryDB();
    }

    if (!(cryptor instanceof Cryptor)) {
      throw new TypeError(
        "'cryptor' argument must be an instance of class extending Cryptor class "
      );
    }
    if (!(keymapDB instanceof DB)) {
      throw new TypeError(
        "'keymapDB' argument must be an instance of class extending DB class "
      );
    }
    this.cryptor = cryptor;
    this.key = userKey;
    this.keymap = keymapDB;
  }

  encryptReq(req, key, initVal = TGT_INIT_VAL) {
    return this.cryptor.encrypt(key, JSON.stringify(req), initVal);
  }

  decryptRes(resEncStr, key, initVal = TGT_INIT_VAL) {
    const resStr = this.cryptor.decrypt(key, resEncStr, initVal);
    let res = {};
    try {
      res = JSON.parse(resStr);
    } catch (e) {
      if (e instanceof SyntaxError) {
        throw new ServerError('Incorrect Response');
      } else {
        throw e;
      }
    }
    return res;
  }

  saveTicket(name, ticket) {
    this.keymap.save(name, ticket);
  }

  getTicket(name) {
    return this.keymap.get(name);
  }
}
