const chai = require('chai');
const expect = chai.expect;
const AESCryptor = require('../dist').AESCryptor;

describe('AES Cryptor tests', () => {
  it('should give a different random key each time', () => {
    const cryptor = new AESCryptor();
    const key1 = cryptor.getRandomKey();
    const key2 = cryptor.getRandomKey();
    expect(key1).to.be.a('string');
    expect(key2).to.be.a('string');
    expect(key1).to.be.not.eql(key2);
  });

  it('should give key of length 32 bytes', () => {
    const cryptor = new AESCryptor();
    const key = cryptor.getRandomKey();
    expect(key.length).to.be.eql(32);
  });

  it('should encrypt and decrypt', () => {
    const cryptor = new AESCryptor();
    const data = [JSON.stringify({ test: 'test' }), JSON.stringify(chai)];
    const keys = [cryptor.getRandomKey(), cryptor.getRandomKey()];
    const enc0 = cryptor.encrypt(keys[0], data[0], 0);
    const enc1 = cryptor.encrypt(keys[1], data[1], 0);
    const dec0 = cryptor.decrypt(keys[0], enc0, 0);
    const dec1 = cryptor.decrypt(keys[1], enc1, 0);
    expect(dec0).to.be.a('string').eql(data[0]);
    expect(dec1).to.be.a('string').eql(data[1]);
  });
});
