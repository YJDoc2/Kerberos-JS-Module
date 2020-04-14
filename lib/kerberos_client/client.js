import { REQ_INIT_VAL } from '../constants';
import Cryptor from '../crypto_classes/Cryptor';
import AESCryptor from '../crypto_classes/AESCryptor';
import User from '../interface_classes/User';

export default class Client {
  cryptor = undefined;
  key = null;

  constructor(user, cryptor = undefined) {
    if (!!cryptor) {
      cryptor = new AESCryptor();
    }
    if (!(cryptor instanceof Cryptor)) {
      throw new TypeError(
        "'cryptor' argument must be an instance of class extending Cryptor class "
      );
    }
    if (!(user instanceof User)) {
      throw new TypeError(
        "'user' argument must be an instance of class extending User"
      );
    }
    this.cryptor = cryptor;
    this.key = user.passwordToKey();
  }

  encryptReq(req) {
    return this.cryptor.encrypt(this.key, JSON.stringify(req), REQ_INIT_VAL);
  }

  decryptRes(resEncStr) {
    const resStr = this.cryptor.decrypt(this.key, resEncStr, REQ_INIT_VAL);
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
}
