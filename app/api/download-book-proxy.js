export default async function handler(req, res) {
  const { fileId } = req.query;
  if (!fileId) return res.status(400).json({ error: 'File ID required' });
  
  const pdfRes = await fetch(`https://drive.google.com/uc?export=download&id=${fileId}`);
  const buffer = await pdfRes.arrayBuffer();
  
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="Voice-Control-Book.pdf"');
  res.send(Buffer.from(buffer));
}