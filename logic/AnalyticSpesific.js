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
 * Calculate comprehensive technical analysis metrics
 */
function calculateAdvancedTechnicalMetrics(stockData) {
    const metrics = {
        currentPrice: stockData.price,
        dayChange: stockData.change,
        dayChangePercent: stockData.changePercent,
        dayHigh: stockData.dayHigh,
        dayLow: stockData.dayLow,
        open: stockData.open,
        previousClose: stockData.previousClose,
        volume: stockData.volume,
        marketCap: stockData.marketCap,
        volumeAnalysis: {},
        trendAnalysis: {},
        supportResistance: {},
        momentumIndicators: {},
        riskMetrics: {}
    };

    // VOLUME ANALYSIS
    if (stockData.averageDailyVolume10Day) {
        const volumeRatio = stockData.volume / stockData.averageDailyVolume10Day;
        metrics.volumeAnalysis = {
            avgVolume10Day: stockData.averageDailyVolume10Day,
            volumeRatio: volumeRatio.toFixed(2),
            volumeSignal: volumeRatio > 2 ? 'STRONG' : volumeRatio > 1.2 ? 'MODERATE' : 'WEAK',
            volumeStatus: volumeRatio > 3 ? 'EXPLOSIVE' : volumeRatio > 1.5 ? 'HIGH' : 'NORMAL'
        };
    }

    // MOVING AVERAGES ANALYSIS
    if (stockData.fiftyDayAverage && stockData.twoHundredDayAverage) {
        const aboveMA50 = stockData.price > stockData.fiftyDayAverage;
        const aboveMA200 = stockData.price > stockData.twoHundredDayAverage;
        const ma50Distance = ((stockData.price - stockData.fiftyDayAverage) / stockData.fiftyDayAverage) * 100;
        const ma200Distance = ((stockData.price - stockData.twoHundredDayAverage) / stockData.twoHundredDayAverage) * 100;

        metrics.trendAnalysis = {
            ma50: stockData.fiftyDayAverage,
            ma200: stockData.twoHundredDayAverage,
            aboveMA50,
            aboveMA200,
            ma50Distance: ma50Distance.toFixed(2),
            ma200Distance: ma200Distance.toFixed(2),
            goldenCross: aboveMA50 && aboveMA200 && ma50Distance > 2,
            deathCross: !aboveMA50 && !aboveMA200,
            trendStrength: calculateTrendStrength(aboveMA50, aboveMA200, ma50Distance, ma200Distance),
            trendDirection: aboveMA50 && aboveMA200 ? 'BULLISH' : !aboveMA50 && !aboveMA200 ? 'BEARISH' : 'SIDEWAYS'
        };
    }

    // PRICE RANGE AND VOLATILITY
    if (stockData.dayHigh && stockData.dayLow) {
        const range = stockData.dayHigh - stockData.dayLow;
        const rangePosition = (stockData.price - stockData.dayLow) / range;
        const volatility = (range / stockData.dayLow) * 100;
        const gap = ((stockData.open - stockData.previousClose) / stockData.previousClose) * 100;

        metrics.priceAnalysis = {
            rangePosition: (rangePosition * 100).toFixed(2),
            dailyRange: range.toFixed(2),
            volatilityPercent: volatility.toFixed(2),
            gapPercent: gap.toFixed(2),
            positionSignal: rangePosition > 0.8 ? 'OVERBOUGHT' : rangePosition < 0.2 ? 'OVERSOLD' : 'NEUTRAL',
            volatilityLevel: volatility > 5 ? 'HIGH' : volatility > 3 ? 'MEDIUM' : 'LOW'
        };
    }

    // SUPPORT AND RESISTANCE LEVELS
    metrics.supportResistance = calculateSupportResistance(stockData);

    // MOMENTUM INDICATORS
    metrics.momentumIndicators = calculateMomentumIndicators(stockData);

    // RISK METRICS
    metrics.riskMetrics = calculateRiskMetrics(stockData);

    return metrics;
}

/**
 * Calculate trend strength based on moving averages
 */
function calculateTrendStrength(aboveMA50, aboveMA200, ma50Distance, ma200Distance) {
    let strength = 0;

    if (aboveMA50) strength += 25;
    if (aboveMA200) strength += 25;
    if (ma50Distance > 5) strength += 25;
    if (ma200Distance > 2) strength += 25;

    return strength;
}

/**
 * Calculate dynamic support and resistance levels
 */
