import dotenv from 'dotenv';

dotenv.config();

const SITE_NAME = 'ArtZyla';
const SITE_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

/**
 * Builds a full email from a template (wraps content in standard layout).
 * Exported for use in preview scripts.
 * @param {Object} template - { headerSubtitle, contentHtml, contentText, source?, sourceDetail? }
 * @returns {{ html: string, text: string }}
 */
export const buildTemplate = (template) => {
  const { headerSubtitle, contentHtml, contentText, source, sourceDetail } = template;
  const sourceInfo = source
    ? `Source: ${source}${sourceDetail ? ` — ${sourceDetail}` : ''}`
    : `${SITE_NAME} Marketplace`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #b5573a 0%, #c97a5f 100%); color: white; padding: 24px; text-align: center; border-radius: 8px 8px 0 0; }
          .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
          .header p { margin: 8px 0 0; font-size: 14px; opacity: 0.9; }
          .content { padding: 24px; background-color: #fafafa; border: 1px solid #eee; border-top: none; }
          .message-box { background-color: white; padding: 16px; border-left: 4px solid #b5573a; margin: 20px 0; border-radius: 0 4px 4px 0; }
          .footer { padding: 24px; text-align: center; color: #666; font-size: 12px; border-top: 1px solid #eee; }
          .footer-brand { font-weight: 600; color: #b5573a; margin-bottom: 8px; }
          .footer-source { background: #f5f5f5; padding: 12px; border-radius: 4px; margin: 16px 0; font-size: 11px; color: #555; }
          .footer a { color: #b5573a; text-decoration: none; }
          .info { margin: 10px 0; }
          .label { font-weight: 600; color: #b5573a; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${SITE_NAME}</h1>
            <p>${headerSubtitle || 'Art Marketplace'}</p>
          </div>
          <div class="content">
            ${contentHtml}
          </div>
          <div class="footer">
            <div class="footer-brand">${SITE_NAME}</div>
            <div class="footer-source">${sourceInfo}</div>
            <p>This email was sent from <a href="${SITE_URL}">${SITE_URL}</a></p>
            <p>© ${new Date().getFullYear()} ${SITE_NAME}. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  const text = `${contentText}\n\n---\n${sourceInfo}\nThis email was sent from ${SITE_URL}\n© ${new Date().getFullYear()} ${SITE_NAME}`;

  return { html, text };
};

const RESEND_API_URL = 'https://api.resend.com';
const REQUEST_TIMEOUT_MS = 10000;

// Read at call time so the key can be set (or changed) without re-importing this module.
const getEmailConfig = () => ({
  apiKey: process.env.RESEND_API_KEY || '',
  from: process.env.EMAIL_FROM || `${SITE_NAME} <onboarding@resend.dev>`,
});

/**
 * Generic email sender (Resend HTTPS API, so it also works on hosts that block SMTP). Use with any template.
 * Without RESEND_API_KEY the email is logged instead of sent, which is handy in development.
 * @param {Object} options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {Object} options.template - Template object (headerSubtitle, contentHtml, contentText, source?, sourceDetail?)
 * @param {string} [options.replyTo] - Reply-to address
 * @param {string} [options.replyToName] - Reply-to display name
 * @param {string} [options.cc] - CC addresses
 * @param {string} [options.bcc] - BCC addresses
 * @returns {Promise<{ success: boolean, messageId?: string, mocked?: boolean }>}
 */
export const sendEmail = async ({ to, subject, template, replyTo, replyToName, cc, bcc }) => {
  const { html, text } = buildTemplate(template);
  const { apiKey, from } = getEmailConfig();

  if (!apiKey) {
    console.log('=== MOCK EMAIL (RESEND_API_KEY not configured) ===');
    console.log('To:', to);
    console.log('Subject:', subject);
    console.log('==================================================');
    return { success: true, messageId: `mock-${Date.now()}`, mocked: true };
  }

  const payload = { from, to: Array.isArray(to) ? to : [to], subject, html, text };
  if (replyTo) payload.reply_to = replyToName ? `${replyToName} <${replyTo}>` : replyTo;
  if (cc) payload.cc = Array.isArray(cc) ? cc : [cc];
  if (bcc) payload.bcc = Array.isArray(bcc) ? bcc : [bcc];

  let response;
  try {
    response = await fetch(`${RESEND_API_URL}/emails`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    console.error('Error sending email:', error);
    throw new Error(`Failed to send email: ${error.message}`);
  }

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const reason = body.message || body.error || `HTTP ${response.status}`;
    console.error('Email provider rejected the message:', reason);
    throw new Error(`Failed to send email: ${reason}`);
  }
  return { success: true, messageId: body.id, mocked: false };
};

/**
 * Template builders. Each returns a template object for use with sendEmail.
 * Add new templates here as needed (welcome, order confirmation, subscription, etc.)
 */
export const templates = {
  /** Artwork inquiry from gallery contact form */
  contact: ({ listingTitle, listingId, message, fromName, from }) => ({
    headerSubtitle: 'Someone is interested in your artwork',
    contentHtml: `
      <p>Hello,</p>
      <p>You have received a new inquiry about your artwork listed on ${SITE_NAME}.</p>
      <div class="info"><span class="label">Artwork:</span> ${listingTitle}</div>
      <div class="info"><span class="label">Listing ID:</span> #${listingId}</div>
      <div class="info"><span class="label">From:</span> ${fromName || 'Anonymous'} (${from})</div>
      <div class="message-box">
        <p><strong>Message:</strong></p>
        <p>${(message || '').replace(/\n/g, '<br>')}</p>
      </div>
      <p><strong>Reply to this email</strong> to continue the conversation with the interested buyer.</p>
    `,
    contentText: `You have received a new inquiry about your artwork on ${SITE_NAME}.

Artwork: ${listingTitle}
Listing ID: #${listingId}
From: ${fromName || 'Anonymous'} (${from})

Message:
${message}

Reply directly to this email to continue the conversation.`,
    source: 'Artwork Inquiry',
    sourceDetail: `Contact form from gallery — ${listingTitle}`,
  }),

  /** Welcome email after account creation */
  welcome: ({ userName, loginUrl }) => ({
    headerSubtitle: 'Welcome to ArtZyla!',
    contentHtml: `
      <p>Hi ${userName || 'there'},</p>
      <p>Welcome to <strong>${SITE_NAME}</strong> — your marketplace for discovering and selling art.</p>
      <p>Your account has been created successfully. You can now:</p>
      <ul>
        <li>Browse and discover artwork from talented artists</li>
        <li>List your own artwork and reach buyers worldwide</li>
        <li>Connect with collectors and fellow artists</li>
      </ul>
      <p style="text-align: center; margin: 24px 0;">
        <a href="${loginUrl || SITE_URL}" style="display: inline-block; background: linear-gradient(135deg, #b5573a 0%, #c97a5f 100%); color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600;">Get Started</a>
      </p>
      <p>If you have any questions, feel free to reach out. We're here to help!</p>
      <p>Happy creating,<br>The ${SITE_NAME} Team</p>
    `,
    contentText: `Hi ${userName || 'there'},

Welcome to ${SITE_NAME} — your marketplace for discovering and selling art.

Your account has been created successfully. Get started at: ${loginUrl || SITE_URL}

Happy creating,
The ${SITE_NAME} Team`,
    source: 'Account',
    sourceDetail: 'Welcome email',
  }),

  /** Email verification code (e.g. for signup confirmation) */
  verificationCode: ({ userName, code, expiresInMinutes }) => ({
    headerSubtitle: 'Verify your email address',
    contentHtml: `
      <p>Hi ${userName || 'there'},</p>
      <p>Please use the following code to verify your email address:</p>
      <div class="message-box" style="text-align: center;">
        <p style="font-size: 28px; font-weight: 700; letter-spacing: 4px; margin: 0;">${code || '123456'}</p>
      </div>
      <p>This code expires in ${expiresInMinutes || 24} hours.</p>
      <p>If you didn't request this, you can safely ignore this email.</p>
    `,
    contentText: `Hi ${userName || 'there'},

Your verification code is: ${code || '123456'}

This code expires in ${expiresInMinutes || 24} hours.

If you didn't request this, you can safely ignore this email.`,
    source: 'Account',
    sourceDetail: 'Email verification',
  }),

  /** Password reset request (code or link) */
  passwordReset: ({ userName, resetLink, code, expiresInMinutes }) => ({
    headerSubtitle: 'Reset your password',
    contentHtml: `
      <p>Hi ${userName || 'there'},</p>
      <p>We received a request to reset your password for your ${SITE_NAME} account.</p>
      ${resetLink
        ? `<p style="text-align: center; margin: 24px 0;"><a href="${resetLink}" style="display: inline-block; background: linear-gradient(135deg, #b5573a 0%, #c97a5f 100%); color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600;">Reset Password</a></p><p>Or copy this link: ${resetLink}</p>`
        : `<div class="message-box" style="text-align: center;"><p style="font-size: 28px; font-weight: 700; letter-spacing: 4px; margin: 0;">${code || '123456'}</p></div><p>Enter this code on the password reset page.</p>`
      }
      <p>This ${resetLink ? 'link' : 'code'} expires in ${expiresInMinutes || 60} minutes.</p>
      <p>If you didn't request a password reset, please ignore this email or contact support if you have concerns.</p>
    `,
    contentText: `Hi ${userName || 'there'},

We received a request to reset your password for your ${SITE_NAME} account.

${resetLink ? `Reset your password: ${resetLink}` : `Your reset code is: ${code || '123456'}`}

This ${resetLink ? 'link' : 'code'} expires in ${expiresInMinutes || 60} minutes.

If you didn't request this, please ignore this email.`,
    source: 'Account',
    sourceDetail: 'Password reset',
  }),

  /** Password successfully changed confirmation */
  passwordChanged: ({ userName }) => ({
    headerSubtitle: 'Your password was changed',
    contentHtml: `
      <p>Hi ${userName || 'there'},</p>
      <p>Your ${SITE_NAME} account password was successfully changed.</p>
      <p>If you made this change, you're all set. If not, please contact us immediately — your account may have been compromised.</p>
      <p style="text-align: center; margin: 24px 0;">
        <a href="${SITE_URL}" style="display: inline-block; background: linear-gradient(135deg, #b5573a 0%, #c97a5f 100%); color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600;">Sign In</a>
      </p>
    `,
    contentText: `Hi ${userName || 'there'},

Your ${SITE_NAME} account password was successfully changed.

If you made this change, you're all set. If not, please contact us immediately.`,
    source: 'Account',
    sourceDetail: 'Password change confirmation',
  }),

  /** Message reply from ArtZyla Messages */
  /** Someone sent a seller a new message through the site (no sender email is exposed) */
  newMessage: ({ listingTitle, listingId, message, fromName }) => {
    const esc = (value) => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const link = `${SITE_URL}/messages`;
    return {
      headerSubtitle: 'You have a new message',
      contentHtml: `
        <p>Hello,</p>
        <p><strong>${esc(fromName || 'Someone')}</strong> sent you a message about <strong>${esc(listingTitle)}</strong> on ${SITE_NAME}.</p>
        <div class="message-box">
          <p>${esc(message).replace(/\n/g, '<br>')}</p>
        </div>
        <p><a href="${link}">Read and reply on ${SITE_NAME}</a></p>
      `,
      contentText: `${fromName || 'Someone'} sent you a message about "${listingTitle}" on ${SITE_NAME}.

${message}

Read and reply: ${link}`,
      source: 'Messages',
      sourceDetail: `New message about ${listingTitle} (listing #${listingId})`,
    };
  },

  messageReply: ({ listingTitle, listingId, message, fromName, from }) => ({
    headerSubtitle: 'Someone replied to your message',
    contentHtml: `
      <p>Hello,</p>
      <p>You have received a reply to your conversation about artwork on ${SITE_NAME}.</p>
      <div class="info"><span class="label">Artwork:</span> ${listingTitle}</div>
      <div class="info"><span class="label">Listing ID:</span> #${listingId}</div>
      <div class="info"><span class="label">From:</span> ${fromName || 'Anonymous'} (${from})</div>
      <div class="message-box">
        <p><strong>Message:</strong></p>
        <p>${(message || '').replace(/\n/g, '<br>')}</p>
      </div>
      <p><strong>Reply to this email</strong> to continue the conversation.</p>
    `,
    contentText: `You have received a reply on ${SITE_NAME}.

Artwork: ${listingTitle}
Listing ID: #${listingId}
From: ${fromName || 'Anonymous'} (${from})

Message:
${message}

Reply directly to this email to continue the conversation.`,
    source: 'Messages',
    sourceDetail: `Reply in ArtZyla Messages — ${listingTitle}`,
  }),
};

/** Escapes text for use inside email HTML. */
export const escapeHtml = (value) =>
  String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const button = (href, label) =>
  `<p style="text-align: center; margin: 24px 0;"><a href="${href}" style="display: inline-block; background: linear-gradient(135deg, #b5573a 0%, #c97a5f 100%); color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600;">${label}</a></p>`;

/** A listing pass or featured spot is about to end. */
templates.renewalReminder = ({ userName, listingTitle, kind, expiresAt, renewUrl }) => {
  const when = new Date(expiresAt).toLocaleString('en-US', { month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'UTC', timeZoneName: 'short' });
  const isPass = kind === 'listing_pass';
  const headline = isPass
    ? `"${listingTitle}" stays live until ${when}.`
    : `"${listingTitle}" is featured until ${when}.`;
  const detail = isPass
    ? 'After that it needs a free slot on your plan, otherwise it goes offline. Extend it to keep it live.'
    : 'After that it drops back to its normal place in the gallery. Renew to keep it at the top and in the homepage spotlight.';
  return {
    headerSubtitle: isPass ? 'Your listing pass is ending soon' : 'Your featured spot is ending soon',
    contentHtml: `
      <p>Hi ${escapeHtml(userName || 'there')},</p>
      <p><strong>${escapeHtml(headline)}</strong></p>
      <p>${detail}</p>
      ${button(renewUrl, isPass ? 'Extend listing' : 'Renew feature')}
    `,
    contentText: `Hi ${userName || 'there'},

${headline}

${detail}

Renew: ${renewUrl}`,
    source: 'Account',
    sourceDetail: isPass ? 'Listing pass reminder' : 'Featured listing reminder',
  };
};

const listingCard = (listing) => `
  <td style="width: 50%; padding: 8px; vertical-align: top;">
    <a href="${listing.url}" style="text-decoration: none; color: #333;">
      ${listing.image ? `<img src="${listing.image}" alt="${escapeHtml(listing.title)}" width="260" style="width: 100%; max-width: 260px; height: auto; border-radius: 6px; display: block;">` : ''}
      <div style="font-weight: 600; margin-top: 6px;">${escapeHtml(listing.title)}</div>
      <div style="color: #666; font-size: 13px;">${escapeHtml(listing.artist || '')}${listing.price != null ? ` &middot; $${Number(listing.price).toLocaleString('en-US')}` : ''}</div>
    </a>
  </td>`;

const listingGrid = (listings) => {
  const rows = [];
  for (let i = 0; i < listings.length; i += 2) rows.push(`<tr>${listingCard(listings[i])}${listings[i + 1] ? listingCard(listings[i + 1]) : '<td></td>'}</tr>`);
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0">${rows.join('')}</table>`;
};

/** Weekly "new art" digest. Sections are skipped when empty. */
templates.weeklyDigest = ({ featuredArtist, featuredListings, newListings, galleryUrl, unsubscribeUrl }) => {
  const sections = [];
  const text = [];
  if (featuredArtist) {
    sections.push(`
      <h2 style="color: #b5573a; font-size: 18px; margin: 0 0 8px;">Featured artist: ${escapeHtml(featuredArtist.name)}</h2>
      ${featuredArtist.bio ? `<p style="margin: 0 0 8px;">${escapeHtml(featuredArtist.bio.slice(0, 280))}${featuredArtist.bio.length > 280 ? '…' : ''}</p>` : ''}
      ${featuredArtist.listings.length ? listingGrid(featuredArtist.listings) : ''}
      ${featuredArtist.url ? `<p><a href="${featuredArtist.url}">See all work by ${escapeHtml(featuredArtist.name)}</a></p>` : ''}`);
    text.push(`FEATURED ARTIST: ${featuredArtist.name}${featuredArtist.url ? `\n${featuredArtist.url}` : ''}`);
  }
  if (featuredListings.length) {
    sections.push(`<h2 style="color: #b5573a; font-size: 18px; margin: 24px 0 8px;">Spotlight</h2>${listingGrid(featuredListings)}`);
    text.push(`SPOTLIGHT\n${featuredListings.map((l) => `- ${l.title} (${l.url})`).join('\n')}`);
  }
  if (newListings.length) {
    sections.push(`<h2 style="color: #b5573a; font-size: 18px; margin: 24px 0 8px;">New this week</h2>${listingGrid(newListings)}`);
    text.push(`NEW THIS WEEK\n${newListings.map((l) => `- ${l.title} (${l.url})`).join('\n')}`);
  }
  return {
    headerSubtitle: 'New art this week',
    contentHtml: `
      ${sections.join('')}
      ${button(galleryUrl, 'Browse the gallery')}
      <p style="font-size: 12px; color: #888; text-align: center;">You are getting this because you subscribed to the ${SITE_NAME} weekly email. <a href="${unsubscribeUrl}">Unsubscribe</a></p>
    `,
    contentText: `${text.join('\n\n')}\n\nBrowse the gallery: ${galleryUrl}\n\nUnsubscribe: ${unsubscribeUrl}`,
    source: 'Newsletter',
    sourceDetail: 'Weekly digest',
  };
};

/**
 * Sends up to 100 emails per request through Resend's batch API. Each message:
 * { to, subject, template, headers? }. Without RESEND_API_KEY the batch is logged instead of sent.
 */
export const sendEmailBatch = async (messages) => {
  const { apiKey, from } = getEmailConfig();
  let sent = 0;
  for (let i = 0; i < messages.length; i += 100) {
    const chunk = messages.slice(i, i + 100).map(({ to, subject, template, headers }) => {
      const { html, text } = buildTemplate(template);
      return { from, to: [to], subject, html, text, ...(headers ? { headers } : {}) };
    });
    if (!apiKey) {
      console.log(`=== MOCK EMAIL BATCH (RESEND_API_KEY not configured): ${chunk.length} x "${chunk[0]?.subject}" ===`);
      sent += chunk.length;
      continue;
    }
    const response = await fetch(`${RESEND_API_URL}/emails/batch`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(chunk),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS * 3),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(`Failed to send email batch after ${sent} sent: ${body.message || body.error || `HTTP ${response.status}`}`);
    }
    sent += chunk.length;
  }
  return { sent, mocked: !apiKey };
};

/**
 * Convenience: send welcome email after account creation.
 */
export const sendWelcomeEmail = async ({ to, userName }) => {
  return sendEmail({
    to,
    subject: `Welcome to ${SITE_NAME}!`,
    template: templates.welcome({ userName, loginUrl: SITE_URL }),
  });
};

/**
 * Convenience: send password reset email (code or link).
 */
export const sendPasswordResetEmail = async ({ to, userName, resetLink, code, expiresInMinutes }) => {
  return sendEmail({
    to,
    subject: `Reset your ${SITE_NAME} password`,
    template: templates.passwordReset({ userName, resetLink, code, expiresInMinutes }),
  });
};

/**
 * Convenience: send password changed confirmation.
 */
export const sendPasswordChangedEmail = async ({ to, userName }) => {
  return sendEmail({
    to,
    subject: `Your ${SITE_NAME} password was changed`,
    template: templates.passwordChanged({ userName }),
  });
};

/**
 * Convenience: send artwork inquiry email (contact form).
 */
export const sendContactEmail = async ({
  to,
  from,
  fromName,
  subject,
  message,
  listingTitle,
  listingId,
}) => {
  return sendEmail({
    to,
    subject: subject || `Inquiry about: ${listingTitle}`,
    template: templates.contact({ listingTitle, listingId, message, fromName, from }),
    replyTo: from,
    replyToName: fromName,
  });
};

export const verifyEmailConfig = async () => {
  const { apiKey, from } = getEmailConfig();
  if (!apiKey) {
    return { configured: false, message: 'RESEND_API_KEY is not set. Emails are logged instead of sent.' };
  }

  try {
    const response = await fetch(`${RESEND_API_URL}/domains`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (response.ok) return { configured: true, from, message: 'Email API key verified successfully.' };
    const body = await response.json().catch(() => ({}));
    // A send-only key cannot list domains but is still valid for sending.
    if (response.status === 401 && body.name === 'restricted_api_key') {
      return { configured: true, from, message: 'Send-only API key detected. Sending is enabled.' };
    }
    return { configured: false, message: `Email API rejected the key: ${body.message || `HTTP ${response.status}`}` };
  } catch (error) {
    return { configured: false, message: `Email API check failed: ${error.message}` };
  }
};
