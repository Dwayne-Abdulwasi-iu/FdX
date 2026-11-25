const nodemailer = require('nodemailer');

function createTransport() {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    const error = new Error('Email is not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASS in the server environment.');
    error.statusCode = 503;
    throw error;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: process.env.SMTP_SECURE === 'true' || port === 465,
    auth: { user, pass }
  });
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function brandedEmailTemplate({ name, subject, message, trackingNumber, status, location, description }) {
  const safeName = escapeHtml(name || 'Valued customer');
  const safeSubject = escapeHtml(subject);
  const safeMessage = escapeHtml(message).replace(/\n/g, '<br>');
  const safeTrackingNumber = escapeHtml(trackingNumber);
  const safeStatus = escapeHtml(status ? status.replace(/_/g, ' ').toUpperCase() : '');
  const safeLocation = escapeHtml(location);
  const safeDescription = escapeHtml(description);
  const updateRows = trackingNumber ? `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:18px 0;border-collapse:collapse">
      <tr><td style="padding:10px;border:1px solid #e6e6e6"><strong>Tracking number</strong></td><td style="padding:10px;border:1px solid #e6e6e6">${safeTrackingNumber}</td></tr>
      ${status ? `<tr><td style="padding:10px;border:1px solid #e6e6e6"><strong>Status</strong></td><td style="padding:10px;border:1px solid #e6e6e6">${safeStatus}</td></tr>` : ''}
      ${location ? `<tr><td style="padding:10px;border:1px solid #e6e6e6"><strong>Location</strong></td><td style="padding:10px;border:1px solid #e6e6e6">${safeLocation}</td></tr>` : ''}
    </table>
  ` : '';

  return `
    <!doctype html>
    <html>
      <body style="margin:0;background:#f4f6f8;font-family:Arial,sans-serif;color:#1f2937">
        <div style="max-width:640px;margin:24px auto;background:#fff;border-radius:10px;overflow:hidden">
          <div style="background:#4d148c;padding:22px 28px;color:#fff;font-size:24px;font-weight:bold">FDX SHIPPING</div>
          <div style="padding:28px">
            <h1 style="font-size:22px;margin-top:0">${safeSubject}</h1>
            <p>Hello ${safeName},</p>
            ${updateRows}
            ${description ? `<p>${safeDescription}</p>` : ''}
            ${safeMessage ? `<div style="line-height:1.6">${safeMessage}</div>` : ''}
            <p style="margin-top:24px;color:#4b5563">Thank you for shipping with FDX.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

async function sendEmail({ to, name, subject, message, trackingNumber, status, location, description }) {
  const transport = createTransport();
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  return transport.sendMail({
    from: `FDX SHIPPING <${from}>`,
    to,
    subject,
    text: `${message || description || ''}${trackingNumber ? `\n\nTracking number: ${trackingNumber}` : ''}`,
    html: brandedEmailTemplate({ name, subject, message, trackingNumber, status, location, description })
  });
}

async function sendBulkEmail({ recipients, subject, message }) {
  const transport = createTransport();
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  let sent = 0;
  let failed = 0;

  for (const recipient of recipients) {
    try {
      await transport.sendMail({
        from: `FDX SHIPPING <${from}>`,
        to: recipient.email,
        subject,
        text: message,
        html: brandedEmailTemplate({ name: recipient.name, subject, message })
      });
      sent++;
    } catch (error) {
      console.error(`Bulk email failed for ${recipient.email}:`, error.message);
      failed++;
    }
  }

  return { sent, failed };
}

module.exports = { sendEmail, sendBulkEmail };
