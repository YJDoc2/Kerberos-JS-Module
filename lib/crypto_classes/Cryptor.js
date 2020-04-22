/**
 * This is the interface-like class for all cryptographers required in the library.
 * Extending class must implement encrypt,decrypt and getRandomKey methods.
 * getRandomKey method is called whenever a new random key is needed to encrypt and object,
 * and will be given as it is to encrypt and decrypt methods.
 * Note that the key provided must be JSON Serializable, as it new servers will also obtain a key from here,
 * and the server structure will be converted to a string before save.
 * The ...args varargs is used in case the extending class requires any extra arguments for encryption/decryption
 */

export default class Cryptor {
  encrypt(key, valueStr, ...args) {
    throw new Error(
      'Class extending Cryptor class must Implement encrypt method'
    );
  }
  decrypt(key, encStr, ...args) {
    throw new Error(
      'Class extending Cryptor class must Implement dencrypt method'
    );
  }
  getRandomKey() {
    throw new Error(
      'Class extending Cryptor class must Implement getRandomKey method'
    );
  }
}
