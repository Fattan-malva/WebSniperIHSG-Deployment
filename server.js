const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Suppress all Yahoo Finance validation errors
const originalConsoleError = console.error;
console.error = function(...args) {
    const message = args[0];
    if (typeof message === 'string' && (
        message.includes('validation.md') ||
        message.includes('Expected union value') ||
        message.includes('YahooNumber') ||
        message.includes('schema validation') ||
        message.includes('yahoo-finance2')
    )) {
        return;
    }
    originalConsoleError.apply(console, args);
};

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Import logic modules
const runScreeningOnce = require('./logic/Screnning');
const runAnalisaSaham = require('./logic/AnalyticSpesific');

// API Endpoints
app.get('/api/screening', async (req, res) => {
  try {
    const result = await runScreeningOnce();
    if (result.error) {
      return res.json(result);
    }
    res.json({
      top10: result.top10,
      top5: result.top5,
      total: result.total
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/analisa/:symbol', async (req, res) => {
  const { symbol } = req.params;
  try {
    const result = await runAnalisaSaham(symbol);
    if (!result.success) {
      return res.status(404).json(result);
    }
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Serve index.html for root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
