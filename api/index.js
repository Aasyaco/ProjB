import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

import handler from './handler.js'; // assuming handler.js from your code

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON and urlencoded data (optional, but useful for APIs)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(path.join(__dirname, '../public')));

// Helper to wrap async route handlers and forward errors
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// API endpoint with error handling
app.get('/api', asyncHandler(handler));

// Home route with error handling for sendFile
app.get('/', (req, res, next) => {
  res.sendFile(path.join(__dirname, '../public/index.html'), (err) => {
    if (err) next(err);
  });
});

// 404 handler for unknown routes
app.use((req, res, next) => {
  res.status(404).json({ error: 'Not Found' });
});

// Global error-handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack || err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error'
  });
});

app.listen(PORT, () => {
  console.log(`[✅] Server running at http://localhost:${PORT}`);
});
