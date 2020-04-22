import DB from './DB';
import ServerError from '../ServerError';

/**
 * A DB that saves data in memory using map.
 * Exists only till program is running.
 * Usually would be faster than LocalDB.
 * Default choice for saving random numbers used by a user.
 */
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
