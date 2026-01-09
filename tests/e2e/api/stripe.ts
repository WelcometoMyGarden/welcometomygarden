// For making test assertions on Stripe data
// Loads the API .env
import Stripe from 'stripe';
import { parse } from 'dotenv';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import envIsTrue from '../../../src/lib/util/env-is-true';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Check the test env USE_STRIPE before trying to load the backend env vars
const demoProjectFirebaseEnv = envIsTrue(process.env.USE_STRIPE)
  ? parse(readFileSync(resolve(__dirname, '../../../api/.env.local'), 'utf-8'))
  : {};

export default typeof demoProjectFirebaseEnv.STRIPE_SECRET_KEY === 'string' &&
demoProjectFirebaseEnv.STRIPE_SECRET_KEY?.length > 0
  ? new Stripe(demoProjectFirebaseEnv.STRIPE_SECRET_KEY)
  : new Proxy(
      {},
      {
        get() {
          const errorMsg = 'Trying to use the Stripe e2e test client without key';
          console.error(errorMsg);
          throw new Error('Trying to use the Stripe e2e test client without key');
        }
      }
    );