function calculateSupportResistance(stockData) {
    const levels = {};
    const range = stockData.dayHigh - stockData.dayLow;

    // Immediate levels
    levels.immediateResistance = stockData.dayHigh;
    levels.immediateSupport = stockData.dayLow;

    // Dynamic levels based on volatility
    levels.resistance1 = (stockData.price + range * 0.382).toFixed(2); // Fibonacci 38.2%
    levels.resistance2 = (stockData.price + range * 0.618).toFixed(2); // Fibonacci 61.8%
    levels.support1 = (stockData.price - range * 0.382).toFixed(2);
    levels.support2 = (stockData.price - range * 0.618).toFixed(2);

    // Psychological levels
    levels.psychologicalResistance = Math.ceil(stockData.price / 100) * 100;
    levels.psychologicalSupport = Math.floor(stockData.price / 100) * 100;

    return levels;
}

/**
 * Calculate momentum indicators
 */
function calculateMomentumIndicators(stockData) {
    const momentum = {};

    // Price momentum
    momentum.priceMomentum = stockData.changePercent > 2 ? 'STRONG_BULLISH' :
        stockData.changePercent > 0 ? 'BULLISH' :
            stockData.changePercent > -2 ? 'BEARISH' : 'STRONG_BEARISH';

    // Volume-price confirmation
    const volumeConfirmation = stockData.volume > stockData.averageDailyVolume10Day && stockData.changePercent > 0;
    momentum.volumeConfirmation = volumeConfirmation ? 'CONFIRMED' : 'NOT_CONFIRMED';

    // RSI-like indicator (simplified)
    const rangePosition = (stockData.price - stockData.dayLow) / (stockData.dayHigh - stockData.dayLow);
    momentum.rsiSignal = rangePosition > 0.7 ? 'OVERBOUGHT' : rangePosition < 0.3 ? 'OVERSOLD' : 'NEUTRAL';

    // Breakout detection
    momentum.isBreakout = stockData.price >= stockData.dayHigh * 0.98;
    momentum.isBreakdown = stockData.price <= stockData.dayLow * 1.02;

    return momentum;
}

/**
 * Calculate risk metrics
 */
function calculateRiskMetrics(stockData) {
    const risk = {};

    // Volatility risk
    const dailyRange = stockData.dayHigh - stockData.dayLow;
    const volatility = (dailyRange / stockData.dayLow) * 100;
    risk.volatilityRisk = volatility > 8 ? 'HIGH' : volatility > 4 ? 'MEDIUM' : 'LOW';

    // Price risk (distance from 52-week high/low)
    if (stockData.fiftyTwoWeekHigh && stockData.fiftyTwoWeekLow) {
        const fromHigh = ((stockData.fiftyTwoWeekHigh - stockData.price) / stockData.fiftyTwoWeekHigh) * 100;
        const fromLow = ((stockData.price - stockData.fiftyTwoWeekLow) / stockData.price) * 100;

        risk.distanceFromHigh = fromHigh.toFixed(2);
        risk.distanceFromLow = fromLow.toFixed(2);
        risk.positionIn52Week = fromHigh < 10 ? 'NEAR_HIGH' : fromLow < 10 ? 'NEAR_LOW' : 'MID_RANGE';
    }

    // Valuation risk
    if (stockData.trailingPE) {
        risk.peRatio = stockData.trailingPE;
        risk.valuation = stockData.trailingPE > 25 ? 'EXPENSIVE' : stockData.trailingPE > 15 ? 'FAIR' : 'CHEAP';
    }

    return risk;
}

/**
 * Generate comprehensive trading strategy
 */
