import { TGT_INIT_VAL } from '../constants';
import { DB, MemoryDB } from '../db_classes';
import { Cryptor, AESCryptor } from '../crypto_classes';
import ServerError from '../ServerError';

/**
 * Client class for Kerberos library. This does not actually set up any kind of client,but contains methods reuired on client side.
 * This is conveted to a script to run in browser
 * using browserify https://www.npmjs.com/package/browserify , https://github.com/browserify/browserify
 * and then tries to compress using  uglify-js https://www.npmjs.com/package/uglify-js , https://github.com/mishoo/UglifyJS2
 */
export default class Client {
  cryptor = undefined;
  key = null;
  keymap = null;

  constructor(cryptor = undefined, keymapDB = undefined) {
    if (cryptor == undefined) {
      cryptor = new AESCryptor();
    }

    if (keymapDB == undefined) {
      keymapDB = new MemoryDB();
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
    this.keymap = keymapDB;
  }

  // Encrypts a request object
  encryptReq(key, req, initVal = TGT_INIT_VAL) {
    return this.cryptor.encrypt(key, JSON.stringify(req), initVal);
  }

  // Decrypts a encrypted response string
  decryptRes(key, resEncStr, initVal = TGT_INIT_VAL) {
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
