import { Browser, Page, type BrowserContext } from '@playwright/test';

export async function openEmail({
  context,
  name,
  email,
  linkPrefix,
  existingMailpitPage
}: {
  context: BrowserContext;
  name: string;
  /**
   * The email this mail sent TO (the receiver) - needed to distinguish email in a unified inbox
   */
  email: string;
  /**
   * The prefix of the link in the mail to open
   */
  linkPrefix: string;
  existingMailpitPage?: Page;
}) {
  // Open a new tab with Mailpit
  const mailpitPage = existingMailpitPage ?? (await context.newPage());
  await mailpitPage.goto('http://127.0.0.1:8025/');
  // Open verification email
  // TODO this assumes the email is the first one in the inbox
  await mailpitPage
    .getByRole('link', { name: `${name} to ${email}` })
    .first()
    .click();
  const verifiedPagePromise = mailpitPage.waitForEvent('popup');
  // Find plain text activation link inside the email (it can do that!)
  // NOTE: this is local-dev dependent
  await mailpitPage.getByRole('link', { name: linkPrefix }).click();
  const openedLinkPage = await verifiedPagePromise;
  return { mailpitPage, openedLinkPage };
}

export async function makeSuperfan({
  context,
  firstName
}: {
  context: BrowserContext;
  firstName: string;
}) {
  // open firebase admin to make this one a superfan
  const firebaseAdminPage = await context.newPage();
  await firebaseAdminPage.goto('http://localhost:4001/');
  // Open "Authentication"
  await firebaseAdminPage.getByRole('link', { name: 'Go to auth emulator' }).click();
  // Locate the user ID of robot2
  await firebaseAdminPage
    .locator('tr')
    .filter({ hasText: firstName })
    .getByRole('cell')
    .nth(4)
    .click({
      // Select text
      clickCount: 3
    });

  // Copy user id
  await firebaseAdminPage.locator('body').press('ControlOrMeta+c');
  // Go to the Firestore view
  await firebaseAdminPage.getByRole('link', { name: 'Firestore' }).click();
  // Users
  await firebaseAdminPage.getByLabel('View contents of collection with id: "users"').click();
  // Focuses the path field (I tried other methods from codegen, but they don't work and probably rely on some JS hover somewhere)
  await firebaseAdminPage.getByText('homeusers').click();
  // Grant clipboard permissions to browser context
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  const handle = await firebaseAdminPage.evaluateHandle(() => navigator.clipboard.readText());
  // For some reason the clipboard includes spaces
  const copiedUid = (await handle.jsonValue()).trim();
  await firebaseAdminPage.getByLabel('Document path').fill(`/users/${copiedUid}`);
  // open
  await firebaseAdminPage.getByLabel('Document path').press('Enter');
  // make superfan
  await firebaseAdminPage.getByRole('button', { name: 'add Add field' }).click();
  await firebaseAdminPage.getByLabel('Field', { exact: true }).fill('superfan');
  await firebaseAdminPage.getByLabel('Field', { exact: true }).press('Tab');
  await firebaseAdminPage.getByLabel('Type').selectOption('boolean');
  await firebaseAdminPage.getByLabel('Type').press('Tab');
  await firebaseAdminPage.getByRole('button', { name: 'Save' }).click();
  // Wait for the change to take effect
  await firebaseAdminPage.waitForTimeout(100);
  return { firebaseAdminPage };
}
