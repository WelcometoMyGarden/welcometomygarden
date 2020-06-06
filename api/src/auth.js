exports.createUser = async ({ firstName, lastName }, context) => {
  console.log(context.auth.uid);
  /* const link = await admin.auth().generateEmailVerificationLink(email, {
    url: env.FRONTEND_URL
  });
  emails.sendEmailVerification(email, link);*/
};

exports.resetPassword = async () => {};

exports.changeEmail = async () => {};
