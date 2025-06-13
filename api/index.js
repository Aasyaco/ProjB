import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

import { handleCheck } from './handler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, '../public')));

// Native Addons
let rustValidator, cppAddon;

try {
  rustValidator = require('../native/rust-validator/target/release/rust_validator.node');
} catch (e) {
  console.warn('[Rust Validator] Failed to load:', e.message);
}

try {
  cppAddon = require('../native/cpp-addon/build/Release/addon.node');
} catch (e) {
  console.warn('[C++ Addon] Failed to load:', e.message);
}

// ✅ Main API: GET /api?key=abc123
app.get('/api', async (req, res) => {
  const key = req.query.key;

  if (!key) {
    return res.status(400).json({ status: 'error', error: 'Missing ?key= parameter' });
  }

  try {
    const result = await handleCheck({ key }, { rustValidator, cppAddon });
    res.json({ status: 'ok', result });
  } catch (err) {
    res.status(500).json({ status: 'error', error: err.message });
  }
});

// Optional homepage route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.listen(PORT, () => {
  console.log(`[✅] Server running at http://localhost:${PORT}`);
});
