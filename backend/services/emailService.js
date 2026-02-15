import nodemailer from 'nodemailer';
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
          .header { background: linear-gradient(135deg, #4a3a9a 0%, #534bae 100%); color: white; padding: 24px; text-align: center; border-radius: 8px 8px 0 0; }
          .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
          .header p { margin: 8px 0 0; font-size: 14px; opacity: 0.9; }
          .content { padding: 24px; background-color: #fafafa; border: 1px solid #eee; border-top: none; }
          .message-box { background-color: white; padding: 16px; border-left: 4px solid #4a3a9a; margin: 20px 0; border-radius: 0 4px 4px 0; }
          .footer { padding: 24px; text-align: center; color: #666; font-size: 12px; border-top: 1px solid #eee; }
          .footer-brand { font-weight: 600; color: #4a3a9a; margin-bottom: 8px; }
          .footer-source { background: #f5f5f5; padding: 12px; border-radius: 4px; margin: 16px 0; font-size: 11px; color: #555; }
          .footer a { color: #4a3a9a; text-decoration: none; }
          .info { margin: 10px 0; }
          .label { font-weight: 600; color: #4a3a9a; }
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

const createTransporter = () => {
  const smtpConfig = {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || '',
    },
  };

  if (!smtpConfig.auth.user || !smtpConfig.auth.pass) {
    console.warn('SMTP credentials not configured. Email sending will be mocked.');
    return null;
  }

  return nodemailer.createTransport(smtpConfig);
};

const transporter = createTransporter();

/**
 * Generic email sender. Use with any template.
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

  const mailOptions = {
    from: `"${SITE_NAME}" <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || 'noreply@artzyla.com'}>`,
    to,
    subject,
    html,
    text,
  };

  if (replyTo) {
    mailOptions.replyTo = replyToName ? `"${replyToName}" <${replyTo}>` : replyTo;
  }
  if (cc) mailOptions.cc = cc;
  if (bcc) mailOptions.bcc = bcc;

  if (!transporter) {
    console.log('=== MOCK EMAIL (SMTP not configured) ===');
    console.log('To:', to);
    console.log('Subject:', subject);
    console.log('========================================');
    return {
      success: true,
      messageId: `mock-${Date.now()}`,
      mocked: true,
    };
  }

  try {
    const info = await transporter.sendMail(mailOptions);
    return {
      success: true,
      messageId: info.messageId,
      mocked: false,
    };
  } catch (error) {
    console.error('Error sending email:', error);
    throw new Error(`Failed to send email: ${error.message}`);
  }
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
        <a href="${loginUrl || SITE_URL}" style="display: inline-block; background: linear-gradient(135deg, #4a3a9a 0%, #534bae 100%); color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600;">Get Started</a>
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
        ? `<p style="text-align: center; margin: 24px 0;"><a href="${resetLink}" style="display: inline-block; background: linear-gradient(135deg, #4a3a9a 0%, #534bae 100%); color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600;">Reset Password</a></p><p>Or copy this link: ${resetLink}</p>`
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
        <a href="${SITE_URL}" style="display: inline-block; background: linear-gradient(135deg, #4a3a9a 0%, #534bae 100%); color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600;">Sign In</a>
      </p>
    `,
    contentText: `Hi ${userName || 'there'},

Your ${SITE_NAME} account password was successfully changed.

If you made this change, you're all set. If not, please contact us immediately.`,
    source: 'Account',
    sourceDetail: 'Password change confirmation',
  }),

  /** Message reply from ArtZyla Messages */
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

export const verifySMTPConnection = async () => {
  if (!transporter) {
    return {
      configured: false,
      message: 'SMTP not configured. Using mock mode.',
    };
  }

  try {
    await transporter.verify();
    return {
      configured: true,
      message: 'SMTP connection verified successfully.',
    };
  } catch (error) {
    return {
      configured: false,
      message: `SMTP verification failed: ${error.message}`,
    };
  }
};
