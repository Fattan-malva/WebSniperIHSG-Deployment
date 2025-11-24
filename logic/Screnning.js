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
 * Calculate POTENTIAL GAP UP untuk besok pagi
 */
function calculateGapUpPotential(stock, detailedData) {
  let score = 0;
  const reasons = [];
  const warnings = [];
  const gapUpSignals = [];

  // 1. ANALISIS VOLUME AKHIR SESI (Volume Closing)
  const volumeRatio = stock.volume / (detailedData.averageDailyVolume10Day || 1000000);
  
  // Volume tinggi di akhir sesi = persiapan gap up besok
  if (volumeRatio > 6) {
    score += 25;
    reasons.push(`📈 VOLUME AKHIR SESI TINGGI >6x (${volumeRatio.toFixed(1)}x) - Potensi accumulation`);
    gapUpSignals.push("HIGH_CLOSING_VOLUME");
  } else if (volumeRatio > 4) {
    score += 20;
    reasons.push(`🔥 Volume akhir sesi >4x (${volumeRatio.toFixed(1)}x) - Signal positif`);
    gapUpSignals.push("GOOD_CLOSING_VOLUME");
  } else if (volumeRatio > 2.5) {
    score += 15;
    reasons.push(`📊 Volume di atas rata-rata >2.5x (${volumeRatio.toFixed(1)}x)`);
  } else {
    warnings.push(`Volume biasa (${volumeRatio.toFixed(1)}x) - kurang kuat`);
  }

  // 2. ANALISIS HARGA CLOSING (Position di akhir hari)
  const rangePosition = (stock.price - stock.dayLow) / (stock.dayHigh - stock.dayLow);
  const dailyRange = ((stock.dayHigh - stock.dayLow) / stock.dayLow) * 100;
  
  // Closing di atas 80% range = strong momentum untuk besok
  if (rangePosition > 0.85 && dailyRange > 3) {
    score += 25;
    reasons.push(`🎯 CLOSING KUAT di ${(rangePosition * 100).toFixed(0)}% range - Siap gap up`);
    gapUpSignals.push("STRONG_CLOSING");
  } else if (rangePosition > 0.75) {
    score += 20;
    reasons.push(`📈 Closing mendekati high (${(rangePosition * 100).toFixed(0)}%) - Momentum baik`);
    gapUpSignals.push("GOOD_CLOSING");
  } else if (rangePosition > 0.6) {
    score += 15;
    reasons.push(`↗️ Closing di atas midpoint (${(rangePosition * 100).toFixed(0)}%)`);
  } else {
    warnings.push(`Closing lemah (${(rangePosition * 100).toFixed(0)}% dari range)`);
  }

  // 3. ANALISIS PERUBAHAN HARGA (Tidak terlalu tinggi)
  // Cari yang naik moderate 2-8%, bukan yang sudah gila-gilaan
  if (stock.changePercent > 15) {
    score += 5;
    warnings.push(`❌ Sudah naik tinggi +${stock.changePercent.toFixed(1)}% - risk profit taking`);
  } else if (stock.changePercent > 10) {
    score += 10;
    reasons.push(`⚠️ Naik +${stock.changePercent.toFixed(1)}% - masih ada ruang`);
  } else if (stock.changePercent > 6) {
    score += 20;
    reasons.push(`🚀 Naik optimal +${stock.changePercent.toFixed(1)}% - perfect untuk gap up`);
    gapUpSignals.push("OPTIMAL_GAIN");
  } else if (stock.changePercent > 3) {
    score += 15;
    reasons.push(`📈 Naik moderate +${stock.changePercent.toFixed(1)}% - good potential`);
  } else if (stock.changePercent > 0) {
    score += 10;
    reasons.push(`↗️ Naik minor +${stock.changePercent.toFixed(1)}% - accumulation phase`);
  } else {
    score += 5;
    warnings.push(`Redam ${stock.changePercent.toFixed(1)}% - butuh katalis`);
  }

  // 4. TECHNICAL SETUP UNTUK BESOK
  if (detailedData.fiftyDayAverage && detailedData.twoHundredDayAverage) {
    const above50MA = stock.price > detailedData.fiftyDayAverage;
    const above200MA = stock.price > detailedData.twoHundredDayAverage;
    const distanceTo50MA = ((stock.price - detailedData.fiftyDayAverage) / detailedData.fiftyDayAverage) * 100;
    const distanceTo200MA = ((stock.price - detailedData.twoHundredDayAverage) / detailedData.twoHundredDayAverage) * 100;
    
    // Stock di atas MA dan masih ada ruang ke resistance
    if (above50MA && above200MA && distanceTo50MA < 15) {
      score += 20;
      reasons.push(`💪 Strong trend: above MA50(+${distanceTo50MA.toFixed(1)}%) & MA200(+${distanceTo200MA.toFixed(1)}%)`);
      gapUpSignals.push("STRONG_TREND");
    } else if (above50MA && distanceTo50MA < 10) {
      score += 15;
      reasons.push(`📊 Above MA50(+${distanceTo50MA.toFixed(1)}%) - room to grow`);
      gapUpSignals.push("GOOD_TREND");
    } else if (above50MA && distanceTo50MA > 20) {
      score += 5;
      warnings.push(`⚠️ Jauh di atas MA50(+${distanceTo50MA.toFixed(1)}%) - risk correction`);
    } else if (!above50MA && distanceTo50MA > -5) {
      score += 12;
      reasons.push(`🎯 Near MA50(${distanceTo50MA.toFixed(1)}%) - potential breakout`);
      gapUpSignals.push("BREAKOUT_CANDIDATE");
    }
  }

  // 5. MARKET CAP & LIQUIDITY ANALYSIS
  if (stock.marketCap > 10e12 && stock.marketCap < 100e12) {
    score += 10;
    reasons.push(`🏢 Mid-Cap likuid - perfect untuk swing`);
  } else if (stock.marketCap > 2e12 && stock.marketCap < 10e12) {
    score += 12;
    reasons.push(`💎 Small-Cap momentum - high gap up potential`);
  } else if (stock.marketCap > 100e12) {
    score += 8;
    reasons.push(`🔵 Bluechip - safe but slower`);
  } else {
    score += 5;
    warnings.push(`💡 Micro-Cap (${(stock.marketCap/1e12).toFixed(1)}T) - high risk high reward`);
  }

  // 6. VOLATILITY ANALYSIS (Untuk potensi gap up)
  if (dailyRange > 8) {
    score += 8;
    reasons.push(`⚡ High volatility ${dailyRange.toFixed(1)}% - gap up potential`);
  } else if (dailyRange > 5) {
    score += 10;
    reasons.push(`📊 Good volatility ${dailyRange.toFixed(1)}% - movement potential`);
  } else if (dailyRange > 3) {
    score += 7;
    reasons.push(`↔️ Moderate volatility ${dailyRange.toFixed(1)}%`);
  }

  const totalScore = Math.min(100, score);

  return { 
    score: totalScore,
    reasons, 
    warnings,
    gapUpSignals,
    volumeRatio,
    rangePosition,
    dailyRange
  };
}

