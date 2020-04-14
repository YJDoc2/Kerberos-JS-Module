const aesjs = require('aes-js');

import Cryptor from './Cryptor';

export default class AESCryptor extends Cryptor {
  encrypt(key, valueStr, ...args) {
    if (key.length != 32) {
      throw new Error('Key argument must be a string of 32 characters');
    }
    const aesctr = new aesjs.ModeOfOperation.ctr(
      aesjs.utils.utf8.toBytes(key.substr(0, 32)),
      new aesjs.Counter(args[0])
    );

    const encBytes = aesctr.encrypt(aesjs.utils.utf8.toBytes(valueStr));
    const encTxtHex = aesjs.utils.hex.fromBytes(encBytes);
    const encTxtB64 = Buffer.from(encTxtHex, 'hex').toString('base64');
    return encTxtB64;
  }

  decrypt(key, encStr, ...args) {
    if (key.length != 32) {
      throw new Error('Key argument must be a string of 32 characters');
    }
    const aesctr = new aesjs.ModeOfOperation.ctr(
      aesjs.utils.utf8.toBytes(key.substr(0, 32)),
      new aesjs.Counter(args[0])
    );

    const encStrHex = Buffer.from(encStr, 'base64').toString('hex');
    const decBytes = aesctr.decrypt(aesjs.utils.hex.toBytes(encStrHex));
    const decStr = aesjs.utils.utf8.fromBytes(decBytes);

    return decStr;
  }
}
