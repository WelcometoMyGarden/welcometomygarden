// For making test assertions on Stripe data
// Loads the API .env
import Stripe from 'stripe';
import { parse } from 'dotenv';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));

const demoProjectFirebaseEnv = parse(
  readFileSync(resolve(__dirname, '../../../api/.env.local'), 'utf-8')
);

export default new Stripe(demoProjectFirebaseEnv.STRIPE_SECRET_KEY!);
