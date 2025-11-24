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
    console.log('Running screening...');
    const result = await runScreeningOnce();

    if (!result) {
      console.error('Screening returned no result');
      return res.status(500).json({ error: 'Screening returned no result' });
    }

    if (result.error) {
      console.error('Screening reported error:', result.error, result);
      // Return structured error with optional debug details to help troubleshooting
      return res.status(500).json({ error: result.error, details: result.message || null, debug: { marketSummary: result.marketSummary, signals: Array.isArray(result.allSignals) ? result.allSignals.length : undefined } });
    }

    // Normalize the screening result to the front-end expected shape.
    // The screening module returns keys like `allCandidates`, `strongGapUp`, `potentialGapUp`, and `marketSummary`.
    const allCandidates = result.allCandidates || result.allSignals || [];
    const strong = result.strongGapUp || [];
    const potential = result.potentialGapUp || [];

    // Build top10 and top5 from available candidate lists (falling back sensibly)
    const top10 = result.top10 || allCandidates.slice(0, 10) || strong.concat(potential).slice(0, 10);
    const top5 = result.top5 || allCandidates.slice(0, 5) || strong.slice(0, 5);

    // Determine total from marketSummary or fallback to candidate length
    const total = result.total || result.marketSummary?.gapUpCandidates || allCandidates.length || 0;

    // Include a small debug summary to help frontend diagnostics
    const debug = { marketSummary: result.marketSummary, returnedSignals: top10.length };

    res.json({ top10, top5, total, debug });
  } catch (error) {
    console.error('Unhandled error in /api/screening:', error);
    res.status(500).json({ error: 'Screening failed', details: error.message, stack: error.stack });
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
