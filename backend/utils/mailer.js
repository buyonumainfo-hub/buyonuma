import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

/**
 * Escapes text for safe embedding inside an HTML email body. Needed
 * because the request sanitizer (middleware/sanitize.js) intentionally
 * decodes HTML entities on the way in (so plain-text fields like "Food &
 * Beverages" aren't corrupted into "Food &amp; Beverages"), which means
 * strings arriving here may contain literal &, <, > characters again.
 * Any string sourced from user input must be escaped here before being
 * interpolated into an HTML template, so it can't distort the email
 * markup.
 */
const escapeHtml = (str = '') =>
  String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

// Creates a transporter. Falls back to Ethereal (fake SMTP) when env vars are missing,
// so the app starts without crashing even during development.
const createTransporter = async () => {
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    return nodemailer.createTransport({
      host:   process.env.SMTP_HOST,
      port:   Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  // Ethereal fallback for local dev
  const testAccount = await nodemailer.createTestAccount();
  const t = nodemailer.createTransport({
    host: 'smtp.ethereal.email', port: 587, secure: false,
    auth: { user: testAccount.user, pass: testAccount.pass },
  });
  console.log('📧 Using Ethereal test account:', testAccount.user);
  return t;
};

let _transporter = null;
const getTransporter = async () => {
  if (!_transporter) _transporter = await createTransporter();
  return _transporter;
};

/**
 * Send a welcome email to a new seller.
 */
export const sendSellerWelcomeEmail = async ({ to, store_name, username }) => {
  try {
    const transporter = await getTransporter();
    const fromName    = process.env.SMTP_FROM_NAME || 'buyonuma';
    const fromEmail   = process.env.SMTP_USER      || 'noreply@lensuniversity.edu.ng';
    const adminWa     = process.env.ADMIN_WHATSAPP  || '2348000000000';

    const info = await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to,
      subject: `Welcome to BuyOnUma, ${store_name}! 🎉`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f5f4f0; margin:0; padding:0; }
    .wrap { max-width: 560px; margin: 40px auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
    .header { background: #0d0d0d; padding: 32px 40px; text-align: center; }
    .header h1 { color: #b8923a; font-size: 1.4rem; margin: 0; font-family: Georgia, serif; }
    .header p  { color: rgba(255,255,255,0.6); font-size: 0.8rem; margin: 6px 0 0; }
    .body { padding: 36px 40px; }
    .body h2 { font-size: 1.25rem; color: #0d0d0d; margin-bottom: 12px; font-family: Georgia, serif; }
    .body p  { font-size: 0.92rem; color: #4a4a4a; line-height: 1.7; margin-bottom: 14px; }
    .step { display: flex; gap: 12px; margin-bottom: 16px; align-items: flex-start; }
    .step-num { background: #b8923a; color: #fff; border-radius: 50%; width: 28px; height: 28px; display: inline-flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.8rem; flex-shrink: 0; }
    .step p { margin: 0; font-size: 0.88rem; color: #333; }
    .wa-btn { display: inline-block; background: #25D366; color: #fff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 0.9rem; margin: 8px 0 20px; }
    .note { background: #faf8f3; border-left: 3px solid #b8923a; padding: 12px 16px; border-radius: 4px; font-size: 0.82rem; color: #666; }
    .footer { background: #f5f4f0; padding: 20px 40px; text-align: center; font-size: 0.75rem; color: #999; }
  </style>
</head>
<body>
<div class="wrap">
  <div class="header">
    <h1>Universal Market Access</h1>
    <p>UMA — Seller Portal</p>
  </div>
  <div class="body">
    <h2>Welcome aboard, ${escapeHtml(store_name)}! 🎉</h2>
    <p>Hi <strong>@${username}</strong>, your seller account has been created successfully. You're one step away from listing your products on the Lens University marketplace.</p>

    <p><strong>Here's what happens next:</strong></p>

    <div class="step"><span class="step-num">1</span><p><strong>Wait for admin approval</strong> — Our team will review your store within 1–3 business days.</p></div>
    <div class="step"><span class="step-num">2</span><p><strong>Get a token</strong> — Once approved, contact the admin on WhatsApp to get a listing token.</p></div>
    <div class="step"><span class="step-num">3</span><p><strong>Redeem the token</strong> — Go to your seller dashboard → Redeem Token, and your products go live!</p></div>

    <p>Need faster approval? Message us on WhatsApp:</p>
    <a href="https://wa.me/${adminWa}?text=${encodeURIComponent(`Hi! I just registered as a seller on BuyOnUma. My store is: ${store_name} (@${username}). Please approve my account.`)}" class="wa-btn">
      💬 Message Admin on WhatsApp
    </a>

    <div class="note">
      Your login username is <strong>@${username}</strong>. Keep your password safe — you can update your profile anytime from your seller dashboard at <strong>/seller/dashboard</strong>.
    </div>
  </div>
  <div class="footer">© ${new Date().getFullYear()} buyonuma · All rights reserved</div>
</div>
</body>
</html>
      `,
    });

    if (process.env.NODE_ENV !== 'production') {
      const previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) console.log('📧 Email preview:', previewUrl);
    }
  } catch (err) {
    // Never crash the registration flow because of an email failure
    console.error('❌ Failed to send welcome email:', err.message);
  }
};

/**
 * Send a 5-digit OTP reset code to a seller.
 */
export const sendPasswordResetEmail = async ({ to, store_name, code }) => {
  try {
    const transporter = await getTransporter();
    const fromName    = process.env.SMTP_FROM_NAME || 'buyonuma';
    const fromEmail   = process.env.SMTP_USER      || 'noreply@lensuniversity.edu.ng';

    const info = await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to,
      subject: 'Your Password Reset Code — BuyOnUma',
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <style>
    body{font-family:'Segoe UI',Arial,sans-serif;background:#f5f4f0;margin:0;padding:0;}
    .wrap{max-width:480px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);}
    .header{background:#0d0d0d;padding:28px 36px;text-align:center;}
    .header h1{color:#b8923a;font-size:1.2rem;margin:0;font-family:Georgia,serif;}
    .body{padding:32px 36px;}
    .body p{font-size:0.9rem;color:#444;line-height:1.7;margin-bottom:12px;}
    .code-box{text-align:center;margin:24px 0;}
    .code{display:inline-block;background:#0d0d0d;color:#b8923a;font-size:2.5rem;font-weight:900;letter-spacing:0.3em;padding:16px 32px;border-radius:10px;font-family:monospace;}
    .expire{font-size:0.78rem;color:#999;text-align:center;margin-top:-8px;}
    .warn{background:#fef9c3;border-left:3px solid #f59e0b;padding:10px 14px;border-radius:4px;font-size:0.8rem;color:#78350f;margin-top:16px;}
    .footer{background:#f5f4f0;padding:16px 36px;text-align:center;font-size:0.72rem;color:#aaa;}
  </style>
</head>
<body>
<div class="wrap">
  <div class="header"><h1>Universal Market Access</h1></div>
  <div class="body">
    <p>Hi <strong>${escapeHtml(store_name)}</strong>,</p>
    <p>We received a request to reset your seller account password. Use the code below:</p>
    <div class="code-box"><span class="code">${code}</span></div>
    <p class="expire">This code expires in <strong>10 minutes</strong>.</p>
    <div class="warn">If you did not request a password reset, ignore this email. Your account is still secure.</div>
  </div>
  <div class="footer">© ${new Date().getFullYear()} UNIVERSAL MARKET ACCESS</div>
</div>
</body>
</html>`,
    });

    if (process.env.NODE_ENV !== 'production') {
      const url = nodemailer.getTestMessageUrl(info);
      if (url) console.log('📧 Reset email preview:', url);
    }
  } catch (err) {
    console.error('❌ Failed to send reset email:', err.message);
    throw err; // rethrow so the caller can tell the user
  }
};

/**
 * Send a general contact/support email from a visitor to the admin inbox.
 */
export const sendContactEmail = async ({ name, email, message }) => {
  try {
    const transporter = await getTransporter();
    const fromName  = process.env.SMTP_FROM_NAME || 'buyonuma';
    const fromEmail = process.env.SMTP_USER      || 'noreply@lensuniversity.edu.ng';
    const adminEmail = process.env.ADMIN_EMAIL   || fromEmail;

    const info = await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: adminEmail,
      replyTo: email,
      subject: `New contact form message from ${name}`,
      html: `
<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;">
  <h2 style="color:#0d0d0d;">New Contact Message</h2>
  <p><strong>From:</strong> ${escapeHtml(name)} (${escapeHtml(email)})</p>
  <p style="white-space:pre-wrap;background:#faf8f3;padding:16px;border-radius:8px;">${escapeHtml(message)}</p>
</div>`,
    });

    if (process.env.NODE_ENV !== 'production') {
      const url = nodemailer.getTestMessageUrl(info);
      if (url) console.log('📧 Contact email preview:', url);
    }
  } catch (err) {
    console.error('❌ Failed to send contact email:', err.message);
    throw err;
  }
};

/**
 * Broadcast an email to every address in `recipients`. Sent in small
 * batches with a short delay between batches so we don't get rate-limited
 * or flagged as spam by the SMTP provider, and so one slow/failed send
 * doesn't hold up the whole broadcast. Returns a summary the admin UI can
 * show ("Sent to 480/500").
 */
export const sendBroadcastEmail = async ({ recipients, subject, message }) => {
  const transporter = await getTransporter();
  const fromName  = process.env.SMTP_FROM_NAME || 'buyonuma';
  const fromEmail = process.env.SMTP_USER      || 'noreply@lensuniversity.edu.ng';

  const BATCH_SIZE = 25;
  const DELAY_MS   = 1200;
  let sent = 0;
  let failed = 0;

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/></head>
<body style="font-family:'Segoe UI',Arial,sans-serif;background:#f5f4f0;margin:0;padding:0;">
  <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <div style="background:#0d0d0d;padding:28px 36px;text-align:center;">
      <h1 style="color:#b8923a;font-size:1.2rem;margin:0;font-family:Georgia,serif;">BuyOnUma</h1>
    </div>
    <div style="padding:32px 36px;">
      <div style="font-size:0.92rem;color:#333;line-height:1.7;white-space:pre-wrap;">${message}</div>
    </div>
    <div style="background:#f5f4f0;padding:16px 36px;text-align:center;font-size:0.72rem;color:#aaa;">
      © ${new Date().getFullYear()} BuyOnUma · You're receiving this because you have an account on BuyOnUma.
    </div>
  </div>
</body>
</html>`;

  for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
    const batch = recipients.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map((to) => transporter.sendMail({ from: `"${fromName}" <${fromEmail}>`, to, subject, html }))
    );
    results.forEach((r) => (r.status === 'fulfilled' ? sent++ : failed++));

    if (i + BATCH_SIZE < recipients.length) {
      await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
    }
  }

  return { sent, failed, total: recipients.length };
};