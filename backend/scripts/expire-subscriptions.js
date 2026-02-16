import dotenv from 'dotenv';
dotenv.config();

import { runSubscriptionExpirationJob } from '../services/subscriptionExpiration.js';

runSubscriptionExpirationJob()
  .then((r) => {
    console.log('Done:', r);
    process.exit(0);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
