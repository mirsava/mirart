import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

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

export const sendContactEmail = async ({
  to,
  from,
  fromName,
  subject,
  message,
  listingTitle,
  listingId,
}) => {
  const emailContent = {
    from: `"${fromName || 'ArtZyla User'}" <${process.env.SMTP_FROM_EMAIL || from}>`,
    to: to,
    subject: subject || `Inquiry about: ${listingTitle}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #534bae; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9f9f9; }
            .message-box { background-color: white; padding: 15px; border-left: 4px solid #534bae; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
            .info { margin: 10px 0; }
            .label { font-weight: bold; color: #534bae; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>ArtZyla - New Artwork Inquiry</h2>
            </div>
            <div class="content">
              <p>Hello,</p>
              <p>You have received a new inquiry about your artwork listed on ArtZyla.</p>
              
              <div class="info">
                <span class="label">Artwork:</span> ${listingTitle}
              </div>
              <div class="info">
                <span class="label">Listing ID:</span> #${listingId}
              </div>
              <div class="info">
                <span class="label">From:</span> ${fromName || 'Anonymous'} (${from})
              </div>
              
              <div class="message-box">
                <p><strong>Message:</strong></p>
                <p>${message.replace(/\n/g, '<br>')}</p>
              </div>
              
              <p>Please respond directly to this email to continue the conversation with the interested buyer.</p>
            </div>
            <div class="footer">
              <p>This email was sent through ArtZyla marketplace.</p>
              <p>Please do not reply to this automated message. Reply directly to the sender's email address above.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
ArtZyla - New Artwork Inquiry

Hello,

You have received a new inquiry about your artwork listed on ArtZyla.

Artwork: ${listingTitle}
Listing ID: #${listingId}
From: ${fromName || 'Anonymous'} (${from})

Message:
${message}

Please respond directly to this email to continue the conversation with the interested buyer.

---
This email was sent through ArtZyla marketplace.
Please do not reply to this automated message. Reply directly to the sender's email address above.
    `,
  };

  if (!transporter) {
    console.log('=== MOCK EMAIL (SMTP not configured) ===');
    console.log('To:', to);
    console.log('From:', emailContent.from);
    console.log('Subject:', emailContent.subject);
    console.log('Message:', message);
    console.log('========================================');
    return {
      success: true,
      messageId: `mock-${Date.now()}`,
      mocked: true,
    };
  }

  try {
    const info = await transporter.sendMail(emailContent);
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

