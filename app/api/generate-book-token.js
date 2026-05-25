// api/generate-book-token.js
// Stripe webhook ke baad token generate → Brevo save → email bhej

import crypto from 'crypto';
import SibApiV3Sdk from 'sib-api-v3-sdk';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, name, sessionId } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });

  const token = crypto.randomBytes(32).toString('hex');

  const defaultClient = SibApiV3Sdk.ApiClient.instance;
  defaultClient.authentications['api-key'].apiKey = process.env.BREVO_API_KEY;
  const contactsApi = new SibApiV3Sdk.ContactsApi();
  const emailApi = new SibApiV3Sdk.TransactionalEmailsApi();

  try {
    const updateContact = new SibApiV3Sdk.UpdateContact();
    updateContact.attributes = {
      BOOK_TOKEN: token,
      BOOK_TOKEN_EXPIRES: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      BOOK_DOWNLOADS_LEFT: 3,
      BOOK_PURCHASE_DATE: new Date().toISOString(),
    };
    await contactsApi.updateContact(email, updateContact);

    const downloadUrl = `${process.env.CLIENT_URL}/thank-you-book?token=${token}`;
    
    const sendEmail = new SibApiV3Sdk.SendSmtpEmail();
    sendEmail.to = [{ email }];
    sendEmail.sender = { name: 'Sevil Velsha', email: 'info@sevilvelsha.com' };
    sendEmail.subject = '📖 Your Voice Control Book';
    sendEmail.htmlContent = `
      <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 40px 24px;">
        <h1 style="font-size: 1.8rem; color: #1a1a1a;">Your Voice Control Book</h1>
        <p style="font-size: 16px; line-height: 1.8; color: #333;">
          Thank you for your purchase! Click below to download your book.<br>
          <strong>Link expires in 24 hours. 3 downloads allowed.</strong>
        </p>
        <a href="${downloadUrl}" style="display: inline-block; padding: 16px 40px; background: #1a1a1a; color: #fff; text-decoration: none; font-size: 12px; letter-spacing: 0.2em; text-transform: uppercase;">
          ↓ Download Your Book
        </a>
      </div>
    `;
    await emailApi.sendTransacEmail(sendEmail);

    return res.status(200).json({ success: true, token, downloadUrl });
  } catch (err) {
    console.error('Token error:', err.message);
    return res.status(500).json({ error: 'Failed to generate token' });
  }
}