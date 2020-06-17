class User {
  constructor(user) {
    this.id = user.uid;
    this.uid = user.uid;
    this.firstName = user.firstName || user.displayName;
    this.email = user.email;
    this.emailVerified = user.emailVerified;
  }

  setPrivateInformation(info) {
    this.lastName = info.lastName;
    this.emailPreferences = info.emailPreferences;
  }
}

export default User;
