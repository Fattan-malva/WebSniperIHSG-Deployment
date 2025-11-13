const axios = require("axios");
const colors = require("colors");
const Table = require("cli-table3");
const cliProgress = require("cli-progress");

const API_URL = "https://sniper-ihsg.vercel.app/api/stocks";
const SYMBOL_API_URL = "https://sniper-ihsg.vercel.app/api/stocks";
const TP_PERCENT = 5;
const SL_PERCENT = 3;
const CHECK_INTERVAL = 300000; // 5 menit

// Hacker theme: hijau, hitam, kuning untuk warning
colors.setTheme({
  main: "green",
  accent: "brightGreen",
  warn: "yellow",
  danger: "red",
  info: "cyan",
  faded: "grey",
  highlight: ["black", "bgGreen"],
  tableHead: ["green", "bold"],
  tableCell: "brightGreen",
  purple: "yellow",
});

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function clearConsole() {
  process.stdout.write("\x1B[2J\x1B[0f");
}

function formatCurrency(num) {
  return "Rp" + num.toLocaleString("id-ID");
}

function formatTime(minutes) {
  if (minutes < 60) {
    return `${minutes}m`;
  } else {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0
      ? `${hours}h ${remainingMinutes}m`
      : `${hours}h`;
  }
}

async function getStockData() {
  try {
    const res = await axios.get(API_URL);
    return res.data.data;
  } catch (error) {
    console.error("Gagal mengambil data:".danger, error.message);
    return [];
  }
}

async function getDetailedStockData(symbol) {
  try {
    const res = await axios.get(`${SYMBOL_API_URL}/${symbol}`);
    return res.data.data;
  } catch (error) {
    return null;
  }
}

function calculateMomentumStrength(stock, detailedData) {
  let score = 0;
  const reasons = [];

  // Volume analysis (25%)
  const volumeRatio =
    stock.volume / (detailedData.averageDailyVolume10Day || 1000000);
  if (volumeRatio > 4) {
    score += 25;
    reasons.push(`Volume >4x rata-rata`);
  } else if (volumeRatio > 2.5) {
    score += 20;
    reasons.push(`Volume >2.5x rata-rata`);
  } else if (volumeRatio > 1.5) {
    score += 15;
    reasons.push(`Volume >1.5x rata-rata`);
  }

  // Price momentum (25%)
  if (stock.changePercent > 8) {
    score += 25;
    reasons.push(`Kenaikan >8%`);
  } else if (stock.changePercent > 5) {
    score += 20;
    reasons.push(`Kenaikan >5%`);
  } else if (stock.changePercent > 3) {
    score += 15;
    reasons.push(`Kenaikan >3%`);
  }

  // Price position relative to day range (20%)
  const rangePosition =
    (stock.price - stock.dayLow) / (stock.dayHigh - stock.dayLow);
  if (rangePosition > 0.8 && rangePosition <= 0.9) {
    score += 20;
    reasons.push(`Dekat high hari`);
  } else if (rangePosition > 0.9) {
    score += 15;
    reasons.push(`Sangat dekat high hari`);
  } else if (rangePosition > 0.6) {
    score += 15;
    reasons.push(`Di atas midpoint`);
  }

  // Relative to moving averages (20%)
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

  // Market Cap (10%)
  if (stock.marketCap > 1e12) {
    score += 10;
    reasons.push(`Likuiditas tinggi`);
  } else if (stock.marketCap > 5e11) {
    score += 7;
    reasons.push(`Likuiditas cukup`);
  }

  return { score, reasons };
}

function estimateTimeToTP(stock, momentumScore, volumeRatio, currentHour) {
  let baseTime = 180 - momentumScore * 1.5;
  const volumeFactor =
    volumeRatio > 4
      ? 0.5
      : volumeRatio > 2.5
      ? 0.7
      : volumeRatio > 1.5
      ? 0.85
      : 1;
  baseTime *= volumeFactor;
  let timeFactor = 1;
  if (
    (currentHour >= 9 && currentHour < 10) ||
    (currentHour >= 14 && currentHour < 15)
  )
    timeFactor = 0.7;
  else if (currentHour >= 12 && currentHour < 13) timeFactor = 1.2;
  baseTime *= timeFactor;
  return Math.max(30, Math.min(240, Math.round(baseTime)));
}

async function screenScalpingStocks(stocks) {
  const screenedStocks = [];
  const currentHour = new Date().getHours();

  // Progress bar setup
  const bar = new cliProgress.SingleBar(
    {
      format: `Screening [{bar}] {percentage}% | {value}/{total} Data Saham`
        .bold.magenta, // warna pada format
      barCompleteChar: "\u2588", // tanpa warna
      barIncompleteChar: "\u2591", // tanpa warna
      hideCursor: true,
      barsize: 50, // panjang bar
      linewrap: true,
    },
    cliProgress.Presets.shades_classic
  );

  bar.start(stocks.length, 0);

  for (const [i, stock] of stocks.entries()) {
    if (
      stock.changePercent < 3 ||
      stock.volume < 5000000 ||
      stock.price > 5000 ||
      stock.price < 50
    ) {
      bar.increment();
      continue;
    }
    const detailedData = await getDetailedStockData(stock.symbol);
    if (!detailedData || !detailedData.fullData) {
      bar.increment();
      continue;
    }
    const { score, reasons } = calculateMomentumStrength(
      stock,
      detailedData.fullData
    );
    if (score < 50) {
      bar.increment();
      continue;
    }
    const tp = stock.price * (1 + TP_PERCENT / 100);
    const sl = stock.price * (1 - SL_PERCENT / 100);
    const volumeRatio =
      stock.volume / (detailedData.fullData.averageDailyVolume10Day || 1000000);
    const estimatedMinutes = estimateTimeToTP(
      stock,
      score,
      volumeRatio,
      currentHour
    );
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
    bar.increment();
    await sleep(50);
  }
  bar.stop();
  return screenedStocks.sort((a, b) => b.momentumScore - a.momentumScore);
}