/**
 * Calculate PRE-MARKET TARGET untuk besok
 */
function calculatePreMarketTarget(stock, gapUpScore, volumeRatio, rangePosition) {
  const basePrice = stock.price;
  
  // Target berdasarkan gap up potential
  let gapUpPercent;
  if (gapUpScore >= 85) {
    gapUpPercent = 6 + (volumeRatio * 0.3); // High gap up potential
  } else if (gapUpScore >= 75) {
    gapUpPercent = 5 + (volumeRatio * 0.25);
  } else if (gapUpScore >= 65) {
    gapUpPercent = 4 + (volumeRatio * 0.2);
  } else {
    gapUpPercent = 3 + (volumeRatio * 0.15);
  }
  
  // Adjust berdasarkan closing position
  if (rangePosition > 0.8) {
    gapUpPercent *= 1.3; // Strong closing = higher gap up
  } else if (rangePosition > 0.7) {
    gapUpPercent *= 1.15;
  }
  
  gapUpPercent = Math.min(12, Math.max(3, gapUpPercent));
  
  // Early session target (30 menit pertama)
  const earlyTarget = basePrice * (1 + gapUpPercent / 100);
  
  // Full day target
  const dayTarget = basePrice * (1 + (gapUpPercent * 1.5) / 100);
  
  // Conservative entry price (jangan chase)
  const idealEntry = basePrice * (1 + (gapUpPercent * 0.3) / 100);
  
  // Stop Loss (risk management)
  const slPercent = 2.5; // Tight SL untuk early entry
  const stopLoss = basePrice * (1 - slPercent / 100);
  
  const riskReward = (gapUpPercent / slPercent).toFixed(2);

  return {
    earlyTarget: earlyTarget.toFixed(2),
    dayTarget: dayTarget.toFixed(2),
    idealEntry: idealEntry.toFixed(2),
    stopLoss: stopLoss.toFixed(2),
    gapUpPercent: gapUpPercent.toFixed(1),
    slPercent: slPercent.toFixed(1),
    riskReward: parseFloat(riskReward),
    earlyTargetPercent: gapUpPercent.toFixed(1),
    dayTargetPercent: (gapUpPercent * 1.5).toFixed(1)
  };
}

