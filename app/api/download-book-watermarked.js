// api/download-book-watermarked.js
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fetch from 'node-fetch';

const GOOGLE_DRIVE_FILE_ID = '12h7Q0FNa9nLATwE9cknvDK1UIWkjV7Qm';
const PDF_URL = `https://drive.google.com/uc?export=download&id=${GOOGLE_DRIVE_FILE_ID}`;

export default async function handler(req, res) {
  const { email } = req.query;
  
  if (!email) {
    return res.status(400).json({ error: 'Email required' });
  }

  try {
    // 1. Fetch PDF from Google Drive
    const response = await fetch(PDF_URL);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch PDF: ${response.status}`);
    }

    // ✅ Convert to Buffer properly
    const arrayBuffer = await response.arrayBuffer();
    const pdfBytes = Buffer.from(arrayBuffer);

    // 2. Load PDF with pdf-lib
    const pdfDoc = await PDFDocument.load(pdfBytes, { 
      ignoreEncryption: true 
    });
    
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const pages = pdfDoc.getPages();

    // 3. Add watermark to EVERY page
    for (const page of pages) {
      const { width, height } = page.getSize();
      
      // Main watermark - center of page (diagonal feel)
      page.drawText(`Licensed to: ${email}`, {
        x: width / 2 - 150,
        y: height / 2,
        size: 14,
        font,
        color: rgb(0.85, 0.85, 0.85),
        opacity: 0.3,
        rotate: { angle: 45, type: 0, x: width / 2, y: height / 2 },
      });

      // Bottom left
      page.drawText(`Licensed to: ${email}`, {
        x: 40,
        y: 35,
        size: 8,
        font,
        color: rgb(0.4, 0.4, 0.4),
        opacity: 0.6,
      });

      // Bottom center
      page.drawText('Voice Control by Sevil Velsha | Single User License', {
        x: 40,
        y: 22,
        size: 7,
        font,
        color: rgb(0.4, 0.4, 0.4),
        opacity: 0.5,
      });
    }

    // 4. Save watermarked PDF
    const watermarkedBytes = await pdfDoc.save();
    
    // 5. Send to client
    const safeEmail = email.replace(/[^a-zA-Z0-9@._-]/g, '_');
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Voice-Control-Book-${safeEmail}.pdf"`);
    res.setHeader('Content-Length', watermarkedBytes.length);
    
    return res.status(200).send(Buffer.from(watermarkedBytes));

  } catch (err) {
    console.error('Watermark error:', err.message);
    
    // Fallback: Direct Google Drive redirect
    return res.redirect(302, PDF_URL);
  }
}