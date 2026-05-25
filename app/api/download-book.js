// api/download-book.js
// Google Drive se PDF stream → watermark → send

import SibApiV3Sdk from 'sib-api-v3-sdk';

const GOOGLE_DRIVE_FILE_ID = '12h7Q0FNa9nLATwE9cknvDK1UIWkjV7Qm';
const GOOGLE_DRIVE_DOWNLOAD = `https://drive.google.com/uc?export=download&id=${GOOGLE_DRIVE_FILE_ID}`;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { token } = req.query;
  if (!token) return res.status(400).json({ error: 'Token required' });

  const defaultClient = SibApiV3Sdk.ApiClient.instance;
  defaultClient.authentications['api-key'].apiKey = process.env.BREVO_API_KEY;
  const contactsApi = new SibApiV3Sdk.ContactsApi();

  try {
    // Find contact by token
    const allContacts = await contactsApi.getContacts(0, 1000);
    let found = null;
    for (const contact of allContacts.contacts) {
      if (contact.attributes?.BOOK_TOKEN === token) {
        found = contact;
        break;
      }
    }

    if (!found) return res.status(404).json({ error: 'Invalid token' });

    const downloadsLeft = parseInt(found.attributes.BOOK_DOWNLOADS_LEFT) || 0;
    if (downloadsLeft <= 0) return res.status(429).json({ error: 'Download limit reached' });

    // Decrement downloads
    const updateContact = new SibApiV3Sdk.UpdateContact();
    updateContact.attributes = { BOOK_DOWNLOADS_LEFT: downloadsLeft - 1 };
    await contactsApi.updateContact(found.email, updateContact);

    // Fetch PDF from Google Drive
    const pdfResponse = await fetch(GOOGLE_DRIVE_DOWNLOAD);
    if (!pdfResponse.ok) throw new Error('Failed to fetch PDF');

    const pdfBuffer = await pdfResponse.arrayBuffer();

    // Watermark (simple text header)
    const watermarkText = `Licensed to: ${found.email} | Voice Control by Sevil Velsha`;
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="Voice-Control-Book.pdf"');
    res.setHeader('X-Watermark', watermarkText);
    
    return res.status(200).send(Buffer.from(pdfBuffer));

  } catch (err) {
    console.error('Download error:', err.message);
    return res.status(500).json({ error: 'Download failed' });
  }
}