const { Resend } = require('resend');

function getResendClient() {
  const key = process.env.RESEND_API_KEY || '';
  if (!key || key.startsWith('re_placeholder')) return null;
  return new Resend(key);
}

function baseHtml(title, body) {
  return `
  <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#020617;color:#e2e8f0;padding:32px;border-radius:8px;border:1px solid #1e293b">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:24px">
      <div style="width:24px;height:24px;background:#0ea5e9;border-radius:4px;display:flex;align-items:center;justify-content:center">
        <span style="color:white;font-weight:900;font-size:14px">R</span>
      </div>
      <span style="font-weight:900;font-size:16px;color:white;letter-spacing:1px">RENERGIZR</span>
    </div>
    <h2 style="color:#0ea5e9;margin-bottom:16px;font-size:20px">${title}</h2>
    ${body}
    <hr style="border:none;border-top:1px solid #1e293b;margin:24px 0" />
    <p style="color:#64748b;font-size:11px">Renergizr Industries Pvt. Ltd. · B2B Energy Trading Platform · India</p>
  </div>`;
}

async function sendEmail(to, subject, html) {
  const client = getResendClient();
  if (!client) {
    console.log(`[Email] Skipped (no RESEND_API_KEY): to=${to}, subject=${subject}`);
    return;
  }
  const sender = process.env.SENDER_EMAIL || 'noreply@renergizr.com';
  try {
    await client.emails.send({ from: sender, to: [to], subject, html });
    console.log(`[Email] Sent to ${to}: ${subject}`);
  } catch (err) {
    console.error(`[Email] Failed to ${to}: ${err.message}`);
  }
}

module.exports = { sendEmail, baseHtml };
