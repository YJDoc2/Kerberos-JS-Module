/**
 * This is the interface-like class for all databases required in the library.
 * The extending classes must implement save and get methods.
 */

export default class DB {
  save(name, obj) {
    throw new Error('Class extending DB class must Implement save method');
  }
  get(name) {
    throw new Error('Class extending DB class must Implement get method');
  }
}
