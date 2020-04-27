const fs = require('fs');
const chai = require('chai');
const expect = chai.expect;
const Server = require('../dist').Server;
const TGS = require('../dist').KerberosTGS;
const Client = require('../dist').Client;
const AESCryptor = require('../dist').AESCryptor;
const MDB = require('../dist').MemoryDB;
const LDB = require('../dist').LocalDB;

describe('Basic Server tests', () => {
  it('should throw error with incomplete details', () => {
    expect(() => {
      new Server({ key: 'abc' });
    }).to.throw('Invalid Server object');
    expect(() => {
      new Server({ uid: 'abc' });
    }).to.throw('Invalid Server object');
    expect(() => {
      new Server({ init_val: 125 });
    }).to.throw('Invalid Server object');
  });

  it('should make server with correct object', () => {
    expect(() => {
      new Server({ key: 'abc', uid: 'abc', init_val: 5 });
    }).to.not.throw();
  });

  it('should make server from db', () => {
    const mdb = new MDB();
    mdb.save('abc', { key: 'abc', uid: 'abc', init_val: 5 });
    expect(() => {
      Server.MakeServerFromDB('abc', null, mdb);
    }).to.not.throw();
    const ldb = new LDB();
    ldb.save('abc', { key: 'abc', uid: 'abc', init_val: 5 });
    expect(() => {
      Server.MakeServerFromDB('abc');
    }).to.not.throw();
    fs.unlinkSync('./Tickets/abc');
    fs.rmdirSync('./Tickets');
  });

  it('should throw error for check rand if not enabled', () => {
    const mdb = new MDB();
    mdb.save('abc', { key: 'abc', uid: 'abc', init_val: 5 });
    const s = Server.MakeServerFromDB('abc', null, mdb);
    expect(() => {
      s.verifyRand(1, 2, 3);
    }).to.throw('This instance was not initialized with check_rand = True');
  });

  it('should throw error for invalid rand', () => {
    const mdb = new MDB();
    mdb.save('abc', { key: 'abc', uid: 'abc', init_val: 5 });
    const s = Server.MakeServerFromDB('abc', null, mdb, true);
    expect(() => {
      s.verifyRand('t1', 't2');
    }).to.throw("'rand' is not present");
    expect(() => {
      s.verifyRand('t1', 't2', {});
    }).to.throw('rand must be a Number');
  });

  it('should verify random', () => {
    const mdb = new MDB();
    mdb.save('abc', { key: 'abc', uid: 'abc', init_val: 5 });
    const s = Server.MakeServerFromDB('abc', null, mdb, true);
    const rand = Math.ceil(Math.random() * 1000);
    expect(() => {
      s.verifyRand('t1', 't2', rand);
    }).to.not.throw();
    expect(() => {
      s.verifyRand('t1', 't2', Math.ceil(Math.random() * 1000));
    }).to.not.throw();
    expect(() => {
      s.verifyRand('t1', 't2', rand);
    }).to.throw('The random number has already been used by the user');
  });
});

describe('req-res server tests', () => {
  let mdb, cryptor, tgs, s;
  beforeEach(() => {
    mdb = new MDB();
    cryptor = new AESCryptor();
    tgs = new TGS(cryptor, mdb);
    tgs.addServer('abc');
    tgs.addServer('ccc');
    s = Server.MakeServerFromDB('abc', null, mdb);
  });

  it('should decrypt valid ticket', () => {
    const tgt = tgs.getTGT('t1', 't2', cryptor.getRandomKey(), 5000);
    const { res, ticket } = tgs.getResponseAndTicket(
      't1',
      't2',
      tgt,
      'abc',
      50
    );
    expect(() => {
      s.verifyTicketAndGetKey('t1', 't2', ticket);
    }).to.not.throw();
  });

  it('should throw error for invalid ticket', () => {
    const tgt = tgs.getTGT('t1', 't2', cryptor.getRandomKey(), 5000);

    expect(() => {
      s.verifyTicketAndGetKey('t1', 't2', 'strooo');
    }).to.throw('Invalid Ticket');

    const ticket0 = tgs.getResponseAndTicket('t1', 't2', tgt, 'abc', 50, 0)
      .ticket;

    expect(() => {
      s.verifyTicketAndGetKey('t1', 't2', ticket0);
    }).to.throw('Ticket lifetime Exceeded');

    const ticket1 = tgs.getResponseAndTicket('t1', 't2', tgt, 'abc', 50).ticket;

    expect(() => {
      s.verifyTicketAndGetKey('t1', 't', ticket1);
    }).to.throw('Invalid Ticket Holder');
    expect(() => {
      s.verifyTicketAndGetKey('t', 't1', ticket1);
    }).to.throw('Invalid Ticket Holder');

    const ticket2 = tgs.getResponseAndTicket('t1', 't2', tgt, 'ccc', 50).ticket;

    expect(() => {
      s.verifyTicketAndGetKey('t1', 't2', ticket2);
    }).to.throw('Invalid Ticket');
  });
});
