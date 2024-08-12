const { config } = require('firebase-functions');
const { createClient } = require('@supabase/supabase-js');

const { api_url, service_role_key } = config().supabase;

const { shouldReplicate } = require('./sharedConfig');

module.exports = shouldReplicate
  ? createClient(api_url, service_role_key)
  : new Proxy(
      {},
      {
        get() {
          throw new Error('Trying to use a Supabase client while replication is disabled!');
        }
      }
    );
