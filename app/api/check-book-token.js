// api/check-book-token.js

import SibApiV3Sdk from 'sib-api-v3-sdk';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { token } = req.query;
  if (!token) return res.status(400).json({ valid: false, message: 'Token required' });

  const defaultClient = SibApiV3Sdk.ApiClient.instance;
  defaultClient.authentications['api-key'].apiKey = process.env.BREVO_API_KEY;
  const contactsApi = new SibApiV3Sdk.ContactsApi();

  try {
    // Get all contacts, find matching token
    const allContacts = await contactsApi.getContacts(0, 1000);
    
    let found = null;
    for (const contact of allContacts.contacts) {
      if (contact.attributes?.BOOK_TOKEN === token) {
        found = contact;
        break;
      }
    }

    if (!found) {
      return res.status(404).json({ valid: false, message: 'Invalid download link.' });
    }

    const expires = found.attributes.BOOK_TOKEN_EXPIRES;
    const downloadsLeft = parseInt(found.attributes.BOOK_DOWNLOADS_LEFT) || 0;

    if (expires && new Date() > new Date(expires)) {
      return res.status(410).json({ valid: false, message: 'Link expired (24 hours).' });
    }

    if (downloadsLeft <= 0) {
      return res.status(429).json({ valid: false, message: 'Download limit reached (3 max).' });
    }

    return res.status(200).json({
      valid: true,
      email: found.email,
      downloadsLeft,
    });

  } catch (err) {
    console.error('Check error:', err.message);
    return res.status(500).json({ valid: false, message: 'Verification failed' });
  }
}