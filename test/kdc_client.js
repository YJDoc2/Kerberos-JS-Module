const chai = require('chai');
const expect = chai.expect;
const Server = require('../dist').Server;
const Client = require('../dist').Client;
const AESCryptor = require('../dist').AESCryptor;
const KDC = require('../dist').KerberosKDC;
const TGS = require('../dist').KerberosTGS;
const MDB = require('../dist').MemoryDB;
const constants = require('../dist/constants');

describe('Tests for KDC,CLient', () => {
  let kdc, mdb, server, client, key;
  beforeEach(() => {
    mdb = new MDB();
    const cryptor = new AESCryptor();
    kdc = new KDC(null, mdb);
    kdc.addServer('abc');
    server = Server.MakeServerFromDB('abc', null, mdb);
    key = cryptor.getRandomKey();
    client = new Client();
  });

  it('kdc should make correct auth ticket and client should decrypt them', () => {
    const rand = Math.ceil(Math.random() * 1000);
    const { auth, tgt } = kdc.makeAuthTickets(rand, 't1', 'test', key, 8500);
    expect(() => {
      client.decryptRes(key, auth, constants.AUTH_INIT_VAL);
    }).to.not.throw();
    const decAuth = client.decryptRes(key, auth);
    expect(decAuth).to.have.property('uid1').eql('t1');
    expect(decAuth).to.have.property('uid2').eql('test');
    expect(decAuth).to.have.property('rand').eql(rand);
    expect(decAuth).to.have.property('key');
    expect(decAuth).to.have.property('target').eql('TGS');
    expect(decAuth).to.have.property('lifetime').eql(8500);
    expect(decAuth).to.have.property('timestamp').lte(Date.now());
  });

  it('kdc should make correct ticket granting ticket', () => {
    const rand = Math.ceil(Math.random() * 1000);
    const { auth, tgt } = kdc.makeAuthTickets(rand, 't1', 'test', key, 8500);
    const tgs = new TGS(new AESCryptor(), mdb);
    expect(() => {
      tgs.decryptTGT(tgt);
    }).to.not.throw();
    const decTGT = tgs.decryptTGT(tgt);
    expect(decTGT).to.have.property('uid1').eql('t1');
    expect(decTGT).to.have.property('uid2').eql('test');
    expect(decTGT).to.have.property('key');
    expect(decTGT).to.have.property('target').eql('TGS');
    expect(decTGT).to.have.property('lifetime').eql(8500);
    expect(decTGT).to.have.property('timestamp').lte(Date.now());
  });

  it('kdc should return a valid response for ticket request and client should decrypt it', () => {
    const rand = Math.ceil(Math.random() * 1000);
    const { auth, tgt } = kdc.makeAuthTickets(rand, 't1', 'test', key, 8500);
    const { res, ticket } = kdc.getResAndTicket(
      rand,
      'abc',
      't1',
      'test',
      tgt,
      8500
    );
    const keyIn = client.decryptRes(key, auth).key;
    expect(() => {
      client.decryptRes(keyIn, res);
    }).to.not.throw();

    const decRes = client.decryptRes(keyIn, res);

    expect(decRes).to.have.property('rand').eql(rand);
    expect(decRes).to.have.property('key');
    expect(decRes).to.have.property('target').eql('abc');
    expect(decRes).to.have.property('lifetime').eql(8500);
    expect(decRes).to.have.property('init_val').to.be.a('number');
    expect(decRes).to.have.property('timestamp').lte(Date.now());
  });

  it('kdc should return a valid ticket ', () => {
    const rand = Math.ceil(Math.random() * 1000);
    const { auth, tgt } = kdc.makeAuthTickets(rand, 't1', 'test', key, 8500);
    const { res, ticket } = kdc.getResAndTicket(
      rand,
      'abc',
      't1',
      'test',
      tgt,
      8500
    );

    expect(() => {
      server.decryptTicket(ticket);
    }).to.not.throw();

    const decT = server.decryptTicket(ticket);
    expect(decT).to.have.property('uid1').eql('t1');
    expect(decT).to.have.property('uid2').eql('test');
    expect(decT).to.have.property('key');
    expect(decT).to.have.property('target').eql('abc');
    expect(decT).to.have.property('lifetime').eql(8500);
    expect(decT).to.have.property('init_val').to.be.a('number');
    expect(decT).to.have.property('timestamp').lte(Date.now());
  });

  it('client should encrypt message and server should be able to decrypt it', () => {
    const rand = Math.ceil(Math.random() * 1000);
    const { auth, tgt } = kdc.makeAuthTickets(rand, 't1', 'test', key, 8500);
    const { res, ticket } = kdc.getResAndTicket(
      rand,
      'abc',
      't1',
      'test',
      tgt,
      8500
    );
    const keyIn = client.decryptRes(key, auth).key;
    const keyReq = client.decryptRes(keyIn, res).key;
    const init = client.decryptRes(keyIn, res).init_val;
    const data = { test: 'test' };
    const req = client.encryptReq(keyReq, data, init);

    expect(() => {
      server.decryptReq(req, ticket);
    }).to.not.throw();

    const decReq = server.decryptReq(req, ticket);
    expect(decReq).to.be.a('string').eql(JSON.stringify(data));
  });

  it("client should be able to decrypt server's response", () => {
    const rand = Math.ceil(Math.random() * 1000);
    const { auth, tgt } = kdc.makeAuthTickets(rand, 't1', 'test', key, 8500);
    const { res, ticket } = kdc.getResAndTicket(
      rand,
      'abc',
      't1',
      'test',
      tgt,
      8500
    );
    const resData = { test: 'test' };
    expect(() => {
      server.encryptRes('t1', 'test', resData, ticket);
    }).to.not.throw();
    const sRes = server.encryptRes('t1', 'test', resData, ticket);

    const keyIn = client.decryptRes(key, auth).key;
    const keyReq = client.decryptRes(keyIn, res).key;
    const init = client.decryptRes(keyIn, res).init_val;

    expect(() => {
      client.decryptRes(keyReq, sRes, init);
    }).to.not.throw();
    const decRes = client.decryptRes(keyReq, sRes, init);
    expect(decRes).to.have.property('test').eql('test');
  });
});