function generateTradingStrategy(stockData, metrics) {
    const strategy = {
        symbol: stockData.symbol,
        name: stockData.name,
        currentPrice: metrics.currentPrice,
        analysisTime: new Date().toISOString(),

        // CORE SIGNALS
        primarySignal: 'NEUTRAL',
        confidence: 'MEDIUM',
        timeFrame: 'INTRADAY',

        // TRADING RECOMMENDATIONS
        action: 'HOLD',
        entryStrategy: {},
        exitStrategy: {},
        riskManagement: {},

        // DETAILED ANALYSIS
        strengthFactors: [],
        warningFactors: [],
        keyLevels: {},
        marketContext: {}
    };

    let bullishScore = 0;
    let bearishScore = 0;

    // 1. TREND ANALYSIS (30 points)
    if (metrics.trendAnalysis.trendDirection === 'BULLISH') {
        bullishScore += 20;
        strategy.strengthFactors.push('Trend bullish (Above MA50 & MA200)');
    } else if (metrics.trendAnalysis.trendDirection === 'BEARISH') {
        bearishScore += 20;
        strategy.warningFactors.push('Trend bearish (Below MA50 & MA200)');
    }

    if (metrics.trendAnalysis.goldenCross) {
        bullishScore += 10;
        strategy.strengthFactors.push('Golden Cross pattern detected');
    }

    // 2. MOMENTUM ANALYSIS (25 points)
    if (metrics.momentumIndicators.priceMomentum.includes('BULLISH')) {
        bullishScore += 15;
        strategy.strengthFactors.push(`Price momentum ${metrics.momentumIndicators.priceMomentum}`);
    } else {
        bearishScore += 15;
        strategy.warningFactors.push(`Price momentum ${metrics.momentumIndicators.priceMomentum}`);
    }

    if (metrics.momentumIndicators.volumeConfirmation === 'CONFIRMED') {
        bullishScore += 10;
        strategy.strengthFactors.push('Volume confirms price movement');
    }

    // 3. VOLUME ANALYSIS (20 points)
    if (metrics.volumeAnalysis.volumeStatus === 'EXPLOSIVE') {
        bullishScore += 15;
        strategy.strengthFactors.push('Volume explosion detected');
    } else if (metrics.volumeAnalysis.volumeStatus === 'HIGH') {
        bullishScore += 10;
        strategy.strengthFactors.push('High volume activity');
    }

    if (metrics.volumeAnalysis.volumeRatio < 0.8) {
        bearishScore += 5;
        strategy.warningFactors.push('Low volume - lack of interest');
    }

    // 4. PRICE POSITION ANALYSIS (15 points)
    if (metrics.priceAnalysis.positionSignal === 'OVERSOLD') {
        bullishScore += 10;
        strategy.strengthFactors.push('Oversold condition - potential bounce');
    } else if (metrics.priceAnalysis.positionSignal === 'OVERBOUGHT') {
        bearishScore += 10;
        strategy.warningFactors.push('Overbought condition - risk of pullback');
    }

    if (metrics.momentumIndicators.isBreakout) {
        bullishScore += 5;
        strategy.strengthFactors.push('Breakout detected - continuation likely');
    }

    // 5. RISK ASSESSMENT (10 points)
    if (metrics.riskMetrics.volatilityRisk === 'HIGH') {
        strategy.confidence = 'LOW';
        strategy.warningFactors.push('High volatility - increased risk');
    } else if (metrics.riskMetrics.volatilityRisk === 'LOW') {
        strategy.confidence = 'HIGH';
        strategy.strengthFactors.push('Low volatility - stable movement');
    }

    // DETERMINE PRIMARY SIGNAL
    const totalScore = bullishScore - bearishScore;

    if (totalScore >= 30) {
        strategy.primarySignal = 'STRONG_BULLISH';
        strategy.action = 'BUY';
    } else if (totalScore >= 15) {
        strategy.primarySignal = 'BULLISH';
        strategy.action = 'BUY';
    } else if (totalScore <= -30) {
        strategy.primarySignal = 'STRONG_BEARISH';
        strategy.action = 'SELL';
    } else if (totalScore <= -15) {
        strategy.primarySignal = 'BEARISH';
        strategy.action = 'SELL';
    } else {
        strategy.primarySignal = 'NEUTRAL';
        strategy.action = 'HOLD';
    }

    // GENERATE TRADING PLAN
    strategy.entryStrategy = generateEntryStrategy(stockData, metrics, strategy.primarySignal);
    strategy.exitStrategy = generateExitStrategy(stockData, metrics, strategy.primarySignal);
    strategy.riskManagement = generateRiskManagement(stockData, metrics);
    strategy.keyLevels = metrics.supportResistance;
    strategy.marketContext = getMarketContext(stockData);

    return strategy;
}

/**
 * Generate entry strategy based on signal
 */
function generateEntryStrategy(stockData, metrics, signal) {
    const entry = {};

    if (signal.includes('BULLISH')) {
        entry.recommendation = 'LOOK_FOR_ENTRY';
        entry.idealEntry = (metrics.currentPrice * 0.995).toFixed(2); // Slight pullback
        entry.aggressiveEntry = metrics.currentPrice;
        entry.entryCondition = 'Wait for pullback to support';
        entry.confirmation = 'Volume should increase on breakout';
    } else if (signal.includes('BEARISH')) {
        entry.recommendation = 'AVOID_ENTRY';
        entry.idealEntry = 'N/A';
        entry.entryCondition = 'Wait for trend reversal confirmation';
    } else {
        entry.recommendation = 'WAIT';
        entry.idealEntry = 'Watch for breakout direction';
        entry.entryCondition = 'Neutral trend - wait for clear signal';
    }

    return entry;
}

/**
 * Generate exit strategy
 */
