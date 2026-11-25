const nodemailer = require('nodemailer');

function createTransport() {
  const host = process.env.SMTP_HOST;
  const port = Number.parseInt(process.env.SMTP_PORT || '465', 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    const error = new Error('Email is not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASS in the server environment.');
    error.statusCode = 503;
    throw error;
  }

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    const error = new Error('SMTP_PORT must be a valid TCP port number.');
    error.statusCode = 503;
    throw error;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: process.env.SMTP_SECURE === 'true' || port === 465,
    auth: { user, pass },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 30000
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

function brandedEmailTemplate({ name, subject, message, trackingNumber, status, location, description, isHeld }) {
  const safeName = escapeHtml(name || 'Valued customer');
  const safeSubject = escapeHtml(subject);
  const safeMessage = escapeHtml(message).replace(/\n/g, '<br>');
  const safeTrackingNumber = escapeHtml(trackingNumber);
  const statusLabels = {
    pending: 'PENDING',
    confirmed: 'ACCEPTED / CONFIRMED',
    picked_up: 'PICKED UP',
    in_transit: 'IN TRANSIT',
    out_for_delivery: 'OUT FOR DELIVERY',
    delivered: 'DELIVERED',
    exception: 'EXCEPTION / HELD',
    returned: 'RETURNED'
  };
  const safeStatus = escapeHtml(statusLabels[status] || (status ? status.replace(/_/g, ' ').toUpperCase() : ''));
  const safeLocation = escapeHtml(location);
  const safeDescription = escapeHtml(description);
  const statusColors = {
    pending: { background: '#ffd400', color: '#241a00', border: '#9c7600' },
    confirmed: { background: '#008a3b', color: '#ffffff', border: '#005e28' },
    picked_up: { background: '#0756c9', color: '#ffffff', border: '#063b88' },
    in_transit: { background: '#006a9c', color: '#ffffff', border: '#004766' },
    out_for_delivery: { background: '#bd4b00', color: '#ffffff', border: '#803300' },
    delivered: { background: '#087443', color: '#ffffff', border: '#064d2d' },
    exception: { background: '#d00000', color: '#ffffff', border: '#8d0000' },
    returned: { background: '#7020a0', color: '#ffffff', border: '#4a126b' }
  };
  const statusColor = statusColors[isHeld ? 'exception' : status] || statusColors.pending;
  const heldLabel = isHeld && status !== 'exception' ? ' / HELD' : '';
  const statusIcon = status === 'exception' || isHeld ? '&#9888; ' : '';
  const updateRows = trackingNumber || status || location ? `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:18px 0;border-collapse:collapse">
      ${trackingNumber ? `<tr><td style="padding:10px;border:1px solid #e6e6e6"><strong>Tracking number</strong></td><td style="padding:10px;border:1px solid #e6e6e6">${safeTrackingNumber}</td></tr>` : ''}
      ${status ? `<tr><td style="padding:10px;border:1px solid #e6e6e6"><strong>Status</strong></td><td style="padding:10px;border:1px solid #e6e6e6"><span style="display:inline-block;padding:6px 10px;border:2px solid ${statusColor.border};border-radius:999px;background:${statusColor.background};color:${statusColor.color};font-weight:bold">${statusIcon}${safeStatus}${heldLabel}</span></td></tr>` : ''}
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

async function sendEmail({ to, name, subject, message, trackingNumber, status, location, description, isHeld }) {
  const transport = createTransport();
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  return transport.sendMail({
    from: `FDX SHIPPING <${from}>`,
    to,
    subject,
    text: `${message || description || ''}${trackingNumber ? `\n\nTracking number: ${trackingNumber}` : ''}`,
    html: brandedEmailTemplate({ name, subject, message, trackingNumber, status, location, description, isHeld })
  });
}

async function sendBulkEmail({ recipients, subject, message, trackingNumber, status }) {
  const transport = createTransport();
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  let sent = 0;
  let failed = 0;
  const errorCodes = {};

  for (const recipient of recipients) {
    try {
      await transport.sendMail({
        from: `FDX SHIPPING <${from}>`,
        to: recipient.email,
        subject,
        text: `${message}${status ? `\n\nStatus: ${status.replace(/_/g, ' ').toUpperCase()}` : ''}${trackingNumber ? `\n\nTracking number: ${trackingNumber}` : ''}`,
        html: brandedEmailTemplate({ name: recipient.name, subject, message, trackingNumber, status })
      });
      sent++;
    } catch (error) {
      console.error(`Bulk email failed for ${recipient.email}:`, {
        message: error.message,
        code: error.code,
        command: error.command
      });
      failed++;
      const code = /^[A-Z0-9_]{1,30}$/.test(error.code || '') ? error.code : 'SMTP_ERROR';
      errorCodes[code] = (errorCodes[code] || 0) + 1;
    }
  }

  return { sent, failed, errorCodes };
}

module.exports = { sendEmail, sendBulkEmail, brandedEmailTemplate };
