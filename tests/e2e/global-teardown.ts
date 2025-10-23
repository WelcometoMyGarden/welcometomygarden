import { exec as cbExec } from 'node:child_process';
import { promisify } from 'node:util';
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.test.local') });

const exec = promisify(cbExec);
export default async function () {
  if (process.env.KILL_EMULATORS === 'true') {
    console.log('Killing all emulators');
    await exec('./killemulators.sh');
  }
}