function displayTable(stocks, title = "RANKING 10 SAHAM MOMENTUM SCALPING") {
  const table = new Table({
    head: [
      "Rank",
      "Symbol",
      "Nama",
      "Harga",
      "Chg%",
      "Volume",
      "TP",
      "SL",
      "Est.TP",
      "Score",
    ].map((h) => h.tableHead),
    style: { head: [], border: ["green"] },
    colAligns: [
      "middle",
      "left",
      "left",
      "right",
      "right",
      "right",
      "right",
      "right",
      "right",
      "right",
    ],
  });

  stocks.forEach((stock, i) => {
    table.push([
      (i + 1).toString().accent,
      stock.symbol.main,
      stock.name.faded,
      formatCurrency(stock.price).main,
      `${stock.changePercent > 0 ? "+" : ""}${stock.changePercent.toFixed(2)}%`[
        stock.changePercent > 0 ? "accent" : "danger"
      ],
      stock.volume.toLocaleString("id-ID").faded,
      formatCurrency(Number(stock.tp)).accent,
      formatCurrency(Number(stock.sl)).danger,
      formatTime(stock.estimatedTime).info,
      stock.momentumScore.toString().yellow,
    ]);
  });

  console.log("\n" + title.main);
  console.log(table.toString());
}

function displayTop5(stocks) {
  console.log("\n" + "TOP 5 REKOMENDASI SCALPING \n");
  stocks.forEach((stock, i) => {
    console.log(
      `RANKING #${i + 1}\n` +
        `-------------------------------------\n` +
        `🏢 Name     : ${stock.name}\n` +
        `📊 Symbol   : ${stock.symbol.magenta}\n` +
        `💰 Entry    : ${formatCurrency(stock.entry).info}\n` +
        `🎯 TP       : ${formatCurrency(Number(stock.tp)).accent}\n` +
        `🛑 SL       : ${formatCurrency(Number(stock.sl)).danger}\n` +
        `⏳ Estimasi : ${formatTime(stock.estimatedTime).info}\n` +
        `⚡ Score    : ${stock.momentumScore.toString().yellow}\n` +
        `💵 Potensi  : ${
          formatCurrency(stock.potentialProfit).main
        } (${stock.profitPercent.toFixed(2)}%)\n` +
        `-------------------------------------`
    );

    console.log(`Note: ${stock.reasons.join(", ").faded}\n`);
  });
}

async function runScreeningOnce(callback) {
  clearConsole();
  console.log(
    `
░██████╗███╗░░██╗██╗██████╗░███████╗██████╗░  ██╗██╗░░██╗░██████╗░██████╗░
██╔════╝████╗░██║██║██╔══██╗██╔════╝██╔══██╗  ██║██║░░██║██╔════╝██╔════╝░
╚█████╗░██╔██╗██║██║██████╔╝█████╗░░██████╔╝  ██║███████║╚█████╗░██║░░██╗░
░╚═══██╗██║╚████║██║██╔═══╝░██╔══╝░░██╔══██╗  ██║██╔══██║░╚═══██╗██║░░╚██╗
██████╔╝██║░╚███║██║██║░░░░░███████╗██║░░██║  ██║██║░░██║██████╔╝╚██████╔╝
╚═════╝░╚═╝░░╚══╝╚═╝╚═╝░░░░░╚══════╝╚═╝░░╚═╝  ╚═╝╚═╝░░╚═╝╚═════╝░░╚═════╝░
                IDX SCALPING SNIPER • by Fattan Malva • v3.0
`.accent
  );
  console.log(
    `⏳ ${new Date().toLocaleString("id-ID")} | Happy Cuan\n`.faded
  );

  const stocks = await getStockData();
  if (stocks.length === 0) {
    console.log("Tidak ada data saham yang diterima".danger);
    if (callback) callback();
    return;
  }

  const scalpingSignals = await screenScalpingStocks(stocks);

  if (scalpingSignals.length === 0) {
    console.log("Tidak ditemukan sinyal scalping yang kuat saat ini.".warn);
  } else {
    const top10 = scalpingSignals.slice(0, 10);
    const top5 = scalpingSignals.slice(0, 5);

    displayTable(top10);
    displayTop5(top5);

    console.log(
      "\n".faded +
        "⚠️ Trading saham berisiko. Analisis ini bukan jaminan profit.".warn
    );
    console.log("Fokus pada TOP 3 untuk peluang terbaik.".accent);
  }

  // kembali ke menu
  if (callback) callback();
}

module.exports = runScreeningOnce;
