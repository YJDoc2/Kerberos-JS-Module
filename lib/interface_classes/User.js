export default class User {
  passwordToKey() {
    throw Error(
      'Class extending User class must Implement passwordToKey() method'
    );
  }
}
