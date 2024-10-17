const { createClient } = require('@supabase/supabase-js');
const { shouldReplicateRuntime } = require('./sharedConfig');

/**
 * @typedef {import('@supabase/supabase-js').SupabaseClient<any, "public", any>} SupabaseClient
 */

/**
 * @type {SupabaseClient}
 */
let supabaseClient;

exports.initialize = () => {
  /* Some environments don't have replication, for example, staging.
   * To prevent errors when constructing the client, we don't construct it if it is disabled.
   */
  supabaseClient = shouldReplicateRuntime()
    ? createClient(process.env.SUPABASE_API_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
    : /** @type {SupabaseClient} */ (
        new Proxy(
          {},
          {
            get() {
              throw new Error('Trying to use a Supabase client while replication is disabled!');
            }
          }
        )
      );
};
exports.supabase = () => supabaseClient;
