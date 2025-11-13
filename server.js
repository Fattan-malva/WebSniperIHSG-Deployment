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
const runAnalisaSaham = require('./logic/AnalisaSaham');
const runWarrantScreener = require('./logic/WarrantScreener');

// API Endpoints
app.get('/api/screening', async (req, res) => {
  try {
    // Adapt screening function for web - return data instead of console output
    const stocks = await getStockData();
    if (stocks.length === 0) {
      return res.json({ error: 'No stock data' });
    }
    const scalpingSignals = await screenScalpingStocks(stocks);
    res.json({
      top10: scalpingSignals.slice(0, 10),
      top5: scalpingSignals.slice(0, 5)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/analisa/:symbol', async (req, res) => {
  const { symbol } = req.params;
  try {
    const axios = require('axios');
    const response = await axios.get(`https://sniper-ihsg.vercel.app/api/stocks/${symbol}`);
    if (response.data && response.data.data) {
      res.json(response.data.data);
    } else {
      res.status(404).json({ error: 'Data not found' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Removed warrant API endpoint

// Helper functions (extracted from logic files)
async function getStockData() {
  const axios = require('axios');
  try {
    const res = await axios.get('https://sniper-ihsg.vercel.app/api/stocks');
    return res.data.data;
  } catch (error) {
    return [];
  }
}

async function screenScalpingStocks(stocks) {
  // Simplified version for web - remove progress bar and console logs
  const screenedStocks = [];
  const currentHour = new Date().getHours();

  for (const stock of stocks) {
    if (stock.changePercent < 3 || stock.volume < 5000000 || stock.price > 5000 || stock.price < 50) {
      continue;
    }
    const detailedData = await getDetailedStockData(stock.symbol);
    if (!detailedData || !detailedData.fullData) {
      continue;
    }
    const { score, reasons } = calculateMomentumStrength(stock, detailedData.fullData);
    if (score < 50) {
      continue;
    }
    const tp = stock.price * (1 + 5 / 100);
    const sl = stock.price * (1 - 3 / 100);
    const volumeRatio = stock.volume / (detailedData.fullData.averageDailyVolume10Day || 1000000);
    const estimatedMinutes = estimateTimeToTP(stock, score, volumeRatio, currentHour);
    const potentialProfit = tp - stock.price;
    const profitPercent = (potentialProfit / stock.price) * 100;

    screenedStocks.push({
      symbol: stock.symbol,
      name: stock.name,
      price: stock.price,
      changePercent: stock.changePercent,
      volume: stock.volume,
      entry: stock.price,
      tp: tp.toFixed(2),
      sl: sl.toFixed(2),
      dayHigh: stock.dayHigh,
      dayLow: stock.dayLow,
      momentumScore: score,
      volumeRatio: volumeRatio.toFixed(2),
      estimatedTime: estimatedMinutes,
      potentialProfit: potentialProfit,
      profitPercent: profitPercent,
      reasons: reasons,
    });
  }
  return screenedStocks.sort((a, b) => b.momentumScore - a.momentumScore);
}

async function getDetailedStockData(symbol) {
  const axios = require('axios');
  try {
    const res = await axios.get(`https://sniper-ihsg.vercel.app/api/stocks/${symbol}`);
    return res.data.data;
  } catch (error) {
    return null;
  }
}

function calculateMomentumStrength(stock, detailedData) {
  let score = 0;
  const reasons = [];

  const volumeRatio = stock.volume / (detailedData.averageDailyVolume10Day || 1000000);
  if (volumeRatio > 4) {
    score += 25;
    reasons.push(`Volume >4x average`);
  } else if (volumeRatio > 2.5) {
    score += 20;
    reasons.push(`Volume >2.5x average`);
  } else if (volumeRatio > 1.5) {
    score += 15;
    reasons.push(`Volume >1.5x average`);
  }

  if (stock.changePercent > 8) {
    score += 25;
    reasons.push(`Increase >8%`);
  } else if (stock.changePercent > 5) {
    score += 20;
    reasons.push(`Increase >5%`);
  } else if (stock.changePercent > 3) {
    score += 15;
    reasons.push(`Increase >3%`);
  }

  const rangePosition = (stock.price - stock.dayLow) / (stock.dayHigh - stock.dayLow);
  if (rangePosition > 0.8 && rangePosition <= 0.9) {
    score += 20;
    reasons.push(`Near daily high`);
  } else if (rangePosition > 0.9) {
    score += 15;
    reasons.push(`Very near daily high`);
  } else if (rangePosition > 0.6) {
    score += 15;
    reasons.push(`Above midpoint`);
  }

  if (detailedData.fiftyDayAverage && detailedData.twoHundredDayAverage) {
    const above50MA = stock.price > detailedData.fiftyDayAverage;
    const above200MA = stock.price > detailedData.twoHundredDayAverage;
    if (above50MA && above200MA) {
      score += 20;
      reasons.push(`>MA50 & MA200`);
    } else if (above50MA) {
      score += 15;
      reasons.push(`>MA50`);
    }
  }

  if (stock.marketCap > 1e12) {
    score += 10;
    reasons.push(`High liquidity`);
  } else if (stock.marketCap > 5e11) {
    score += 7;
    reasons.push(`Adequate liquidity`);
  }

  return { score, reasons };
}

function estimateTimeToTP(stock, momentumScore, volumeRatio, currentHour) {
  let baseTime = 180 - momentumScore * 1.5;
  const volumeFactor = volumeRatio > 4 ? 0.5 : volumeRatio > 2.5 ? 0.7 : volumeRatio > 1.5 ? 0.85 : 1;
  baseTime *= volumeFactor;
  let timeFactor = 1;
  if ((currentHour >= 9 && currentHour < 10) || (currentHour >= 14 && currentHour < 15)) timeFactor = 0.7;
  else if (currentHour >= 12 && currentHour < 13) timeFactor = 1.2;
  baseTime *= timeFactor;
  return Math.max(30, Math.min(240, Math.round(baseTime)));
}

async function getWarrantData() {
  const axios = require('axios');
  const fs = require('fs');
  const parse = require('csv-parse/sync');

  function getAllIDXStockCodes() {
    try {
      const csvText = fs.readFileSync('./api/stockcode.csv', 'utf8');
      const records = parse.parse(csvText, { columns: true, skip_empty_lines: true });
      return records.map(rec => rec.Code?.trim()).filter(Boolean);
    } catch (error) {
      return [];
    }
  }

  function getWarrantSymbols() {
    const stockCodes = getAllIDXStockCodes();
    return stockCodes.map(code => `${code}-W`);
  }

  const warrantSymbols = getWarrantSymbols();
  const results = [];

  // Process in batches to avoid overwhelming the API
  const batchSize = 10;
  for (let i = 0; i < warrantSymbols.length; i += batchSize) {
    const batch = warrantSymbols.slice(i, i + batchSize);
    const batchPromises = batch.map(async (symbol) => {
      try {
        // Convert to lowercase as the API expects lowercase symbols
        const lowerSymbol = symbol.toLowerCase();
        const response = await axios.get(`https://sniper-ihsg.vercel.app/api/stocks/${lowerSymbol}`);
        if (response.data && response.data.success && response.data.data) {
          const stock = response.data.data;
          if (stock.price > 0 && stock.volume > 0) {
            return {
              symbol: stock.symbol,
              regularMarketPrice: stock.price,
              regularMarketVolume: stock.volume,
              regularMarketChange: stock.change,
              regularMarketChangePercent: stock.changePercent
            };
          }
        }
      } catch (error) {
        // Skip if warrant doesn't exist or API error
      }
      return null;
    });

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults.filter(result => result !== null));

    // Small delay between batches to be respectful to the API
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return results;
}

async function screenWarrants(warrants) {
  const screenedWarrants = [];

  for (const warrant of warrants) {
    const parentData = await getParentStockData(warrant.symbol);
    if (!parentData) {
      continue;
    }

    screenedWarrants.push({
      symbol: warrant.symbol,
      price: warrant.regularMarketPrice || 0,
      parentPrice: parentData.price
    });
  }

  return screenedWarrants;
}

async function getParentStockData(symbol) {
  const axios = require('axios');
  try {
    const parentSymbol = symbol.replace('-W', '');
    const res = await axios.get(`https://sniper-ihsg.vercel.app/api/stocks/${parentSymbol}`);
    const stock = res.data.data;

    return {
      symbol: stock.symbol,
      price: stock.price || 0
    };
  } catch (error) {
    return null;
  }
}

// Serve index.html for root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
