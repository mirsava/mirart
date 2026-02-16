import Stripe from 'stripe';
import dotenv from 'dotenv';

dotenv.config();

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
  console.warn('STRIPE_SECRET_KEY not configured. Payment routes will fail.');
}

export const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, { apiVersion: '2024-11-20.acacia' })
  : null;
