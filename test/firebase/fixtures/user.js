exports.createUser = () => ({
  countryCode: 'BE',
  firstName: 'Larry'
});

exports.createPrivateUser = () => ({
  emailPreferences: {
    newChat: true,
    news: true
  },
  lastName: 'Smith'
});
