const chai = require('chai');
const expect = chai.expect;
const Server = require('../dist').Server;
const Client = require('../dist').Client;
const AESCryptor = require('../dist').AESCryptor;
const KDC = require('../dist').KerberosKDC;
const TGS = require('../dist').KerberosTGS;
const MDB = require('../dist').MemoryDB;

const constants = require('../dist').constants;

describe('Tests for KDC,CLient', () => {
  let kdc, mdb, server, client, key;
  before(() => {
    mdb = new MDB();
    const cryptor = new AESCryptor();
    kdc = new KDC(null, mdb);
    kdc.addServer('abc');
    server = Server.MakeServerFromDB('abc', null, mdb);
    key = cryptor.getRandomKey();
    client = new Client(key);
  });

  it('kdc should make correct auth ticket and client dhould decrypt them', () => {
    const rand = Math.ceil(Math.random() * 1000);
    const { auth, tgt } = kdc.genAuthTickets(rand, 't1', 'test', key, 8500);
    expect(() => {
      client.decryptRes(auth, key);
    }).to.not.throw();
    const decAuth = client.decryptRes(auth, key);
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
    const { auth, tgt } = kdc.genAuthTickets(rand, 't1', 'test', key, 8500);
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
    const { auth, tgt } = kdc.genAuthTickets(rand, 't1', 'test', key);
    const { res, ticket } = kdc.getResAndTicket(
      't1',
      'test',
      tgt,
      'abc',
      rand,
      8500
    );
    const keyIn = client.decryptRes(auth, key).key;
    expect(() => {
      client.decryptRes(res, keyIn);
    }).to.not.throw();

    const decRes = client.decryptRes(res, keyIn);

    expect(decRes).to.have.property('rand').eql(rand);
    expect(decRes).to.have.property('key');
    expect(decRes).to.have.property('target').eql('abc');
    expect(decRes).to.have.property('lifetime').eql(8500);
    expect(decRes).to.have.property('init_val').to.be.a('number');
    expect(decRes).to.have.property('timestamp').lte(Date.now());
  });

  it('kdc should return a valid ticket ', () => {
    const rand = Math.ceil(Math.random() * 1000);
    const { auth, tgt } = kdc.genAuthTickets(rand, 't1', 'test', key);
    const { res, ticket } = kdc.getResAndTicket(
      't1',
      'test',
      tgt,
      'abc',
      rand,
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

  it('client should encrypt essage and server should be able to decrypt it', () => {
    const rand = Math.ceil(Math.random() * 1000);
    const { auth, tgt } = kdc.genAuthTickets(rand, 't1', 'test', key);
    const { res, ticket } = kdc.getResAndTicket(
      't1',
      'test',
      tgt,
      'abc',
      rand,
      8500
    );
    const keyIn = client.decryptRes(auth, key).key;
    const keyReq = client.decryptRes(res, keyIn).key;
    const init = client.decryptRes(res, keyIn).init_val;
    const data = { test: 'test' };
    const req = client.encryptReq(data, keyReq, init);

    expect(() => {
      server.decryptReq(req, ticket);
    }).to.not.throw();

    const decReq = server.decryptReq(req, ticket);
    expect(decReq).to.be.a('string').eql(JSON.stringify(data));
  });

  it("client should be able to decrypt server's response", () => {
    const rand = Math.ceil(Math.random() * 1000);
    const { auth, tgt } = kdc.genAuthTickets(rand, 't1', 'test', key);
    const { res, ticket } = kdc.getResAndTicket(
      't1',
      'test',
      tgt,
      'abc',
      rand,
      8500
    );
    const resData = { test: 'test' };
    expect(() => {
      server.encryptRes('t1', 'test', ticket, resData);
    }).to.not.throw();
    const sRes = server.encryptRes('t1', 'test', ticket, resData);

    const keyIn = client.decryptRes(auth, key).key;
    const keyReq = client.decryptRes(res, keyIn).key;
    const init = client.decryptRes(res, keyIn).init_val;

    expect(() => {
      client.decryptRes(sRes, keyReq, init);
    }).to.not.throw();
    const decRes = client.decryptRes(sRes, keyReq, init);
    expect(decRes).to.have.property('test').eql('test');
  });
});
