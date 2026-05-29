// api/download-book-watermarked.js
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

const GOOGLE_DRIVE_FILE_ID = '12h7Q0FNa9nLATwE9cknvDK1UIWkjV7Qm';
const PDF_URL = `https://drive.google.com/uc?export=download&id=${GOOGLE_DRIVE_FILE_ID}`;

export default async function handler(req, res) {
  const { email } = req.query;
  
  if (!email) {
    return res.status(400).json({ error: 'Email required' });
  }

  try {
    // 1. Fetch original PDF from Google Drive
    const pdfRes = await fetch(PDF_URL);
    const pdfBytes = await pdfRes.arrayBuffer();

    // 2. Load PDF
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const pages = pdfDoc.getPages();

    // 3. Add watermark to EVERY page
    for (const page of pages) {
      const { width, height } = page.getSize();
      
      // "Licensed to" at bottom left
      page.drawText(`Licensed to: ${email}`, {
        x: 40,
        y: 35,
        size: 9,
        font,
        color: rgb(0.5, 0.5, 0.5),
        opacity: 0.7,
      });

      // "Voice Control" at bottom center
      page.drawText('Voice Control by Sevil Velsha', {
        x: 40,
        y: 22,
        size: 8,
        font,
        color: rgb(0.5, 0.5, 0.5),
        opacity: 0.6,
      });
    }

    // 4. Save watermarked PDF
    const watermarkedBytes = await pdfDoc.save();

    // 5. Send to client
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Voice-Control-Book-${email.replace(/[^a-zA-Z0-9@._-]/g, '_')}.pdf"`);
    res.setHeader('Content-Length', watermarkedBytes.length);
    
    return res.status(200).send(Buffer.from(watermarkedBytes));

  } catch (err) {
    console.error('Watermark error:', err);
    return res.status(500).json({ error: 'Failed to generate watermarked PDF' });
  }
}