class User {
  constructor(user) {
    this.id = user.uid;
    this.uid = user.uid;
    this.firstName = user.firstName || user.displayName;
    this.email = user.email;
    this.emailVerified = user.emailVerified;
    this.countryCode = user.countryCode;
  }

  setPrivateInformation(info) {
    this.lastName = info.lastName;
    this.emailPreferences = info.emailPreferences;
  }

  setGarden(garden) {
    this.garden = garden;
  }

  addFields(fields) {
    Object.keys(fields).forEach((prop) => {
      this[prop] = fields[prop];
    });
  }
}

export default User;