function generateExitStrategy(stockData, metrics, signal) {
    const exit = {};
    const range = stockData.dayHigh - stockData.dayLow;

    if (signal.includes('BULLISH')) {
        exit.takeProfit1 = (metrics.currentPrice + range * 0.5).toFixed(2);
        exit.takeProfit2 = (metrics.currentPrice + range * 1.0).toFixed(2);
        exit.stopLoss = (metrics.currentPrice - range * 0.25).toFixed(2);
        exit.trailingStop = '3% below peak';
        exit.timeFrame = '1-3 days';
    } else if (signal.includes('BEARISH')) {
        exit.takeProfit1 = (metrics.currentPrice - range * 0.5).toFixed(2);
        exit.stopLoss = (metrics.currentPrice + range * 0.25).toFixed(2);
        exit.timeFrame = 'Intraday only';
    } else {
        exit.takeProfit1 = (metrics.currentPrice + range * 0.25).toFixed(2);
        exit.stopLoss = (metrics.currentPrice - range * 0.25).toFixed(2);
        exit.timeFrame = 'Monitor closely';
    }

    exit.riskRewardRatio = calculateRiskReward(exit.takeProfit1, exit.stopLoss, metrics.currentPrice);

    return exit;
}

/**
 * Generate risk management plan
 */
function generateRiskManagement(stockData, metrics) {
    const risk = {};
    const positionSize = Math.min(10, Math.max(2, 100 / metrics.priceAnalysis.volatilityPercent)).toFixed(1);

    risk.positionSize = `${positionSize}% of capital`;
    risk.maxLoss = '2% per trade';
    risk.volatilityAlert = metrics.riskMetrics.volatilityRisk;
    risk.riskLevel = metrics.riskMetrics.volatilityRisk === 'HIGH' ? 'HIGH' : 'MEDIUM';
    risk.recommendation = metrics.riskMetrics.volatilityRisk === 'HIGH' ?
        'Reduce position size' : 'Normal position size';

    return risk;
}

/**
 * Calculate risk-reward ratio
 */
function calculateRiskReward(takeProfit, stopLoss, currentPrice) {
    const potentialProfit = Math.abs(takeProfit - currentPrice);
    const potentialLoss = Math.abs(currentPrice - stopLoss);
    return (potentialProfit / potentialLoss).toFixed(2);
}

/**
 * Get market context
 */
function getMarketContext(stockData) {
    const context = {};

    if (stockData.fiftyTwoWeekHigh && stockData.fiftyTwoWeekLow) {
        const position = ((stockData.price - stockData.fiftyTwoWeekLow) /
            (stockData.fiftyTwoWeekHigh - stockData.fiftyTwoWeekLow)) * 100;
        context.positionIn52Week = position.toFixed(1) + '%';
        context.sentiment = position > 70 ? 'BULLISH' : position < 30 ? 'BEARISH' : 'NEUTRAL';
    }

    context.marketCapType = stockData.marketCap > 50e12 ? 'BLUECHIP' :
        stockData.marketCap > 10e12 ? 'MIDCAP' : 'SMALLCAP';

    context.liquidity = stockData.volume > 100000000 ? 'HIGH' :
        stockData.volume > 50000000 ? 'MEDIUM' : 'LOW';

    return context;
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

        const metrics = calculateAdvancedTechnicalMetrics(stockData);
        const strategy = generateTradingStrategy(stockData, metrics);

        // Return comprehensive analysis
        return {
            success: true,
            data: {
                symbol: stockData.symbol,
                name: stockData.name,
                price: stockData.price,
                change: stockData.change,
                changePercent: stockData.changePercent,
                volume: stockData.volume,
                marketCap: stockData.marketCap,
                dayHigh: stockData.dayHigh,
                dayLow: stockData.dayLow,
                open: stockData.open,
                previousClose: stockData.previousClose,
                lastUpdated: new Date().toISOString(),

                // TECHNICAL ANALYSIS
                technicalAnalysis: {
                    trend: metrics.trendAnalysis,
                    volume: metrics.volumeAnalysis,
                    priceAction: metrics.priceAnalysis,
                    momentum: metrics.momentumIndicators,
                    risk: metrics.riskMetrics,
                    supportResistance: metrics.supportResistance
                },

                // TRADING STRATEGY
                tradingStrategy: strategy,

                // QUICK SUMMARY FOR FRONTEND
                summary: {
                    signal: strategy.primarySignal,
                    action: strategy.action,
                    confidence: strategy.confidence,
                    riskLevel: strategy.riskManagement.riskLevel,
                    timeFrame: strategy.timeFrame,
                    keyLevels: strategy.keyLevels
                },

                // RAW DATA
                fullData: stockData
            }
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