import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

// The API only returns JSON and images are served from Supabase Storage, so a CSP adds nothing here;
// cross-origin resource policy is relaxed because the frontend lives on a different origin.
export const securityHeaders = helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
});

const tooMany = (message) => ({ error: message, code: 'rate_limited' });

// Exported for tests and reuse; the named limiters below skip themselves under NODE_ENV=test.
export const createLimiter = ({ windowMs, limit, message, ...options }) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: tooMany(message),
    ...options,
  });

const enforced = () => process.env.NODE_ENV !== 'test';
const limiter = (options) => createLimiter({ skip: () => !enforced(), ...options });

// Broad ceiling for every API call from one IP.
export const apiLimiter = limiter({ windowMs: 60 * 1000, limit: 300, message: 'Too many requests. Please slow down and try again shortly.' });

// Username sign-in: slows password guessing. Successful logins do not count against the limit.
export const loginLimiter = limiter({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  message: 'Too many sign-in attempts. Please wait 15 minutes and try again.',
});

// Username availability lookups (prevents scraping the user list).
export const usernameLookupLimiter = limiter({ windowMs: 60 * 1000, limit: 30, message: 'Too many lookups. Please try again shortly.' });

// Endpoints that send email to a seller or store chat messages from the public.
export const outboundMessageLimiter = limiter({ windowMs: 60 * 60 * 1000, limit: 30, message: 'You have sent too many messages. Please try again later.' });

// The anonymous contact form is the easiest thing to spam.
export const anonymousContactLimiter = limiter({ windowMs: 60 * 60 * 1000, limit: 8, message: 'Too many contact requests. Please try again later.' });
