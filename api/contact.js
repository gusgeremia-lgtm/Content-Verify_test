import { Resend } from 'resend';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const body = typeof req.body === 'string' ? safeParse(req.body) : req.body || {};
  const name = (body.name || '').toString().trim();
  const email = (body.email || '').toString().trim();
  const message = (body.message || '').toString().trim();

  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Name, email, and message are all required.' });
  }
  if (name.length > 200 || email.length > 320 || message.length > 5000) {
    return res.status(400).json({ error: 'One of the fields is too long.' });
  }
  if (!EMAIL_RE.test(email)) {
    return res.status(400).json({ error: 'Please provide a valid email address.' });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Email service is not configured.' });
  }

  const resend = new Resend(apiKey);
  const subject = `Content-Verify inquiry from ${name}`;
  const text = `Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}\n`;
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color:#1c1917; line-height:1.6;">
      <p style="margin:0 0 12px;"><strong>Name:</strong> ${escapeHtml(name)}</p>
      <p style="margin:0 0 12px;"><strong>Email:</strong> ${escapeHtml(email)}</p>
      <p style="margin:0 0 6px;"><strong>Message:</strong></p>
      <p style="white-space:pre-wrap; margin:0;">${escapeHtml(message)}</p>
    </div>
  `;

  try {
    const { error } = await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: ['ted.selker@gmail.com'],
      replyTo: email,
      subject,
      text,
      html,
    });

    if (error) {
      console.error('Resend error:', error);
      return res.status(502).json({ error: 'Could not send the message. Please try again later.' });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Unexpected error sending contact email:', err);
    return res.status(500).json({ error: 'Unexpected error sending the message.' });
  }
}

function safeParse(raw) {
  try { return JSON.parse(raw); } catch { return {}; }
}
