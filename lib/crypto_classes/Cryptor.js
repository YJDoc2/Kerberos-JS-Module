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
}
