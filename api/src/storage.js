const { projectID } = require('firebase-functions/params');
const firestore = require('@google-cloud/firestore');
const { logger } = require('firebase-functions/v2');

const client = new firestore.v1.FirestoreAdminClient();
const bucket = 'gs://wtmg-prod-backups';

/* backs up the entire cloud firestore every 6 hours */
exports.doBackup = async () => {
  const databaseName = client.databasePath(projectID.value(), '(default)');
  logger.log(`Exporting documents from ${databaseName}`);

  try {
    // https://googleapis.dev/nodejs/firestore/latest/google.firestore.admin.v1.FirestoreAdmin.html#exportDocuments2
    // Regarding long-running operations: https://github.com/googleapis/gax-nodejs/blob/main/client-libraries.md#long-running-operations
    const responses = await client.exportDocuments({
      name: databaseName,
      outputUriPrefix: bucket,
      collectionIds: []
    });

    const response = responses[0];
    logger.log(`Operation Name: ${response.name}`);
  } catch (ex) {
    logger.error(ex);
    throw new Error('Export operation failed');
  }
};
