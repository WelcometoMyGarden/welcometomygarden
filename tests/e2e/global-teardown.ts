import { exec as cbExec } from 'node:child_process';
import { promisify } from 'node:util';
const exec = promisify(cbExec);
export default async function () {
  console.log('Killing all emulators');
  await exec('./killemulators.sh');
}
