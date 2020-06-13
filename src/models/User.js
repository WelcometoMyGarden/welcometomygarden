class User {
  constructor(user) {
    this.id = user.uid;
    this.uid = user.uid;
    this.firstName = user.displayName;
    this.emailVerified = user.emailVerified;
  }
}

export default User;
