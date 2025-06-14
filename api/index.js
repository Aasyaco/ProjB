import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

import handler from './handler.js'; // assuming handler.js from your code

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, '../public')));

// Wrap async handlers to catch errors and forward to middleware
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

app.get('/api', asyncHandler(handler)); // integrates your handler with error handling

app.get('/', (req, res, next) => {
  res.sendFile(path.join(__dirname, '../public/index.html'), (err) => {
    if (err) next(err);
  });
});

// 404 handler for unknown routes
app.use((req, res, next) => {
  res.status(404).json({ error: 'Not Found' });
});

// General error-handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack || err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error'
  });
});

app.listen(PORT, () => {
  console.log(`[✅] Server running at http://localhost:${PORT}`);
});
