const axios = require('axios');

/**
 * Get stock data from API
 */
async function getStockData() {
  try {
    const res = await axios.get('https://sniper-ihsg.vercel.app/api/stocks');
    return res.data.data;
  } catch (error) {
    console.error('Error fetching stock data:', error.message);
    return [];
  }
}

/**
 * Get detailed stock data for a specific symbol
 */
async function getDetailedStockData(symbol) {
  try {
    const res = await axios.get(`https://sniper-ihsg.vercel.app/api/stocks/${symbol}`);
    return res.data.data;
  } catch (error) {
    console.error(`Error fetching detailed data for ${symbol}:`, error.message);
    return null;
  }
}

/**
 * Calculate momentum strength score
 */
function calculateMomentumStrength(stock, detailedData) {
  let score = 0;
  const reasons = [];

  // Volume ratio analysis
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

  // Price change analysis
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

  // Range position analysis (price relative to daily high/low)
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

  // Moving averages analysis
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

  // Market cap / liquidity analysis
  if (stock.marketCap > 1e12) {
    score += 10;
    reasons.push(`High liquidity`);
  } else if (stock.marketCap > 5e11) {
    score += 7;
    reasons.push(`Adequate liquidity`);
  }

  return { score, reasons };
}

/**
 * Estimate time to reach take profit
 */
function estimateTimeToTP(stock, momentumScore, volumeRatio, currentHour) {
  let baseTime = 180 - momentumScore * 1.5;

  // Volume factor
  const volumeFactor = volumeRatio > 4 ? 0.5 : volumeRatio > 2.5 ? 0.7 : volumeRatio > 1.5 ? 0.85 : 1;
  baseTime *= volumeFactor;

  // Time factor based on market hours
  let timeFactor = 1;
  if ((currentHour >= 9 && currentHour < 10) || (currentHour >= 14 && currentHour < 15)) timeFactor = 0.7;
  else if (currentHour >= 12 && currentHour < 13) timeFactor = 1.2;
  baseTime *= timeFactor;

  return Math.max(30, Math.min(240, Math.round(baseTime)));
}

/**
 * Screen stocks for scalping opportunities
 */
async function screenScalpingStocks(stocks) {
  const screenedStocks = [];
  const currentHour = new Date().getHours();

  for (const stock of stocks) {
    // Filter by basic criteria
    if (stock.changePercent < 3 || stock.volume < 5000000 || stock.price > 5000 || stock.price < 50) {
      continue;
    }

    // Get detailed data for the stock
    const detailedData = await getDetailedStockData(stock.symbol);
    if (!detailedData || !detailedData.fullData) {
      continue;
    }

    // Calculate momentum score
    const { score, reasons } = calculateMomentumStrength(stock, detailedData.fullData);
    if (score < 50) {
      continue;
    }

    // Calculate take profit and stop loss
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

/**
 * Run screening once (main export)
 */
async function runScreeningOnce() {
  try {
    const stocks = await getStockData();
    if (stocks.length === 0) {
      return { error: 'No stock data' };
    }
    const scalpingSignals = await screenScalpingStocks(stocks);
    return {
      success: true,
      top10: scalpingSignals.slice(0, 10),
      top5: scalpingSignals.slice(0, 5),
      total: scalpingSignals.length
    };
  } catch (error) {
    console.error('Error in runScreeningOnce:', error.message);
    return { error: error.message };
  }
}

module.exports = runScreeningOnce;
