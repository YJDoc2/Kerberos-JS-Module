export default class DB {
  saveServer(serverName, serverObj) {
    throw new Error(
      'Class extending DB class must Implement saveServer method'
    );
  }
  getServer(serverName) {
    throw new Error('Class extending DB class must Implement getServer method');
  }
}
