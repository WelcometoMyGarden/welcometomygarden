class User {
  constructor(user) {
    this.id = user.uid;
    this.uid = user.uid;
    this.firstName = user.firstName || user.displayName;
    this.email = user.email;
    this.emailVerified = user.emailVerified;
    this.countryCode = user.countryCode;
  }

  setAllInObject(obj) {
    Object.keys(obj).forEach((prop) => {
      this[prop] = obj[prop];
    });
  }

  setPrivateInformation(info) {
    this.setAllInObject(info);
  }

  setGarden(garden) {
    this.garden = garden;
  }

  addFields(fields) {
    this.setAllInObject(fields);
  }
}

export default User;
