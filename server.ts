import express from 'express';
import { createServer as createViteServer } from 'vite';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { PDFParse } from 'pdf-parse';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const upload = multer({ storage: multer.memoryStorage() });

async function startServer() {
  const app = express();
  const port = 3000;

  app.use(express.json());

  // API Route for resume analysis
  app.post('/api/analyze', upload.single('resume'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const dataBuffer = req.file.buffer;
      const parser = new PDFParse({ data: dataBuffer });
      const pdfData = await parser.getText();
      const text = pdfData.text;

      if (!text || text.trim().length === 0) {
        return res.status(400).json({ error: 'Could not extract text from PDF' });
      }

      // We'll return the text for now, the frontend will call Gemini
      // Actually, it's safer to call Gemini from the backend if we want to keep the prompt logic hidden,
      // but the instructions say "Always call Gemini API from the frontend code of the application. NEVER call Gemini API from the backend."
      // So I will return the extracted text to the frontend.
      
      res.json({ text });
    } catch (error) {
      console.error('Error processing PDF:', error);
      res.status(500).json({ error: 'Failed to process PDF' });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Server running at http://localhost:${port}`);
  });
}

startServer();