/**
 * Estimate optimal entry time besok pagi
 */
function estimateOptimalEntryTime(gapUpSignals, volumeRatio) {
  let entryTiming = "REGULAR_OPEN";
  let reason = "";
  
  if (gapUpSignals.includes("STRONG_CLOSING") && volumeRatio > 5) {
    entryTiming = "PRE_OPEN";
    reason = "GAP UP KUAT - entry di pre-market atau open langsung";
  } else if (gapUpSignals.includes("HIGH_CLOSING_VOLUME")) {
    entryTiming = "OPEN_5MIN";
    reason = "Volume tinggi - entry 5 menit setelah open";
  } else if (gapUpSignals.includes("BREAKOUT_CANDIDATE")) {
    entryTiming = "OPEN_15MIN";
    reason = "Breakout candidate - tunggu konfirmasi 15 menit pertama";
  } else {
    entryTiming = "OPEN_30MIN";
    reason = "Tunggu pullback di 30 menit pertama";
  }
  
  return { entryTiming, reason };
}

/**
 * Screening untuk PRE-MARKET GAP UP candidates
 */
async function screenPreMarketGapUp(stocks) {
  const screenedStocks = [];
  const currentTime = new Date();
  const currentHour = currentTime.getHours();

  console.log(`🌙 PRE-MARKET SCREENING ${stocks.length} stocks at ${currentTime.toLocaleTimeString()}...`);

  for (const stock of stocks) {
    try {
      // FILTER DASAR untuk gap up candidates
      if (stock.price > 10000) continue; // Max price Rp 10,000
      if (stock.price < 100) continue; // Min price Rp 100
      if (stock.volume < 10000000) continue; // Min volume 10 juta
      if (stock.changePercent > 20) continue; // Skip yang sudah naik gila-gilaan
      
      // Skip yang closing lemah (di bawah 40% range)
      const rangePosition = (stock.price - stock.dayLow) / (stock.dayHigh - stock.dayLow);
      if (rangePosition < 0.4) continue;

      // Get detailed data
      const detailedData = await getDetailedStockData(stock.symbol);
      if (!detailedData || !detailedData.fullData) {
        continue;
      }

      // Calculate gap up potential
      const { 
        score, 
        reasons, 
        warnings, 
        gapUpSignals,
        volumeRatio, 
        rangePosition: finalRangePosition 
      } = calculateGapUpPotential(stock, detailedData.fullData);
      
      // MINIMUM SCORE 65 untuk gap up candidate
      if (score < 65) {
        continue;
      }

      // Calculate pre-market targets
      const targets = calculatePreMarketTarget(stock, score, volumeRatio, finalRangePosition);
      
      // MINIMUM RISK-REWARD 1.8
      if (targets.riskReward < 1.8) {
        continue;
      }

      // Estimate optimal entry time
      const entryTime = estimateOptimalEntryTime(gapUpSignals, volumeRatio);

      const potentialGain = (parseFloat(targets.earlyTarget) - stock.price);
      const gainPercent = (potentialGain / stock.price) * 100;

      screenedStocks.push({
        symbol: stock.symbol,
        name: stock.name,
        price: stock.price,
        changePercent: stock.changePercent,
        volume: stock.volume,
        dayHigh: stock.dayHigh,
        dayLow: stock.dayLow,
        momentumScore: score,
        volumeRatio: parseFloat(volumeRatio.toFixed(2)),
        closingPosition: `${(finalRangePosition * 100).toFixed(0)}%`,
        entry: targets.idealEntry,
        tp: targets.earlyTarget,
        dayTarget: targets.dayTarget,
        sl: targets.stopLoss,
        earlyTargetPercent: targets.earlyTargetPercent,
        dayTargetPercent: targets.dayTargetPercent,
        riskReward: targets.riskReward,
        estimatedTime: entryTime.entryTiming || 'OPEN_30MIN',
        entryReason: entryTime.reason,
        potentialGain: parseFloat(potentialGain.toFixed(2)),
        profitPercent: parseFloat(gainPercent.toFixed(2)),
        gapUpSignals,
        reasons,
        warnings,
        lastUpdated: stock.lastUpdated
      });

      // Delay untuk avoid rate limit
      await new Promise(resolve => setTimeout(resolve, 100));

    } catch (error) {
      console.error(`Error processing ${stock.symbol}:`, error.message);
      continue;
    }
  }

  // Sort by gap up score tertinggi
  return screenedStocks.sort((a, b) => b.gapUpScore - a.gapUpScore);
}

