const axios = require('axios');

/**
 * Get detailed stock analysis for a specific symbol
 */
async function getDetailedStockAnalysis(symbol) {
    try {
        const response = await axios.get(`https://sniper-ihsg.vercel.app/api/stocks/${symbol}`);
        if (response.data && response.data.data) {
            return response.data.data;
        } else {
            return null;
        }
    } catch (error) {
        console.error(`Error fetching analysis for ${symbol}:`, error.message);
        return null;
    }
}

/**
 * Calculate technical analysis metrics
 */
function calculateTechnicalMetrics(stockData) {
    const metrics = {
        currentPrice: stockData.price,
        dayChange: stockData.change,
        dayChangePercent: stockData.changePercent,
        dayHigh: stockData.dayHigh,
        dayLow: stockData.dayLow,
        volume: stockData.volume,
        marketCap: stockData.marketCap,
    };

    // Moving averages
    if (stockData.fiftyDayAverage) {
        metrics.ma50 = stockData.fiftyDayAverage;
        metrics.ma50Signal = stockData.price > stockData.fiftyDayAverage ? 'Bullish' : 'Bearish';
    }

    if (stockData.twoHundredDayAverage) {
        metrics.ma200 = stockData.twoHundredDayAverage;
        metrics.ma200Signal = stockData.price > stockData.twoHundredDayAverage ? 'Bullish' : 'Bearish';
    }

    // Price range position
    if (stockData.dayHigh && stockData.dayLow) {
        const rangePosition = (stockData.price - stockData.dayLow) / (stockData.dayHigh - stockData.dayLow);
        metrics.priceRangePosition = (rangePosition * 100).toFixed(2); // as percentage
        metrics.priceRangeSignal = rangePosition > 0.75 ? 'Overbought' : rangePosition < 0.25 ? 'Oversold' : 'Neutral';
    }

    // Average daily volume (if available)
    if (stockData.averageDailyVolume10Day) {
        metrics.avgDailyVolume10 = stockData.averageDailyVolume10Day;
        metrics.volumeRatio = (stockData.volume / stockData.averageDailyVolume10Day).toFixed(2);
    }

    return metrics;
}

/**
 * Provide trading recommendation based on analysis
 */
function generateTradingRecommendation(stockData, metrics) {
    const recommendation = {
        symbol: stockData.symbol,
        name: stockData.name,
        currentPrice: metrics.currentPrice,
        timestamp: new Date().toISOString(),
        signals: [],
        recommendation: 'HOLD',
        riskLevel: 'Medium'
    };

    let bullishSignals = 0;
    let bearishSignals = 0;

    // Check moving average signals
    if (metrics.ma50Signal === 'Bullish') {
        bullishSignals++;
        recommendation.signals.push('Price above MA50 (Bullish)');
    } else {
        bearishSignals++;
        recommendation.signals.push('Price below MA50 (Bearish)');
    }

    if (metrics.ma200Signal === 'Bullish') {
        bullishSignals++;
        recommendation.signals.push('Price above MA200 (Bullish)');
    } else {
        bearishSignals++;
        recommendation.signals.push('Price below MA200 (Bearish)');
    }

    // Check price range
    if (metrics.priceRangeSignal === 'Overbought') {
        bearishSignals++;
        recommendation.signals.push('Overbought (Price near day high)');
        recommendation.riskLevel = 'High';
    } else if (metrics.priceRangeSignal === 'Oversold') {
        bullishSignals++;
        recommendation.signals.push('Oversold (Price near day low)');
        recommendation.riskLevel = 'Low';
    }

    // Check volume
    if (metrics.volumeRatio && metrics.volumeRatio > 2) {
        bullishSignals++;
        recommendation.signals.push(`High volume activity (${metrics.volumeRatio}x average)`);
    }

    // Check price change
    if (metrics.dayChangePercent > 0) {
        if (metrics.dayChangePercent > 5) {
            bullishSignals++;
            recommendation.signals.push(`Strong uptrend (+${metrics.dayChangePercent.toFixed(2)}%)`);
        } else {
            bullishSignals++;
            recommendation.signals.push(`Uptrend (+${metrics.dayChangePercent.toFixed(2)}%)`);
        }
    } else if (metrics.dayChangePercent < 0) {
        bearishSignals++;
        recommendation.signals.push(`Downtrend (${metrics.dayChangePercent.toFixed(2)}%)`);
    }

    // Generate recommendation
    if (bullishSignals > bearishSignals) {
        recommendation.recommendation = 'BUY';
        recommendation.sentiment = 'Bullish';
    } else if (bearishSignals > bullishSignals) {
        recommendation.recommendation = 'SELL';
        recommendation.sentiment = 'Bearish';
    } else {
        recommendation.recommendation = 'HOLD';
        recommendation.sentiment = 'Neutral';
    }

    // Calculate potential price targets
    const range = metrics.dayHigh - metrics.dayLow;
    recommendation.resistanceLevel = (metrics.currentPrice + range * 0.25).toFixed(2);
    recommendation.supportLevel = (metrics.currentPrice - range * 0.25).toFixed(2);
    recommendation.takeProfit = (metrics.currentPrice + range * 0.5).toFixed(2);
    recommendation.stopLoss = (metrics.currentPrice - range * 0.5).toFixed(2);

    return recommendation;
}

/**
 * Get full analysis for a specific stock
 */
async function runAnalisaSaham(symbol) {
  try {
    const stockData = await getDetailedStockAnalysis(symbol);
    
    if (!stockData) {
      return {
        success: false,
        error: `No data found for symbol: ${symbol}`
      };
    }

    const metrics = calculateTechnicalMetrics(stockData);
    const recommendation = generateTradingRecommendation(stockData, metrics);

    // Return data in frontend-compatible format
    return {
      success: true,
      symbol: stockData.symbol,
      name: stockData.name,
      price: stockData.price,
      change: stockData.change,
      changePercent: stockData.changePercent,
      volume: stockData.volume,
      marketCap: stockData.marketCap,
      dayHigh: stockData.dayHigh,
      dayLow: stockData.dayLow,
      lastUpdated: new Date().toISOString(),
      fullData: stockData,
      technicalMetrics: metrics,
      recommendation: recommendation
    };
  } catch (error) {
    console.error(`Error in runAnalisaSaham for ${symbol}:`, error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = runAnalisaSaham;