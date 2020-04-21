import DB from './DB';
import ServerError from '../ServerError';

export default class MemoryDB extends DB {
  data = null;
  constructor() {
    super();
    this.data = new Map();
  }

  save(name, obj) {
    this.data.set(name, obj);
  }

  get(name) {
    return this.data.get(name);
  }
}
