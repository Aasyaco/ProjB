import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

import handler from './handler.js'; // assuming handler.js from your code

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, '../public')));

app.get('/api', handler); // ✅ integrates your handler

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.listen(PORT, () => {
  console.log(`[✅] Server running at http://localhost:${PORT}`);
});
