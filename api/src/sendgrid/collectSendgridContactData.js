const { getUserDocRefsWithData, getGardenWithData } = require('../firebase');
const {
  sendgridCommunicationLanguageFieldIdParam,
  sendgridSuperfanFieldIdParam,
  sendgridHostFieldIdParam,
  sendgridNewsletterFieldIdParam
} = require('../sharedConfig');

const collectSendgridContactData = async (uid) => {
  // Get the required data
  const [
    {
      publicUserProfileData: { firstName, countryCode, superfan },
      privateUserProfileData: {
        lastName,
        communicationLanguage,
        emailPreferences: { news }
      }
    },
    garden
  ] = await Promise.all([getUserDocRefsWithData(uid), getGardenWithData(uid)]);

  const isHost = garden.exists;

  // Combine all fields that are not set in the createSendgridContact function
  // they are expected in the argument context
  const contactUpdateFields = {
    first_name: firstName,
    country: countryCode,
    last_name: lastName,
    custom_fields: {
      [sendgridCommunicationLanguageFieldIdParam.value()]: communicationLanguage,
      [sendgridSuperfanFieldIdParam.value()]: superfan ? 1 : 0,
      [sendgridHostFieldIdParam.value()]: isHost ? 1 : 0,
      // This one is optionally set here
      [sendgridNewsletterFieldIdParam.value()]: news ? 1 : 0
      // We intentionally DO NOT include SG_CREATION_LANGUAGE_FIELD_ID
      // this prevents the user from re-entering (with the new contact)
      // automation lists, which all depend on this field
    }
  };

  return contactUpdateFields;
};

exports.collectSendgridContactData = collectSendgridContactData;
