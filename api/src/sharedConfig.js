const { config } = require('firebase-functions');

exports.shouldReplicate = !config().supabase?.disable_replication;
