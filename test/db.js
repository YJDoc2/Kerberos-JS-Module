const fs = require('fs');
const chai = require('chai');
const expect = chai.expect;
const MemoryDB = require('../dist').MemoryDB;
const LocalDB = require('../dist').LocalDB;

describe('MemoryDB Class tests', () => {
  it('should retrive saved data', () => {
    const mdb = new MemoryDB();
    mdb.save('test', 'testData');
    const data = mdb.get('test');
    expect(data).to.be.a('string').eq('testData');
  });
  it('should give undefined for absent keys', () => {
    const mdb = new MemoryDB();
    const data = mdb.get('test1');
    expect(data).to.be.undefined;
  });
});

describe('LocalDB class tests', () => {
  beforeEach(() => {
    if (fs.existsSync('./Tickets')) {
      fs.rmdirSync('./Tickets');
    }
    if (fs.existsSync('./testtickets')) {
      if (fs.existsSync('./testtickets/Tickets')) {
        fs.rmdirSync('./testtickets/Tickets');
      }
      fs.rmdirSync('./testtickets');
    }
  });
  after(() => {
    if (fs.existsSync('./Tickets')) {
      fs.rmdirSync('./Tickets');
    }
    if (fs.existsSync('./testtickets')) {
      if (fs.existsSync('./testtickets/Tickets')) {
        fs.rmdirSync('./testtickets/Tickets');
      }
      fs.rmdirSync('./testtickets');
    }
  });
  it('should create Tickets folder in current dir by default', () => {
    const ldb = new LocalDB();
    const doesFolderExists = fs.existsSync('./Tickets');
    expect(doesFolderExists).eql(true);
  });

  it('should create given path dir for tickets', () => {
    const ldb = new LocalDB('./testtickets');
    const doesFolderExists = fs.existsSync('./testtickets');
    expect(doesFolderExists).eql(true);
  });

  it('should be able to create nested folder structure', () => {
    const ldb = new LocalDB('./testtickets/Tickets');
    const doesOuterFolderExists = fs.existsSync('./testtickets');
    const doesInnerFolderExists = fs.existsSync('./testtickets/Tickets');
    expect(doesOuterFolderExists).eql(true);
    expect(doesInnerFolderExists).eql(true);
  });

  it('should create folder inside existsing folder', () => {
    fs.mkdirSync('./testtickets');
    const ldb = new LocalDB('./testtickets/Tickets');
    const doesOuterFolderExists = fs.existsSync('./testtickets');
    const doesInnerFolderExists = fs.existsSync('./testtickets/Tickets');
    expect(doesOuterFolderExists).eql(true);
    expect(doesInnerFolderExists).eql(true);
  });

  it('should save data with given name', () => {
    const ldb = new LocalDB();
    ldb.save('test', 'test');
    const doesFileExists = fs.existsSync('./Tickets/test');
    expect(doesFileExists).eql(true);
    fs.unlinkSync('./Tickets/test');
  });

  it('should be able to get saved data', () => {
    const ldb = new LocalDB('./testtickets');
    ldb.save('test', 'test');
    const data = ldb.get('test');
    expect(data).to.be.a('string').eql('test');
    fs.unlinkSync('./testtickets/test');
  });

  it('should save and retrive objects correctly', () => {
    const ldb = new LocalDB();
    ldb.save('test', { test: 'test' });
    const doesFileExist = fs.existsSync('./Tickets/test');
    expect(doesFileExist).eql(true);
    const data = ldb.get('test');
    expect(data).to.be.a('object');
    expect(data).to.have.property('test');
    expect(data.test).to.be.a('string').eql('test');
    fs.unlinkSync('./Tickets/test');
  });

  it('should throw error for non-existing keys', () => {
    const ldb = new LocalDB();
    expect(() => {
      ldb.get('test');
    }).to.throw('Requested Server with name test not Found');
  });

  it('should throw error for incorrectly saved data', () => {
    const ldb = new LocalDB();
    fs.writeFileSync('./Tickets/test', "{'test':'");
    expect(() => {
      ldb.get('test');
    }).to.throw('Error in decoding server information');
    fs.unlinkSync('./Tickets/test');
  });
});
