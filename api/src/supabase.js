const { config } = require('firebase-functions');
const { createClient } = require('@supabase/supabase-js');

const { api_url, service_role_key } = config().supabase;

module.exports = createClient(api_url, service_role_key);
