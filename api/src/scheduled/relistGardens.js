const { logger } = require('firebase-functions/v2');
const { Timestamp } = require('firebase-admin/firestore');
const { DateTime } = require('luxon');
const { db, getGardenWithData, getUserDocRefsWithData } = require('../firebase');
const { getUser } = require('../queued/util');
const { sendGardenRelistedEmail } = require('../mail');

const BRUSSELS_TZ = 'Europe/Brussels';

/**
 * Daily scheduled function that automatically relists gardens whose `relistGardenAt` date has
 * arrived. Runs at 10:00 Europe/Brussels (see registration in `index.js`).
 *
 * Note: we deliberately query a **full day range** (00:00 → 00:00 Brussels), not an exact 10:00
 * match, even though `relistGardenAt` is normally written at 10:00 Brussels. This keeps the timing
 * flexible: if we ever change the write time, add a second daily run, or backfill arbitrary
 * timestamps, those gardens are still picked up on the correct day without touching this query.
 *
 * @returns {Promise<void>}
 */
module.exports = async () => {
  // Query a full Brussels calendar day: [00:00 today, 00:00 tomorrow).
  const startOfDay = DateTime.now().setZone(BRUSSELS_TZ).startOf('day');
  const start = startOfDay.toJSDate();
  const end = startOfDay.plus({ days: 1 }).toJSDate();

  const snapshot = await db
    .collection('users-private')
    .where('relistGardenAt', '>=', Timestamp.fromDate(start))
    .where('relistGardenAt', '<', Timestamp.fromDate(end))
    .get();

  logger.info(
    `relistGardens: ${snapshot.size} user(s) scheduled for relisting between ` +
      `${start.toISOString()} and ${end.toISOString()}.`
  );

  for (const doc of snapshot.docs) {
    const uid = doc.id;
    try {
      const { gardenDocRef, gardenData, exists } = await getGardenWithData(uid);

      if (!exists || !gardenData) {
        logger.warn(`relistGardens: garden for user ${uid} could not be fetched, skipping.`);
        continue;
      }

      if (gardenData.listed === true) {
        logger.info(`relistGardens: garden for user ${uid} is already listed, skipping relist.`);
        continue;
      }

      // Relist the garden. The `onCampsiteListedChange` trigger clears `relistGardenAt` in response
      // to this `listed` change, so we don't clear it here.
      await gardenDocRef.update({ listed: true });
      logger.info(`relistGardens: relisted garden for user ${uid}.`);

      // Send the "your garden is back on the map" email (best-effort: a failure here must not
      // prevent processing the remaining gardens).
      try {
        const user = await getUser(uid, 'garden relisted');
        if (user) {
          const {
            privateUserProfileData: { communicationLanguage, secret },
            publicUserProfileData: { firstName }
          } = await getUserDocRefsWithData(uid);
          await sendGardenRelistedEmail({
            email: /** @type {string} */ (user.email),
            secret: /** @type {string} */ (secret),
            firstName: /** @type {string} */ (firstName),
            language: communicationLanguage ?? 'en'
          });
        }
      } catch (mailErr) {
        logger.error(`relistGardens: failed to send relisted email for user ${uid}.`, mailErr);
      }
    } catch (err) {
      logger.error(`relistGardens: failed to process user ${uid}, skipping.`, err);
    }
  }
};
