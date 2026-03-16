import logger from '$lib/util/logger';
import emailSpellChecker from '@zootools/email-spell-checker';
import distance from '@zootools/email-spell-checker/dist/lib/helpers/sift3Distance';

// See https://github.com/smashsend/email-spell-checker/issues/33#issuecomment-2040235109
const mailcheckDistance = (domain: string, knownDomain: string) => {
  let dist = distance(domain, knownDomain);
  // force prioritize .com matches over .co and .ca
  if (knownDomain === 'com') dist -= 0.75;
  return dist;
};

export default function suggestEmailFix(email: string) {
  let result;
  try {
    result = emailSpellChecker.run({
      email: email,
      domains: [
        // Original domain list at https://github.com/smashsend/email-spell-checker/blob/420dc73a72316848c2bd908c6fb95e4aa9aa0855/src/lib/config/index.ts
        ...emailSpellChecker.POPULAR_DOMAINS,
        // These missing extras are based on our actual userbase emails, above 100 users
        'telenet.be',
        'skynet.be',
        'gmx.de',
        'gmx.net',
        'orange.fr',
        'laposte.net',
        'free.fr',
        'posteo.de',
        'wanadoo.fr',
        // See https://github.com/smashsend/email-spell-checker/pull/27/changes
        'mac.com'
      ],
      // See https://github.com/smashsend/email-spell-checker/pull/27/changes
      topLevelDomains: [...emailSpellChecker.POPULAR_TLDS, 'tv'],
      distanceFunction: mailcheckDistance
    });
    return result;
  } catch (e) {
    // Due to this: https://github.com/smashsend/email-spell-checker/issues/34
    // not super trivial or important to provide a workaround for here, see:
    // - https://stackoverflow.com/questions/2049502/what-characters-are-allowed-in-an-email-address#2049510
    // - https://www.jochentopf.com/email/chars.html
    logger.warn(
      'Non-fatal during email suggestion processing',
      e instanceof Error ? e.message : ''
    );
    // Pretend there was no issue.
    // If it's a really invalid email, we have an email validator in validate-email.ts before submit.
    // Google might also complain on the back-end.
    return undefined;
  }
}
