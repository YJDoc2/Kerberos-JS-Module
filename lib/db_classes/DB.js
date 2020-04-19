export default class DB {
  save(name, obj) {
    throw new Error('Class extending DB class must Implement save method');
  }
  get(name) {
    throw new Error('Class extending DB class must Implement get method');
  }
}
