const aesjs = require('aes-js');
import { randomBytes } from 'crypto';
import Cryptor from './Cryptor';

/**
 * Default class for all cryptographers required in library.
 *
 * This uses AES-JS library from ricmoo on https://www.npmjs.com/~ricmoo
 * The NPM page of library is https://www.npmjs.com/package/aes-js
 * The github page for library is https://github.com/ricmoo/aes-js
 *
 * This uses the AES 256 bit encryption of type CTR to encrypt and decrypt the given string
 * Then it is converted to base-64 string to shorten the length and returned.
 */
export default class AESCryptor extends Cryptor {
  constructor() {
    super();
  }

  // key : key to encrypt the message, is one returned from getRandomKey
  // valueStr : string to be encrypted
  // A third integer argument must be provided which is used as init value for the counter required by CTR encryption
  encrypt(key, valueStr, ...args) {
    const aesctr = new aesjs.ModeOfOperation.ctr(
      aesjs.utils.utf8.toBytes(key.substr(0, 32)), // substring is used in case the key is not of 256 bit length : 32*8 = 256
      new aesjs.Counter(args[0])
    );

    const encBytes = aesctr.encrypt(aesjs.utils.utf8.toBytes(valueStr));
    const encTxtHex = aesjs.utils.hex.fromBytes(encBytes);
    const encTxtB64 = Buffer.from(encTxtHex, 'hex').toString('base64');
    return encTxtB64;
  }

  // key : key to encrypt the message, is one returned from getRandomKey
  // encStr : encrypted string
  // A third integer argument must be provided which is used as init value for the counter required by CTR encryption
  decrypt(key, encStr, ...args) {
    const aesctr = new aesjs.ModeOfOperation.ctr(
      aesjs.utils.utf8.toBytes(key.substr(0, 32)), // substring is used in case the key is not of 256 bit length : 32*8 = 256
      new aesjs.Counter(args[0])
    );

    const encStrHex = Buffer.from(encStr, 'base64').toString('hex');
    const decBytes = aesctr.decrypt(aesjs.utils.hex.toBytes(encStrHex));
    const decStr = aesjs.utils.utf8.fromBytes(decBytes);

    return decStr;
  }

  // returns a random key used for encryption and decryption
  getRandomKey() {
    // Every byyte is turned in 2 hexadecimal characters, so as we need 256 bits, i.e. 32 bytes
    // we only get 16 random bytes.
    return randomBytes(16).toString('hex');
  }
}