/**
 * Master screening function untuk PRE-MARKET
 */
async function runPreMarketScreening() {
  try {
    console.log('🌙 STARTING PRE-MARKET GAP UP SCREENING...');
    console.log('📊 Mencari saham dengan potensi GAP UP besok pagi...');
    
    const stocks = await getStockData();
    
    if (stocks.length === 0) {
      return { error: 'No stock data available' };
    }

    console.log(`⚡ Analyzing ${stocks.length} stocks for tomorrow's gap up...`);
    const gapUpCandidates = await screenPreMarketGapUp(stocks);
    
    // Kategorisasi berdasarkan potensi
    const strongGapUp = gapUpCandidates.filter(stock => 
      stock.gapUpScore >= 80 && 
      stock.gapUpSignals.includes("STRONG_CLOSING")
    );

    const potentialGapUp = gapUpCandidates.filter(stock => 
      stock.gapUpScore >= 70
    );

    const watchlist = gapUpCandidates.filter(stock => 
      stock.gapUpScore >= 65
    );

    return {
      success: true,
      timestamp: new Date().toISOString(),
      screeningType: "PRE_MARKET_GAP_UP",
      marketSummary: {
        totalStocks: stocks.length,
        gapUpCandidates: gapUpCandidates.length,
        strongGapUp: strongGapUp.length,
        potentialGapUp: potentialGapUp.length,
        watchlist: watchlist.length
      },
      // PRIORITAS UNTUK BESOK
      strongGapUp: strongGapUp.slice(0, 5),
      potentialGapUp: potentialGapUp.slice(0, 8),
      watchlist: watchlist.slice(0, 12),
      allCandidates: gapUpCandidates.slice(0, 15),
      top3Priority: gapUpCandidates.slice(0, 3)
    };

  } catch (error) {
    console.error('Error in runPreMarketScreening:', error.message);
    return { 
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = runPreMarketScreening;